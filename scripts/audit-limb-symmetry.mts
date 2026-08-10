// Left/right SYMMETRY audit for every single-bone limb movement in BONE_MAP.
//
// WHY THIS EXISTS. A clinical movement must look the SAME on both sides: the
// right hip flexes forward and so does the left. The rig drives each side by
// rotating the mapped bone about its LOCAL axis with a per-side sign, which only
// mirrors the motion when the two armatures are actually mirror images of each
// other. On this rig that is true for `shin_flex` and `foot_flex` but NOT for
// `femur_base`: both femurs ship with the SAME world-space local frame, so a
// flipped sign there does not mirror the movement, it REVERSES it (the left hip
// "flexes" backwards). This script measures that instead of reasoning about it.
//
// HOW. For each joint movement it replays the runtime's own pose (boneMap's axis
// + per-side sign, rotateOnAxis on the local axis, exactly as RigModel does) at
// the top of the clinical range, on each side, and measures TWO things:
//
//   1. the WORLD ROTATION the driven bone received. Mirroring the body across the
//      sagittal plane (x -> -x) turns a rotation (x,y,z,w) into (x,-y,-z,w), so
//      the left bone's turn must equal that mirror of the right one. This is the
//      verdict: it catches pure rotations (hip/knee rotation, inversion) where the
//      limb barely travels and a position test would report nothing.
//   2. where the limb's distal landmark ENDS UP, which is what the report prints
//      in anatomical terms (anterior / lateral / craneal), so a failure says what
//      the leg is actually doing rather than just that it differs.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-limb-symmetry.mts [rig.glb]
// Exits non-zero when any movement is asymmetric, so it can gate a release.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { BONE_MAP, resolveArmatureName, type Side, type RigAxis } from '../src/lib/boneMap.ts';

const GLB = process.argv[2] || 'public/cuerpo-rig.opt.glb';
const D2R = Math.PI / 180;
/** Above this the two sides are not turning the same way (degrees). */
const TOL_DEG = 3;

const AX: Record<RigAxis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf: { scene: THREE.Group } = await new Promise((res, rej) =>
  loader.parse(ab, '', res as (g: unknown) => void, rej),
);
const scene = gltf.scene;
scene.updateMatrixWorld(true);

/** Bone names carry an export suffix (`femur_base_12`); strip it. */
const bs = (n: string) => n.replace(/_\d+$/, '');

const byArmature = new Map<string, Map<string, THREE.Object3D>>();
for (const an of [
  'Shoulder_Armature_R', 'Shoulder_Armature_L',
  'Leg_Armature_R', 'Leg_Armature_L',
  'Spine_Armature',
]) {
  const root = scene.getObjectByName(an);
  if (!root) continue;
  const m = new Map<string, THREE.Object3D>();
  root.traverse((o) => { if (!m.has(bs(o.name))) m.set(bs(o.name), o); });
  byArmature.set(an, m);
}

const restQuat = new Map<THREE.Object3D, THREE.Quaternion>();
const restWorld = new Map<THREE.Object3D, THREE.Matrix4>();
scene.traverse((o) => {
  restQuat.set(o, o.quaternion.clone());
  restWorld.set(o, o.matrixWorld.clone());
});
const resetPose = () => {
  for (const [o, q] of restQuat) o.quaternion.copy(q);
  scene.updateMatrixWorld(true);
};

/**
 * ANTERIOR world axis, MEASURED rather than assumed: the patella sits in front of
 * the knee joint it rides on, so the sign of (patella.z - knee.z) is the front of
 * the body. Cross-checks against the knee: with this sign, knee flexion comes out
 * posterior (the calf folds backwards), which is what the lab shows.
 */
function anteriorSign(): number {
  let patella: THREE.Vector3 | undefined;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (patella || !m.isMesh || !/^Patella[0-9_]*$/i.test(m.name)) return;
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    patella = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  });
  const knee = byArmature.get('Leg_Armature_R')?.get('shin_flex');
  if (!patella || !knee) throw new Error('no puedo medir el eje anterior (falta rotula o shin_flex)');
  return patella.z > knee.getWorldPosition(new THREE.Vector3()).z ? 1 : -1;
}
const ANT = anteriorSign();

