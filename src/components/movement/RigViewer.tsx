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
import { RigOverlays } from './RigOverlays';
import { ShoulderRhythmArc } from './ShoulderRhythmArc';
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

/**
 * Auto-fit the camera onto the rig once it has a valid bounding box, and AGAIN
 * whenever `refitKey` changes.
 *
 * The refit exists for the compact layout. There the canvas is a flex row above
 * the control sheet, so opening or collapsing the sheet changes the canvas box
 * by a third of the screen. `fitToBox` had already run against the old box, and
 * r3f's resize handling only updates the projection aspect -- it does not
 * re-frame. The visible result was the arm sliding out of the left edge partway
 * through an abduction sweep, which is exactly the frame a user is studying.
 */
function AutoFit({ refitKey }: { refitKey?: string | number }) {
  const { scene } = useThree();
  const controls = useThree((s) => s.controls) as CameraControls | null;
  const framed = useRef(false);
  const lastKey = useRef(refitKey);

  // A changed key means the viewport changed shape, not that a new model
  // arrived: allow the one-shot guard to fire again.
  if (lastKey.current !== refitKey) {
    lastKey.current = refitKey;
    framed.current = false;
  }

  useEffect(() => {
    if (framed.current || !controls) return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        scene.updateWorldMatrix(true, true);
        const box = new THREE.Box3();
        const tmp = new THREE.Box3();
        // Frame ONLY the skinned body. The rig GLB also carries far-away
        // Z-Anatomy text/label panels ("VENOUS SYSTEM", ...) that are plain
        // meshes; including them blows up the bounding box and shrinks the body
        // to a dot off to the side. The body is the SkinnedMesh set.
        scene.traverse((o) => {
          const m = o as THREE.SkinnedMesh;
          if (!m.isSkinnedMesh || !m.visible) return;
          tmp.setFromObject(m);
          if (isFinite(tmp.min.x) && !tmp.isEmpty()) box.union(tmp);
        });
        if (box.isEmpty() || !isFinite(box.min.x)) return;
        framed.current = true;
        void controls.fitToBox(box, true, {
          paddingTop: 0.15,
          paddingBottom: 0.15,
          paddingLeft: 0.15,
          paddingRight: 0.15,
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [controls, scene, refitKey]);

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
 * Every camera change regresses the scene for a moment, which lets AdaptiveDpr
 * drop the render resolution and AdaptiveEvents stop raycasting WHILE the camera
 * moves, then restores both the instant it settles. That matters more here than
 * in the atlas: these are 1300+ SKINNED meshes, so every frame also pays for CPU
 * skinning, and picking a skinned mesh is the most expensive raycast three.js
 * does -- it was competing with the drag for the same main thread.
 *
 * smoothTime was 0.4s, long enough that the model visibly trailed the cursor and
 * read as a stutter even when frames were fine.
 */
/**
 * Regress the scene while the RIG is moving, not only while the camera is.
 *
 * AdaptiveDpr was already here, but the only thing calling `regress()` was
 * CameraControls.onChange. So dragging the camera dropped the resolution and
 * playback -- the one moment the model is deforming 1300+ skinned meshes every
 * single frame -- ran at full resolution with picking enabled. On a phone that
 * is exactly the "trabado" the user saw when pressing play.
 *
 * Subscribing to rigChannel and regressing on every angle change puts playback
 * on the same budget as a camera drag: lower resolution and no raycasting while
 * it sweeps, full quality restored the moment it settles. The still frame -- the
 * only one anyone studies -- is untouched.
 *
 * PHONES ONLY, deliberately. A camera drag regresses everywhere because nobody
 * reads the model while swinging it around, but during playback they ARE reading
 * it -- that is the whole feature. Measured, desktop playback dropped to 0.5x
 * with this on, which is a quality cost on a surface nobody reported as slow.
 */
function RigMotionBudget({ enabled }: { enabled: boolean }) {
  const regress = useThree((s) => s.performance.regress);
  useEffect(() => {
    if (!enabled) return;
    let last = rigChannel.get().angleDeg;
    return rigChannel.subscribe((s) => {
      if (s.angleDeg === last) return;
      last = s.angleDeg;
      regress();
    });
  }, [regress, enabled]);
  return null;
}

function NavigationRig({ compact }: { compact: boolean }) {
  const regress = useThree((s) => s.performance.regress);
  return (
    <>
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />
      <RigMotionBudget enabled={compact} />
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
        // Floor for the adaptive quality drop while the camera or the rig moves.
        // The still frame -- the only one anyone studies -- keeps full
        // resolution. Phones drop further, because there the sweep is the part
        // that was failing, not the still.
        performance={{ min: compact ? 0.35 : 0.5 }}
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
          <AutoFit refitKey={refitKey} />
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
