// PERFIL POR PASE DE LA PREPARACION DEL LABORATORIO.
//
// El primer fotograma util de /hombro/movimiento tarda ~10,3 s con cache
// caliente, y ~8,5 s de eso es el efecto de preparacion de
// src/components/movement/RigModel.tsx (lineas 1360-2450). Nadie habia medido
// QUE PASE se lleva esos segundos, asi que recortar cualquiera de ellos era
// apostar.
//
// Esto lo mide pase por pase, EN NODE y no en el navegador, por el motivo que
// ya documenta scripts/measure-rig-prepare.mts: el panel de vista previa corre
// como pagina de fondo cuando esta oculto y el mismo trabajo mide 2,8 s una vez
// y 7,8 s la siguiente. Node no estrangula temporizadores.
//
// COMO LO MIDE, y donde estan los limites de la medida:
//
//   - Los pases que son una funcion exportada de src/lib (inflateSkinShell,
//     relaxSkinSeams, trimForearmOutliers, reweightArmAboveElbow, ...) se
//     IMPORTAN y se cronometran de verdad. Es el mismo codigo que corre en el
//     navegador, sobre el mismo GLB.
//   - Los pases que viven dentro de RigModel.tsx y no se exportan
//     (repairMirroredMeshes, el recorrido grande de estilo+etiquetado, el
//     dedup de duplicados, la simetria de brazos, la lista final de capas) se
//     REPLICAN aqui linea por linea, con sus mismos ayudantes
//     (meshWorldCenter, isCorruptedSpike, smoothTwistForearm,
//     anchorOriginToHumerus, gradeScapulaToHumerus, hideOverlapDuplicates,
//     dissectSideOfMesh), copiados de RigModel.tsx. Si alguien cambia esos
//     ayudantes en RigModel y no aqui, esta tabla empieza a mentir: por eso
//     cada replica lleva la linea de la que viene.
//   - El ORDEN es el de RigModel, y eso no es cosmetico: los pases se pisan
//     (los de peso dependen de los anteriores, el recorte depende del
//     enderezado), asi que medirlos sueltos daria otra cifra.
//   - Lo que NO mide: la compilacion de shaders, la subida de buffers a la GPU
//     y el primer `render()`. Eso no existe en Node. Esta tabla es el reparto
//     del trabajo de CPU, que es la parte que RigModel hace y que se puede
//     mover o aplazar.
//
// Uso:
//   npx tsx --tsconfig tsconfig.scripts.json scripts/profile-rig-prepare.mts
//   npx tsx --tsconfig tsconfig.scripts.json scripts/profile-rig-prepare.mts --veces 2
//
// No modifica nada del repositorio ni del GLB: carga, mide, imprime y sale.

import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';

import { rigGlbPath } from './lib/rigPath.mts';
import { resolveArmatureName, type Side } from '../src/lib/boneMap.ts';
import {
  colorForMaterial,
  colorForMaterialMesh,
  layerForMaterial,
  materialIsSkin,
  tissueClassForMaterial,
  type AnatomyLayer,
  type TissueClass,
} from '../src/lib/materialColors.ts';
import { blendKneeSkin, kneeHeight, KNEE_SKIN_REACH_M } from '../src/lib/rigSkinRepair.ts';
import {
  ARM_COLUMN_X,
  FOREARM_CULLS,
  inArmBand,
  inDistalRegion,
  inWristCuff,
  trimForearmOutliers,
} from '../src/lib/rigLimbTrim.ts';
import {
  armHeights,
  dominantBoneName,
  isUpperArmBelly,
  reweightArmAboveElbow,
  rigidBindTo,
} from '../src/lib/rigArmRebind.ts';
import { bindClaviclesToShoulderGirdle } from '../src/lib/clavicleBinding.ts';
import { repairFaceWinding } from '../src/lib/faceWinding.ts';
import { bridgeShoulderSkin } from '../src/lib/shoulderSkinBridge.ts';
import { gradeShoulderMuscleBinding } from '../src/lib/shoulderMuscleBinding.ts';
import { relaxSkinSeams } from '../src/lib/skinSeamRelax.ts';
import { inflateSkinShell } from '../src/lib/skinShellInflate.ts';
import { unmangleForearmMeshes } from '../src/lib/rigForearmUnmangle.ts';
import { blendHipSkin } from '../src/lib/rigHipSkin.ts';
import { regradeAnkleCrossers } from '../src/lib/rigAnkleRebind.ts';
import {
  smoothNeckSkin,
  smoothSkinSpine,
  smoothSpineConnective,
  smoothTrunkSkin,
  vertebraHeights,
} from '../src/lib/rigSpineSkin.ts';
import { blendPelvicOrigins } from '../src/lib/rigPelvicOrigin.ts';
import { redistributeSkinRootWeight } from '../src/lib/rigSkinRootWeight.ts';
import { muscleDepthLevel, type MuscleDepthLevel } from '../src/lib/muscleDepth.ts';
import { parseMeshName, structureKey, type ParsedSide } from '../src/lib/parseMeshName.ts';

// ---------------------------------------------------------------------------
// Constantes y ayudantes COPIADOS de src/components/movement/RigModel.tsx.
// Cada uno lleva la linea de la que viene para que se pueda cotejar.
// ---------------------------------------------------------------------------

/** RigModel.tsx:232 */
const ATTACHMENT_PATCH = /muscle(ol|el)$/i;
/** RigModel.tsx:241 */
const ORIGIN_BELONGS_ON_SCAPULA = /^(teres_major|teres_minor)_muscleol$/i;
/** RigModel.tsx:250 */
const GRADE_SCAPULA_HUMERUS = /coracobrachialis|subscapularis|teres_major/i;
/** RigModel.tsx:395 */
const DUP_EPS = 0.004;
/** RigModel.tsx:464 */
const HIDE_SPIKES = true;
/** RigModel.tsx:465-466 */
const SPIKE_RATIO = 3.5;
const SPIKE_MAX_M = 0.13;
/** RigModel.tsx:434-435 */
const SIDE_LATERAL_M = 0.04;
const SIDE_MIDLINE_M = 0.005;
/** RigModel.tsx:607 */
const ELBOW_ANCHOR_BAND_M = 0.05;
/** RigModel.tsx:663-665 */
const GRADE_NEAR_M = 0.03;
const GRADE_FAR_M = 0.09;

const _tmpCenter = new THREE.Vector3();
/** RigModel.tsx:403 */
function meshWorldCenter(mesh: THREE.Mesh): THREE.Vector3 {
  const g = mesh.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere?.center ?? _tmpCenter.set(0, 0, 0);
  return c.clone().applyMatrix4(mesh.matrixWorld);
}

/** RigModel.tsx:435 */
function dissectSideOfMesh(mesh: THREE.Mesh, named: ParsedSide): ParsedSide {
  const x = meshWorldCenter(mesh).x;
  const ax = Math.abs(x);
  if (ax < SIDE_LATERAL_M && named !== 'center') return named;
  if (ax < SIDE_MIDLINE_M) return 'center';
  return x > 0 ? 'left' : 'right';
}

