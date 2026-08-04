// src/lib/atlasPlate.ts
//
// The two pure pieces behind the Explorar atlas labels (see AtlasLabels.tsx):
// WHICH structures get named, and WHERE the names stack in the margin. Both are
// kept out of the React/useFrame glue so they can be run against the real GLB
// and unit-tested, rather than only judged by eye in a canvas.

import * as THREE from 'three';
import type { AnatomyEntry } from '../types/anatomy';
import type { Muscle } from '../types/muscle';

/** At most this many names on screen; past it a plate stops being readable. */
export const MAX_MUSCLE_LABELS = 8;
export const MAX_BONE_LABELS = 4;
/** Spine plates are all about the levels, so they get the whole column. */
export const MAX_SPINE_LEVEL_LABELS = 14;

export const SPINE_REGIONS = new Set(['cervical', 'thoracic', 'lumbar']);

/**
 * Bones worth naming outside the spine, in the order they should be offered.
 * Everything else stays unlabelled: a plate names landmarks, not inventory.
 */
const BONE_LABELS: Array<[RegExp, string]> = [
  [/^Femur/i, 'Fémur'],
  [/^Patella/i, 'Rótula'],
  [/^Tibia/i, 'Tibia'],
  [/^Fibula/i, 'Peroné'],
  [/^Hip_bone/i, 'Coxal'],
  [/^Sacrum/i, 'Sacro'],
  [/^Coccyx/i, 'Cóccix'],
  [/^Humerus/i, 'Húmero'],
  [/^Scapula/i, 'Escápula'],
  [/^Clavicle/i, 'Clavícula'],
  [/^Radius/i, 'Radio'],
  [/^Ulna/i, 'Cúbito'],
  [/^Talus/i, 'Astrágalo'],
  [/^Calcaneus/i, 'Calcáneo'],
  [/^Navicular_bone/i, 'Escafoides'],
  [/^Cuboid_bone/i, 'Cuboides'],
];

/**
 * Trim a clinical name down to what fits in a margin.
 *
 * The muscle records carry disambiguators the plate does not need, because the
 * leader already points at the structure: "Recto interno (gracilis)", "Grupo
 * flexor-pronador (epitróclea)". Left in, they pushed the names past the column
 * width and the plate showed "Grupo flexo…" and "Braquiorrad…" — an ellipsis is
 * worse than no label, since a half-name teaches nothing.
 */
export function plateName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name;
}

/** Vertebral level from a mesh name, or null when it isn't a vertebra. */
export function vertebralLevel(name: string): string | null {
  const v = name.match(/^Vertebra_([CTL]\d{1,2})/i);
  if (v) return v[1].toUpperCase();
  if (/^Atlas/i.test(name)) return 'C1';
  if (/^Axis/i.test(name)) return 'C2';
  return null;
}

/** One name in the margin, with the world points its leader can point at. */
export interface LabelTarget {
  key: string;
  text: string;
  kind: 'muscle' | 'bone';
  /** Muscle id, when clicking the label should select a muscle. */
  muscleId?: string;
  /** A representative mesh name per side, for the hover bridge. */
  meshNames: string[];
  /** World-space anchors (one per side); the frame loop picks the outer one. */
  anchors: THREE.Vector3[];
  /**
   * Force this name into one margin instead of letting its screen position
   * choose. A structure that sits ON the midline — every vertebra, the rectus
   * abdominis — projects within a pixel of the screen centre, so "whichever
   * side it landed on" flips column on the tiniest camera move and the whole
   * plate twitches. Midline structures are pinned: levels build a ruler down
   * the left margin, midline muscles go right.
   */
  pin?: 'left' | 'right';
}

/** Half-width of the midline band, in world metres. */
const MIDLINE_X = 0.04;

/** Pin midline structures so they never flip margin as the camera orbits. */
function pinFor(kind: 'muscle' | 'bone', anchors: THREE.Vector3[]): 'left' | 'right' | undefined {
  const midline = anchors.every((a) => Math.abs(a.x) < MIDLINE_X);
  if (!midline) return undefined;
  return kind === 'bone' ? 'left' : 'right';
}

/** World-space bounding sphere of a mesh: anchor point + a size to rank by. */
function anchorOf(mesh: THREE.Mesh): { point: THREE.Vector3; radius: number } | null {
  const geo = mesh.geometry;
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const sphere = geo.boundingSphere;
  if (!sphere || !Number.isFinite(sphere.radius)) return null;
  const point = sphere.center.clone().applyMatrix4(mesh.matrixWorld);
  const scale = mesh.getWorldScale(new THREE.Vector3()).x || 1;
  return { point, radius: sphere.radius * scale };
}

/** Keep the largest candidate per body side, so a paired structure gets two. */
function keepPerSide(
  picks: Array<{ name: string; anchor: THREE.Vector3; radius: number }>,
  candidate: { name: string; anchor: THREE.Vector3; radius: number },
): void {
  const side = candidate.anchor.x >= 0 ? 1 : -1;
  const i = picks.findIndex((p) => (p.anchor.x >= 0 ? 1 : -1) === side);
  if (i === -1) picks.push(candidate);
  else if (candidate.radius > picks[i].radius) picks[i] = candidate;
}

/**
 * Pick the structures worth naming, at most one label per structure.
 *
 * Muscles come from the region's clinical list (so the names are the Spanish
 * ones the rest of the app teaches) ordered superficial-first, since those are
 * the ones actually on screen. Bones come from the visible meshes: vertebral
 * levels in the spine regions, a short list of named landmarks elsewhere.
 */
