// ¿SE ILUMINA EL MUSCULO QUE EL PANEL NOMBRA?
//
// `audit-direction` dice hacia donde va el movimiento, `audit-angles` cuantos
// grados recorre y `audit-functions` si la funcion acreditada es la que el
// musculo hace. Queda la ultima mitad de la promesa del laboratorio: que el
// musculo del que habla el texto SE ENCIENDA EN EL 3D.
//
// El panel manda una lista de `muscleId` y RigOverlays la resuelve contra los
// NOMBRES DE MALLA del GLB. Cuando un id no resuelve ninguna malla, el panel
// dice "Motor principal: Pectoral mayor 86%" y en la escena no se enciende
// nada. No hay error, no hay aviso, no hay hueco en la pantalla: el alumno
// simplemente no ve el musculo del que le estan hablando. Es el mismo tipo de
// defecto que los signos de direccion, y como ellos solo se encuentra midiendo.
//
// Y HAY QUE MEDIRLO EN LOS DOS LADOS. El filtro de lado no usa el nombre sino
// la POSICION de la malla (el sufijo `l`/`r` de Z-Anatomy falta o esta al reves
// en cientos de mallas; ver `npm run audit-laterality`), asi que un musculo
// puede encenderse al explorar la derecha y no al explorar la izquierda. Esa
// asimetria no se ve nunca en una sola captura.
//
// Reproduce exactamente lo que hace RigOverlays: `buildMuscleResolution` con
// las mallas del rig, y el mismo filtro de lado (centro de la esfera envolvente
// en mundo, umbral 4 cm, y el nombre solo como respaldo en la linea media).
//
// Y SOBRE EL RIG PREPARADO, NO SOBRE EL GLB CRUDO. Este banco cargaba el GLB a
// pelo y solo preguntaba si el id resolvia ALGUNA malla, asi que daba verde
// mientras la aplicacion no encendia nada: la preparacion (recortes por eje,
// culls por nombre, casquetes) oculta mallas DESPUES, y una malla oculta no se
// enciende. Medido en ese estado: decia "0 musculos no encienden nada" con el
// tensor de la fascia lata al 0% en pantalla y los cuatro digitales de la
// pierna tambien. Ahora corre `createRigPoser`, la misma cadena que RigModel, y
// cuenta solo mallas VISIBLES y de capa viva.
//
// Run: npm run audit-glow
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser } from './lib/rigPose.mts';
import { buildMuscleResolution } from '../src/lib/muscleResolver.ts';
import { parseMeshName } from '../src/lib/parseMeshName.ts';
import { shoulderMuscles } from '../src/data/muscles/shoulder.ts';
import { elbowMuscles } from '../src/data/muscles/elbow.ts';
import { kneeMuscles } from '../src/data/muscles/knee.ts';
import { hipMuscles } from '../src/data/muscles/hip.ts';
import { ankleMuscles } from '../src/data/muscles/ankle.ts';
import { spineMuscles } from '../src/data/muscles/spine.ts';
import { SHOULDER_ROM_LIST } from '../src/data/shoulderRom.ts';
import { ELBOW_ROM_LIST } from '../src/data/elbowRom.ts';
import { KNEE_ROM_LIST } from '../src/data/kneeRom.ts';
import { HIP_ROM_LIST } from '../src/data/hipRom.ts';
import { ANKLE_ROM_LIST } from '../src/data/ankleRom.ts';
import { CERVICAL_ROM_LIST } from '../src/data/cervicalRom.ts';
import { THORACIC_ROM_LIST } from '../src/data/thoracicRom.ts';
import { LUMBAR_ROM_LIST } from '../src/data/lumbarRom.ts';
import { SHOULDER_TRACK } from '../src/data/shoulderPhases.ts';
import { ELBOW_TRACK } from '../src/data/elbowPhases.ts';
import { KNEE_TRACK } from '../src/data/kneePhases.ts';
import { HIP_TRACK } from '../src/data/hipPhases.ts';
import { ANKLE_TRACK } from '../src/data/anklePhases.ts';
import { CERVICAL_TRACK } from '../src/data/cervicalPhases.ts';
import { THORACIC_TRACK } from '../src/data/thoracicPhases.ts';
import { LUMBAR_TRACK } from '../src/data/lumbarPhases.ts';

