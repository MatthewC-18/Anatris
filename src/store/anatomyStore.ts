// src/store/anatomyStore.ts
//
// Global UI/state store (Zustand). Owns: which anatomical layers are visible,
// the side filter, the current region restriction, the selected/hovered mesh,
// the selected MUSCLE (a clinical entity spanning many meshes), the part focus
// (origin/insertion highlighting), the command-palette open state, pending
// camera-view requests, and the ROM (range-of-motion) study state.
//
// IMPORTANT — default layers:
// Skin is a CONTEXT layer that occludes everything behind it, so it is OFF by
// default. Likewise `reference` (1100+ text labels, planes, axes) is OFF by
// default. The model boots showing only real anatomy (bones, muscles,
// ligaments, nerves, vessels, organs), which is what a dissection-style view
// for physiotherapy needs.
//
// ROM HIGHLIGHTING (drives the ROM panel + 3D):
// The ROM panel has TWO view modes:
//   - 'movement' (mode A): study a gesture. Pick a movement, then a phase; the
//     phase's muscles light up, each colored by role.
//   - 'muscle' (mode B): study a muscle. Pick a muscle; its participations
//     across movements/phases are listed, and it lights up in 3D.
// Either way, the thing that actually drives 3D highlighting is `romHighlight`,
// a Map<muscleId, RomMuscleRole>. null = no ROM highlight. This is a SEPARATE
// mechanism from `selectedMuscleId` (single-muscle uniform highlight); the
// store keeps them mutually exclusive so they never fight over the same meshes.
//
// ROM FOCUS (hover bridge, mode-agnostic):
// `romFocusMuscleId` is a TRANSIENT spotlight, separate from `romHighlight`. It
// is set on hover (panel chip or 3D mesh) to intensify ONE muscle within the
// current ROM set and reveal its full name on the 3D pin. It never alters
// `romHighlight`, never moves the camera, and never touches the mutual
// exclusion with single-muscle selection. It only modulates INTENSITY (not
// color), mirroring the ROM pulse behaviour so role colors are preserved.
// Because it points into the current ROM set, anything that changes that set
// (new phase, new muscle, clearing ROM) must reset it to null.

import { create } from 'zustand';
import { ANATOMICAL_LAYERS } from '../lib/anatomyMeta';
import type { AnatomyLayer, CameraView } from '../types/anatomy';
import type { RomMuscleRole } from '../types/rom';
import type { ConceptOverlay } from '../types/concept';

/** The side-filter values exposed in the UI. */
export type SideFilter = 'both' | 'right' | 'left';

/**
 * Which attachment of the selected muscle to highlight in 3D. null = none
 * (show the whole muscle uniformly). When set, the meshes of that part glow
 * while the rest of the SAME muscle is dimmed, keeping anatomical context.
 */
export type PartFocus = 'origin' | 'insertion' | null;

/** How the ROM panel is being explored: by gesture, or by muscle. */
export type RomViewMode = 'movement' | 'muscle';

/**
 * A camera-view request. We wrap the view in an object with a monotonically
 * increasing nonce so that requesting the SAME view twice still triggers the
 * effect in Viewer3D (a bare string wouldn't change identity).
 */
export interface CameraRequest {
  view: CameraView;
  nonce: number;
}

/**
 * A request to frame the camera on a specific set of meshes (e.g. the meshes
 * of a selected muscle). Nonce works the same way as CameraRequest.
 */
export interface FocusRequest {
  meshNames: string[];
  nonce: number;
}

/**
 * Identifies which ROM phase is active: the movement id plus the index of the
 * phase within that movement's `phases` array. null = no phase active.
 */
export interface RomSelection {
  movementId: string;
  phaseIndex: number;
}

interface AnatomyState {
  /* ----- layers ----- */
  activeLayers: Set<AnatomyLayer>;
  toggleLayer: (layer: AnatomyLayer) => void;
  setLayer: (layer: AnatomyLayer, on: boolean) => void;

  /* ----- side filter ----- */
  sideFilter: SideFilter;
  setSideFilter: (side: SideFilter) => void;

  /* ----- origin/insertion markers ----- */
  showOriginInsertion: boolean;
  setShowOriginInsertion: (on: boolean) => void;
  toggleOriginInsertion: () => void;

  /* ----- region restriction (null = whole body) ----- */
  region: string | null;
  setRegion: (region: string | null) => void;

  /* ----- selection / hover ----- */
  selectedMeshName: string | null;
  hoveredMeshName: string | null;
  selectMesh: (meshName: string | null) => void;
  clearSelection: () => void;
  setHovered: (meshName: string | null) => void;

  /* ----- muscle selection (clinical entity, spans many meshes) ----- */
  selectedMuscleId: string | null;
  selectMuscle: (muscleId: string | null) => void;

  /* ----- part focus (highlight origin / insertion of selected muscle) ----- */
  partFocus: PartFocus;
  setPartFocus: (part: PartFocus) => void;
  togglePartFocus: (part: Exclude<PartFocus, null>) => void;

  /* ----- ROM (range of motion) ----- */
  romViewMode: RomViewMode;
  setRomViewMode: (mode: RomViewMode) => void;
  romSelection: RomSelection | null;
  romMuscleId: string | null;
  romHighlight: Map<string, RomMuscleRole> | null;
  romFocusMuscleId: string | null; // NEW — transient hover spotlight
  setRomPhase: (
    movementId: string,
    phaseIndex: number,
    muscles: Map<string, RomMuscleRole>,
  ) => void;
  setRomMuscle: (
    muscleId: string,
    muscles: Map<string, RomMuscleRole>,
  ) => void;
  setRomFocusMuscle: (muscleId: string | null) => void; // NEW
  clearRom: () => void;

