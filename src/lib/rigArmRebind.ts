// src/lib/rigArmRebind.ts
//
// LOS RELIGADOS DEL BRAZO, FUERA DEL COMPONENTE PARA QUE EL BANCO LOS VEA.
//
// POR QUE EXISTE ESTE ARCHIVO. El musculo del brazo viene MAL LIGADO del GLB:
// el vientre del biceps, del braquial y del triceps esta pesado al ANTEBRAZO
// (forearm_flex / forearm_rot) y su origen duplicado a una vertebra toracica,
// no al humero. Doblando el codo, la copia del antebrazo se va con el y la
// copia de la columna se queda: el musculo se parte y sale volando del brazo.
// Es el "el biceps no se queda fijo en la extension del codo" que se reporto en
// su dia. Lo mismo pasa con la mitad de los parches de piel del brazo, que
// viajan en forearm_flex y giran alrededor del codo cuando deberian montar
// sobre el humero.
//
// Todo eso ya estaba arreglado... dentro de `RigModel`, en medio del recorrido
// que ademas decide visibilidad, capa y material de cada malla. El banco de
// render (`scripts/lib/rigPose.mts`) aplica las otras reparaciones de carga
// pero no esta, asi que LAS HOJAS DE REVISION ENSENABAN UN FALLO QUE LA
// APLICACION NO TIENE: a 145 grados de flexion de codo, la hoja mostraba los
// vientres del brazo disparados hacia delante del pecho. Revisar los
// movimientos con una herramienta asi no es revisar: es inventarse defectos en
// una direccion y, peor, tapar los de verdad en la otra.
//
// Asi que vive aqui, en funciones puras sobre la escena, y lo llaman los dos.
//
// QUE NO ESTA AQUI, Y POR QUE. El hueso de twist del antebrazo (el que reparte
// la pronosupinacion en vez de girarla en bloque) no se extrae: empalma un
// hueso NUEVO en cada esqueleto que piel el antebrazo, y eso se entrelaza con
// el estado que `RigModel` guarda en refs. Afecta solo a pronacion y
// supinacion, de modo que en esas dos hojas el antebrazo gira algo mas rigido
// que en la aplicacion. Dicho queda; no se arregla a medias.

import * as THREE from 'three';

/** Nombre del hueso sin el sufijo que la exportacion anade a los duplicados. */
export function boneBaseName(name: string): string {
  return name.replace(/_\d+$/, '');
}

/**
 * Pega TODA la malla a un solo hueso.
 *
 * Reescribe skinIndex/skinWeight, no el vertice: en la postura de reposo
 * `bone * boneInverse` es la identidad, asi que el modelo no se mueve ni un
 * milimetro al aplicarlo; lo que cambia es a quien obedece a partir de ahi.
 *
 * Devuelve false si la malla no esta pielada o si ese hueso no esta en SU
 * esqueleto -- que es justo lo que delata a los duplicados ligados a la
 * columna, porque en el esqueleto Spine no hay humero.
 */
export function rigidBindTo(mesh: THREE.Mesh, boneBase: string): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  const bi = sk.skeleton.bones.findIndex((b) => boneBaseName(b.name) === boneBase);
  if (bi < 0) return false;
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!si || !sw) return false;
  for (let i = 0; i < si.count; i++) {
    si.setXYZW(i, bi, 0, 0, 0);
    sw.setXYZW(i, 1, 0, 0, 0);
  }
  si.needsUpdate = true;
  sw.needsUpdate = true;
  return true;
}

/** Hueso dominante (el de mas peso) de una malla pielada, o '' si no lo esta. */
export function dominantBoneName(mesh: THREE.Mesh): string {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return '';
  const idx = mesh.geometry.getAttribute('skinIndex');
  const wgt = mesh.geometry.getAttribute('skinWeight');
  if (!idx || !wgt) return '';
  const acc = new Map<number, number>();
  const n = Math.min(idx.count, 200);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k);
      if (w > 0) {
        const b = idx.getComponent(i, k);
        acc.set(b, (acc.get(b) ?? 0) + w);
      }
    }
  }
  let best = -1;
  let bw = 0;
  for (const [b, w] of acc)
    if (w > bw) {
      bw = w;
      best = b;
    }
  return best >= 0 ? boneBaseName(sk.skeleton.bones[best]?.name ?? '') : '';
}

/** Alturas de referencia del miembro superior, en metros de mundo. */
export interface ArmHeights {
  /** Altura del codo (la menor de los dos brazos). */
  elbowY: number;
  /** Altura de la muneca. */
  wristY: number;
  /** Por encima de esto, el tejido es brazo propiamente dicho y monta el humero. */
  upperArmY: number;
}

