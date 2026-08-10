// src/components/movement/RigViewer.tsx
//
// Dedicated canvas for the movement lab: renders ONLY the skinned biomechanical
// rig (cuerpo-rig.glb) and drives it through rigChannel. Kept separate from the
// main Viewer3D so the heavy master atlas and the rig never load or overlap at
// once, and so the rig's real skeletal deformation is the whole show.
//
// Self-contained: own lighting (same analytic setup as Viewer3D, no network),
// own CameraControls, and a one-shot auto-fit onto the rig once it streams in.

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  AdaptiveDpr,
  AdaptiveEvents,
  CameraControls,
  Environment,
  Lightformer,
  useProgress,
} from '@react-three/drei';
import * as THREE from 'three';
import { RigModel, rigChannel } from './RigModel';
import { movementById } from '../../data/romByRegion';
import { RigOverlays } from './RigOverlays';
import { ShoulderRhythmArc } from './ShoulderRhythmArc';
import { NeuroSkinLayer } from './NeuroSkinLayer';
import { cameraChannel, type LabView } from './cameraChannel';
import { focalPaddingLeft, movementFocusBox } from './labFraming';
import { useIsCompact } from '../../hooks/useIsCompact';

// The rig is 1300+ skinned meshes; skinning is vertex-heavy and each mesh is a
// draw call. Cap DPR low so mid-range physio laptops stay smooth -- geometry,
// not render resolution, is what makes this model read.
//
// PHONES GET THEIR OWN BUDGET. A laptop absorbs 1.25x with MSAA; a phone paints
// those same 1300 draw calls onto a 3x panel with a fraction of the fill rate,
// and playback turned into the stutter the user reported. At 1x without MSAA the
// still frame is barely distinguishable at arm's length and the sweep actually
// runs. Geometry is what carries this model, not resolution.
const RIG_DPR: [number, number] = [1, 1.25];
const RIG_DPR_COMPACT: [number, number] = [1, 1];

/** World-space box of the rig's body, i.e. the visible skinned meshes only.
 *
 *  The rig GLB also carries far-away Z-Anatomy text/label panels ("VENOUS
 *  SYSTEM", ...) that are plain meshes; including them blows up the bounding box
 *  and shrinks the body to a dot off to the side. The body is the SkinnedMesh
 *  set. */
function bodyBoxOf(scene: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh || !m.visible) return;
    tmp.setFromObject(m);
    if (isFinite(tmp.min.x) && !tmp.isEmpty()) box.union(tmp);
  });
  return box;
}

/** Azimuth / polar for each named station, in camera-controls terms. */
const VIEW_ANGLES: Record<Exclude<LabView, 'default'>, { azimuth: number; polar: number }> = {
  anterior: { azimuth: 0, polar: Math.PI / 2 },
  posterior: { azimuth: Math.PI, polar: Math.PI / 2 },
  lateral: { azimuth: Math.PI / 2, polar: Math.PI / 2 },
  superior: { azimuth: 0, polar: 0.35 },
};

/**
 * The station that best reads a movement, from its clinical plane. Same mapping
 * RigOverlays uses to orient the camera when an arc is first selected, so
 * "Recentrar" returns you to the view the lab chose for you rather than to some
 * arbitrary front-on default.
 */
function defaultViewFor(movementId: string | null): Exclude<LabView, 'default'> {
  const plane = movementById(movementId)?.plane ?? '';
  if (plane === 'Sagital') return 'lateral';
  if (plane === 'Transversal') return 'superior';
  return 'anterior';
}

/**
 * Frame the camera on the JOINT the active movement drives, and re-frame when
 * that movement, the side, the canvas shape or the user's own request changes.
 *
 * WHAT CHANGED AND WHY
 *
 * This used to be `AutoFit`: a one-shot fit onto every skinned mesh, i.e. the
 * whole standing body, for every region. That is what left 95% of the canvas
 * empty and the studied joint at a few percent of the frame (the numbers are in
 * labFraming.ts). It now asks `movementFocusBox` where the joint is and fits
 * that instead, falling back to the whole body whenever the movement cannot be
 * located — an unmapped id, the rest pose, or a rig that has not finished
 * loading — so the worst case is exactly the old behaviour.
 *
 * `refitKey` still exists for the compact layout: there the canvas is a flex row
 * above the control sheet, so opening or collapsing the sheet changes the canvas
 * box by a third of the screen. r3f's resize handling only updates the
 * projection aspect, it does not re-frame, and the visible result was the arm
 * sliding out of the left edge partway through an abduction sweep.
 *
 * ORIENTATION IS NOT OURS. RigOverlays already turns the camera to the gesture's
 * plane on movement change (`frameForPlane`), and `fitToBox` deliberately only
 * moves the target and dollies — it preserves the current orientation, so the
 * two compose instead of fighting. The one exception is an explicit view request
 * from the toolbar, which is the user overriding that choice on purpose.
 */