/** A world rotation seen in a mirror across the sagittal plane (x -> -x). */
function mirrorQuat(q: THREE.Quaternion): THREE.Quaternion {
  return new THREE.Quaternion(q.x, -q.y, -q.z, q.w);
}

/** Angle between two rotations, in degrees (q and -q are the same rotation). */
function quatAngleDeg(a: THREE.Quaternion, b: THREE.Quaternion): number {
  const dot = Math.min(1, Math.abs(a.dot(b)));
  return (2 * Math.acos(dot)) / D2R;
}

/** The deepest bone under `bone` -- the limb's distal landmark. */
function distalBone(bone: THREE.Object3D): THREE.Object3D {
  let best = bone;
  let bestDepth = -1;
  const walk = (o: THREE.Object3D, d: number) => {
    if ((o as THREE.Bone).isBone && d > bestDepth) { best = o; bestDepth = d; }
    for (const c of o.children) walk(c, d + 1);
  };
  walk(bone, 0);
  return best;
}

/** Human-readable anatomical direction of a displacement, for the report. */
function describe(v: THREE.Vector3, side: Side): string {
  const lateralSign = side === 'R' ? 1 : -1; // +x is the right half of the body
  const parts: [number, string][] = [
    [v.x * lateralSign, v.x * lateralSign > 0 ? 'lateral' : 'medial'],
    [v.y, v.y > 0 ? 'craneal' : 'caudal'],
    [v.z * ANT, v.z * ANT > 0 ? 'anterior' : 'posterior'],
  ];
  return parts
    .filter(([n]) => Math.abs(n) >= 0.01)
    .sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]))
    .map(([n, label]) => `${label} ${Math.abs(n * 100).toFixed(1)}cm`)
    .join(' + ') || 'sin desplazamiento';
}

// ---------------------------------------------------------------------------
// SHOULDER ELEVATION CHAINS. Not a single bone: RigModel runs the decomposition,
// then adds the scapulothoracic wrap, the aim and the forward arm clearance. The
// constants below live in the component, not in a lib, so they are copied here
// (same as scripts/sweep-shoulder-arc.mts). The one step NOT replayed is
// carryShouldersWithSpine, which rides BOTH shoulder roots on the same vertebra
// delta and so cannot break the mirror.
// ---------------------------------------------------------------------------
const WRAP: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0], [25, 30.6, -11.3], [49.4, 44.4, -28.1], [60, 45.6, -36.3],
];
const WRAP_SIGN: Record<Side, 1 | -1> = { R: 1, L: -1 };
const ARM_CLEARANCE_DEG = 35;
const ARM_CLEARANCE_SIGN: Record<Side, 1 | -1> = { R: -1, L: -1 };
const ARM_CLEARANCE_FADE_DEG = 75;
const CHAIN_ANGLES = [30, 60, 90, 120, 150, 180];

function scapulaWrap(upDeg: number): [number, number] {
  const u = Math.abs(upDeg);
  const last = WRAP[WRAP.length - 1];
  if (u >= last[0]) return [last[1], last[2]];
  for (let i = 1; i < WRAP.length; i++) {
    const [u1, y1, z1] = WRAP[i];
    if (u > u1) continue;
    const [u0, y0, z0] = WRAP[i - 1];
    const t = u1 - u0 <= 1e-6 ? 0 : (u - u0) / (u1 - u0);
    return [y0 + (y1 - y0) * t, z0 + (z1 - z0) * t];
  }
  return [0, 0];
}

