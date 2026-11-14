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

// ---------------------------------------------------------------------------
// EL SUELO DE LA CABEZA ES LA MANDIBULA, NO LA ALTURA DEL ATLAS.
//
// El reparto por altura daba por hecho que "lo que esta por encima de C1 -- la
// cara, el craneo -- queda intacto". La mitad de abajo de la cara NO esta por
// encima de C1: medido en el GLB, C1 esta en y=1,543 y la mandibula baja hasta
// y=1,496; la boca, el menton, las mejillas, los labios, el suelo de la boca y
// el platisma de la cara quedan entre las dos alturas. Venian al 100% en
// `vert_C1` (como el craneo) y este pase los repartia entre C1, C2, C3 y C4
// como si fueran cuello. Resultado, MEDIDO contra la transformacion de C1 a 80
// grados de rotacion cervical: el craneo y la mandibula giraban con C1 (0 mm) y
// la piel y los musculos del menton y de la boca se quedaban atras hasta 96 mm.
// En la pantalla, la boca retorcida y el labio rojo asomando en la prueba de
// insuficiencia vertebrobasilar, y el hueso de la mandibula saliendo por debajo
// del menton en la flexion de Lhermitte: "se deforma la cara".
//
// Asi que el techo del cuello se mide en la propia mandibula: su borde
// inferior, de perfil (la y minima del hueso por franjas de z, del menton al
// angulo). Por encima de ese borde, la cabeza: el vertice obedece a C1 entero,
// como el craneo. Por debajo, el cuello de siempre. Y entre medias una franja
// de 46 mm (de 48 a 2 mm bajo el borde) donde se pasa de uno a otro, que es la
// piel que cuelga entre la mandibula y el cuello. Probadas 14, 30 y 46 mm: con
// 14 el giro de 80 grados dejaba un escalon bajo la mandibula; con 46 la piel
// se descuelga de la mandibula al cuello sin escalon. Detras del angulo de la
// mandibula manda la altura de C1, como antes.
//
// MEDIDO, antes y despues, con el banco de render (cabeza y cuello, cinco
// posturas cervicales): cara (hueso, musculo y conectivo por encima de la
// franja) 0 mm de residuo contra C1 en todas; antes, hasta 96 mm. Las 2.470
// costuras de piel de cabeza y cuello se separan como mucho 0,3 mm; antes 6,3
// mm a 80 grados de rotacion. Y el cuello no pierde piel: de perfil a 25
// grados de flexion (el caso por el que existe `smoothNeckSkin`) la piel tapa
// el 92,4% (antes 91,9%), y a 80 grados de rotacion el 92,7% (antes 84,5%,
// con un 10,1% de hueso al aire: la mandibula).
// ---------------------------------------------------------------------------

/** El borde inferior de la mandibula, de perfil: y minima por franja de z. */
export interface HeadFloor {
  /** z de la primera franja (la mas posterior). */
  z0: number;
  /** Ancho de franja, en metros. */
  step: number;
  /** y del borde en cada franja. */
  y: Float32Array;
}

/** Ancho de las franjas del perfil de la mandibula. */
const FLOOR_STEP = 0.004;
/** La franja de paso del cuello a la cabeza, bajo el borde de la mandibula. */
const FLOOR_BAND_LO = 0.048;
const FLOOR_BAND_HI = 0.002;
/** Mas lejos de la linea media ya no es cara (orejas: x de 0,07 a 0,08). */
const FLOOR_HALF_WIDTH = 0.11;

/**
 * Mide el borde inferior de la mandibula en reposo. Null si el rig no trae
 * mandibula (entonces se reparte como antes, por altura de C1).
 */
export function measureHeadFloor(scene: THREE.Object3D): HeadFloor | null {
  const pts: { z: number; y: number }[] = [];
  const p = new THREE.Vector3();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !/^Mandible(?:_\d+)?$/.test(mesh.name)) return;
    const pos = mesh.geometry?.getAttribute('position');
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      mesh.localToWorld(p);
      pts.push({ z: p.z, y: p.y });
    }
  });
  if (pts.length < 50) return null;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const q of pts) {
    if (q.z < zMin) zMin = q.z;
    if (q.z > zMax) zMax = q.z;
  }
  const n = Math.max(2, Math.ceil((zMax - zMin) / FLOOR_STEP) + 1);
  const y = new Float32Array(n).fill(Infinity);
  for (const q of pts) {
    const k = Math.min(n - 1, Math.round((q.z - zMin) / FLOOR_STEP));
    if (q.y < y[k]) y[k] = q.y;
  }
  // Franjas sin hueso (no deberia haberlas): se rellenan con la vecina.
  for (let k = 1; k < n; k++) if (!Number.isFinite(y[k])) y[k] = y[k - 1];
  for (let k = n - 2; k >= 0; k--) if (!Number.isFinite(y[k])) y[k] = y[k + 1];
  return { z0: zMin, step: FLOOR_STEP, y };
}

