// src/components/movement/ShoulderRhythmArc.tsx
//
// In-scene "arco fino" for shoulder ELEVATION, styled after the Universite Lyon
// anatomie3d goniometer plates: a thin, non-blocking protractor drawn around the
// glenohumeral joint IN the 3D scene, with the reference arc (0..180), the sector
// ticks (30 / 90 / 120 / 150 deg) and a needle that lies exactly along the arm.
//
// ROBUST BY CONSTRUCTION: the whole arc is derived from the REAL bone positions,
// not from a guessed axis. The upper-arm direction is the world vector from the
// humerus_gh bone to the forearm_flex (elbow) bone, so the needle always overlays
// the humerus and the plane of the arc always matches how the arm is actually
// moving (frontal for abduction, sagittal for flexion) -- it cannot drift from the
// model. Elevation is measured from the vertical (arm-at-rest) reference.
//
// Thin lines + depthTest:false + high renderOrder => it reads over the body
// without hiding it. Toggled by the "Arco en el modelo" checkbox (rigChannel
// showMarkers) and only shown for the shoulder elevation gestures.
//
// Fully reversible: geometry/materials disposed on unmount. ASCII source; no `any`.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { rigChannel, type RigCommand } from './RigModel';
import { resolveArmatureName, type Side } from '../../lib/boneMap';

/** The elevation gestures this arc covers (both raise the arm from the side). */
const ELEVATION_IDS = new Set(['glenohumeral-abduction', 'glenohumeral-flexion']);

/** Sector boundaries (deg) marked on the arc, matching the clinical phases. */
const SECTOR_DEG = [30, 90, 120, 150];

const DEG = Math.PI / 180;
const ACCENT = 0x22d3ee;
const AMBER = 0xfbbf24;

// Dial radius as a FRACTION of the upper-arm length. A real goniometer's dial sits
// compact at the fulcrum while the movable arm (the needle) runs the full limb, so
// keep the arc tight (~0.6x) and let the needle reach the elbow. A full-arm-radius
// bright arc read as a "ring" around the whole shoulder (G2 feedback).
const R_ARC = 0.62;

/** Build a unit-radius semicircle (phi 0..pi): local (sin, -cos, 0) = down->up. */
function semicirclePoints(n: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const phi = (i / n) * Math.PI;
    pts.push(new THREE.Vector3(Math.sin(phi), -Math.cos(phi), 0));
  }
  return pts;
}

