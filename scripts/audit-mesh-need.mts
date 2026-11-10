// ¿CUANTAS DE LAS 2.659 MALLAS NECESITA DE VERDAD UNA REGION DEL LABORATORIO?
//
// AVISO MEDIDO (10 nov 2026): SUS VEREDICTOS MALLA A MALLA HAN DERIVADO.
// Este banco replica A MANO el orden de clasificacion de RigModel (deduplicado
// por distancia, simetria de brazos, casquete distal), y esa copia ya no dice
// lo mismo que el original: declara OCULTA la barriga del subescapular en los
// dos lados, y la aplicacion de verdad la ensena. Medido en el navegador sobre
// /hombro/movimiento con `window.__rigScene`: las seis mallas `Subscapularis_*`
// salen `visible: true` y capa `muscle`. Es [[render-harness-fidelity]] otra
// vez, en la direccion contraria: el banco inventa un defecto que no existe.
//
// SUS TOTALES SI VALEN. Ocultas en la app: 649 mallas / 255.600 vertices; aqui:
// 644 / 259.662. Un 1,6% de diferencia. Usalo para contar, no para decidir
// sobre una malla concreta.
//
// Y LO QUE VINO A RESPONDER YA ESTA RESPONDIDO, EN CONTRA: podar las ocultas NO
// acelera los pases. Tres corridas por modo con `--time`: 6371/5738/5478 ms con
// la escena completa contra 5428/5916/6130 ms con la podada. Las medianas
// (5.738 contra 5.916) no se distinguen del ruido. El reparto que si sirve
// --cuanto pesa en el GLB lo que no tiene capa posible-- lo da
// `npm run audit-glb-waste`, que no replica nada: pregunta por el material.
//
// POR QUE EXISTE. El primer fotograma util de /hombro/movimiento tarda ~10,3 s
// con cache caliente, y ~8,5 s de eso son los pases de preparacion de
// src/components/movement/RigModel.tsx. Esos pases recorren LA ESCENA ENTERA:
// `scene.traverse` sobre las 2.659 mallas, una vez por pase, sin que en ningun
// momento se pregunte a que region pertenece la malla. La hipotesis es que el
// laboratorio del hombro usa una fraccion y las demas pagan el parse y los
// pases para nada.
//
// LO QUE ESTE BANCO MIDE, Y LO QUE NO.
//
// "Necesitar" no es una sola cosa, asi que se miden TRES conjuntos encajados y
// se informan por separado. Mezclarlos es lo que convierte una medida en una
// opinion:
//
//   1. VIVAS. Las mallas que la clasificacion de RigModel deja en una capa que
//      se puede encender (piel / musculo / hueso / conectivo). El resto queda
//      `rigLayer = 'hidden'` para siempre: material no anatomico, contenedores
//      de grupo de Z-Anatomy, los internos de la mano, los recortes del
//      antebrazo, las puntas corruptas, los duplicados coincidentes y las
//      piezas del brazo sin pareja al otro lado. Una malla oculta NO se puede
//      encender nunca, y sin embargo paga el parse y los nueve pases.
//
//   2. DIRECCIONADAS. Las que algun consumidor pide POR NOMBRE estando en esa
//      region: el brillo por musculo del arco, las estructuras de los demos de
//      las pruebas, los parches de dermatoma de la capa neuro, y el casquete
//      de piel de manos y pies (que se muestra siempre). Es el conjunto mas
//      pequeno y el mas facil de defender.
//
//   3. EN ENCUADRE. Las que caen dentro de la caja de camara de la region
//      (`REGION_FRAME_BONES` + el margen de RigViewer), es decir lo que el
//      usuario ve al abrir sin tocar la rueda.
//
// LO QUE NO MIDE, Y HAY QUE DECIRLO: la DISECCION POR CLIC no tiene filtro de
// region. `RigModel.handleClick` acepta cualquier malla visible de capa
// `muscle` o `connective`, y `useAllMuscles` resuelve el catalogo entero. Asi
// que el musculo y el conectivo de TODO el cuerpo son direccionables desde
// cualquier region, y por eso se informan aparte: lo que sobra por encuadre no
// es lo mismo que lo que se puede borrar sin cambiar el comportamiento.
//
// EL RELOJ. Aqui no se mide tiempo. El panel de vista previa corre como pagina
// de fondo cuando esta oculto y el mismo trabajo mide 2,8 s una vez y 7,8 s la
// siguiente (ver scripts/measure-rig-prepare.mts). Esto cuenta MALLAS y
// VERTICES, que no dependen del reloj de nadie.
//
// EL MODELO ES EL DEL LABORATORIO. public/cuerpo-rig.opt.glb (2.659 mallas), no
// public/modelo-opt.dec.glb (el de Explorar, 6.316 mallas, descrito por
// public/anatomy-index.json). Son conjuntos distintos y no se mezclan: ver la
// nota de scripts/lib/rigInventory.mts, donde un registro entero se escribio
// contra el indice equivocado y resolvia a cero.
//
// Uso: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-mesh-need.mts
//      ... scripts/audit-mesh-need.mts --fusion   (detalle de los grupos fusionables)
//      ... scripts/audit-mesh-need.mts --time     (cuanto cuestan los pases con y
//                                                  sin las mallas siempre ocultas)

import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

