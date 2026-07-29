// src/components/movement/dissectChannel.ts
//
// Click-to-dissect bus for the movement lab. This is how the professional /
// "Complete Anatomy" interaction works here:
//
//   1. The user CLICKS a muscle on the rig -> RigModel raycasts, resolves the
//      clinical muscle, and writes the SELECTION here.
//   2. The DOM DissectionPanel reads the selection and shows a card with the
//      muscle's name + a "Diseccionar" button.
//   3. Pressing Diseccionar pushes the muscle onto the HIDDEN list here; RigModel
//      reacts by hiding all of that muscle's meshes, so the structures BENEATH it
//      are revealed on the same living, posable model.
//   4. "Deshacer" / "Restaurar todo" pop / clear the hidden list.
//
// Same module-level pub/sub pattern as rigChannel / layerChannel, so no ref
// crosses the <Canvas>. One writer per field: RigModel writes `selection`; the
// DOM triggers the mutators (dissectSelected / restoreLast / restoreAll); both
// sides subscribe to render.
//
// ASCII-only source; UI strings live in the panel; no `any`.

import { parseMeshName, type ParsedSide } from '../../lib/parseMeshName';
import { muscleDepthLevel, MUSCLE_PLANE_LABELS } from '../../lib/muscleDepth';
import type { Muscle } from '../../types/muscle';

/** Which peelable tissue a clicked mesh belongs to (never skin/hidden here). */
export type DissectLayer = 'muscle' | 'connective' | 'bone';

/** A resolved click: everything the card + the hide logic need. */
export interface DissectSelection {
  /** The exact mesh clicked (for reference / re-highlight). */
  meshName: string;
  /** Stable identity of the selected structure (muscle id, or parsed base). */
  id: string;
  /** parseMeshName bases whose meshes form this structure (both sides). */
  bases: string[];
  /** Laterality of the clicked mesh. */
  side: ParsedSide;
  /** Display name (Spanish clinical name when catalogued, else prettified base). */
  label: string;
  /** Latin / TA name when catalogued. */
  latin: string | null;
  /** Short clinical note when catalogued. */
  note: string | null;
  /** Dissection plane label ('Superficial' | 'Intermedio' | 'Profundo'), muscle only. */
  planeLabel: string | null;
  /** Human side label ('Lado derecho' | 'Lado izquierdo'), or null for midline. */
  sideLabel: string | null;
  /** The tissue layer clicked. */
  layer: DissectLayer;
  /** Whether this structure can be dissected away (muscle / connective, not bone). */
  dissectable: boolean;
}

/** One structure that has been peeled away. */
export interface HiddenEntry {
  id: string;
  label: string;
  bases: string[];
  side: ParsedSide;
}

export interface DissectState {
  selection: DissectSelection | null;
  hidden: HiddenEntry[];
}

/** Turn a parseMeshName base into a readable display name. */
export function prettifyBase(base: string): string {
  const words = base
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bmuscle\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!words) return base;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const SIDE_LABEL: Record<ParsedSide, string | null> = {
  left: 'Lado izquierdo',
  right: 'Lado derecho',
  center: null,
};

/**
 * Build a selection from a clicked mesh, its tissue layer, and (optionally) the
 * clinical muscle it resolves to. Centralizes all the display formatting so
 * RigModel just raycasts and hands off.
 */
export function makeSelection(
  meshName: string,
  layer: DissectLayer,
  muscle: Muscle | undefined,
): DissectSelection {
  const parsed = parseMeshName(meshName);
  const dissectable = layer === 'muscle' || layer === 'connective';
  const planeLabel =
    layer === 'muscle' ? MUSCLE_PLANE_LABELS[muscleDepthLevel(meshName)] : null;
  if (muscle) {
    return {
      meshName,
      id: muscle.id,
      bases: muscle.meshBases.length ? muscle.meshBases : [parsed.base],
      side: parsed.side,
      label: muscle.name,
      latin: muscle.latin,
      note: muscle.clinicalNote ?? null,
      planeLabel,
      sideLabel: SIDE_LABEL[parsed.side],
      layer,
      dissectable,
    };
  }
  return {
    meshName,
    id: parsed.base,
    bases: [parsed.base],
    side: parsed.side,
    label: prettifyBase(parsed.base),
    latin: null,
    note: null,
    planeLabel,
    sideLabel: SIDE_LABEL[parsed.side],
    layer,
    dissectable,
  };
}

/**
 * Does a mesh (its parsed base + side) fall under any hidden entry? A hidden
 * entry scoped to one side also removes that muscle's midline ('center') meshes;
 * a 'center'-scoped removal (clicked a non-lateralized belly) removes every side.
 */
export function meshIsDissected(
  base: string,
  side: ParsedSide,
  hidden: HiddenEntry[],
): boolean {
  for (const h of hidden) {
    if (!h.bases.includes(base)) continue;
    if (h.side === 'center' || side === 'center' || side === h.side) return true;
  }
  return false;
}

export const dissectChannel = (() => {
  let state: DissectState = { selection: null, hidden: [] };
  const listeners = new Set<(s: DissectState) => void>();
  const notify = () => listeners.forEach((l) => l(state));
  return {
    get: (): DissectState => state,
    subscribe: (l: (s: DissectState) => void): (() => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    /** RigModel writes the current click selection (null clears it). */
    setSelection: (selection: DissectSelection | null): void => {
      state = { ...state, selection };
      notify();
    },
    /** Peel the selected structure away (and clear the selection). */
    dissectSelected: (): void => {
      const sel = state.selection;
      if (!sel || !sel.dissectable) return;
      const already = state.hidden.some((h) => h.id === sel.id && h.side === sel.side);
      const hidden = already
        ? state.hidden
        : [...state.hidden, { id: sel.id, label: sel.label, bases: sel.bases, side: sel.side }];
      state = { selection: null, hidden };
      notify();
    },
    /** Bring back the most recently peeled structure. */
    restoreLast: (): void => {
      if (state.hidden.length === 0) return;
      state = { ...state, hidden: state.hidden.slice(0, -1) };
      notify();
    },
    /** Bring back every peeled structure. */
    restoreAll: (): void => {
      if (state.hidden.length === 0 && !state.selection) return;
      state = { ...state, hidden: [] };
      notify();
    },
    /** Full reset (selection + hidden), e.g. on region change / unmount. */
    reset: (): void => {
      if (!state.selection && state.hidden.length === 0) return;
      state = { selection: null, hidden: [] };
      notify();
    },
  };
})();
