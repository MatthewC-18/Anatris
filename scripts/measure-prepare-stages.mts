// ¿CUÁNTO CUESTA CADA PASE DE LA PREPARACIÓN, UNO POR UNO?
//
// `measure-rig-prepare.mts` responde "¿dónde se van los segundos?" por etapas
// gruesas (parse / predicado / muestreo). Este script responde la pregunta que
// hace falta para TROCEAR el efecto de src/components/movement/RigModel.tsx:
// cuánto cuesta cada pase por separado, y QUÉ ESCRIBE cada uno.
//
// El navegador NO vale de cronómetro (el panel de vista previa corre como página
// de fondo: el mismo trabajo mide 2,8 s una vez y 7,8 s la siguiente). Así que se
// mide en Node, igual que el script precedente.
//
// Los pases se ejecutan EN EL MISMO ORDEN que RigModel, sobre la misma escena, y
// cada uno se cronometra por separado. Para los pases que viven dentro de
// RigModel y no se pueden importar (reparación de espejos, dedup, simetría del
// brazo, pase de estilo) se cronometra el trabajo EQUIVALENTE con las mismas
// funciones compartidas; esas filas van marcadas `~equiv`.
//
// QUÉ ESCRIBE CADA PASE: `BufferAttribute.needsUpdate` incrementa `version`, así
// que se fotografían las versiones de todos los atributos antes y después de
// cada pase y se cuenta cuántas subieron, por nombre de atributo. Eso distingue
// los pases que mueven POSICIONES o PESOS (invisibles en reposo, sólo se notan
// al mover) de los que cambian MATERIAL o VISIBILIDAD (visibles en el primer
// fotograma). Es la base del grafo de dependencias.
//
// Uso: npx tsx --tsconfig tsconfig.scripts.json scripts/measure-prepare-stages.mts
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { resolveArmatureName, type Side } from '../src/lib/boneMap.ts';
import { rigGlbPath } from './lib/rigPath.mts';

import { inflateSkinShell } from '../src/lib/skinShellInflate.ts';
import { unmangleForearmMeshes } from '../src/lib/rigForearmUnmangle.ts';
import { repairFaceWinding } from '../src/lib/faceWinding.ts';
import { bindClaviclesToShoulderGirdle } from '../src/lib/clavicleBinding.ts';
import { bridgeShoulderSkin } from '../src/lib/shoulderSkinBridge.ts';
import { gradeShoulderMuscleBinding } from '../src/lib/shoulderMuscleBinding.ts';
import { relaxSkinSeams } from '../src/lib/skinSeamRelax.ts';
import { blendHipSkin } from '../src/lib/rigHipSkin.ts';
import { regradeAnkleCrossers } from '../src/lib/rigAnkleRebind.ts';
import {
  smoothNeckSkin,
  smoothTrunkSkin,
  smoothSkinSpine,
  smoothSpineConnective,
  vertebraHeights,
} from '../src/lib/rigSpineSkin.ts';
import { blendPelvicOrigins } from '../src/lib/rigPelvicOrigin.ts';
import { redistributeSkinRootWeight } from '../src/lib/rigSkinRootWeight.ts';
import {
  armHeights,
  dominantBoneName,
  isUpperArmBelly,
  rigidBindTo,
  reweightArmAboveElbow,
} from '../src/lib/rigArmRebind.ts';
import { blendKneeSkin, kneeHeight, KNEE_SKIN_REACH_M } from '../src/lib/rigSkinRepair.ts';
import { inDistalRegion, meshWorldCenter, trimForearmOutliers } from '../src/lib/rigLimbTrim.ts';
import {
  colorForMaterial,
  colorForMaterialMesh,
  layerForMaterial,
  materialIsSkin,
  tissueClassForMaterial,
  type AnatomyLayer,
  type TissueClass,
} from '../src/lib/materialColors.ts';
import { muscleDepthLevel } from '../src/lib/muscleDepth.ts';
import { parseMeshName, structureKey } from '../src/lib/parseMeshName.ts';
import { buildMuscleResolution } from '../src/lib/muscleResolver.ts';
import { shoulderMuscles } from '../src/data/muscles/shoulder.ts';

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------
const path = rigGlbPath();
const buf = readFileSync(path);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);

const tParse = performance.now();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const parseMs = performance.now() - tParse;
const scene = gl.scene as THREE.Group;

const tMat = performance.now();
scene.updateMatrixWorld(true);
const matrixMs = performance.now() - tMat;