import { rigGlbPath } from './lib/rigPath.mts';
import {
  colorForMaterial,
  layerForMaterial,
  materialIsSkin,
  type AnatomyLayer,
} from '../src/lib/materialColors.ts';
import {
  inDistalRegion,
  meshWorldCenter,
  trimForearmOutliers,
} from '../src/lib/rigLimbTrim.ts';
import {
  armHeights,
  dominantBoneName,
  rebindArmBellies,
  reweightArmAboveElbow,
} from '../src/lib/rigArmRebind.ts';
import { unmangleForearmMeshes } from '../src/lib/rigForearmUnmangle.ts';
import { inflateSkinShell } from '../src/lib/skinShellInflate.ts';
import {
  smoothNeckSkin,
  smoothSkinSpine,
  smoothSpineConnective,
  smoothTrunkSkin,
  vertebraHeights,
} from '../src/lib/rigSpineSkin.ts';
import { repairFaceWinding } from '../src/lib/faceWinding.ts';
import { bindClaviclesToShoulderGirdle } from '../src/lib/clavicleBinding.ts';
import { bridgeShoulderSkin } from '../src/lib/shoulderSkinBridge.ts';
import { gradeShoulderMuscleBinding } from '../src/lib/shoulderMuscleBinding.ts';
import { blendHipSkin } from '../src/lib/rigHipSkin.ts';
import { regradeAnkleCrossers } from '../src/lib/rigAnkleRebind.ts';
import { blendPelvicOrigins } from '../src/lib/rigPelvicOrigin.ts';
import { redistributeSkinRootWeight } from '../src/lib/rigSkinRootWeight.ts';
import { relaxSkinSeams } from '../src/lib/skinSeamRelax.ts';
import { parseMeshName, structureKey } from '../src/lib/parseMeshName.ts';
import { buildMuscleResolution } from '../src/lib/muscleResolver.ts';
import { meshIsStructure } from '../src/lib/clinicalStructures.ts';
import { resolvePatches, ownedPatches } from '../src/lib/neuroSkin.ts';
import { SKIN_BY_ROOT } from '../src/data/neuro/skinRegions.ts';
import type { PlateFigure } from '../src/data/neuro/plate.ts';
import {
  FRAME_DEGENERATE_SIDE,
  FRAME_MIN_SIDE,
  FRAME_PAD_RATIO,
  REGION_FRAME_BONES,
} from '../src/lib/labFraming.ts';
import {
  ALL_MUSCLES_BY_REGION,
  ALL_ROM_BY_REGION,
  ALL_ROM_LOOKUP_BY_REGION,
  ALL_TESTS_BY_REGION,
  ALL_TRACK_BY_REGION,
} from '../src/data/fullContent.ts';
import type { Muscle } from '../src/types/muscle.ts';

const DETAIL = process.argv.includes('--fusion');
/** `--oculto`: desglosa QUE hay en cada categoria de malla siempre oculta. */
const HIDDEN = process.argv.includes('--oculto');
// CRONOMETRAR Y AUDITAR EN EL MISMO PROCESO NO VALE, Y ESTO SE MIDIO.
//
// El primer intento corria los pases sobre la escena completa y luego sobre la
// podada dentro del mismo proceso, despues de haber hecho toda la auditoria. El
// resultado era basura: `gradeShoulderMuscleBinding` salia a 356 ms en la
// primera escena y a 1.827 ms en la segunda --un "ahorro" de -1.470 ms por
// podar-- y el parse, que mide 440 ms en un proceso limpio, salia a 3.134 ms.
// Eso no es el coste del pase, es la presion del recolector de basura sobre un
// monton que ya tenia dos escenas de un millon de vertices dentro.
//
// Asi que con `--time` este banco NO audita: solo cronometra, una sola
// configuracion por proceso, y las dos configuraciones hacen EXACTAMENTE el
// mismo trabajo previo para que su huella de memoria sea comparable. La
// comparacion se hace entre procesos:
//
//   for i in 1 2 3; do npx tsx ... scripts/audit-mesh-need.mts --time; done
//   for i in 1 2 3; do npx tsx ... scripts/audit-mesh-need.mts --time --pruned; done
//
// y se comparan las MEDIANAS.
const TIME = process.argv.includes('--time');
const PRUNED = process.argv.includes('--pruned');

// Las ocho regiones del laboratorio, en el orden de labFraming.
const REGION_IDS = [
  'shoulder',
  'elbow',
  'cervical',
  'thoracic',
  'lumbar',
  'hip',
  'knee',
  'ankle',
] as const;
type RegionId = (typeof REGION_IDS)[number];

/**
 * La figura neuro de cada region (src/data/neuro/index.ts): el juego cervical
 * sirve al miembro SUPERIOR y el lumbosacro al INFERIOR. La toracica no tiene
 * pantalla neuro, asi que no pinta ningun parche de dermatoma.
 */
const NEURO_FIGURE: Record<RegionId, PlateFigure | null> = {
  shoulder: 'upper-limb',
  elbow: 'upper-limb',
  cervical: 'upper-limb',
  thoracic: null,
  lumbar: 'lower-limb',
  hip: 'lower-limb',
  knee: 'lower-limb',
  ankle: 'lower-limb',
};

/** 4 mm, el mismo DUP_EPS de RigModel. */
const DUP_EPS = 0.004;
/** Los mismos umbrales de `isCorruptedSpike` en RigModel. */
const SPIKE_RATIO = 3.5;
const SPIKE_MAX_M = 0.13;
/** El mismo umbral de lado geometrico de RigOverlays / rigInventory. */
const LATERAL_M = 0.04;
/** El mismo MATCH_DIST_M del pase de simetria del brazo. */
const MATCH_DIST_M = 0.04;

/** El informe de la auditoria. Callado con `--time`, que solo cronometra. */
const out = TIME ? (..._a: unknown[]) => {} : (...a: unknown[]) => console.log(...a);
const ms = (t: number) => `${t.toFixed(0)} ms`;
const pct = (a: number, b: number) => (b === 0 ? '  -  ' : `${((100 * a) / b).toFixed(1)}%`);
const pad = (s: string | number, n: number) => String(s).padStart(n);
const padR = (s: string | number, n: number) => String(s).padEnd(n);

// ---------------------------------------------------------------------------
// 1. CARGAR EL GLB DEL LABORATORIO
// ---------------------------------------------------------------------------
const glbPath = rigGlbPath();
const buf = readFileSync(glbPath);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

/** Un parse limpio del GLB. Devuelve la escena y lo que costo construirla. */
async function loadScene(): Promise<{ scene: THREE.Group; ms: number }> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const t = performance.now();
  const gl = await loader.parseAsync(ab, '');
  return { scene: gl.scene as THREE.Group, ms: performance.now() - t };
}

// EL PRIMER PARSE NO SE CRONOMETRA. Mide ademas el arranque de los modulos de
// three y la compilacion del decodificador meshopt: medido, 1.935 ms la primera
// vez y 440 ms la mediana de las siguientes sobre el MISMO fichero. Citar el
// primero como "lo que cuesta el parse" es cuadruplicarlo.
await loadScene();
const first = await loadScene();
const parseMs = first.ms;
const scene = first.scene;
scene.updateMatrixWorld(true);

// ---------------------------------------------------------------------------
// 2. LOS PASES DE LA PREPARACION QUE CAMBIAN *QUE MALLAS HAY*
//
// De los nueve pases de RigModel solo tres pueden mover el recuento: los dos
// que mueven POSICIONES (y por tanto el centro con el que se clasifica) y el
// recorte, que oculta. Los pases de PESO (religados, costuras, origenes
// pelvicos) no cambian ni la visibilidad ni el centro en reposo, asi que no se
// corren: este banco cuenta mallas, no mide deformacion.
//
// `smoothSkinSpine` SI se corre, porque el deduplicado clasifica por hueso
// EFECTIVO y para un musculo del raquis ese hueso lo decide el re-ligado.
// ---------------------------------------------------------------------------
unmangleForearmMeshes(scene);
inflateSkinShell(scene);
scene.updateMatrixWorld(true);
const heights = armHeights(scene);
const limbOutliers = trimForearmOutliers(scene, heights);