/** Pose one side of a chain movement and hand back the hand's world position. */
function poseChain(
  ctrl: Extract<(typeof BONE_MAP)[string], { kind: 'chain' }>,
  side: Side,
  deg: number,
): { hand: THREE.Vector3; humerus: THREE.Quaternion } {
  resetPose();
  const shoulderBones = byArmature.get(resolveArmatureName('Shoulder_Armature', side));
  const spineBones = byArmature.get('Spine_Armature');
  const outputs = ctrl.decompose(deg, side);
  const seen = new Set<THREE.Object3D>();
  for (const { key, target } of ctrl.targets) {
    const rad = outputs[key];
    if (rad === undefined) continue;
    const map = target.armature === 'spine' ? spineBones : shoulderBones;
    if (!map) continue;
    for (const bn of target.bones) {
      const bone = map.get(bn);
      if (!bone) continue;
      if (!seen.has(bone)) {
        bone.quaternion.copy(restQuat.get(bone) ?? new THREE.Quaternion());
        seen.add(bone);
      }
      bone.rotateOnAxis(AX[target.axis], rad);
    }
  }
  const scap = shoulderBones?.get('scapula');
  const hum = shoulderBones?.get('humerus_gh');
  const elbow = shoulderBones?.get('forearm_flex');
  const hand = shoulderBones?.get('hand_flex');
  if (!scap || !hum || !elbow || !hand) throw new Error(`falta un hueso del hombro ${side}`);
  // Scapulothoracic wrap, holding the humerus where it pointed.
  const upRad = outputs.scapula;
  if (upRad) {
    scene.updateMatrixWorld(true);
    const before = scap.getWorldQuaternion(new THREE.Quaternion());
    const [wy, wz] = scapulaWrap(upRad / D2R);
    scap.rotateOnAxis(AX.y, WRAP_SIGN[side] * wy * D2R);
    scap.rotateOnAxis(AX.z, WRAP_SIGN[side] * wz * D2R);
    scene.updateMatrixWorld(true);
    const after = scap.getWorldQuaternion(new THREE.Quaternion());
    hum.quaternion.premultiply(after.invert().multiply(before));
  }
  // Aim: land the shaft on exactly the goniometric angle, in its own plane.
  if (ctrl.aimPlane) {
    scene.updateMatrixWorld(true);
    const restH = restWorld.get(hum);
    const restE = restWorld.get(elbow);
    if (restH && restE) {
      const rh = new THREE.Vector3().setFromMatrixPosition(restH);
      const re = new THREE.Vector3().setFromMatrixPosition(restE);
      const want = re.sub(rh).normalize();
      const inPlaneSign = side === 'R' ? 1 : -1;
      if (ctrl.aimPlane === 'z') {
        const r = Math.hypot(want.x, want.y);
        const a = Math.atan2(want.x, -want.y) + deg * D2R * inPlaneSign;
        want.set(Math.sin(a) * r, -Math.cos(a) * r, want.z).normalize();
      } else {
        const r = Math.hypot(want.z, want.y);
        const a = Math.atan2(want.z, -want.y) + deg * D2R;
        want.set(want.x, -Math.cos(a) * r, Math.sin(a) * r).normalize();
      }
      const ph = hum.getWorldPosition(new THREE.Vector3());
      const pe = elbow.getWorldPosition(new THREE.Vector3());
      const have = pe.sub(ph).normalize();
      const fix = new THREE.Quaternion().setFromUnitVectors(have, want);
      const pw = hum.parent
        ? hum.parent.getWorldQuaternion(new THREE.Quaternion())
        : new THREE.Quaternion();
      hum.quaternion.premultiply(pw.clone().invert().multiply(fix).multiply(pw));
    }
  }
  // Forward clearance, faded out at high elevation.
  const f = Math.max(0, Math.min(1, (ARM_CLEARANCE_FADE_DEG - deg) / ARM_CLEARANCE_FADE_DEG));
  if (f > 0) hum.rotateOnAxis(AX.x, ARM_CLEARANCE_SIGN[side] * ARM_CLEARANCE_DEG * f * D2R);
  scene.updateMatrixWorld(true);
  return {
    hand: hand.getWorldPosition(new THREE.Vector3()),
    humerus: hum.getWorldQuaternion(new THREE.Quaternion()),
  };
}

interface Row {
  id: string;
  bone: string;
  axis: RigAxis;
  deg: number;
  dR: THREE.Vector3;
  dL: THREE.Vector3;
  mismatchDeg: number;
}