function MovementFramer({ refitKey }: { refitKey?: string | number }) {
  const { scene, size } = useThree();
  const controls = useThree((s) => s.controls) as CameraControls | null;
  const compact = useIsCompact();

  // What the last applied fit was keyed on. A fit re-runs when any part of this
  // changes -- including `nonce`, which is how "Recentrar" re-applies a framing
  // that is otherwise identical to the one already on screen.
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!controls) return;

    let raf1 = 0;
    let raf2 = 0;
    let disposed = false;

    const apply = (transition: boolean): void => {
      const cam = cameraChannel.get();
      const cmd = rigChannel.get();
      const key = [
        cameraChannel.get().framing,
        cmd.movementId ?? 'rest',
        cmd.side,
        refitKey ?? '',
        cam.nonce,
        size.width,
        size.height,
      ].join('|');
      if (appliedRef.current === key) return;

      scene.updateWorldMatrix(true, true);
      const body = bodyBoxOf(scene);
      // Nothing loaded yet: leave the guard unset so the next command retries.
      if (body.isEmpty() || !isFinite(body.min.x)) return;

      const focus =
        cam.framing === 'region'
          ? movementFocusBox(scene, cmd.movementId, cmd.side, body)
          : null;
      const box = focus ?? body;

      appliedRef.current = key;

      // A station request rotates BEFORE the fit, so the dolly lands on the new
      // angle. It has to happen here and not only in RigOverlays because
      // `fitToBox` preserves whatever orientation the camera currently has: a
      // fit alone would faithfully re-frame the joint as seen from under the
      // floor, which is where an orbiting user usually ends up.
      if (cam.view) {
        const view = cam.view === 'default' ? defaultViewFor(cmd.movementId) : cam.view;
        const { azimuth, polar } = VIEW_ANGLES[view];
        // Mirror the azimuth for a left-sided movement so "lateral" always means
        // "from the driven limb's side", never through the trunk.
        const signed = view === 'lateral' && cmd.side === 'L' ? -azimuth : azimuth;
        void controls.rotateTo(signed, polar, transition);
        cameraChannel.consumeView();
      }

      const boxH = box.getSize(new THREE.Vector3()).y;
      const pad = boxH * 0.06;
      void controls.fitToBox(box, transition, {
        paddingTop: pad,
        paddingBottom: pad,
        // Bias the subject out from under the floating console. No-op on
        // compact, where the console is a bottom sheet.
        paddingLeft: pad + focalPaddingLeft(boxH, size.height, compact),
        paddingRight: pad,
      });
    };

    // Two frames of grace on the FIRST fit: the rig's skinned meshes only get
    // their real world bounds after the skeleton has been posed once.
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!disposed) apply(false);
      });
    });

    const offCamera = cameraChannel.subscribe(() => apply(true));
    const offRig = rigChannel.subscribe(() => apply(true));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      offCamera();
      offRig();
    };
  }, [controls, scene, refitKey, size.width, size.height, compact]);

  return null;
}

/**
 * DOUBLE-CLICK TO FOCUS. Free-navigation companion to dollyToCursor: double-click
 * any muscle/bone and the camera flies in and frames THAT structure, so you can
 * inspect any part up close without hunting with the wheel. Skin (body envelope +
 * distal caps) is skipped so you focus the structure underneath, not the glass
 * shell. Skinned-mesh raycasting is CPU work, but a double-click is rare.
 */
function DoubleClickFocus() {
  const { scene, camera, gl } = useThree();
  const controls = useThree((s) => s.controls) as CameraControls | null;

  useEffect(() => {
    if (!controls) return;
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const box = new THREE.Box3();

    const onDblClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const hit = hits.find((h) => {
        const m = h.object as THREE.Mesh;
        // Only solid anatomy: skip the translucent skin shell and its distal caps
        // so the click lands on the muscle/bone the user is pointing at.
        return (
          m.isMesh &&
          m.visible &&
          m.userData.rigLayer !== 'skin' &&
          m.userData.rigLayer !== 'hidden'
        );
      });
      if (!hit) return;
      box.setFromObject(hit.object);
      if (box.isEmpty() || !isFinite(box.min.x)) return;
      void controls.fitToBox(box, true, {
        paddingTop: 0.35,
        paddingBottom: 0.35,
        paddingLeft: 0.35,
        paddingRight: 0.35,
      });
    };

    el.addEventListener('dblclick', onDblClick);
    return () => el.removeEventListener('dblclick', onDblClick);
  }, [controls, scene, camera, gl]);

  return null;
}