const vertY = vertebraHeights(scene);
/** Vertebras del raquis con su posicion en reposo, como en RigModel. */
const spineVerts: { name: string; pos: THREE.Vector3 }[] = [];
const spineRoot = scene.getObjectByName('Spine_Armature');
spineRoot?.traverse((o) => {
  const bn = o.name.replace(/_\d+$/, '');
  if (/^vert_/.test(bn) && !spineVerts.some((v) => v.name === bn)) {
    spineVerts.push({ name: bn, pos: o.getWorldPosition(new THREE.Vector3()) });
  }
});
const nearestVert = (c: THREE.Vector3): string | null => {
  let best: string | null = null;
  let bd = Infinity;
  for (const v of spineVerts) {
    const d = c.distanceToSquared(v.pos);
    if (d < bd) {
      bd = d;
      best = v.name;
    }
  }
  return best;
};

// ---------------------------------------------------------------------------
// 3. CLASIFICAR: la misma cadena de decisiones del pase de RigModel
// ---------------------------------------------------------------------------
interface MeshInfo {
  mesh: THREE.Mesh;
  name: string;
  material: string;
  /** Capa viva, o null cuando queda oculta para siempre. */
  layer: AnatomyLayer | null;
  /** Por que quedo oculta (vacio si esta viva). */
  why: string;
  /** Casquete de piel de mano/pie: visible SIEMPRE, pase lo que pase. */
  distalCap: boolean;
  center: THREE.Vector3;
  verts: number;
  tris: number;
  /** Lado anatomico por geometria (+x es la IZQUIERDA en este GLB). */
  side: 'left' | 'right' | 'center';
  /** Hueso efectivo, el que usa el deduplicado. */
  bone: string;
  /** Esqueleto, para saber si dos mallas se pueden fusionar. */
  skeleton: string;
  /** Caja envolvente en mundo, para el test de encuadre. */
  box: THREE.Box3;
}

const _sv = new THREE.Vector3();
const _sc = new THREE.Vector3();
/** Igual que `isCorruptedSpike` en RigModel: nucleo compacto + vertices disparados. */
function isCorruptedSpike(mesh: THREE.Mesh): boolean {
  const pos = mesh.geometry.getAttribute('position');
  if (!pos || pos.count < 8) return false;
  const step = Math.max(1, Math.floor(pos.count / 160));
  const pts: number[] = [];
  _sc.set(0, 0, 0);
  let n = 0;
  for (let i = 0; i < pos.count; i += step) {
    _sv.fromBufferAttribute(pos, i);
    mesh.localToWorld(_sv);
    _sc.add(_sv);
    n++;
  }
  if (n < 4) return false;
  _sc.multiplyScalar(1 / n);
  for (let i = 0; i < pos.count; i += step) {
    _sv.fromBufferAttribute(pos, i);
    mesh.localToWorld(_sv);
    pts.push(_sv.distanceTo(_sc));
  }
  pts.sort((a, b) => a - b);
  const median = pts[pts.length >> 1] || 1e-9;
  const max = pts[pts.length - 1] || 0;
  return max > SPIKE_MAX_M && max / median > SPIKE_RATIO;
}

const all: MeshInfo[] = [];
const tClass = performance.now();
scene.traverse((o) => {
  const mesh = o as THREE.Mesh;
  if (!mesh.isMesh) return;
  const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const material = (first as THREE.Material | undefined)?.name ?? '';
  const center = meshWorldCenter(mesh);
  const pos = mesh.geometry.getAttribute('position');
  const verts = pos?.count ?? 0;
  const idx = mesh.geometry.getIndex();
  const tris = idx ? idx.count / 3 : verts / 3;
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
  const sk = mesh as THREE.SkinnedMesh;
  const info: MeshInfo = {
    mesh,
    name: mesh.name,
    material,
    layer: null,
    why: '',
    distalCap: false,
    center,
    verts,
    tris,
    side: Math.abs(center.x) < LATERAL_M ? 'center' : center.x > 0 ? 'left' : 'right',
    bone: '',
    skeleton: sk.isSkinnedMesh && sk.skeleton ? sk.skeleton.uuid : '',
    box,
  };
  all.push(info);

  // -- el orden EXACTO del pase de RigModel (lineas ~2041-2307) --
  const base = colorForMaterial(material);
  const isGroupContainer =
    /g0\d\d$/.test(mesh.name) || /_system/i.test(mesh.name) || /^General[_ ]terms$/i.test(mesh.name);
  if (base === null || isGroupContainer) {
    info.why = base === null ? 'material no anatomico' : 'contenedor de grupo Z-Anatomy';
    return;
  }
  if (inDistalRegion(center)) {
    if (materialIsSkin(material)) {
      info.layer = 'skin';
      info.distalCap = true;
    } else {
      info.why = 'interno de la mano (casquete de piel)';
    }
    return;
  }
  const layer = layerForMaterial(material);
  if (layer === null) {
    info.why = 'capa nula (nervio/vaso/fascia/bolsa/organo)';
    return;
  }
  if (layer === 'skin') {
    info.layer = 'skin';
    info.bone = dominantBoneName(mesh);
    return;
  }
  if (limbOutliers.has(mesh)) {
    info.why = 'recorte medido del antebrazo';
    return;
  }
  if (isCorruptedSpike(mesh)) {
    info.why = 'punta corrupta del export';
    return;
  }
  // Hueso efectivo para el deduplicado: un musculo del raquis se re-liga por
  // vertice y entonces la clave es la vertebra mas cercana a su centro.
  const dom = dominantBoneName(mesh);
  let effBone = dom;
  if (layer === 'muscle' && dom.startsWith('vert_')) {
    if (smoothSkinSpine(mesh, vertY)) effBone = nearestVert(center) ?? dom;
  }
  info.layer = layer;
  info.bone = effBone;
});
const classMs = performance.now() - tClass;

