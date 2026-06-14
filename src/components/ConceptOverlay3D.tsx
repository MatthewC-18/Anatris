// src/components/ConceptOverlay3D.tsx
//
// Didactic overlay for the FUNDAMENTOS concept module: draws the three cardinal
// anatomical planes and/or the three axes THROUGH the live model, framed on the
// whole body (not the current region) so the student reads global orientation -
// a sagittal plane that only crossed the knee would mislead.
//
// It lives INSIDE the Canvas as a sibling of AnatomyModel. It reads
// `conceptOverlay` from the store ('none' | 'planes' | 'axes' |
// 'planes-and-axes') and renders nothing when 'none', so for every anatomical
// region (shoulder/elbow/spine/knee) this component is inert.
//
// SIZING: the overlay measures the WHOLE skeleton/muscle body once the model is
// loaded by traversing real meshes and unioning their world-space boxes,
// ignoring the far-away GLB text/UI panels via a generous-but-bounded sphere
// (same spirit as Viewer3D's framing). The planes are sized to ~1.25x the body
// so they clearly extend past it; axes run a touch longer so their arrow ends
// read outside the silhouette.
//
// ANATOMICAL CONVENTION (standard anatomical position, model facing -Z viewer):
//   - Sagittal plane  -> the Y-Z plane (normal = X). Splits left / right.
//   - Frontal/coronal -> the X-Y plane (normal = Z). Splits front / back.
//   - Transverse      -> the X-Z plane (normal = Y). Splits superior / inferior.
//   - Vertical axis   -> Y (longitudinal / cráneo-caudal).
//   - Sagittal axis   -> Z (antero-posterior).
//   - Frontal axis    -> X (transverse / latero-lateral).
// Colors match the project palette: accent cyan for the primary cue, violet and
// amber to separate the other two so the three planes never blur together.

import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAnatomyStore } from '../store/anatomyStore';

// Plane tints (semi-transparent quads). Sagittal = accent cyan (primary),
// frontal = violet, transverse = amber. Mirrors the ROM/lever palette so the
// whole app speaks one color language.
const SAGITTAL_COLOR = 0x22d3ee; // cyan accent
const FRONTAL_COLOR = 0xa78bfa; // violet
const TRANSVERSE_COLOR = 0xffa51e; // amber

const PLANE_OPACITY = 0.16;
const PLANE_SCALE = 1.05; // plane size relative to body span (just past the body)
const AXIS_SCALE = 1.2; // axis length relative to body span (a touch past planes)

const LABEL_COLOR = '#e2e8f0';
const LABEL_OUTLINE = '#070b14';

/**
 * Measure the body's center + span from the real anatomical meshes, excluding
 * the GLB's far-away text/UI panels. We compute a robust span by taking the
 * bounding box of all meshes whose world position is within a sane radius of
 * the median, which keeps stray label planes from inflating the size. In
 * practice the body meshes dominate, so a straightforward union of mesh boxes
 * with an outlier guard is enough.
 */
function useBodyBounds(): { center: THREE.Vector3; span: number } | null {
  const { scene } = useThree();
  const overlay = useAnatomyStore((s) => s.conceptOverlay);

  return useMemo(() => {
    if (overlay === 'none') return null;
    scene.updateWorldMatrix(true, true);

    // First pass: collect world positions of all real meshes.
    const positions: THREE.Vector3[] = [];
    const boxes: THREE.Box3[] = [];
    const tmp = new THREE.Box3();
    const wp = new THREE.Vector3();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.getWorldPosition(wp);
      if (!isFinite(wp.x)) return;
      tmp.setFromObject(m);
      if (tmp.isEmpty() || !isFinite(tmp.min.x)) return;
      positions.push(wp.clone());
      boxes.push(tmp.clone());
    });
    if (boxes.length === 0) return null;

    // Median center to resist far-away panels.
    const median = (arr: number[]) => {
      const a = [...arr].sort((p, q) => p - q);
      const mid = Math.floor(a.length / 2);
      return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
    };
    const cx = median(positions.map((p) => p.x));
    const cy = median(positions.map((p) => p.y));
    const cz = median(positions.map((p) => p.z));
    const center = new THREE.Vector3(cx, cy, cz);

    // Robust radius: 95th percentile distance of mesh-box centers from median,
    // so a handful of distant UI planes can't blow up the overlay size.
    const dists = boxes
      .map((b) => {
        const c = new THREE.Vector3();
        b.getCenter(c);
        return c.distanceTo(center);
      })
      .sort((p, q) => p - q);
    const p95 = dists[Math.min(dists.length - 1, Math.floor(dists.length * 0.95))];

    // Union only the boxes within the robust radius to get a clean body box.
    const body = new THREE.Box3();
    const c = new THREE.Vector3();
    for (const b of boxes) {
      b.getCenter(c);
      if (c.distanceTo(center) <= p95 * 1.1) body.union(b);
    }
    if (body.isEmpty() || !isFinite(body.min.x)) return null;

    const size = new THREE.Vector3();
    body.getSize(size);
    const bodyCenter = new THREE.Vector3();
    body.getCenter(bodyCenter);

    // SAGITTAL MIDLINE: the anatomical midline is the geometric midpoint between
    // the body's leftmost and rightmost extent, i.e. (min.x + max.x) / 2, which
    // is exactly what body.getCenter() gives for X. We deliberately do NOT use a
    // median of mesh centers here: one side often carries more small meshes,
    // which drags the median off the true midline (the bug we just saw). The
    // trimmed box is symmetric by construction, so its X center is the midline.
    const span = Math.max(size.x, size.y, size.z);
    if (!isFinite(span) || span <= 0) return null;
    return { center: bodyCenter, span };
  }, [scene, overlay]);
}

