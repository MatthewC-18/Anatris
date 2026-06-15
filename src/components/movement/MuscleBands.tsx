// src/components/movement/MuscleBands.tsx
//
// 3D muscle-band proxies for the movement lab. The Z-Anatomy meshes can't
// deform (no skin), so during a gesture we fade the detailed muscle (the rig
// does that) and draw a TUBE from the muscle's origin (fixed on the scapula) to
// its insertion (which we rotate with the humerus about the same glenohumeral
// pivot the bone uses). The tube shortens and thickens as the joint moves —
// an honest, legible "the muscle is contracting" cue, in the Muscle&Motion
// spirit, rather than faking deformation of the realistic mesh.
//
// Lives INSIDE the canvas (uses useThree). Renders nothing at rest (angle 0) so
// the untouched anatomy shows normally; bands appear as the arm abducts.

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { parseMeshName } from '../../lib/parseMeshName';
import { rotateAboutPivot, bandRadius, bulgeOffset } from '../../lib/muscleBand';
import {
  shoulderRigChannel,
  RIGHT_GH_PIVOT,
  ABDUCTION_AXIS,
} from '../ShoulderRotationPrototype';
import { SHOULDER_ROM } from '../../data/shoulderRom';
import { phaseAtAngle } from '../../lib/romPhaseAtAngle';
import type { RomMuscleRole } from '../../types/rom';
import type { MuscleResolution } from '../../lib/muscleResolver';

// Muscles drawn as deforming bands during abduction. Kept to the legible
// abductors (broad superficial deltoid + the cuff initiator) so the scene stays
// clean; the list is data so adding more is trivial.
const BAND_MUSCLE_IDS = ['deltoid', 'supraspinatus'];

const ABDUCTION = SHOULDER_ROM['glenohumeral-abduction'];

// Role -> color (amber prime / sky assistant / violet stabilizer), matching the
// rest of the app. Muscles not active in the current phase render muted slate.
const ROLE_COLOR: Record<RomMuscleRole, number> = {
  'prime-mover': 0xffa51e,
  assistant: 0x38bdf8,
  stabilizer: 0xa78bfa,
};
const INACTIVE_COLOR = 0x64748b;

// Tube sizing in world units (model arm span ~1 unit). With the muscles hidden
// (clean skeleton), the bands carry the muscle read, so they're a touch bolder.
// These are the obvious knobs for a visual pass.
const BASE_RADIUS = 0.026;
const MIN_RADIUS = 0.015;
const MAX_RADIUS = 0.06;
const BASE_BULGE = 0.012;
const BULGE_GAIN = 0.5;

interface RestData {
  muscleId: string;
  origin: THREE.Vector3;
  insertionRest: THREE.Vector3;
  restLength: number;
}

/** Average world position of a muscle's meshes for one part on the right side. */
function partCentroid(
  scene: THREE.Object3D,
  resolution: MuscleResolution,
  muscleId: string,
  part: 'origin' | 'insertion',
): THREE.Vector3 | null {
  const acc = new THREE.Vector3();
  const w = new THREE.Vector3();
  let count = 0;
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const muscle = resolution.muscleByMeshName.get(mesh.name);
    if (!muscle || muscle.id !== muscleId) return;
    const parsed = parseMeshName(mesh.name);
    if (parsed.part !== part) return;
    if (parsed.side !== 'right') return;
    mesh.getWorldPosition(w);
    if (!isFinite(w.x)) return;
    acc.add(w);
    count++;
  });
  return count > 0 ? acc.multiplyScalar(1 / count) : null;
}

/** Current role of a muscle at the given abduction angle, or null if inactive. */
function roleAtAngle(muscleId: string, angleDeg: number): RomMuscleRole | null {
  if (!ABDUCTION) return null;
  const at = phaseAtAngle(ABDUCTION, angleDeg);
  const ref = at?.phase.muscles.find((m) => m.muscleId === muscleId);
  return ref ? ref.role : null;
}

export function MuscleBands({ resolution }: { resolution: MuscleResolution }) {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const restRef = useRef<RestData[]>([]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // --- Measure each band muscle's origin + rest insertion ONCE. The muscle
    // meshes never move (the rig only moves bones), so their positions are
    // always the rest pose; we rotate the insertion analytically per angle.
    scene.updateWorldMatrix(true, true);
    const rest: RestData[] = [];
    for (const muscleId of BAND_MUSCLE_IDS) {
      const origin = partCentroid(scene, resolution, muscleId, 'origin');
      const insertionRest = partCentroid(scene, resolution, muscleId, 'insertion');
      if (!origin || !insertionRest) continue; // can't anchor -> skip honestly
      rest.push({
        muscleId,
        origin,
        insertionRest,
        restLength: origin.distanceTo(insertionRest),
      });
    }
    restRef.current = rest;

    const clear = (): void => {
      while (group.children.length > 0) {
        const child = group.children[0] as THREE.Mesh;
        group.remove(child);
        child.geometry?.dispose();
        (child.material as THREE.Material)?.dispose();
      }
    };

    const rebuild = (angleDeg: number): void => {
      clear();
      if (angleDeg <= 0) return; // at rest, show the real anatomy untouched
      const angleRad = THREE.MathUtils.degToRad(angleDeg);

      for (const r of restRef.current) {
        const insertion = rotateAboutPivot(
          r.insertionRest,
          RIGHT_GH_PIVOT,
          ABDUCTION_AXIS,
          angleRad,
        );
        const curLen = r.origin.distanceTo(insertion);
        const radius = bandRadius(r.restLength, curLen, BASE_RADIUS, MIN_RADIUS, MAX_RADIUS);

        const mid = r.origin.clone().add(insertion).multiplyScalar(0.5);
        const outward = mid.clone().sub(RIGHT_GH_PIVOT).normalize();
        const midCtrl = mid.add(bulgeOffset(r.restLength, curLen, outward, BASE_BULGE, BULGE_GAIN));

        const curve = new THREE.CatmullRomCurve3([r.origin, midCtrl, insertion]);
        const geom = new THREE.TubeGeometry(curve, 24, radius, 10, false);

        const role = roleAtAngle(r.muscleId, angleDeg);
        const color = role ? ROLE_COLOR[role] : INACTIVE_COLOR;
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: role ? 0.3 : 0.1,
          roughness: 0.5,
          metalness: 0,
          transparent: true,
          opacity: role ? 0.96 : 0.5,
        });
        const tube = new THREE.Mesh(geom, mat);
        tube.renderOrder = 996;
        group.add(tube);
      }
    };

    rebuild(shoulderRigChannel.get().angleDeg);
    const unsub = shoulderRigChannel.subscribe((s) => rebuild(s.angleDeg));

    return () => {
      unsub();
      clear();
      restRef.current = [];
    };
  }, [scene, resolution]);

  return <group ref={groupRef} />;
}
