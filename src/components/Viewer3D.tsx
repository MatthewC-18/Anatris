// src/components/Viewer3D.tsx
//
// The 3D canvas. Owns the camera and lighting, frames the camera onto the
// currently *visible* anatomical meshes (not the whole scene -- the GLB
// contains far-away UI/text panels that would otherwise shrink the body to a
// dot), and animates between predefined views in response to camera requests.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CameraControls, useProgress } from '@react-three/drei';
import * as THREE from 'three';

import { AnatomyModel } from './AnatomyModel';
import { AttachmentMarkers } from './AttachmentMarkers';
import { RomMuscleMarkers } from './RomMuscleMarkers';
import { ConceptOverlay3D } from './ConceptOverlay3D';
import { ShoulderRotationRig } from './ShoulderRotationPrototype';
import { MuscleBands } from './movement/MuscleBands';
import { CanvasLoader } from './CanvasLoader';
import { useAnatomyStore } from '../store/anatomyStore';
import { parseMeshName } from '../lib/parseMeshName';
import { VIEW_META } from '../lib/anatomyMeta';
import type { AnatomyEntry } from '../types/anatomy';
import type { MuscleResolution } from '../lib/muscleResolver';

interface Viewer3DProps {
  byMesh: Map<string, AnatomyEntry>;
  regionMeshes?: Set<string> | null;
  resolution: MuscleResolution;
  /**
   * When true, mount the interactive movement rig (rigid bone rotation of the
   * shoulder) inside the canvas. Driven by shoulderRigChannel from the DOM
   * control panel; fully reversible when this flips back to false/unmounts.
   */
  movement?: boolean;
}

// How tightly the camera frames a focused muscle. Larger padding = more
// context (you see the surrounding bone/zone); smaller = fills the screen.
// 0.6 ~ "close but with context around it".
const FOCUS_PADDING = 0.6;

// Tighter padding when zooming to an attachment marker -- we want to get close
// to the landmark, but keep a little surrounding bone for context.
const PART_FOCUS_PADDING = 0.9;

// Device-pixel-ratio ceiling. High-density phones report dpr up to 3, which
// multiplies fragment work by ~9x; with thousands of meshes that tanks the
// frame rate for little visual gain. We cap small screens lower than desktop.
// Geometry/quality is untouched; only render resolution scales.
const DPR_DESKTOP: [number, number] = [1, 2];
const DPR_MOBILE: [number, number] = [1, 1.5];

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
 * Bridge component living *inside* the Canvas. It holds the CameraControls ref,
 * recomputes framing when the visible mesh set changes, and reacts to camera
 * view requests from the store.
 */
function SceneContents({ byMesh, regionMeshes, resolution, movement }: Viewer3DProps) {
  const { scene } = useThree();
  const controlsRef = useRef<CameraControls | null>(null);
  const boundsRef = useRef<{ box: THREE.Box3; radius: number } | null>(null);
  const hasFramedRef = useRef(false);

  const focusRequest = useAnatomyStore((s) => s.focusRequest);
  const cameraRequest = useAnatomyStore((s) => s.cameraRequest);
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const partFocus = useAnatomyStore((s) => s.partFocus);
  const sideFilter = useAnatomyStore((s) => s.sideFilter);
  const region = useAnatomyStore((s) => s.region);

  // Recompute the bounding box of visible meshes, then frame the camera.
  const handleVisibleChange = useCallback((meshes: THREE.Mesh[]) => {
    if (meshes.length === 0) return;
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    for (const m of meshes) {
      tmp.setFromObject(m);
      if (isFinite(tmp.min.x)) box.union(tmp);
    }
    if (!isFinite(box.min.x)) return;
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
        const box = new THREE.Box3();
        const tmp = new THREE.Box3();
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || !m.visible) return;
          tmp.setFromObject(m);
          if (isFinite(tmp.min.x) && !tmp.isEmpty()) box.union(tmp);
        });
        if (box.isEmpty() || !isFinite(box.min.x)) return;
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        boundsRef.current = { box: box.clone(), radius: sphere.radius };
        void controls.fitToBox(box, true, {
          paddingTop: 0.1,
          paddingBottom: 0.1,
          paddingLeft: 0.1,
          paddingRight: 0.1,
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [region, scene]);

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
      {/* Soft multi-point lighting for clean clinical modeling (no network
          dependency -- purely analytic lights so it works offline). */}
      <hemisphereLight args={[0xbfdfff, 0x0a0f1a, 0.6]} />
      <directionalLight position={[3, 6, 4]} intensity={1.4} />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} />
      <directionalLight position={[0, -3, 2]} intensity={0.3} />
      <ambientLight intensity={0.2} />

      <AnatomyModel
        byMesh={byMesh}
        regionMeshes={regionMeshes}
        onVisibleChange={handleVisibleChange}
        resolution={resolution}
      />

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

      <CameraControls
        ref={controlsRef}
        makeDefault
        minDistance={0.2}
        maxDistance={50}
        smoothTime={0.5}
      />
    </>
  );
}

/** Reads drei's load progress and forwards it to the HTML overlay loader. */
function ProgressReporter({ onProgress }: { onProgress: (p: number) => void }) {
  const { progress } = useProgress();
  useEffect(() => {
    onProgress(progress);
  }, [progress, onProgress]);
  return null;
}

export function Viewer3D({ byMesh, regionMeshes, resolution, movement }: Viewer3DProps) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const compact = useIsCompact();

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => setReady(true), 250);
      return () => clearTimeout(t);
    }
  }, [progress]);

  return (
    <div className="relative h-full w-full viewer-bg">
      <Canvas
        camera={{ position: [2, 1.5, 4], fov: 45, near: 0.05, far: 100 }}
        dpr={compact ? DPR_MOBILE : DPR_DESKTOP}
        // Color pipeline tuned for a flat "atlas" look: we want the assigned
        // tissue colors to render faithfully, not cinematically. ACES tone
        // mapping desaturates and washes flat colors toward grey, so we use
        // neutral tone mapping and sRGB output for accurate, saturated atlas
        // colors.
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onPointerMissed={() => useAnatomyStore.getState().clearSelection()}
      >
        <Suspense fallback={null}>
          <ProgressReporter onProgress={setProgress} />
          <SceneContents
            byMesh={byMesh}
            regionMeshes={regionMeshes}
            resolution={resolution}
            movement={movement}
          />
        </Suspense>
      </Canvas>

      {!ready && <CanvasLoader progress={progress} />}
    </div>
  );
}
