import * as THREE from 'three';
import { SKIN_WEIGHT_BAKE, type BakedMesh } from '../data/rigSkinWeightBake';

// LOS DOS PASES MAS CAROS DEL ARRANQUE ESCRIBEN 8.656 VERTICES.
//
// `relaxSkinSeams` y `redistributeSkinRootWeight` son, juntos, mas de la mitad
// del coste de preparar el rig. Medido en el navegador (src/lib/bootClock.ts,
// build de produccion): los pases de preparacion son 6,8-7,6 s del arranque, y
// de esos la pareja se lleva 3,4 s.
//
// LO QUE CUESTA NO ES ESCRIBIR, ES BUSCAR. `redistributeSkinRootWeight` indexa
// uno de cada cuatro vertices de TODO el musculo y el conectivo en una rejilla
// espacial y luego barre la vecindad 3D por cada vertice de piel, para acabar
// escribiendo 904 vertices de 28 mallas. `relaxSkinSeams` recorre 5.640
// soldaduras de 281 mallas de piel y difunde por anillos, para asentar 7.752
// vertices. Ocho mil seiscientos cincuenta y seis vertices de un millon: el
// 0,87%.
//
// Esa busqueda da SIEMPRE el mismo resultado --el GLB es fijo y los dos pases
// son deterministas-- asi que se hace una vez en el banco
// (`npm run build-skin-weight-bake`) y el navegador solo aplica la tabla.
//
// LA TABLA GUARDA NOMBRES DE HUESO, NO INDICES. `skinIndex` apunta a
// `mesh.skeleton.bones`, que es una lista por malla: el indice 3 no significa lo
// mismo en dos mallas, y un reexport que reordene los huesos lo cambia sin que
// nada se queje. Por eso cada malla lleva su paleta de nombres y el runtime
// traduce al cargar; si un nombre ya no esta, esa malla se salta con un aviso en
// consola en vez de escribir pesos a un hueso equivocado.
//
// SI LA TABLA NO SIRVE, LOS DOS PASES VUELVEN A CORRER. Es la misma regla que
// `rigForearmUnmangle`: una tabla precocinada contra un GLB que luego se
// reexporta deja filas huerfanas, y lo que no puede pasar es que el fallo sea
// silencioso. `applyBakedSkinWeights` devuelve null cuando no se puede confiar
// en ella, y quien la llama corre los pases de verdad.

/** Que hizo el horneado. */
export interface BakeReport {
  /** Mallas de la tabla que se aplicaron. */
  meshes: number;
  /** Vertices escritos. */
  vertices: number;
  /** Mallas de la tabla que ya no estan en la escena. */
  missingMeshes: string[];
  /** Mallas saltadas porque les falta un hueso de su paleta. */
  missingBones: string[];
}

/**
 * Apagar el horneado.
 *
 * Dos interruptores, y los dos existen para poder MEDIR:
 *  - `ANATRIS_NO_BAKE=1` en Node, que es como el verificador corre los pases de
 *    verdad para compararlos con la tabla.
 *  - `?nobake=1` en el navegador, que es como se mide el A/B del arranque en el
 *    MISMO build y en el mismo minuto. Sin eso habria que comparar dos builds
 *    hechos en momentos distintos, y esta maquina da 5,8 s o 14,2 s para el
 *    mismo trabajo segun lo ocupada que este: una comparacion asi no vale nada.
 */