// -- deduplicado de copias coincidentes (hideOverlapDuplicates) --------------
const dupPool = all.filter((m) => m.layer !== null && m.layer !== 'skin' && m.bone);
let dupHidden = 0;
for (let i = 0; i < dupPool.length; i++) {
  const a = dupPool[i];
  if (a.layer === null) continue;
  for (let j = i + 1; j < dupPool.length; j++) {
    const b = dupPool[j];
    if (b.layer === null || b.bone !== a.bone) continue;
    if (a.center.distanceTo(b.center) > DUP_EPS) continue;
    const loser = b.verts <= a.verts ? b : a;
    loser.layer = null;
    loser.why = 'duplicado coincidente (mismo hueso, <4 mm)';
    dupHidden++;
    if (a.layer === null) break;
  }
}

// -- simetria del brazo: piezas sin pareja al otro lado ----------------------
const shoulderRoots = (['R', 'L'] as const)
  .map((s) => scene.getObjectByName(`Shoulder_Armature_${s}`))
  .filter((r): r is THREE.Object3D => !!r);
const descIds = new Map<number, Set<number>>();
const belongsTo = (mesh: THREE.Mesh, root: THREE.Object3D): boolean => {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  let ids = descIds.get(root.id);
  if (!ids) {
    ids = new Set<number>();
    root.traverse((x) => ids!.add(x.id));
    descIds.set(root.id, ids);
  }
  return sk.skeleton.bones.some((b) => ids!.has(b.id));
};
let armOrphans = 0;
{
  const bySide = new Map<string, { L: MeshInfo[]; R: MeshInfo[] }>();
  for (const root of shoulderRoots) {
    const side = /_R$/.test(root.name) ? 'R' : 'L';
    for (const m of all) {
      if (m.layer === null || m.layer === 'skin') continue;
      if (!belongsTo(m.mesh, root)) continue;
      const key = structureKey(m.name);
      if (!key) continue;
      const e = bySide.get(key) ?? { L: [], R: [] };
      e[side as 'L' | 'R'].push(m);
      bySide.set(key, e);
    }
  }
  for (const { L, R } of bySide.values()) {
    if (L.length === 0 || R.length === 0) continue;
    for (const [mine, theirs] of [
      [L, R],
      [R, L],
    ] as [MeshInfo[], MeshInfo[]][]) {
      const taken = new Set<MeshInfo>();
      for (const p of mine) {
        const mirrored = p.center.clone().setX(-p.center.x);
        let best: MeshInfo | null = null;
        let bestD = Infinity;
        for (const q of theirs) {
          if (taken.has(q) || q.layer !== p.layer) continue;
          const ratio = q.verts / Math.max(1, p.verts);
          if (ratio < 0.8 || ratio > 1.25) continue;
          const d = mirrored.distanceTo(q.center);
          if (d < bestD) {
            bestD = d;
            best = q;
          }
        }
        if (best && bestD <= MATCH_DIST_M) {
          taken.add(best);
          continue;
        }
        if (p.layer !== null) {
          p.layer = null;
          p.why = 'pieza del brazo sin pareja al otro lado';
          armOrphans++;
        }
      }
    }
  }
}

const live = all.filter((m) => m.layer !== null);
const byName = new Map<string, MeshInfo>();
for (const m of all) byName.set(m.name, m);

const sumV = (list: MeshInfo[]) => list.reduce((s, m) => s + m.verts, 0);
const sumT = (list: MeshInfo[]) => list.reduce((s, m) => s + m.tris, 0);

// ---------------------------------------------------------------------------
// 4. EL INVENTARIO GLOBAL
// ---------------------------------------------------------------------------
out('===== CUANTAS MALLAS NECESITA DE VERDAD EL LABORATORIO =====');
out(`GLB  ${glbPath}`);
out(
  `     ${(buf.byteLength / 1e6).toFixed(2)} MB en disco / parse ${ms(parseMs)} / ` +
    `clasificacion ${ms(classMs)}`,
);
out('');
out(
  `TOTAL                 ${pad(all.length, 6)} mallas  ${pad(sumV(all), 9)} vertices  ` +
    `${pad(Math.round(sumT(all)), 9)} triangulos`,
);
out(
  `VIVAS (capa visible)  ${pad(live.length, 6)} mallas  ${pad(sumV(live), 9)} vertices  ` +
    `${pad(Math.round(sumT(live)), 9)} triangulos`,
);
const dead = all.filter((m) => m.layer === null);
out(
  `OCULTAS PARA SIEMPRE  ${pad(dead.length, 6)} mallas  ${pad(sumV(dead), 9)} vertices  ` +
    `${pad(Math.round(sumT(dead)), 9)} triangulos   (${pct(dead.length, all.length)} de las mallas, ` +
    `${pct(sumV(dead), sumV(all))} de los vertices)`,
);
out('');
out('--- POR QUE QUEDAN OCULTAS ---');
{
  const byWhy = new Map<string, MeshInfo[]>();
  for (const m of dead) {
    const l = byWhy.get(m.why) ?? [];
    l.push(m);
    byWhy.set(m.why, l);
  }
  const rows = [...byWhy.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [why, list] of rows) {
    out(`  ${padR(why, 46)} ${pad(list.length, 5)} mallas  ${pad(sumV(list), 8)} vertices`);
  }
  out(
    `  (deduplicado ${dupHidden}, simetria del brazo ${armOrphans}: contados arriba)`,
  );
  // CON --oculto, QUE SON. Las categorias son etiquetas; borrar mallas del GLB
  // se decide sobre lo que hay dentro de cada una, no sobre su nombre. Con la
  // lista por material y por malla se ve si "capa nula" es viscera (que un
  // laboratorio de movimiento no va a ensenar nunca) o nervio (que la pestana
  // Neuro podria querer algun dia).
  if (HIDDEN) {
    for (const [why, list] of rows) {
      out('');
      out(`  == ${why} == ${list.length} mallas, ${sumV(list)} vertices`);
      const porMat = new Map<string, MeshInfo[]>();
      for (const m of list) {
        const l = porMat.get(m.material) ?? [];
        l.push(m);
        porMat.set(m.material, l);
      }
      for (const [mat, ms] of [...porMat.entries()].sort((a, b) => sumV(b[1]) - sumV(a[1]))) {
        out(
          `     ${padR(mat || '(sin material)', 26)} ${pad(ms.length, 4)} mallas ${pad(sumV(ms), 8)} vert  ${ms
            .slice(0, 4)
            .map((m) => m.name)
            .join(', ')}${ms.length > 4 ? ', ...' : ''}`,
        );
      }
    }
  }
}
out('');
out('--- LAS CAPAS VIVAS (lo que el panel de Capas enciende) ---');
out('    Por defecto el laboratorio arranca con piel+musculo+hueso ON y conectivo OFF');
out('    (LAYER_DEFAULTS en RigModel.tsx:924).');
for (const lyr of ['skin', 'muscle', 'bone', 'connective'] as AnatomyLayer[]) {
  const list = live.filter((m) => m.layer === lyr);
  const caps = list.filter((m) => m.distalCap);
  out(
    `  ${padR(lyr, 12)} ${pad(list.length, 5)} mallas  ${pad(sumV(list), 8)} vertices` +
      (caps.length ? `   (${caps.length} casquete de mano, siempre visible)` : ''),
  );
}
out('');