export function ConceptOverlay3D() {
  const overlay = useAnatomyStore((s) => s.conceptOverlay);
  const bounds = useBodyBounds();

  if (overlay === 'none' || !bounds) return null;

  const showPlanes = overlay === 'planes' || overlay === 'planes-and-axes';
  const showAxes = overlay === 'axes' || overlay === 'planes-and-axes';

  const { center, span } = bounds;
  const planeSize = span * PLANE_SCALE;
  const axisLen = span * AXIS_SCALE;
  const labelSize = span * 0.045;
  const half = planeSize / 2;

  return (
    <group position={[center.x, center.y, center.z]}>
      {showPlanes && (
        <>
          {/* Sagittal: Y-Z plane (normal = X). Default PlaneGeometry lies in XY
              with normal +Z, so rotate -90° about Y to face X. Splits L/R. */}
          <mesh rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[planeSize, planeSize]} />
            <meshBasicMaterial
              color={SAGITTAL_COLOR}
              transparent
              opacity={PLANE_OPACITY}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Frontal / coronal: X-Y plane (normal = Z). No rotation. Front/back. */}
          <mesh>
            <planeGeometry args={[planeSize, planeSize]} />
            <meshBasicMaterial
              color={FRONTAL_COLOR}
              transparent
              opacity={PLANE_OPACITY}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Transverse: X-Z plane (normal = Y). Rotate -90° about X. Sup/inf. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[planeSize, planeSize]} />
            <meshBasicMaterial
              color={TRANSVERSE_COLOR}
              transparent
              opacity={PLANE_OPACITY}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Plane labels, set just outside each plane's upper edge. */}
          <Text
            position={[0.02 * span, half * 0.82, half * 0.82]}
            fontSize={labelSize}
            color={LABEL_COLOR}
            outlineWidth={labelSize * 0.08}
            outlineColor={LABEL_OUTLINE}
            anchorX="center"
            anchorY="middle"
          >
            Plano sagital
          </Text>
          <Text
            position={[half * 0.82, half * 0.82, 0.02 * span]}
            fontSize={labelSize}
            color={LABEL_COLOR}
            outlineWidth={labelSize * 0.08}
            outlineColor={LABEL_OUTLINE}
            anchorX="center"
            anchorY="middle"
          >
            Plano frontal
          </Text>
          <Text
            position={[half * 0.82, 0.02 * span, half * 0.82]}
            fontSize={labelSize}
            color={LABEL_COLOR}
            outlineWidth={labelSize * 0.08}
            outlineColor={LABEL_OUTLINE}
            anchorX="center"
            anchorY="middle"
          >
            Plano transversal
          </Text>
        </>
      )}

      {showAxes && (
        <>
          <AxisLine
            from={[0, -axisLen / 2, 0]}
            to={[0, axisLen / 2, 0]}
            color={SAGITTAL_COLOR}
            label="Eje vertical"
            labelPos={[0, axisLen / 2 + labelSize, 0]}
            labelSize={labelSize}
          />
          <AxisLine
            from={[0, 0, -axisLen / 2]}
            to={[0, 0, axisLen / 2]}
            color={FRONTAL_COLOR}
            label="Eje sagital"
            labelPos={[0, 0, axisLen / 2 + labelSize]}
            labelSize={labelSize}
          />
          <AxisLine
            from={[-axisLen / 2, 0, 0]}
            to={[axisLen / 2, 0, 0]}
            color={TRANSVERSE_COLOR}
            label="Eje frontal"
            labelPos={[axisLen / 2 + labelSize, 0, 0]}
            labelSize={labelSize}
          />
        </>
      )}
    </group>
  );
}

/* ===========================================================================
 * AXIS LINE — a single straight line segment with a label at its far end.
 * ===========================================================================
 * Built from a BufferGeometry with two points so it works without OrbitControls
 * / Line2 extras. Positions are LOCAL to the overlay group (already centered on
 * the body), so callers pass body-relative offsets.
 */
function AxisLine({
  from,
  to,
  color,
  label,
  labelPos,
  labelSize,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: number;
  label: string;
  labelPos: [number, number, number];
  labelSize: number;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([...from, ...to], 3),
    );
    return g;
    // from/to are stable per overlay render; rebuild only if they change.
  }, [from, to]);

  return (
    <group>
      <line>
        <primitive object={geometry} attach="geometry" />
        <lineBasicMaterial color={color} transparent opacity={0.9} />
      </line>
      <Text
        position={labelPos}
        fontSize={labelSize}
        color={LABEL_COLOR}
        outlineWidth={labelSize * 0.08}
        outlineColor={LABEL_OUTLINE}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}
