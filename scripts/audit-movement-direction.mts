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
// THE THREE THINGS THIS AUDIT REFUSES TO ASSUME
//
// 1. Which way is ANTERIOR. Derived from the rest pose, by comparing the toes
//    against the heel. Hardcoding +z got hip flexion reported as going backwards
//    on the first run; what was backwards was the guess.
// 2. Which SIDE of the midline the driven limb is on. In this GLB the node
//    suffixed `_R` sits at +x, which is the anatomical LEFT (see
//    `boneMap.rigSideFor`), so "the limb at +x" is not a side anyone should name
//    from memory. Every check is run on BOTH clinical sides, the moving limb is
//    found by measurement, and any claim about medial / lateral is resolved
//    against the sign of that limb's own rest-pose x. Driving one side and
//    measuring the other is exactly how a mirrored sign survives: `wrist-flexion`
//    carries `sign: { R: -1, L: -1 }` while `elbow-flexion` carries
//    `{ R: 1, L: -1 }`, and only a both-sides run can say which is right.
// 3. Which way the SPINE bends. Its twelve movements carry no per-side sign at
//    all (one armature, one fixed direction), so "lateral flexion to the right"
//    is not a claim the data makes. What IS checkable is the PLANE -- a lateral
//    flexion must tilt in the frontal plane and not turn the shoulders, a
//    rotation must turn them and not tilt -- and that the three regions agree
//    with each other, because a lab that tips the neck one way and the lumbar
//    spine the other for the same button is broken whichever way is "right".
//
// Run: npm run audit-direction
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser } from './lib/rigPose.mts';
import { BONE_MAP, getBoneControl } from '../src/lib/boneMap.ts';

/** Axis whose sign carries the meaning of a claim.
 *  - `y`      world up.
 *  - `z`      raw world z (rarely what you want; prefer `anterior`).
 *  - `anterior` world z, flipped so + is the way the body faces.
 *  - `lateral`  world x, flipped so + is AWAY from the midline on the limb that
 *               actually moved. This is the only honest way to say "the knee
 *               separates from the midline" without naming a side.
 */
type ClaimAxis = 'y' | 'z' | 'anterior' | 'lateral';

/** One direction claim we can check. */
interface Check {
  move: string;
  /** Degrees to drive to; clamped to the movement's own clinical range. */
  deg: number;
  /** Substring of the landmark mesh name (both copies are measured). */
  landmark: string;
  axis: ClaimAxis;
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
   * separate it from a plain dorsiflexion of the entire foot. The same trick is
   * what makes the four rotations checkable: a rotation moves nothing on
   * average, it only turns one landmark past another.
   */
  vs?: string;
  /** Minimum travel, in cm, below which the reading is called "no movement". */
  floor?: number;
}

// ---------------------------------------------------------------------------
// THE LIMB MOVEMENTS. Twenty-four of them, each run on both clinical sides.
//
// Landmarks are BONE meshes on purpose. The load-time mesh repairs
// (`inflateSkinShell` and the rebinds) only touch skin, muscle and connective
// tissue, so a bone centroid reads the same with or without them -- which is why
// this audit can trust `createRigPoser` without owning a copy of the repairs.
// ---------------------------------------------------------------------------
const TOE = 'Distal_phalanx_of_first_finger_of_foot';
const HAND = 'Third_metacarpal_bone';

