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
/**
 * Indice de un hueso en el esqueleto de la malla, ELIGIENDO EL LADO CORRECTO.
 *
 * MOVER UN BRAZO ARRANCABA LA PIEL DEL OTRO.
 *
 * Los dos hombros tienen un hueso llamado `humerus_gh`, y hasta aqui estos
 * pases lo buscaban con un `findIndex` por nombre, que devuelve el PRIMERO.
 * Mientras cada malla tuvo un solo esqueleto eso bastaba. Dejo de bastar en
 * cuanto otro pase (la soldadura de costuras) empalma en un esqueleto el humero
 * del otro lado: a partir de ese momento una tesela del brazo izquierdo podia
 * recibir el humero DERECHO, y al abducir un brazo una tira de piel del otro
 * salia disparada. Medido en `Medial_bicipital_groover`, que esta en x=-0,179:
 * hasta un 45% de su peso acababa en el humero de x=+0,16, y la tesela viajaba
 * 30,6 cm al abducir el brazo contrario.
 *
 * El nombre no distingue lados, pero la POSICION si. Entre los huesos que
 * comparten nombre se elige el que esta mas cerca de la malla, que es el unico
 * criterio que no depende de como se llamen los armatures ni de en que orden
 * los haya metido nadie en el esqueleto.
 */
export function sideBoneIndex(sk: THREE.SkinnedMesh, boneBase: string): number {
  const matches: number[] = [];
  sk.skeleton.bones.forEach((b, i) => {
    if (boneBaseName(b.name) === boneBase) matches.push(i);
  });
  if (matches.length <= 1) return matches[0] ?? -1;
  if (!sk.geometry.boundingSphere) sk.geometry.computeBoundingSphere();
  const bs = sk.geometry.boundingSphere;
  if (!bs) return matches[0];
  const centre = bs.center.clone().applyMatrix4(sk.matrixWorld);
  let best = matches[0];
  let bestD = Infinity;
  const p = new THREE.Vector3();
  for (const i of matches) {
    sk.skeleton.bones[i].getWorldPosition(p);
    const d = p.distanceTo(centre);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function rigidBindTo(mesh: THREE.Mesh, boneBase: string): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  const bi = sideBoneIndex(sk, boneBase);
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

/** Huesos del antebrazo y la mano: nada por encima del codo debe obedecerles. */
const DISTAL_ARM_BONES = new Set(['forearm_flex', 'forearm_rot', 'hand_flex']);

/**
 * Cuanto peso del ANTEBRAZO queda en una malla, como fraccion del total.
 * Util para medir el fallo que arregla `reweightArmAboveElbow`.
 */
export function distalArmWeight(mesh: THREE.Mesh): number {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return 0;
  const idx = mesh.geometry.getAttribute('skinIndex');
  const wgt = mesh.geometry.getAttribute('skinWeight');
  if (!idx || !wgt) return 0;
  let tot = 0;
  let dist = 0;
  for (let i = 0; i < idx.count; i++) {
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k);
      if (w <= 0) continue;
      tot += w;
      if (DISTAL_ARM_BONES.has(boneBaseName(sk.skeleton.bones[idx.getComponent(i, k)]?.name ?? '')))
        dist += w;
    }
  }
  return tot > 0 ? dist / tot : 0;
}

/** Lo que movio `reweightArmAboveElbow`. */
export interface ArmReweightReport {
  /** Mallas con al menos un vertice corregido. */
  meshes: number;
  /** Vertices cuyo peso distal se paso (en parte o del todo) al humero. */
  vertices: number;
}