// ---------------------------------------------------------------------------
// 5. LOS CONSUMIDORES QUE PIDEN UNA MALLA CONCRETA
// ---------------------------------------------------------------------------
// -- a) el universo de musculos resoluble (useAllMuscles con todo desbloqueado)
const muscleUniverse: Muscle[] = (() => {
  const seen = new Set<string>();
  const out: Muscle[] = [];
  for (const list of [
    ...Object.values(ALL_MUSCLES_BY_REGION),
    ...Object.values(ALL_ROM_LOOKUP_BY_REGION),
  ]) {
    for (const m of list) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
  }
  return out;
})();
const resolution = buildMuscleResolution(
  muscleUniverse,
  all.map((m) => m.name),
);

// -- b) los musculos que CADA REGION acredita (fase, arco inverso, envolvente,
//       guia pedagogica y el resalte de las pruebas)
interface MoveLike {
  id: string;
  phases: { muscles: { muscleId: string }[] }[];
  labReverse?: { phases: { muscles: { muscleId: string }[] }[] };
  activations?: { muscleId: string }[];
}
interface GuideLike {
  steps: { muscles: { id: string }[] }[];
}
function creditedMuscleIds(region: RegionId): Set<string> {
  const out = new Set<string>();
  for (const mv of (ALL_ROM_BY_REGION[region] ?? []) as unknown as MoveLike[]) {
    for (const ph of mv.phases) for (const m of ph.muscles) out.add(m.muscleId);
    for (const ph of mv.labReverse?.phases ?? []) for (const m of ph.muscles) out.add(m.muscleId);
    for (const a of mv.activations ?? []) out.add(a.muscleId);
  }
  const track = ALL_TRACK_BY_REGION[region];
  if (track) {
    for (const ph of Object.values(track.phases) as { guides?: GuideLike[] }[]) {
      for (const g of ph.guides ?? []) {
        for (const st of g.steps) for (const mu of st.muscles) out.add(mu.id);
      }
    }
  }
  for (const t of ALL_TESTS_BY_REGION[region] ?? []) {
    const id = t.demo?.highlightMuscleId;
    if (id) out.add(id);
  }
  return out;
}

/** Las estructuras clinicas que los demos de las pruebas de la region encienden. */
function demoStructureIds(region: RegionId): Set<string> {
  const out = new Set<string>();
  for (const t of ALL_TESTS_BY_REGION[region] ?? []) {
    for (const id of t.demo?.highlightStructureIds ?? []) out.add(id);
  }
  return out;
}

// -- c) los parches de dermatoma: el indice se construye sobre TODA la piel viva
const skinLive = live.filter((m) => m.layer === 'skin');
const patchInput = skinLive.map((m) => ({
  ref: m,
  name: m.name,
  x: m.center.x,
  y: m.center.y,
  span: Math.abs(m.box.max.x - m.box.min.x),
}));
const resolvedPatches = resolvePatches(patchInput);
function neuroPatchesFor(region: RegionId): Set<MeshInfo> {
  const fig = NEURO_FIGURE[region];
  const out = new Set<MeshInfo>();
  if (!fig) return out;
  for (const root of Object.keys(SKIN_BY_ROOT[fig])) {
    for (const { patch } of ownedPatches(resolvedPatches, fig, root)) out.add(patch.ref);
  }
  return out;
}

// -- d) la caja de encuadre de la region (RigViewer.padBox) ------------------
function frameBox(region: RegionId): THREE.Box3 {
  const names = new Set(REGION_FRAME_BONES[region] ?? []);
  const box = new THREE.Box3();
  // LOS DOS LADOS A PROPOSITO. El encuadre real filtra por el sufijo del
  // armature (el usuario explora un lado), pero para decidir que mallas se
  // podrian NO cargar hay que quedarse con la union: si se mide un solo lado,
  // la mitad del cuerpo parece prescindible y el interruptor de lado la pide.
  scene.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    if (!names.has(o.name.replace(/_\d+$/, ''))) return;
    const p = o.getWorldPosition(new THREE.Vector3());
    if (isFinite(p.x)) box.expandByPoint(p);
  });
  if (box.isEmpty()) return box;
  const size = box.getSize(new THREE.Vector3());
  box.expandByScalar(Math.max(size.x, size.y, size.z) * FRAME_PAD_RATIO);
  const grown = box.getSize(new THREE.Vector3());
  const lift = (v: number) => (v < FRAME_DEGENERATE_SIDE ? (FRAME_MIN_SIDE - v) / 2 : 0);
  const g = new THREE.Vector3(
    Math.max(0, lift(grown.x)),
    Math.max(0, lift(grown.y)),
    Math.max(0, lift(grown.z)),
  );
  box.min.sub(g);
  box.max.add(g);
  return box;
}

// ---------------------------------------------------------------------------
// 6. LA TABLA POR REGION
// ---------------------------------------------------------------------------
interface RegionRow {
  id: RegionId;
  addressed: Set<MeshInfo>;
  framed: Set<MeshInfo>;
  need: Set<MeshInfo>;
  glowMeshes: number;
  deadIds: string[];
  structMeshes: number;
  neuroMeshes: number;
  caps: number;
  dissectOutside: MeshInfo[];
}
const rows: RegionRow[] = [];