const CHECKS: Check[] = [
  // --- ANKLE (sagittal, then the frontal-plane tilt) ---
  { move: 'ankle-dorsiflexion',   deg: 20, landmark: TOE, axis: 'y', want:  1, says: 'la punta del pie SUBE' },
  { move: 'ankle-plantarflexion', deg: 50, landmark: TOE, axis: 'y', want: -1, says: 'la punta del pie BAJA' },
  { move: 'ankle-inversion',      deg: 35, landmark: 'First_metatarsal_bone', vs: 'Fifth_metatarsal_bone', axis: 'y', want:  1, says: 'la planta mira HACIA DENTRO (sube el borde interno)' },
  { move: 'ankle-eversion',       deg: 15, landmark: 'First_metatarsal_bone', vs: 'Fifth_metatarsal_bone', axis: 'y', want: -1, says: 'la planta mira HACIA FUERA (sube el borde externo)' },

  // --- KNEE ---
  { move: 'knee-flexion',   deg: 90,  landmark: 'Calcaneus', axis: 'y', want:  1, says: 'el talon SUBE hacia el gluteo' },
  // `arcFrom: 'max'` -- 0 deg is the straight knee and the arc is driven from the
  // flexed end back to it, so the movement is measured max -> 0 (see below).
  { move: 'knee-extension', deg: 120, landmark: 'Calcaneus', axis: 'y', want: -1, says: 'el talon BAJA al estirarse la rodilla' },
  // Tibial rotation, shown with the knee at 90. A rotation displaces nothing on
  // average, so it has to be read as the toes turning past the heel.
  { move: 'knee-internal-rotation', deg: 25, landmark: TOE, vs: 'Calcaneus', axis: 'lateral', want: -1, says: 'la punta del pie gira HACIA DENTRO', floor: 0.2 },
  { move: 'knee-external-rotation', deg: 25, landmark: TOE, vs: 'Calcaneus', axis: 'lateral', want:  1, says: 'la punta del pie gira HACIA FUERA', floor: 0.2 },

  // --- HIP ---
  { move: 'hip-flexion',   deg: 90, landmark: 'Patella', axis: 'anterior', want:  1, says: 'la rodilla va HACIA DELANTE' },
  { move: 'hip-extension', deg: 20, landmark: 'Patella', axis: 'anterior', want: -1, says: 'la rodilla va HACIA ATRAS' },
  { move: 'hip-abduction', deg: 45, landmark: 'Patella', axis: 'lateral',  want:  1, says: 'la rodilla se SEPARA de la linea media' },
  { move: 'hip-adduction', deg: 25, landmark: 'Patella', axis: 'lateral',  want: -1, says: 'la rodilla CRUZA hacia la linea media' },
  // Hip rotation is posed with the KNEE AT 90, and that inverts what the foot
  // does. The femur rolls about its own near-vertical axis while the shin
  // sticks out behind it, so the shin is a lever: an INTERNAL roll of the thigh
  // swings the foot AWAY from the midline (the prone rotation test every physio
  // does), and an external roll brings it across. The first version of this
  // check claimed the opposite, read 1,5 cm of a toe-vs-heel tilt, and called a
  // correct rig broken. The heel's own travel is the signal -- 22 cm of it.
  { move: 'hip-internal-rotation', deg: 35, landmark: 'Calcaneus', axis: 'lateral', want:  1, says: 'con la rodilla a 90, el pie se ABRE hacia fuera' },
  { move: 'hip-external-rotation', deg: 40, landmark: 'Calcaneus', axis: 'lateral', want: -1, says: 'con la rodilla a 90, el pie CRUZA hacia dentro' },

  // --- ELBOW AND FOREARM ---
  { move: 'elbow-flexion',   deg: 140, landmark: 'Capitate', axis: 'y', want:  1, says: 'la mano SUBE hacia el hombro' },
  { move: 'elbow-extension', deg: 140, landmark: 'Capitate', axis: 'y', want: -1, says: 'la mano BAJA al estirarse el codo' },
  // Pronosupination is posed with the elbow at 90, so the hand is the pointer:
  // thumb up at neutral, palm down in pronation. The radial side of the wrist
  // (scaphoid) crossing past the ulnar side (pisiform) is the whole movement.
  // Both now open at NEUTRAL, thumb up (FOREARM_NEUTRAL in boneMap): from there
  // pronation lays the palm down, carrying the thumb across to the medial side,
  // and supination lays it up, carrying the thumb out. Measured on the first
  // metacarpal against the fifth, which are 6 cm apart -- the scaphoid and the
  // pisiform are 2,8 cm apart and the reading was nearly noise.
  { move: 'elbow-pronation',  deg: 80, landmark: 'First_metacarpal_bone', vs: 'Fifth_metacarpal_bone', axis: 'lateral', want: -1, says: 'el pulgar CRUZA hacia dentro (palma abajo)', floor: 0.2 },
  { move: 'elbow-supination', deg: 85, landmark: 'First_metacarpal_bone', vs: 'Fifth_metacarpal_bone', axis: 'lateral', want:  1, says: 'el pulgar gira HACIA FUERA (palma arriba)', floor: 0.2 },

  // --- WRIST. The rest forearm is supinated (measured: radius x 0.258 lateral to
  // ulna x 0.227, index metacarpal lateral to middle), so the palm faces the way
  // the body faces and flexion carries the hand ANTERIORLY.
  { move: 'wrist-flexion',   deg: 70, landmark: HAND, vs: 'Capitate', axis: 'anterior', want:  1, says: 'la palma se cierra HACIA DELANTE', floor: 0.15 },
  { move: 'wrist-extension', deg: 60, landmark: HAND, vs: 'Capitate', axis: 'anterior', want: -1, says: 'el dorso se cierra HACIA ATRAS', floor: 0.15 },

  // --- SHOULDER. Abduction and flexion are `kind: 'chain'` (real
  // scapulohumeral rhythm), so what is checked is where the hand ends up, which
  // is the claim the name makes. The two rotations are posed with the elbow at
  // 90, which turns the forearm into a pointer sweeping across the belly.
  { move: 'glenohumeral-abduction', deg: 90, landmark: 'Capitate', axis: 'lateral',  want:  1, says: 'la mano se SEPARA del cuerpo' },
  { move: 'glenohumeral-flexion',   deg: 90, landmark: 'Capitate', axis: 'anterior', want:  1, says: 'la mano va HACIA DELANTE' },
  { move: 'glenohumeral-internal-rotation', deg: 60, landmark: 'Capitate', axis: 'lateral', want: -1, says: 'el antebrazo cruza HACIA EL VIENTRE' },
  { move: 'glenohumeral-external-rotation', deg: 70, landmark: 'Capitate', axis: 'lateral', want:  1, says: 'el antebrazo se ABRE hacia fuera' },
];