const meshes: THREE.Mesh[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (m.isMesh) meshes.push(m);
});

console.log(`GLB ${path}`);
console.log(`     ${buf.byteLength} B en disco, ${meshes.length} mallas`);
console.log('');

// ---------------------------------------------------------------------------
// Instrumentación: qué atributos escribe cada pase
// ---------------------------------------------------------------------------
type AnyAttr = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
type Snap = Map<AnyAttr, number>;

/**
 * LA VERSION DE UN ATRIBUTO INTERLEAVED NO ESTA EN EL ATRIBUTO.
 *
 * El GLB viene codificado con meshopt, así que la mayoría de atributos son
 * `InterleavedBufferAttribute`, que NO tiene `.version`: la lleva su
 * `InterleavedBuffer` (`.data.version`). Leer `a.version` ahí devuelve
 * `undefined` y toda comparación de versiones sale "atributo nuevo", que es lo
 * que hacía la primera versión de este script.
 */
function versionOf(a: AnyAttr): number {
  const inter = (a as THREE.InterleavedBufferAttribute).data;
  if (inter) return inter.version;
  return (a as THREE.BufferAttribute).version;
}

function snapshot(): Snap {
  const s: Snap = new Map();
  for (const m of meshes) {
    const g = m.geometry;
    if (!g) continue;
    for (const name of Object.keys(g.attributes)) {
      const a = g.attributes[name] as AnyAttr;
      s.set(a, versionOf(a));
    }
    if (g.index) s.set(g.index, versionOf(g.index));
  }
  return s;
}

/** Las mallas que un pase reescribió, para saber DONDE actua cada pase. */
let lastTouched: THREE.Mesh[] = [];