const rows: Row[] = [];
for (const [id, ctrl] of Object.entries(BONE_MAP)) {
  if (ctrl.kind !== 'joint') continue;
  const deg = ctrl.clinicalRange.max;
  const travel: Partial<Record<Side, THREE.Vector3>> = {};
  const turn: Partial<Record<Side, THREE.Quaternion>> = {};
  let landmark = '';
  for (const side of ['R', 'L'] as Side[]) {
    resetPose();
    const bones = byArmature.get(resolveArmatureName(ctrl.armatureBase, side));
    const bone = bones?.get(ctrl.bone);
    if (!bone) { console.warn(`missing bone: ${ctrl.armatureBase}_${side}/${ctrl.bone}`); continue; }
    const distal = distalBone(bone);
    landmark = bs(distal.name);
    const restPos = distal.getWorldPosition(new THREE.Vector3());
    const restRot = bone.getWorldQuaternion(new THREE.Quaternion());
    bone.rotateOnAxis(AX[ctrl.axis], ctrl.sign[side] * deg * D2R);
    scene.updateMatrixWorld(true);
    travel[side] = distal.getWorldPosition(new THREE.Vector3()).sub(restPos);
    turn[side] = bone.getWorldQuaternion(new THREE.Quaternion()).multiply(restRot.invert());
  }
  resetPose();
  const dR = travel.R;
  const dL = travel.L;
  if (!dR || !dL || !turn.R || !turn.L) continue;
  const mismatchDeg = quatAngleDeg(turn.L, mirrorQuat(turn.R));
  rows.push({ id, bone: `${ctrl.bone} -> ${landmark}`, axis: ctrl.axis, deg, dR, dL, mismatchDeg });
}

// Chains: the hand is the thing on screen, so compare where it LANDS. The two
// arms are at mirrored rest positions, so the left hand must end up at the mirror
// of the right one -- that check needs no rest-relative bookkeeping.
interface ChainRow { id: string; worstDeg: number; worstGap: number; }
const chainRows: ChainRow[] = [];
for (const [id, ctrl] of Object.entries(BONE_MAP)) {
  if (ctrl.kind !== 'chain') continue;
  let worstGap = 0;
  let worstDeg = 0;
  for (const deg of CHAIN_ANGLES) {
    if (deg > ctrl.clinicalRange.max) continue;
    const r = poseChain(ctrl, 'R', deg);
    const l = poseChain(ctrl, 'L', deg);
    const gap = new THREE.Vector3(r.hand.x + l.hand.x, r.hand.y - l.hand.y, r.hand.z - l.hand.z).length();
    if (gap > worstGap) { worstGap = gap; worstDeg = deg; }
  }
  resetPose();
  chainRows.push({ id, worstDeg, worstGap });
}
/** A hand landing this far from its mirror is a different movement (m). */
const TOL_HAND_M = 0.03;

const bad = rows.filter((r) => r.mismatchDeg > TOL_DEG);
const badChains = chainRows.filter((c) => c.worstGap > TOL_HAND_M);
console.log(`rig: ${GLB}`);
console.log(`anterior = ${ANT > 0 ? '+z' : '-z'} (medido: rotula vs eje de la rodilla)`);
console.log('');
for (const r of rows) {
  const ok = r.mismatchDeg <= TOL_DEG ? 'OK   ' : 'FALLA';
  console.log(`${ok} ${r.id.padEnd(32)} ${r.axis} @${String(r.deg).padStart(3)}deg  ${r.bone}`);
  console.log(`        derecha:   ${describe(r.dR, 'R')}`);
  console.log(`        izquierda: ${describe(r.dL, 'L')}`);
  console.log(`        desviacion respecto al espejo: ${r.mismatchDeg.toFixed(1)} deg`);
}
for (const c of chainRows) {
  const ok = c.worstGap <= TOL_HAND_M ? 'OK   ' : 'FALLA';
  console.log(`${ok} ${c.id.padEnd(32)} cadena  humerus_gh -> hand_flex`);
  console.log(`        peor separacion de la mano respecto al espejo: ${(c.worstGap * 100).toFixed(1)} cm (a ${c.worstDeg} deg)`);
}
console.log('');
const total = rows.length + chainRows.length;
if (bad.length === 0 && badChains.length === 0) {
  console.log(`Los ${total} movimientos son simetricos (<= ${TOL_DEG} deg / ${TOL_HAND_M * 100} cm).`);
} else {
  const ids = [...bad.map((b) => b.id), ...badChains.map((c) => c.id)];
  console.log(`ASIMETRICOS (${ids.length}): ${ids.join(', ')}`);
  process.exit(1);
}