for (const region of REGION_IDS) {
  const addressed = new Set<MeshInfo>();
  // El casquete de mano/pie: `applyLayers` lo fuerza visible en toda region.
  let caps = 0;
  for (const m of live) {
    if (m.distalCap) {
      addressed.add(m);
      caps++;
    }
  }
  // El brillo por musculo.
  const ids = creditedMuscleIds(region);
  const deadIds: string[] = [];
  let glowMeshes = 0;
  for (const id of ids) {
    const names = resolution.meshNamesByMuscleId.get(id);
    let n = 0;
    for (const name of names ?? []) {
      const m = byName.get(name);
      if (!m || m.layer === null) continue;
      addressed.add(m);
      n++;
    }
    glowMeshes += n;
    if (n === 0) deadIds.push(id);
  }
  // Las estructuras de los demos de las pruebas.
  let structMeshes = 0;
  for (const sid of demoStructureIds(region)) {
    for (const m of all) {
      if (m.layer === null) continue;
      if (!meshIsStructure(sid, m.name)) continue;
      addressed.add(m);
      structMeshes++;
    }
  }
  // Los parches de dermatoma.
  const neuro = neuroPatchesFor(region);
  for (const m of neuro) addressed.add(m);
  // El encuadre.
  const box = frameBox(region);
  const framed = new Set<MeshInfo>();
  if (!box.isEmpty()) {
    for (const m of live) if (box.intersectsBox(m.box)) framed.add(m);
  }
  const need = new Set<MeshInfo>([...addressed, ...framed]);
  // Lo direccionable por DISECCION que cae fuera del encuadre: el aviso.
  const dissectOutside = live.filter(
    (m) => (m.layer === 'muscle' || m.layer === 'connective') && !need.has(m),
  );
  rows.push({
    id: region,
    addressed,
    framed,
    need,
    glowMeshes,
    deadIds,
    structMeshes,
    neuroMeshes: neuro.size,
    caps,
    dissectOutside,
  });
}

out('===== POR REGION =====');
out('  DIRECCIONADAS = pedidas por nombre: brillo del arco + estructura de los demos');
out('                  + parches de dermatoma + casquete de mano/pie (siempre visible).');
out('  EN ENCUADRE   = dentro de la caja de camara de la region (los dos lados).');
out('  NECESARIAS    = la union de las dos. SOBRA = vivas - necesarias.');
out('');
const H =
  `${padR('region', 10)}${pad('vivas', 7)}${pad('direcc.', 9)}${pad('encuadre', 10)}` +
  `${pad('necesar.', 10)}${pad('sobra', 8)}${pad('% sobra', 9)}${pad('vert.sobra', 12)}${pad('%vert', 8)}`;
out(H);
out('-'.repeat(H.length));
for (const r of rows) {
  const need = [...r.need];
  const surplus = live.filter((m) => !r.need.has(m));
  out(
    padR(r.id, 10) +
      pad(live.length, 7) +
      pad(r.addressed.size, 9) +
      pad(r.framed.size, 10) +
      pad(need.length, 10) +
      pad(surplus.length, 8) +
      pad(pct(surplus.length, live.length), 9) +
      pad(sumV(surplus), 12) +
      pad(pct(sumV(surplus), sumV(live)), 8),
  );
}
out('');
out('--- DE DONDE SALE LO DIRECCIONADO DE CADA REGION ---');
out(
  padR('region', 10) +
    pad('brillo', 8) +
    pad('estruct.', 10) +
    pad('dermat.', 9) +
    pad('casquete', 10) +
    '  ids del panel que no resuelven ninguna malla',
);
for (const r of rows) {
  out(
    padR(r.id, 10) +
      pad(r.glowMeshes, 8) +
      pad(r.structMeshes, 10) +
      pad(r.neuroMeshes, 9) +
      pad(r.caps, 10) +
      '  ' +
      (r.deadIds.length ? r.deadIds.join(', ') : '-'),
  );
}
out('');
out('--- EL OTRO AVISO: EL ACARREO DEL RAQUIS ---');
out('  El hombro arrastra el tronco. `apply` desplaza los armatures del hombro con');
out('  vert_T3 (SHOULDER_SPINE_ANCHOR en RigModel) y los movimientos del raquis');
out('  reparten el angulo por vertebras, asi que toda malla pielada al');
out('  Spine_Armature se MUEVE aunque su region no la nombre. Si se descarga por');
out('  encuadre, el tronco se queda quieto mientras el brazo se va.');
{
  const spineSkel = new Set<string>();
  for (const name of ['Spine_Armature']) {
    const root = scene.getObjectByName(name);
    if (!root) continue;
    root.traverse((o) => {
      const sk = o as THREE.SkinnedMesh;
      if (sk.isSkinnedMesh && sk.skeleton) spineSkel.add(sk.skeleton.uuid);
    });
  }
  // El esqueleto del raquis se reconoce por sus huesos, no por el padre: las
  // mallas cuelgan de la escena, no del armature.
  const spineBoneIds = new Set<number>();
  scene.getObjectByName('Spine_Armature')?.traverse((o) => spineBoneIds.add(o.id));
  const onSpine = (m: MeshInfo): boolean => {
    const sk = m.mesh as THREE.SkinnedMesh;
    if (!sk.isSkinnedMesh || !sk.skeleton) return false;
    return sk.skeleton.bones.some((b) => spineBoneIds.has(b.id));
  };
  const spineLive = live.filter(onSpine);
  out(
    `  Mallas vivas pieladas al Spine_Armature: ${spineLive.length} ` +
      `(${sumV(spineLive)} vertices).`,
  );
  for (const r of rows) {
    const surplusSpine = spineLive.filter((m) => !r.need.has(m));
    out(
      `  ${padR(r.id, 10)} ${pad(surplusSpine.length, 5)} de ellas caen FUERA de lo que la ` +
        `region necesita (${pad(sumV(surplusSpine), 8)} vertices)`,
    );
  }
}
out('');
out('--- EL AVISO: LA DISECCION NO TIENE FILTRO DE REGION ---');
out('  RigModel.handleClick acepta CUALQUIER malla visible de capa muscle/connective');
out('  (RigModel.tsx:1295-1319) y useAllMuscles resuelve el catalogo entero, asi que');
out('  descargar lo que sobra por encuadre cambia el comportamiento del clic.');
for (const r of rows) {
  out(
    `  ${padR(r.id, 10)} ${pad(r.dissectOutside.length, 5)} mallas de musculo/conectivo ` +
      `fuera del encuadre siguen siendo clicables (${pad(sumV(r.dissectOutside), 8)} vertices)`,
  );
}
out('');

