// Do the orthopedic tests actually LOOK different from one another?
//
// A physiotherapist reviewing the lab said the tests all do the same thing and
// he could not tell them apart. That is a claim about geometry, so it can be
// measured rather than argued: pose the rig at each test's demo and compare the
// limb positions pair by pair.
//
// The number reported is how far apart two maneuvers put the SAME landmarks --
// the elbow, the wrist and the hand. Two tests that share a base movement and
// nothing else land on top of each other and score ~0 cm, which is exactly the
// "todos se ven iguales" being complained about. Anything a user would read as a
// different position separates by several centimetres.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/measure-test-poses.mts [region]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { getBoneControl, resolveArmatureName } from '../src/lib/boneMap.ts';
import { ORTHOPEDIC_TESTS_BY_REGION } from '../src/data/orthopedicTests/index.ts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, baseName, type Side } from './lib/rigPose.mts';

const REGION = process.argv[2] ?? 'shoulder';
const D2R = Math.PI / 180;
/** Below this, two maneuvers read as the same pose on screen. */
const SAME_POSE_CM = 4;

const tests = (ORTHOPEDIC_TESTS_BY_REGION[REGION] ?? []).filter((t) => t.demo);
if (!tests.length) {
  console.error(`Sin tests con demo en la región ${REGION}`);
  process.exit(1);
}

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const AX: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

/**
 * The landmarks a viewer actually reads: where the arm segments end up.
 *
 * Each bone contributes its ORIGIN plus two probe points held off its long axis.
 * The origins alone are blind to rotation ABOUT that axis -- they sit on it --
 * so a thumb-down forearm and a palm-up one measured as the same pose while
 * looking completely different on screen. That is the very mistake this script
 * exists to catch, so it must not make it itself.
 */
const LANDMARKS = ['forearm_flex', 'forearm_rot', 'hand_flex'];
const PROBE_M = 0.05;
const PROBES: THREE.Vector3[] = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(PROBE_M, 0, 0),
  new THREE.Vector3(0, 0, PROBE_M),
];

/** Pose one test's demo and return its landmark positions. */
async function poseTest(test: (typeof tests)[number]): Promise<THREE.Vector3[]> {
  const demo = test.demo!;
  const side = (demo.side ?? 'R') as Side;
  const ld = new GLTFLoader();
  ld.setMeshoptDecoder(MeshoptDecoder);
  const gl = await new Promise<any>((r, j) => ld.parse(ab.slice(0), '', r, j));
  const scene = gl.scene as THREE.Group;
  const poser = createRigPoser(scene, demo.movementId, side, true);
  poser.pose(demo.angleDeg);

  // The maneuver's own components, applied on top exactly as RigModel does.
  for (const comp of demo.components ?? []) {
    const cc = getBoneControl(comp.movementId);
    if (!cc || cc.kind !== 'joint') {
      console.warn(`  aviso: componente no accionable en ${test.id}: ${comp.movementId}`);
      continue;
    }
    const armature = scene.getObjectByName(resolveArmatureName(cc.armatureBase, side));
    let bone: THREE.Object3D | null = null;
    armature?.traverse((o) => {
      if (!bone && baseName(o.name) === cc.bone) bone = o;
    });
    if (!bone) continue;
    (bone as THREE.Object3D).rotateOnAxis(AX[cc.axis], cc.sign[side] * comp.angleDeg * D2R);
    scene.updateMatrixWorld(true);
  }

  const out: THREE.Vector3[] = [];
  for (const n of LANDMARKS) {
    const b = poser.shoulderBones.get(n);
    for (const probe of PROBES) {
      out.push(b ? b.localToWorld(probe.clone()) : new THREE.Vector3());
    }
  }
  return out;
}

const poses = new Map<string, THREE.Vector3[]>();
for (const t of tests) poses.set(t.id, await poseTest(t));

/** Mean landmark separation between two maneuvers, in cm. */
function separation(a: string, b: string): number {
  const pa = poses.get(a)!;
  const pb = poses.get(b)!;
  let sum = 0;
  for (let i = 0; i < pa.length; i++) sum += pa[i].distanceTo(pb[i]);
  return (sum / pa.length) * 100;
}

console.log(`región ${REGION} — ${tests.length} tests con demo\n`);
const clashes: { a: string; b: string; cm: number }[] = [];
for (let i = 0; i < tests.length; i++)
  for (let j = i + 1; j < tests.length; j++) {
    const cm = separation(tests[i].id, tests[j].id);
    if (cm < SAME_POSE_CM) clashes.push({ a: tests[i].id, b: tests[j].id, cm });
  }

if (clashes.length === 0) {
  console.log(`✅ Ningún par de tests cae por debajo de ${SAME_POSE_CM} cm: todos se distinguen.`);
} else {
  console.log(`⚠️  ${clashes.length} pares por debajo de ${SAME_POSE_CM} cm (se ven iguales):\n`);
  for (const c of clashes.sort((x, y) => x.cm - y.cm))
    console.log(`   ${c.cm.toFixed(1).padStart(5)} cm   ${c.a}  vs  ${c.b}`);
}

// Per-test summary, so a test that moved can be checked against its own note.
console.log('\n  test                          base                              componentes');
for (const t of tests) {
  const d = t.demo!;
  const comps = (d.components ?? [])
    .map((c) => `${c.movementId.replace('glenohumeral-', '').replace('elbow-', 'codo ')} ${c.angleDeg}°`)
    .join(' + ');
  console.log(
    `  ${t.id.padEnd(28)}  ${`${d.movementId} ${d.angleDeg}°`.padEnd(32)}  ${comps || '—'}`,
  );
}
