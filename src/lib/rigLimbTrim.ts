// src/lib/rigLimbTrim.ts
//
// EL RECORTE DEL ANTEBRAZO, FUERA DEL COMPONENTE PARA QUE EL BANCO LO VEA.
//
// Los musculos digitales del antebrazo (flexor/extensor digitorum, palmaris
// longus, el grupo del pulgar) son casi todo TENDON largo y fino pesado al
// antebrazo proximal; su extremo distal esta mal pielado, asi que al doblar el
// codo o al pronar salen disparados fuera del brazo como puntas de colores
// atravesando la piel. No se recortan por el NOMBRE -- eso vaciaba el
// antebrazo -- sino por donde cae su geometria respecto al EJE del miembro.
//
// Todo esto vivia dentro de RigModel, de modo que el banco de render no lo
// aplicaba y las hojas de revision ensenaban el antebrazo lleno de puntas que
// la aplicacion no tiene. Revisar los movimientos con imagenes asi es revisar
// otro producto. Esta aqui para que los dos usen EXACTAMENTE el mismo recorte.

import * as THREE from 'three';
import { layerForMaterial, type AnatomyLayer } from './materialColors';
import { armHeights, boneBaseName, type ArmHeights } from './rigArmRebind';

/** Centro del bounding box de la malla, en mundo. */
export function meshWorldCenter(mesh: THREE.Mesh): THREE.Vector3 {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return mesh.localToWorld(mesh.geometry.boundingBox!.getCenter(new THREE.Vector3()));
}
/**
 * FOREARM CULLS, the old NAME-based rules: hide all the forearm's connective,
 * hide muscle in the wrist cuff, hide anything matching the digital-muscle regex.
 * Superseded by the measured cull below (see cullForearmOutliers), which drops
 * only what actually sticks out and so keeps 60% more of the forearm's bulk.
 * Left in place, disabled, because they are the documented fallback if the
 * measured rule ever misjudges a re-exported rig.
 */
export const FOREARM_CULLS = false;

/**
 * How far past the limb's own radius a mesh may reach before it is trimmed.
 *
 * The name-based culls emptied the forearm; removing them filled it back up but
 * let loose spikes through. Neither is a judgement about a muscle's NAME -- it is
 * about where its geometry lands, so that is what we measure.
 *
 * The reference is the arm's own BONE AXIS, not its skin: the digital tendons run
 * into the fingers, where hand skin is sampled thinly, and a skin-cloud distance
 * there says 25 cm for a structure that is perfectly in place. The threshold is
 * taken from the forearm SKIN's own distance to that axis, so it adapts to the rig
 * rather than hardcoding a body size, and p95 is used rather than the max so one
 * stray vertex cannot condemn an otherwise healthy belly. Measured on the shipped
 * rig the sleeve is 6.3 cm, which is the number this margin is applied to.
 */
const LIMB_OUTLIER_MARGIN = 1.02;

/**
 * Below this fraction of surviving triangles a trimmed mesh is hidden instead:
 * what is left of a long tendon whose whole length was cut away is a handful of
 * scattered faces, which reads as debris rather than as anatomy.
 */
const LIMB_TRIM_MIN_KEPT = 0.1;

/** The limb axis: one segment per bone-to-child pair under `root`. */
function boneAxis(root: THREE.Object3D): [THREE.Vector3, THREE.Vector3][] {
  const segs: [THREE.Vector3, THREE.Vector3][] = [];
  root.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    const a = o.getWorldPosition(new THREE.Vector3());
    for (const child of o.children) {
      if ((child as THREE.Bone).isBone) {
        segs.push([a, child.getWorldPosition(new THREE.Vector3())]);
      }
    }
  });
  return segs;
}

const _seg = new THREE.Vector3();
const _rel = new THREE.Vector3();
/**
 * Distance from `p` to the limb axis.
 *
 * SEGMENTS, not the bone origins. An arm armature has seven bones, so the cloud
 * of their positions leaves a ~25 cm hole down the forearm: a vertex halfway
 * along it measures 12 cm from both the elbow and the wrist while sitting right
 * on the bone. Thresholding against that cloud is thresholding against the gap
 * between bones, and it passed rods reaching twice as far as the skin. Against
 * the axis the forearm's own sleeve measures 6.3 cm, which is a real radius.
 */