/** Qué atributos subieron de versión, por nombre, + mallas con geometría nueva. */
function diff(before: Snap): string {
  const counts = new Map<string, number>();
  let fresh = 0;
  lastTouched = [];
  for (const m of meshes) {
    const g = m.geometry;
    if (!g) continue;
    const names = Object.keys(g.attributes);
    let isFresh = false;
    let touched = false;
    for (const name of names) {
      const a = g.attributes[name] as AnyAttr;
      const prev = before.get(a);
      if (prev === undefined) {
        isFresh = true;
        continue;
      }
      if (versionOf(a) > prev) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
        touched = true;
      }
    }
    if (isFresh) fresh++;
    if (touched || isFresh) lastTouched.push(m);
    if (g.index) {
      const prev = before.get(g.index);
      if (prev !== undefined && versionOf(g.index) > prev)
        counts.set('index', (counts.get('index') ?? 0) + 1);
    }
  }
  const parts = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`);
  if (fresh > 0) parts.push(`geometria-nueva:${fresh}`);
  return parts.length ? parts.join(' ') : '-';
}

/**
 * V = se VE en el primer fotograma en reposo (material, visibilidad, posiciones,
 *     índices, geometría recortada).
 * P = sólo PESOS de skinning: en reposo bone*boneInverse = identidad, así que no
 *     cambia ni un píxel hasta que un hueso GIRA.
 * X = precómputo que necesitan los dos.
 */
type Cat = 'V' | 'P' | 'X';

interface Row {
  n: string;
  ms: number;
  writes: string;
  cat: Cat;
  note?: string;
}
const rows: Row[] = [];
/** Donde actua cada pase, para poder retrasarlo POR REGION y no en bloque. */
const zones: { pase: string; cat: Cat; meshes: THREE.Mesh[] }[] = [];

function stage(n: string, cat: Cat, fn: () => void, note?: string): void {
  const before = snapshot();
  const t = performance.now();
  fn();
  const ms = performance.now() - t;
  const writes = diff(before);
  const touched = lastTouched.slice();
  rows.push({ n, ms, writes, cat, note });
  if (touched.length > 0) zones.push({ pase: n, cat, meshes: touched });
}

// ---------------------------------------------------------------------------
// Precómputos que RigModel hace antes del primer pase
// ---------------------------------------------------------------------------
const _descendants = new Map<number, Set<number>>();
const belongsTo = (mesh: THREE.Object3D, root: THREE.Object3D): boolean => {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  let ids = _descendants.get(root.id);
  if (!ids) {
    ids = new Set<number>();
    root.traverse((o) => ids!.add(o.id));
    _descendants.set(root.id, ids);
  }
  return sk.skeleton.bones.some((b) => ids!.has(b.id));
};
const shoulderRoots = new Map<Side, THREE.Object3D>();

let vertY = new Map<string, number>();
let ELBOW_Y = 0;
let WRIST_Y = 0;
let UPPER_ARM_Y = 0;
let KNEE_Y = 0;

stage('00 precomputo (armatures, alturas codo/muneca/rodilla, vertebras)', 'X', () => {
  for (const side of ['R', 'L'] as Side[]) {
    const r = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side));
    if (r) shoulderRoots.set(side, r);
  }
  vertY = vertebraHeights(scene);
  const h = armHeights(scene);
  ELBOW_Y = h.elbowY;
  WRIST_Y = h.wristY;
  UPPER_ARM_Y = h.upperArmY;
  KNEE_Y = kneeHeight(scene);
});

// ---------------------------------------------------------------------------
// Pases, EN EL ORDEN DE RigModel
// ---------------------------------------------------------------------------

// 00b el useMemo de `rig`: captura de la pose de reposo de los 5 armatures.
//     Es lo que la condicion "nada se mueve hasta que esto exista" protege.
stage('00b useMemo rig (pose de reposo de los 5 armatures)', 'X', () => {
  const byArmature = new Map<string, Map<string, THREE.Object3D>>();
  const restQuat = new Map<THREE.Object3D, THREE.Quaternion>();
  const restPos = new Map<THREE.Object3D, THREE.Vector3>();
  const restWorld = new Map<THREE.Object3D, THREE.Matrix4>();
  scene.updateMatrixWorld(true);
  for (const armName of [
    'Shoulder_Armature_R',
    'Shoulder_Armature_L',
    'Leg_Armature_R',
    'Leg_Armature_L',
    'Spine_Armature',
  ]) {
    const root = scene.getObjectByName(armName);
    if (!root) continue;
    const bones = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      const base = o.name.replace(/_\d+$/, '');
      if (!bones.has(base)) bones.set(base, o);
      if (!restQuat.has(o)) restQuat.set(o, o.quaternion.clone());
      if (!restPos.has(o)) restPos.set(o, o.position.clone());
    });
    byArmature.set(armName, bones);
    restWorld.set(root, root.matrixWorld.clone());
  }
  rows.push({
    n: `   (armatures ${byArmature.size}, huesos con reposo ${restQuat.size})`,
    ms: 0,
    writes: '-',
    cat: 'X',
  });
}, 'RigModel 1047-1130');

// 00c el useMemo de resolucion de musculos (corre en RENDER, antes del efecto).
stage('00c useMemo muscleByMeshName (nombres + buildMuscleResolution)', 'X', () => {
  const names: string[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) names.push(m.name);
  });
  buildMuscleResolution(shoulderMuscles, names);
}, 'RigModel 1215-1223');

// 1) reparacion de mallas espejadas (local a RigModel): su coste dominante es
//    calcular la esfera envolvente de cada malla con piel + agrupar por nombre.
stage(
  '01 ~equiv reparacion espejo (boundingSphere de cada malla + agrupacion)',
  'V',
  () => {
    const groups = new Map<string, number>();
    for (const m of meshes) {
      const sk = m as THREE.SkinnedMesh;
      if (!sk.isSkinnedMesh || !m.geometry) continue;
      const first = Array.isArray(m.material) ? m.material[0] : m.material;
      if (!layerForMaterial((first as THREE.Material | undefined)?.name)) continue;
      const g = m.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (!g.boundingBox) g.computeBoundingBox();
      const key = structureKey(m.name);
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
  },
  'RigModel 1703-1788',
);

stage('02 unmangleForearmMeshes', 'V', () => void unmangleForearmMeshes(scene), 'RigModel 1804');
stage('03 inflateSkinShell', 'V', () => void inflateSkinShell(scene), 'RigModel 1826');
stage('04 repairFaceWinding', 'V', () => void repairFaceWinding(scene), 'RigModel 1834');
stage('05 bindClaviclesToShoulderGirdle', 'P', () => void bindClaviclesToShoulderGirdle(scene), 'RigModel 1848');
stage('06 bridgeShoulderSkin', 'P', () => void bridgeShoulderSkin(scene), 'RigModel 1852');
stage('07 gradeShoulderMuscleBinding', 'P', () => void gradeShoulderMuscleBinding(scene), 'RigModel 1858');

const layerOf = (mesh: THREE.Mesh): AnatomyLayer | null => {
  const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return layerForMaterial((first as THREE.Material | undefined)?.name ?? null);
};

stage('08 blendHipSkin', 'P', () => {
  blendHipSkin(scene, (m) => (layerOf(m) === 'skin' ? 'skin' : 'other'));
}, 'RigModel 1869');
stage('09 regradeAnkleCrossers', 'P', () => {
  regradeAnkleCrossers(scene, (m) => {
    const l = layerOf(m);
    return l === 'muscle' || l === 'connective' ? 'soft' : 'other';
  });
}, 'RigModel 1882');
stage('10 smoothSpineConnective', 'P', () => {
  smoothSpineConnective(scene, vertY, (m) => (layerOf(m) === 'connective' ? 'connective' : 'other'));
}, 'RigModel 1894');
stage('11 smoothNeckSkin', 'P', () => {
  smoothNeckSkin(scene, vertY, (m) => (layerOf(m) === 'skin' ? 'skin' : 'other'));
}, 'RigModel 1903');
stage('12 smoothTrunkSkin', 'P', () => {
  smoothTrunkSkin(scene, vertebraHeights(scene), (m) => (layerOf(m) === 'skin' ? 'skin' : 'other'));
}, 'RigModel 1916');
stage('13 blendPelvicOrigins', 'P', () => {
  blendPelvicOrigins(scene, (m) => {
    const l = layerOf(m);
    return l === 'muscle' ? 'muscle' : l === 'connective' ? 'connective' : 'other';
  });
}, 'RigModel 1926');
stage('14 redistributeSkinRootWeight', 'P', () => {
  redistributeSkinRootWeight(scene, (m) => {
    const l = layerOf(m);
    return l === 'skin' || l === 'muscle' || l === 'connective' ? l : 'other';
  });
}, 'RigModel 1936');
stage('15 relaxSkinSeams', 'P', () => void relaxSkinSeams(scene), 'RigModel 1943');

let outliers: Set<THREE.Object3D> = new Set<THREE.Object3D>();
// CUANTOS TRIANGULOS DIBUJA CADA MALLA ANTES DEL RECORTE.
//
// El recorte NO toca `position`: reconstruye el INDICE dejando fuera los
// triangulos que se salen del miembro, asi que la caja envolvente no se mueve
// (medirla fue el primer intento y daba 0 mallas cambiadas, que es un falso
// negativo). Lo que cambia es el numero de triangulos DIBUJADOS, y esos
// triangulos se dibujan ya en reposo: de ahi que el pase no se pueda retrasar.
const trisBefore = new Map<THREE.Mesh, number>();
for (const m of meshes) {
  if (!m.geometry) continue;
  trisBefore.set(m, (m.geometry.index?.count ?? m.geometry.getAttribute('position')?.count ?? 0) / 3);
}
stage('16 trimForearmOutliers', 'V', () => {
  outliers = trimForearmOutliers(scene, {
    elbowY: ELBOW_Y,
    wristY: WRIST_Y,
    upperArmY: UPPER_ARM_Y,
  });
}, 'RigModel 1969');
{
  let changed = 0;
  let dropped = 0;
  let worstPct = 0;
  let worstName = '';
  for (const m of meshes) {
    const b = trisBefore.get(m);
    if (b === undefined || !m.geometry) continue;
    const a = (m.geometry.index?.count ?? m.geometry.getAttribute('position')?.count ?? 0) / 3;
    if (a < b) {
      changed++;
      dropped += b - a;
      const pct = (100 * (b - a)) / b;
      if (pct > worstPct) { worstPct = pct; worstName = m.name; }
    }
  }
  rows.push({
    n:
      `   (el recorte quita ${dropped} triangulos de ${changed} mallas, dibujados YA EN ` +
      `REPOSO; la peor pierde ${worstPct.toFixed(0)}%: ${worstName}; sin arreglo ${outliers.size})`,
    ms: 0,
    writes: '-',
    cat: 'X',
  });
}

// ---- el pase grande de estilo + etiquetado, troceado en sus partes ---------
const centers = new Map<THREE.Mesh, THREE.Vector3>();
stage('17a centro mundial de cada malla (meshWorldCenter)', 'V', () => {
  for (const m of meshes) centers.set(m, meshWorldCenter(m));
}, 'RigModel 2059');

const kept: { mesh: THREE.Mesh; layer: AnatomyLayer; hex: number; tissue: TissueClass }[] = [];
/** POR QUE SE APAGA CADA MALLA QUE NO SOBREVIVE AL PASE DE ESTILO. */
const hiddenWhy = { grupo: 0, noAnatomia: 0, distalInterno: 0, recorteSinArreglo: 0 };
stage('17b clasificacion (color/capa/tejido/distal) sin tocar materiales', 'V', () => {
  for (const m of meshes) {
    const first = Array.isArray(m.material) ? m.material[0] : m.material;
    const matName = first?.name ?? '';
    const base = colorForMaterial(matName);
    const isGroup =
      /g0\d\d$/.test(m.name) || /_system/i.test(m.name) || /^General[_ ]terms$/i.test(m.name);
    if (base === null || isGroup) {
      if (isGroup) hiddenWhy.grupo++;
      else hiddenWhy.noAnatomia++;
      continue;
    }
    const c = centers.get(m)!;
    if (inDistalRegion(c)) {
      if (!materialIsSkin(matName)) {
        hiddenWhy.distalInterno++;
        continue;
      }
      kept.push({ mesh: m, layer: 'skin', hex: base, tissue: 'other' });
      continue;
    }
    const layer = layerForMaterial(matName);
    if (layer === null) {
      hiddenWhy.noAnatomia++;
      continue;
    }
    if (outliers.has(m)) {
      hiddenWhy.recorteSinArreglo++;
      continue;
    }
    const hex = colorForMaterialMesh(matName, m.name) ?? base;
    kept.push({ mesh: m, layer, hex, tissue: tissueClassForMaterial(matName) });
  }
  rows.push({
    n:
      `   (apagadas por el pase de estilo: contenedor ${hiddenWhy.grupo}, ` +
      `no-anatomia ${hiddenWhy.noAnatomia}, interno distal ${hiddenWhy.distalInterno}, ` +
      `recorte ${hiddenWhy.recorteSinArreglo}; conservadas ${kept.length} de ${meshes.length})`,
    ms: 0,
    writes: '-',
    cat: 'X',
  });
}, 'RigModel 2041-2291');

const spikes: string[] = [];
stage('17c isCorruptedSpike (muestreo ~160 vertices por malla)', 'V', () => {
  const _v = new THREE.Vector3();
  const _c = new THREE.Vector3();
  for (const k of kept) {
    const pos = k.mesh.geometry.getAttribute('position');
    if (!pos || pos.count === 0) continue;
    const step = Math.max(1, Math.floor(pos.count / 160));
    _c.set(0, 0, 0);
    let n = 0;
    const ds: number[] = [];
    for (let i = 0; i < pos.count; i += step) {
      _v.fromBufferAttribute(pos, i);
      k.mesh.localToWorld(_v);
      _c.add(_v);
      n++;
    }
    if (n === 0) continue;
    _c.multiplyScalar(1 / n);
    for (let i = 0; i < pos.count; i += step) {
      _v.fromBufferAttribute(pos, i);
      k.mesh.localToWorld(_v);
      ds.push(_v.distanceTo(_c));
    }
    ds.sort((a, b) => a - b);
    // Mismo umbral que RigModel (SPIKE_RATIO 3.5, SPIKE_MAX_M 0.13).
    const med = ds[Math.floor(ds.length / 2)] || 1e-9;
    const max = ds[ds.length - 1] ?? 0;
    if (max / med >= 3.5 && max >= 0.13) spikes.push(k.mesh.name);
  }
  rows.push({
    n:
      `   (isCorruptedSpike apaga ${spikes.length} mallas de las ${kept.length} conservadas: ` +
      `${spikes.slice(0, 6).join(', ')})`,
    ms: 0,
    writes: '-',
    cat: 'X',
  });
}, 'RigModel 2174 / isCorruptedSpike 475');

stage('17d materiales nuevos + swap + dispose de los del GLB', 'V', () => {
  const byKey = new Map<string, THREE.MeshStandardMaterial>();
  for (const k of kept) {
    const key = `${k.hex}|${k.tissue}`;
    let mm = byKey.get(key);
    if (!mm) {
      mm = new THREE.MeshStandardMaterial({ color: k.hex, side: THREE.DoubleSide });
      byKey.set(key, mm);
    }
    const old = Array.isArray(k.mesh.material) ? k.mesh.material : [k.mesh.material];
    k.mesh.material = mm;
    old.forEach((o) => o && o.dispose());
  }
  rows.push({ n: `   (materiales compartidos creados: ${byKey.size})`, ms: 0, writes: '-', cat: 'X' });
}, 'RigModel 2291-2294');

stage('17e etiquetado userData (rigLayer + muscleLevel)', 'V', () => {
  for (const k of kept) {
    k.mesh.userData.rigLayer = k.layer;
    k.mesh.userData.rigDistalCap = false;
    if (k.layer === 'muscle') k.mesh.userData.muscleLevel = muscleDepthLevel(k.mesh.name);
  }
}, 'RigModel 2295-2300');

stage('17f blendKneeSkin (banda de la rodilla)', 'P', () => {
  for (const k of kept) {
    if (k.layer !== 'skin') continue;
    const c = centers.get(k.mesh)!;
    if (Math.abs(c.y - KNEE_Y) < KNEE_SKIN_REACH_M) blendKneeSkin(k.mesh, KNEE_Y);
  }
}, 'RigModel 2102');

stage('17g religados del brazo (rigidBindTo / dominantBoneName)', 'P', () => {
  for (const k of kept) {
    const c = centers.get(k.mesh)!;
    if (k.layer === 'skin') {
      if (dominantBoneName(k.mesh) === 'forearm_flex' && c.y > UPPER_ARM_Y)
        rigidBindTo(k.mesh, 'humerus_gh');
      continue;
    }
    if (k.layer !== 'muscle') continue;
    if (isUpperArmBelly(k.mesh.name)) rigidBindTo(k.mesh, 'humerus_gh');
    else dominantBoneName(k.mesh);
  }
}, 'RigModel 2214-2246');

stage('17h smoothSkinSpine (musculo vertebral)', 'P', () => {
  for (const k of kept) {
    if (k.layer !== 'muscle') continue;
    if (!dominantBoneName(k.mesh).startsWith('vert_')) continue;
    smoothSkinSpine(k.mesh, vertY);
  }
}, 'RigModel 2286-2289');

stage('18 reweightArmAboveElbow', 'P', () => {
  reweightArmAboveElbow(scene, { elbowY: ELBOW_Y, wristY: WRIST_Y, upperArmY: UPPER_ARM_Y });
}, 'RigModel 2313');

stage('19 hideOverlapDuplicates (O(n^2) sobre los candidatos)', 'V', () => {
  const DUP_EPS = 0.004;
  const cands = kept.map((k) => ({
    mesh: k.mesh,
    center: centers.get(k.mesh)!,
    vcount: k.mesh.geometry.getAttribute('position')?.count ?? 0,
    bone: dominantBoneName(k.mesh),
  }));
  let hidden = 0;
  for (let i = 0; i < cands.length; i++) {
    const a = cands[i];
    if (!a.mesh.visible || !a.bone) continue;
    for (let j = i + 1; j < cands.length; j++) {
      const b = cands[j];
      if (!b.mesh.visible || b.bone !== a.bone) continue;
      if (a.center.distanceTo(b.center) > DUP_EPS) continue;
      if (b.vcount <= a.vcount) b.mesh.visible = false;
      else a.mesh.visible = false;
      hidden++;
      if (!a.mesh.visible) break;
    }
  }
  let enDistal = 0;
  let enBrazo = 0;
  for (const c of cands) {
    if (c.mesh.visible) continue;
    if (inDistalRegion(c.center)) enDistal++;
    if (Math.abs(c.center.x) > 0.16) enBrazo++;
  }
  rows.push({
    n:
      `   (candidatos ${cands.length}, ocultados ${hidden}; de ellos ` +
      `${enDistal} en la region distal mano/pie y ${enBrazo} con |x| > 0,16 m)`,
    ms: 0,
    writes: '-',
    cat: 'X',
  });
}, 'RigModel 2316 / hideOverlapDuplicates 737');

stage('20 simetria del brazo (belongsTo x2 + structureKey + emparejado)', 'V', () => {
  interface Piece { mesh: THREE.Mesh; layer: AnatomyLayer; c: THREE.Vector3; verts: number }
  const bySide = new Map<string, { L: Piece[]; R: Piece[] }>();
  for (const side of ['R', 'L'] as Side[]) {
    const root = shoulderRoots.get(side);
    if (!root) continue;
    for (const m of meshes) {
      const sk = m as THREE.SkinnedMesh;
      if (!sk.isSkinnedMesh || !m.visible) continue;
      const layer = m.userData.rigLayer as AnatomyLayer | 'hidden' | undefined;
      if (!layer || layer === 'hidden' || layer === 'skin') continue;
      if (!belongsTo(sk, root)) continue;
      const key = structureKey(m.name);
      if (!key) continue;
      const e = bySide.get(key) ?? { L: [], R: [] };
      e[side].push({
        mesh: m,
        layer,
        c: meshWorldCenter(m),
        verts: m.geometry.getAttribute('position')?.count ?? 0,
      });
      bySide.set(key, e);
    }
  }
  for (const { L, R } of bySide.values()) {
    if (!L.length || !R.length) continue;
    for (const [mine, theirs] of [[L, R], [R, L]] as [Piece[], Piece[]][]) {
      const taken = new Set<Piece>();
      for (const p of mine) {
        const mirrored = p.c.clone().setX(-p.c.x);
        let best: Piece | null = null;
        let bestD = Infinity;
        for (const q of theirs) {
          if (taken.has(q) || q.layer !== p.layer) continue;
          const ratio = q.verts / Math.max(1, p.verts);
          if (ratio < 0.8 || ratio > 1.25) continue;
          const d = mirrored.distanceTo(q.c);
          if (d < bestD) { bestD = d; best = q; }
        }
        if (best && bestD <= 0.04) taken.add(best);
      }
    }
  }
}, 'RigModel 2333-2392');

stage('21 pase SIEMPRE (reconstruye layerMeshes: parseMeshName + lado geometrico)', 'V', () => {
  const list: unknown[] = [];
  for (const m of meshes) {
    const lyr = m.userData.rigLayer as AnatomyLayer | 'hidden' | undefined;
    if (lyr === undefined) continue;
    if (lyr === 'hidden') { m.visible = false; continue; }
    let lvl: number | undefined;
    if (lyr === 'muscle') lvl = m.userData.muscleLevel ?? muscleDepthLevel(m.name);
    let base: string | undefined;
    if (lyr === 'muscle' || lyr === 'connective') {
      const p = parseMeshName(m.name);
      base = p.base;
      meshWorldCenter(m); // dissectSideOfMesh
    }
    list.push({ mesh: m, layer: lyr, lvl, base });
  }
  rows.push({ n: `   (layerMeshes ${list.length})`, ms: 0, writes: '-', cat: 'X' });
}, 'RigModel 2399-2443');

// ---------------------------------------------------------------------------
// LA PRUEBA DE QUE LOS PASES DE PESO SON INVISIBLES EN REPOSO
// ---------------------------------------------------------------------------
//
// Afirmacion a verificar: repartir peso entre huesos NO mueve ni un vertice
// mientras ningun hueso haya girado, porque en la pose de ligado
// `boneMatrix_i * boneInverse_i` es la identidad para TODOS los huesos, y
// entonces la suma ponderada vale lo mismo cualesquiera que sean los pesos
// (solo hace falta que sumen 1).
//
// Se mide: con el esqueleto en reposo, el desplazamiento maximo entre el
// vertice LIGADO y el vertice PIELADO, sobre las mallas que los pases de peso
// reescribieron. Si sale ~0, los pases de peso se pueden retrasar sin que se vea
// nada hasta que llegue el primer movimiento.
{
  scene.updateMatrixWorld(true);
  const _v = new THREE.Vector3();
  const _skinned = new THREE.Vector3();
  const _tmp = new THREE.Vector3();
  const _off = new THREE.Matrix4();
  let worst = 0;
  let worstName = '';
  let checked = 0;
  let badSum = 0;
  for (const m of meshes) {
    const sk = m as THREE.SkinnedMesh;
    if (!sk.isSkinnedMesh || !sk.skeleton) continue;
    const pos = m.geometry.getAttribute('position');
    const si = m.geometry.getAttribute('skinIndex');
    const sw = m.geometry.getAttribute('skinWeight');
    if (!pos || !si || !sw) continue;
    checked++;
    const step = Math.max(1, Math.floor(pos.count / 40));
    for (let i = 0; i < pos.count; i += step) {
      _v.fromBufferAttribute(pos, i);
      // posicion ligada, en espacio de ligado
      const bind = _v.clone().applyMatrix4(sk.bindMatrix);
      _skinned.set(0, 0, 0);
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w === 0) continue;
        sum += w;
        const bi = si.getComponent(i, k);
        const bone = sk.skeleton.bones[bi];
        const inv = sk.skeleton.boneInverses[bi];
        if (!bone || !inv) continue;
        _off.multiplyMatrices(bone.matrixWorld, inv);
        _tmp.copy(bind).applyMatrix4(_off);
        _skinned.addScaledVector(_tmp, w);
      }
      if (Math.abs(sum - 1) > 1e-3) badSum++;
      const d = _skinned.distanceTo(bind);
      if (d > worst) { worst = d; worstName = m.name; }
    }
  }
  console.log('');
  console.log('DONDE ACTUA CADA PASE (caja envolvente en mundo de lo que reescribe)');
  for (const z of zones) {
    const box = new THREE.Box3();
    for (const m of z.meshes) {
      m.geometry.computeBoundingBox();
      box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld));
    }
    if (box.isEmpty()) continue;
    const names = z.meshes.slice(0, 2).map((q) => q.name).join(', ');
    console.log(
      `  [${z.cat}] ${z.pase.slice(0, 32).padEnd(32)} n=${String(z.meshes.length).padStart(4)} ` +
        `y ${box.min.y.toFixed(2)}..${box.max.y.toFixed(2)}  |x|max ${Math.max(Math.abs(box.min.x), Math.abs(box.max.x)).toFixed(2)}  ${names}`,
    );
  }
  console.log('');
  console.log('ARISTAS REALES DEL GRAFO: pares de pases que escriben LA MISMA malla');
  console.log('(sin malla compartida no hay dependencia de orden entre dos pases de peso)');
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = new Set(zones[i].meshes);
      let n = 0;
      for (const m of zones[j].meshes) if (a.has(m)) n++;
      if (n === 0) continue;
      console.log(
        `  ${zones[i].pase.slice(0, 30).padEnd(30)} <-> ${zones[j].pase.slice(0, 30).padEnd(30)} ${n} mallas`,
      );
    }
  }
  console.log('');
  console.log('VERIFICACION: ¿mueven algo los pesos EN REPOSO?');
  console.log(`  mallas con piel comprobadas ............ ${checked}`);
  console.log(`  desplazamiento MAXIMO ligado->pielado .. ${(worst * 1000).toFixed(4)} mm  (${worstName})`);
  console.log(`  vertices con pesos que no suman 1 ...... ${badSum}`);
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------
const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length));
console.log(`PARSE GLB ................................ ${parseMs.toFixed(0)} ms`);
console.log(`updateMatrixWorld ........................ ${matrixMs.toFixed(0)} ms`);
console.log('');
console.log(`${pad('PASE', 60)} ${pad('ms', 7)} ${pad('CAT', 4)} ESCRIBE`);
console.log('-'.repeat(120));
let total = 0;
const byCat: Record<Cat, number> = { V: 0, P: 0, X: 0 };
for (const r of rows) {
  if (r.ms === 0 && r.writes === '-' && r.n.startsWith('   (')) {
    console.log(r.n);
    continue;
  }
  total += r.ms;
  byCat[r.cat] += r.ms;
  console.log(`${pad(r.n, 60)} ${pad(r.ms.toFixed(0), 7)} ${pad(r.cat, 4)} ${r.writes}`);
}
console.log('-'.repeat(120));
console.log(`${pad('TOTAL pases (sin parse)', 60)} ${total.toFixed(0)} ms`);
console.log(`${pad('TOTAL con parse + matrices', 60)} ${(total + parseMs + matrixMs).toFixed(0)} ms`);
console.log('');
console.log('REPARTO');
console.log(`  V  se ve en reposo, NO se puede retrasar ....... ${byCat.V.toFixed(0)} ms`);
console.log(`  P  solo pesos, invisible hasta que algo gira ... ${byCat.P.toFixed(0)} ms`);
console.log(`  X  precomputo compartido ....................... ${byCat.X.toFixed(0)} ms`);
console.log('');
console.log(
  `  CAMINO CORTO (parse + matrices + V + X) ....... ` +
    `${(parseMs + matrixMs + byCat.V + byCat.X).toFixed(0)} ms`,
);
console.log(
  `  RETRASABLE (P) ................................ ${byCat.P.toFixed(0)} ms ` +
    `= ${((100 * byCat.P) / (total + parseMs + matrixMs)).toFixed(0)}% del total`,
);
console.log('');
console.log('Lectura: `position`/`skinWeight`/`skinIndex`/`index` = el pase cambia GEOMETRIA o');
console.log('PESOS, invisible en reposo y sólo visible al mover un hueso. `-` = el pase no');
console.log('escribe atributos (clasifica, mide, oculta o cambia material).');