// ---------------------------------------------------------------------------
// 7. CANDIDATAS A FUSION
// ---------------------------------------------------------------------------
// QUE DESCALIFICA A UNA MALLA, Y POR QUE. Fusionar dos mallas borra sus nombres,
// y el nombre es la direccion: todo lo que el laboratorio sabe hacer con una
// malla concreta lo hace por nombre.
//
//   1. Toda malla de capa `muscle` o `connective`. El clic de diseccion las
//      acepta TODAS (resuelvan o no al catalogo: si no resuelven, el panel se
//      titula con el nombre crudo de Blender, pero funciona), y `parseMeshName`
//      saca de ese nombre la base y el lado con los que se pela la estructura.
//   2. Toda malla que `buildMuscleResolution` asocia a una ficha del catalogo:
//      es la que se enciende cuando el panel la nombra.
//   3. Toda malla que casa con un patron de CLINICAL_STRUCTURES: es la que
//      enciende el demo de una prueba.
//   4. Toda malla de piel. El indice de dermatomas (`resolvePatches`) coloca
//      cada parche por su POSICION dentro de su grupo region+lado, asi que
//      fusionar dos parches no solo borra uno: mueve las fracciones `lateral` y
//      `level` de TODOS los del grupo y reescribe el mapa de raices.
//   5. Toda malla cuyo esqueleto no sea el de su grupo. `skinIndex` indexa
//      `skeleton.bones`, de modo que solo se pueden fusionar mallas que
//      compartan esqueleto si se quiere conservar el pielado por vertice.
//
// Lo que queda es HUESO que nadie direcciona. Y queda un aviso mas: el
// deduplicado y la simetria del brazo clasifican por hueso dominante, centro y
// numero de vertices, asi que fusionar en el GLB cambia lo que esos dos pases
// ocultan. Hay que volver a correr este banco despues de fusionar.
const resolvedMeshNames = new Set(resolution.muscleByMeshName.keys());
const structureMeshNames = new Set<string>();
for (const r of rows) {
  for (const sid of demoStructureIds(r.id)) {
    for (const m of all) if (meshIsStructure(sid, m.name)) structureMeshNames.add(m.name);
  }
}

interface FusionGroup {
  key: string;
  material: string;
  members: MeshInfo[];
}
const fusionGroups = new Map<string, FusionGroup>();
let dqMuscleConn = 0;
let dqSkin = 0;
let dqCatalog = 0;
let dqStructure = 0;
let dqNoSkeleton = 0;
for (const m of live) {
  if (m.layer === 'muscle' || m.layer === 'connective') {
    dqMuscleConn++;
    continue;
  }
  if (m.layer === 'skin') {
    dqSkin++;
    continue;
  }
  if (resolvedMeshNames.has(m.name)) {
    dqCatalog++;
    continue;
  }
  if (structureMeshNames.has(m.name)) {
    dqStructure++;
    continue;
  }
  if (!m.skeleton) {
    dqNoSkeleton++;
    continue;
  }
  // Agrupadas por lo que una fusion exige de verdad: mismo esqueleto (para que
  // `skinIndex` siga valiendo) y mismo material (para que el programa de shader
  // y el color no cambien).
  const key = `${m.skeleton}|${m.material}`;
  const g = fusionGroups.get(key) ?? { key, material: m.material, members: [] };
  g.members.push(m);
  fusionGroups.set(key, g);
}
const fusable = [...fusionGroups.values()]
  .filter((g) => g.members.length > 1)
  .sort((a, b) => b.members.length - a.members.length);
const fusableMeshes = fusable.reduce((s, g) => s + g.members.length, 0);
const fusableVerts = fusable.reduce((s, g) => s + sumV(g.members), 0);
const singles = [...fusionGroups.values()].filter((g) => g.members.length === 1).length;

