// src/lib/rigSkinRootWeight.ts
//
// LA PIEL DE LA CADERA SE ROMPIA EN PLACAS PLANAS AL FLEXIONAR.
//
// En la hoja de revision de la flexion de cadera a 120 grados no se ve un
// moteado ni unas esquirlas: se ve la piel ABIERTA, con planos rectos del
// tamano de una tesela separandose unos de otros y el muslo asomando entero
// por el hueco. Es la peor rotura del cuerpo despues de la axila.
//
// No es una costura mal cosida. Es que las teselas vecinas obedecen a huesos
// distintos. Medido sobre el GLB:
//
//   Hip_regionl                  Leg_Armature_R 0,81   femur_base 0,19
//   Gluteal_region_3             Leg_Armature_R 0,87   femur_base 0,13
//   Anterior_region_of_thigh_1   femur_base 0,75       Leg_Armature_R 0,25
//   Gluteal_region_5             femur_base 0,77       Leg_Armature_R 0,23
//
// `Leg_Armature_R` es el hueso RAIZ del armature de la pierna: coloca el
// miembro y no gira NUNCA. Asi que a 120 grados de flexion la tesela de la
// nalga recorre el 13% del camino y la del muslo, pegada a ella, el 77%. No se
// estiran: se separan, cada una plana, y entre las dos queda el boquete.
//
// LO QUE SE HACE. Quitarle a la raiz el peso que no le corresponde y
// repartirlo por el mismo criterio que ya usa `skinSeamRelax` para decidir
// donde debe quedarse una costura: LA PIEL SIGUE AL TEJIDO SOBRE EL QUE SE
// APOYA. Para cada vertice de piel con peso en la raiz se busca el musculo o la
// fascia que tiene justo debajo y se le entrega ese peso con la mezcla de
// huesos de ese tejido.
//
// Eso resuelve solo lo que una rampa por altura no sabia resolver. Sobre la
// nalga hay gluteo mayor, que ahora reparte entre pelvis y femur
// (`rigPelvicOrigin`), de modo que la piel de la nalga hereda ese mismo
// reparto. Sobre el pliegue inguinal hay pared abdominal, pegada a la pelvis, y
// la piel se queda con ella, que es lo que hace de verdad: el pliegue no viaja
// con el muslo. Nadie tuvo que decidir esos dos casos por separado.
//
// POR QUE SOLO EL PESO DE LA RAIZ. Lo demas ya esta bien o al menos no es
// demostrablemente falso. Un hueso raiz que no articula nada no tiene ninguna
// lectura anatomica, de modo que su peso sobre la piel es siempre un error; el
// resto no.
//
// Seguro en reposo: solo cambian PESOS, que siguen sumando 1, y en el bind toda
// matriz de hueso es la identidad. La postura neutra no se mueve ni un pixel.
//
// NADA DE `process.env` AQUI: lo carga el navegador a traves de RigModel, donde
// `process` no existe, y leerlo tumba la vista 3D entera. `npm run build` no lo
// caza porque compila sin ejecutar.

import * as THREE from 'three';

/** Hueso raiz de un armature de miembro: no articula nada, no gira nunca. */
const ROOT = /_Armature_[RL]$/;

/** Celda del indice espacial, en metros. */
const CELL = 0.02;

/**
 * Hasta donde se busca el tejido que hay debajo de un vertice de piel.
 *
 * La piel se apoya sobre fascia de unos pocos milimetros; 3 cm es generoso para
 * sobrevivir a los huecos del modelo de origen sin llegar a un musculo que
 * pertenece a otra parte del cuerpo. Es el mismo valor que usa `skinSeamRelax`
 * para la misma pregunta.
 */
const UNDER_M = 0.03;

/**
 * Segundo intento, mas lejos, cuando a 3 cm no hay NADA de su propio miembro.
 *
 * Hace falta por la restriccion de armadura. Medido, 381 de 904 vertices de
 * piel de la cadera y del muslo se quedaban sin tejido valido al alcance: el
 * unico tejido a 3 cm era de la otra pierna o del antebrazo, se rechazaba, y
 * el vertice conservaba el peso de la raiz -- que es el error que esta pasada
 * existe para quitar. Con la piel soldada de cuerpo entero por
 * `skinSeamRelax`, esos huerfanos arrastraban a sus vecinos y el muslo se
 * abria entero: 1820 pixeles de vasto lateral a la vista.
 *
 * Diez centimetros ya no significa "el tejido que tiene debajo", y por eso es
 * un SEGUNDO intento y no el radio general: solo decide a que hueso del PROPIO
 * miembro se parece mas ese trozo de piel, que es una pregunta mucho mas
 * tosca y con una respuesta mucho mas obvia.
 */
const FAR_M = 0.1;

/** Lo que hizo `redistributeSkinRootWeight`. */
export interface SkinRootReport {
  /** Teselas de piel con algun peso movido. */
  meshes: number;
  /** Vertices con algun peso movido. */
  vertices: number;
  /** Vertices que no tenian tejido debajo al alcance y se quedaron igual. */
  orphans: number;
}

