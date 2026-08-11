// src/components/movement/dissectChannel.ts
//
// Click-to-dissect bus for the movement lab. This is how the professional /
// "Complete Anatomy" interaction works here:
//
//   1. The user CLICKS a muscle on the rig -> RigModel raycasts, resolves the
//      clinical muscle, measures WHICH SIDE of the body the clicked mesh sits on
//      (and which sides that structure exists on), and writes the SELECTION here.
//   2. The DOM DissectionPanel reads the selection and shows the structure with a
//      side switch (Izquierdo / Derecho / Ambos) plus the two actions.
//   3. "Diseccionar" pushes the structure + THE CHOSEN SIDE onto the hidden list;
//      RigModel hides only the meshes on that side, so the left pectoral can be
//      peeled while the right one stays. "Aislar" does the inverse: everything
//      else in the muscle/connective layers steps back so one structure is left
//      alone on the skeleton.
//   4. The tray restores one structure, the last one, or all of them.
//
// SIDE IS GEOMETRIC, NOT NOMINAL. Z-Anatomy names laterality inconsistently: many
// meshes carry no l/r suffix at all and encode the second side as a Blender
// duplicate tail ("..._muscle" / "..._muscle001"), and a few forearm patches are
// named for the opposite limb. Trusting the name is exactly why a dissection used
// to take BOTH pectorals away. RigModel therefore tags every peelable mesh with
// the side its world center falls on, and this module only ever compares those
// tags (see `scopeFromSides`, `meshIsDissected`, `meshIsIsolatedOut`).
//
// Same module-level pub/sub pattern as rigChannel / layerChannel, so no ref
// crosses the <Canvas>. One writer per field: RigModel writes `selection`; the
// DOM triggers the mutators; both sides subscribe to render.
//
// ASCII-only source; UI strings live in the panel; no `any`.

import { parseMeshName, type ParsedSide } from '../../lib/parseMeshName';
import { muscleDepthLevel, MUSCLE_PLANE_LABELS } from '../../lib/muscleDepth';
import type { Muscle } from '../../types/muscle';
// Usage signal only: which of the two dissection actions gets used, never WHICH
// structure. Fired from the mutators so the keyboard shortcuts (D / A) and the
// panel buttons are both covered by one call site each.
import { EVENTS, track } from '../../lib/analytics';

/** Which peelable tissue a clicked mesh belongs to (never skin/hidden here). */
export type DissectLayer = 'muscle' | 'connective' | 'bone';

/** What a dissect/isolate action acts on: one side, or the whole structure. */
export type DissectScope = 'left' | 'right' | 'both';

/** How many meshes a structure has on each side of the body. */
export interface StructureSides {
  left: number;
  right: number;
  center: number;
}

/** A resolved click: everything the card + the hide logic need. */
export interface DissectSelection {
  /** The exact mesh clicked (for reference / re-highlight). */
  meshName: string;
  /** Stable identity of the selected structure (muscle id, or parsed base). */
  id: string;
  /** parseMeshName bases whose meshes form this structure (both sides). */
  bases: string[];
  /** Geometric laterality of the clicked mesh (where it sits, not what it is called). */
  side: ParsedSide;
  /** Mesh counts per side, so the panel knows whether a side switch makes sense. */
  sides: StructureSides;
  /** True when the structure really exists on both sides (the switch is offered). */
  bilateral: boolean;
  /** What the next action acts on. Starts at the clicked side; the user can widen it. */
  scope: DissectScope;
  /** Display name (Spanish clinical name when catalogued, else prettified base). */
  label: string;
  /** Latin / TA name when catalogued. */
  latin: string | null;
  /** Short clinical note when catalogued. */
  note: string | null;
  /** Dissection plane label ('Superficial' | 'Intermedio' | 'Profundo'), muscle only. */
  planeLabel: string | null;
  /** Human side label of the clicked mesh, or null for a midline structure. */
  sideLabel: string | null;
  /** The tissue layer clicked. */
  layer: DissectLayer;
  /** Whether this structure can be dissected away (muscle / connective, not bone). */
  dissectable: boolean;
}

