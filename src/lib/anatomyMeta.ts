// src/lib/anatomyMeta.ts
//
// Presentation metadata for layers, sides and views.
// Code is in English; user-facing strings are in Latin American Spanish.

import type { AnatomyLayer, Side, CameraView } from '../types/anatomy';

/** The layers that represent real anatomy (shown by default). */
export const ANATOMICAL_LAYERS: AnatomyLayer[] = [
  'bones',
  'muscles',
  'ligaments',
  'nerves',
  'vessels',
  'organs',
];

/** Layers off by default (skin occludes everything; reference is didactic). */
export const SECONDARY_LAYERS: AnatomyLayer[] = ['skin', 'reference'];

export interface LayerMeta {
  /** Spanish label shown in the UI. */
  label: string;
  /** Tailwind text color used for the layer's accent dot. */
  dot: string;
  /** Short description for tooltips. */
  description: string;
}

export const LAYER_META: Record<AnatomyLayer, LayerMeta> = {
  bones: {
    label: 'Huesos',
    dot: 'bg-slate-200',
    description: 'Tejido óseo y cartílago',
  },
  muscles: {
    label: 'Músculos',
    dot: 'bg-rose-400',
    description: 'Vientres musculares, tendones y fascias',
  },
  ligaments: {
    label: 'Ligamentos',
    dot: 'bg-amber-300',
    description: 'Ligamentos, cápsulas articulares y bolsas',
  },
  nerves: {
    label: 'Nervios',
    dot: 'bg-yellow-300',
    description: 'Sistema nervioso central y periférico',
  },
  vessels: {
    label: 'Vasos',
    dot: 'bg-red-500',
    description: 'Arterias, venas y sistema linfático',
  },
  organs: {
    label: 'Órganos',
    dot: 'bg-fuchsia-400',
    description: 'Vísceras y órganos glandulares',
  },
  skin: {
    label: 'Piel',
    dot: 'bg-orange-200',
    description: 'Sistema tegumentario',
  },
  reference: {
    label: 'Referencias',
    dot: 'bg-cyan-300',
    description: 'Etiquetas, planos y ejes didácticos',
  },
  uncategorized: {
    label: 'Sin clasificar',
    dot: 'bg-slate-500',
    description: 'Estructuras sin categoría asignada',
  },
};

export const SIDE_META: Record<Side, { label: string }> = {
  right: { label: 'Derecho' },
  left: { label: 'Izquierdo' },
  center: { label: 'Central' },
};

export interface ViewMeta {
  /** Spanish label. */
  label: string;
  /** Keyboard shortcut digit. */
  key: string;
  /**
   * Camera direction as a unit-ish vector relative to the framed target.
   * The viewer multiplies this by a fit distance. Y is up.
   */
  dir: [number, number, number];
}

export const VIEW_META: Record<CameraView, ViewMeta> = {
  anterior: { label: 'Anterior', key: '1', dir: [0, 0, 1] },
  posterior: { label: 'Posterior', key: '2', dir: [0, 0, -1] },
  'lateral-right': { label: 'Lateral der.', key: '3', dir: [1, 0, 0] },
  'lateral-left': { label: 'Lateral izq.', key: '4', dir: [-1, 0, 0] },
  superior: { label: 'Superior', key: '5', dir: [0, 1, 0.0001] },
  'three-quarter': { label: '3/4', key: '6', dir: [0.8, 0.35, 0.9] },
};

/** Order in which views appear in the toolbar. */
export const VIEW_ORDER: CameraView[] = [
  'anterior',
  'posterior',
  'lateral-right',
  'lateral-left',
  'superior',
  'three-quarter',
];