/**
 * Cuanto de CABEZA es un punto de reposo: 1 si esta por encima del borde de la
 * mandibula (cara), 0 si esta por debajo (cuello) o detras de la mandibula, y
 * una rampa suave en la franja que envuelve el borde.
 */
export function headShare(floor: HeadFloor | null | undefined, p: THREE.Vector3): number {
  if (!floor || Math.abs(p.x) > FLOOR_HALF_WIDTH || p.z < floor.z0) return 0;
  const last = floor.y.length - 1;
  const f = Math.min(last, (p.z - floor.z0) / floor.step);
  const k = Math.min(last - 1, Math.floor(f));
  const t = f - k;
  const yFloor = floor.y[k] * (1 - t) + floor.y[k + 1] * t;
  const lo = yFloor - FLOOR_BAND_LO;
  const hi = yFloor - FLOOR_BAND_HI;
  if (p.y <= lo) return 0;
  if (p.y >= hi) return 1;
  const u = (p.y - lo) / (hi - lo);
  return u * u * (3 - 2 * u);
}

/** Alturas de las vertebras, con el suelo de la cabeza medido al lado. */
export type VertebraHeights = Map<string, number> & { headFloor?: HeadFloor | null };

export function smoothSkinSpine(mesh: THREE.Mesh, vertY: VertebraHeights): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  // Vertebrae present in THIS mesh's skeleton, tagged with their rest world Y.
  const verts: { idx: number; y: number; name: string }[] = [];
  sk.skeleton.bones.forEach((b, i) => {
    const bn = b.name.replace(/_\d+$/, '');
    if (/^vert_/.test(bn)) {
      const y = vertY.get(bn);
      if (y !== undefined) verts.push({ idx: i, y, name: bn });
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
  // La cabeza obedece al atlas: solo si el atlas es la vertebra de arriba de
  // ESTE esqueleto (el craneo cuelga de el) y hay mandibula medida.
  const floor = verts[last].name === 'vert_C1' ? vertY.headFloor : null;
  for (let i = 0; i < pos.count; i++) {
    _vw.fromBufferAttribute(pos, i);
    mesh.localToWorld(_vw); // rest world pos (bones = identity at bind)
    const vy = _vw.y;
    const head = vy < yHi ? headShare(floor, _vw) : 0;
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
    const top = verts[last].idx;
    if (vy >= yHi || head >= 1) {
      // Por encima de la vertebra de arriba, o cara: la vertebra de arriba
      // entera (en el cuello, el atlas, del que cuelga el craneo).
      si.setXYZW(i, top, keepBone, 0, 0);
      sw.setXYZW(i, spine, keep, 0, 0);
    } else if (vy <= yLo) {
      si.setXYZW(i, verts[0].idx, top, keepBone, 0);
      sw.setXYZW(i, (1 - head) * spine, head * spine, keep, 0);
    } else {
      // Largest k with verts[k].y <= vy < verts[k+1].y -> the bracketing pair.
      let k = 0;
      while (k < last && verts[k + 1].y <= vy) k++;
      const lo = verts[k];
      const hi = verts[k + 1];
      const span = hi.y - lo.y;
      const t = span > 1e-6 ? (vy - lo.y) / span : 0;
      // En la franja del borde de la mandibula, lo que es de la cabeza va al
      // atlas y el resto se reparte como cuello. Con `head` = 0 es lo de antes.
      const wLo = (1 - head) * (1 - t) * spine;
      const wHi = (1 - head) * t * spine;
      if (hi.idx === top) {
        si.setXYZW(i, lo.idx, hi.idx, keepBone, 0);
        sw.setXYZW(i, wLo, wHi + head * spine, keep, 0);
      } else {
        si.setXYZW(i, lo.idx, hi.idx, top, keepBone);
        sw.setXYZW(i, wLo, wHi, head * spine, keep);
      }
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
export function vertebraHeights(scene: THREE.Object3D): VertebraHeights {
  const out: VertebraHeights = new Map<string, number>();
  const root = scene.getObjectByName('Spine_Armature');
  root?.traverse((o) => {
    const bn = o.name.replace(/_\d+$/, '');
    if (/^vert_/.test(bn) && !out.has(bn))
      out.set(bn, o.getWorldPosition(new THREE.Vector3()).y);
  });
  // Y el suelo de la cabeza (ver `measureHeadFloor`): viaja con las alturas
  // para que todo el que reparte por altura -- la aplicacion y el banco -- lo
  // aplique sin cambiar de firma.
  out.headFloor = measureHeadFloor(scene);
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
 * bracketan en altura. La CABEZA, que tambien viene pesada al atlas, queda
 * entera en C1: lo que esta por encima de C1 porque el reparto se satura ahi,
 * y la mitad de abajo de la cara (boca, menton), que esta POR DEBAJO de C1,
 * porque el techo del cuello es el borde de la mandibula (`measureHeadFloor`).
 * Sin eso la cara se deformaba al girar el cuello (ver arriba).
 *
 * `classify` lo decide quien llama, porque la clasificacion por material vive
 * en su lado.
 *
 * Va ANTES de `relaxSkinSeams`, como los otros pases de peso: la soldadura de
 * costuras tiene que relajar el resultado de este, no al reves.
 */
export function smoothNeckSkin(
  scene: THREE.Object3D,
  vertY: VertebraHeights,
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
  vertY: VertebraHeights,
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

/** Toraxicas, lumbares y sacro: el tronco, todo lo que no es cuello. */
const TRUNK = /^vert_(T\d+|L\d+|sacrum)$/;

/**
 * REPARTE POR NIVEL LA PIEL DEL TRONCO.
 *
 * Es el mismo fallo del cuello, una planta mas abajo, y se habia dado por
 * tratado ("la del tronco ya la tratan otros pases"). No lo estaba.
 *
 * Medido a 60 grados de flexion lumbar: dos vertices que en reposo son EL MISMO
 * PUNTO, uno en `Epigastric_regionl` y otro en `Umbilical_region`, acaban a
 * 9,5 cm. El primero lleva `vert_L1 = 1,000` y el segundo `vert_L4 = 1,000`. El
 * abdomen anterior es una pila de teselas rigidas, una por vertebra, y al
 * doblarse se abren entre si. Detras del mismo fallo: `Sacral_region` (100% en
 * `vert_sacrum`, que no se mueve nunca) contra `Vertebral_region`, 11,1 cm.
 *
 * `relaxSkinSeams` no llegaba porque descarta a proposito una franja de 2 cm a
 * cada lado de la LINEA MEDIA, que es justo donde viven el ombligo, el
 * epigastrio y el sacro.
 *
 * El reparto por altura de `smoothSkinSpine` lo cierra solo: dos vertices que
 * estan a la misma altura obtienen las mismas dos vertebras y los mismos pesos,
 * asi que la costura no puede abrirse, y de paso el abdomen se pliega en vez de
 * partirse en escalones.
 *
 * VA DESPUES DE `blendHipSkin`, no antes. Aquel pase se queda con la piel de la
 * pelvis mirando quien es su hueso DOMINANTE (`vert_sacrum`) y la religa a un
 * esqueleto de dos huesos de la pierna. Si este pase corriese primero, esas
 * teselas pasarian a ser una mezcla L5/sacro, ya no darian `vert_sacrum` como
 * dominante y la cadera volveria a abrirse por el pliegue gluteo. Corriendo
 * despues no hay conflicto: a una tesela ya religada no le queda ni una
 * vertebra en el esqueleto, de modo que `smoothSkinSpine` la deja intacta.
 */
export function smoothTrunkSkin(
  scene: THREE.Object3D,
  vertY: VertebraHeights,
  classify: (mesh: THREE.Mesh) => 'skin' | 'other',
): NeckSkinReport {
  const report: NeckSkinReport = { meshes: 0 };
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || classify(mesh) !== 'skin') return;
    const sk = mesh as THREE.SkinnedMesh;
    if (!sk.isSkinnedMesh || !sk.skeleton) return;
    if (!TRUNK.test(dominantVertebra(sk))) return;
    if (smoothSkinSpine(mesh, vertY)) report.meshes++;
  });
  return report;
}