/** One structure that has been peeled away, on a given side. */
export interface HiddenEntry {
  /** Identity of the removal itself: same structure, different side = different entry. */
  key: string;
  id: string;
  label: string;
  bases: string[];
  scope: DissectScope;
}

/** The single structure currently shown alone (everything else steps back). */
export interface IsolateEntry {
  id: string;
  label: string;
  bases: string[];
  scope: DissectScope;
}

export interface DissectState {
  selection: DissectSelection | null;
  hidden: HiddenEntry[];
  isolated: IsolateEntry | null;
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

/** Short scope label for chips and the tray ("Pectoral mayor, izquierdo"). */
export const SCOPE_LABEL: Record<DissectScope, string> = {
  left: 'izquierdo',
  right: 'derecho',
  both: 'ambos lados',
};

/**
 * The scope a click should START at. A structure that exists on both sides opens
 * scoped to the side that was clicked, which is the whole point: clicking the
 * left pectoral must offer to remove the left pectoral. Anything that lives on
 * one side only (or on the midline) has nothing to choose, so it opens whole.
 */
export function scopeFromSides(clicked: ParsedSide, sides: StructureSides): DissectScope {
  const bilateral = sides.left > 0 && sides.right > 0;
  if (!bilateral) return 'both';
  return clicked === 'center' ? 'both' : clicked;
}

/**
 * Build a selection from a clicked mesh, its tissue layer, the clinical muscle it
 * resolves to, and the geometry RigModel measured (the clicked mesh's real side
 * plus the per-side mesh counts of the whole structure). Centralizes all the
 * display formatting so RigModel just raycasts and hands off.
 */
export function makeSelection(
  meshName: string,
  layer: DissectLayer,
  muscle: Muscle | undefined,
  clickedSide: ParsedSide = parseMeshName(meshName).side,
  sides: StructureSides = { left: 0, right: 0, center: 0 },
): DissectSelection {
  const parsed = parseMeshName(meshName);
  const dissectable = layer === 'muscle' || layer === 'connective';
  const planeLabel =
    layer === 'muscle' ? MUSCLE_PLANE_LABELS[muscleDepthLevel(meshName)] : null;
  const bilateral = sides.left > 0 && sides.right > 0;
  const common = {
    meshName,
    side: clickedSide,
    sides,
    bilateral,
    scope: scopeFromSides(clickedSide, sides),
    planeLabel,
    sideLabel: SIDE_LABEL[clickedSide],
    layer,
    dissectable,
  };
  if (muscle) {
    return {
      ...common,
      id: muscle.id,
      bases: muscle.meshBases.length ? muscle.meshBases : [parsed.base],
      label: muscle.name,
      latin: muscle.latin,
      note: muscle.clinicalNote ?? null,
    };
  }
  return {
    ...common,
    id: parsed.base,
    bases: [parsed.base],
    label: prettifyBase(parsed.base),
    latin: null,
    note: null,
  };
}

/**
 * Does a mesh (its parsed base + GEOMETRIC side) fall under any hidden entry?
 *
 * A side-scoped removal takes that side only: the midline slivers some bellies
 * ship stay put, and the opposite limb is never touched. Only a 'both' removal
 * clears the structure whole.
 */
export function meshIsDissected(
  base: string,
  side: ParsedSide,
  hidden: HiddenEntry[],
): boolean {
  for (const h of hidden) {
    if (!h.bases.includes(base)) continue;
    if (h.scope === 'both' || h.scope === side) return true;
  }
  return false;
}

/**
 * With one structure isolated, every OTHER peelable mesh steps back. Returns
 * true when this mesh is one of those (i.e. it must be hidden). A side-scoped
 * isolation keeps only that side, so "aislar el bíceps izquierdo" leaves exactly
 * one muscle standing on the skeleton.
 */
export function meshIsIsolatedOut(
  base: string,
  side: ParsedSide,
  isolated: IsolateEntry | null,
): boolean {
  if (!isolated) return false;
  if (!isolated.bases.includes(base)) return true;
  if (isolated.scope === 'both') return false;
  return side !== isolated.scope;
}

/** Identity of a removal: the structure AND the side it was taken from. */
function entryKey(id: string, scope: DissectScope): string {
  return `${id}:${scope}`;
}

export const dissectChannel = (() => {
  let state: DissectState = { selection: null, hidden: [], isolated: null };
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
    /**
     * Retarget the pending action (the panel's side switch). The highlight on the
     * model follows, so the user sees which side will go before pressing.
     */
    setScope: (scope: DissectScope): void => {
      const sel = state.selection;
      if (!sel || sel.scope === scope) return;
      state = { ...state, selection: { ...sel, scope } };
      notify();
    },
    /** Peel the selected structure away on the selected side. */
    dissectSelected: (): void => {
      const sel = state.selection;
      if (!sel || !sel.dissectable) return;
      const key = entryKey(sel.id, sel.scope);
      if (state.hidden.some((h) => h.key === key)) {
        state = { ...state, selection: null };
        notify();
        return;
      }
      // A whole-structure removal absorbs the per-side ones already taken, so the
      // tray never lists "left pectoral" underneath "pectoral".
      const kept =
        sel.scope === 'both' ? state.hidden.filter((h) => h.id !== sel.id) : state.hidden;
      const hidden = [
        ...kept,
        { key, id: sel.id, label: sel.label, bases: sel.bases, scope: sel.scope },
      ];
      state = { ...state, selection: null, hidden };
      track(EVENTS.dissectionUsed, { action: 'dissect' });
      notify();
    },
    /**
     * Show a muscle alone WITHOUT a click on the model.
     *
     * `isolateSelected` needs a selection, and a selection only exists after a
     * raycast hit, so isolating used to mean finding the muscle on the rig
     * yourself. That is the wrong way round during a movement: the readout has
     * just told you which muscle is working at this angle, and a physio reviewing
     * the lab asked to isolate exactly that one ("en el mov deberian aislarse los
     * musculos"). This lets the readout act on what it names.
     *
     * Scope is always 'both': the readout speaks about a muscle, not about a side.
     * Isolating the same muscle again clears it, so the name toggles.
     */
    isolateMuscle: (id: string, label: string, bases: string[]): void => {
      if (!bases.length) return;
      if (state.isolated?.id === id) {
        state = { ...state, isolated: null };
        notify();
        return;
      }
      state = {
        ...state,
        selection: null,
        isolated: { id, label, bases, scope: 'both' },
      };
      track(EVENTS.dissectionUsed, { action: 'isolate' });
      notify();
    },
    /** Show the selected structure alone (replaces any previous isolation). */
    isolateSelected: (): void => {
      const sel = state.selection;
      if (!sel || !sel.dissectable) return;
      state = {
        ...state,
        selection: null,
        isolated: { id: sel.id, label: sel.label, bases: sel.bases, scope: sel.scope },
      };
      track(EVENTS.dissectionUsed, { action: 'isolate' });
      notify();
    },
    /** Leave isolation, bringing the rest of the tissue back. */
    clearIsolate: (): void => {
      if (!state.isolated) return;
      state = { ...state, isolated: null };
      notify();
    },
    /** Bring back one specific removal from the tray. */
    restoreOne: (key: string): void => {
      if (!state.hidden.some((h) => h.key === key)) return;
      state = { ...state, hidden: state.hidden.filter((h) => h.key !== key) };
      notify();
    },
    /** Bring back the most recently peeled structure. */
    restoreLast: (): void => {
      if (state.hidden.length === 0) return;
      state = { ...state, hidden: state.hidden.slice(0, -1) };
      notify();
    },
    /** Bring back every peeled structure and leave isolation. */
    restoreAll: (): void => {
      if (state.hidden.length === 0 && !state.isolated) return;
      state = { ...state, hidden: [], isolated: null };
      notify();
    },
    /** Full reset (selection + hidden + isolation), e.g. on region change / unmount. */
    reset: (): void => {
      if (!state.selection && state.hidden.length === 0 && !state.isolated) return;
      state = { selection: null, hidden: [], isolated: null };
      notify();
    },
  };
})();