const _sv = new THREE.Vector3();
const _scentroid = new THREE.Vector3();
/** RigModel.tsx:475 */
function isCorruptedSpike(mesh: THREE.Mesh): boolean {
  const pos = mesh.geometry.getAttribute('position');
  if (!pos || pos.count < 8) return false;
  const step = Math.max(1, Math.floor(pos.count / 160));
  const pts: number[] = [];
  _scentroid.set(0, 0, 0);
  let n = 0;
  for (let i = 0; i < pos.count; i += step) {
    _sv.fromBufferAttribute(pos, i);
    mesh.localToWorld(_sv);
    _scentroid.add(_sv);
    n++;
  }
  if (n < 4) return false;
  _scentroid.multiplyScalar(1 / n);
  for (let i = 0; i < pos.count; i += step) {
    _sv.fromBufferAttribute(pos, i);
    mesh.localToWorld(_sv);
    pts.push(_sv.distanceTo(_scentroid));
  }
  pts.sort((a, b) => a - b);
  const median = pts[pts.length >> 1] || 1e-9;
  const max = pts[pts.length - 1] || 0;
  return max > SPIKE_MAX_M && max / median > SPIKE_RATIO;
}

const _vw = new THREE.Vector3();

/** RigModel.tsx:549 */
function smoothTwistForearm(
  mesh: THREE.Mesh,
  elbowY: number,
  wristY: number,
  twistBone?: THREE.Bone,
): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  const flexIdx = sk.skeleton.bones.findIndex(
    (b) => b.name.replace(/_\d+$/, '') === 'forearm_flex',
  );
  const rotIdx = sk.skeleton.bones.findIndex((b) => b.name.replace(/_\d+$/, '') === 'forearm_rot');
  if (flexIdx < 0 || rotIdx < 0) return false;
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!pos || !si || !sw) return false;
  const span = elbowY - wristY;
  if (span <= 1e-4) return false;
  const twistIdx = twistBone ? sk.skeleton.bones.indexOf(twistBone) : -1;
  const ladder = twistIdx >= 0 ? [flexIdx, twistIdx, rotIdx] : [flexIdx, rotIdx];
  const steps = ladder.length - 1;
  for (let i = 0; i < pos.count; i++) {
    _vw.fromBufferAttribute(pos, i);
    mesh.localToWorld(_vw);
    let t = (elbowY - _vw.y) / span;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
    const scaled = t * steps;
    let k = Math.floor(scaled);
    if (k >= steps) k = steps - 1;
    const f = scaled - k;
    si.setXYZW(i, ladder[k], ladder[k + 1], 0, 0);
    sw.setXYZW(i, 1 - f, f, 0, 0);
  }
  si.needsUpdate = true;
  sw.needsUpdate = true;
  return true;
}

/** RigModel.tsx:608 */
function anchorOriginToHumerus(mesh: THREE.Mesh, elbowY: number): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  const bn = (b: THREE.Bone) => b.name.replace(/_\d+$/, '');
  const humIdx = sk.skeleton.bones.findIndex((b) => bn(b) === 'humerus_gh');
  const flexIdx = sk.skeleton.bones.findIndex((b) => bn(b) === 'forearm_flex');
  if (humIdx < 0 || flexIdx < 0) return false;
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!pos || !si || !sw) return false;
  let touched = 0;
  for (let i = 0; i < pos.count; i++) {
    _vw.fromBufferAttribute(pos, i);
    mesh.localToWorld(_vw);
    if (_vw.y <= elbowY) continue;
    let t = (_vw.y - elbowY) / ELBOW_ANCHOR_BAND_M;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
    si.setXYZW(i, humIdx, flexIdx, 0, 0);
    sw.setXYZW(i, t, 1 - t, 0, 0);
    touched++;
  }
  if (touched === 0) return false;
  si.needsUpdate = true;
  sw.needsUpdate = true;
  return true;
}

/** RigModel.tsx:666 */
function gradeScapulaToHumerus(
  mesh: THREE.Mesh,
  shaftTop: THREE.Vector3,
  shaftBottom: THREE.Vector3,
): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  const bn = (b: THREE.Bone) => b.name.replace(/_\d+$/, '');
  const sIdx = sk.skeleton.bones.findIndex((b) => bn(b) === 'scapula');
  const hIdx = sk.skeleton.bones.findIndex((b) => bn(b) === 'humerus_gh');
  if (sIdx < 0 || hIdx < 0) return false;
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!pos || !si || !sw) return false;
  const shaft = new THREE.Vector3().subVectors(shaftBottom, shaftTop);
  const shaftLenSq = shaft.lengthSq();
  if (shaftLenSq <= 1e-6) return false;
  const span = GRADE_FAR_M - GRADE_NEAR_M;
  const closest = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    _vw.fromBufferAttribute(pos, i);
    mesh.localToWorld(_vw);
    let u = _vw.clone().sub(shaftTop).dot(shaft) / shaftLenSq;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    closest.copy(shaftTop).addScaledVector(shaft, u);
    const d = _vw.distanceTo(closest);
    let t = (GRADE_FAR_M - d) / span;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
    si.setXYZW(i, sIdx, hIdx, 0, 0);
    sw.setXYZW(i, 1 - t, t, 0, 0);
  }
  si.needsUpdate = true;
  sw.needsUpdate = true;
  return true;
}

interface DupCandidate {
  mesh: THREE.Mesh;
  center: THREE.Vector3;
  vcount: number;
  bone: string;
}

/** RigModel.tsx:737 */
function hideOverlapDuplicates(candidates: DupCandidate[]): number {
  let hidden = 0;
  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i];
    if (!a.mesh.visible || !a.bone) continue;
    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j];
      if (!b.mesh.visible || b.bone !== a.bone) continue;
      if (a.center.distanceTo(b.center) > DUP_EPS) continue;
      if (b.vcount <= a.vcount) b.mesh.visible = false;
      else a.mesh.visible = false;
      hidden++;
      if (!a.mesh.visible) break;
    }
  }
  return hidden;
}

// ---------------------------------------------------------------------------
// Tabla
// ---------------------------------------------------------------------------

/**
 * Hace falta su resultado para que el cuerpo se VEA presentable en el primer
 * fotograma?
 *   'si'    -> se ve en reposo (color, forma, que no haya agujeros ni moteado).
 *   'no'    -> solo escribe skinIndex/skinWeight, renormalizados a 1. En reposo
 *              toda matriz de hueso es la identidad, asi que el vertice sale en
 *              su sitio de ligado pese el peso como pese: invisible hasta que
 *              se manda el primer movimiento. Lo COMPRUEBA la seccion final.
 *   'mixto' -> parte se ve y parte no.
 */
type Visible = 'si' | 'no' | 'mixto';

interface Row {
  n: string;
  nombre: string;
  lineas: string;
  ms: number;
  mallas: string;
  verts: string;
  ver: Visible;
  nota: string;
}

const rows: Row[] = [];
let rowSeq = 0;

