// src/components/movement/neuroSkinChannel.ts
//
// What the neuro panel wants painted on the 3D body's skin. Same module-level
// pub/sub pattern as rigChannel / demoChannel / dissectChannel.
//
// Why a channel and not a prop: the panel lives in the DOM overlay and the skin
// lives inside the <Canvas>, two React trees that never meet. Every other
// cross-boundary signal in the lab already travels this way.
//
// The payload is deliberately tiny -- a figure and a list of root ids -- so the
// panel does not have to know anything about meshes, materials or pigments. The
// in-canvas layer owns all of that.

import { useSyncExternalStore } from 'react';
import type { PlateFigure } from '../../data/neuro/plate';

export interface NeuroSkinCommand {
  /** Which limb's map, or null when nothing should be painted. */
  figure: PlateFigure | null;
  /** Roots PAINTED on the skin, in the panel's own order. Empty paints nothing. */
  roots: string[];
  /**
   * Roots the user has PICKED. Distinct from `roots` since the body became the
   * dermatome chart: with nothing picked the panel paints EVERY root (the whole
   * map), and the stage needs to tell "the chart" from "this one root".
   */
  picked: string[];
}

const EMPTY: NeuroSkinCommand = { figure: null, roots: [], picked: [] };

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

type Listener = (cmd: NeuroSkinCommand) => void;

export const neuroSkinChannel = (() => {
  let current: NeuroSkinCommand = EMPTY;
  const listeners = new Set<Listener>();
  const notify = () => listeners.forEach((l) => l(current));
  return {
    get: (): NeuroSkinCommand => current,
    subscribe: (l: Listener): (() => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    /**
     * Publish a selection. Compared by VALUE before notifying: the panel
     * re-renders on every hover and grade, and the in-canvas layer does real work
     * (material swaps across dozens of meshes) on each change.
     */
    set: (cmd: { figure: PlateFigure | null; roots: string[]; picked?: string[] }): void => {
      const picked = cmd.picked ?? cmd.roots;
      if (
        current.figure === cmd.figure &&
        same(current.roots, cmd.roots) &&
        same(current.picked, picked)
      ) {
        return;
      }
      current = { figure: cmd.figure, roots: [...cmd.roots], picked: [...picked] };
      notify();
    },
    /** Stop painting (panel closed, region without a neuro screen, unmount). */
    clear: (): void => {
      if (current === EMPTY || (current.figure === null && current.roots.length === 0)) return;
      current = EMPTY;
      notify();
    },
  };
})();

/** The current command, as React state. */
export function useNeuroSkin(): NeuroSkinCommand {
  return useSyncExternalStore(neuroSkinChannel.subscribe, neuroSkinChannel.get);
}
