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
/**
 * Y el umbral angular. Dos posturas pueden tener los mismos puntos y verse
 * distintas: una rotacion gira el segmento sin trasladarlo. 8 grados es la
 * diferencia a partir de la cual la orientacion de un segmento se aprecia en
 * pantalla; por debajo de eso Y de los 4 cm, las dos maniobras son la misma.
 */
const SAME_POSE_DEG = 8;

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
interface LimbPose {
  pts: THREE.Vector3[];
  quats: THREE.Quaternion[];
}
async function poseTest(
  test: (typeof tests)[number],
): Promise<Record<Limb, LimbPose>> {
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
    const find = (n: string): THREE.Object3D | null => {
      let hit: THREE.Object3D | null = null;
      armature?.traverse((o) => {
        if (!hit && baseName(o.name) === n) hit = o;
      });
      return hit;
    };
    // El CERO CLINICO del componente, igual que RigModel (ver ExamPosture):
    // sin el, la pronacion de la lata vacia se mide desde el reposo supinado
    // del GLB y la hoja dice que el pulgar esta abajo cuando esta arriba.
    for (const p of cc.posture ?? []) {
      if (!p.zeroPoint) continue;
      const pb = find(p.bone);
      if (pb) pb.rotateOnAxis(AX[p.axis], p.sign[side] * p.deg * D2R);
    }
    const bone = find(cc.bone);
    if (!bone) continue;
    bone.rotateOnAxis(AX[cc.axis], cc.sign[side] * comp.angleDeg * D2R);
    scene.updateMatrixWorld(true);
  }

  // Los huesos se buscan DENTRO de su armadura, no recorriendo la escena: los
  // nombres se repiten entre el lado derecho y el izquierdo y el primero que
  // aparece no es el que se ha movido (ver la nota de LANDMARKS_BY_LIMB).
  const out = {} as Record<Limb, LimbPose>;
  for (const limb of LIMBS) {
    const root = scene.getObjectByName(armatureFor(limb, side));
    const byBase = new Map<string, THREE.Object3D>();
    root?.traverse((o) => {
      const n = baseName(o.name);
      if (!byBase.has(n)) byBase.set(n, o);
    });
    const pts: THREE.Vector3[] = [];
    const quats: THREE.Quaternion[] = [];
    for (const n of LANDMARKS_BY_LIMB[limb]) {
      const b = byBase.get(n);
      if (!b) throw new Error(`falta el hueso ${n} en ${armatureFor(limb, side)}`);
      for (const probe of PROBES) pts.push(b.localToWorld(probe.clone()));
      quats.push(b.getWorldQuaternion(new THREE.Quaternion()));
    }
    out[limb] = { pts, quats };
  }
  return out;
}

const poses = new Map<string, Record<Limb, LimbPose>>();
for (const t of tests) poses.set(t.id, await poseTest(t));

/**
 * Separacion entre dos maniobras: cuanto se separan sus puntos (cm) y cuanto
 * difieren las orientaciones de sus huesos (grados). Se devuelve la del miembro
 * que MAS se separa.
 *
 * POR QUE HACEN FALTA LAS DOS CIFRAS. Con solo los puntos, este banco declaraba
 * "se ven iguales" 15 pares de pruebas cervicales, entre ellos una rotacion de
 * 60 grados contra una de 80. No lo son en pantalla: lo que pasa es que los
 * puntos del raquis son vertebras, que en una rotacion del cuello GIRAN pero
 * casi no se trasladan, y el reparto de la rotacion por la cadena deja a C1 con
 * una fraccion del angulo. Un banco que llama iguales a dos posturas distintas
 * empuja a "arreglar" datos que estaban bien, que es el error contrario al que
 * vino a cazar.
 *
 * Asi que un par se considera indistinguible solo si coinciden EN LAS DOS:
 * los puntos a menos de SAME_POSE_CM y los huesos a menos de SAME_POSE_DEG.
 */
function separation(a: string, b: string): { cm: number; deg: number; limb: Limb } {
  const pa = poses.get(a)!;
  const pb = poses.get(b)!;
  let best = { cm: -1, deg: 0, limb: 'arm' as Limb };
  for (const limb of LIMBS) {
    const la = pa[limb];
    const lb = pb[limb];
    let sum = 0;
    for (let i = 0; i < la.pts.length; i++) sum += la.pts[i].distanceTo(lb.pts[i]);
    const cm = (sum / la.pts.length) * 100;
    let deg = 0;
    for (let i = 0; i < la.quats.length; i++) {
      const d = (la.quats[i].angleTo(lb.quats[i]) * 180) / Math.PI;
      if (d > deg) deg = d;
    }
    // El miembro que manda es el que mas se separa en cualquiera de las dos
    // medidas, normalizadas por su umbral.
    const score = Math.max(cm / SAME_POSE_CM, deg / SAME_POSE_DEG);
    const bestScore = Math.max(best.cm / SAME_POSE_CM, best.deg / SAME_POSE_DEG);
    if (best.cm < 0 || score > bestScore) best = { cm, deg, limb };
  }
  return best;
}