function distToAxis(p: THREE.Vector3, segs: readonly [THREE.Vector3, THREE.Vector3][]): number {
  let best = Infinity;
  for (const [a, b] of segs) {
    _seg.subVectors(b, a);
    _rel.subVectors(p, a);
    const lenSq = _seg.lengthSq();
    let t = lenSq > 1e-9 ? _rel.dot(_seg) / lenSq : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = _rel.addScaledVector(_seg, -t).lengthSq();
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/**
 * The forearm's TAPERED SLEEVE: its skin radius as a function of how far down the
 * elbow -> wrist axis you are, 5.2 cm at the elbow narrowing to 3.9 cm at the
 * wrist on the shipped rig.
 *
 * One radius for the whole limb cannot describe an arm, and worse, a plain
 * distance-to-axis test is blind to the thing that was on screen: a bar lying
 * ACROSS the forearm never leaves the axis, it just pierces the skin on both
 * sides, and a 10 cm bar centred on the bone measures 5 cm -- comfortably inside
 * a limit taken from the widest part of the limb. The rig ships several such
 * bars, muscles the exporter left rotated ~90 deg (23 cm of extensor digitorum
 * running front-to-back through a 4 cm wrist), and they are what "no esta bien
 * colocado" refers to. Sampling the skin per axial station catches them.
 *
 * Returns a predicate: is this rest-pose world point inside the sleeve? Points
 * above the elbow are not judged by it -- the humeral origins live there, and
 * they are handled by anchorOriginToHumerus.
 */
function makeSleeveTest(
  elbow: THREE.Vector3,
  wrist: THREE.Vector3,
  skin: readonly THREE.Mesh[],
  margin: number,
): (p: THREE.Vector3) => boolean {
  const axis = new THREE.Vector3().subVectors(wrist, elbow);
  const lenSq = axis.lengthSq();
  if (lenSq <= 1e-6) return () => true;
  const rel = new THREE.Vector3();
  /** Axial station (0 elbow, 1 wrist) and radius off the axis. */
  const station = (p: THREE.Vector3): [number, number] => {
    rel.subVectors(p, elbow);
    const t = rel.dot(axis) / lenSq;
    return [t, rel.addScaledVector(axis, -t).length()];
  };
  const BINS = 12;
  const bins: number[][] = Array.from({ length: BINS }, () => []);
  const v = new THREE.Vector3();
  for (const mesh of skin) {
    const pos = mesh.geometry.getAttribute('position');
    if (!pos) continue;
    const step = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i);
      mesh.localToWorld(v);
      const [t, r] = station(v);
      if (t < 0 || t > 1) continue;
      bins[Math.min(BINS - 1, Math.floor(t * BINS))].push(r);
    }
  }
  const profile = bins.map((xs) => {
    if (xs.length === 0) return NaN;
    xs.sort((a, b) => a - b);
    return xs[Math.floor(xs.length * 0.95)];
  });
  if (profile.every((x) => Number.isNaN(x))) return () => true;
  // A bin the skin did not reach borrows its neighbours' widest, so the profile
  // is defined end to end and never pinches the limb shut where it has no data.
  for (let i = 0; i < BINS; i++) {
    if (!Number.isNaN(profile[i])) continue;
    const near = profile.filter((x, j) => !Number.isNaN(x) && Math.abs(j - i) <= 2);
    profile[i] = near.length > 0 ? Math.max(...near) : Infinity;
  }
  const radiusAt = (t: number): number => {
    const c = t < 0 ? 0 : t > 1 ? 1 : t;
    const x = c * (BINS - 1);
    const i = Math.min(BINS - 2, Math.floor(x));
    return profile[i] + (profile[i + 1] - profile[i]) * (x - i);
  };
  return (p: THREE.Vector3): boolean => {
    const [t, r] = station(p);
    if (t < -0.05) return true; // above the elbow: not the forearm's business
    // Past the wrist there is nothing to be inside of: the hand is a solid skin
    // cap with every internal piece hidden, so a tendon that carries on into it
    // can only come out through the palm.
    if (t > 1.05) return false;
    return r <= radiusAt(t) * margin;
  };
}

/**
 * A mesh lying ACROSS the limb instead of along it.
 *
 * A forearm muscle runs the length of the forearm: it covers a long axial span
 * and hugs the axis. The export-mangled ones are the exact opposite -- their
 * vertices bunch into 1-3 cm of the limb's length and fan out to 8-15 cm of
 * radius, because the mesh is lying crosswise. On the shipped rig the two groups
 * do not overlap: twelve meshes score 0.10-0.32, every healthy structure scores
 * 1.21 or more. They are the bars seen crossing the forearm, and unlike the ones
 * repairMirroredMeshes rebuilds, they are mangled on BOTH arms, so there is no
 * good twin to copy from and nothing to do but hide them. Fixing them for real
 * means rebuilding them in Blender (see the export recipe).
 *
 * Both conditions are needed: the small ring ligaments of the wrist are "short"
 * too, but they do not fan out, and they must stay.
 */
