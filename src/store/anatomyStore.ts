// src/store/anatomyStore.ts
//
// Global UI/state store (Zustand). Owns: which anatomical layers are visible,
// the side filter, the current region restriction, the selected/hovered mesh,
// the command-palette open state, and pending camera-view requests.
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
 * A camera-view request. We wrap the view in an object with a monotonically
 * increasing nonce so that requesting the SAME view twice still triggers the
 * effect in Viewer3D (a bare string wouldn't change identity).
 */
export interface CameraRequest {
  view: CameraView;
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

  /* ----- region restriction (null = whole body) ----- */
  region: string | null;
  setRegion: (region: string | null) => void;

  /* ----- selection / hover ----- */
  selectedMeshName: string | null;
  hoveredMeshName: string | null;
  selectMesh: (meshName: string | null) => void;
  clearSelection: () => void;
  setHovered: (meshName: string | null) => void;

  /* ----- command palette ----- */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  /* ----- camera ----- */
  cameraRequest: CameraRequest | null;
  requestView: (view: CameraView) => void;
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

  /* ----- region ----- */
  region: null,
  setRegion: (region) => set({ region }),

  /* ----- selection / hover ----- */
  selectedMeshName: null,
  hoveredMeshName: null,
  selectMesh: (meshName) => set({ selectedMeshName: meshName }),
  clearSelection: () => set({ selectedMeshName: null }),
  setHovered: (meshName) => set({ hoveredMeshName: meshName }),

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
}));