export function bakeDisabled(): boolean {
  try {
    if (
      (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
        ?.ANATRIS_NO_BAKE === '1'
    ) {
      return true;
    }
  } catch {
    /* sin process: navegador */
  }
  try {
    return typeof location !== 'undefined' && location.search.includes('nobake=1');
  } catch {
    return false;
  }
}

/** Descodifica un bloque base64 a bytes, en navegador y en Node. */
function fromBase64(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node
  const B = (globalThis as { Buffer?: { from(s: string, e: string): Uint8Array } }).Buffer;
  if (!B) throw new Error('sin base64');
  return B.from(b64, 'base64');
}

/**
 * Bytes por vertice: u16 indice | u8[4] paleta | u16[4] peso | u8 banderas.
 *
 * LAS BANDERAS NO SON ADORNO. `reweightArmAboveElbow` LEE
 * `mesh.userData.seamSettled` para no deshacer lo que la soldadura de costuras
 * resolvio (src/lib/rigArmRebind.ts:128). Sin reconstruir esa marca, ese pase
 * pisa vertices que con los pases de verdad respetaba: medido, 294 vertices del
 * brazo posterior con hasta 0,62 de diferencia de peso.
 */
const STRIDE = 2 + 4 + 8 + 1;
/** Bit 0: lo asento la soldadura de costuras. */
const F_COSTURA = 1;

/**
 * Escribe los pesos horneados sobre la escena.
 *
 * @returns el informe, o null si la tabla esta vacia o apagada (entonces hay que
 *          correr los dos pases de verdad).
 */
export function applyBakedSkinWeights(scene: THREE.Object3D): BakeReport | null {
  if (bakeDisabled()) return null;
  return applyBakedTable(scene, SKIN_WEIGHT_BAKE as readonly BakedMesh[]);
}

/**
 * El descodificador, con la tabla por parametro.
 *
 * Separado para que el test pueda ejercitar ESTE codigo con una tabla de
 * juguete en vez de reescribir el formato en el test, que es como un formato se
 * rompe sin que nadie se entere.
 */
export function applyBakedTable(
  scene: THREE.Object3D,
  tabla: readonly BakedMesh[],
): BakeReport | null {
  if (!tabla || tabla.length === 0) return null;

  const porNombre = new Map<string, THREE.SkinnedMesh>();
  const huesos = new Map<string, THREE.Bone>();
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) porNombre.set(m.name, m);
    const b = o as THREE.Bone;
    if (b.isBone && !huesos.has(b.name)) huesos.set(b.name, b);
  });

  /**
   * El indice de un hueso EN ESTA malla, anadiendolo al esqueleto si no esta.
   *
   * No es un apano: es exactamente lo que hacen los dos pases que esta tabla
   * sustituye (`boneIndexIn` en rigSkinRootWeight.ts, `indexOf` en
   * skinSeamRelax.ts). La piel de Z-Anatomy viene soldada a UN hueso por tesela,
   * asi que repartir su peso casi siempre obliga a traer al esqueleto de la
   * tesela un hueso que no estaba. Sin esto, 74 de las 281 mallas de la tabla se
   * saltaban y el verificador las cazaba con 2.960 vertices distintos.
   *
   * La inversa se toma de la matriz de mundo ACTUAL, que aqui es la de reposo,
   * igual que en los pases originales.
   */
  const indiceDe = (mesh: THREE.SkinnedMesh, nombre: string): number => {
    const ya = mesh.skeleton.bones.findIndex((b) => b.name === nombre);
    if (ya >= 0) return ya;
    const bone = huesos.get(nombre);
    if (!bone) return -1;
    mesh.skeleton.bones.push(bone);
    mesh.skeleton.boneInverses.push(new THREE.Matrix4().copy(bone.matrixWorld).invert());
    mesh.skeleton.init();
    return mesh.skeleton.bones.length - 1;
  };

  const report: BakeReport = { meshes: 0, vertices: 0, missingMeshes: [], missingBones: [] };

  for (const fila of tabla) {
    const mesh = porNombre.get(fila.n);
    if (!mesh || !mesh.skeleton) {
      report.missingMeshes.push(fila.n);
      continue;
    }
    // La paleta de nombres -> indices EN ESTA malla.
    const idxDe: number[] = [];
    let falta = '';
    for (const nombre of fila.b) {
      const k = indiceDe(mesh, nombre);
      if (k < 0) {
        falta = nombre;
        break;
      }
      idxDe.push(k);
    }
    if (falta) {
      report.missingBones.push(`${fila.n} (${falta})`);
      continue;
    }

    const si = mesh.geometry.getAttribute('skinIndex');
    const sw = mesh.geometry.getAttribute('skinWeight');
    if (!si || !sw) {
      report.missingMeshes.push(fila.n);
      continue;
    }

    const bytes = fromBase64(fila.d);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const n = Math.floor(bytes.byteLength / STRIDE);
    const settled = new Uint8Array(si.count);
    let escritos = 0;
    let conCostura = 0;
    for (let r = 0; r < n; r++) {
      const o = r * STRIDE;
      const vi = dv.getUint16(o, true);
      if (vi >= si.count) continue;
      let suma = 0;
      const w = [0, 0, 0, 0];
      for (let k = 0; k < 4; k++) {
        w[k] = dv.getUint16(o + 6 + k * 2, true) / 65535;
        suma += w[k];
      }
      if (suma <= 1e-6) continue;
      // Renormalizar: la cuantizacion a u16 deja la suma a 1 +- 6e-5, y el
      // skinning lineal de three NO normaliza. Un vertice cuyos pesos sumen
      // 0,99994 se encoge hacia el origen del modelo.
      si.setXYZW(
        vi,
        idxDe[bytes[o + 2]],
        idxDe[bytes[o + 3]],
        idxDe[bytes[o + 4]],
        idxDe[bytes[o + 5]],
      );
      sw.setXYZW(vi, w[0] / suma, w[1] / suma, w[2] / suma, w[3] / suma);
      if (bytes[o + 14] & F_COSTURA) {
        settled[vi] = 1;
        conCostura++;
      }
      escritos++;
    }
    if (escritos === 0) continue;
    si.needsUpdate = true;
    sw.needsUpdate = true;
    // Las mismas marcas que dejaban los pases, para que nada vuelva a correrlos
    // ni los de un remontaje sobre la escena cacheada.
    mesh.userData.skinRootSpread = true;
    if (conCostura > 0) mesh.userData.seamSettled = settled;
    report.meshes++;
    report.vertices += escritos;
  }

  if (report.missingMeshes.length > 0 || report.missingBones.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '[rigSkinWeightBake] la tabla no cuadra con el GLB:',
      report.missingMeshes.length,
      'mallas sin encontrar,',
      report.missingBones.length,
      'con huesos que faltan. Vuelve a correr `npm run build-skin-weight-bake`.',
      [...report.missingMeshes.slice(0, 5), ...report.missingBones.slice(0, 5)].join(', '),
    );
  }
  // Una tabla que no acierta ni la mitad de sus mallas no es una tabla: es un
  // resto de otro GLB. Mejor pagar los 3,4 s que ensenar una piel mal pegada.
  if (report.meshes * 2 < tabla.length) return null;
  return report;
}
