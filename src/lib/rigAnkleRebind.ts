// src/lib/rigAnkleRebind.ts
//
// UNA AGUJA ROSA DE OCHO CENTIMETROS SALIA POR DETRAS DEL TALON.
//
// En la flexion plantar del tobillo, a partir de los 20 grados, asomaba por
// detras del tendon de Aquiles una punta roja larga y afilada que crecia con el
// angulo. A 50 grados era mas larga que el propio pie.
//
// Medida, tiene nombre y numero: `Flexor_digitorum_longus` ocupa de y=0,100 a
// y=0,351 -- veinticinco centimetros, desde el tobillo hasta media pantorrilla
// -- y viene ligada al 100% a `foot_flex`. Es decir, el VIENTRE del musculo,
// que vive en el compartimento profundo de la PIERNA y no se mueve cuando el
// pie se mueve, estaba atornillado al hueso del pie. Al flexionar, su extremo
// proximal viajaba 23,1 cm. La aguja era el musculo estirandose entre el sitio
// donde deberia estar y el sitio al que el hueso del pie se lo llevaba.
//
// Y no era el unico. Siete mallas cruzan el tobillo con un solo hueso cada una,
// y en las dos direcciones:
//
//   ligadas al PIE pero subiendo a la pierna
//     Flexor_digitorum_longus          +27 cm sobre el tobillo   600 v
//     Fibularis_tertius_muscle          +8 cm                     54 v
//     Tendon_sheath_of_tibialis_anterior +7 cm                    69 v
//   ligadas a la PIERNA pero bajando al pie
//     Plantaris_muscle_1               +30 cm                    521 v
//     Calcaneal_tendon (Aquiles)       +17 cm                    878 v
//     Fibularis_longus_muscle_1         +9 cm                    403 v
//     Extensor_hallucis_longus_1        +8 cm                    218 v
//     Tibialis_anterior_muscle_1        +8 cm                    194 v
//
// El tendon de Aquiles ligado entero a la tibia es el mismo fallo leido del
// otro lado: se inserta en el CALCANEO, asi que su extremo distal tiene que
// irse con el pie, y no se iba.
//
// LO QUE SE HACE. Lo mismo que ya se hacia en el hombro con los musculos que
// cruzan la glenohumeral y en el brazo con la piel por encima del codo: el peso
// se REPARTE por vertice en vez de elegirse por malla. Aqui el criterio es la
// ALTURA, porque el eje del tobillo es casi horizontal: lo que esta por encima
// de la articulacion va con la pierna, lo que esta por debajo va con el pie, y
// entre medias hay una banda estrecha que interpola.
//
// Seguro en reposo: `shin_flex` y `foot_flex` estan los dos en el esqueleto de
// la pierna (el segundo es hijo del primero), los pesos siguen sumando uno y
// toda matriz de hueso es identidad en el bind, asi que la postura neutra no se
// mueve ni un pixel.
//
// Vive en src/lib, no dentro de RigModel, porque el banco de render tiene que
// aplicar exactamente esto o las hojas de revision dejan de valer.

import * as THREE from 'three';

/** Quita el sufijo `_12` que three.js anade a los nombres repetidos. */
const baseName = (n: string): string => n.replace(/_\d+$/, '');

/**
 * Altura de la banda de transicion, en metros, CENTRADA en la articulacion.
 *
 * Cuatro centimetros es lo que mide a ojo la zona de los retinaculos, que es
 * justo donde la anatomia real hace esta misma transicion: por encima el tendon
 * corre con la pierna, por debajo ya esta sujeto al pie. Mas estrecha dejaria un
 * pliegue duro; mas ancha empezaria a llevarse el vientre del tibial anterior.
 */
export const ANKLE_BAND_M = 0.04;

/** Lo que hizo `regradeAnkleCrossers`. */
export interface AnkleRebindReport {
  /** Mallas regraduadas, con el reparto resultante. */
  graded: { mesh: string; minFoot: number; maxFoot: number }[];
  /** Lados en los que falto un hueso. */
  skipped: string[];
}

const _v = new THREE.Vector3();

/**
 * Reparte por altura los musculos y tendones que cruzan el tobillo.
 *
 * `classify` lo decide quien llama: la aplicacion ya tiene la capa calculada
 * mientras recorre la escena, y el banco de render la lee del material.
 *
 * Idempotente: el reparto sale de las posiciones EN REPOSO y de la altura de la
 * articulacion, no del estado anterior de los pesos.
 */