/**
 * Premium studio lighting baked into an image-based environment. Pure
 * Lightformers (no HDR file -> fully offline), rendered ONCE (frames={1}) into a
 * small env map: a broad key softbox, a cool fill, and two rim strips that trace
 * the bone/muscle silhouettes with a soft pearly highlight. Materials pick this
 * up through their envMapIntensity. `background={false}` keeps our CSS gradient.
 */
function StudioEnvironment() {
  return (
    <Environment frames={1} resolution={256} background={false}>
      {/* Key: large warm-neutral softbox, front-high-right. */}
      <Lightformer
        form="rect"
        intensity={2.4}
        color="#fff6ec"
        position={[3, 4, 5]}
        scale={[8, 8, 1]}
        target={[0, 1, 0]}
      />
      {/* Fill: cool, opposite side, low intensity to open the shadows. */}
      <Lightformer
        form="rect"
        intensity={0.9}
        color="#cfe0ff"
        position={[-5, 2, -2]}
        scale={[6, 8, 1]}
        target={[0, 1, 0]}
      />
      {/* Rim strips: thin bright bars that carve a premium edge on the silhouette. */}
      <Lightformer
        form="rect"
        intensity={3.2}
        color="#ffffff"
        position={[-3, 3, -5]}
        scale={[0.4, 6, 1]}
        target={[0, 1, 0]}
      />
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#dbe7ff"
        position={[4, 1, -5]}
        scale={[0.4, 6, 1]}
        target={[0, 1, 0]}
      />
      {/* Subtle top ambient bar for a soft overhead sheen on bone. */}
      <Lightformer
        form="rect"
        intensity={1.1}
        color="#eef4ff"
        position={[0, 6, 1]}
        scale={[6, 2, 1]}
        rotation={[Math.PI / 2, 0, 0]}
        target={[0, 1, 0]}
      />
    </Environment>
  );
}

/**
 * Camera + interaction budget. Lives inside the Canvas so it can read r3f's
 * `performance.regress`.
 *
 * A camera change regresses the scene, and regressing does TWO separate things.
 * AdaptiveEvents stops raycasting, which is pure profit: picking a skinned mesh
 * is the most expensive raycast three.js does and there are 1300+ of them here,
 * so it was competing with the drag for the same main thread, and nobody is
 * clicking a muscle mid-swipe anyway. AdaptiveDpr drops the render resolution,
 * which costs image quality.
 *
 * ON PHONES ONLY THE FIRST HALF APPLIES. The compact cap is already 1.0, so a
 * regress meant 0.5x -- about 195 backing pixels across a 390px screen -- and
 * the user reported the model distorting on every pinch and drag. Desktop starts
 * from a bigger budget and nobody complained, so it keeps both halves.
 *
 * smoothTime was 0.4s, long enough that the model visibly trailed the cursor and
 * read as a stutter even when frames were fine.
 */
/**
 * DO NOT regress the scene while the rig is animating.
 *
 * That was tried and it was the wrong tool. `regress()` exists for TRANSIENT
 * interactions: it drops AdaptiveDpr to the `performance.min` floor and snaps
 * back the moment you let go, which is right for a camera flick. A ROM sweep is
 * not transient -- it runs for five to ten seconds -- so regressing on every
 * angle change parked the render at the floor for the whole animation. On a
 * phone that measured 0.349x, i.e. about 136 backing pixels across a 390px
 * screen. It did buy fluidity, and it made the movement impossible to actually
 * read, which is the entire point of the lab.
 *
 * The savings that cost nothing visually are the ones that stay: the compact DPR
 * cap, MSAA off on phones, and the 30 Hz commit throttle in MovementControls.
 * Resolution during the sweep is left alone.
 *
 * If playback still needs to be cheaper, the next lever is the CPU side of
 * `apply()` in RigModel -- the per-frame skeleton walk and `updateMatrixWorld`
 * -- not the pixels. Reducing pixels further just makes the feature illegible.
 */