/**
 * Lee las alturas del propio rig en vez de dejarlas escritas a mano.
 *
 * Una reexportacion del GLB puede mover el codo unos centimetros; si el umbral
 * fuese una constante, el religado empezaria a coger el trozo equivocado sin
 * que nada fallara. Los dos brazos estan casi a la misma altura: se toma la
 * menor.
 */
export function armHeights(scene: THREE.Object3D): ArmHeights {
  let elbowY = Infinity;
  let wristY = Infinity;
  for (const side of ['R', 'L'] as const) {
    const sr = scene.getObjectByName(`Shoulder_Armature_${side}`);
    sr?.traverse((o) => {
      const bn = boneBaseName(o.name);
      if (bn === 'forearm_flex')
        elbowY = Math.min(elbowY, o.getWorldPosition(new THREE.Vector3()).y);
      else if (bn === 'hand_flex')
        wristY = Math.min(wristY, o.getWorldPosition(new THREE.Vector3()).y);
    });
  }
  const eY = isFinite(elbowY) ? elbowY : 1.1;
  const wY = isFinite(wristY) ? wristY : 0.86;
  // 8 cm por encima del codo: por debajo de eso ya es el pliegue, que SI debe
  // doblarse con el antebrazo.
  return { elbowY: eY, wristY: wY, upperArmY: eY + 0.08 };
}

/**
 * Es el vientre de un musculo del brazo que debe montar el humero?
 *
 * La cabeza LARGA del triceps queda fuera a proposito: cruza el hombro (se
 * origina en el tuberculo infraglenoideo de la escapula) y en el GLB ese origen
 * esta repesado a la escapula. Pegarla entera al humero arrancaria el origen
 * durante la abduccion. Las cabezas lateral y medial no cruzan el hombro y si
 * se religan. El coracobraquial tampoco entra pese a llevar "braqui" en el
 * nombre: su origen es la coracoides.
 */
export function isUpperArmBelly(meshName: string): boolean {
  const ln = meshName.toLowerCase().replace(/[._\s]+/g, ' ');
  return (
    ln.includes('biceps brachii') ||
    (ln.includes('triceps brachii') && !ln.includes('long head')) ||
    (ln.includes('brachialis') && !ln.includes('coraco'))
  );
}

/** Lo que hizo `rebindArmBellies`, para que quien llama pueda registrarlo. */
export interface ArmRebindReport {
  /** Vientres pegados al humero. */
  bellies: number;
  /** Duplicados ligados a la columna, sin humero en su esqueleto: ocultados. */
  orphans: number;
  /** Parches de piel del brazo devueltos al humero. */
  skinPatches: number;
}

/**
 * Devuelve al humero los vientres del brazo y los parches de piel del brazo.
 *
 * `isMuscle` / `isSkin` los decide quien llama, porque la clasificacion por
 * material vive en su lado (la aplicacion ya la tiene calculada mientras
 * recorre, y el banco la saca de `tissueByMaterial`). Las mallas huerfanas se
 * marcan invisibles, igual que hace la aplicacion: de cada vientre queda la
 * copia buena, la que si tiene humero.
 *
 * Es idempotente en el sentido que importa: volver a pegar al humero algo que
 * ya esta pegado al humero no cambia nada. Aun asi se llama una sola vez, al
 * cargar, antes de capturar el reposo.
 */
export function rebindArmBellies(
  scene: THREE.Object3D,
  classify: (mesh: THREE.Mesh) => 'muscle' | 'skin' | 'other',
  heights: ArmHeights = armHeights(scene),
): ArmRebindReport {
  const report: ArmRebindReport = { bellies: 0, orphans: 0, skinPatches: 0 };
  const centre = new THREE.Vector3();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const kind = classify(mesh);
    if (kind === 'other') return;

    if (kind === 'muscle') {
      if (!isUpperArmBelly(mesh.name)) return;
      if (rigidBindTo(mesh, 'humerus_gh')) report.bellies++;
      else {
        mesh.visible = false;
        mesh.userData.rigLayer = 'hidden';
        report.orphans++;
      }
      return;
    }

    // Piel: solo la que viaja en forearm_flex estando POR ENCIMA del codo.
    if (dominantBoneName(mesh) !== 'forearm_flex') return;
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    centre.copy(mesh.geometry.boundingSphere!.center).applyMatrix4(mesh.matrixWorld);
    if (centre.y <= heights.upperArmY) return;
    if (rigidBindTo(mesh, 'humerus_gh')) report.skinPatches++;
  });
  return report;
}
