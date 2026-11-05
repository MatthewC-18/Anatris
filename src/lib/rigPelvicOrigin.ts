// src/lib/rigPelvicOrigin.ts
//
// EL GLUTEO MAYOR SE DESPEGABA DEL SACRO AL FLEXIONAR LA CADERA.
//
// Medido con el contador de roturas del rasterizador (`BREAKS=1`), la flexion
// de cadera a 120 grados -- su rango normal -- es el segundo peor movimiento de
// los treinta y cuatro: 2,63% de los pixeles del cuerpo no son piel, y
// `Gluteus_maximus` pone 765 de esos 1301 pixeles. En la hoja, la nalga entera
// sale por fuera.
//
// La causa no es la piel. Son los pesos del musculo:
//
//   Gluteus_maximus_musclel   y 0,71-0,98   femur_base 1.00
//   Gluteus_medius_muscle     y 0,86-1,00   vert_sacrum 0,73  vert_L5 0,26
//   Piriformis_musclel        y 0,86-0,92   vert_sacrum 1.00
//
// El gluteo mayor esta al CIEN POR CIEN en el femur, de arriba abajo. Su origen
// -- sacro, coccix e ilion posterior, por encima de y = 0,94 -- gira con el
// muslo como si fuera parte de el. A 120 grados de flexion eso lanza la mitad
// superior del musculo hacia delante y la saca por la nalga.
//
// Y no es solo el gluteo. Todos estos nacen en la pelvis y estan igual de mal:
// recto femoral (espina iliaca anteroinferior), sartorio (espina iliaca
// anterosuperior), tensor de la fascia lata, pectineo, los aductores y el
// gracil (pubis), semitendinoso, semimembranoso y la porcion larga del biceps
// femoral (tuberosidad isquiatica). Cada uno con su funda conectiva, que viene
// pesada igual. Eso explica tambien las esquirlas blancas de la cara interna
// del muslo en la rotacion externa: no era un fallo de las fundas, era que el
// origen pubico del gracil y del aductor largo viajaba con el femur.
//
// LO QUE SE HACE. Lo que ya hacen bien sus vecinos: repartir. Un vertice por
// encima de la cadera pertenece a la PELVIS y se queda con ella; uno por debajo
// pertenece al muslo y va con el femur; entre medias, una transicion suave.
// Como el hueso de la pelvis esta en el esqueleto del raquis y estos musculos
// en el de la pierna, hay que injertarlo, igual que se hizo con el dorsal ancho
// (`latshum_*`).
//
// LO QUE NO SE HACE. Mover geometria. Solo cambian PESOS, que siguen sumando 1,
// y en el bind toda matriz de hueso es la identidad: la postura neutra no se
// mueve ni un pixel. Si el injerto fallara, el peor caso es que el vertice se
// quede donde estaba.

import * as THREE from 'three';

/** Huesos que sostienen el muslo. Lo que cuelgue de ellos es pierna. */
const FEMUR = /^femur_base(_\d+)?$/;

/** El hueso de la pelvis al que debe volver el origen. */
const PELVIS = 'vert_sacrum';

/**
 * Altura (metros, en reposo) por debajo de la cual el vertice es muslo entero.
 *
 * Es la del propio hueso del femur en el GLB, 0,865: el centro de la cadera. Lo
 * que esta por debajo gira con el muslo, y asi se queda.
 */
const Y_LO = Number(process.env?.PELVIS_LO ?? 0.865);

/**
 * Altura por encima de la cual el vertice es pelvis entera.
 *
 * El sacro esta a 0,926 y la cresta iliaca por encima. A 0,95 ya no queda nada
 * que pertenezca al muslo.
 */
const Y_HI = Number(process.env?.PELVIS_HI ?? 0.95);

/**
 * Ademas de la rampa por altura absoluta, cada malla entrega su PROPIO extremo
 * superior, medido desde su punto mas alto hacia abajo.
 *
 * Hace falta porque los origenes de la cadera no estan todos a la misma altura.
 * El del gluteo mayor esta en el sacro, a 0,94-0,98, y la rampa absoluta lo
 * coge entero. Pero el del gracil y el del aductor largo estan en el PUBIS, a
 * 0,88-0,90, por debajo de donde esa rampa empieza a actuar: sin esta segunda
 * banda se quedaban igual de pegados al femur, que es justo lo que medimos.
 *
 * El pubis es tan rigido con el sacro como el ilion -- la pelvis es un solo
 * hueso a efectos de movimiento -- asi que devolverlos al mismo hueso es
 * correcto aunque ese hueso este detras.
 *
 * Seis centimetros es el OPTIMO MEDIDO con el contador de roturas sobre la
 * flexion de cadera a 120 grados y la rotacion externa a 45.
 */
const BAND_M = Number(process.env?.PELVIS_BAND ?? 0.06);

/** Lo que hizo `blendPelvicOrigins`. */
export interface PelvicOriginReport {
  /** Mallas con algun vertice devuelto a la pelvis. */
  meshes: number;
  /** Vertices con algun peso devuelto. */
  vertices: number;
  /** Mallas que estaban mal pero no se pudieron arreglar (sin hueso de pelvis). */
  skipped: string[];
}

