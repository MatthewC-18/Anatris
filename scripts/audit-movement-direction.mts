// Does a movement go the way its NAME says?
//
// A sign flip is invisible to the type checker and to every audit that only
// measures magnitude: the joint moves exactly the right number of degrees, just
// the other way. Looking at a render does not settle it either -- in a side view
// the left and right feet project on top of each other, so you cannot tell which
// one moved (that ambiguity is what left `needsVisualCheck` open on the ankle).
//
// So measure it. For each movement, take a distal LANDMARK mesh, skin it on the
// CPU at 0 deg and at the clinical maximum, and report how its centroid moved
// along each world axis. The expectation is written next to it in plain terms
// ("the toes rise"), so the output reads as a pass/fail and not as numbers to
// interpret.
//
// +y is up. Which way is ANTERIOR is NOT assumed: it is derived from the rest
// pose, by comparing the toes against the heel. Hardcoding it got hip flexion
// reported as going backwards on the first run, when what was backwards was the
// guess. Only the RIGHT side is driven.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-movement-direction.mts
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser } from './lib/rigPose.mts';

/** One direction claim we can check. */
interface Check {
  move: string;
  deg: number;
  /** Substring of the landmark mesh name (right side picked by x sign). */
  landmark: string;
  /** Axis whose sign carries the meaning. 'anterior' resolves at runtime. */
  axis: 'x' | 'y' | 'z' | 'anterior';
  /** Sign the landmark must move in for the name to be true. */
  want: 1 | -1;
  /** What that means, in words, for the report. */
  says: string;
  /**
   * Second landmark, turning the check into a TILT instead of a displacement:
   * what is measured is (landmark - vs) along the axis, so a movement that
   * carries the whole segment is invisible to it and only the relative turn
   * counts. Inversion is exactly that -- the medial border rises WHILE the
   * lateral border drops -- and measuring either border on its own cannot
   * separate it from a plain dorsiflexion of the entire foot.
   */
  vs?: string;
}

const CHECKS: Check[] = [
  { move: 'ankle-dorsiflexion',   deg: 20, landmark: 'Distal_phalanx_of_first_finger_of_foot', axis: 'y', want:  1, says: 'la punta del pie SUBE' },
  { move: 'ankle-plantarflexion', deg: 50, landmark: 'Distal_phalanx_of_first_finger_of_foot', axis: 'y', want: -1, says: 'la punta del pie BAJA' },
  { move: 'knee-flexion',         deg: 90, landmark: 'Calcaneus',                              axis: 'y', want:  1, says: 'el talon SUBE hacia el gluteo' },
  { move: 'hip-flexion',          deg: 90, landmark: 'Patella',                                axis: 'anterior', want:  1, says: 'la rodilla va HACIA DELANTE' },
  { move: 'hip-extension',        deg: 20, landmark: 'Patella',                                axis: 'anterior', want: -1, says: 'la rodilla va HACIA ATRAS' },
  { move: 'elbow-flexion',        deg: 140, landmark: 'Capitate',                              axis: 'y', want:  1, says: 'la mano SUBE hacia el hombro' },
  // Frontal plane of the foot, measured as a tilt between the two borders.
  { move: 'ankle-inversion',      deg: 35, landmark: 'First_metatarsal_bone', vs: 'Fifth_metatarsal_bone', axis: 'y', want:  1, says: 'la planta mira HACIA DENTRO (sube el borde interno)' },
  { move: 'ankle-eversion',       deg: 15, landmark: 'First_metatarsal_bone', vs: 'Fifth_metatarsal_bone', axis: 'y', want: -1, says: 'la planta mira HACIA FUERA (sube el borde externo)' },
];

const buf = readFileSync(rigGlbPath());
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder as never);
const gltf = await loader.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '',
);
const scene = gltf.scene as THREE.Object3D;

/** Mean of the skinned, world-space vertices. NEVER Box3.setFromObject: a
 *  skinned mesh's object matrix does not change when its bones move. */