// ---------------------------------------------------------------------------
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

scene.updateMatrixWorld(true);

// --- THE TRUE REST POSE, kept apart.
//
// `createRigPoser` captures "rest" from the scene AS IT FINDS IT, and a movement
// with an examination posture (the two shoulder rotations, pronosupination, the
// hip and knee rotations) leaves that posture standing after its last `pose(0)`.
// Create the next poser on top of that and it adopts a bent elbow as its rest,
// then adds its own 90 deg on top: measured, `elbow-supination` opened with the
// hand at y=1.347 instead of y=1.160, and reported its direction from a pose no
// patient has. So the scene goes back to THIS snapshot before every poser.
const restSnapshot: { o: THREE.Object3D; q: THREE.Quaternion; p: THREE.Vector3; s: THREE.Vector3 }[] = [];
scene.traverse((o) => {
  restSnapshot.push({ o, q: o.quaternion.clone(), p: o.position.clone(), s: o.scale.clone() });
});
function restoreRest(): void {
  for (const r of restSnapshot) {
    r.o.quaternion.copy(r.q);
    r.o.position.copy(r.p);
    r.o.scale.copy(r.s);
  }
  scene.updateMatrixWorld(true);
}

/**
 * The landmark copy on each side of the midline, chosen ONCE in the rest pose
 * (choosing it again mid-pose could pick a different copy and compare two
 * different bones). `+1` is the copy at positive x, `-1` the copy at negative x
 * -- geometry, not anatomy: which of the two a clinical side drives is decided
 * by measurement, further down.
 */
const landmarkCache = new Map<string, { plus: THREE.SkinnedMesh | null; minus: THREE.SkinnedMesh | null }>();
function landmarksFor(needle: string) {
  const hit = landmarkCache.get(needle);
  if (hit) return hit;
  let plus: THREE.SkinnedMesh | null = null, minus: THREE.SkinnedMesh | null = null;
  let bestPlus = -Infinity, bestMinus = Infinity;
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    if (!m.name.toLowerCase().includes(needle.toLowerCase())) return;
    const c = centroid(m);
    if (!c) return;
    if (c.x > bestPlus) { bestPlus = c.x; plus = m; }
    if (c.x < bestMinus) { bestMinus = c.x; minus = m; }
  });
  const out = { plus, minus };
  landmarkCache.set(needle, out);
  return out;
}
/** Back-compat helper for the single-landmark probes below. */
function findLandmark(needle: string): THREE.SkinnedMesh | null {
  return landmarksFor(needle).plus;
}

