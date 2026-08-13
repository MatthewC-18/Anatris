// Does every upper-limb movement put the limb where the panel says it does?
//
// The lab is a goniometry teaching tool, so a movement that reads 80 and draws 60
// is not a cosmetic bug: it teaches the wrong number. This walks EVERY drivable
// shoulder/elbow movement, on both sides, and compares the angle asked for with
// the angle the bone actually ends up at.
//
// Each movement is measured the way a physio would read it:
//   SWING - movements that carry the segment somewhere (elevation, elbow flexion):
//           the angle of the distal segment in the movement's own plane.
//   TWIST - rotations (shoulder rotation, pronosupination): the share of the
//           bone's rotation taken about its own long axis. Reading these as swing
//           would show ~0 for any input and call a broken rotation perfect.
// Both are reported, because a clean rotation should show ~0 swing and a clean
// swing ~0 twist; leakage into the other column means the drive axis is off.
//
// Loads the rig ONCE and poses in memory, so it is cheap enough to run as a
// whole-limb check. It measures BONES only, not mesh deformation -- for that see
// sweep-shoulder-arc.mts (per-angle mesh metrics) and diag-shoulder-spill.mts.
//
// Run: npx tsx scripts/audit-upper-limb-angles.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { getBoneControl, resolveArmatureName } from '../src/lib/boneMap.ts';
import { rigGlbPath } from './lib/rigPath.mts';

const GLB = rigGlbPath();
const D2R = Math.PI / 180;
/**
 * Error we are willing to call correct. Goniometry itself carries ~5 deg of
 * inter-observer error, so a rig that lands inside 3 is teaching a number no
 * physio could distinguish from the truth with a goniometer in hand. Set
 * deliberately TIGHTER than clinical practice, not loosened to make a reading
 * pass: the elevation errors this audit was written to catch were 10 to 53 deg.
 */
const TOLERANCE = 3;

/** Movement -> the bone whose motion IS the clinical angle, and how to read it. */
const MOVEMENTS: {
  id: string;
  /** Distal bone whose direction/twist is read. Defaults to the driven bone. */
  read?: string;
  /** Reference the distal segment points at, to measure swing. */
  tip?: string;
  mode: 'swing' | 'twist';
  plane?: 'frontal' | 'sagittal';
}[] = [
  { id: 'glenohumeral-abduction', read: 'humerus_gh', tip: 'forearm_flex', mode: 'swing', plane: 'frontal' },
  { id: 'glenohumeral-flexion', read: 'humerus_gh', tip: 'forearm_flex', mode: 'swing', plane: 'sagittal' },
  { id: 'glenohumeral-external-rotation', read: 'humerus_gh', tip: 'forearm_flex', mode: 'twist' },
  { id: 'glenohumeral-internal-rotation', read: 'humerus_gh', tip: 'forearm_flex', mode: 'twist' },
  { id: 'elbow-flexion', read: 'forearm_flex', tip: 'hand_flex', mode: 'swing', plane: 'sagittal' },
  { id: 'elbow-extension', read: 'forearm_flex', tip: 'hand_flex', mode: 'swing', plane: 'sagittal' },
  { id: 'elbow-pronation', read: 'forearm_rot', tip: 'hand_flex', mode: 'twist' },
  { id: 'elbow-supination', read: 'forearm_rot', tip: 'hand_flex', mode: 'twist' },
];

const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);
const bs = (n: string) => n.replace(/_\d+$/, '');
const AX: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};
const byArm = new Map<string, Map<string, THREE.Object3D>>();
for (const an of ['Shoulder_Armature_R', 'Shoulder_Armature_L', 'Spine_Armature']) {
  const root = scene.getObjectByName(an); if (!root) continue;
  const m = new Map<string, THREE.Object3D>();
  root.traverse((o) => { if (!m.has(bs(o.name))) m.set(bs(o.name), o); });
  byArm.set(an, m);
}
const rq = new Map<THREE.Object3D, THREE.Quaternion>();
const rw = new Map<THREE.Object3D, THREE.Matrix4>();
scene.traverse((o) => { rq.set(o, o.quaternion.clone()); rw.set(o, o.matrixWorld.clone()); });
const reset = () => {
  scene.traverse((o) => { const q = rq.get(o); if (q) o.quaternion.copy(q); });
  scene.updateMatrixWorld(true);
};