/**
 * DEVUELVE AL HUMERO EL TEJIDO DEL BRAZO QUE OBEDECIA AL ANTEBRAZO.
 *
 * `rebindArmBellies` pega mallas ENTERAS al humero, y para eso tiene que
 * elegirlas: los vientres por el nombre, la piel por su hueso DOMINANTE. Esa
 * segunda regla deja fuera lo peor del GLB -- la piel del brazo que viene
 * MEZCLADA, con el humero como dominante pero la mitad del peso en
 * `forearm_flex`. Medido a 90 grados de flexion de codo, antes de esto:
 * `Anterior_region_of_arm_1` viajaba 5,7 cm, `Lateral_bicipital_groove` 4,6 cm
 * y la fascia braquial 4,2 cm. La piel del brazo se arrastraba hacia el
 * antebrazo y DESTAPABA el biceps, que si estaba bien fijo: en la hoja de
 * flexion de codo el vientre aparecia desnudo, por fuera de la piel.
 *
 * Aqui no se elige la malla, se elige el VERTICE, que es lo unico que distingue
 * el brazo del pliegue del codo dentro de una misma pieza de piel. Por encima
 * del codo el peso distal pasa al humero; justo en el codo no se toca nada, y
 * entre medias se reparte de forma continua, que es lo que evita una costura
 * horizontal a media altura del brazo.
 *
 * Pegar la pieza entera al humero NO vale aqui: estas mallas cruzan el codo y
 * se partirian al doblarlo.
 *
 * Idempotente: una segunda pasada no encuentra peso distal que mover.
 */
export function reweightArmAboveElbow(
  scene: THREE.Object3D,
  heights: ArmHeights = armHeights(scene),
): ArmReweightReport {
  const report: ArmReweightReport = { meshes: 0, vertices: 0 };
  const band = Math.max(1e-4, heights.upperArmY - heights.elbowY);
  const v = new THREE.Vector3();
  scene.traverse((o) => {
    const sk = o as THREE.SkinnedMesh;
    if (!sk.isSkinnedMesh || !sk.skeleton) return;
    // Solo los dos esqueletos del hombro tienen humero; en los demas no hay
    // adonde devolver el peso (y no hay brazo que arreglar).
    // El humero DE ESTE LADO: ver `sideBoneIndex`. Con un `findIndex` por
    // nombre, una tesela del brazo izquierdo acababa colgando del humero
    // derecho y salia disparada al mover el otro brazo.
    const hi = sideBoneIndex(sk, 'humerus_gh');
    if (hi < 0) return;
    const distal = new Set<number>();
    sk.skeleton.bones.forEach((b, i) => {
      if (DISTAL_ARM_BONES.has(boneBaseName(b.name))) distal.add(i);
    });
    if (distal.size === 0) return;

    const pos = sk.geometry.getAttribute('position');
    const idx = sk.geometry.getAttribute('skinIndex');
    const wgt = sk.geometry.getAttribute('skinWeight');
    if (!pos || !idx || !wgt) return;

    let touched = 0;
    for (let i = 0; i < pos.count; i++) {
      // En reposo los huesos son identidad, asi que la posicion de mundo del
      // vertice sin pielar ES su altura real.
      v.fromBufferAttribute(pos, i);
      sk.localToWorld(v);
      const t = Math.min(1, Math.max(0, (v.y - heights.elbowY) / band));
      if (t <= 0) continue;

      const acc = new Map<number, number>();
      let moved = 0;
      for (let k = 0; k < 4; k++) {
        const w = wgt.getComponent(i, k);
        if (w <= 0) continue;
        const b = idx.getComponent(i, k);
        if (distal.has(b)) {
          moved += w * t;
          const keep = w * (1 - t);
          if (keep > 0) acc.set(b, (acc.get(b) ?? 0) + keep);
        } else {
          acc.set(b, (acc.get(b) ?? 0) + w);
        }
      }
      if (moved <= 1e-6) continue;
      acc.set(hi, (acc.get(hi) ?? 0) + moved);

      // Solo caben cuatro influencias: se quedan las cuatro mayores y se
      // renormaliza, de modo que la postura de reposo no se mueve.
      const top = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const sum = top.reduce((s, [, w]) => s + w, 0) || 1;
      idx.setXYZW(
        i,
        top[0]?.[0] ?? hi,
        top[1]?.[0] ?? 0,
        top[2]?.[0] ?? 0,
        top[3]?.[0] ?? 0,
      );
      wgt.setXYZW(
        i,
        (top[0]?.[1] ?? 1) / sum,
        (top[1]?.[1] ?? 0) / sum,
        (top[2]?.[1] ?? 0) / sum,
        (top[3]?.[1] ?? 0) / sum,
      );
      touched++;
    }
    if (touched > 0) {
      idx.needsUpdate = true;
      wgt.needsUpdate = true;
      report.meshes++;
      report.vertices += touched;
    }
  });
  return report;
}