// --- Which way does the body FACE? Derive it, do not guess. The toes are
// anterior to the heel, so the sign of (toe.z - heel.z) in the REST pose gives
// the anterior direction along z. Hardcoding +z got hip flexion reported as
// going backwards on the first run; what was backwards was the guess.
const toeRef = findLandmark(TOE);
const heelRef = findLandmark('Calcaneus');
let anteriorSign: 1 | -1 = 1;
if (toeRef && heelRef) {
  const t = centroid(toeRef);
  const h = centroid(heelRef);
  if (t && h) anteriorSign = (Math.sign(t.z - h.z) || 1) as 1 | -1;
}
console.log('--- referencias en reposo ---');
for (const n of [TOE, 'Calcaneus', 'Patella', 'Capitate', 'Scaphoid', 'Pisiform', 'Nasal_bone', 'Occipital_bone', 'Body_of_sternum', 'Subacromial_bursa']) {
  const m = findLandmark(n);
  const c = m ? centroid(m) : null;
  if (c) console.log(`  ${n.padEnd(22)} x=${c.x.toFixed(3).padStart(6)} y=${c.y.toFixed(3).padStart(6)} z=${c.z.toFixed(3).padStart(6)}`);
}
console.log(`(anterior = ${anteriorSign > 0 ? '+z' : '-z'}, deducido del pie en reposo)`);

// --- And which border of the driven foot is MEDIAL? Same discipline: the first
// metatarsal is the big-toe side, so on each foot it must sit closer to the
// midline (x = 0) than the fifth. If the GLB ever mirrors a copy, this prints it
// instead of silently inverting the inversion check.
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
  // And that the forearm really is supinated at rest, which is what makes
  // "wrist flexion carries the hand forward" true.
  const sca = findLandmark('Scaphoid');
  const pis = findLandmark('Pisiform');
  const sc = sca ? centroid(sca) : null;
  const pc = pis ? centroid(pis) : null;
  if (sc && pc) {
    const sup = Math.abs(sc.x) > Math.abs(pc.x);
    console.log(
      `(antebrazo en reposo: escafoides x=${sc.x.toFixed(3)} vs pisiforme x=${pc.x.toFixed(3)} ` +
      `-> ${sup ? 'SUPINADO, palma al frente' : 'ATENCION: pronado, revisa la flexion de muneca'})`,
    );
  }
}

/** Clamp a requested angle to what the movement actually allows. */
function clampDeg(move: string, deg: number): number {
  const c = getBoneControl(move) as { clinicalRange?: { min: number; max: number } } | undefined;
  const max = c?.clinicalRange?.max;
  return typeof max === 'number' ? Math.min(deg, max) : deg;
}

interface Reading { plus: number | null; minus: number | null }

/** Read the claim's quantity on BOTH copies of the landmark at the current pose. */
function readBoth(c: Check): Reading {
  const axis = c.axis === 'anterior' || c.axis === 'z' ? 'z' : c.axis === 'y' ? 'y' : 'x';
  const L = landmarksFor(c.landmark);
  const R = c.vs ? landmarksFor(c.vs) : null;
  const one = (m: THREE.SkinnedMesh | null, r: THREE.SkinnedMesh | null): number | null => {
    if (!m) return null;
    const a = centroid(m);
    if (!a) return null;
    if (!c.vs) return a[axis];
    if (!r) return null;
    const b = centroid(r);
    return b ? a[axis] - b[axis] : null;
  };
  return { plus: one(L.plus, R ? R.plus : null), minus: one(L.minus, R ? R.minus : null) };
}

let failures = 0;
const notes: string[] = [];

console.log('\n===== DIRECCION DE LOS MOVIMIENTOS (los dos lados) =====');
console.log('Cada fila: el lado clinico accionado, cuanto viajo el hito y hacia donde.\n');

