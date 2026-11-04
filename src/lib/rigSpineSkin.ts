// src/lib/rigSpineSkin.ts
//
// EL RAQUIS SE MUEVE POR NIVELES; EL GLB LO ATORNILLA A UNA SOLA VERTEBRA.
//
// Este archivo estaba dentro de RigModel, y por eso el banco de render no lo
// aplicaba: las hojas de los doce movimientos del raquis ensenaban los
// musculos del cuello despegandose en bloque, un fallo que la aplicacion ya no
// tiene. Es exactamente el caso contra el que avisa la regla de
// rigArmRebind.ts: una reparacion de carga que vive en el componente convierte
// cada imagen del banco en una mentira.
//
// Al mudarlo se vio ademas lo que faltaba. El pase original solo tocaba el
// MUSCULO. La PIEL del cuello viene igual de mal -- medido: el 100% del peso
// en el hueso del atlas (vert_C1), desde la mandibula hasta la clavicula -- y por eso, a 25
// grados de flexion cervical, la piel giraba en bloque alrededor del atlas, se
// despegaba del torax y dejaba el esternocleidomastoideo al aire. El mismo
// reparto por altura lo arregla.

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Smooth spine-muscle re-skin (premium spine compaction).
//
// Z-Anatomy binds each long spine/neck muscle RIGIDLY to ONE vertebra (and its
// duplicate copies to scattered other vertebrae). A rigid single-bone mesh
// pivots as one block: on thoracic/cervical flexion the erector's lumbar end
// swings forward while its cranial end swings back, so the belly peels off the
// curved column -- the "los musculos no estan bien compactados en la columna"
// the user is seeing. Here we re-weight EACH vertex to the TWO vertebrae that
// bracket it in height and blend linearly, so every slice of the muscle follows
// its own spinal level and the whole belly bends WITH the spine and stays tight.
//
// NON-VERTEBRA WEIGHT IS PRESERVED. This pass used to overwrite each vertex with
// vertebrae ONLY (weight 1 on one or two of them), which silently destroyed the
// latissimus dorsi's humeral insertion: the lats' dominant bone is vert_T12, so
// it qualifies as a spine muscle, and the re-skin wiped the latshum_l/r helper
// weights that are the entire mechanism by which its insertion follows the
// abducting arm (see driveLatsHelpers). The muscle was left welded to the spine,
// so on abduction the arm rose while the axillary insertion stayed at its rest
// position -- the detached, mis-aligned fold reported in the lab. Now each vertex
// KEEPS whatever weight it carries on non-vertebra bones and only the REMAINDER
// is blended across the bracketing vertebrae, so a lats vertex bends with the
// column AND rides the humerus in the same proportion the rig authored.
//
// Rest-pose safe: the weights still sum to 1 and every bone matrix is identity at
// the bind pose, so the neutral pose is pixel-identical (bindMatrix cancels);
// only the deformation under rotation changes. Returns true when it re-skinned.
// ---------------------------------------------------------------------------
const _vw = new THREE.Vector3();

export function smoothSkinSpine(mesh: THREE.Mesh, vertY: Map<string, number>): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  // Vertebrae present in THIS mesh's skeleton, tagged with their rest world Y.
  const verts: { idx: number; y: number }[] = [];
  sk.skeleton.bones.forEach((b, i) => {
    const bn = b.name.replace(/_\d+$/, '');
    if (/^vert_/.test(bn)) {
      const y = vertY.get(bn);
      if (y !== undefined) verts.push({ idx: i, y });
    }
  });
  if (verts.length < 2) return false;
  verts.sort((a, b) => a.y - b.y);
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!pos || !si || !sw) return false;
  const last = verts.length - 1;
  const yLo = verts[0].y;
  const yHi = verts[last].y;
  const vertIdx = new Set(verts.map((v) => v.idx));
  for (let i = 0; i < pos.count; i++) {
    _vw.fromBufferAttribute(pos, i);
    mesh.localToWorld(_vw); // rest world pos (bones = identity at bind)
    const vy = _vw.y;
    // Weight this vertex already carries on NON-vertebra bones -- for the
    // latissimus, its humeral helper. Collapse it onto the heaviest such bone
    // (after unilateralizeLats there is only one) and hand the vertebrae just
    // what is left, so the insertion survives this pass. `keep` stays 0 for an
    // ordinary spine muscle, making the blend below identical to before.
    let keepBone = -1;
    let keep = 0;
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k);
      if (w <= 0) continue;
      const b = si.getComponent(i, k);
      if (vertIdx.has(b)) continue;
      if (keepBone < 0 || w > keep) keepBone = b;
      keep += w;
    }
    if (keep > 1) keep = 1;
    if (keepBone < 0) keepBone = 0;
    const spine = 1 - keep;
    if (vy <= yLo) {
      si.setXYZW(i, verts[0].idx, keepBone, 0, 0);
      sw.setXYZW(i, spine, keep, 0, 0);
    } else if (vy >= yHi) {
      si.setXYZW(i, verts[last].idx, keepBone, 0, 0);
      sw.setXYZW(i, spine, keep, 0, 0);
    } else {
      // Largest k with verts[k].y <= vy < verts[k+1].y -> the bracketing pair.
      let k = 0;
      while (k < last && verts[k + 1].y <= vy) k++;
      const lo = verts[k];
      const hi = verts[k + 1];
      const span = hi.y - lo.y;
      const t = span > 1e-6 ? (vy - lo.y) / span : 0;
      si.setXYZW(i, lo.idx, hi.idx, keepBone, 0);
      sw.setXYZW(i, (1 - t) * spine, t * spine, keep, 0);
    }
  }
  si.needsUpdate = true;
  sw.needsUpdate = true;
  return true;
}