const CROSSWISE_MAX_RATIO = 0.5;
const CROSSWISE_MIN_RADIAL_M = 0.06;

function isCrosswise(mesh: THREE.Mesh, elbow: THREE.Vector3, wrist: THREE.Vector3): boolean {
  const pos = mesh.geometry.getAttribute('position');
  if (!pos || pos.count < 16) return false;
  const axis = new THREE.Vector3().subVectors(wrist, elbow);
  const lenSq = axis.lengthSq();
  if (lenSq <= 1e-6) return false;
  const len = Math.sqrt(lenSq);
  const rel = new THREE.Vector3();
  const ts: number[] = [];
  const rs: number[] = [];
  const step = Math.max(1, Math.floor(pos.count / 300));
  for (let i = 0; i < pos.count; i += step) {
    rel.fromBufferAttribute(pos, i);
    mesh.localToWorld(rel);
    rel.sub(elbow);
    const t = rel.dot(axis) / lenSq;
    ts.push(t * len);
    rs.push(rel.addScaledVector(axis, -t).length());
  }
  if (ts.length < 8) return false;
  ts.sort((a, b) => a - b);
  rs.sort((a, b) => a - b);
  const q = (a: number[], f: number) => a[Math.floor(a.length * f)];
  const span = q(ts, 0.95) - q(ts, 0.05);
  const radial = q(rs, 0.95) - q(rs, 0.05);
  return radial > CROSSWISE_MIN_RADIAL_M && span / radial < CROSSWISE_MAX_RATIO;
}

/**
 * Drop the triangles of `mesh` that lie outside the limb, keeping the rest.
 * Returns the fraction of triangles kept, so the caller can hide a mesh that has
 * essentially nothing left. Measured in the REST pose, where bone matrices are
 * identity, so a vertex's bind position is its world position.
 */
function trimMeshToLimb(
  mesh: THREE.Mesh,
  segs: readonly [THREE.Vector3, THREE.Vector3][],
  limit: number,
  inSleeve: (p: THREE.Vector3) => boolean,
): number {
  const geom = mesh.geometry;
  const idx = geom.getIndex();
  const pos = geom.getAttribute('position');
  if (!idx || !pos || pos.count === 0) return 1;
  const inside = new Uint8Array(pos.count);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    mesh.localToWorld(p);
    inside[i] = distToAxis(p, segs) <= limit && inSleeve(p) ? 1 : 0;
  }
  const arr = idx.array as ArrayLike<number>;
  const kept: number[] = [];
  for (let i = 0; i + 2 < arr.length; i += 3) {
    if (inside[arr[i]] && inside[arr[i + 1]] && inside[arr[i + 2]]) {
      kept.push(arr[i], arr[i + 1], arr[i + 2]);
    }
  }
  const frac = arr.length > 0 ? kept.length / arr.length : 1;
  if (frac >= LIMB_TRIM_MIN_KEPT && frac < 1) {
    // clone: geometry can be shared with a deduped twin we must not damage.
    const next = geom.clone();
    next.setIndex(kept);
    next.computeBoundingBox();
    next.computeBoundingSphere();
    mesh.geometry = next;
  }
  return frac;
}

/**
 * True when a rest-pose world center lies in the hand/wrist or foot/ankle
 * cluster. Forearm and leg (muscle bellies, proximal skin) sit outside and keep
 * their normal muscle+bone rendering.
 */
export function inDistalRegion(c: THREE.Vector3): boolean {
  const hand = c.y > 0.6 && c.y < 0.86 && Math.abs(c.x) > 0.18;
  const foot = c.y < 0.12;
  return hand || foot;
}

// ---------------------------------------------------------------------------
// Forearm "wire" cull.
//
// The joint-connecting CONNECTIVE layer (tendon/ligament/capsule/cartilage) was
// added so the scattered distal bones read as a connected hand -- but the hand
// is now a solid SKIN-CAP, so that rationale is gone. In the FOREARM the same
// layer renders as thin, glossy, pearly-white strands (the wrist ligaments and
// the long carpi/digitorum tendons spanning the forearm) that spill out past the
// skin cap as loose "alambres". In the arm band we therefore keep MUSCLE + BONE
// (which read as a clean, meaty forearm) and drop the connective wires. Legs and
// torso sit outside this band and keep their connective.
//
// Band (three.js y-up, measured on the shipped GLB): arms are the lateral
// columns |x| > 0.16; the forearm/wrist/elbow connective spans y 0.82..1.35
// (the wrist ligaments begin at y ~= 0.86, just above the hand cap).
// ---------------------------------------------------------------------------
/**
 * Half-width of the trunk at arm height: beyond this the mesh is in one of the
 * lateral arm columns, inside it belongs to the body. Any rule keyed to a HEIGHT
 * along the arm needs this too, because with the arms down the forearm hangs
 * beside the lumbar spine — the elbow and the abdominal wall are the same
 * height, so a y-only test reads the trunk as forearm (see anchorOriginToHumerus
 * at its call site).
 */
