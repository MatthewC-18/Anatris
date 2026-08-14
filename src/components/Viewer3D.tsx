// src/components/Viewer3D.tsx
//
// The 3D canvas. Owns the camera and lighting, frames the camera onto the
// currently *visible* anatomical meshes (not the whole scene -- the GLB
// contains far-away UI/text panels that would otherwise shrink the body to a
// dot), and animates between predefined views in response to camera requests.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { AnatomyModel } from './AnatomyModel';
import { AtlasPlate, AtlasProjector } from './AtlasLabels';
import { AttachmentMarkers } from './AttachmentMarkers';
import { RomMuscleMarkers } from './RomMuscleMarkers';
import { ConceptOverlay3D } from './ConceptOverlay3D';
import { ShoulderRotationRig } from './ShoulderRotationPrototype';
import { MuscleBands } from './movement/MuscleBands';
import { CanvasLoader } from './CanvasLoader';
import { ViewerHud } from './ViewerHud';
import { useAnatomyStore } from '../store/anatomyStore';
import { parseMeshName } from '../lib/parseMeshName';
import { VIEW_META } from '../lib/anatomyMeta';
import { REGIONS, resolveRegionFade } from '../data/regiones';
import { pickLabelTargets, type LabelTarget } from '../lib/atlasPlate';
import { musclesForRegion } from '../data/musclesByRegion';
import { isConceptModule } from '../data/conceptByRegion';
import type { AnatomyEntry } from '../types/anatomy';
import type { MuscleResolution } from '../lib/muscleResolver';

interface Viewer3DProps {
  byMesh: Map<string, AnatomyEntry>;
  regionMeshes?: Set<string> | null;
  /**
   * Optional compact "joint core" subset the camera should frame on when the
   * region changes (hero framing for long-limb regions like knee/elbow). When
   * null/absent, the camera frames the full visible region bounds as before.
   */
  regionFocusMeshes?: Set<string> | null;
  resolution: MuscleResolution;
  /**
   * When true, mount the interactive movement rig (rigid bone rotation of the
   * shoulder) inside the canvas. Driven by shoulderRigChannel from the DOM
   * control panel; fully reversible when this flips back to false/unmounts.
   */
  movement?: boolean;
  /**
   * Atlas-plate labels. The names are DOM and live OUTSIDE the canvas (see the
   * two-reconciler note in AtlasLabels), so the viewer owns the target list and
   * hands the same array to both halves.
   */
  labelTargets?: LabelTarget[];
  /** Reports the visible mesh set up to the viewer, which picks the labels. */
  onVisibleMeshes?: (meshes: THREE.Mesh[]) => void;
}

// How tightly the camera frames a focused muscle. Larger padding = more
// context (you see the surrounding bone/zone); smaller = fills the screen.
// 0.6 ~ "close but with context around it".
const FOCUS_PADDING = 0.6;

// Padding (world units) around the region's joint-core when hero-framing a
// long-limb region. Generous so the joint reads as a composed close-up WITH a
// good stretch of the surrounding limb as context, not a tight crop.
const REGION_FOCUS_PADDING = 0.45;

// Tighter padding when zooming to an attachment marker -- we want to get close
// to the landmark, but keep a little surrounding bone for context.
const PART_FOCUS_PADDING = 0.9;

// Device-pixel-ratio ceiling. High-density phones report dpr up to 3, which
// multiplies fragment work by ~9x; with thousands of meshes that tanks the
// frame rate for little visual gain. We cap small screens lower than desktop.
// Geometry/quality is untouched; only render resolution scales.
const DPR_DESKTOP: [number, number] = [1, 2];
const DPR_MOBILE: [number, number] = [1, 1.5];

/** Stable empty array, so "no labels" never looks like a new value. */
const EMPTY_TARGETS: LabelTarget[] = [];

/** True when the viewport is below the lg breakpoint (Tailwind lg = 1024px). */
function useIsCompact(): boolean {
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return compact;
}

