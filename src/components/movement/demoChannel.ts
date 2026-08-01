// src/components/movement/demoChannel.ts
//
// Arbitration for WHO drives the rig. The movement console (MovementControls)
// is the default driver; the orthopedic-test and myotome demos temporarily take
// over with their own rAF loops. Before this channel existed both loops could
// run at once (play the general movement, then play a test demo) and the rig
// stuttered between two poses every frame.
//
// Contract:
//   - A panel that starts a demo calls start('<ns>:<id>') and animates while it
//     owns the channel; its effect cleanup calls stop(ownId), which releases
//     only if nobody else claimed the rig in the meantime.
//   - The console subscribes: an active demo pauses its playback and suppresses
//     its rigChannel pushes; when the channel clears, the console re-pushes its
//     own state, which restores the pose and wipes the demo-only flags
//     (ghostSkin, resistance).
//   - Console interactions (play, slider, movement change...) call stop() with
//     no id to reclaim the rig, which halts any demo cleanly.
//
// Same module-level pub/sub pattern as rigChannel / dissectChannel.

import { useSyncExternalStore } from 'react';

type Listener = (id: string | null) => void;

export const demoChannel = (() => {
  let active: string | null = null;
  const listeners = new Set<Listener>();
  const notify = () => listeners.forEach((l) => l(active));
  return {
    get: (): string | null => active,
    subscribe: (l: Listener): (() => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    /** Claim the rig for a demo (namespaced id, e.g. "test:jobe"). */
    start: (id: string): void => {
      if (active === id) return;
      active = id;
      notify();
    },
    /**
     * Release the rig. With an id, releases only if that demo still owns it,
     * so a demo's cleanup never clobbers the demo that replaced it.
     */
    stop: (id?: string): void => {
      if (active === null) return;
      if (id !== undefined && active !== id) return;
      active = null;
      notify();
    },
  };
})();

/** The active demo id (or null), as React state. */
export function useActiveDemo(): string | null {
  return useSyncExternalStore(demoChannel.subscribe, demoChannel.get);
}