  /* ----- command palette ----- */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  /* ----- camera ----- */
  cameraRequest: CameraRequest | null;
  requestView: (view: CameraView) => void;

  focusRequest: FocusRequest | null;
  requestFocus: (meshNames: string[]) => void;

  /* ----- concept overlay (Fundamentos: planes / axes over the model) ----- */
  conceptOverlay: ConceptOverlay;
  requestConceptOverlay: (overlay: ConceptOverlay) => void;
}

export const useAnatomyStore = create<AnatomyState>((set) => ({
  /* ----- layers ----- */
  activeLayers: new Set<AnatomyLayer>(ANATOMICAL_LAYERS),

  toggleLayer: (layer) =>
    set((s) => {
      const next = new Set(s.activeLayers);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return { activeLayers: next };
    }),

  setLayer: (layer, on) =>
    set((s) => {
      const next = new Set(s.activeLayers);
      if (on) next.add(layer);
      else next.delete(layer);
      return { activeLayers: next };
    }),

  /* ----- side filter ----- */
  sideFilter: 'both',
  setSideFilter: (side) => set({ sideFilter: side }),

  /* ----- origin/insertion markers (off by default) ----- */
  showOriginInsertion: false,
  setShowOriginInsertion: (on) => set({ showOriginInsertion: on }),
  toggleOriginInsertion: () =>
    set((s) => ({ showOriginInsertion: !s.showOriginInsertion })),

  /* ----- region ----- */
  region: null,
  // Leaving the concept module (or switching regions) drops any concept overlay
  // so planes/axes never linger over an anatomical region.
  setRegion: (region) =>
    set((s) => ({
      region,
      conceptOverlay: region === 'fundamentos' ? s.conceptOverlay : 'none',
    })),

  /* ----- selection / hover ----- */
  selectedMeshName: null,
  hoveredMeshName: null,
  selectMesh: (meshName) =>
    set({ selectedMeshName: meshName, romSelection: null, romHighlight: null, romFocusMuscleId: null }),
  clearSelection: () =>
    set({
      selectedMeshName: null,
      selectedMuscleId: null,
      partFocus: null,
      romSelection: null,
      romHighlight: null,
      romFocusMuscleId: null,
    }),
  setHovered: (meshName) => set({ hoveredMeshName: meshName }),

  /* ----- muscle selection ----- */
  selectedMuscleId: null,
  // Switching muscles resets the part focus AND the ROM phase highlight. Note
  // we do NOT clear romMuscleId here — the "by muscle" ROM view intentionally
  // follows the selected muscle (see RomPanel).
  selectMuscle: (muscleId) =>
    set({ selectedMuscleId: muscleId, partFocus: null, romSelection: null, romHighlight: null, romFocusMuscleId: null }),

  /* ----- part focus ----- */
  partFocus: null,
  setPartFocus: (part) => set({ partFocus: part }),
  togglePartFocus: (part) =>
    set((s) => ({ partFocus: s.partFocus === part ? null : part })),

  /* ----- ROM ----- */
  romViewMode: 'movement',
  setRomViewMode: (mode) => set({ romViewMode: mode }),
  romSelection: null,
  romMuscleId: null,
  romHighlight: null,
  romFocusMuscleId: null, // NEW
  setRomPhase: (movementId, phaseIndex, muscles) =>
    set({
      romSelection: { movementId, phaseIndex },
      romMuscleId: null,
      romHighlight: muscles,
      romFocusMuscleId: null, // NEW — a new phase invalidates any hover spotlight
      selectedMuscleId: null,
      selectedMeshName: null,
      partFocus: null,
    }),
  setRomMuscle: (muscleId, muscles) =>
    set({
      romMuscleId: muscleId,
      romSelection: null,
      romHighlight: muscles,
      romFocusMuscleId: null, // NEW — a new studied muscle invalidates the spotlight
      selectedMuscleId: null,
      selectedMeshName: null,
      partFocus: null,
    }),
  // NEW — transient hover spotlight. Does not touch romHighlight / selection /
  // camera. Safe to call with null to clear.
  setRomFocusMuscle: (muscleId) => set({ romFocusMuscleId: muscleId }),
  clearRom: () =>
    set({ romSelection: null, romMuscleId: null, romHighlight: null, romFocusMuscleId: null }), // NEW reset

  /* ----- command palette ----- */
  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),

  /* ----- camera ----- */
  cameraRequest: null,
  requestView: (view) =>
    set((s) => ({
      cameraRequest: {
        view,
        nonce: (s.cameraRequest?.nonce ?? 0) + 1,
      },
    })),

  focusRequest: null,
  requestFocus: (meshNames) =>
    set((s) => ({
      focusRequest: {
        meshNames,
        nonce: (s.focusRequest?.nonce ?? 0) + 1,
      },
    })),

  /* ----- concept overlay -----
   * Persistent flag (NOT a nonce-style request): the overlay stays drawn while
   * the section that asked for it is active, and is cleared when leaving the
   * concept module. ConceptTrackView already calls this defensively. */
  conceptOverlay: 'none',
  requestConceptOverlay: (overlay) => set({ conceptOverlay: overlay }),
}));