/**
 * Premium studio lighting baked into an image-based environment map — the same
 * setup the movement lab uses, so the Explorar model gets the identical soft
 * reflections and pearly rim highlights. Pure Lightformers (no HDR file → fully
 * offline), rendered ONCE (frames={1}) into a small env map: a broad warm key
 * softbox, a cool fill that opens the shadows, and two thin rim strips that
 * carve a premium edge on the bone/muscle silhouette. `background={false}`
 * keeps our CSS gradient + stage glow behind the model.
 */
function StudioEnvironment() {
  return (
    <Environment frames={1} resolution={256} background={false}>
      <Lightformer
        form="rect"
        intensity={2.4}
        color="#fff6ec"
        position={[3, 4, 5]}
        scale={[8, 8, 1]}
        target={[0, 1, 0]}
      />
      <Lightformer
        form="rect"
        intensity={0.9}
        color="#cfe0ff"
        position={[-5, 2, -2]}
        scale={[6, 8, 1]}
        target={[0, 1, 0]}
      />
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
 * Bridge component living *inside* the Canvas. It holds the CameraControls ref,
 * recomputes framing when the visible mesh set changes, and reacts to camera
 * view requests from the store.
 */
function SceneContents({
  byMesh,
  regionMeshes,
  regionFocusMeshes,
  resolution,
  movement,
  labelTargets,
  onVisibleMeshes,
}: Viewer3DProps) {
  const { scene } = useThree();
  // Signals "the user is interacting, cheapen the frame" to AdaptiveDpr /
  // AdaptiveEvents below. r3f restores full quality on its own once idle.
  const regress = useThree((s) => s.performance.regress);
  // Phones opt out of the resolution half of that trade -- see AdaptiveDpr below.
  const compact = useIsCompact();
  const controlsRef = useRef<CameraControls | null>(null);
  const boundsRef = useRef<{ box: THREE.Box3; radius: number } | null>(null);
  const hasFramedRef = useRef(false);

  const focusRequest = useAnatomyStore((s) => s.focusRequest);
  const cameraRequest = useAnatomyStore((s) => s.cameraRequest);
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const partFocus = useAnatomyStore((s) => s.partFocus);
  const sideFilter = useAnatomyStore((s) => s.sideFilter);
  const region = useAnatomyStore((s) => s.region);

  // The active region's falloff slab. A mesh that straddles a fade edge is still
  // VISIBLE (its lower half is what dissolves), so its bounding box reaches far
  // past what the user can actually see — the hip's femur runs to the knee. If
  // the camera framed that raw box it would pull back to fit a stretch of empty
  // background, which is the opposite of what the falloff is for, so every
  // framing box below is clipped to the slab. See clampToFade.
  const regionFade = useMemo(
    () => resolveRegionFade(region != null ? REGIONS[region] : undefined),
    [region],
  );

  /** Clip a framing box to the region's falloff slab (no-op without one). */
  const clampToFade = useCallback(
    (box: THREE.Box3): THREE.Box3 => {
      if (!regionFade || box.isEmpty()) return box;
      const lo = regionFade.min - regionFade.soft;
      const hi = regionFade.max + regionFade.soft;
      // Only ever shrink, and never past the point of inverting the box.
      box.min.y = Math.min(Math.max(box.min.y, lo), box.max.y);
      box.max.y = Math.max(Math.min(box.max.y, hi), box.min.y);
      return box;
    },
    [regionFade],
  );

  // Read through refs so handleVisibleChange keeps a stable identity: it is a
  // dependency of AnatomyModel's visibility effect, and re-creating it on every
  // region change would make that effect re-run the whole atlas for nothing.
  const clampToFadeRef = useRef(clampToFade);
  clampToFadeRef.current = clampToFade;
  const onVisibleMeshesRef = useRef(onVisibleMeshes);
  onVisibleMeshesRef.current = onVisibleMeshes;

  // Recompute the bounding box of visible meshes, then frame the camera. The
  // atlas plate needs this same set to know which structures are on screen and
  // worth naming, so it is forwarded up; it fires only when visibility really
  // changes — region, layer, side — never per frame.
  const handleVisibleChange = useCallback((meshes: THREE.Mesh[]) => {
    onVisibleMeshesRef.current?.(meshes);
    if (meshes.length === 0) return;
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    for (const m of meshes) {
      tmp.setFromObject(m);
      if (isFinite(tmp.min.x)) box.union(tmp);
    }
    if (!isFinite(box.min.x)) return;
    clampToFadeRef.current(box);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    boundsRef.current = { box: box.clone(), radius: sphere.radius };

    // Only auto-fit the very first time we get a valid box.
    if (controlsRef.current && !hasFramedRef.current) {
      hasFramedRef.current = true;
      void controlsRef.current.fitToBox(box, true, {
        paddingTop: 0.1,
        paddingBottom: 0.1,
        paddingLeft: 0.1,
        paddingRight: 0.1,
      });
    }
  }, []);

  // Re-frame the camera when the REGION changes. The initial auto-fit only runs
  // once (hasFramedRef), so without this a region change (e.g. spine -> knee)
  // would leave the camera pointing at the previous region and the new one off
  // screen. We wait a couple of frames so the visibility effect has updated
  // mesh.visible and world matrices, then fit to the freshly visible bounds.
  useEffect(() => {
    if (region == null) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const controls = controlsRef.current;
        if (!controls) return;
        scene.updateWorldMatrix(true, true);

        // Full visible region bounds (fallback + used when no joint focus).
        const fullBox = new THREE.Box3();
        // Joint-core bounds for HERO FRAMING of long-limb regions: only the
        // meshes named in regionFocusMeshes (patella/menisci/ligaments, elbow
        // articulations, …). Null when the region defines no focus.
        const focusBox = regionFocusMeshes ? new THREE.Box3() : null;
        const tmp = new THREE.Box3();
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || !m.visible) return;
          tmp.setFromObject(m);
          if (!isFinite(tmp.min.x) || tmp.isEmpty()) return;
          fullBox.union(tmp);
          if (focusBox && regionFocusMeshes!.has(m.name)) focusBox.union(tmp);
        });
        if (fullBox.isEmpty() || !isFinite(fullBox.min.x)) return;

        // Prefer the joint-core box when it resolved to something; otherwise
        // fall back to the full region bounds (the previous behaviour).
        const useFocus = !!focusBox && !focusBox.isEmpty() && isFinite(focusBox.min.x);
        const framingBox = clampToFade(useFocus ? (focusBox as THREE.Box3) : fullBox);
        const pad = useFocus ? REGION_FOCUS_PADDING : 0.1;

        const sphere = new THREE.Sphere();
        framingBox.getBoundingSphere(sphere);
        // boundsRef drives the toolbar's predefined views, so store the SAME
        // box we hero-frame on — anterior/posterior/… then stay centered on the
        // joint rather than jumping out to the whole limb.
        boundsRef.current = { box: framingBox.clone(), radius: sphere.radius };
        void controls.fitToBox(framingBox, true, {
          paddingTop: pad,
          paddingBottom: pad,
          paddingLeft: pad,
          paddingRight: pad,
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [region, regionFocusMeshes, clampToFade, scene]);

  // Respond to predefined-view requests.
  useEffect(() => {
    if (!cameraRequest || !controlsRef.current || !boundsRef.current) return;
    const controls = controlsRef.current;
    const { box, radius } = boundsRef.current;

    const center = new THREE.Vector3();
    box.getCenter(center);

    const meta = VIEW_META[cameraRequest.view];
    const dir = new THREE.Vector3(...meta.dir).normalize();
    // When a concept overlay (planes/axes) is showing, pull back further: the
    // overlay extends past the body, so we need extra margin to see the full
    // planes and axis labels rather than filling the frame with the torso.
    const overlayActive = useAnatomyStore.getState().conceptOverlay !== 'none';
    const distance = radius * (overlayActive ? 3.6 : 2.6);
    const camPos = center.clone().add(dir.multiplyScalar(distance));

    void controls.setLookAt(
      camPos.x,
      camPos.y,
      camPos.z,
      center.x,
      center.y,
      center.z,
      true, // animate
    );
  }, [cameraRequest]);

  // Frame the camera onto a requested set of meshes (e.g. a selected muscle).
  //
  // ROBUSTNESS: the previous version sometimes failed to move the camera
  // because Box3.setFromObject relies on up-to-date world matrices, and the
  // target meshes may have just been made visible (or never had their matrices
  // refreshed). We now force a world-matrix update first, and fall back to the
  // meshes' world *positions* if their geometry box can't be computed (e.g. a
  // mesh that is currently hidden has no renderable bounds).
  useEffect(() => {
    if (!focusRequest || !controlsRef.current) return;
    const controls = controlsRef.current;

    // Make sure every mesh's world matrix is current before measuring.
    scene.updateWorldMatrix(true, true);

    const wanted = new Set(focusRequest.meshNames);
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    const worldPos = new THREE.Vector3();
    let foundBox = false;
    let foundPos = false;

    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (!wanted.has(m.name)) return;

      // Primary: geometry bounding box in world space.
      tmp.setFromObject(m);
      if (isFinite(tmp.min.x) && !tmp.isEmpty()) {
        box.union(tmp);
        foundBox = true;
      }

      // Fallback: at least the mesh's world position, so we can still aim the
      // camera even if the geometry box failed.
      m.getWorldPosition(worldPos);
      if (isFinite(worldPos.x)) {
        box.expandByPoint(worldPos);
        foundPos = true;
      }
    });

    if (!foundBox && !foundPos) return;

    // If we only had positions (no real volume), pad the box so fitToBox has
    // something to frame instead of a zero-size point.
    if (!foundBox && foundPos) {
      box.expandByScalar(0.08);
    }

    void controls.fitToBox(box, true, {
      paddingTop: FOCUS_PADDING,
      paddingBottom: FOCUS_PADDING,
      paddingLeft: FOCUS_PADDING,
      paddingRight: FOCUS_PADDING,
    });
  }, [focusRequest, scene]);

  // PART FOCUS camera move: when origin/insertion is activated, zoom toward the
  // attachment marker(s) of the selected muscle. Reads the (possibly hidden)
  // marker meshes' world positions -- visibility isn't required to read a
  // position. Builds a small box around the marker(s) and frames it.
  useEffect(() => {
    if (partFocus == null || selectedMuscleId == null) return;
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    scene.updateWorldMatrix(true, true);

    const box = new THREE.Box3();
    const wpos = new THREE.Vector3();
    let found = false;

    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const muscle = resolution.muscleByMeshName.get(m.name);
      if (!muscle || muscle.id !== selectedMuscleId) return;
      const parsed = parseMeshName(m.name);
      if (parsed.part !== partFocus) return;
      if (sideFilter !== 'both' && parsed.side !== 'center' && parsed.side !== sideFilter) {
        return;
      }
      m.getWorldPosition(wpos);
      if (isFinite(wpos.x)) {
        box.expandByPoint(wpos);
        found = true;
      }
    });

    if (!found) return;

    // The markers are near-points, so give the box a real size to frame.
    box.expandByScalar(0.06);

    void controls.fitToBox(box, true, {
      paddingTop: PART_FOCUS_PADDING,
      paddingBottom: PART_FOCUS_PADDING,
      paddingLeft: PART_FOCUS_PADDING,
      paddingRight: PART_FOCUS_PADDING,
    });
  }, [partFocus, selectedMuscleId, sideFilter, resolution, scene]);

  return (
    <>
      {/* Image-based studio lighting (soft reflections + fill) that the tissue
          materials pick up through their per-tissue envMapIntensity. */}
      <StudioEnvironment />
      {/* Analytic key/fill/rim on top of the IBL for crisp directional shaping,
          warmed on the key and cooled on the fill to match the lab's premium
          modeling. Lower than before because the environment now carries the
          base illumination. */}
      <hemisphereLight args={[0xbfdfff, 0x0a0f1a, 0.35]} />
      <directionalLight position={[3, 6, 4]} intensity={1.15} color="#fff4e8" />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#cdddff" />
      <directionalLight position={[-2, 3, -5]} intensity={0.7} color="#ffffff" />
      <ambientLight intensity={0.12} />

      <AnatomyModel
        byMesh={byMesh}
        regionMeshes={regionMeshes}
        onVisibleChange={handleVisibleChange}
        resolution={resolution}
      />

      {/* Projects the atlas-plate anchors with the live camera and writes the
          layout onto the DOM the <AtlasPlate> sibling rendered. Draws nothing
          itself. */}
      <AtlasProjector targets={labelTargets ?? EMPTY_TARGETS} />

      {/* Origin/insertion pins (sphere + halo + label) for the selected muscle. */}
      <AttachmentMarkers resolution={resolution} />

      {/* Numbered identity pins for muscles active in a ROM highlight. Sibling
          of AttachmentMarkers; overlay-only, does not touch material logic. */}
      <RomMuscleMarkers resolution={resolution} />

      {/* Fundamentos concept overlay: cardinal planes / axes through the whole
          body. Inert (renders null) unless the store's conceptOverlay is set,
          so anatomical regions are completely unaffected. */}
      <ConceptOverlay3D />

      {/* Movement lab: rigid bone rotation of the shoulder + deforming muscle
          bands. Only mounted when the movement mode is active; both restore the
          model on unmount. */}
      {movement && <ShoulderRotationRig />}
      {movement && <MuscleBands resolution={resolution} />}

      {/* PERFORMANCE WHILE INTERACTING.
          The atlas is thousands of meshes, each with its own cloned material, so
          a drag is the most expensive thing the user can do. `regress()` (fired
          on every camera change below) flips r3f into its degraded state for a
          moment, which lets these two components:
            - AdaptiveDpr:    drop the render resolution while the camera moves
                              and restore it the instant it settles, so motion
                              stays smooth and the STILL frame -- the only one
                              anybody actually looks at -- keeps full quality.
            - AdaptiveEvents: stop raycasting while the camera moves. Hover
                              picking against the visible set on every pointer
                              move was competing with the drag for the same
                              main thread.
          Both are no-ops once the scene is idle.

          AdaptiveDpr IS SKIPPED ON PHONES. The two halves of a regress are not
          equally priced: dropping the raycast is free, dropping the resolution
          is not. On a phone the ceiling is already 1.5, so the 0.5 floor landed
          around 195 backing pixels across a 390px screen and the model visibly
          broke up on every pinch and drag -- reported by the user on the lab's
          canvas, and this one shared the defect. Raycasting still stops. */}
      {!compact && <AdaptiveDpr pixelated={false} />}
      <AdaptiveEvents />

      {/* dollyToCursor zooms the wheel TOWARD the pointer so you can dive into any
          muscle; the small minDistance lets the camera get right up to it.
          smoothTime was 0.5s, which reads as the model lagging behind the cursor
          even at a full frame rate; 0.18 (and a tighter value while actually
          dragging) keeps the inertial feel without the rubber band. */}
      <CameraControls
        ref={controlsRef}
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

/**
 * Rendered INSIDE the Suspense boundary, so mounting at all means the model has
 * resolved. That is the readiness signal the overlay is dismissed on.
 *
 * It used to forward drei's `useProgress` instead, and the overlay was dismissed
 * when that reached 100. Two things are wrong with that, and RigViewer had
 * already found both: progress never reaches 100 on a cached reload, and it only
 * reaches 100 at all if whatever loads the model reports to three's
 * DefaultLoadingManager. When the atlas moved to the pre-compressed loader
 * (src/lib/compressedGLTF.ts) it stopped doing so for one release, and the app
 * sat behind "Cargando modelo anatómico · 0%" with the model rendering
 * underneath. Mounting is the fact; progress is a nicety.
 */
function ModelReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

export function Viewer3D({
  byMesh,
  regionMeshes,
  regionFocusMeshes,
  resolution,
  movement,
}: Viewer3DProps) {
  // The bar's percentage comes straight from drei's store, read OUT HERE rather
  // than inside the Suspense boundary: a reporter that only mounts once the model
  // has resolved can never show anything but 0 while it loads.
  const { progress } = useProgress();
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  const compact = useIsCompact();

  // ATLAS PLATE. The names are DOM, so they are rendered out here, beside the
  // canvas rather than inside it (see the two-reconciler note in AtlasLabels).
  // That puts the target list here too, and both halves get the same array.
  const region = useAnatomyStore((s) => s.region);
  const showAtlasLabels = useAnatomyStore((s) => s.showAtlasLabels);
  const [visibleMeshes, setVisibleMeshes] = useState<THREE.Mesh[]>([]);
  const labelTargets = useMemo<LabelTarget[]>(() => {
    if (!showAtlasLabels || isConceptModule(region)) return EMPTY_TARGETS;
    return pickLabelTargets({
      region,
      muscles: musclesForRegion(region),
      meshNamesByMuscleId: resolution.meshNamesByMuscleId,
      byMesh,
      visibleMeshes,
    });
  }, [showAtlasLabels, region, resolution, byMesh, visibleMeshes]);

  // A safety timeout dismisses the overlay regardless, so it can never get stuck
  // over a live model however the loading below behaves. Same belt-and-braces
  // RigViewer carries.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 20000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative h-full w-full viewer-bg">
      {/* Soft cool spotlight bloom behind the model + cinematic corner vignette.
          Both pointer-events-none so the canvas stays fully draggable; they sit
          under the toolbar/HUD (no z-index) but over the flat viewer-bg, giving
          the exploration canvas the same premium studio depth as the lab. */}
      <div className="pointer-events-none absolute inset-0 rig-stage-glow" />
      <Canvas
        camera={{ position: [2, 1.5, 4], fov: 45, near: 0.05, far: 100 }}
        dpr={compact ? DPR_MOBILE : DPR_DESKTOP}
        // Floor for the adaptive quality drop while the camera is moving (see
        // AdaptiveDpr in SceneContents). 0.5 halves the pixel count during a
        // drag, which is where the frame budget actually goes.
        // FLOOR FOR THE INTERACTION DROP, and the DEBOUNCE that ends it.
        //
        // A physio reviewing the lab wrote "Borroso se aleja o acerca": the scene
        // regresses on EVERY camera change, so a zoom -- a gesture whose whole
        // point is to look closer -- spends its entire duration at reduced
        // resolution, plus r3f's 200 ms debounce afterwards.
        //
        // 0.5 was too deep a cut for what it buys. This scene's cost is thousands
        // of individual meshes each with its own cloned material, which is
        // draw-call bound, not fill bound -- so halving the pixels barely moves
        // the frame rate while being plainly visible. The comment above says as
        // much: dropping the raycast is free, dropping the resolution is not, and
        // the phones were already exempted from this half for the same reason.
        // 0.75 keeps a real saving for the genuinely heavy drags; the shorter
        // debounce brings the sharp frame back as soon as the gesture stops.
        performance={{ min: 0.75, debounce: 120 }}
        // Premium studio color pipeline (same as the movement lab): ACES filmic
        // tone mapping gives the muscle reds and ivory bone a richer, more
        // cinematic roll-off than the flat Neutral curve, and pairs with the
        // image-based studio environment for soft, expensive-looking shading.
        // Exposure slightly under 1.0 keeps highlights from blowing out under
        // the env; sRGB output keeps the atlas hues faithful.
        gl={{
          // MSAA is a fill-rate tax, and fill rate is what a phone has least of
          // while drawing thousands of meshes. Same call as the lab's canvas.
          antialias: !compact,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.95,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onPointerMissed={() => useAnatomyStore.getState().clearSelection()}
      >
        <Suspense fallback={null}>
          <ModelReady onReady={handleReady} />
          <SceneContents
            byMesh={byMesh}
            regionMeshes={regionMeshes}
            regionFocusMeshes={regionFocusMeshes}
            resolution={resolution}
            movement={movement}
            labelTargets={labelTargets}
            onVisibleMeshes={setVisibleMeshes}
          />
        </Suspense>
      </Canvas>

      {/* Cinematic corner vignette in front of the canvas, then the ambient HUD
          (module plate + hover label). Both pointer-events-none, so picking,
          camera drag and the floating toolbar keep working underneath. */}
      <div className="pointer-events-none absolute inset-0 rig-vignette" />

      {/* Atlas-label layer. Above the vignette so the names stay legible in the
          darkened corners, and pointer-events-none as a layer -- only the label
          buttons themselves opt back in -- so dragging the model still works
          everywhere in between. */}
      {ready && <AtlasPlate targets={labelTargets} />}
      {ready && <ViewerHud byMesh={byMesh} resolution={resolution} />}

      {!ready && <CanvasLoader progress={progress} />}
    </div>
  );
}