function pass<T>(
  nombre: string,
  lineas: string,
  ver: Visible,
  nota: string,
  fn: () => T,
  cuenta?: (r: T) => { mallas: string; verts: string },
): T {
  const t = performance.now();
  const r = fn();
  const ms = performance.now() - t;
  const c = cuenta ? cuenta(r) : { mallas: '-', verts: '-' };
  rows.push({
    n: String(++rowSeq),
    nombre,
    lineas,
    ms,
    mallas: c.mallas,
    verts: c.verts,
    ver,
    nota,
  });
  return r;
}

const n0 = (v: number) => v.toLocaleString('es-ES');

// ---------------------------------------------------------------------------
// Una corrida completa sobre una escena recien parseada.
// ---------------------------------------------------------------------------

const glbPath = rigGlbPath();
const buf = readFileSync(glbPath);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

interface SubTimer {
  ms: number;
  mallas: number;
  verts: number;
}
const subs = new Map<string, SubTimer>();
function sub<T>(key: string, verts: number, fn: () => T): T {
  const t = performance.now();
  const r = fn();
  const s = subs.get(key) ?? { ms: 0, mallas: 0, verts: 0 };
  s.ms += performance.now() - t;
  s.mallas += 1;
  s.verts += verts;
  subs.set(key, s);
  return r;
}

interface Corrida {
  parseMs: number;
  prepareMs: number;
  aplazableMs: number;
  total: number;
}