export function pickLabelTargets(opts: {
  region: string | null;
  muscles: Muscle[];
  meshNamesByMuscleId: Map<string, string[]>;
  byMesh: Map<string, AnatomyEntry>;
  visibleMeshes: THREE.Mesh[];
}): LabelTarget[] {
  const { region, muscles, meshNamesByMuscleId, byMesh, visibleMeshes } = opts;
  if (visibleMeshes.length === 0) return [];

  const visibleByName = new Map<string, THREE.Mesh>();
  for (const m of visibleMeshes) visibleByName.set(m.name, m);

  const targets: LabelTarget[] = [];

  // ---- muscles: superficial first, they are what you can actually see ----
  const ordered = [...muscles].sort((a, b) => (a.depth ?? 99) - (b.depth ?? 99));
  for (const muscle of ordered) {
    if (targets.length >= MAX_MUSCLE_LABELS) break;
    const picks: Array<{ name: string; anchor: THREE.Vector3; radius: number }> = [];
    for (const name of meshNamesByMuscleId.get(muscle.id) ?? []) {
      const mesh = visibleByName.get(name);
      if (!mesh) continue;
      const a = anchorOf(mesh);
      if (a) keepPerSide(picks, { name, anchor: a.point, radius: a.radius });
    }
    if (picks.length === 0) continue;
    const anchors = picks.map((p) => p.anchor);
    targets.push({
      key: `muscle:${muscle.id}`,
      text: plateName(muscle.name),
      kind: 'muscle',
      muscleId: muscle.id,
      meshNames: picks.map((p) => p.name),
      anchors,
      pin: pinFor('muscle', anchors),
    });
  }

  // ---- bones / vertebral levels -----------------------------------------
  const isSpine = region != null && SPINE_REGIONS.has(region);
  const boneMax = isSpine ? MAX_SPINE_LEVEL_LABELS : MAX_BONE_LABELS;
  const bones = new Map<
    string,
    { text: string; order: number; picks: Array<{ name: string; anchor: THREE.Vector3; radius: number }> }
  >();

  for (const mesh of visibleMeshes) {
    const entry = byMesh.get(mesh.name);
    if (!entry || entry.layer !== 'bones') continue;

    let text: string | null = null;
    let order = 0;
    if (isSpine) {
      // Levels only. Discs are too many to name and would double the ruler.
      text = vertebralLevel(mesh.name) ?? (/^Sacrum/i.test(mesh.name) ? 'Sacro' : null);
    } else {
      const hit = BONE_LABELS.find(([re]) => re.test(mesh.name));
      if (hit) {
        text = hit[1];
        order = BONE_LABELS.indexOf(hit);
      }
    }
    if (!text) continue;

    const a = anchorOf(mesh);
    if (!a) continue;
    // Bucket by the DISPLAY name, not by structureKey. The atlas splits one bone
    // across meshes that key differently — "Femur" parses to base "Femu" (the
    // trailing r reads as a side marker) while "Femur_1" keys as "Femur" — which
    // put "Fémur · Fémur" in the margin twice. Two meshes that print the same
    // name are the same label, by definition.
    const bucket = bones.get(text) ?? { text, order, picks: [] };
    keepPerSide(bucket.picks, { name: mesh.name, anchor: a.point, radius: a.radius });
    bones.set(text, bucket);
  }

  const boneList = [...bones.values()]
    .sort((a, b) => a.order - b.order || a.text.localeCompare(b.text, 'es', { numeric: true }))
    .slice(0, boneMax);

  for (const bucket of boneList) {
    const anchors = bucket.picks.map((p) => p.anchor);
    targets.push({
      key: `bone:${bucket.text}`,
      text: bucket.text,
      kind: 'bone',
      meshNames: bucket.picks.map((p) => p.name),
      anchors,
      pin: pinFor('bone', anchors),
    });
  }

  return targets;
}

/* ------------------------------------------------------------------ */
/*  Column stacking                                                    */
/* ------------------------------------------------------------------ */

export interface PlacedLabel {
  /** Index into the caller's target array. */
  i: number;
  /** Where the leader lands, in CSS px. */
  ax: number;
  ay: number;
  /** Where the name sits after stacking, in CSS px. */
  y: number;
  left: boolean;
}

/**
 * Push a column's names apart so none overlap, keeping each as close to its own
 * structure as it can get, then pull the whole column back inside the viewport
 * if the stack ran off the bottom.
 *
 * Mutates and returns the array it is given (it runs every frame, so it must not
 * allocate). `padTop` / `padBottom` keep the names clear of the hover chip and
 * the floating toolbar.
 */
export function stackColumn(
  column: PlacedLabel[],
  height: number,
  gap: number,
  padTop: number,
  padBottom: number,
): PlacedLabel[] {
  if (column.length === 0) return column;
  column.sort((a, b) => a.ay - b.ay);

  let cursor = padTop;
  for (const p of column) {
    p.y = Math.max(p.ay, cursor);
    cursor = p.y + gap;
  }

  // `cursor` is now one gap past the last label's baseline.
  const overflow = cursor - gap - (height - padBottom);
  if (overflow > 0) {
    // Only shift by as much as the top of the stack can spare, so the column
    // never climbs into the padded strip at the top.
    const shift = Math.min(overflow, column[0].y - padTop);
    if (shift > 0) for (const p of column) p.y -= shift;
  }
  return column;
}