/** Transicion suave: 0 por debajo de `lo`, 1 por encima de `hi`, sin esquinas. */
function smoothstep(lo: number, hi: number, x: number): number {
  if (hi <= lo) return x >= hi ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

const _v = new THREE.Vector3();

/**
 * Devuelve a la pelvis el origen de los musculos de la cadera que colgaban
 * enteros del femur.
 *
 * `classify` lo decide quien llama, porque la clasificacion por material vive
 * en su lado. Se aplica a musculo Y a conectivo: la funda de un musculo viene
 * pesada igual de mal que el musculo.
 *
 * Idempotente: deja la marca en `mesh.userData.pelvicOrigin`, asi que un
 * segundo montaje (React en modo estricto) no lo reparte dos veces.
 */
export function blendPelvicOrigins(
  scene: THREE.Object3D,
  classify: (mesh: THREE.Mesh) => 'muscle' | 'connective' | 'other',
): PelvicOriginReport {
  const report: PelvicOriginReport = { meshes: 0, vertices: 0, skipped: [] };
  scene.updateMatrixWorld(true);

  let pelvis: THREE.Bone | null = null;
  scene.traverse((o) => {
    if ((o as THREE.Bone).isBone && o.name === PELVIS) pelvis = o as THREE.Bone;
  });
  if (!pelvis) return report;
  const pelvisBone: THREE.Bone = pelvis;

  // Atributos ya vistos: en este GLB hay mallas espejadas que COMPARTEN el
  // buffer de pesos, y escribir en una escribiria en la otra. Ver la nota del
  // dorsal ancho: fue uno de los tres fallos encadenados que lo anularon.
  const seen = new Set<THREE.BufferAttribute | THREE.InterleavedBufferAttribute>();

  scene.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh || !mesh.isSkinnedMesh || !mesh.skeleton) return;
    if (mesh.userData.pelvicOrigin) return;
    const kind = classify(mesh);
    if (kind === 'other') return;

    const pos = mesh.geometry.getAttribute('position');
    let si = mesh.geometry.getAttribute('skinIndex');
    let sw = mesh.geometry.getAttribute('skinWeight');
    if (!pos || !si || !sw) return;

    // Solo las mallas que cuelgan del femur: las del raquis (gluteo medio,
    // piramidal) ya estan bien y tocarlas seria estropearlas.
    const femurIdx = mesh.skeleton.bones.findIndex((b) => FEMUR.test(b.name));
    if (femurIdx < 0) return;

    // Y solo si de verdad suben por encima de la cadera. Un vasto intermedio no
    // tiene origen pelvico y no hay nada que devolverle.
    let top = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i);
      mesh.localToWorld(_v);
      if (_v.y > top) top = _v.y;
    }
    if (top <= Y_LO) return;

    if (seen.has(si) || seen.has(sw)) {
      si = si.clone();
      sw = sw.clone();
      mesh.geometry.setAttribute('skinIndex', si);
      mesh.geometry.setAttribute('skinWeight', sw);
    }
    seen.add(si);
    seen.add(sw);

    // EL INJERTO. El inverso se toma de la matriz de mundo ACTUAL, que en el
    // bind es la de reposo, de modo que hueso * inverso es la identidad y nada
    // salta. Los indices se apilan al final: los `skinIndex` ya escritos siguen
    // valiendo.
    let pelvisIdx = mesh.skeleton.bones.indexOf(pelvisBone);
    if (pelvisIdx < 0) {
      mesh.skeleton.bones.push(pelvisBone);
      mesh.skeleton.boneInverses.push(
        new THREE.Matrix4().copy(pelvisBone.matrixWorld).invert(),
      );
      mesh.skeleton.init();
      pelvisIdx = mesh.skeleton.bones.length - 1;
    }

    let touched = 0;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i);
      mesh.localToWorld(_v);
      const toPelvis = Math.max(
        smoothstep(Y_LO, Y_HI, _v.y),
        smoothstep(top - BAND_M, top - 0.005, _v.y),
      );
      if (toPelvis <= 1e-4) continue;

      // Lo que se reparte es el peso que estaba en huesos de la PIERNA. Si un
      // vertice ya tenia peso en el raquis, se respeta.
      let leg = 0;
      const idx = [0, 0, 0, 0];
      const wts = [0, 0, 0, 0];
      let pelvisSlot = -1;
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        const bi = si.getComponent(i, k);
        idx[k] = bi;
        wts[k] = w;
        if (w <= 0) continue;
        if (bi === pelvisIdx) pelvisSlot = k;
        else leg += w;
      }
      const give = leg * toPelvis;
      if (give <= 1e-5) continue;
      for (let k = 0; k < 4; k++) {
        if (wts[k] <= 0 || idx[k] === pelvisIdx) continue;
        wts[k] *= 1 - toPelvis;
      }
      if (pelvisSlot >= 0) {
        wts[pelvisSlot] += give;
      } else {
        let slot = 0;
        for (let k = 1; k < 4; k++) if (wts[k] < wts[slot]) slot = k;
        idx[slot] = pelvisIdx;
        wts[slot] = give;
      }
      const sum = wts[0] + wts[1] + wts[2] + wts[3];
      if (sum <= 1e-6) continue;
      si.setXYZW(i, idx[0], idx[1], idx[2], idx[3]);
      sw.setXYZW(i, wts[0] / sum, wts[1] / sum, wts[2] / sum, wts[3] / sum);
      touched++;
    }
    if (!touched) return;
    si.needsUpdate = true;
    sw.needsUpdate = true;
    mesh.userData.pelvicOrigin = true;
    report.vertices += touched;
    report.meshes++;
  });

  return report;
}