function centroid(m: THREE.SkinnedMesh): THREE.Vector3 | null {
  const pos = m.geometry.attributes.position;
  if (!pos || pos.count === 0) return null;
  const step = Math.max(1, Math.floor(pos.count / 150));
  const v = new THREE.Vector3();
  const acc = new THREE.Vector3();
  let n = 0;
  for (let i = 0; i < pos.count; i += step) {
    v.fromBufferAttribute(pos, i);
    m.applyBoneTransform(i, v);
    m.localToWorld(v);
    if (!isFinite(v.x)) continue;
    acc.add(v); n++;
  }
  return n > 0 ? acc.divideScalar(n) : null;
}

/** The driven side is R. Pick the landmark copy on that side of the midline. */
function findLandmark(needle: string): THREE.SkinnedMesh | null {
  let best: THREE.SkinnedMesh | null = null;
  let bestX = -Infinity;
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    if (!m.name.toLowerCase().includes(needle.toLowerCase())) return;
    const c = centroid(m);
    if (!c) return;
    if (c.x > bestX) { bestX = c.x; best = m; }
  });
  return best;
}

// --- Which way does the body FACE? Derive it, do not guess. The toes are
// anterior to the heel, so the sign of (toe.z - heel.z) in the REST pose gives
// the anterior direction along z. Hardcoding +z got hip flexion reported as
// going backwards on the first run; what was backwards was the guess.
scene.updateMatrixWorld(true);
const toeRef = findLandmark('Distal_phalanx_of_first_finger_of_foot');
const heelRef = findLandmark('Calcaneus');
let anteriorSign = 1;
if (toeRef && heelRef) {
  const t = centroid(toeRef);
  const h = centroid(heelRef);
  if (t && h) anteriorSign = (Math.sign(t.z - h.z) || 1) as 1 | -1;
}
{
  const t = toeRef ? centroid(toeRef) : null;
  const h = heelRef ? centroid(heelRef) : null;
  const p = findLandmark('Patella');
  const pc = p ? centroid(p) : null;
  for (const n of ['Nasal_bone', 'Mandible', 'Occipital_bone', 'Sternum', 'Sacrum']) {
    const m = findLandmark(n);
    const c = m ? centroid(m) : null;
    if (c) console.log(`  ${n.padEnd(16)} z=${c.z.toFixed(3)}  y=${c.y.toFixed(3)}`);
  }
  console.log('--- referencias en reposo (z) ---');
  if (t) console.log(`  dedo gordo   z=${t.z.toFixed(3)}  y=${t.y.toFixed(3)}  x=${t.x.toFixed(3)}`);
  if (h) console.log(`  calcaneo     z=${h.z.toFixed(3)}  y=${h.y.toFixed(3)}  x=${h.x.toFixed(3)}`);
  if (pc) console.log(`  rotula       z=${pc.z.toFixed(3)}  y=${pc.y.toFixed(3)}  x=${pc.x.toFixed(3)}`);
}
console.log(`(anterior = ${anteriorSign > 0 ? '+z' : '-z'}, deducido del pie en reposo)`);

// --- And which border of the driven foot is MEDIAL? Same discipline: the first
// metatarsal is the big-toe side, so on the driven foot it must sit closer to
// the midline (x = 0) than the fifth. If the GLB ever mirrors a copy, this
// prints it instead of silently inverting the inversion check.
{
  const first = findLandmark('First_metatarsal_bone');
  const fifth = findLandmark('Fifth_metatarsal_bone');
  const a = first ? centroid(first) : null;
  const b = fifth ? centroid(fifth) : null;
  if (a && b) {
    const ok = Math.abs(a.x) < Math.abs(b.x);
    console.log(
      `(borde interno = 1er metatarsiano x=${a.x.toFixed(3)} vs 5o x=${b.x.toFixed(3)} ` +
      `-> ${ok ? 'correcto' : 'ATENCION: el 1er metatarsiano NO es el medial'})`,
    );
  }
}

