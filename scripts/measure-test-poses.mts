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
import {
  getBoneControl,
  resolveArmatureName,
  rigSideFor,
} from '../src/lib/boneMap.ts';
// TODAS LAS REGIONES. Esto importaba `ORTHOPEDIC_TESTS_BY_REGION`, el registro
// de EJECUCION, que desde la division premium solo contiene el hombro: pedirle
// la rodilla imprimia "Sin tests con demo en la region knee" mientras la region
// tenia 11 demos y 8 de ellos eran dos clips. `fullContent` existe para esto.
import { ALL_TESTS_BY_REGION } from '../src/data/fullContent.ts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, baseName, type Side } from './lib/rigPose.mts';

const REGION = process.argv[2] ?? 'shoulder';
const D2R = Math.PI / 180;
/** Below this, two maneuvers read as the same pose on screen. */
const SAME_POSE_CM = 4;

const tests = (ALL_TESTS_BY_REGION[REGION] ?? []).filter((t) => t.demo);
if (!tests.length) {
  const conDemo = Object.entries(ALL_TESTS_BY_REGION)
    .map(([r, list]) => `${r} (${list.filter((t) => t.demo).length})`)
    .join(', ');
  console.error(`Sin tests con demo en la región ${REGION}. Regiones: ${conDemo}`);
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
/**
 * Y SE MIDEN LOS TRES MIEMBROS, CADA UNO EN SU ARMADURA Y EN SU LADO.
 *
 * Esto media SIEMPRE el brazo, y lo buscaba recorriendo la escena entera. Dos
 * fallos encadenados:
 *
 *  1. Pedirle la rodilla devolvia 0,0 cm en los 55 pares --Lachman a 25 grados
 *     contra el cajon anterior a 90 incluido, que en pantalla son posiciones
 *     claramente distintas-- porque el brazo, en efecto, no se movia en ninguno
 *     de los dos.
 *  2. Aun con los puntos de la pierna, seguia dando 0,0: `shin_flex` esta DOS
 *     veces en la escena (`shin_flex` en Leg_Armature_R y `shin_flex_1` en la
 *     _L) y el primero que encuentra un recorrido global es el de la derecha,
 *     mientras el poser movia la izquierda. Medido: a 90 grados de flexion de
 *     rodilla el pie del lado posado viaja 46 cm y el del otro lado 0.
 *
 * Un banco que mide la parte del cuerpo equivocada no dice "iguales": no dice
 * nada, y lo dice en verde. Asi que ahora se miden los tres miembros siempre y
 * la separacion es la del miembro que MAS se separa, no la media de todos
 * --promediar 27 puntos de los que solo 9 se mueven divide la cifra por tres y
 * convierte una diferencia visible en un falso "se ven iguales".
 */
const LIMBS = ['arm', 'leg', 'spine'] as const;
type Limb = (typeof LIMBS)[number];
const LANDMARKS_BY_LIMB: Record<Limb, string[]> = {
  arm: ['forearm_flex', 'forearm_rot', 'hand_flex'],
  leg: ['femur_base', 'shin_flex', 'foot_flex'],
  // Un punto por region del raquis: una flexion cervical mueve vert_C1 (el
  // movimiento se acumula hacia el apex) y una lumbar mueve L3 y todo lo de
  // encima, asi que cualquier flexion regional registra en al menos uno.
  spine: ['vert_L3', 'vert_T6', 'vert_C1'],
};
/** La armadura de cada miembro, ya resuelta al lado que se esta posando. */
function armatureFor(limb: Limb, side: Side): string {
  if (limb === 'spine') return 'Spine_Armature';
  return resolveArmatureName(limb === 'leg' ? 'Leg_Armature' : 'Shoulder_Armature', side);
}
const PROBE_M = 0.05;
const PROBES: THREE.Vector3[] = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(PROBE_M, 0, 0),
  new THREE.Vector3(0, 0, PROBE_M),
];

/** Pose one test's demo and return its landmark positions. */
async function poseTest(
  test: (typeof tests)[number],
): Promise<Record<Limb, THREE.Vector3[]>> {
  const demo = test.demo!;
  // `demo.side` es el lado CLINICO del dato del test; el poser quiere el lado
  // DEL RIG. Sin este cruce el banco posaba el miembro contrario al que posa la
  // aplicacion, y las medidas valian para el brazo equivocado.
  const side = rigSideFor((demo.side ?? 'R') as Side);
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

  // Los huesos se buscan DENTRO de su armadura, no recorriendo la escena: los
  // nombres se repiten entre el lado derecho y el izquierdo y el primero que
  // aparece no es el que se ha movido (ver la nota de LANDMARKS_BY_LIMB).
  const out = {} as Record<Limb, THREE.Vector3[]>;
  for (const limb of LIMBS) {
    const root = scene.getObjectByName(armatureFor(limb, side));
    const byBase = new Map<string, THREE.Object3D>();
    root?.traverse((o) => {
      const n = baseName(o.name);
      if (!byBase.has(n)) byBase.set(n, o);
    });
    const pts: THREE.Vector3[] = [];
    for (const n of LANDMARKS_BY_LIMB[limb]) {
      const b = byBase.get(n);
      if (!b) throw new Error(`falta el hueso ${n} en ${armatureFor(limb, side)}`);
      for (const probe of PROBES) pts.push(b.localToWorld(probe.clone()));
    }
    out[limb] = pts;
  }
  return out;
}

const poses = new Map<string, Record<Limb, THREE.Vector3[]>>();
for (const t of tests) poses.set(t.id, await poseTest(t));

/**
 * Separacion entre dos maniobras, en cm: la del miembro que MAS se separa.
 *
 * Por miembro se promedian sus 9 puntos; entre miembros se toma el maximo. Si
 * dos pruebas solo se diferencian en la pierna, la cifra es la de la pierna
 * entera y no un tercio de ella.
 */
function separation(a: string, b: string): { cm: number; limb: Limb } {
  const pa = poses.get(a)!;
  const pb = poses.get(b)!;
  let best = { cm: -1, limb: 'arm' as Limb };
  for (const limb of LIMBS) {
    const la = pa[limb];
    const lb = pb[limb];
    let sum = 0;
    for (let i = 0; i < la.length; i++) sum += la[i].distanceTo(lb[i]);
    const cm = (sum / la.length) * 100;
    if (cm > best.cm) best = { cm, limb };
  }
  return best;
}

console.log(`región ${REGION} — ${tests.length} tests con demo\n`);
const clashes: { a: string; b: string; cm: number }[] = [];
let worst = { cm: Infinity, a: '', b: '', limb: 'arm' as Limb };
for (let i = 0; i < tests.length; i++)
  for (let j = i + 1; j < tests.length; j++) {
    const { cm, limb } = separation(tests[i].id, tests[j].id);
    if (cm < worst.cm) worst = { cm, a: tests[i].id, b: tests[j].id, limb };
    if (cm < SAME_POSE_CM) clashes.push({ a: tests[i].id, b: tests[j].id, cm });
  }

if (clashes.length === 0) {
  console.log(`✅ Ningún par de tests cae por debajo de ${SAME_POSE_CM} cm: todos se distinguen.`);
  console.log(
    `   El par más parecido: ${worst.a} vs ${worst.b} — ${worst.cm.toFixed(1)} cm (${worst.limb}).`,
  );
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
