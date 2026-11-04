// ¿QUE LADO DEL CUERPO ES CUAL EN ESTE RIG?
//
// Parece una pregunta tonta hasta que se mide. En una aplicacion de
// fisioterapia no lo es en absoluto: un test de Hawkins "derecho" demostrado
// sobre el hombro izquierdo, un miotoma C5 ensenado en el brazo equivocado o
// una tarjeta de paciente con el lado cambiado son errores clinicos, no
// cosmeticos. Y por el ojo no se detectan: un cuerpo es casi simetrico, asi que
// la pose equivocada se ve perfectamente bien.
//
// Se mide por dos caminos independientes, que tienen que coincidir:
//
//   1. LOS NOMBRES DE LAS MALLAS. Z-Anatomy marca el lado con un sufijo `l`/`r`
//      y la exportacion lo conserva (`Tibialis_anterior_musclee1l` frente a
//      `...e1r`). Emparejando cada malla con su gemela se obtiene, con cientos
//      de casos, de que signo de x es cada lado anatomico.
//
//   2. LOS ARMATURES. `Leg_Armature_R`, `Shoulder_Armature_L`, etc. son los que
//      mueve `boneMap.resolveArmatureName(base, side)` cuando el usuario elige
//      "Derecho" o "Izquierdo" en el panel.
//
// Si el armature `_R` no esta en el mismo signo de x que las mallas del lado
// derecho, el selector del panel esta invertido.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-laterality.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { resolveArmatureName, rigSideFor } from '../src/lib/boneMap.ts';
import { createRigPoser } from './lib/rigPose.mts';
import { rigGlbPath } from './lib/rigPath.mts';

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<{ scene: THREE.Group }>((r, j) => ld.parse(ab, '', r as never, j));
const scene = gl.scene;
scene.updateMatrixWorld(true);

const centre = (m: THREE.Mesh): THREE.Vector3 => {
  m.geometry.computeBoundingBox();
  return m.localToWorld(m.geometry.boundingBox!.getCenter(new THREE.Vector3()));
};

console.log('\n===== LATERALIDAD DEL RIG =====\n');

/* ---- 1. los nombres de las mallas ---------------------------------------- */
const xByName = new Map<string, number>();
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (m.isMesh) xByName.set(m.name, centre(m).x);
});

let lPos = 0;
let lNeg = 0;
let rPos = 0;
let rNeg = 0;
let pairs = 0;
for (const [name, x] of xByName) {
  if (Math.abs(x) < 0.03) continue; // en la linea media el lado no significa nada
  const m = /^(.*?)(\d*)([lr])$/.exec(name.replace(/_\d+$/, ''));
  if (!m) continue;
  const twin = `${m[1]}${m[2]}${m[3] === 'l' ? 'r' : 'l'}`;
  if (!xByName.has(twin) && !xByName.has(`${twin}_1`)) continue;
  pairs++;
  if (m[3] === 'l') x > 0 ? lPos++ : lNeg++;
  else x > 0 ? rPos++ : rNeg++;
}

console.log('1) POR EL NOMBRE DE LAS MALLAS');
console.log(`   pares izquierda/derecha encontrados: ${pairs}`);
console.log(`   sufijo l (izquierda)  ->  +x: ${lPos}   -x: ${lNeg}`);
console.log(`   sufijo r (derecha)    ->  +x: ${rPos}   -x: ${rNeg}`);

const leftIsPositive = lPos > lNeg;
const agreement = (lPos + rNeg) / Math.max(1, pairs);
if (pairs < 50) {
  console.log('   AVISO: muy pocos pares; el GLB no trae el sufijo de lado esperado.');
} else if (agreement < 0.9) {
  console.log(`   AVISO: los nombres solo concuerdan al ${(agreement * 100).toFixed(0)}%.`);
} else {
  console.log(
    `   -> en este GLB la IZQUIERDA anatomica esta en ${leftIsPositive ? '+x' : '-x'} ` +
      `(concordancia ${(agreement * 100).toFixed(0)}%)`,
  );
}

/* ---- 2. donde esta cada armature ----------------------------------------- */
// Lo que se comprueba es la CADENA COMPLETA que recorre una peticion del panel:
//   lado clinico  ->  rigSideFor  ->  resolveArmatureName  ->  nodo  ->  signo de x
// No basta con mirar el nombre del nodo: el nombre miente a proposito (los `_R`
// estan en +x, que es la izquierda anatomica), y lo que tiene que salir bien es
// el miembro que acaba moviendose cuando el usuario pide "Derecho".
console.log('');
console.log('2) QUE MIEMBRO MUEVE CADA LADO DEL PANEL');
const tipX = (armature: string): number | null => {
  const root = scene.getObjectByName(armature);
  if (!root) return null;
  let tip: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (!tip && /^(foot_flex|hand_flex)/.test(o.name)) tip = o;
  });
  return tip ? (tip as THREE.Object3D).getWorldPosition(new THREE.Vector3()).x : null;
};