interface SoftPoint {
  p: THREE.Vector3;
  /** Mezcla de huesos por NOMBRE: los esqueletos no comparten indices. */
  w: Map<string, number>;
  /** Armaduras a las que pertenecen esos huesos. */
  arms: Set<string>;
}

/**
 * Armadura de la que cuelga un hueso, subiendo por sus padres.
 *
 * SIN ESTO LA PASADA ES UNA CATASTROFE, y conviene que quede escrito por que.
 * En reposo el brazo cuelga pegado al costado, de modo que el ANTEBRAZO queda a
 * menos de 3 cm de la cadera y de la nalga. La piel de la cadera encontraba
 * "debajo" los flexores del antebrazo y se quedaba con sus pesos. Al flexionar
 * el codo 145 grados, la piel de la cadera salia disparada siguiendo al
 * antebrazo: una cinta plana que cruzaba el cuerpo por encima de la cabeza.
 * Medido, 0,609% de pixeles rotos -> 5,403%.
 *
 * Vecindad en el espacio no es pertenencia. Un tejido solo puede mandar sobre
 * una piel si son del mismo miembro, o si es del raquis, que es el tronco sobre
 * el que se apoyan todas las cinturas.
 */
function armatureOf(bone: THREE.Object3D | null): string | null {
  let o: THREE.Object3D | null = bone;
  while (o) {
    if (/Armature/.test(o.name)) return o.name;
    o = o.parent;
  }
  return null;
}

/** El raquis vale para cualquier piel: todas las cinturas se apoyan en el. */
const SPINE = /^Spine_Armature/;

const _v = new THREE.Vector3();

/**
 * Reparte el peso que el hueso raiz del armature tiene sobre la piel, dandoselo
 * al tejido que esa piel tiene debajo.
 *
 * `classify` lo decide quien llama, porque la clasificacion por material vive
 * en su lado.
 *
 * Debe correr DESPUES de `blendPelvicOrigins`: la piel hereda lo que encuentre
 * en el musculo, asi que el musculo tiene que estar ya arreglado.
 *
 * Idempotente: deja la marca en `mesh.userData.skinRootSpread`.
 */