export const ARM_COLUMN_X = 0.16;

export function inArmBand(c: THREE.Vector3): boolean {
  return Math.abs(c.x) > ARM_COLUMN_X && c.y > 0.82 && c.y < 1.4;
}

// ---------------------------------------------------------------------------
// Wrist cuff.
//
// Just above the hand skin-cap, the thin DISTAL forearm muscles (the dorsal
// extensor slips -- extensor digitorum / digiti minimi / indicis / pollicis,
// abductor pollicis longus, palmaris longus, pronator quadratus) reach the wrist
// and poke through the thin skin there as loose red spindles ("cosas salidas en
// la muñeca"). We hide MUSCLE in this cuff so the wrist reads clean under the
// skin; the bone (radius/ulna, which does not poke and bridges to the hand) and
// the main forearm bellies higher up (y >= 0.96) stay. Connective here is already
// gone via inArmBand.
//
// Band (three.js y-up): laterally |x| > 0.18, from the top of the hand cap
// (y ~= 0.86) up to y < 0.96 (the distal ~10 cm of forearm).
// ---------------------------------------------------------------------------
export function inWristCuff(c: THREE.Vector3): boolean {
  return Math.abs(c.x) > 0.18 && c.y >= 0.86 && c.y < 0.96;
}

// ---------------------------------------------------------------------------
// EL HUECO DEL ANTEBRAZO.
//
// El ultimo cuarto del antebrazo SE QUEDA SIN CARNE, y no por una decision de
// este proyecto: seis musculos superficiales por brazo -- extensor de los dedos,
// extensor del meñique, flexor profundo de los dedos, flexor largo del pulgar,
// palmar largo y sus mitades tendinosas -- vienen del GLB TUMBADOS ATRAVESANDO
// el miembro. Medido en el rig servido: ocupan 1,4-2,7 cm del largo del
// antebrazo y se abren 11,8-14,9 cm en radio; su caja envolvente mide 23-39 cm
// en z, es decir que asoman un palmo por delante y por detras del cuerpo. Son
// justamente las barras que `isCrosswise` describe, y como estan rotos en los
// DOS brazos no hay gemelo bueno del que copiar: el recorte medido los oculta,
// con razon.
//
// Lo que queda, medido del codo (t=0) a la muneca (t=1), es esto:
//
//     t 0,0-0,7   100% del musculo en pantalla
//     t 0,7-0,8    72%
//     t 0,8-0,9    32%
//     t 0,9-1,0    22%
//
// Es decir: los primeros tres cuartos estan intactos y el ultimo esta hueco.
// Y ahi dentro siguen el radio y el cubito. Con la piel en modo fantasma -- que
// existe para ENSENAR EL MUSCULO de debajo -- ese tramo no ensena musculo
// ninguno: ensena hueso pelado al lado de una mano opaca. Es el
// "deja descubierto el hueso del antebrazo" que se reporto.
//
// Mientras el dato no se arregle en Blender, el tramo hueco lleva piel SOLIDA,
// como la mano: el manguito baja entero hasta el casquete de la mano y el
// antebrazo se lee como un antebrazo. No se oculta ni el hueso ni el musculo,
// de modo que apagando la capa de piel el radio y el cubito siguen ahi para
// estudiarlos.
//
// El limite se saca del propio rig (no es una altura escrita a mano): el cuarto
// distal del segmento codo-muneca. En el rig servido cae en y = 0,923.
// ---------------------------------------------------------------------------
/** Fraccion distal del antebrazo que el recorte deja sin musculo. */
const FOREARM_HOLLOW_FRACTION = 0.25;

/** Altura por debajo de la cual el antebrazo ya no tiene carne que ensenar. */
export function forearmHollowTop(heights: ArmHeights): number {
  return heights.wristY + FOREARM_HOLLOW_FRACTION * (heights.elbowY - heights.wristY);
}

/**
 * True cuando un centro de malla en reposo cae en el tramo hueco del antebrazo
 * (por encima del casquete de la mano, por debajo de donde acaba el musculo).
 */
