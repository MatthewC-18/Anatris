// src/components/movement/RigOverlays.tsx
//
// In-canvas premium overlays for the movement lab, layered on top of the skinned
// rig (RigModel) and driven by the SAME rigChannel:
//
//   1. REAL-MUSCLE HIGHLIGHT. The muscles active in the current phase (sent by
//      MovementControls with their role) glow on the active side: their real rig
//      meshes get a role-colored emissive clone material, so the eye goes to the
//      structure that works at that degree. Everything else stays as RigModel
//      painted it.
//   2. ROTATION-AXIS MARKER. A thin didactic axis line + rotation ring through
//      the driven joint, ORIENTED BY the active movement's rig.axis (data, not a
//      hardcoded axis). Toggleable.
//   3. PER-PLANE CAMERA FRAMING. On movement change, the camera eases to a view
//      that reads the plane (frontal for abduction, sagittal for flexion, an
//      oblique for rotation). The initial framing is left to RigViewer/AutoFit.
//
// FULLY REVERSIBLE: on unmount every cloned material is restored to the shared
// one RigModel assigned and disposed, and the marker group is removed. The lab
// canvas also unmounts wholesale when leaving the lab, so nothing leaks.
//
// PERF: the muscle resolution (id -> mesh names) is built ONCE at mount. Per
// command we only diff the small active-muscle set and touch those materials;
// there is no per-frame scene.traverse here.
//
// ASCII-only source; UI has no strings here; no `any`.

import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { CameraControls } from '@react-three/drei';
import * as THREE from 'three';

import { rigChannel, type RigCommand } from './RigModel';
import { buildMuscleResolution } from '../../lib/muscleResolver';
import { parseMeshName } from '../../lib/parseMeshName';
import { MUSCLES_BY_REGION } from '../../data/musclesByRegion';
import { movementById } from '../../data/romByRegion';
import { getBoneControl, resolveArmatureName, type Side } from '../../lib/boneMap';
import type { RomMuscleRole } from '../../types/rom';

// Role -> emissive glow color (amber prime / sky assistant / violet stabilizer),
// matching the control panel and the app's role palette.
const ROLE_GLOW: Record<RomMuscleRole, number> = {
  'prime-mover': 0xffa51e,
  assistant: 0x38bdf8,
  stabilizer: 0xa78bfa,
};
const GLOW_INTENSITY: Record<RomMuscleRole, number> = {
  'prime-mover': 0.95,
  assistant: 0.6,
  stabilizer: 0.4,
};

/** Side letter -> parsed-mesh side. */
function parsedSide(side: Side): 'left' | 'right' {
  return side === 'R' ? 'right' : 'left';
}

/** Every muscle across all regions, for resolving any movement's muscles. */
const ALL_MUSCLES = Object.values(MUSCLES_BY_REGION).flat();

interface GlowEntry {
  original: THREE.Material;
  clone: THREE.MeshStandardMaterial;
}