async function corrida(): Promise<Corrida> {
  rows.length = 0;
  rowSeq = 0;
  subs.clear();

  const ld = new GLTFLoader();
  ld.setMeshoptDecoder(MeshoptDecoder);
  const tParse = performance.now();
  const gl = await new Promise<{ scene: THREE.Group }>((res, rej) =>
    ld.parse(ab, '', res as never, rej),
  );
  const parseMs = performance.now() - tParse;
  const scene = gl.scene;

  let meshCount = 0;
  let vertCount = 0;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    meshCount++;
    vertCount += m.geometry.getAttribute('position')?.count ?? 0;
  });

  const tPrep = performance.now();

  // === 1. RigModel.tsx:1364 ================================================
  pass(
    'updateMatrixWorld inicial',
    '1364',
    'si',
    'SI: sin matrices de mundo no hay nada que colocar',
    () => scene.updateMatrixWorld(true),
    () => ({ mallas: n0(meshCount), verts: '-' }),
  );

  // === 2. Predicados + materiales (RigModel.tsx:1384-1557) ==================
  const _armatureRootCache = new Map<string, THREE.Object3D | null>();
  const shoulderRootFor = (side: Side): THREE.Object3D | null => {
    const key = `Shoulder_Armature|${side}`;
    let r = _armatureRootCache.get(key);
    if (r === undefined) {
      r = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side)) ?? null;
      _armatureRootCache.set(key, r);
    }
    return r;
  };
  const _descendantIds = new Map<number, Set<number>>();
  const belongsTo = (mesh: THREE.Object3D, root: THREE.Object3D): boolean => {
    const sk = mesh as THREE.SkinnedMesh;
    if (!sk.isSkinnedMesh || !sk.skeleton) return false;
    let ids = _descendantIds.get(root.id);
    if (!ids) {
      ids = new Set<number>();
      root.traverse((o) => ids!.add(o.id));
      _descendantIds.set(root.id, ids);
    }
    return sk.skeleton.bones.some((b) => ids!.has(b.id));
  };

  const TISSUE_PBR: Record<TissueClass, { roughness: number; metalness: number; env: number }> = {
    bone: { roughness: 0.42, metalness: 0.0, env: 0.7 },
    muscle: { roughness: 0.66, metalness: 0.0, env: 0.32 },
    connective: { roughness: 0.3, metalness: 0.0, env: 0.55 },
    other: { roughness: 0.6, metalness: 0.0, env: 0.35 },
  };
  const matByKey = new Map<string, THREE.MeshStandardMaterial>();
  const flatMat = (hex: number, tissue: TissueClass): THREE.MeshStandardMaterial => {
    const key = `${hex}|${tissue}`;
    let m = matByKey.get(key);
    if (!m) {
      const pbr = TISSUE_PBR[tissue];
      m = new THREE.MeshStandardMaterial({
        color: hex,
        roughness: pbr.roughness,
        metalness: pbr.metalness,
        envMapIntensity: pbr.env,
        side: THREE.DoubleSide,
      });
      matByKey.set(key, m);
    }
    return m;
  };
  let skinMat!: THREE.MeshPhysicalMaterial;
  let bodySkinMat!: THREE.MeshPhysicalMaterial;
  pass(
    'materiales base (piel + cuerpo fantasma)',
    '1418-1557',
    'si',
    'SI: es el estilo por tejido, sin el sale el GLB en blanco',
    () => {
      skinMat = new THREE.MeshPhysicalMaterial({
        color: 0xd7a88f,
        roughness: 0.6,
        metalness: 0.0,
        envMapIntensity: 0.42,
        clearcoat: 0.35,
        clearcoatRoughness: 0.6,
        sheen: 0.6,
        sheenRoughness: 0.75,
        sheenColor: new THREE.Color(0xffdcc6),
        emissive: new THREE.Color(0x2a3348),
        emissiveIntensity: 0.0,
        side: THREE.DoubleSide,
      });
      bodySkinMat = skinMat.clone();
      bodySkinMat.transparent = true;
      bodySkinMat.depthWrite = true;
      bodySkinMat.userData.uGhost = { value: 0 };
    },
    () => ({ mallas: '-', verts: '-' }),
  );
  const swap = (mesh: THREE.Mesh, next: THREE.Material): void => {
    const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = next;
    old.forEach((m) => m && m.dispose());
  };

  // === 3. Precomputo de huesos (RigModel.tsx:1570-1629) =====================
  const spineVerts: { name: string; pos: THREE.Vector3 }[] = [];
  let vertYByName!: Map<string, number>;
  let ELBOW_Y = 0;
  let WRIST_Y = 0;
  let UPPER_ARM_Y = 0;
  let KNEE_Y = 0;
  const forearmTwist = new Map<Side, THREE.Bone>();
  pass(
    'precomputo: vertebras, codo, muneca, rodilla, hueso de twist',
    '1570-1629',
    'si',
    'SI: son los umbrales que usan los demas pases',
    () => {
      const spineRoot = scene.getObjectByName('Spine_Armature');
      if (spineRoot) {
        spineRoot.traverse((o) => {
          const bn = o.name.replace(/_\d+$/, '');
          if (/^vert_/.test(bn) && !spineVerts.some((v) => v.name === bn)) {
            spineVerts.push({ name: bn, pos: o.getWorldPosition(new THREE.Vector3()) });
          }
        });
      }
      vertYByName = vertebraHeights(scene);
      const h = armHeights(scene);
      ELBOW_Y = h.elbowY;
      WRIST_Y = h.wristY;
      UPPER_ARM_Y = h.upperArmY;
      KNEE_Y = kneeHeight(scene);
      for (const side of ['R', 'L'] as Side[]) {
        const sr = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side));
        if (!sr) continue;
        let flexB: THREE.Object3D | null = null;
        let rotB: THREE.Object3D | null = null;
        sr.traverse((o) => {
          const bn = o.name.replace(/_\d+$/, '');
          if (bn === 'forearm_flex' && !flexB) flexB = o;
          else if (bn === 'forearm_rot' && !rotB) rotB = o;
        });
        if (!flexB || !rotB) continue;
        const twist = new THREE.Bone();
        twist.name = `forearm_twist_${side}`;
        twist.position.copy((rotB as THREE.Object3D).position);
        twist.quaternion.copy((rotB as THREE.Object3D).quaternion);
        twist.scale.copy((rotB as THREE.Object3D).scale);
        twist.userData.restQuat = twist.quaternion.clone();
        (flexB as THREE.Object3D).add(twist);
        forearmTwist.set(side, twist);
      }
      scene.updateMatrixWorld(true);
    },
    () => ({ mallas: '-', verts: '-' }),
  );

  const splicedSkeletons = new Set<THREE.Skeleton>();
  const spliceTwist = (mesh: THREE.SkinnedMesh, twist: THREE.Bone): void => {
    const sk = mesh.skeleton;
    if (!sk || sk.bones.includes(twist)) return;
    if (splicedSkeletons.has(sk) && sk.bones.includes(twist)) return;
    sk.bones.push(twist);
    sk.boneInverses.push(new THREE.Matrix4().copy(twist.matrixWorld).invert());
    sk.init();
    splicedSkeletons.add(sk);
  };
  const twistFor = (mesh: THREE.Mesh): THREE.Bone | undefined => {
    const sk = mesh as THREE.SkinnedMesh;
    if (!sk.isSkinnedMesh || !sk.skeleton) return undefined;
    for (const [side, twist] of forearmTwist) {
      const root = shoulderRootFor(side);
      if (!root) continue;
      if (!belongsTo(sk, root)) continue;
      spliceTwist(sk, twist);
      return twist;
    }
    return undefined;
  };
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

  // === 4. repairMirroredMeshes (RigModel.tsx:1703-1795) =====================
  // Replica. Toca TODA la escena: computeBoundingSphere + computeBoundingBox por
  // malla, y reconstruye las 4 mallas espejadas que salen colapsadas.
  const repairMirroredMeshes = (): { repaired: number; scanned: number } => {
    interface Twin {
      mesh: THREE.SkinnedMesh;
      dims: THREE.Vector3;
      vol: number;
      x: number;
    }
    let scanned = 0;
    const groups = new Map<string, Twin[]>();
    scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isMesh || !m.isSkinnedMesh || !m.geometry) return;
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (!layerForMaterial((mat as THREE.Material | undefined)?.name)) return;
      scanned++;
      const g = m.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
      if (Math.abs(c.x) < 0.04) return;
      g.computeBoundingBox();
      const dims = g.boundingBox!.getSize(new THREE.Vector3());
      const key = `${m.name.replace(/_\d+$/, '')}|${g.getAttribute('position').count}`;
      const entry = { mesh: m, dims, vol: dims.x * dims.y * dims.z, x: c.x };
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    });
    const longAxis = (d: THREE.Vector3) => (d.x >= d.y && d.x >= d.z ? 'x' : d.y >= d.z ? 'y' : 'z');
    const mirror = new THREE.Matrix4().makeScale(-1, 1, 1);
    let repaired = 0;
    for (const list of groups.values()) {
      if (list.length !== 2) continue;
      const [a, b] = list;
      if (a.x * b.x > 0) continue;
      if (longAxis(a.dims) === longAxis(b.dims)) continue;
      const bad = a.vol < b.vol ? a : b;
      const good = a.vol < b.vol ? b : a;
      if (bad.vol > good.vol * 0.5) continue;
      const badBones = bad.mesh.skeleton.bones.map((x) => x.name.replace(/_\d+$/, ''));
      const goodBones = good.mesh.skeleton.bones.map((x) => x.name.replace(/_\d+$/, ''));
      const remap = goodBones.map((n) => badBones.indexOf(n));
      if (remap.some((i) => i < 0)) continue;
      const toBadLocal = new THREE.Matrix4()
        .copy(bad.mesh.matrixWorld)
        .invert()
        .multiply(mirror)
        .multiply(good.mesh.matrixWorld);
      const src = good.mesh.geometry;
      const dst = src.clone();
      dst.applyMatrix4(toBadLocal);
      const idx = dst.getIndex();
      if (idx) {
        const arr = idx.array as Uint16Array | Uint32Array;
        for (let i = 0; i + 2 < arr.length; i += 3) {
          const t = arr[i + 1];
          arr[i + 1] = arr[i + 2];
          arr[i + 2] = t;
        }
        idx.needsUpdate = true;
      }
      dst.deleteAttribute('normal');
      dst.computeVertexNormals();
      const si = dst.getAttribute('skinIndex');
      if (si) {
        for (let i = 0; i < si.count; i++)
          for (let k = 0; k < 4; k++) {
            const from = si.getComponent(i, k);
            si.setComponent(i, k, remap[from] ?? 0);
          }
        si.needsUpdate = true;
      }
      dst.computeBoundingBox();
      dst.computeBoundingSphere();
      bad.mesh.geometry.dispose();
      bad.mesh.geometry = dst;
      repaired++;
    }
    return { repaired, scanned };
  };
  pass(
    'repairMirroredMeshes (bbox de todo + rehacer 4 espejadas)',
    '1703-1795',
    'si',
    'SI: sin esto 4 musculos del antebrazo derecho salen colapsados',
    repairMirroredMeshes,
    (r) => ({ mallas: `${n0(r.scanned)} leidas / ${r.repaired} rehechas`, verts: '-' }),
  );

  // === 5. unmangleForearmMeshes (1804) =====================================
  pass(
    'unmangleForearmMeshes (endereza el antebrazo)',
    '1804',
    'si',
    'SI: si no, el cuarto distal del antebrazo sale hueco',
    () => unmangleForearmMeshes(scene),
    (r) => ({ mallas: `${r.meshes}`, verts: '-' }),
  );

  // === 6. inflateSkinShell (1826) =========================================
  pass(
    'inflateSkinShell (engorda la piel 2 mm)',
    '1826',
    'si',
    'SI: quita el moteado rosa que ya se ve en reposo',
    () => inflateSkinShell(scene),
    (r) => ({ mallas: n0(r.meshes), verts: n0(r.vertices) }),
  );

  // === 7. repairFaceWinding (1835) ========================================
  pass(
    'repairFaceWinding (vuelta de cara de las espejadas)',
    '1835',
    'si',
    'SI: sin esto una mano y un pie salen marron oscuro',
    () => repairFaceWinding(scene),
    (r) => ({ mallas: `${r.flipped} volteadas / ${n0(r.left)} dejadas`, verts: '-' }),
  );

  // === 8..17 PASES DE PESO ================================================
  pass(
    'bindClaviclesToShoulderGirdle',
    '1848',
    'no',
    'NO en reposo: solo se nota al MOVER el hombro',
    () => bindClaviclesToShoulderGirdle(scene),
    (r) => ({ mallas: `${r.bound.length}`, verts: '-' }),
  );
  pass(
    'bridgeShoulderSkin',
    '1852',
    'no',
    'NO en reposo: solo se nota al MOVER el brazo adelante',
    () => bridgeShoulderSkin(scene),
    (r) => ({ mallas: `${r.bridged.length}`, verts: '-' }),
  );
  pass(
    'gradeShoulderMuscleBinding',
    '1858',
    'no',
    'NO en reposo: solo se nota al MOVER el hombro',
    () => gradeShoulderMuscleBinding(scene),
    (r) => ({ mallas: `${r.graded.length}`, verts: '-' }),
  );
  const layerOf = (mesh: THREE.Mesh): AnatomyLayer | null => {
    const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    return layerForMaterial((first as THREE.Material | undefined)?.name ?? null);
  };
  pass(
    'blendHipSkin',
    '1869',
    'no',
    'NO en reposo: solo se nota al FLEXIONAR la cadera',
    () => blendHipSkin(scene, (m) => (layerOf(m) === 'skin' ? 'skin' : 'other')),
    (r) => ({ mallas: `${r.meshes}`, verts: '-' }),
  );
  pass(
    'regradeAnkleCrossers',
    '1882',
    'no',
    'NO en reposo: solo se nota al MOVER el tobillo',
    () =>
      regradeAnkleCrossers(scene, (m) => {
        const l = layerOf(m);
        return l === 'muscle' || l === 'connective' ? 'soft' : 'other';
      }),
    (r) => ({ mallas: `${r.graded.length}`, verts: '-' }),
  );
  pass(
    'smoothSpineConnective',
    '1896',
    'no',
    'NO en reposo: solo se nota al MOVER el raquis',
    () =>
      smoothSpineConnective(scene, vertYByName, (m) =>
        layerOf(m) === 'connective' ? 'connective' : 'other',
      ),
    (r) => ({ mallas: `${r.meshes}`, verts: '-' }),
  );
  pass(
    'smoothNeckSkin',
    '1903',
    'no',
    'NO en reposo: solo se nota en la flexion cervical',
    () => smoothNeckSkin(scene, vertYByName, (m) => (layerOf(m) === 'skin' ? 'skin' : 'other')),
    (r) => ({ mallas: `${r.meshes}`, verts: '-' }),
  );
  pass(
    'smoothTrunkSkin',
    '1916',
    'no',
    'NO en reposo: solo se nota en la flexion lumbar',
    () => smoothTrunkSkin(scene, vertYByName, (m) => (layerOf(m) === 'skin' ? 'skin' : 'other')),
    (r) => ({ mallas: `${r.meshes}`, verts: '-' }),
  );
  pass(
    'blendPelvicOrigins',
    '1926',
    'no',
    'NO en reposo: solo se nota al FLEXIONAR la cadera',
    () =>
      blendPelvicOrigins(scene, (m) => {
        const l = layerOf(m);
        return l === 'muscle' ? 'muscle' : l === 'connective' ? 'connective' : 'other';
      }),
    (r) => ({ mallas: `${r.meshes}`, verts: n0(r.vertices) }),
  );
  pass(
    'redistributeSkinRootWeight',
    '1936',
    'no',
    'NO en reposo: solo se nota al FLEXIONAR la cadera',
    () =>
      redistributeSkinRootWeight(scene, (m) => {
        const l = layerOf(m);
        return l === 'skin' || l === 'muscle' || l === 'connective' ? l : 'other';
      }),
    (r) => ({ mallas: `${r.meshes}`, verts: n0(r.vertices) }),
  );
  pass(
    'relaxSkinSeams',
    '1943',
    'no',
    'NO en reposo: suelda costuras que solo se abren al mover',
    () => relaxSkinSeams(scene),
    (r) => ({
      mallas: `${r.meshes} (${n0(r.welds)} soldaduras)`,
      verts: '-',
    }),
  );

  // === 18. trimForearmOutliers (1969) =====================================
  const limbOutliers = pass(
    'trimForearmOutliers (recorte medido del antebrazo)',
    '1969',
    'mixto',
    'SI en parte: recorta triangulos que SE VEN fuera del miembro',
    () => trimForearmOutliers(scene, { elbowY: ELBOW_Y, wristY: WRIST_Y, upperArmY: UPPER_ARM_Y }),
    (r) => ({ mallas: `${r.size} sin arreglo`, verts: '-' }),
  );

  // === 19. latsGeoms + humeralShaft (1971-1992) ============================
  const latsGeoms = new Map<string, number>();
  const humeralShaft = new Map<Side, [THREE.Vector3, THREE.Vector3]>();
  pass(
    'indices auxiliares (geometrias del dorsal + eje humeral)',
    '1971-1992',
    'si',
    'SI: los usa el recorrido grande',
    () => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && /latissimus/i.test(m.name)) {
          latsGeoms.set(m.geometry.uuid, (latsGeoms.get(m.geometry.uuid) ?? 0) + 1);
        }
      });
      for (const side of ['R', 'L'] as Side[]) {
        const sr = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side));
        let head: THREE.Vector3 | null = null;
        let elbow: THREE.Vector3 | null = null;
        sr?.traverse((o) => {
          const bn = o.name.replace(/_\d+$/, '');
          if (bn === 'humerus_gh' && !head) head = o.getWorldPosition(new THREE.Vector3());
          else if (bn === 'forearm_flex' && !elbow) elbow = o.getWorldPosition(new THREE.Vector3());
        });
        if (head && elbow) humeralShaft.set(side, [head, elbow]);
      }
    },
    () => ({ mallas: '-', verts: '-' }),
  );

  const unilateralizeLats = (mesh: THREE.Mesh): void => {
    const sk = mesh as THREE.SkinnedMesh;
    if (!sk.isSkinnedMesh || !sk.skeleton) return;
    const helperX = new Map<number, number>();
    sk.skeleton.bones.forEach((b, i) => {
      if (/^latshum_[lr]$/.test(b.name.replace(/_\d+$/, ''))) {
        helperX.set(i, b.getWorldPosition(new THREE.Vector3()).x);
      }
    });
    if (helperX.size < 2) return;
    const meshX = meshWorldCenter(mesh).x;
    const drop = new Set<number>();
    for (const [i, x] of helperX) if (x * meshX < 0) drop.add(i);
    if (drop.size === 0) return;
    if ((latsGeoms.get(mesh.geometry.uuid) ?? 0) > 1) mesh.geometry = mesh.geometry.clone();
    const si = mesh.geometry.getAttribute('skinIndex');
    const sw = mesh.geometry.getAttribute('skinWeight');
    if (!si || !sw) return;
    for (let v = 0; v < si.count; v++) {
      const idx = [si.getX(v), si.getY(v), si.getZ(v), si.getW(v)];
      const w = [sw.getX(v), sw.getY(v), sw.getZ(v), sw.getW(v)];
      let sum = 0;
      let changed = false;
      for (let k = 0; k < 4; k++) {
        if (drop.has(idx[k]) && w[k] > 0) {
          w[k] = 0;
          changed = true;
        }
        sum += w[k];
      }
      if (!changed) continue;
      if (sum <= 1e-6) continue;
      sw.setXYZW(v, w[0] / sum, w[1] / sum, w[2] / sum, w[3] / sum);
    }
    sw.needsUpdate = true;
  };

  // === 20. EL RECORRIDO GRANDE (2041-2307) =================================
  const dupCandidates: DupCandidate[] = [];
  let seen = 0;
  let hiddenEarly = 0;
  const bigPass = pass(
    'RECORRIDO GRANDE: estilo + etiquetado + religados por malla',
    '2041-2307',
    'mixto',
    'MEZCLA: el estilo si, los religados por malla no (ver desglose)',
    () => {
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        seen++;
        const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const matName = first?.name ?? '';
        const base = colorForMaterial(matName);
        const isGroupContainer =
          /g0\d\d$/.test(mesh.name) || /_system/i.test(mesh.name) || /^General[_ ]terms$/i.test(mesh.name);
        if (base === null || isGroupContainer) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          hiddenEarly++;
          return;
        }
        const vcount = mesh.geometry.getAttribute('position')?.count ?? 0;
        const center = sub('meshWorldCenter (esfera envolvente)', vcount, () =>
          meshWorldCenter(mesh),
        );
        if (inDistalRegion(center)) {
          if (materialIsSkin(matName)) {
            sub('swap material (mano/pie)', vcount, () => swap(mesh, skinMat));
            mesh.userData.rigLayer = 'skin';
            mesh.userData.rigDistalCap = true;
          } else {
            mesh.visible = false;
            mesh.userData.rigLayer = 'hidden';
          }
          return;
        }
        const layer = layerForMaterial(matName);
        if (layer === null) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        if (layer === 'skin') {
          if (dominantBoneName(mesh) === 'forearm_flex') {
            if (center.y > UPPER_ARM_Y) sub('rigidBindTo (piel del brazo)', vcount, () => rigidBindTo(mesh, 'humerus_gh'));
            else if (center.y < ELBOW_Y)
              sub('smoothTwistForearm (piel)', vcount, () =>
                smoothTwistForearm(mesh, ELBOW_Y, WRIST_Y, twistFor(mesh)),
              );
          } else if (Math.abs(center.y - KNEE_Y) < KNEE_SKIN_REACH_M) {
            sub('blendKneeSkin', vcount, () => blendKneeSkin(mesh, KNEE_Y));
          }
          sub('swap material (piel del cuerpo)', vcount, () => swap(mesh, bodySkinMat));
          mesh.userData.rigLayer = 'skin';
          mesh.userData.rigDistalCap = false;
          return;
        }
        if (limbOutliers.has(mesh)) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        if (FOREARM_CULLS && layer === 'connective' && inArmBand(center)) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        if (FOREARM_CULLS && layer === 'muscle' && inWristCuff(center)) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        if (
          FOREARM_CULLS &&
          layer === 'muscle' &&
          inArmBand(center) &&
          /digitorum|digiti minimi|indicis|pollicis|palmaris/i.test(mesh.name)
        ) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        if (HIDE_SPIKES && sub('isCorruptedSpike (muestreo 160 vert)', vcount, () => isCorruptedSpike(mesh))) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        if (layer === 'muscle') {
          const ln = mesh.name.toLowerCase().replace(/[._\s]+/g, ' ');
          if (ln.includes('latissimus')) sub('unilateralizeLats', vcount, () => unilateralizeLats(mesh));
          const bare = mesh.name.replace(/_\d+$/, '');
          if (ORIGIN_BELONGS_ON_SCAPULA.test(bare)) {
            sub('rigidBindTo (origen en escapula)', vcount, () => rigidBindTo(mesh, 'scapula'));
          } else if (GRADE_SCAPULA_HUMERUS.test(mesh.name) && !ATTACHMENT_PATCH.test(bare)) {
            const shaft = humeralShaft.get(center.x >= 0 ? 'R' : 'L');
            if (shaft)
              sub('gradeScapulaToHumerus', vcount, () =>
                gradeScapulaToHumerus(mesh, shaft[0], shaft[1]),
              );
          }
          const isArmBelly = isUpperArmBelly(mesh.name);
          if (isArmBelly) {
            const ok = sub('rigidBindTo (vientre del brazo)', vcount, () =>
              rigidBindTo(mesh, 'humerus_gh'),
            );
            if (!ok) {
              mesh.visible = false;
              mesh.userData.rigLayer = 'hidden';
              return;
            }
          } else if (center.y < ELBOW_Y && center.y > WRIST_Y) {
            const dom = dominantBoneName(mesh);
            if (dom === 'forearm_flex' || dom === 'forearm_rot' || dom === 'hand_flex') {
              sub('smoothTwistForearm (musculo)', vcount, () =>
                smoothTwistForearm(mesh, ELBOW_Y, WRIST_Y, twistFor(mesh)),
              );
            }
          } else if (center.y >= ELBOW_Y && dominantBoneName(mesh) === 'forearm_rot') {
            sub('rigidBindTo (tendon extensor comun)', vcount, () =>
              rigidBindTo(mesh, 'forearm_flex'),
            );
          }
        }
        if (
          (layer === 'muscle' || layer === 'connective') &&
          Math.abs(center.x) > ARM_COLUMN_X &&
          center.y < ELBOW_Y &&
          center.y > WRIST_Y
        ) {
          sub('anchorOriginToHumerus', vcount, () => anchorOriginToHumerus(mesh, ELBOW_Y));
        }
        const dom = dominantBoneName(mesh);
        let effBone = dom;
        if (layer === 'muscle' && dom.startsWith('vert_')) {
          const ok = sub('smoothSkinSpine (reparto por vertebra)', vcount, () =>
            smoothSkinSpine(mesh, vertYByName),
          );
          if (ok) effBone = nearestVert(center) ?? dom;
        }
        const hex = colorForMaterialMesh(matName, mesh.name) ?? base;
        const tissue = tissueClassForMaterial(matName);
        sub('swap material (musculo/hueso/conectivo)', vcount, () => swap(mesh, flatMat(hex, tissue)));
        mesh.userData.rigLayer = layer;
        mesh.userData.rigDistalCap = false;
        if (layer === 'muscle') {
          mesh.userData.muscleLevel = sub('muscleDepthLevel', vcount, () =>
            muscleDepthLevel(mesh.name),
          );
        }
        dupCandidates.push({ mesh, center, vcount, bone: effBone });
      });
      return { seen, hiddenEarly, dup: dupCandidates.length };
    },
    (r) => ({ mallas: n0(r.seen), verts: n0(vertCount) }),
  );

  // === 21. reweightArmAboveElbow (2313) ===================================
  pass(
    'reweightArmAboveElbow (reparto por vertice del brazo)',
    '2313',
    'no',
    'NO en reposo: solo se nota al DOBLAR el codo',
    () => reweightArmAboveElbow(scene, { elbowY: ELBOW_Y, wristY: WRIST_Y, upperArmY: UPPER_ARM_Y }),
    (r) => ({ mallas: `${r.meshes}`, verts: n0(r.vertices) }),
  );

  // === 22. hideOverlapDuplicates (2316-2318) ==============================
  pass(
    'hideOverlapDuplicates (dedup O(n2) de solapados)',
    '2316-2318',
    'si',
    'SI: sin esto los huesos duplicados hacen moteado al pelearse en Z',
    () => {
      const hidden = hideOverlapDuplicates(dupCandidates);
      for (const c of dupCandidates) if (!c.mesh.visible) c.mesh.userData.rigLayer = 'hidden';
      return hidden;
    },
    (r) => ({ mallas: `${n0(dupCandidates.length)} candidatas / ${r} ocultadas`, verts: '-' }),
  );

  // === 23. simetria de brazos (2334-2392) =================================
  pass(
    'simetria de brazos (2 recorridos + emparejado geometrico)',
    '2334-2392',
    'si',
    'SI: lo que oculta se VE (una sabana palida en una muneca y no en la otra)',
    () => {
      interface Piece {
        mesh: THREE.Mesh;
        layer: AnatomyLayer;
        c: THREE.Vector3;
        verts: number;
      }
      const bySide = new Map<string, { L: Piece[]; R: Piece[] }>();
      for (const side of ['R', 'L'] as Side[]) {
        const root = shoulderRootFor(side);
        if (!root) continue;
        scene.traverse((o) => {
          const mesh = o as THREE.SkinnedMesh;
          if (!mesh.isMesh || !mesh.isSkinnedMesh || !mesh.visible) return;
          const layer = mesh.userData.rigLayer as AnatomyLayer | 'hidden' | undefined;
          if (!layer || layer === 'hidden' || layer === 'skin') return;
          if (!belongsTo(mesh, root)) return;
          const key = structureKey(mesh.name);
          if (!key) return;
          const entry = bySide.get(key) ?? { L: [], R: [] };
          entry[side].push({
            mesh,
            layer,
            c: meshWorldCenter(mesh),
            verts: mesh.geometry.getAttribute('position')?.count ?? 0,
          });
          bySide.set(key, entry);
        });
      }
      const MATCH_DIST_M = 0.04;
      let dropped = 0;
      for (const { L, R } of bySide.values()) {
        if (L.length === 0 || R.length === 0) continue;
        for (const [mine, theirs] of [
          [L, R],
          [R, L],
        ] as [Piece[], Piece[]][]) {
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
              if (d < bestD) {
                bestD = d;
                best = q;
              }
            }
            if (best && bestD <= MATCH_DIST_M) {
              taken.add(best);
              continue;
            }
            p.mesh.visible = false;
            p.mesh.userData.rigLayer = 'hidden';
            dropped++;
          }
        }
      }
      return { dropped, keys: bySide.size };
    },
    (r) => ({ mallas: `${r.keys} estructuras / ${r.dropped} ocultadas`, verts: '-' }),
  );

  // === 24. lista final de capas (2399-2442) ===============================
  // Este NO esta dentro del `if (!__rigPrepared)`: corre TAMBIEN en cada
  // remontaje de la escena cacheada.
  pass(
    'lista de capas + lado de diseccion (corre en CADA montaje)',
    '2399-2442',
    'si',
    'SI: es lo que enciende/apaga las capas y lo que el panel lee',
    () => {
      interface LayerMesh {
        mesh: THREE.Mesh;
        layer: AnatomyLayer;
        distalCap: boolean;
        muscleLevel?: MuscleDepthLevel;
        base?: string;
        side?: ParsedSide;
      }
      const list: LayerMesh[] = [];
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const lyr = mesh.userData.rigLayer as AnatomyLayer | 'hidden' | undefined;
        if (lyr === undefined) return;
        if (lyr === 'hidden') {
          mesh.visible = false;
          return;
        }
        const distalCap = mesh.userData.rigDistalCap === true;
        let muscleLevel: MuscleDepthLevel | undefined;
        if (lyr === 'muscle') {
          muscleLevel = mesh.userData.muscleLevel as MuscleDepthLevel | undefined;
          if (!muscleLevel) {
            muscleLevel = muscleDepthLevel(mesh.name);
            mesh.userData.muscleLevel = muscleLevel;
          }
        }
        let base: string | undefined;
        let side: ParsedSide | undefined;
        if (lyr === 'muscle' || lyr === 'connective') {
          const parsed = parseMeshName(mesh.name);
          base = parsed.base;
          side = dissectSideOfMesh(mesh, parsed.side);
        }
        list.push({ mesh, layer: lyr, distalCap, muscleLevel, base, side });
      });
      return list.length;
    },
    (r) => ({ mallas: `${n0(r)} visibles`, verts: '-' }),
  );

  const prepareMs = performance.now() - tPrep;
  void bigPass;

  // ---- COMPROBACION: el reposo no depende de los pesos -------------------
  //
  // La columna "1er fotograma = no" dice que un pase de peso no se ve en
  // reposo. Eso no es una opinion, es algebra: `SkinnedMesh.applyBoneTransform`
  // calcula sum_k w_k * (bone_k * boneInverse_k) * p, y en reposo cada
  // bone*boneInverse es la identidad, asi que el resultado es p * sum(w).
  // Luego basta con que los pesos sumen 1.
  //
  // Se mide las dos cosas sobre la escena YA preparada (con los 25 pases
  // aplicados): la desviacion maxima entre el vertice ligado y el vertice
  // deformado en reposo, y la desviacion maxima de sum(w) respecto a 1. Si la
  // primera es ~0, aplazar cualquier pase de peso no cambia NI UN PIXEL del
  // primer fotograma.
  let maxDevM = 0;
  let maxDevMesh = '';
  let maxSumErr = 0;
  let checkedMeshes = 0;
  let checkedVerts = 0;
  const _pa = new THREE.Vector3();
  const _pb = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    const sk = o as THREE.SkinnedMesh;
    if (!sk.isMesh || !sk.isSkinnedMesh || !sk.skeleton || !sk.visible) return;
    const pos = sk.geometry.getAttribute('position');
    const sw = sk.geometry.getAttribute('skinWeight');
    if (!pos || !sw) return;
    sk.skeleton.update();
    checkedMeshes++;
    const step = Math.max(1, Math.floor(pos.count / 120));
    for (let i = 0; i < pos.count; i += step) {
      _pa.fromBufferAttribute(pos, i);
      _pb.copy(_pa);
      sk.applyBoneTransform(i, _pb);
      const d = _pa.distanceTo(_pb);
      if (d > maxDevM) {
        maxDevM = d;
        maxDevMesh = sk.name;
      }
      let s = 0;
      for (let k = 0; k < 4; k++) s += sw.getComponent(i, k);
      const e = Math.abs(s - 1);
      if (e > maxSumErr) maxSumErr = e;
      checkedVerts++;
    }
  });

  // ---- impresion ---------------------------------------------------------
  const total = rows.reduce((a, r) => a + r.ms, 0);
  console.log('');
  console.log(`GLB  ${glbPath}`);
  console.log(
    `     ${(buf.byteLength / 1e6).toFixed(2)} MB en disco, ${n0(meshCount)} mallas, ${n0(vertCount)} vertices`,
  );
  console.log(`     parse (descomprimir + construir) ... ${parseMs.toFixed(0)} ms`);
  console.log(`     preparacion (los ${rows.length} pases) .......... ${prepareMs.toFixed(0)} ms`);
  console.log('');

  const w = [3, 46, 11, 9, 7, 6, 32, 13];
  const padR = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '.' : s.padEnd(n));
  const padL = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s.padStart(n));
  const hdr =
    padR('#', w[0]) +
    ' ' +
    padR('PASE', w[1]) +
    ' ' +
    padL('lineas', w[2]) +
    ' ' +
    padL('ms', w[3]) +
    ' ' +
    padL('%', w[4]) +
    ' ' +
    padL('1erFot', w[5]) +
    ' ' +
    padR('mallas tocadas', w[6]) +
    ' ' +
    padL('vert. tocados', w[7]);
  console.log(hdr);
  console.log('-'.repeat(hdr.length));
  for (const r of rows) {
    console.log(
      padR(r.n, w[0]) +
        ' ' +
        padR(r.nombre, w[1]) +
        ' ' +
        padL(r.lineas, w[2]) +
        ' ' +
        padL(r.ms.toFixed(1), w[3]) +
        ' ' +
        padL(((100 * r.ms) / total).toFixed(1), w[4]) +
        ' ' +
        padL(r.ver, w[5]) +
        ' ' +
        padR(r.mallas, w[6]) +
        ' ' +
        padL(r.verts, w[7]),
    );
  }
  console.log('-'.repeat(hdr.length));
  console.log(
    padR('', w[0]) +
      ' ' +
      padR('TOTAL preparacion', w[1]) +
      ' ' +
      padL('', w[2]) +
      ' ' +
      padL(total.toFixed(1), w[3]) +
      ' ' +
      padL('100.0', w[4]),
  );

  // ---- cuanto se puede APLAZAR -------------------------------------------
  const msDe = (v: Visible) =>
    rows.filter((r) => r.ver === v).reduce((a, r) => a + r.ms, 0);
  console.log('');
  console.log('REPARTO POR "HACE FALTA EN EL PRIMER FOTOGRAMA?"');
  console.log(
    `  si    .. ${msDe('si').toFixed(0)} ms (${((100 * msDe('si')) / total).toFixed(1)}%)  ` +
      `-- color, forma, agujeros, moteado`,
  );
  console.log(
    `  mixto .. ${msDe('mixto').toFixed(0)} ms (${((100 * msDe('mixto')) / total).toFixed(1)}%)  ` +
      `-- hay que partirlos para saberlo`,
  );
  console.log(
    `  no    .. ${msDe('no').toFixed(0)} ms (${((100 * msDe('no')) / total).toFixed(1)}%)  ` +
      `-- SOLO pesos: aplazables al primer movimiento`,
  );
  console.log('');
  console.log('COMPROBACION DE QUE LOS "no" SON APLAZABLES (reposo, escena ya preparada)');
  console.log(`  mallas con piel comprobadas ..... ${n0(checkedMeshes)}`);
  console.log(`  vertices muestreados ............ ${n0(checkedVerts)}`);
  console.log(
    `  desviacion max ligado->deformado  ${(maxDevM * 1000).toFixed(6)} mm` +
      (maxDevMesh ? `  (${maxDevMesh})` : ''),
  );
  console.log(`  |sum(skinWeight) - 1| maximo .... ${maxSumErr.toExponential(2)}`);
  console.log(
    '  Lectura: en reposo el vertice sale en su sitio de ligado pese el peso como',
  );
  console.log(
    '  pese, asi que un pase que SOLO escribe skinIndex/skinWeight no cambia el',
  );
  console.log('  primer fotograma. Se puede mandar al primer comando de movimiento.');

  console.log('');
  console.log('DESGLOSE DEL RECORRIDO GRANDE (pase 20), por ayudante:');
  const subRows = [...subs.entries()].sort((a, b) => b[1].ms - a[1].ms);
  const subTotal = subRows.reduce((a, s) => a + s[1].ms, 0);
  const sw2 = [44, 9, 7, 9, 13];
  const shdr =
    padR('ayudante', sw2[0]) +
    ' ' +
    padL('ms', sw2[1]) +
    ' ' +
    padL('%p20', sw2[2]) +
    ' ' +
    padL('mallas', sw2[3]) +
    ' ' +
    padL('vertices', sw2[4]);
  console.log(shdr);
  console.log('-'.repeat(shdr.length));
  for (const [k, s] of subRows) {
    console.log(
      padR(k, sw2[0]) +
        ' ' +
        padL(s.ms.toFixed(1), sw2[1]) +
        ' ' +
        padL(((100 * s.ms) / bigPassMs()).toFixed(1), sw2[2]) +
        ' ' +
        padL(n0(s.mallas), sw2[3]) +
        ' ' +
        padL(n0(s.verts), sw2[4]),
    );
  }
  console.log('-'.repeat(shdr.length));
  const p20 = bigPassMs();
  console.log(
    padR('suma de los ayudantes', sw2[0]) +
      ' ' +
      padL(subTotal.toFixed(1), sw2[1]) +
      ' ' +
      padL(((100 * subTotal) / p20).toFixed(1), sw2[2]),
  );
  console.log(
    padR('resto del recorrido (regex, nombres, visible)', sw2[0]) +
      ' ' +
      padL((p20 - subTotal).toFixed(1), sw2[1]) +
      ' ' +
      padL(((100 * (p20 - subTotal)) / p20).toFixed(1), sw2[2]),
  );
  console.log('');
  console.log(
    `FOREARM_CULLS = ${FOREARM_CULLS} (si es false, las 3 reglas de recorte por nombre no se ejecutan)`,
  );

  function bigPassMs(): number {
    return rows.find((r) => r.lineas === '2041-2307')!.ms;
  }

  return { parseMs, prepareMs, aplazableMs: msDe('no'), total };
}

// ---------------------------------------------------------------------------

const vecesArg = process.argv.indexOf('--veces');
const veces = vecesArg >= 0 ? Math.max(1, Number(process.argv[vecesArg + 1]) || 1) : 1;
const resumen: Corrida[] = [];
for (let i = 0; i < veces; i++) {
  console.log('');
  console.log(`=========================  CORRIDA ${i + 1} de ${veces}  =========================`);
  resumen.push(await corrida());
}
if (veces > 1) {
  console.log('');
  console.log('RESUMEN DE CORRIDAS (escena nueva en cada una)');
  resumen.forEach((r, i) =>
    console.log(
      `  ${i + 1}: parse ${r.parseMs.toFixed(0)} ms, preparacion ${r.prepareMs.toFixed(0)} ms, ` +
        `aplazable (solo pesos) ${r.aplazableMs.toFixed(0)} ms = ` +
        `${((100 * r.aplazableMs) / r.total).toFixed(1)}%`,
    ),
  );
}