/**
 * Altura de reposo de cada vertebra, por nombre de hueso.
 *
 * Se lee del propio rig y no se escribe a mano: una reexportacion del GLB
 * mueve la columna unos centimetros y el reparto tiene que moverse con ella.
 */
export function vertebraHeights(scene: THREE.Object3D): Map<string, number> {
  const out = new Map<string, number>();
  const root = scene.getObjectByName('Spine_Armature');
  root?.traverse((o) => {
    const bn = o.name.replace(/_\d+$/, '');
    if (/^vert_/.test(bn) && !out.has(bn))
      out.set(bn, o.getWorldPosition(new THREE.Vector3()).y);
  });
  return out;
}

/** Cervicales, de abajo arriba. El cuello es lo que cuelga entre ellas. */
const CERVICAL = /^vert_C[1-7]$/;

/** Lo que hizo `smoothNeckSkin`. */
export interface NeckSkinReport {
  /** Mallas de piel del cuello repartidas por nivel. */
  meshes: number;
}

/**
 * REPARTE POR NIVEL LA PIEL DEL CUELLO.
 *
 * Medido en el GLB: cada tesela de piel del cuello (region del
 * esternocleidomastoideo, triangulo carotideo, fosas supraclaviculares, nuca,
 * region lateral) lleva entre el 86% y el 100% del peso en `vert_C1`. El atlas
 * esta en lo ALTO del cuello, de modo que al flexionar la cervical toda la piel
 * giraba en bloque alrededor de ese punto: se despegaba del torax por abajo y a
 * 25 grados ya se veia el esternocleidomastoideo desnudo.
 *
 * Es el mismo fallo que el de los musculos del raquis y se arregla con el mismo
 * reparto, `smoothSkinSpine`: cada vertice obedece a las dos vertebras que lo
 * bracketan en altura. Lo que esta POR ENCIMA de C1 -- la cara, el craneo, que
 * tambien vienen pesados al atlas -- queda intacto, porque para esos vertices
 * el reparto se satura en C1 al 100%. Esa es justo la razon de no restringirlo
 * con una caja de alturas escrita a mano.
 *
 * `classify` lo decide quien llama, porque la clasificacion por material vive
 * en su lado.
 *
 * Va ANTES de `relaxSkinSeams`, como los otros pases de peso: la soldadura de
 * costuras tiene que relajar el resultado de este, no al reves.
 */
export function smoothNeckSkin(
  scene: THREE.Object3D,
  vertY: Map<string, number>,
  classify: (mesh: THREE.Mesh) => 'skin' | 'other',
): NeckSkinReport {
  const report: NeckSkinReport = { meshes: 0 };
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || classify(mesh) !== 'skin') return;
    const sk = mesh as THREE.SkinnedMesh;
    if (!sk.isSkinnedMesh || !sk.skeleton) return;
    // Solo la piel que HOY obedece a una cervical. La del tronco ya la tratan
    // otros pases y repartirla aqui deshaceria su trabajo.
    if (!CERVICAL.test(dominantVertebra(sk))) return;
    if (smoothSkinSpine(mesh, vertY)) report.meshes++;
  });
  return report;
}

/** Vertebra de mas peso de una malla, o '' si no manda ninguna. */
function dominantVertebra(sk: THREE.SkinnedMesh): string {
  const idx = sk.geometry.getAttribute('skinIndex');
  const wgt = sk.geometry.getAttribute('skinWeight');
  if (!idx || !wgt) return '';
  const acc = new Map<number, number>();
  const n = Math.min(idx.count, 300);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k);
      if (w > 0) {
        const b = idx.getComponent(i, k);
        acc.set(b, (acc.get(b) ?? 0) + w);
      }
    }
  let best = -1;
  let bw = 0;
  for (const [b, w] of acc)
    if (w > bw) {
      bw = w;
      best = b;
    }
  return best >= 0 ? (sk.skeleton.bones[best]?.name ?? '').replace(/_\d+$/, '') : '';
}

/**
 * EL MISMO REPARTO PARA LAS COPIAS DE TEJIDO CONECTIVO DEL RAQUIS.
 *
 * Z-Anatomy duplica cada musculo largo del raquis con una copia de material
 * conectivo (fascia, aponeurosis, tendon). El pase de musculo no las tocaba
 * porque filtra por capa, asi que seguian atornilladas a UNA vertebra: medido,
 * la parte ascendente del trapecio y el esplenio de la cabeza viajaban 8,5 cm a
 * 50 grados de flexion cervical y asomaban por detras del cuello como esquirlas
 * grises, justo por encima de la piel que ya se habia arreglado.
 *
 * Es el mismo fallo, la misma cura; lo unico que cambia es la capa.
 */
export function smoothSpineConnective(
  scene: THREE.Object3D,
  vertY: Map<string, number>,
  classify: (mesh: THREE.Mesh) => 'connective' | 'other',
): NeckSkinReport {
  const report: NeckSkinReport = { meshes: 0 };
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || classify(mesh) !== 'connective') return;
    const sk = mesh as THREE.SkinnedMesh;
    if (!sk.isSkinnedMesh || !sk.skeleton) return;
    if (!/^vert_/.test(dominantVertebra(sk))) return;
    if (smoothSkinSpine(mesh, vertY)) report.meshes++;
  });
  return report;
}