out('===== CANDIDATAS A FUSION =====');
out('  Descalificadas (y por que):');
out(
  `    ${pad(dqMuscleConn, 5)} musculo/conectivo  -> el clic de diseccion las acepta TODAS ` +
    '(RigModel.tsx:1295)',
);
out(
  `    ${pad(dqSkin, 5)} piel               -> el indice de dermatomas las coloca por ` +
    'posicion dentro de su grupo (neuroSkin.resolvePatches)',
);
out(
  `    ${pad(dqCatalog, 5)} resuelven a ficha  -> se encienden cuando el panel las nombra`,
);
out(
  `    ${pad(dqStructure, 5)} casan CLINICAL_STRUCTURES -> las enciende el demo de una prueba`,
);
out(`    ${pad(dqNoSkeleton, 5)} sin esqueleto      -> no se puede conservar el pielado`);
out('');
out(
  `  FUSIONABLES: ${fusableMeshes} mallas en ${fusable.length} grupos ` +
    `(mismo esqueleto + mismo material), ${fusableVerts} vertices ` +
    `(${pct(fusableVerts, sumV(live))} de los vertices vivos).`,
);
out(
  `  Bajarian el recuento de ${live.length} a ${live.length - fusableMeshes + fusable.length} ` +
    `mallas vivas (-${fusableMeshes - fusable.length}, ${pct(fusableMeshes - fusable.length, live.length)}).`,
);
out(`  Grupos de una sola malla (no fusionables): ${singles}.`);
out('');
out('  Los 15 grupos mas grandes:');
out(
  '    ' + padR('material', 22) + pad('mallas', 8) + pad('vertices', 10) + '  ejemplos',
);
for (const g of fusable.slice(0, 15)) {
  out(
    '    ' +
      padR(g.material, 22) +
      pad(g.members.length, 8) +
      pad(sumV(g.members), 10) +
      '  ' +
      g.members
        .slice(0, 3)
        .map((m) => m.name)
        .join(', '),
  );
}
if (DETAIL) {
  out('');
  out('  --- TODOS LOS GRUPOS ---');
  for (const g of fusable) {
    out(
      `    ${padR(g.material, 22)} ${pad(g.members.length, 5)} mallas  ${pad(sumV(g.members), 8)} vert`,
    );
    for (const m of g.members) out(`        ${m.name}`);
  }
}
// ---------------------------------------------------------------------------
// 8. LO QUE CUESTAN LOS PASES CON Y SIN LAS MALLAS SIEMPRE OCULTAS  (--time)
// ---------------------------------------------------------------------------
// POR QUE AQUI Y NO EN EL NAVEGADOR: el panel de vista previa corre como pagina
// de fondo cuando esta oculto y el mismo trabajo mide 2,8 s una vez y 7,8 s la
// siguiente. En Node nadie estrangula el reloj.
//
// COMO SE MIDE: una sola configuracion por proceso. Se parsea el GLB otra vez,
// con `--pruned` se DESCUELGAN del grafo las mallas que la clasificacion deja
// ocultas para siempre, y se corre la cadena de pases de RigModel. El trabajo
// previo (dos parses de calentamiento + la clasificacion) es identico en los dos
// modos, asi que la huella de memoria es comparable y la diferencia entre los
// dos procesos es el coste de esas 644 mallas.
//
// Los nombres valen como identidad: GLTFLoader los hace unicos dentro de la
// escena (anade "_1", "_2" a las colisiones), asi que dos parses del mismo GLB
// dan el mismo juego de nombres.
if (TIME) {
  const hiddenNames = new Set(dead.map((m) => m.name));

  /** La cadena de pases de RigModel, cronometrada pase a pase. */
  function runPasses(sc: THREE.Object3D): { total: number; stages: [string, number][] } {
    const stages: [string, number][] = [];
    const step = (label: string, fn: () => void) => {
      const t = performance.now();
      fn();
      stages.push([label, performance.now() - t]);
    };
    const layerOf = (mesh: THREE.Mesh) => {
      const f = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      return layerForMaterial((f as THREE.Material | undefined)?.name ?? null);
    };
    sc.updateMatrixWorld(true);
    step('unmangleForearmMeshes', () => void unmangleForearmMeshes(sc));
    step('inflateSkinShell', () => void inflateSkinShell(sc));
    step('repairFaceWinding', () => void repairFaceWinding(sc));
    step('bindClaviclesToShoulderGirdle', () => void bindClaviclesToShoulderGirdle(sc));
    step('bridgeShoulderSkin', () => void bridgeShoulderSkin(sc));
    step('gradeShoulderMuscleBinding', () => void gradeShoulderMuscleBinding(sc));
    const vy = vertebraHeights(sc);
    step('smoothSkinSpine (musculo)', () => {
      sc.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || layerOf(mesh) !== 'muscle') return;
        if (!dominantBoneName(mesh).startsWith('vert_')) return;
        smoothSkinSpine(mesh, vy);
      });
    });
    step('smoothSpineConnective', () =>
      void smoothSpineConnective(sc, vy, (m) =>
        layerOf(m) === 'connective' ? 'connective' : 'other',
      ),
    );
    step('smoothNeckSkin', () =>
      void smoothNeckSkin(sc, vy, (m) => (layerOf(m) === 'skin' ? 'skin' : 'other')),
    );
    step('blendHipSkin', () =>
      void blendHipSkin(sc, (m) => (layerOf(m) === 'skin' ? 'skin' : 'other')),
    );
    step('regradeAnkleCrossers', () =>
      void regradeAnkleCrossers(sc, (m) => {
        const l = layerOf(m);
        return l === 'muscle' || l === 'connective' ? 'soft' : 'other';
      }),
    );
    step('smoothTrunkSkin', () =>
      void smoothTrunkSkin(sc, vy, (m) => (layerOf(m) === 'skin' ? 'skin' : 'other')),
    );
    step('blendPelvicOrigins', () =>
      void blendPelvicOrigins(sc, (m) => {
        const l = layerOf(m);
        return l === 'muscle' ? 'muscle' : l === 'connective' ? 'connective' : 'other';
      }),
    );
    step('redistributeSkinRootWeight', () =>
      void redistributeSkinRootWeight(sc, (m) => {
        const l = layerOf(m);
        return l === 'skin' || l === 'muscle' || l === 'connective' ? l : 'other';
      }),
    );
    step('relaxSkinSeams', () => void relaxSkinSeams(sc));
    step('rebindArmBellies', () =>
      void rebindArmBellies(sc, (m) => {
        const l = layerOf(m);
        return l === 'muscle' ? 'muscle' : l === 'skin' ? 'skin' : 'other';
      }),
    );
    step('reweightArmAboveElbow', () => void reweightArmAboveElbow(sc));
    step('trimForearmOutliers', () => void trimForearmOutliers(sc));
    step('isCorruptedSpike (todas)', () => {
      sc.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) isCorruptedSpike(mesh);
      });
    });
    return { total: stages.reduce((s, [, v]) => s + v, 0), stages };
  }

  const countMeshes = (sc: THREE.Object3D) => {
    let n = 0;
    sc.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) n++;
    });
    return n;
  };

  // `--region <id>` poda a lo que ESA region puede llegar a necesitar (el
  // conjunto NECESARIAS de la tabla de arriba). Es el experimento que decide la
  // hipotesis: si el laboratorio del hombro solo necesita 1.267 de las 2.659
  // mallas, cargar solo esas tendria que notarse en los pases.
  const regionArg = (() => {
    const i = process.argv.indexOf('--region');
    const v = i >= 0 ? process.argv[i + 1] : undefined;
    return v && (REGION_IDS as readonly string[]).includes(v) ? (v as RegionId) : null;
  })();
  const keep: Set<string> | null = regionArg
    ? new Set([...rows.find((r) => r.id === regionArg)!.need].map((m) => m.name))
    : null;

  const target = await loadScene();
  let detached = 0;
  if (PRUNED || keep) {
    const detach: THREE.Object3D[] = [];
    target.scene.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      const drop = keep ? !keep.has(o.name) : hiddenNames.has(o.name);
      if (drop) detach.push(o);
    });
    for (const o of detach) o.parent?.remove(o);
    detached = detach.length;
  }
  const meshes = countMeshes(target.scene);
  const run = runPasses(target.scene);

  const what = keep ? `SOLO ${regionArg!.toUpperCase()}` : PRUNED ? 'PODADA' : 'COMPLETA';
  console.log(
    `== PASES DE PREPARACION / escena ${what} ` +
      `(${meshes} mallas${detached ? `, ${detached} descolgadas` : ''}) ==`,
  );
  console.log(`   parse de esta escena ${ms(target.ms)}`);
  console.log('   ' + padR('pase', 32) + pad('ms', 9));
  for (const [label, v] of run.stages) {
    console.log('   ' + padR(label, 32) + pad(v.toFixed(0), 9));
  }
  console.log('   ' + padR('TOTAL', 32) + pad(run.total.toFixed(0), 9));
  console.log('');
  console.log('   ADVERTENCIA DE LECTURA. (1) Una sola corrida no vale: lanza tres de cada');
  console.log('   modo y compara MEDIANAS. (2) Estos son los pases COMPARTIDOS con el banco');
  console.log('   de render. El pase propio de RigModel (sustituir los 2.659 materiales, el');
  console.log('   deduplicado O(n^2) y la simetria del brazo) no esta aqui porque vive dentro');
  console.log('   del componente y no se puede importar: este total es un SUELO del coste de');
  console.log('   la preparacion, no el coste completo.');
}

out('');
out('NOTA FINAL. Sin --time esto NO mide tiempo: cuenta cuantas mallas y cuantos');
out('vertices atraviesan el parse y los pases de RigModel sin que ningun consumidor');
out('de la region activa pueda pedirlas. El reparto por etapas del arranque se mide');
out('con `npx tsx --tsconfig tsconfig.scripts.json scripts/measure-rig-prepare.mts`.');
