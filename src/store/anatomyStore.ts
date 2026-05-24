// src/store/anatomyStore.ts
//
// Global UI/state store (Zustand). Owns: which anatomical layers are visible,
// the side filter, the current region restriction, the selected/hovered mesh,
// the selected MUSCLE (a clinical entity spanning many meshes), the part focus
// (origin/insertion highlighting), the command-palette open state, and pending
// camera-view requests.
//
// IMPORTANT — default layers:
// Skin is a CONTEXT layer that occludes everything behind it, so it is OFF by
// default. Likewise `reference` (1100+ text labels, planes, axes) is OFF by
// default. The model boots showing only real anatomy (bones, muscles,
// ligaments, nerves, vessels, organs), which is what a dissection-style view
// for physiotherapy needs.

import { create } from 'zustand';
import { ANATOMICAL_LAYERS } from '../lib/anatomyMeta';
import type { AnatomyLayer, CameraView } from '../types/anatomy';

/** The side-filter values exposed in the UI. */
export type SideFilter = 'both' | 'right' | 'left';

/**
 * Which attachment of the selected muscle to highlight in 3D. null = none
 * (show the whole muscle uniformly). When set, the meshes of that part glow
 * while the rest of the SAME muscle is dimmed, keeping anatomical context.
 */
export type PartFocus = 'origin' | 'insertion' | null;

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

interface AnatomyState {
  /* ----- layers ----- */
  activeLayers: Set<AnatomyLayer>;
  toggleLayer: (layer: AnatomyLayer) => void;
  setLayer: (layer: AnatomyLayer, on: boolean) => void;

  /* ----- side filter ----- */
  sideFilter: SideFilter;
  setSideFilter: (side: SideFilter) => void;

  /* ----- origin/insertion markers ----- */
  // The model carries small origin (.o) and insertion (.e) marker meshes for
  // every muscle. They're visual clutter in the default dissection view, so
  // they're OFF by default and revealed only when teaching a specific
  // structure's attachments.
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

  /* ----- command palette ----- */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  /* ----- camera ----- */
  cameraRequest: CameraRequest | null;
  requestView: (view: CameraView) => void;

  focusRequest: FocusRequest | null;
  requestFocus: (meshNames: string[]) => void;
}

export const useAnatomyStore = create<AnatomyState>((set) => ({
  /* ----- layers ----- */
  // Boot with ONLY anatomical layers. No skin, no reference labels.
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
  setRegion: (region) => set({ region }),

  /* ----- selection / hover ----- */
  selectedMeshName: null,
  hoveredMeshName: null,
  selectMesh: (meshName) => set({ selectedMeshName: meshName }),
  // Clearing the selection also clears the muscle AND the part focus, so a
  // stale "insertion" focus can't carry over to the next thing selected.
  clearSelection: () =>
    set({ selectedMeshName: null, selectedMuscleId: null, partFocus: null }),
  setHovered: (meshName) => set({ hoveredMeshName: meshName }),

  /* ----- muscle selection ----- */
  selectedMuscleId: null,
  // Switching muscles resets the part focus: "show insertion" shouldn't stay
  // active when you jump from one muscle to another.
  selectMuscle: (muscleId) => set({ selectedMuscleId: muscleId, partFocus: null }),

  /* ----- part focus ----- */
  partFocus: null,
  setPartFocus: (part) => set({ partFocus: part }),
  // Tapping the active part again turns it off (back to "whole muscle").
  togglePartFocus: (part) =>
    set((s) => ({ partFocus: s.partFocus === part ? null : part })),

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
}));