for (const c of CHECKS) {
  const deg = clampDeg(c.move, c.deg);
  const ctrl = getBoneControl(c.move) as { arcFrom?: 'max' } | undefined;
  // `arcFrom: 'max'` movements (elbow and knee extension) share one physical arc
  // with their flexion: 0 deg is the straight joint and the named movement is the
  // RETURN to it. Measuring 0 -> deg would report the flexion, so measure deg -> 0.
  const fromMax = ctrl?.arcFrom === 'max';

  for (const side of ['R', 'L'] as const) {
    let poser;
    restoreRest();
    try { poser = createRigPoser(scene, c.move, side); }
    catch (e) { console.log(`  ?   ${c.move.padEnd(32)} ${side}  no accionable (${(e as Error).message})`); continue; }

    poser.pose(fromMax ? deg : 0);
    scene.updateMatrixWorld(true);
    const a = readBoth(c);
    poser.pose(fromMax ? 0 : deg);
    scene.updateMatrixWorld(true);
    const b = readBoth(c);
    poser.pose(0);
    scene.updateMatrixWorld(true);

    if (a.plus === null || b.plus === null || a.minus === null || b.minus === null) {
      console.log(`  ?   ${c.move.padEnd(32)} ${side}  sin hito "${c.landmark}"${c.vs ? ` / "${c.vs}"` : ''}`);
      continue;
    }
    // Travel of each copy, in cm.
    const dPlus = (b.plus - a.plus) * 100;
    const dMinus = (b.minus - a.minus) * 100;
    // WHICH limb did this side actually drive? Measured, never assumed: the one
    // that moved. The other must stay put, or the rig is dragging the wrong limb
    // along -- a real failure mode on five independent armatures.
    const moverIsPlus = Math.abs(dPlus) >= Math.abs(dMinus);
    const moved = moverIsPlus ? dPlus : dMinus;
    const still = moverIsPlus ? dMinus : dPlus;
    const geom = moverIsPlus ? '+x' : '-x';

    // Resolve the claim's sign on the limb that moved.
    const restX = (() => {
      const m = moverIsPlus ? landmarksFor(c.landmark).plus : landmarksFor(c.landmark).minus;
      const p = m ? centroid(m) : null;
      return p ? p.x : (moverIsPlus ? 1 : -1);
    })();
    const flip =
      c.axis === 'anterior' ? anteriorSign :
      c.axis === 'lateral' ? ((Math.sign(restX) || 1) as 1 | -1) :
      1;
    const d = moved * flip;

    // A tilt moves millimetres, not centimetres: the two borders of a foot are
    // about 7 cm apart, so 35 deg of inversion only buys a few cm of difference.
    const floor = c.floor ?? (c.vs ? 0.2 : 0.5);
    const dirOk = Math.sign(d) === c.want && Math.abs(d) > floor;
    // Cross-talk: the limb that should NOT move is allowed a third of the
    // mover's travel (the trunk leans a little under a big hip or shoulder arc).
    const quiet = Math.abs(still) <= Math.max(floor, Math.abs(moved) * 0.34);
    const ok = dirOk && quiet;
    if (!ok) failures++;
    if (dirOk && !quiet) {
      notes.push(`${c.move} (${side}): arrastra el otro lado ${still.toFixed(1)} cm frente a ${moved.toFixed(1)} cm del accionado`);
    }
    console.log(
      `  ${ok ? 'OK ' : 'MAL'} ${c.move.padEnd(32)} ${side} -> ${geom}  ` +
      `${String(deg).padStart(3)} deg  ${c.axis}${d >= 0 ? '+' : ''}${d.toFixed(1)} cm  ` +
      `(otro lado ${still >= 0 ? '+' : ''}${still.toFixed(1)})   ${c.says}`,
    );
  }
}

console.log('');
if (notes.length) {
  console.log('  Avisos de arrastre:');
  for (const n of notes) console.log(`    - ${n}`);
  console.log('');
}
console.log(`  ${failures === 0 ? 'Los 24 movimientos de los miembros van donde dice el nombre, en los dos lados.' : failures + ' comprobacion(es) de miembro fallan.'}`);
console.log('');

// ===========================================================================
// EL RAQUIS: DOCE MOVIMIENTOS SIN LADO
//
// A spine control is `{ axis, sign }` with no per-side entry, so the data makes
// no claim about turning right rather than left: there is one armature and one
// fixed direction. Demanding a side here would be inventing a requirement.
//
// What the name DOES claim is a PLANE, and that is measurable:
//   - flexion / extension -> the marker travels sagittally (anterior / posterior)
//   - lateral flexion     -> it travels in the frontal plane, and the shoulders
//                            do NOT turn one in front of the other
//   - rotation            -> the shoulders DO turn past each other, and they do
//                            not tilt one above the other
// And then the three regions must agree with each other: a lab that tips the
// neck one way and the lumbar spine the other, for the same button, is wrong
// whichever direction you decide is "right".
// ===========================================================================
interface SpineRow {
  move: string;
  sagittal: number; // cm, + = anterior
  frontal: number;  // cm, + = toward +x
  /**
   * cm, + = the FRONT of the segment turns toward +x.
   *
   * Two different pairs measure this -- the nose past the occiput for the neck,
   * the two shoulders for the trunk -- and they do NOT share a sign. A face
   * turning toward +x moves the nose toward +x; a chest turning toward +x
   * carries the +x shoulder BACKWARDS. Comparing the raw numbers reported the
   * neck turning one way and the trunk the other, which was the comparison
   * being wrong rather than the rig. Both are normalised here to "the front
   * turns toward +x" before anything compares them.
   */
  twist: number;
  tilt: number;     // cm, + = the +x shoulder (or the nose) goes up
}

