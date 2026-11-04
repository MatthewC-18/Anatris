// ¿Dónde se van los segundos del primer arranque del laboratorio?
//
// El navegador NO es un cronómetro fiable aquí: el panel de vista previa corre
// como página de fondo cuando está oculto, y entonces el mismo trabajo mide
// 2,8 s una vez y 7,8 s la siguiente. Así que las etapas que son CPU pura se
// miden en Node, donde nadie estrangula los temporizadores.
//
// Mide tres cosas, cada una por separado:
//   1. PARSE        descomprimir + construir las 2600+ mallas del GLB.
//   2. PREDICADO    "¿esta malla pertenece a ese armature?", la pregunta que
//                   RigModel hace una vez por malla en tres sitios. Compara la
//                   versión vieja (getObjectById, recorre el subárbol entero por
//                   hueso) con la nueva (un Set de ids, construido una vez).
//   3. ALCANCE      el muestreo de 300 vértices por malla del recorte del brazo.
//
// Uso: npx tsx --tsconfig tsconfig.scripts.json scripts/measure-rig-prepare.mts
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { resolveArmatureName } from '../src/lib/boneMap.ts';
import { rigGlbPath } from './lib/rigPath.mts';

const ms = (t: number) => `${t.toFixed(0)} ms`;

const path = rigGlbPath();
const buf = readFileSync(path);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
console.log(`GLB ${path}`);
console.log(`     ${(buf.byteLength / 1e6).toFixed(2)} MB en disco`);

const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const t0 = performance.now();
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const parseMs = performance.now() - t0;
const scene = gl.scene as THREE.Group;
const t1 = performance.now();
scene.updateMatrixWorld(true);
const matrixMs = performance.now() - t1;

const skinned: THREE.SkinnedMesh[] = [];
let meshes = 0;
let bones = 0;
scene.traverse((o) => {
  if ((o as THREE.Mesh).isMesh) meshes++;
  if ((o as THREE.Bone).isBone) bones++;
  const sk = o as THREE.SkinnedMesh;
  if (sk.isSkinnedMesh && sk.skeleton) skinned.push(sk);
});

console.log('');
console.log('1) PARSE');
console.log(`   parse GLB .................. ${ms(parseMs)}`);
console.log(`   updateMatrixWorld .......... ${ms(matrixMs)}`);
console.log(`   mallas ${meshes}, huesos ${bones}, con piel ${skinned.length}`);

// --- 2) el predicado -------------------------------------------------------
const roots = (['R', 'L'] as const)
  .map((side) => scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side)))
  .filter((r): r is THREE.Object3D => !!r);
if (roots.length === 0) throw new Error('no encuentro los armatures del hombro');

/** Como estaba: un recorrido del subárbol por cada hueso de cada malla. */
const oldWay = (sk: THREE.SkinnedMesh, root: THREE.Object3D) =>
  !!sk.skeleton?.bones.some((b) => root.getObjectById(b.id));

/** Como está ahora: los ids del subárbol en un Set, construido una sola vez. */
const descendants = new Map<number, Set<number>>();
const newWay = (sk: THREE.SkinnedMesh, root: THREE.Object3D) => {
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  let ids = descendants.get(root.id);
  if (!ids) {
    ids = new Set<number>();
    root.traverse((o) => ids!.add(o.id));
    descendants.set(root.id, ids);
  }
  return sk.skeleton.bones.some((b) => ids!.has(b.id));
};

const timePredicate = (fn: (sk: THREE.SkinnedMesh, r: THREE.Object3D) => boolean) => {
  const t = performance.now();
  let hits = 0;
  for (const root of roots) for (const sk of skinned) if (fn(sk, root)) hits++;
  return { ms: performance.now() - t, hits };
};

const a = timePredicate(oldWay);
const b = timePredicate(newWay);
console.log('');
console.log('2) PREDICADO "¿pertenece a este armature?" (una pasada completa)');
console.log(`   getObjectById (antes) ...... ${ms(a.ms)}   aciertos ${a.hits}`);
console.log(`   Set de ids (ahora) ......... ${ms(b.ms)}   aciertos ${b.hits}`);
console.log(
  `   ${a.hits === b.hits ? 'MISMO resultado' : '¡RESULTADO DISTINTO!'}  ` +
    `x${(a.ms / Math.max(b.ms, 0.001)).toFixed(1)} más rápido`,
);
console.log(`   RigModel lo pregunta en 3 sitios -> ahorro ~${ms((a.ms - b.ms) * 1.5)}`);

// --- 3) el muestreo del recorte del brazo ----------------------------------
// Sólo las mallas del brazo por debajo del codo, como hace RigModel.
const ELBOW_Y = 1.05;
const centre = (m: THREE.Mesh) => {
  m.geometry.computeBoundingBox();
  const c = m.geometry.boundingBox!.getCenter(new THREE.Vector3());
  return m.localToWorld(c);
};
const armMeshes = skinned.filter(
  (sk) => roots.some((r) => newWay(sk, r)) && centre(sk).y <= ELBOW_Y + 0.02,
);
const _p = new THREE.Vector3();
const t2 = performance.now();
let samples = 0;
for (const m of armMeshes) {
  const pos = m.geometry.getAttribute('position');
  if (!pos || pos.count === 0) continue;
  const step = Math.max(1, Math.floor(pos.count / 300));
  for (let i = 0; i < pos.count; i += step) {
    _p.fromBufferAttribute(pos, i);
    m.localToWorld(_p);
    samples++;
  }
}
const reachMs = performance.now() - t2;
console.log('');
console.log('3) RECORTE DEL BRAZO (muestreo de alcance)');
console.log(`   mallas por debajo del codo . ${armMeshes.length}`);
console.log(`   vértices muestreados ....... ${samples}`);
console.log(`   coste del muestreo ......... ${ms(reachMs)}`);
console.log('');
console.log('Nota: el recorte real suma a esto el recorte de triángulos y el test');
console.log('de manga, que son los que dominan la etapa en el navegador.');