export function inForearmHollow(c: THREE.Vector3, heights: ArmHeights): boolean {
  return (
    Math.abs(c.x) > ARM_COLUMN_X &&
    c.y >= heights.wristY - 0.02 &&
    c.y < forearmHollowTop(heights)
  );
}
/**
 * Recorta del antebrazo lo que se sale del miembro, y devuelve lo que no tiene
 * arreglo.
 *
 * Es el bloque que ejecutaba RigModel al cargar, movido tal cual: mide el radio
 * real del antebrazo a partir de SU PROPIA PIEL, recorta los triangulos que
 * salen de esa manga, y marca como perdidas las mallas que quedan sin casi nada
 * o que cruzan el brazo de lado a lado (esas no se recortan: no hay parte buena
 * en un musculo tumbado atravesando el antebrazo).
 *
 * Se llama UNA vez, con el rig en reposo y antes de capturar el reposo: recorta
 * geometria, no es idempotente.
 *
 * Devuelve el conjunto de mallas que quien llama debe ocultar.
 */
export function trimForearmOutliers(
  scene: THREE.Object3D,
  heights: ArmHeights = armHeights(scene),
): Set<THREE.Object3D> {
  const outliers = new Set<THREE.Object3D>();
  const _p = new THREE.Vector3();
  const descendantIds = new Map<number, Set<number>>();
  const belongsTo = (mesh: THREE.Object3D, root: THREE.Object3D): boolean => {
    const sk = mesh as THREE.SkinnedMesh;
    if (!sk.isSkinnedMesh || !sk.skeleton) return false;
    let ids = descendantIds.get(root.id);
    if (!ids) {
      ids = new Set<number>();
      root.traverse((o) => ids!.add(o.id));
      descendantIds.set(root.id, ids);
    }
    return sk.skeleton.bones.some((b) => ids!.has(b.id));
  };

  for (const node of ['Shoulder_Armature_R', 'Shoulder_Armature_L']) {
    const root = scene.getObjectByName(node);
    if (!root) continue;
    const segs = boneAxis(root);
    if (segs.length === 0) continue;
    const reach = (mesh: THREE.Mesh): number => {
      const pos = mesh.geometry.getAttribute('position');
      if (!pos || pos.count === 0) return 0;
      const step = Math.max(1, Math.floor(pos.count / 300));
      const d: number[] = [];
      for (let i = 0; i < pos.count; i += step) {
        _p.fromBufferAttribute(pos, i);
        mesh.localToWorld(_p); // reposo: los huesos son identidad en el bind
        d.push(distToAxis(_p, segs));
      }
      d.sort((a, b) => a - b);
      return d[Math.floor(d.length * 0.95)] ?? 0;
    };
    const inLimb: { mesh: THREE.Mesh; layer: AnatomyLayer; p95: number; cy: number }[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh || !mesh.isSkinnedMesh) return;
      if (!belongsTo(mesh, root)) return;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const layer = layerForMaterial((mat as THREE.Material | undefined)?.name);
      if (!layer) return;
      const c = meshWorldCenter(mesh);
      if (c.y > heights.elbowY + 0.02) return; // antebrazo y mano
      inLimb.push({ mesh, layer, p95: reach(mesh), cy: c.y });
    });
    const skinReach = inLimb
      .filter((e) => e.layer === 'skin' && e.cy >= heights.wristY - 0.02)
      .reduce((mx, e) => Math.max(mx, e.p95), 0);
    if (skinReach <= 0) continue;
    const limit = skinReach * LIMB_OUTLIER_MARGIN;
    let elbowP: THREE.Vector3 | null = null;
    let wristP: THREE.Vector3 | null = null;
    root.traverse((o) => {
      const bn = boneBaseName(o.name);
      if (bn === 'forearm_flex' && !elbowP) elbowP = o.getWorldPosition(new THREE.Vector3());
      else if (bn === 'hand_flex' && !wristP) wristP = o.getWorldPosition(new THREE.Vector3());
    });
    const inSleeve =
      elbowP && wristP
        ? makeSleeveTest(
            elbowP,
            wristP,
            inLimb
              .filter((e) => e.layer === 'skin' && e.cy >= heights.wristY - 0.02)
              .map((e) => e.mesh),
            LIMB_OUTLIER_MARGIN,
          )
        : () => true;
    for (const e of inLimb) {
      if (e.layer === 'skin') continue;
      if (elbowP && wristP && isCrosswise(e.mesh, elbowP, wristP)) {
        outliers.add(e.mesh);
        continue;
      }
      const kept = trimMeshToLimb(e.mesh, segs, limit, inSleeve);
      if (kept < LIMB_TRIM_MIN_KEPT) outliers.add(e.mesh);
    }
  }
  return outliers;
}