const SPINE_MOVES = [
  'cervical-flexion', 'cervical-extension', 'cervical-lateral-flexion', 'cervical-rotation',
  'thoracic-flexion', 'thoracic-extension', 'thoracic-lateral-flexion', 'thoracic-rotation',
  'lumbar-flexion', 'lumbar-extension', 'lumbar-lateral-flexion', 'lumbar-rotation',
].filter((m) => BONE_MAP[m]?.kind === 'spine');

/** The marker that reads the region's own displacement. */
function spineMarker(move: string): string {
  return move.startsWith('cervical') ? 'Nasal_bone' : 'Body_of_sternum';
}
/**
 * The PAIR that reads a turn. For the neck the head itself is the pair (the nose
 * swings one way while the occiput swings the other); below it, the two
 * shoulders are, because the spine carries the girdle with `vert_T3`.
 */
function spinePair(move: string): [string, string] | null {
  if (move.startsWith('cervical')) return ['Nasal_bone', 'Occipital_bone'];
  return ['Subacromial_bursa', 'Subacromial_bursa'];
}

function pairDelta(move: string, axis: 'x' | 'y' | 'z'): number | null {
  const p = spinePair(move);
  if (!p) return null;
  const [an, bn] = p;
  if (an === bn) {
    // The same name on both sides of the midline: + x copy minus - x copy.
    const L = landmarksFor(an);
    if (!L.plus || !L.minus) return null;
    const a = centroid(L.plus), b = centroid(L.minus);
    return a && b ? a[axis] - b[axis] : null;
  }
  // Two different names: the pair is a front-to-back axis on the midline, read
  // along x for a turn (the nose leaves the occiput's vertical plane).
  const A = findLandmark(an), B = findLandmark(bn);
  if (!A || !B) return null;
  const a = centroid(A), b = centroid(B);
  return a && b ? a[axis] - b[axis] : null;
}

const spineRows: SpineRow[] = [];
for (const move of SPINE_MOVES) {
  const ctrl = BONE_MAP[move] as { clinicalRange: { max: number } };
  const deg = ctrl.clinicalRange.max;
  let poser;
  restoreRest();
  try { poser = createRigPoser(scene, move, 'R'); }
  catch (e) { console.log(`  ?   ${move.padEnd(26)} no accionable (${(e as Error).message})`); continue; }

  const mk = spineMarker(move);
  const read = () => {
    const m = findLandmark(mk);
    const c = m ? centroid(m) : null;
    return {
      z: c ? c.z : null, x: c ? c.x : null,
      // Neck: the nose's offset from the occiput along x, + = facing +x.
      // Trunk: the +x shoulder's offset along the anterior axis, NEGATED,
      // because that shoulder going back is the chest turning toward +x.
      twistAxis: move.startsWith('cervical')
        ? pairDelta(move, 'x')
        : (() => { const d = pairDelta(move, 'z'); return d === null ? null : -d * anteriorSign; })(),
      tiltAxis: pairDelta(move, 'y'),
    };
  };
  poser.pose(0); scene.updateMatrixWorld(true);
  const a = read();
  poser.pose(deg); scene.updateMatrixWorld(true);
  const b = read();
  poser.pose(0); scene.updateMatrixWorld(true);
  if (a.z === null || b.z === null || a.x === null || b.x === null) continue;
  spineRows.push({
    move,
    sagittal: (b.z - a.z) * 100 * anteriorSign,
    frontal: (b.x - a.x) * 100,
    twist: a.twistAxis !== null && b.twistAxis !== null ? (b.twistAxis - a.twistAxis) * 100 : 0,
    tilt: a.tiltAxis !== null && b.tiltAxis !== null ? (b.tiltAxis - a.tiltAxis) * 100 : 0,
  });
}