const LABEL = { R: 'DERECHO', L: 'IZQUIERDO' } as const;
let mismatches = 0;
for (const base of ['Leg_Armature', 'Shoulder_Armature'] as const) {
  for (const clinical of ['R', 'L'] as const) {
    const node = resolveArmatureName(base, rigSideFor(clinical));
    const x = tipX(node);
    if (x == null) {
      console.log(`   ${node.padEnd(20)} no esta en el GLB`);
      mismatches++;
      continue;
    }
    const movesLeft = x > 0 === leftIsPositive;
    const ok = movesLeft === (clinical === 'L');
    if (!ok) mismatches++;
    console.log(
      `   panel "${LABEL[clinical]}"`.padEnd(24) +
        `-> ${node.padEnd(20)} x=${x.toFixed(3)}  ` +
        `mueve el miembro ${movesLeft ? 'IZQUIERDO' : 'DERECHO'}  ${ok ? 'ok' : '<<< AL REVES'}`,
    );
  }
}


/* ---- 3. que miembro se mueve de verdad al pedir "Derecho" ---------------- */
// Las dos secciones anteriores comprueban el MAPA. Esta comprueba el
// RESULTADO: posa de verdad una abduccion del hombro CLINICO derecho y mira
// cual de las dos manos se ha movido. Es la pregunta tal y como la hace el
// usuario -- "le doy a Derecho, se mueve mi derecha?" -- contestada midiendo,
// que es la unica forma: en pantalla la simetria del cuerpo esconde el fallo.
//
// Un solo movimiento, y a proposito: `createRigPoser` captura el reposo de la
// escena al construirse y aplica reparaciones de malla que NO son idempotentes,
// asi que no puede haber dos posers por proceso. El miembro inferior queda
// cubierto por la seccion 2, que recorre los cuatro armatures.
// MOVE=<id> para probar otro.
console.log('');
console.log('3) QUE SE MUEVE AL POSAR EL LADO CLINICO DERECHO');

const MOVE = process.env.MOVE ?? 'glenohumeral-abduction';
const tipsByX = (pattern: string): { pos: THREE.Object3D; neg: THREE.Object3D } | null => {
  const found: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (new RegExp(`^${pattern}`).test(o.name)) found.push(o);
  });
  if (found.length < 2) return null;
  const withX = found.map((o) => ({ o, x: o.getWorldPosition(new THREE.Vector3()).x }));
  withX.sort((a, b) => b.x - a.x);
  return { pos: withX[0].o, neg: withX[withX.length - 1].o };
};

const tipPattern = /hip|knee|ankle/.test(MOVE) ? 'foot_flex' : 'hand_flex';
const tipWord = tipPattern === 'foot_flex' ? 'pie' : 'mano';
const tips = tipsByX(tipPattern);
if (!tips) {
  console.log(`   no encuentro los dos ${tipWord}s en el GLB`);
  process.exitCode = 1;
} else {
  const b0 = tips.pos.getWorldPosition(new THREE.Vector3());
  const b1 = tips.neg.getWorldPosition(new THREE.Vector3());
  // Posa exactamente como la aplicacion: lado CLINICO 'R' cruzado con rigSideFor,
  // y el mismo control de boneMap que usa RigModel.
  const poser = createRigPoser(scene, MOVE, rigSideFor('R'), true);
  poser.pose(60);
  scene.updateMatrixWorld(true);
  const dPos = tips.pos.getWorldPosition(new THREE.Vector3()).distanceTo(b0);
  const dNeg = tips.neg.getWorldPosition(new THREE.Vector3()).distanceTo(b1);
  const movedPositive = dPos > dNeg;
  const movedLeft = movedPositive === leftIsPositive;
  const ok = !movedLeft;
  if (!ok) mismatches++;
  console.log(
    `   ${MOVE.padEnd(26)} ${tipWord} en +x: ${(dPos * 100).toFixed(1)} cm   ` +
      `${tipWord} en -x: ${(dNeg * 100).toFixed(1)} cm`,
  );
  console.log(
    `   -> se movio el miembro ${movedLeft ? 'IZQUIERDO' : 'DERECHO'}  ${ok ? 'ok' : '<<< AL REVES'}`,
  );
}
console.log('');
if (mismatches > 0) {
  console.log(`RESULTADO: ${mismatches} de 4 al reves: elegir un lado en el panel mueve el`);
  console.log('           miembro contrario. Se corrige en boneMap.rigSideFor, que es el');
  console.log('           unico sitio donde se traduce lado clinico -> lado del rig.');
  process.exitCode = 1;
} else {
  console.log('RESULTADO: cada lado del panel mueve el miembro que le corresponde.');
  console.log('');
  console.log('OJO si vas a tocar signos: las tablas calibradas contra la geometria');
  console.log('(sign: { R, L }, SCAPULA_WRAP_SIGN, shoulderChain, shoulderSkinBridge) y');
  console.log('los quince scripts de medida hablan en LADO DEL RIG, no en lado clinico.');
  console.log('El cruce lo hace rigSideFor y solo en dos sitios: RigModel.apply y');
  console.log('RigOverlays. Ver el bloque de boneMap.rigSideFor.');
}