function swingOf(read: THREE.Object3D, tip: THREE.Object3D, plane: 'frontal' | 'sagittal', side: 'R' | 'L') {
  const d = tip.getWorldPosition(new THREE.Vector3()).sub(read.getWorldPosition(new THREE.Vector3()));
  const deg = plane === 'frontal'
    ? (Math.atan2(d.x, -d.y) / D2R) * (side === 'R' ? 1 : -1)
    : Math.atan2(d.z, -d.y) / D2R;
  return deg < -120 ? deg + 360 : deg;
}
/**
 * @param axisHint the bone's OWN rotation axis in world space at rest. Measure
 * the twist about this, not about the straight line from joint to joint: for
 * pronosupination the two differ by ~13 deg, because the forearm turns about a
 * line from the radial head to the ulnar styloid while the joint-to-joint line
 * runs down the middle. Measuring against the straight line charges that
 * difference to "swing" and reports a healthy forearm as leaking 10 deg.
 */
function twistOf(read: THREE.Object3D, tip: THREE.Object3D, sign: number, axisHint?: THREE.Vector3) {
  const restQ = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  rw.get(read)!.decompose(p, restQ, s);
  const delta = read.getWorldQuaternion(new THREE.Quaternion()).multiply(restQ.clone().invert());
  const axis = axisHint
    ? axisHint.clone().normalize()
    : new THREE.Vector3()
        .setFromMatrixPosition(rw.get(tip)!)
        .sub(new THREE.Vector3().setFromMatrixPosition(rw.get(read)!))
        .normalize();
  const r = new THREE.Vector3(delta.x, delta.y, delta.z);
  const proj = axis.clone().multiplyScalar(r.dot(axis));
  const tq = new THREE.Quaternion(proj.x, proj.y, proj.z, delta.w).normalize();
  const along = proj.dot(axis) >= 0 ? proj.length() : -proj.length();
  let twist = (2 * Math.atan2(along, tq.w)) / D2R;
  if (twist > 180) twist -= 360;
  if (twist < -180) twist += 360;
  const swingQ = delta.clone().multiply(tq.clone().invert());
  const leak = (2 * Math.acos(Math.min(1, Math.abs(swingQ.w)))) / D2R;
  // boneMap's per-side sign IS the left/right mirror, so dividing it out (it is
  // +/-1, so multiplying) leaves the angle a physio would read on either arm.
  return { twist: twist * sign, leak };
}

