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
// ---------------------------------------------------------------------------
// Y UNA RESOLUCION POR REGION, QUE ES LO QUE LA APLICACION TIENE
// ---------------------------------------------------------------------------
// Este banco construia UNA resolucion con la UNION de los seis catalogos
// importados a mano. La aplicacion no tiene eso: `useAllMuscles` es "hombro
// gratuito + payload de LA REGION ABIERTA" (src/hooks/useMuscleResolution.ts),
// porque el contenido de pago sale del paquete y lo sirve la funcion `content`
// tras el control de acceso. Midiendo la union, el banco decia "0 musculos no
// encienden nada" mientras en cinco regiones el play del miotoma no encendia
// NI UNA malla: las fichas del vasto y del isquiotibial solo viven en la
// rodilla, y la del braquiorradial solo en el codo.
//
// Es el fallo de fidelidad de siempre, el de [[render-harness-fidelity]]: un
// banco que no mide lo que mide la aplicacion. Ahora:
//   - una resolucion POR REGION, con el payload que la funcion sirve de verdad
//     (leido de supabase/functions/content/payloads), no con los modulos;
//   - y recorre TAMBIEN los demos de miotoma de `src/data/neuro`, que no tocaba
//     y que son justo donde estaba el defecto, mas los resaltes de las pruebas
//     ortopedicas.
//
// Run: npm run audit-glow
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser } from './lib/rigPose.mts';
import { PREMIUM_REGION_IDS, readWrittenPayload } from './build-premium-content.mts';
import { buildMuscleResolution } from '../src/lib/muscleResolver.ts';
import { parseMeshName } from '../src/lib/parseMeshName.ts';
import {
  colorForMaterial,
  layerForMaterial,
  meshIsForearmFascia,
} from '../src/lib/materialColors.ts';
import { inDistalRegion, meshWorldCenter } from '../src/lib/rigLimbTrim.ts';
import { MINIMO_RESOLUBLE } from '../src/hooks/useMuscleResolution.ts';
import { shoulderMuscles } from '../src/data/muscles/shoulder.ts';
import { SHOULDER_ROM_LIST } from '../src/data/shoulderRom.ts';
import { SHOULDER_TRACK } from '../src/data/shoulderPhases.ts';
import { SHOULDER_ORTHOPEDIC_TESTS } from '../src/data/orthopedicTests/shoulder.ts';
import { NEURO_BY_REGION } from '../src/data/neuro/index.ts';
import type { Muscle } from '../src/types/muscle.ts';

type WantSide = 'left' | 'right';

/** Las ocho regiones del laboratorio, en el orden en que se ensenan. */
const REGION_IDS = [
  'shoulder',
  'elbow',
  'knee',
  'hip',
  'ankle',
  'cervical',
  'thoracic',
  'lumbar',
];