let failures = 0;
console.log('\n===== DIRECCION DE LOS MOVIMIENTOS =====\n');
for (const c of CHECKS) {
  let poser;
  try { poser = createRigPoser(scene, c.move, 'R'); }
  catch (e) { console.log(`  ?  ${c.move.padEnd(24)} no accionable (${(e as Error).message})`); continue; }

  poser.pose(0);
  scene.updateMatrixWorld(true);
  const mesh = findLandmark(c.landmark);
  if (!mesh) { console.log(`  ?  ${c.move.padEnd(24)} sin hito "${c.landmark}"`); continue; }
  const ref = c.vs ? findLandmark(c.vs) : null;
  if (c.vs && !ref) { console.log(`  ?  ${c.move.padEnd(24)} sin hito "${c.vs}"`); continue; }
  const axis = c.axis === 'anterior' ? 'z' : c.axis;
  const read = (): number | null => {
    const m = centroid(mesh);
    if (!m) return null;
    if (!ref) return m[axis];
    const r = centroid(ref);
    return r ? m[axis] - r[axis] : null;
  };
  const a = read();

  poser.pose(c.deg);
  scene.updateMatrixWorld(true);
  const b = read();
  poser.pose(0);
  scene.updateMatrixWorld(true);
  if (a === null || b === null) continue;

  const flip = c.axis === 'anterior' ? anteriorSign : 1;
  // A tilt moves millimetres, not centimetres: the two borders of a foot are
  // about 7 cm apart, so 35 deg of inversion only buys a few cm of difference.
  const floor = c.vs ? 0.2 : 0.5;
  const d = (b - a) * 100 * flip;
  const ok = Math.sign(d) === c.want && Math.abs(d) > floor;
  if (!ok) failures++;
  console.log(
    `  ${ok ? 'OK ' : 'MAL'} ${c.move.padEnd(24)} a ${String(c.deg).padStart(3)} deg  ` +
    `${c.axis}${d >= 0 ? '+' : ''}${d.toFixed(1)} cm   (${c.says})`,
  );
}
console.log(`\n${failures === 0 ? 'Todas las direcciones son las que dice el nombre.' : failures + ' movimiento(s) van al reves.'}\n`);

// ===========================================================================
// THE KNEE INSIDE HIP FLEXION
//
// Hip flexion past 90 deg only exists with the knee flexed, so the arc borrows
// one (hipDeepFlexionKneeCoupling in boneMap). A DISPLACEMENT check cannot
// verify that, and the first version of this one failed a correct coupling
// because of it: with the thigh near horizontal at 120 deg, the heel ends up in
// front of the knee whether the knee folds or not. What settles it is the knee
// ANGLE itself, read off three landmarks along the limb.
// ===========================================================================
function kneeAngleDeg(): number | null {
  const hip = findLandmark('Trochanteric_insertion');
  const knee = findLandmark('Patella');
  const heel = findLandmark('Calcaneus');
  if (!hip || !knee || !heel) return null;
  const a = centroid(hip);
  const b = centroid(knee);
  const c = centroid(heel);
  if (!a || !b || !c) return null;
  const thigh = new THREE.Vector3().subVectors(b, a).normalize();
  const shank = new THREE.Vector3().subVectors(c, b).normalize();
  // 0 = a straight limb; larger = more folded.
  return (Math.acos(Math.max(-1, Math.min(1, thigh.dot(shank)))) * 180) / Math.PI;
}

console.log('===== LA RODILLA DENTRO DE LA FLEXION DE CADERA =====');
console.log('');
{
  const poser = createRigPoser(scene, 'hip-flexion', 'R');
  const rows: { deg: number; knee: number }[] = [];
  for (const d of [0, 45, 90, 105, 120]) {
    poser.pose(d);
    scene.updateMatrixWorld(true);
    const k = kneeAngleDeg();
    if (k !== null) rows.push({ deg: d, knee: k });
  }
  poser.pose(0);
  scene.updateMatrixWorld(true);
  const rest = rows.find((r) => r.deg === 0)?.knee ?? 0;
  for (const r of rows) {
    const extra = r.knee - rest;
    console.log(
      `  cadera ${String(r.deg).padStart(3)} deg -> rodilla ${r.knee.toFixed(1).padStart(5)} deg ` +
        `(${extra >= 0 ? '+' : ''}${extra.toFixed(1)} sobre el reposo)`,
    );
  }
  const straight = rows.filter((r) => r.deg <= 90).every((r) => Math.abs(r.knee - rest) < 2);
  const folds = (rows.find((r) => r.deg === 120)?.knee ?? rest) - rest > 30;
  console.log('');
  console.log(`  ${straight ? 'OK ' : 'MAL'} hasta 90 deg la pierna va RECTA (elevacion de pierna estirada)`);
  console.log(`  ${folds ? 'OK ' : 'MAL'} a 120 deg la rodilla esta doblada (los isquiotibiales ya no frenan)`);
  console.log('');
}
