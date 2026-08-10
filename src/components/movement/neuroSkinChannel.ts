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
  /** Selected roots, in the panel's own order. Empty means paint nothing. */
  roots: string[];
}

const EMPTY: NeuroSkinCommand = { figure: null, roots: [] };

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
    set: (cmd: NeuroSkinCommand): void => {
      if (
        current.figure === cmd.figure &&
        current.roots.length === cmd.roots.length &&
        current.roots.every((r, i) => r === cmd.roots[i])
      ) {
        return;
      }
      current = { figure: cmd.figure, roots: [...cmd.roots] };
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