export function ShoulderRhythmArc(): JSX.Element {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);
  const needleRef = useRef<THREE.Line | null>(null);
  // Bright "progress" arc (0 -> current elevation), swept via setDrawRange so the
  // dial reads as a filling goniometer, not a static ring.
  const progressRef = useRef<THREE.Line | null>(null);
  // Cached bones (re-resolved when the side changes or until the rig loads).
  const bonesRef = useRef<{ side: Side; shoulder: THREE.Object3D; elbow: THREE.Object3D } | null>(null);

  useEffect(() => {
    // --- Build the arc group ONCE (unit radius; scaled to the arm length each
    // frame). Everything depthTest:false so it floats over the body as thin guides.
    const group = new THREE.Group();
    group.renderOrder = 997;
    group.visible = false;

    // Arc points at the compact dial radius (unit semicircle scaled by R_ARC).
    const arcPts = semicirclePoints(48).map((p) => p.multiplyScalar(R_ARC));

    // Reference arc: the whole 0..180 range, drawn FAINT so it frames the dial
    // without shouting (this is what used to read as a bright ring).
    const referenceArc = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(arcPts),
      new THREE.LineBasicMaterial({
        color: ACCENT,
        transparent: true,
        opacity: 0.26,
        depthTest: false,
      }),
    );
    referenceArc.renderOrder = 997;
    group.add(referenceArc);

    // Progress arc: 0 -> current elevation, BRIGHT. Same geometry; swept per frame
    // with setDrawRange so it fills like a goniometer instead of a static ring.
    const progressGeom = new THREE.BufferGeometry().setFromPoints(arcPts);
    progressGeom.setDrawRange(0, 1);
    const progressArc = new THREE.Line(
      progressGeom,
      new THREE.LineBasicMaterial({
        color: ACCENT,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
      }),
    );
    progressArc.renderOrder = 998;
    group.add(progressArc);
    progressRef.current = progressArc;

    // Sector ticks: short radial dashes across the dial at the phase boundaries.
    const tickMat = new THREE.LineBasicMaterial({
      color: AMBER,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    for (const deg of SECTOR_DEG) {
      const phi = deg * DEG;
      const dir = new THREE.Vector3(Math.sin(phi), -Math.cos(phi), 0);
      const tick = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          dir.clone().multiplyScalar(R_ARC - 0.06),
          dir.clone().multiplyScalar(R_ARC + 0.06),
        ]),
        tickMat,
      );
      tick.renderOrder = 998;
      group.add(tick);
    }

    // End caps at 0 deg (rest / down) and 180 deg (up).
    const capMat = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.7,
      depthTest: false,
    });
    for (const deg of [0, 180]) {
      const phi = deg * DEG;
      const dir = new THREE.Vector3(Math.sin(phi), -Math.cos(phi), 0);
      const cap = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          dir.clone().multiplyScalar(R_ARC - 0.09),
          dir.clone().multiplyScalar(R_ARC + 0.09),
        ]),
        capMat,
      );
      cap.renderOrder = 998;
      group.add(cap);
    }

    // Needle: a unit line down (0,-1,0), rotated about local +Z by the elevation
    // so it lands exactly on the arm (see header note).
    const needleMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    const needle = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -1, 0),
      ]),
      needleMat,
    );
    needle.renderOrder = 999;
    group.add(needle);
    needleRef.current = needle;

    scene.add(group);
    groupRef.current = group;

    return () => {
      scene.remove(group);
      group.traverse((o) => {
        const m = o as THREE.Line;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      groupRef.current = null;
      needleRef.current = null;
      progressRef.current = null;
    };
  }, [scene]);

  // Resolve the shoulder + elbow bones for a side (retried until the rig loads).
  const resolveBones = (side: Side): boolean => {
    if (bonesRef.current && bonesRef.current.side === side) return true;
    const root = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side));
    if (!root) return false;
    let shoulder: THREE.Object3D | null = null;
    let elbow: THREE.Object3D | null = null;
    root.traverse((o) => {
      const base = o.name.replace(/_\d+$/, '');
      if (base === 'humerus_gh' && !shoulder) shoulder = o;
      else if (base === 'forearm_flex' && !elbow) elbow = o;
    });
    if (!shoulder || !elbow) return false;
    bonesRef.current = { side, shoulder, elbow };
    return true;
  };

  // Scratch vectors (avoid per-frame allocation).
  const sPos = useRef(new THREE.Vector3()).current;
  const ePos = useRef(new THREE.Vector3()).current;
  const armDir = useRef(new THREE.Vector3()).current;
  const down = useRef(new THREE.Vector3(0, -1, 0)).current;
  const side = useRef(new THREE.Vector3()).current;
  const zAxis = useRef(new THREE.Vector3()).current;
  const negDown = useRef(new THREE.Vector3()).current;
  const basis = useRef(new THREE.Matrix4()).current;

  useFrame(() => {
    const group = groupRef.current;
    const needle = needleRef.current;
    if (!group || !needle) return;

    const cmd: RigCommand = rigChannel.get();
    const show =
      cmd.showMarkers !== false && !!cmd.movementId && ELEVATION_IDS.has(cmd.movementId);
    if (!show || !resolveBones(cmd.side)) {
      group.visible = false;
      return;
    }
    const bones = bonesRef.current;
    if (!bones) {
      group.visible = false;
      return;
    }

    bones.shoulder.getWorldPosition(sPos);
    bones.elbow.getWorldPosition(ePos);
    armDir.copy(ePos).sub(sPos);
    const armLen = armDir.length();
    if (armLen < 1e-4) {
      group.visible = false;
      return;
    }
    armDir.multiplyScalar(1 / armLen);

    // Elevation = angle of the arm from the vertical rest reference.
    const dot = THREE.MathUtils.clamp(armDir.dot(down), -1, 1);
    const elevation = Math.acos(dot); // radians, 0 = arm down
    // Direction the arm elevated INTO (perpendicular to vertical, in its plane).
    side.copy(armDir).addScaledVector(down, -dot);
    if (side.length() < 0.04) {
      // Arm essentially at rest: nothing meaningful to draw yet.
      group.visible = false;
      return;
    }
    side.normalize();

    // Orient the group: local +X -> side, local +Y -> -down (up), local +Z -> plane
    // normal. Then a local point (sin,-cos,0) maps onto cos*down + sin*side, i.e.
    // the arc lies exactly in the arm's plane of motion.
    negDown.copy(down).multiplyScalar(-1);
    zAxis.copy(side).cross(negDown).normalize();
    basis.makeBasis(side, negDown, zAxis);
    group.quaternion.setFromRotationMatrix(basis);
    group.position.copy(sPos);
    group.scale.setScalar(armLen);
    // Needle rotates from down by the elevation, landing along the humerus.
    needle.rotation.z = elevation;
    // Sweep the bright progress arc from 0 to the current elevation (49 points
    // span 0..180, so map the elevation fraction onto the vertex count).
    const prog = progressRef.current;
    if (prog) {
      const frac = THREE.MathUtils.clamp(elevation / Math.PI, 0, 1);
      prog.geometry.setDrawRange(0, Math.max(2, Math.round(frac * 48) + 1));
    }
    group.visible = true;
  });

  return <group />;
}