export function RigOverlays(): JSX.Element {
  const { scene } = useThree();
  const controls = useThree((s) => s.controls) as CameraControls | null;

  // Collect the scene's mesh names ONCE and build the muscle-id -> mesh-names
  // resolution over the rig (its Z-Anatomy names match the clinical meshBases).
  const resolution = useMemo(() => {
    const names: string[] = [];
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) names.push(o.name);
    });
    return buildMuscleResolution(ALL_MUSCLES, names);
  }, [scene]);

  // Regression guard: the scene highlight relies on the rig's Z-Anatomy mesh
  // names matching the clinical meshBases. If a re-export renamed them, the
  // resolution comes back empty and the highlight silently does nothing -- warn
  // once so it is detectable rather than mysterious.
  useEffect(() => {
    const probes = ['deltoid', 'supraspinatus', 'infraspinatus'];
    const resolved = probes.filter(
      (id) => (resolution.meshNamesByMuscleId.get(id)?.length ?? 0) > 0,
    );
    if (resolved.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        '[RigOverlays] muscle highlight resolved 0 meshes for shoulder movers; ' +
          'rig mesh names may have changed (scene highlight will be inert).',
      );
    }
  }, [resolution]);

  // Fast mesh lookup by name for the highlight pass.
  const meshByName = useMemo(() => {
    const map = new Map<string, THREE.Mesh>();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) map.set(m.name, m);
    });
    return map;
  }, [scene]);

  // Currently glowing meshes -> how to restore them.
  const glowRef = useRef<Map<THREE.Mesh, GlowEntry>>(new Map());
  // Didactic marker group (added to the scene, removed on unmount).
  const markerRef = useRef<THREE.Group | null>(null);
  // Track the last framed movement so we only reframe on a real change, and skip
  // the very first frame (AutoFit owns the initial framing).
  const lastFramedRef = useRef<string | null>(null);
  const firstRef = useRef(true);

  useEffect(() => {
    // --- Marker group: axis line + rotation ring, hidden until a command sets it.
    const marker = new THREE.Group();
    marker.renderOrder = 998;
    const axisMat = new THREE.LineBasicMaterial({
      color: 0xfcd34d,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    const axisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.32, 0),
      new THREE.Vector3(0, 0.32, 0),
    ]);
    const axisLine = new THREE.Line(axisGeom, axisMat);
    axisLine.renderOrder = 999;
    const ringGeom = new THREE.TorusGeometry(0.16, 0.006, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfcd34d,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2; // ring lies in the plane perpendicular to +Y
    ring.renderOrder = 999;
    marker.add(axisLine);
    marker.add(ring);
    marker.visible = false;
    scene.add(marker);
    markerRef.current = marker;

    const yUp = new THREE.Vector3(0, 1, 0);
    const tmpQuat = new THREE.Quaternion();
    const tmpAxis = new THREE.Vector3();
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();

    /** Find the driven joint object for a movement + side, or null. */
    const findJoint = (movementId: string, side: Side): THREE.Object3D | null => {
      const ctrl = getBoneControl(movementId);
      if (!ctrl) return null;
      let armatureName: string | null = null;
      let boneName: string | null = null;
      if (ctrl.kind === 'joint') {
        armatureName = resolveArmatureName(ctrl.armatureBase, side);
        boneName = ctrl.bone;
      } else if (ctrl.kind === 'chain') {
        armatureName = resolveArmatureName('Shoulder_Armature', side);
        boneName = 'humerus_gh';
      } else {
        return null; // spine / unsupported: no single-axis marker
      }
      const root = scene.getObjectByName(armatureName);
      if (!root || !boneName) return null;
      let found: THREE.Object3D | null = null;
      root.traverse((o) => {
        if (found) return;
        if (o.name.replace(/_\d+$/, '') === boneName) found = o;
      });
      return found;
    };

    /** Orient + place the marker on the driven joint along the movement axis. */
    const placeMarker = (cmd: RigCommand): void => {
      const mk = markerRef.current;
      if (!mk) return;
      const show = cmd.showMarkers !== false && !!cmd.movementId;
      if (!show) {
        mk.visible = false;
        return;
      }
      const mv = movementById(cmd.movementId);
      const joint = cmd.movementId ? findJoint(cmd.movementId, cmd.side) : null;
      if (!mv?.rig || !joint) {
        mk.visible = false;
        return;
      }
      joint.updateWorldMatrix(true, false);
      joint.matrixWorld.decompose(worldPos, worldQuat, worldScale);
      // rig.axis is the bone's LOCAL rotation axis; bring it to world space.
      tmpAxis.set(mv.rig.axis[0], mv.rig.axis[1], mv.rig.axis[2]).normalize();
      tmpAxis.applyQuaternion(worldQuat).normalize();
      // Orient the marker (built around +Y) so +Y aligns with the world axis.
      tmpQuat.setFromUnitVectors(yUp, tmpAxis);
      mk.quaternion.copy(tmpQuat);
      mk.position.copy(worldPos);
      mk.visible = true;
    };

    // --- Highlight: glow the active muscles' real meshes, restore the rest.
    const applyHighlight = (cmd: RigCommand): void => {
      const glow = glowRef.current;
      const wantSide = parsedSide(cmd.side);
      const list = cmd.highlight ?? [];
      // Build the target mesh -> role map for this command.
      const targets = new Map<THREE.Mesh, RomMuscleRole>();
      for (const h of list) {
        const names = resolution.meshNamesByMuscleId.get(h.muscleId);
        if (!names) continue;
        for (const name of names) {
          if (parseMeshName(name).side !== wantSide) continue;
          const mesh = meshByName.get(name);
          if (!mesh || !mesh.visible) continue;
          // First role listed for a mesh wins (prime-mover is listed first).
          if (!targets.has(mesh)) targets.set(mesh, h.role);
        }
      }
      // Remove glow from meshes no longer targeted.
      for (const [mesh, entry] of glow) {
        if (!targets.has(mesh)) {
          mesh.material = entry.original;
          entry.clone.dispose();
          glow.delete(mesh);
        }
      }
      // Add / update glow on targeted meshes.
      for (const [mesh, role] of targets) {
        const existing = glow.get(mesh);
        const base = existing ? existing.original : (mesh.material as THREE.Material);
        // If already glowing with a different role, refresh the clone color.
        if (existing) {
          existing.clone.emissive.setHex(ROLE_GLOW[role]);
          existing.clone.emissiveIntensity = GLOW_INTENSITY[role];
          continue;
        }
        // Clone the shared material so only THIS mesh glows.
        const src = base as THREE.MeshStandardMaterial;
        const clone = (src.clone
          ? src.clone()
          : new THREE.MeshStandardMaterial()) as THREE.MeshStandardMaterial;
        clone.emissive = new THREE.Color(ROLE_GLOW[role]);
        clone.emissiveIntensity = GLOW_INTENSITY[role];
        mesh.material = clone;
        glow.set(mesh, { original: base, clone });
      }
    };

    // --- Camera framing per plane on movement change.
    const frameForPlane = (cmd: RigCommand): void => {
      if (!controls || !cmd.movementId) return;
      if (firstRef.current) {
        // Let AutoFit own the initial framing; just record the movement.
        firstRef.current = false;
        lastFramedRef.current = cmd.movementId;
        return;
      }
      if (cmd.movementId === lastFramedRef.current) return;
      lastFramedRef.current = cmd.movementId;
      const plane = movementById(cmd.movementId)?.plane ?? '';
      // Azimuth/polar chosen so the gesture's plane faces the viewer.
      let azimuth = 0;
      let polar = 1.35; // ~77 deg from top
      if (plane === 'Sagital') azimuth = Math.PI / 2; // side-on for flexion
      else if (plane === 'Transversal') { azimuth = Math.PI / 5; polar = 1.0; }
      else azimuth = 0; // Frontal (abduction): face front
      // Mirror azimuth for the left side so the driven limb stays toward camera.
      if (cmd.side === 'L') azimuth = -azimuth;
      void controls.rotateTo(azimuth, polar, true);
    };

    const onCommand = (cmd: RigCommand): void => {
      applyHighlight(cmd);
      placeMarker(cmd);
      frameForPlane(cmd);
    };

    onCommand(rigChannel.get());
    const unsub = rigChannel.subscribe(onCommand);

    return () => {
      unsub();
      // Restore every glowing mesh and dispose its clone.
      for (const [mesh, entry] of glowRef.current) {
        mesh.material = entry.original;
        entry.clone.dispose();
      }
      glowRef.current.clear();
      // Remove + dispose the marker.
      const mk = markerRef.current;
      if (mk) {
        scene.remove(mk);
        mk.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        });
        markerRef.current = null;
      }
    };
  }, [scene, controls, resolution, meshByName]);

  return <group />;
}