console.log('===== EL RAQUIS: EN QUE PLANO SE MUEVE CADA UNO =====');
console.log('sag = sagital (+ delante)   fro = frontal (+ hacia +x)');
console.log('gir = giro (+ el frente del segmento mira hacia +x)   inc = inclinacion (+ el hombro +x sube)');
console.log('');
let spineFail = 0;
for (const r of spineRows) {
  const kind =
    r.move.endsWith('-rotation') ? 'rotation' :
    r.move.endsWith('-lateral-flexion') ? 'lateral' :
    r.move.endsWith('-extension') ? 'extension' : 'flexion';
  let ok = false;
  let claim = '';
  // The floors are small on purpose: lumbar rotation is 5 deg of real range, so
  // its whole signal is a few millimetres. Calling that "no movement" would be a
  // false alarm about a number the data deliberately keeps small.
  if (kind === 'flexion') { ok = r.sagittal > 0.5 && Math.abs(r.sagittal) > Math.abs(r.frontal); claim = 'el tronco va HACIA DELANTE'; }
  if (kind === 'extension') { ok = r.sagittal < -0.5 && Math.abs(r.sagittal) > Math.abs(r.frontal); claim = 'el tronco va HACIA ATRAS'; }
  if (kind === 'lateral') { ok = Math.abs(r.frontal) > 0.5 && Math.abs(r.frontal) > Math.abs(r.sagittal) && Math.abs(r.twist) < Math.abs(r.frontal); claim = 'se inclina DE LADO, sin girar'; }
  if (kind === 'rotation') { ok = Math.abs(r.twist) > 0.15 && Math.abs(r.twist) > Math.abs(r.tilt); claim = 'los hombros GIRAN, sin inclinarse'; }
  if (!ok) spineFail++;
  console.log(
    `  ${ok ? 'OK ' : 'MAL'} ${r.move.padEnd(26)} sag${r.sagittal >= 0 ? '+' : ''}${r.sagittal.toFixed(1).padStart(5)}  ` +
    `fro${r.frontal >= 0 ? '+' : ''}${r.frontal.toFixed(1).padStart(5)}  ` +
    `gir${r.twist >= 0 ? '+' : ''}${r.twist.toFixed(1).padStart(5)}  ` +
    `inc${r.tilt >= 0 ? '+' : ''}${r.tilt.toFixed(1).padStart(5)}   ${claim}`,
  );
}

// --- And do the three regions agree with each other?
console.log('');
{
  const lat = spineRows.filter((r) => r.move.endsWith('-lateral-flexion'));
  const rot = spineRows.filter((r) => r.move.endsWith('-rotation'));
  const sameLat = lat.length > 1 && lat.every((r) => Math.sign(r.frontal) === Math.sign(lat[0].frontal));
  const sameRot = rot.length > 1 && rot.every((r) => Math.sign(r.twist) === Math.sign(rot[0].twist));
  if (!sameLat) spineFail++;
  if (!sameRot) spineFail++;
  console.log(
    `  ${sameLat ? 'OK ' : 'MAL'} las tres inclinaciones laterales van al MISMO lado ` +
    `(${lat.map((r) => `${r.move.split('-')[0]} ${r.frontal >= 0 ? '+' : '-'}`).join(', ')})`,
  );
  console.log(
    `  ${sameRot ? 'OK ' : 'MAL'} las tres rotaciones giran al MISMO lado ` +
    `(${rot.map((r) => `${r.move.split('-')[0]} ${r.twist >= 0 ? '+' : '-'}`).join(', ')})`,
  );
}
console.log('');
console.log(`  ${spineFail === 0 ? 'Los doce movimientos del raquis se mueven en el plano que dice su nombre.' : spineFail + ' comprobacion(es) del raquis fallan.'}`);
console.log('');

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
  restoreRest();
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

// --- Coverage. An audit that quietly checks a third of the movements is worse
// than no audit, because it reads as a clean bill of health.
{
  const drivable = Object.entries(BONE_MAP)
    .filter(([, c]) => c.kind === 'joint' || c.kind === 'chain' || c.kind === 'spine')
    .map(([id]) => id);
  const covered = new Set([...CHECKS.map((c) => c.move), ...spineRows.map((r) => r.move)]);
  const missing = drivable.filter((id) => !covered.has(id));
  console.log('===== COBERTURA =====');
  console.log('');
  console.log(`  ${covered.size} de ${drivable.length} movimientos accionables comprobados.`);
  if (missing.length) {
    console.log(`  SIN COMPROBAR: ${missing.join(', ')}`);
  } else {
    console.log('  Ninguno se queda sin comprobar.');
  }
  console.log('');
  if (failures + spineFail > 0 || missing.length > 0) process.exitCode = 1;
}
