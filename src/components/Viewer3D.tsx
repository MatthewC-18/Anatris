// src/components/Viewer3D.tsx
//
// The 3D canvas. Owns the camera and lighting, frames the camera onto the
// currently *visible* anatomical meshes (not the whole scene — the GLB
// contains far-away UI/text panels that would otherwise shrink the body to a
// dot), and animates between predefined views in response to camera requests.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls, useProgress } from '@react-three/drei';
import * as THREE from 'three';

import { AnatomyModel } from './AnatomyModel';
import { CanvasLoader } from './CanvasLoader';
import { useAnatomyStore } from '../store/anatomyStore';
import { VIEW_META } from '../lib/anatomyMeta';
import type { AnatomyEntry } from '../types/anatomy';

interface Viewer3DProps {
  byMesh: Map<string, AnatomyEntry>;
  regionMeshes?: Set<string> | null;
}

/**
 * Bridge component living *inside* the Canvas. It holds the CameraControls ref,
 * recomputes framing when the visible mesh set changes, and reacts to camera
 * view requests from the store.
 */
function SceneContents({ byMesh, regionMeshes }: Viewer3DProps) {
  const controlsRef = useRef<CameraControls | null>(null);
  const boundsRef = useRef<{ box: THREE.Box3; radius: number } | null>(null);
  const hasFramedRef = useRef(false);

  const cameraRequest = useAnatomyStore((s) => s.cameraRequest);

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

  // Respond to predefined-view requests.
  useEffect(() => {
    if (!cameraRequest || !controlsRef.current || !boundsRef.current) return;
    const controls = controlsRef.current;
    const { box, radius } = boundsRef.current;

    const center = new THREE.Vector3();
    box.getCenter(center);

    const meta = VIEW_META[cameraRequest.view];
    const dir = new THREE.Vector3(...meta.dir).normalize();
    const distance = radius * 2.6;
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

  return (
    <>
      {/* Soft multi-point lighting for clean clinical modeling (no network
          dependency — purely analytic lights so it works offline). */}
      <hemisphereLight args={[0xbfdfff, 0x0a0f1a, 0.6]} />
      <directionalLight position={[3, 6, 4]} intensity={1.4} />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} />
      <directionalLight position={[0, -3, 2]} intensity={0.3} />
      <ambientLight intensity={0.2} />

      <AnatomyModel
        byMesh={byMesh}
        regionMeshes={regionMeshes}
        onVisibleChange={handleVisibleChange}
      />

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

export function Viewer3D({ byMesh, regionMeshes }: Viewer3DProps) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

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
        dpr={[1, 2]}
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
          <SceneContents byMesh={byMesh} regionMeshes={regionMeshes} />
        </Suspense>
      </Canvas>

      {!ready && <CanvasLoader progress={progress} />}
    </div>
  );
}