type WantSide = 'left' | 'right';

const REGIONS = [
  { id: 'shoulder', moves: SHOULDER_ROM_LIST, track: SHOULDER_TRACK },
  { id: 'elbow', moves: ELBOW_ROM_LIST, track: ELBOW_TRACK },
  { id: 'knee', moves: KNEE_ROM_LIST, track: KNEE_TRACK },
  { id: 'hip', moves: HIP_ROM_LIST, track: HIP_TRACK },
  { id: 'ankle', moves: ANKLE_ROM_LIST, track: ANKLE_TRACK },
  { id: 'cervical', moves: CERVICAL_ROM_LIST, track: CERVICAL_TRACK },
  { id: 'thoracic', moves: THORACIC_ROM_LIST, track: THORACIC_TRACK },
  { id: 'lumbar', moves: LUMBAR_ROM_LIST, track: LUMBAR_TRACK },
];

/** Donde nombra el dato a este musculo, para poder ir a arreglarlo. */
interface Credit {
  region: string;
  where: string;
  muscleId: string;
}

interface MoveLike {
  id: string;
  phases: { label: string; muscles: { muscleId: string }[] }[];
  labReverse?: { name: string; phases: { label: string; muscles: { muscleId: string }[] }[] };
  activations?: { muscleId: string }[];
}

interface GuideLike {
  movementId: string;
  steps: { id: string; muscles: { id: string }[] }[];
}

function collectCredits(): Credit[] {
  const out: Credit[] = [];
  for (const reg of REGIONS) {
    for (const mv of reg.moves as unknown as MoveLike[]) {
      for (const ph of mv.phases) {
        for (const m of ph.muscles) {
          out.push({
            region: reg.id,
            where: `${mv.id} / fase "${ph.label}"`,
            muscleId: m.muscleId,
          });
        }
      }
      for (const ph of mv.labReverse?.phases ?? []) {
        for (const m of ph.muscles) {
          out.push({
            region: reg.id,
            where: `${mv.id} / arco inverso "${ph.label}"`,
            muscleId: m.muscleId,
          });
        }
      }
      for (const a of mv.activations ?? []) {
        out.push({ region: reg.id, where: `${mv.id} / envolvente`, muscleId: a.muscleId });
      }
    }
    const guides = Object.values(reg.track.phases).flatMap(
      (ph) => ((ph as { guides?: GuideLike[] }).guides ?? []),
    );
    for (const g of guides) {
      for (const st of g.steps) {
        for (const mu of st.muscles) {
          out.push({
            region: reg.id,
            where: `${g.movementId} / guia paso "${st.id}"`,
            muscleId: mu.id,
          });
        }
      }
    }
  }
  return out;
}

// --- Cargar el rig y resolver ------------------------------------------------
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const buf = readFileSync(rigGlbPath());
const gltf = await loader.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  '',
);
const scene = gltf.scene;
// LA MISMA PREPARACION QUE LA APLICACION. Sin esto el banco mide un modelo que
// nadie ve: la mitad de lo que falla en pantalla falla DESPUES de cargar.
createRigPoser(scene, 'glenohumeral-abduction', 'R');
scene.updateMatrixWorld(true);

const meshes: THREE.Mesh[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (m.isMesh) meshes.push(m);
});
const meshByName = new Map(meshes.map((m) => [m.name, m]));
// LOS MODULOS DIRECTAMENTE, no `MUSCLES_BY_REGION`: ese registro solo lleva el
// nivel gratuito (el hombro) y el resto llega en tiempo de ejecucion tras el
// control de acceso, asi que en un script devuelve 18 musculos de 95. Es la
// misma trampa que `romForRegion` en `audit-functions` -- y la que hacia que el
// laboratorio no encendiera nada fuera del hombro (ver `useAllMuscles`).
const ALL_MUSCLES = [
  ...shoulderMuscles, ...elbowMuscles, ...kneeMuscles,
  ...hipMuscles, ...ankleMuscles, ...spineMuscles,
];
const resolution = buildMuscleResolution(
  ALL_MUSCLES,
  meshes.map((m) => m.name),
);