console.log('Angle the panel asks for vs the angle the bone reaches.');
console.log(`Anything over ${TOLERANCE} deg of error is a movement that teaches a wrong number.\n`);
let worst = { id: '', side: '', deg: 0, err: 0 };
const failures: string[] = [];
for (const mv of MOVEMENTS) {
  const ctrl = getBoneControl(mv.id);
  if (!ctrl) { console.log(`${mv.id.padEnd(34)} NOT IN boneMap`); continue; }
  if (ctrl.kind === 'unsupported') { console.log(`${mv.id.padEnd(34)} unsupported: ${ctrl.reason}`); continue; }
  const range = (ctrl as any).clinicalRange as { min: number; max: number };
  const samples = [0.25, 0.5, 0.75, 1].map((f) => Math.round(range.min + (range.max - range.min) * f));
  for (const side of ['R', 'L'] as const) {
    const bones = byArm.get(resolveArmatureName('Shoulder_Armature', side))!;
    const read = bones.get(mv.read ?? (ctrl as any).bone);
    const tip = mv.tip ? bones.get(mv.tip) : undefined;
    if (!read || !tip) { console.log(`${mv.id.padEnd(34)} ${side}  bones not found`); continue; }
    reset();
    const base = mv.mode === 'swing' ? swingOf(read, tip, mv.plane!, side) : 0;
    const cells: string[] = [];
    for (const deg of samples) {
      reset();
      if (ctrl.kind === 'joint') {
        const b = bones.get((ctrl as any).bone)!;
        b.rotateOnAxis(AX[(ctrl as any).axis], deg * D2R * (ctrl as any).sign[side]);
      } else {
        const outputs = (ctrl as any).decompose(deg, side);
        const seen = new Set<THREE.Object3D>();
        for (const { key, target } of (ctrl as any).targets) {
          const rad = outputs[key];
          if (rad === undefined) continue;
          const map = target.armature === 'spine' ? byArm.get('Spine_Armature')! : bones;
          for (const bn of target.bones) {
            const b = map.get(bn);
            if (!b) continue;
            if (!seen.has(b)) { b.quaternion.copy(rq.get(b)!); seen.add(b); }
            b.rotateOnAxis(AX[target.axis], rad);
          }
        }
        scene.updateMatrixWorld(true);
        // AIM lives in RigModel, not boneMap, so replicating the chain alone
        // measures a pose the app never draws. Mirrored here for that reason.
        const plane = (ctrl as any).aimPlane as 'x' | 'z' | undefined;
        if (plane) {
          const humB = bones.get('humerus_gh')!, elbB = bones.get('forearm_flex')!;
          const rh = new THREE.Vector3().setFromMatrixPosition(rw.get(humB)!);
          const re = new THREE.Vector3().setFromMatrixPosition(rw.get(elbB)!);
          const want = re.sub(rh).normalize();
          if (plane === 'z') {
            const rr = Math.hypot(want.x, want.y);
            const a = Math.atan2(want.x, -want.y) + deg * D2R * (side === 'R' ? 1 : -1);
            want.set(Math.sin(a) * rr, -Math.cos(a) * rr, want.z).normalize();
          } else {
            const rr = Math.hypot(want.z, want.y);
            const a = Math.atan2(want.z, -want.y) + deg * D2R;
            want.set(want.x, -Math.cos(a) * rr, Math.sin(a) * rr).normalize();
          }
          const ph = humB.getWorldPosition(new THREE.Vector3());
          const pe = elbB.getWorldPosition(new THREE.Vector3());
          const fix = new THREE.Quaternion().setFromUnitVectors(pe.sub(ph).normalize(), want);
          const pw = humB.parent
            ? humB.parent.getWorldQuaternion(new THREE.Quaternion())
            : new THREE.Quaternion();
          humB.quaternion.premultiply(pw.clone().invert().multiply(fix).multiply(pw));
        }
      }
      scene.updateMatrixWorld(true);
      let got: number, leak = 0;
      if (mv.mode === 'swing') {
        got = swingOf(read, tip, mv.plane!, side) - base;
      } else {
        // The driven bone's own axis, in world, taken at REST.
        let hint: THREE.Vector3 | undefined;
        if (ctrl.kind === 'joint') {
          const driven = bones.get((ctrl as any).bone);
          const restQ = new THREE.Quaternion(), p0 = new THREE.Vector3(), s0 = new THREE.Vector3();
          if (driven) {
            rw.get(driven)!.decompose(p0, restQ, s0);
            hint = AX[(ctrl as any).axis].clone().applyQuaternion(restQ);
          }
        }
        const t = twistOf(read, tip, (ctrl as any).sign?.[side] ?? 1, hint);
        got = t.twist; leak = t.leak;
      }
      const err = got - deg;
      if (Math.abs(err) > Math.abs(worst.err)) worst = { id: mv.id, side, deg, err };
      if (Math.abs(err) > TOLERANCE) failures.push(`${mv.id} ${side} @${deg}: ${err.toFixed(1)}`);
      cells.push(`${deg}->${got.toFixed(0)}${leak > 3 ? `(leak ${leak.toFixed(0)})` : ''}`);
    }
    const note = ctrl.kind === 'chain' && (ctrl as any).aimPlane ? ' [aimed]' : '';
    console.log(`${mv.id.padEnd(34)} ${side} ${mv.mode.padEnd(5)} ${cells.join('  ').padEnd(46)}${note}`);
  }
}
console.log('');
if (failures.length) {
  console.log(`${failures.length} readings out of tolerance:`);
  for (const f of failures) console.log(`  ${f}`);
} else {
  console.log(`Every movement lands within ${TOLERANCE} deg of the angle it reports.`);
}
console.log(`worst: ${worst.id || 'none'} ${worst.side} at ${worst.deg} deg, off by ${worst.err.toFixed(1)}`);
console.log(
  '\nKnown and accepted: elbow flexion/extension run ~2.5 deg long at the top of\n' +
  'range, which is well inside goniometric error. Revisit only if it reads badly\n' +
  'on screen.',
);
