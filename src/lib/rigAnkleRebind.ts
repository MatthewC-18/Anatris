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

/**
 * Y LA ALTURA SOLA NO BASTA: EL DORSO DEL MEDIOPIE ESTA A LA ALTURA DEL TOBILLO.
 *
 * El reparto por altura reparaba la aguja del talon, pero dejaba un fallo
 * simetrico delante. El pie se extiende HACIA ADELANTE, asi que el dorso del
 * mediopie --por donde corren los tendones extensores-- vive a la misma altura
 * que la articulacion aunque este a cinco centimetros por delante de ella. Al
 * mirar solo la altura, a esos puntos les tocaba medio peso de pierna, y en la
 * flexion plantar el pie bajaba mientras ellos se quedaban.
 *
 * MEDIDO ASI, porque a ojo no se distinguia de otra cosa: se rasterizo el pie a
 * 50 grados de flexion plantar con la regla puesta y quitada, en vista lateral
 * y con piel (scripts/render-pose.mts). Sin ella asoma un parche blanco y
 * dentado por el empeine, justo por delante del tobillo; con ella el empeine
 * sale limpio. Es el unico cambio entre las dos imagenes.
 *
 * Asi que al reparto por altura se le suma un reparto por DELANTE: por debajo
 * del borde alto de la banda, lo que este mas de un centimetro por delante del
 * tobillo es pie, y se queda con el peso mayor de los dos criterios. El vientre
 * del tibial anterior no se ve afectado porque vive POR ENCIMA de ese borde,
 * que es la condicion que guarda la regla.
 *
 * AVISO PARA QUIEN MIDA ESTO: en una vista lateral, el banco de render dibujaba
 * ADEMAS la pierna contraria --quieta-- junto al pie posado, y sus tendones
 * parecian salir disparados del empeine. No era este fallo ni ningun otro de la
 * aplicacion: era el recorte de lado del banco, que comparaba el centro de la
 * malla con el RADIO de su esfera envolvente (ver `onPosedSide` en
 * render-pose.mts). Ya esta arreglado; si algo parece salir disparado, antes de
 * perseguirlo comprueba que se mueve al cambiar el angulo.
 */
export const ANKLE_FORWARD_START_M = 0.01;

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
    const anklePos = footBone.getWorldPosition(new THREE.Vector3());
    const ankleY = anklePos.y;
    const sideSign = side === 'R' ? 1 : -1;
    const top = ankleY + ANKLE_BAND_M / 2;
    // Se eligen primero TODAS las mallas del lado, y despues se reparte el
    // peso: la direccion del pie hay que medirla sobre ellas (ver footForward).
    const picked: THREE.SkinnedMesh[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || classify(mesh) !== 'soft') return;
      const sk = mesh as THREE.SkinnedMesh;
      if (!sk.isSkinnedMesh || !sk.skeleton) return;
      const geo = mesh.geometry;
      if (!geo.getAttribute('position') || !geo.getAttribute('skinIndex')) return;
      if (!geo.getAttribute('skinWeight')) return;

      // Solo las mallas que este par de huesos manda de verdad. Mirar el hueso
      // DOMINANTE y no "alguna influencia" evita tocar los musculos del muslo,
      // que comparten esqueleto pero no cruzan nada.
      const dom = dominantBone(sk);
      if (dom !== 'shin_flex' && dom !== 'foot_flex') return;

      // Y solo las de ESTE lado: los dos pies comparten nombres de hueso.
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      const bs = geo.boundingSphere;
      if (!bs) return;
      const c = bs.center.clone().applyMatrix4(mesh.matrixWorld);
      if (Math.sign(c.x) !== sideSign || Math.abs(c.x) < 1e-4) return;
      picked.push(sk);
    });

    // Hacia donde apunta el pie, MEDIDO sobre esas mismas mallas.
    const fwd = footForward(picked, anklePos);

    for (const sk of picked) {
      const mesh = sk as unknown as THREE.Mesh;
      const pos = mesh.geometry.getAttribute('position');
      const si = mesh.geometry.getAttribute('skinIndex');
      const sw = mesh.geometry.getAttribute('skinWeight');
      const iShin = boneIndex(sk, shinBone);
      const iFoot = boneIndex(sk, footBone);
      if (iShin < 0 || iFoot < 0) continue;

      let minF = 1;
      let maxF = 0;
      for (let i = 0; i < pos.count; i++) {
        _v.fromBufferAttribute(pos, i);
        mesh.localToWorld(_v); // en reposo los huesos son identidad
        let t = (top - _v.y) / ANKLE_BAND_M;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        t = t * t * (3 - 2 * t); // smoothstep: sin pliegue donde empieza
        // Y lo que cae por DELANTE del tobillo, por debajo del borde alto de la
        // banda, es pie aunque este a la altura de la articulacion (ver la nota
        // de ANKLE_FORWARD_START_M).
        if (fwd && _v.y < top) {
          const ahead =
            (_v.x - anklePos.x) * fwd.x +
            (_v.y - anklePos.y) * fwd.y +
            (_v.z - anklePos.z) * fwd.z;
          let tf = (ahead - ANKLE_FORWARD_START_M) / ANKLE_BAND_M;
          tf = tf < 0 ? 0 : tf > 1 ? 1 : tf;
          tf = tf * tf * (3 - 2 * tf);
          if (tf > t) t = tf;
        }
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
    }
  }
  return report;
}

/**
 * Direccion horizontal en la que apunta el pie, MEDIDA sobre la geometria.
 *
 * No se puede sacar del esqueleto: la armadura de la pierna tiene CUATRO huesos
 * --femur_base, patella, shin_flex y foot_flex-- y ninguno en los dedos, asi
 * que no hay un hueso de la punta al que mirar (la primera version de esto lo
 * buscaba, no lo encontraba y la regla no llegaba a aplicarse nunca).
 *
 * Tampoco sirve un eje local del hueso del pie: el que apunta a los dedos es el
 * +y local --medido, (0,109, -0,391, 0,914)-- pero el eje con MAS componente
 * horizontal es el x, que es el medio-lateral. Elegir "el mas horizontal"
 * apuntaria de lado.
 *
 * Asi que se mide donde esta el pie: el punto de tejido blando del lado que mas
 * se aleja del tobillo en horizontal es la punta, y hacia alli apunta. Devuelve
 * null si no hay ninguno a mas de 5 cm, y entonces el reparto se queda solo con
 * la altura, como antes.
 */
function footForward(
  meshes: readonly THREE.SkinnedMesh[],
  ankle: THREE.Vector3,
): THREE.Vector3 | null {
  let best: THREE.Vector3 | null = null;
  let bestD = 0.05; // menos de 5 cm no es una punta de pie
  const p = new THREE.Vector3();
  for (const m of meshes) {
    const pos = m.geometry.getAttribute('position');
    if (!pos) continue;
    const step = Math.max(1, Math.floor(pos.count / 200));
    for (let i = 0; i < pos.count; i += step) {
      p.fromBufferAttribute(pos, i);
      (m as unknown as THREE.Mesh).localToWorld(p);
      if (p.y > ankle.y) continue; // por encima del tobillo no es pie
      const d = Math.hypot(p.x - ankle.x, p.z - ankle.z);
      if (d > bestD) {
        bestD = d;
        best = new THREE.Vector3(p.x - ankle.x, 0, p.z - ankle.z).normalize();
      }
    }
  }
  return best;
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