function NavigationRig({ compact }: { compact: boolean }) {
  const regress = useThree((s) => s.performance.regress);
  return (
    <>
      {/* Resolution stays constant on phones -- see the note above. */}
      {!compact && <AdaptiveDpr pixelated={false} />}
      <AdaptiveEvents />
      {/* Free navigation: dollyToCursor makes the wheel zoom TOWARD the pointer
          (point at a muscle and scroll in), and a small minDistance lets the
          camera get right up to a single muscle. Right-drag trucks (pans) up/
          down/sideways; double-click flies to a structure (DoubleClickFocus). */}
      <CameraControls
        makeDefault
        dollyToCursor
        minDistance={0.05}
        maxDistance={50}
        smoothTime={0.18}
        draggingSmoothTime={0.08}
        onChange={regress}
      />
    </>
  );
}

function RigLoaderOverlay({ progress }: { progress: number }) {
  const pct = Math.min(100, Math.round(progress));
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink-950/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
          <div className="absolute inset-2 rounded-full bg-accent/10" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="font-display text-sm font-medium tracking-wide text-slate-200">
            Cargando rig biomecánico
          </span>
          <span className="font-mono text-xs text-slate-500">cuerpo-rig.glb · {pct}%</span>
        </div>
        <div className="h-1 w-56 overflow-hidden rounded-full bg-slate-800">
          <div
            className="shimmer-bar h-full animate-shimmer rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ProgressReporter({ onProgress }: { onProgress: (p: number) => void }) {
  const { progress } = useProgress();
  useEffect(() => {
    onProgress(progress);
  }, [progress, onProgress]);
  return null;
}

export function RigViewer({ refitKey }: { refitKey?: string | number } = {}) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const compact = useIsCompact();

  // The rig itself reports when it's loaded AND styled (onReady). We dismiss the
  // loader on that signal -- NOT on drei's progress reaching 100, which never
  // happens on a cached reload and would freeze the overlay over a live model.
  // A safety timeout dismisses it regardless so the overlay can never get stuck.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative h-full w-full viewer-bg">
      <Canvas
        // Tagged so the "Exportar para paciente" feature can grab this exact
        // WebGL canvas (preserveDrawingBuffer is on, so toDataURL/drawImage work).
        id="rig-gl-canvas"
        camera={{ position: [2, 1.5, 4], fov: 45, near: 0.05, far: 100 }}
        dpr={compact ? RIG_DPR_COMPACT : RIG_DPR}
        // Floor for the adaptive quality drop while the CAMERA moves (nothing
        // else regresses -- see the note above NavigationRig). Same on phones:
        // a lower floor here made a drag on mobile blocky for no real gain.
        performance={{ min: 0.5 }}
        gl={{
          // MSAA is a fill-rate tax, and fill rate is exactly what a phone does
          // not have spare while skinning 1300+ meshes per frame.
          antialias: !compact,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
          // ACES filmic gives the muscle reds and ivory bone a richer, more
          // cinematic roll-off than the flat Neutral curve; slightly under 1.0
          // exposure keeps highlights from blowing out under the studio env.
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.95,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        {/* Image-based studio lighting (reflections + soft fill). */}
        <StudioEnvironment />
        {/* Analytic key/fill/rim on top of the IBL for crisp directional shaping. */}
        <hemisphereLight args={[0xbfdfff, 0x0a0f1a, 0.35]} />
        <directionalLight position={[3, 6, 4]} intensity={1.2} color="#fff4e8" />
        <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#cdddff" />
        {/* Back/rim key: raised (was 0.7) so muscle silhouettes get a brighter edge
            and separate from the dark stage — the G1 "flat on black" fix. */}
        <directionalLight position={[-2, 3, -5]} intensity={0.95} color="#ffffff" />
        <ambientLight intensity={0.12} />

        <Suspense fallback={null}>
          <ProgressReporter onProgress={setProgress} />
          <RigModel onReady={() => setReady(true)} />
          <RigOverlays />
          <ShoulderRhythmArc />
          {/* Paints the selected root's dermatome on the body's own skin. Idle
              until the neuro panel publishes a selection. */}
          <NeuroSkinLayer />
          <MovementFramer refitKey={refitKey} />
          <DoubleClickFocus />
        </Suspense>

        <NavigationRig compact={compact} />
      </Canvas>

      {/* Premium depth: a soft radial spotlight behind the model and a vignette
          in front, both pointer-events-none so the canvas stays fully draggable. */}
      <div className="pointer-events-none absolute inset-0 rig-stage-glow" />
      <div className="pointer-events-none absolute inset-0 rig-vignette" />

      {!ready && <RigLoaderOverlay progress={progress} />}
    </div>
  );
}