// EL MISMO filtro de lado que RigOverlays: la POSICION decide, no el nombre.
const LATERAL_M = 0.04;
function sideOfMesh(name: string, mesh: THREE.Mesh): string | null {
  if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
  const c = mesh.geometry.boundingSphere!.center.clone().applyMatrix4(mesh.matrixWorld);
  if (Math.abs(c.x) >= LATERAL_M) return c.x > 0 ? 'left' : 'right';
  return parseMeshName(name).side;
}

/**
 * ¿Esta malla llega a pintarse?
 *
 * La preparacion oculta mallas de dos maneras: apagando `visible` (recortes por
 * eje) y marcandolas `rigLayer = 'hidden'`, que las deja fuera de TODOS los
 * interruptores de capa. Una malla en cualquiera de los dos estados no se
 * enciende nunca, por mucho que el id resuelva.
 */
function isOnScreen(mesh: THREE.Mesh): boolean {
  if (!mesh.visible) return false;
  if (mesh.userData.rigLayer === 'hidden') return false;
  let p: THREE.Object3D | null = mesh.parent;
  while (p) {
    if (!p.visible) return false;
    p = p.parent;
  }
  return true;
}

/** Cuantas mallas se encenderian para este musculo explorando ese lado. */
function glowCount(muscleId: string, want: WantSide): number {
  const names = resolution.meshNamesByMuscleId.get(muscleId);
  if (!names) return 0;
  let n = 0;
  for (const name of names) {
    const mesh = meshByName.get(name);
    if (!mesh) continue;
    if (!isOnScreen(mesh)) continue;
    const side = sideOfMesh(name, mesh);
    if (side !== want && side !== 'center') continue;
    n += 1;
  }
  return n;
}

// --- Informe ----------------------------------------------------------------
const credits = collectCredits();
const ids = [...new Set(credits.map((c) => c.muscleId))].sort();
const whereById = new Map<string, Credit[]>();
for (const c of credits) {
  const list = whereById.get(c.muscleId) ?? [];
  list.push(c);
  whereById.set(c.muscleId, list);
}

console.log('===== SE ILUMINA EL MUSCULO QUE EL PANEL NOMBRA =====');
console.log(`${meshes.length} mallas en el rig / ${ALL_MUSCLES.length} fichas de musculo`);
console.log(`${credits.length} acreditaciones / ${ids.length} musculos distintos nombrados`);
console.log('');

const dead: string[] = [];
const oneSided: string[] = [];
for (const id of ids) {
  const r = glowCount(id, 'right');
  const l = glowCount(id, 'left');
  if (r === 0 && l === 0) dead.push(id);
  else if (r === 0 || l === 0) oneSided.push(id);
}

const pad = (s: string, n: number): string => s.padEnd(n);
if (dead.length > 0) {
  console.log('--- NO ENCIENDE NADA (el panel lo nombra, la escena no lo muestra) ---');
  for (const id of dead) {
    console.log(`  ${pad(id, 32)} 0 mallas`);
    const sites = whereById.get(id)!;
    for (const c of sites.slice(0, 4)) console.log(`        ${c.where}`);
    if (sites.length > 4) console.log(`        ... y ${sites.length - 4} sitio(s) mas`);
  }
  console.log('');
}
if (oneSided.length > 0) {
  console.log('--- SOLO ENCIENDE EN UN LADO (explorar el otro no muestra nada) ---');
  for (const id of oneSided) {
    console.log(
      `  ${pad(id, 32)} derecha ${String(glowCount(id, 'right')).padStart(3)} / ` +
        `izquierda ${String(glowCount(id, 'left')).padStart(3)}`,
    );
    for (const c of whereById.get(id)!.slice(0, 3)) console.log(`        ${c.where}`);
  }
  console.log('');
}

console.log('===== RESUMEN =====');
console.log(
  `  ${ids.length - dead.length - oneSided.length} musculos se encienden en los dos lados`,
);
console.log(`  ${oneSided.length} solo en un lado`);
console.log(`  ${dead.length} no encienden nada`);
console.log('');
console.log(
  dead.length === 0 && oneSided.length === 0
    ? '  Todo musculo que el panel nombra se enciende en los dos lados.'
    : '  Hay musculos nombrados que la escena no muestra.',
);
if (dead.length > 0 || oneSided.length > 0) process.exitCode = 1;