export function redistributeSkinRootWeight(
  scene: THREE.Object3D,
  classify: (mesh: THREE.Mesh) => 'skin' | 'muscle' | 'connective' | 'other',
): SkinRootReport {
  const report: SkinRootReport = { meshes: 0, vertices: 0, orphans: 0 };
  scene.updateMatrixWorld(true);

  // --- el tejido, indexado en mundo -----------------------------------------
  const grid = new Map<string, SoftPoint[]>();
  const key = (x: number, y: number, z: number): string =>
    `${Math.floor(x / CELL)}|${Math.floor(y / CELL)}|${Math.floor(z / CELL)}`;

  const skins: THREE.SkinnedMesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh || !m.isSkinnedMesh || !m.skeleton) return;
    const kind = classify(m);
    if (kind === 'skin') {
      skins.push(m);
      return;
    }
    if (kind !== 'muscle' && kind !== 'connective') return;
    const pos = m.geometry.getAttribute('position');
    const si = m.geometry.getAttribute('skinIndex');
    const sw = m.geometry.getAttribute('skinWeight');
    if (!pos || !si || !sw) return;
    // Uno de cada cuatro: esto solo tiene que decir QUE tejido hay debajo, y un
    // musculo son miles de vertices con la misma respuesta.
    for (let i = 0; i < pos.count; i += 4) {
      _v.fromBufferAttribute(pos, i);
      m.localToWorld(_v);
      const w = new Map<string, number>();
      const arms = new Set<string>();
      let total = 0;
      for (let k = 0; k < 4; k++) {
        const x = sw.getComponent(i, k);
        if (x <= 0) continue;
        const bone = m.skeleton.bones[si.getComponent(i, k)];
        if (!bone || ROOT.test(bone.name)) continue;
        w.set(bone.name, (w.get(bone.name) ?? 0) + x);
        const a = armatureOf(bone);
        if (a) arms.add(a);
        total += x;
      }
      if (total <= 1e-6) continue;
      for (const [n, x] of w) w.set(n, x / total);
      const k = key(_v.x, _v.y, _v.z);
      const bucket = grid.get(k);
      const point: SoftPoint = { p: _v.clone(), w, arms };
      if (bucket) bucket.push(point);
      else grid.set(k, [point]);
    }
  });
  if (!grid.size) return report;

  const nearest = (
    p: THREE.Vector3,
    own: string | null,
    limit: number,
  ): Map<string, number> | null => {
    const reach = Math.ceil(limit / CELL);
    let best: Map<string, number> | null = null;
    let bd = limit * limit;
    for (let a = -reach; a <= reach; a++)
      for (let b = -reach; b <= reach; b++)
        for (let c = -reach; c <= reach; c++)
          for (const sp of grid.get(key(p.x + a * CELL, p.y + b * CELL, p.z + c * CELL)) ?? []) {
            const d = sp.p.distanceToSquared(p);
            if (d >= bd) continue;
            // SOLO SU PROPIO MIEMBRO, o el raquis. Ver `armatureOf`.
            let ok = true;
            for (const a of sp.arms) {
              if (a === own || SPINE.test(a)) continue;
              ok = false;
              break;
            }
            if (!ok) continue;
            bd = d;
            best = sp.w;
          }
    return best;
  };

  // --- la piel ---------------------------------------------------------------
  for (const mesh of skins) {
    if (mesh.userData.skinRootSpread) continue;
    const pos = mesh.geometry.getAttribute('position');
    const si = mesh.geometry.getAttribute('skinIndex');
    const sw = mesh.geometry.getAttribute('skinWeight');
    if (!pos || !si || !sw) continue;
    const rootBone = mesh.skeleton.bones.find((b) => ROOT.test(b.name));
    if (!rootBone) continue;
    const own = armatureOf(rootBone);
    if (!own) continue;

    let touched = 0;
    // QUE VERTICES se tocaron, no solo cuantos. Lo necesita el horneado
    // (scripts/build-skin-weight-bake.mts): sin la lista hay que volver a correr
    // la busqueda espacial para saber que guardar, que es justo lo que cuesta.
    const settled = new Uint8Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      let root = 0;
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w <= 0) continue;
        const bone = mesh.skeleton.bones[si.getComponent(i, k)];
        if (bone && ROOT.test(bone.name)) root += w;
      }
      if (root <= 1e-4) continue;

      _v.fromBufferAttribute(pos, i);
      mesh.localToWorld(_v);
      const under = nearest(_v, own, UNDER_M) ?? nearest(_v, own, FAR_M);
      if (!under) {
        report.orphans++;
        continue;
      }

      // Se parte de lo que el vertice ya tenia, SIN la raiz, y se le suma el
      // peso de la raiz repartido como lo tiene el tejido de debajo.
      const mix = new Map<string, number>();
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w <= 0) continue;
        const bone = mesh.skeleton.bones[si.getComponent(i, k)];
        if (!bone || ROOT.test(bone.name)) continue;
        mix.set(bone.name, (mix.get(bone.name) ?? 0) + w);
      }
      for (const [n, x] of under) mix.set(n, (mix.get(n) ?? 0) + x * root);

      // Las cuatro ranuras del formato: se queda con los cuatro mayores.
      const top = [...mix].sort((a, b) => b[1] - a[1]).slice(0, 4);
      let total = 0;
      for (const [, x] of top) total += x;
      if (total <= 1e-6) continue;
      const idx = [0, 0, 0, 0];
      const wts = [0, 0, 0, 0];
      let ok = true;
      for (let k = 0; k < top.length; k++) {
        const bi = boneIndexIn(mesh, top[k][0], scene);
        if (bi < 0) {
          ok = false;
          break;
        }
        idx[k] = bi;
        wts[k] = top[k][1] / total;
      }
      if (!ok) {
        report.orphans++;
        continue;
      }
      si.setXYZW(i, idx[0], idx[1], idx[2], idx[3]);
      sw.setXYZW(i, wts[0], wts[1], wts[2], wts[3]);
      settled[i] = 1;
      touched++;
    }
    if (!touched) continue;
    si.needsUpdate = true;
    sw.needsUpdate = true;
    mesh.userData.skinRootSpread = true;
    mesh.userData.skinRootSettled = settled;
    report.vertices += touched;
    report.meshes++;
  }

  return report;
}

/**
 * Indice de un hueso, por NOMBRE, dentro del esqueleto de una malla; lo injerta
 * si falta.
 *
 * Hace falta porque la piel de la cadera vive en el esqueleto de la pierna y el
 * tejido que tiene debajo puede estar en el del raquis. Los indices se APILAN
 * al final, asi que cualquier `skinIndex` ya escrito sigue valiendo, y el
 * inverso se toma de la matriz de mundo ACTUAL -- la de reposo -- para que
 * `hueso * inverso` sea la identidad en el bind y nada salte.
 */
function boneIndexIn(sk: THREE.SkinnedMesh, name: string, scene: THREE.Object3D): number {
  const have = sk.skeleton.bones.findIndex((b) => b.name === name);
  if (have >= 0) return have;
  let found: THREE.Bone | null = null;
  scene.traverse((o) => {
    if (!found && (o as THREE.Bone).isBone && o.name === name) found = o as THREE.Bone;
  });
  if (!found) return -1;
  const bone: THREE.Bone = found;
  sk.skeleton.bones.push(bone);
  sk.skeleton.boneInverses.push(new THREE.Matrix4().copy(bone.matrixWorld).invert());
  sk.skeleton.init();
  return sk.skeleton.bones.length - 1;
}