/** Donde nombra el dato a este musculo, para poder ir a arreglarlo. */
interface Credit {
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

interface TestLike {
  id: string;
  demo?: { highlightMuscleId?: string };
}

/**
 * LO QUE LA APLICACION TIENE ABIERTA ESTA REGION.
 *
 * El hombro es gratuito y va en el paquete; las otras siete llegan por red. Se
 * lee el payload ESCRITO EN DISCO, que es lo que la funcion `content` sirve,
 * no `buildPayload`: asi un payload sin regenerar sale aqui en lugar de salir
 * en la pantalla de un cliente que paga.
 */
interface RegionData {
  id: string;
  muscles: Muscle[];
  moves: MoveLike[];
  guides: GuideLike[];
  tests: TestLike[];
}

function loadRegion(id: string): RegionData {
  const guidesOf = (track: unknown): GuideLike[] =>
    Object.values((track as { phases?: Record<string, unknown> })?.phases ?? {}).flatMap(
      (ph) => ((ph as { guides?: GuideLike[] }).guides ?? []),
    );

  if (!PREMIUM_REGION_IDS.includes(id)) {
    return {
      id,
      muscles: shoulderMuscles,
      moves: SHOULDER_ROM_LIST as unknown as MoveLike[],
      guides: guidesOf(SHOULDER_TRACK),
      tests: SHOULDER_ORTHOPEDIC_TESTS as unknown as TestLike[],
    };
  }
  const payload = readWrittenPayload(id);
  if (!payload) {
    throw new Error(
      `falta supabase/functions/content/payloads/${id}.json — corre "npm run build-premium-content"`,
    );
  }
  return {
    id,
    // `romLookupMuscles`, no `muscles`: es el universo que el payload trae para
    // resolver nombres, y es lo que lee `allLoadedPremiumMuscles` (premiumStore).
    muscles: payload.romLookupMuscles ?? payload.muscles,
    moves: payload.rom as unknown as MoveLike[],
    guides: guidesOf(payload.track),
    tests: payload.tests as unknown as TestLike[],
  };
}

/** Todo lo que una region nombra: ROM, arcos inversos, envolventes, guias,
 *  demos de miotoma y resaltes de las pruebas ortopedicas. */
function collectCredits(reg: RegionData): Credit[] {
  const out: Credit[] = [];
  for (const mv of reg.moves) {
    for (const ph of mv.phases) {
      for (const m of ph.muscles) {
        out.push({ where: `${mv.id} / fase "${ph.label}"`, muscleId: m.muscleId });
      }
    }
    for (const ph of mv.labReverse?.phases ?? []) {
      for (const m of ph.muscles) {
        out.push({ where: `${mv.id} / arco inverso "${ph.label}"`, muscleId: m.muscleId });
      }
    }
    for (const a of mv.activations ?? []) {
      out.push({ where: `${mv.id} / envolvente`, muscleId: a.muscleId });
    }
  }
  for (const g of reg.guides) {
    for (const st of g.steps) {
      for (const mu of st.muscles) {
        out.push({ where: `${g.movementId} / guia paso "${st.id}"`, muscleId: mu.id });
      }
    }
  }
  for (const t of reg.tests) {
    const id = t.demo?.highlightMuscleId;
    if (id) out.push({ where: `prueba ${t.id} / demo`, muscleId: id });
  }
  // EL PANEL NEURO, que este banco no tocaba. Su juego de raices es por
  // EXTREMIDAD, no por region (el cervical sirve a hombro, codo y cervical; el
  // lumbosacro a cadera, rodilla, tobillo y lumbar), asi que un demo de miotoma
  // nombra fichas de otra region y es justo donde el universo por region se
  // rompia.
  for (const root of NEURO_BY_REGION[reg.id]?.roots ?? []) {
    for (const id of root.demo?.highlightMuscleIds ?? []) {
      out.push({ where: `miotoma ${root.id} / demo`, muscleId: id });
    }
  }
  return out;
}

/**
 * EL MISMO UNIVERSO QUE `useAllMuscles`: gratuito + payload de la region +
 * el suelo siempre resoluble, y en ese orden (la ficha completa gana).
 */
function universeFor(reg: RegionData): Muscle[] {
  const seen = new Set<string>();
  const out: Muscle[] = [];
  for (const list of [shoulderMuscles, reg.muscles, MINIMO_RESOLUBLE]) {
    for (const m of list) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
  }
  return out;
}

// --- Cargar el rig -----------------------------------------------------------
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
const meshNames = meshes.map((m) => m.name);

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
 * LA CAPA SALE DEL MATERIAL, no de `userData.rigLayer`. Esto preguntaba por
 * `userData.rigLayer === 'hidden'`, y ESE CAMPO NO EXISTE AQUI: lo escribe
 * RigModel al cargar en el navegador, y la cadena del banco (`rigPose.mts`) no
 * lo escribe nunca. O sea que medio filtro no filtraba nada y el banco contaba
 * como encendidas mallas que la aplicacion no ensena jamas. Medido: 993 mallas
 * de material muscular, de las que la aplicacion solo deja vivas 942 (51 caen
 * por el casquete de la mano y por los contenedores de Z-Anatomy).
 *
 * Las reglas son las de RigModel, con su mismo codigo compartido: material no
 * anatomico fuera, contenedores de grupo fuera, internos de la mano fuera, y la
 * fascia antebraquial dentro de la capa muscular.
 */
function layerOf(mesh: THREE.Mesh): string | null {
  const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const matName = (first as THREE.Material | undefined)?.name ?? '';
  const isGroupContainer =
    /g0\d\d$/.test(mesh.name) ||
    /_system/i.test(mesh.name) ||
    /^General[_ ]terms$/i.test(mesh.name);
  if (colorForMaterial(matName) === null || isGroupContainer) return null;
  if (inDistalRegion(meshWorldCenter(mesh))) return null;
  if (meshIsForearmFascia(mesh.name, matName)) return 'muscle';
  return layerForMaterial(matName);
}

function isOnScreen(mesh: THREE.Mesh): boolean {
  if (!mesh.visible) return false;
  if (layerOf(mesh) === null) return false;
  let p: THREE.Object3D | null = mesh.parent;
  while (p) {
    if (!p.visible) return false;
    p = p.parent;
  }
  return true;
}

const onScreen = new Map<string, boolean>();
for (const m of meshes) onScreen.set(m.name, isOnScreen(m));
const liveMuscleMeshes = meshes.filter((m) => onScreen.get(m.name) && layerOf(m) === 'muscle');

// --- Informe -----------------------------------------------------------------
console.log('===== SE ILUMINA EL MUSCULO QUE EL PANEL NOMBRA =====');
console.log(
  `${meshes.length} mallas en el rig · ${liveMuscleMeshes.length} de capa muscular vivas`,
);
console.log('Universo por region: hombro gratuito + payload de la region + suelo minimo.');
console.log('');

const pad = (s: string, n: number): string => s.padEnd(n);
let totalDead = 0;
let totalOneSided = 0;
let totalIds = 0;

for (const regionId of REGION_IDS) {
  const reg = loadRegion(regionId);
  const universe = universeFor(reg);
  const resolution = buildMuscleResolution(universe, meshNames);

  /** Cuantas mallas se encenderian para este musculo explorando ese lado. */
  const glowCount = (muscleId: string, want: WantSide): number => {
    const names = resolution.meshNamesByMuscleId.get(muscleId);
    if (!names) return 0;
    let n = 0;
    for (const name of names) {
      const mesh = meshByName.get(name);
      if (!mesh || !onScreen.get(name)) continue;
      const side = sideOfMesh(name, mesh);
      if (side !== want && side !== 'center') continue;
      n += 1;
    }
    return n;
  };

  const credits = collectCredits(reg);
  const ids = [...new Set(credits.map((c) => c.muscleId))].sort();
  const whereById = new Map<string, Credit[]>();
  for (const c of credits) {
    const list = whereById.get(c.muscleId) ?? [];
    list.push(c);
    whereById.set(c.muscleId, list);
  }

  const dead: string[] = [];
  const oneSided: string[] = [];
  for (const id of ids) {
    const r = glowCount(id, 'right');
    const l = glowCount(id, 'left');
    if (r === 0 && l === 0) dead.push(id);
    else if (r === 0 || l === 0) oneSided.push(id);
  }
  totalDead += dead.length;
  totalOneSided += oneSided.length;
  totalIds += ids.length;

  const estado =
    dead.length === 0 && oneSided.length === 0
      ? 'todo se enciende en los dos lados'
      : `${dead.length} sin encender · ${oneSided.length} a un solo lado`;
  console.log(
    `--- ${pad(regionId, 9)} ${String(universe.length).padStart(3)} fichas · ` +
      `${String(ids.length).padStart(3)} musculos nombrados · ${estado}`,
  );
  for (const id of dead) {
    console.log(`      NO ENCIENDE NADA  ${pad(id, 30)} 0 mallas`);
    const sites = whereById.get(id)!;
    for (const c of sites.slice(0, 4)) console.log(`          ${c.where}`);
    if (sites.length > 4) console.log(`          ... y ${sites.length - 4} sitio(s) mas`);
  }
  for (const id of oneSided) {
    console.log(
      `      SOLO UN LADO      ${pad(id, 30)} derecha ${String(glowCount(id, 'right')).padStart(3)}` +
        ` / izquierda ${String(glowCount(id, 'left')).padStart(3)}`,
    );
    for (const c of whereById.get(id)!.slice(0, 3)) console.log(`          ${c.where}`);
  }
}

console.log('');
console.log('===== RESUMEN =====');
console.log(`  ${totalIds} acreditaciones (musculo x region) comprobadas`);
console.log(`  ${totalOneSided} se encienden solo en un lado`);
console.log(`  ${totalDead} no encienden nada`);
console.log('');
console.log(
  totalDead === 0 && totalOneSided === 0
    ? '  En las ocho regiones, todo musculo que el panel nombra se enciende en los dos lados.'
    : '  Hay musculos nombrados que la escena no muestra.',
);
if (totalDead > 0 || totalOneSided > 0) process.exitCode = 1;