console.log(`región ${REGION} — ${tests.length} tests con demo\n`);
/**
 * LO QUE DISTINGUE DOS MANIOBRAS CUANDO LA POSE ES LA MISMA.
 *
 * Varios pares comparten pose A PROPOSITO, porque la comparten en la clinica:
 * la aprension, la recolocacion y la liberacion son tres fases del mismo brazo;
 * el arco doloroso y el brazo caido son el mismo brazo subiendo o bajando; el
 * cajon anterior y el posterior son la misma rodilla a 90 grados y lo que cambia
 * es hacia donde traslada el explorador. En pantalla no se diferencian por la
 * postura: se diferencian por lo que se ENCIENDE (el colateral medial en el
 * estres en valgo, nada y un aviso en el varo), por la mano del explorador y por
 * el texto. Un banco que llame "defecto" a eso obliga a inventar diferencias de
 * angulo que no existen en la realidad, asi que se separan en dos listas.
 */
const marks = (t: (typeof tests)[number]): string =>
  JSON.stringify([
    (t.demo!.highlightStructureIds ?? []).slice().sort(),
    t.demo!.highlightMuscleId ?? null,
    t.demo!.examinerForce ?? null,
  ]);

/**
 * Y CUANDO LA POSE COMPARTIDA ES DELIBERADA, LA NOTA LO DICE.
 *
 * Quedan pares que comparten pose y tampoco se distinguen por el resalte,
 * porque en la clinica son la misma posicion: el arco doloroso y el brazo caido
 * (el mismo brazo a 90 grados, subiendo o bajando), las tres fases de la
 * aprension, el cajon anterior y el posterior (la misma rodilla a 90 grados, y
 * lo que cambia es hacia donde traslada el explorador). Eso no es un defecto
 * que haya que "arreglar" inventandose angulos: es una limitacion del modelo,
 * que no traslada.
 *
 * Pero tiene que estar DICHO en la nota del demo, porque si no el alumno pulsa
 * dos botones, ve lo mismo y concluye que la aplicacion esta rota. Asi que un
 * par indistinguible solo se acepta si LAS DOS notas lo reconocen; si no, falla.
 */
const ACK = /(misma|comparte[ns]?)\s+(posici|pose)/i;
const acknowledges = (t: (typeof tests)[number]): boolean =>
  ACK.test((t.demo!.note ?? '').normalize('NFC'));

const clashes: { a: string; b: string; cm: number; deg: number }[] = [];
const sharedButMarked: { a: string; b: string }[] = [];
const undocumented: string[] = [];
let worst = { score: Infinity, cm: 0, deg: 0, a: '', b: '', limb: 'arm' as Limb };
for (let i = 0; i < tests.length; i++)
  for (let j = i + 1; j < tests.length; j++) {
    const { cm, deg, limb } = separation(tests[i].id, tests[j].id);
    const score = Math.max(cm / SAME_POSE_CM, deg / SAME_POSE_DEG);
    if (score < worst.score) worst = { score, cm, deg, a: tests[i].id, b: tests[j].id, limb };
    if (cm < SAME_POSE_CM && deg < SAME_POSE_DEG) {
      if (marks(tests[i]) === marks(tests[j])) {
        clashes.push({ a: tests[i].id, b: tests[j].id, cm, deg });
        if (!acknowledges(tests[i]) || !acknowledges(tests[j])) {
          const quien = [tests[i], tests[j]].filter((t) => !acknowledges(t)).map((t) => t.id);
          undocumented.push(`${tests[i].id} vs ${tests[j].id} (lo calla: ${quien.join(', ')})`);
        }
      } else sharedButMarked.push({ a: tests[i].id, b: tests[j].id });
    }
  }

if (clashes.length === 0) {
  console.log(
    `✅ Ningún par de tests queda a la vez por debajo de ${SAME_POSE_CM} cm y ` +
      `${SAME_POSE_DEG}°: todos se distinguen.`,
  );
  console.log(
    `   El par más parecido: ${worst.a} vs ${worst.b} — ${worst.cm.toFixed(1)} cm / ` +
      `${worst.deg.toFixed(1)}° (${worst.limb}).`,
  );
} else {
  console.log(
    `⚠️  ${clashes.length} pares por debajo de ${SAME_POSE_CM} cm Y de ${SAME_POSE_DEG}° ` +
      `(se ven iguales):\n`,
  );
  for (const c of clashes.sort((x, y) => x.cm - y.cm))
    console.log(
      `   ${c.cm.toFixed(1).padStart(5)} cm  ${c.deg.toFixed(1).padStart(5)}°   ${c.a}  vs  ${c.b}`,
    );
}

if (undocumented.length) {
  console.log(
    `\n❌ ${undocumented.length} pares son indistinguibles Y su nota no lo dice. ` +
      `El alumno pulsa los dos botones, ve lo mismo y cree que la app esta rota:`,
  );
  for (const u of undocumented) console.log(`     ${u}`);
  process.exitCode = 1;
}

if (sharedButMarked.length) {
  console.log(
    `\n  ${sharedButMarked.length} pares comparten pose pero se distinguen por el ` +
      `resalte o la mano del explorador:`,
  );
  for (const p of sharedButMarked) console.log(`     ${p.a}  vs  ${p.b}`);
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
