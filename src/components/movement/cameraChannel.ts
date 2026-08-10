// src/components/movement/cameraChannel.ts
//
// Camera bus for the movement lab. Same module-level pub/sub pattern as
// rigChannel / dissectChannel / demoChannel, so no ref has to cross the
// <Canvas> boundary: the DOM toolbar writes here and the in-canvas framer
// (RigViewer) subscribes.
//
// WHY THE LAB NEEDS ONE AT ALL
//
// Until now the lab's camera had exactly one behaviour: on load, frame every
// skinned mesh in the rig — i.e. the whole standing body — and then never touch
// the distance again. Measured on a 1920x1080 screen that left the model's
// silhouette covering 5.4% of the canvas between the panels, and the shoulder
// under study perhaps 2%. It is worse the bigger the monitor, and worst of all
// on the knee, where the joint is a 130px speck at the bottom of a full figure.
//
// So the lab now frames the JOINT BEING STUDIED, and the user needs a way to
// say otherwise — pull back to the whole body, or re-centre after orbiting off
// into space. There was no way to do either: the six camera views and their
// 1..6 shortcuts live in ViewToolbar, which App only mounts in Explorar.
//
// ASCII-only source; UI strings live in the toolbar.

/**
 * Named camera stations the lab offers. Fewer than Explorar's six on purpose:
 * these are the four a physio actually names when describing a movement.
 *
 * `default` is not a station of its own — it means "whichever of these best
 * shows the active movement's plane", resolved by the framer against the
 * movement data (sagittal reads side-on, transverse from above, frontal from
 * the front). It is what `recenter()` asks for.
 */
export type LabView = 'anterior' | 'posterior' | 'lateral' | 'superior' | 'default';

/** What the camera fits to. */
export type LabFraming =
  /** The joint the active movement drives, plus enough limb to read it. */
  | 'region'
  /** The entire rig, head to feet — the old behaviour, kept as an escape hatch. */
  | 'body';

export interface LabCameraState {
  framing: LabFraming;
  /**
   * A pending view request the framer consumes. Null when there is nothing
   * outstanding — the framer clears it after applying, so a second press of the
   * same button fires again.
   */
  view: LabView | null;
  /**
   * Bumped on every explicit user request. The framer keys its "have I already
   * framed this?" guard on it, which is what makes "Recentrar" work even when
   * nothing else changed — the user has orbited away and wants the SAME framing
   * re-applied.
   */
  nonce: number;
}

const INITIAL: LabCameraState = { framing: 'region', view: null, nonce: 0 };

export const cameraChannel = (() => {
  let state: LabCameraState = { ...INITIAL };
  const listeners = new Set<(s: LabCameraState) => void>();
  const notify = () => listeners.forEach((l) => l(state));

  return {
    get: (): LabCameraState => state,
    subscribe: (l: (s: LabCameraState) => void): (() => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },

    /** Switch between the joint close-up and the whole body. */
    setFraming: (framing: LabFraming): void => {
      if (state.framing === framing) return;
      state = { ...state, framing, nonce: state.nonce + 1 };
      notify();
    },

    /**
     * "I orbited off, get me back": re-apply the framing AND restore the
     * movement's default orientation.
     *
     * The orientation half is not optional, which cost a debugging round to
     * learn. camera-controls' `fitToBox` moves the target and the distance but
     * deliberately PRESERVES the current angles, so a recentre after the user
     * had spun below the floor produced a perfectly framed box viewed from
     * underneath — measured: target (0.02, 1.19, 0.13), camera (0.02, -0.15,
     * 0.13). Geometrically correct, useless to a clinician. Someone reaching for
     * this button is telling you the ANGLE is wrong at least as often as the
     * zoom, so `view: 'default'` asks the framer to re-derive the station from
     * the movement's plane, exactly as the lab does when the arc is first
     * selected.
     */
    recenter: (): void => {
      state = { ...state, view: 'default', nonce: state.nonce + 1 };
      notify();
    },

    /** Ask for a named station. Consumed (and cleared) by the framer. */
    requestView: (view: LabView): void => {
      state = { ...state, view, nonce: state.nonce + 1 };
      notify();
    },

    /** The framer calls this once it has applied a pending view. */
    consumeView: (): void => {
      if (state.view == null) return;
      state = { ...state, view: null };
      notify();
    },

    /**
     * Back to defaults. Called on region change and on lab unmount so a new
     * joint never inherits the previous one's "cuerpo completo" or a stale view
     * request.
     */
    reset: (): void => {
      if (state.framing === INITIAL.framing && state.view == null) return;
      state = { ...INITIAL, nonce: state.nonce + 1 };
      notify();
    },
  };
})();
