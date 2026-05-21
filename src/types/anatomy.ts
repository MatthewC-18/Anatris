// src/types/anatomy.ts
//
// Type definitions for the anatomy classification system.
// An AnatomyIndex is built offline by scripts/build-anatomy-index.ts and
// loaded at runtime by useAnatomyIndex to drive visibility and metadata.

/**
 * High-level visibility layer a mesh belongs to.
 */
export type AnatomyLayer =
  | 'bones'
  | 'muscles'
  | 'ligaments'
  | 'nerves'
  | 'vessels'
  | 'organs'
  | 'skin'
  | 'reference'
  | 'uncategorized';

/** Anatomical laterality of a mesh. */
export type Side = 'right' | 'left' | 'center';

/**
 * A single classified mesh entry.
 *
 *   meshName        the exact string returned by THREE.Mesh.name at runtime.
 *                   Primary lookup key used by the viewer.
 *   canonicalName   the original Z-Anatomy node name (dots/spaces preserved).
 *                   Classification rules run against this, and it's what we
 *                   show to humans.
 *   parentNodeName  immediate-parent node name in the glTF hierarchy.
 */
export interface AnatomyEntry {
  meshName: string;
  canonicalName: string;
  parentNodeName?: string;
  materialName: string;
  layer: AnatomyLayer;
  side: Side;
  hiddenByDefault: boolean;
}

/** Per-layer counts kept alongside the entries for quick stats. */
export type LayerCounts = Record<AnatomyLayer, number>;

/** The complete index produced by the build script. */
export interface AnatomyIndex {
  generatedAt: string;
  totalMeshes: number;
  entriesByLayer: LayerCounts;
  entries: AnatomyEntry[];
}

/**
 * Predefined orthographic / isometric camera views used by the viewer toolbar.
 * Numbers double as keyboard shortcuts (1..6).
 */
export type CameraView =
  | 'anterior'
  | 'posterior'
  | 'lateral-right'
  | 'lateral-left'
  | 'superior'
  | 'three-quarter';