export function regradeAnkleCrossers(
  scene: THREE.Object3D,
  classify: (mesh: THREE.Mesh) => 'soft' | 'other',
): AnkleRebindReport {
  const report: AnkleRebindReport = { graded: [], skipped: [] };
  scene.updateMatrixWorld(true);

  for (const side of ['R', 'L'] as const) {
    const root = scene.getObjectByName(`Leg_Armature_${side}`);
    if (!root) {
      report.skipped.push(`${side}: sin armature`);
      continue;
    }
    let shin: THREE.Object3D | null = null;
    let foot: THREE.Object3D | null = null;
    root.traverse((o) => {
      const n = baseName(o.name);
      if (!shin && n === 'shin_flex') shin = o;
      if (!foot && n === 'foot_flex') foot = o;
    });
    if (!shin || !foot) {
      report.skipped.push(`${side}: falta shin_flex o foot_flex`);
      continue;
    }
    const shinBone = shin as THREE.Object3D;
    const footBone = foot as THREE.Object3D;
    const ankleY = footBone.getWorldPosition(new THREE.Vector3()).y;
    const sideSign = side === 'R' ? 1 : -1;
    const top = ankleY + ANKLE_BAND_M / 2;

    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || classify(mesh) !== 'soft') return;
      const sk = mesh as THREE.SkinnedMesh;
      if (!sk.isSkinnedMesh || !sk.skeleton) return;
      const pos = mesh.geometry.getAttribute('position');
      const si = mesh.geometry.getAttribute('skinIndex');
      const sw = mesh.geometry.getAttribute('skinWeight');
      if (!pos || !si || !sw) return;

      // Solo las mallas que este par de huesos manda de verdad. Mirar el hueso
      // DOMINANTE y no "alguna influencia" evita tocar los musculos del muslo,
      // que comparten esqueleto pero no cruzan nada.
      const dom = dominantBone(sk);
      if (dom !== 'shin_flex' && dom !== 'foot_flex') return;

      // Y solo las de ESTE lado: los dos pies comparten nombres de hueso.
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      const bs = mesh.geometry.boundingSphere;
      if (!bs) return;
      const c = bs.center.clone().applyMatrix4(mesh.matrixWorld);
      if (Math.sign(c.x) !== sideSign || Math.abs(c.x) < 1e-4) return;

      const iShin = boneIndex(sk, shinBone);
      const iFoot = boneIndex(sk, footBone);
      if (iShin < 0 || iFoot < 0) return;

      let minF = 1;
      let maxF = 0;
      for (let i = 0; i < pos.count; i++) {
        _v.fromBufferAttribute(pos, i);
        mesh.localToWorld(_v); // en reposo los huesos son identidad
        let t = (top - _v.y) / ANKLE_BAND_M;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        t = t * t * (3 - 2 * t); // smoothstep: sin pliegue donde empieza
        if (t < minF) minF = t;
        if (t > maxF) maxF = t;
        si.setXYZW(i, iFoot, iShin, 0, 0);
        sw.setXYZW(i, t, 1 - t, 0, 0);
      }
      si.needsUpdate = true;
      sw.needsUpdate = true;
      // Solo se apunta lo que de verdad quedo repartido. Una malla entera por
      // encima o por debajo de la banda no ha cambiado de comportamiento.
      if (maxF - minF > 0.01) {
        report.graded.push({ mesh: mesh.name, minFoot: minF, maxFoot: maxF });
      }
    });
  }
  return report;
}

/** Nombre del hueso con mas peso acumulado en la malla. */
function dominantBone(sk: THREE.SkinnedMesh): string {
  const si = sk.geometry.getAttribute('skinIndex');
  const sw = sk.geometry.getAttribute('skinWeight');
  const tot = new Map<string, number>();
  for (let i = 0; i < si.count; i++) {
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k);
      if (w <= 0) continue;
      const bone = sk.skeleton.bones[si.getComponent(i, k)];
      if (!bone) continue;
      const n = baseName(bone.name);
      tot.set(n, (tot.get(n) ?? 0) + w);
    }
  }
  let best = '';
  let bestW = -1;
  for (const [n, w] of tot) if (w > bestW) ((bestW = w), (best = n));
  return best;
}

/** Indice de un hueso en el esqueleto de la malla, anadiendolo si falta. */
function boneIndex(sk: THREE.SkinnedMesh, bone: THREE.Object3D): number {
  let idx = sk.skeleton.bones.indexOf(bone as THREE.Bone);
  if (idx >= 0) return idx;
  // Se APILAN al final, asi que cualquier skinIndex ya escrito sigue valiendo.
  sk.skeleton.bones.push(bone as THREE.Bone);
  sk.skeleton.boneInverses.push(new THREE.Matrix4().copy(bone.matrixWorld).invert());
  sk.skeleton.init();
  return sk.skeleton.bones.length - 1;
}
