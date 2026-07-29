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
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, type CameraControls } from '@react-three/drei';
import * as THREE from 'three';

import { rigChannel, type RigCommand } from './RigModel';
import { buildMuscleResolution, type MuscleResolution } from '../../lib/muscleResolver';
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
// Same role hues as THREE.Color, reused to tint the muscle's own diffuse color so
// an active muscle visibly CHANGES color (not just a faint emissive over red).
const ROLE_COLOR3: Record<RomMuscleRole, THREE.Color> = {
  'prime-mover': new THREE.Color(ROLE_GLOW['prime-mover']),
  assistant: new THREE.Color(ROLE_GLOW.assistant),
  stabilizer: new THREE.Color(ROLE_GLOW.stabilizer),
};
// Peak emissive intensity per role (reached at activation level 1). The live glow
// is this scaled by the muscle's activation level, so a muscle fades in as it
// enters its recruitment range and brightens toward its peak effort. TUNED DOWN
// from the first premium pass (prime 1.05/assist 0.6/stab 0.42): at peak the
// muscle self-illuminated so uniformly it lost all form and read as a FLAT amber
// blob. These levels still say "on" clearly but let the studio light keep the
// muscle's dimensional shading -- see paintGlow.
const ROLE_GLOW_MAX: Record<RomMuscleRole, number> = {
  'prime-mover': 0.72,
  assistant: 0.48,
  stabilizer: 0.34,
};
// A faint floor so a barely-recruited muscle is still visibly "on" rather than
// invisible at low levels.
const GLOW_FLOOR = 0.1;

/** Live emissive intensity for a role at an activation level 0..1. */
function glowIntensity(role: RomMuscleRole, level: number): number {
  const l = level <= 0 ? 0 : level > 1 ? 1 : level;
  return GLOW_FLOOR + (ROLE_GLOW_MAX[role] - GLOW_FLOOR) * l;
}

/**
 * Paint an active muscle's clone so it clearly "turns on" WITHOUT looking like a
 * flat colored sticker (premium pass). The muscle keeps its anatomical red
 * diffuse -- we only nudge it a LITTLE toward the role hue (so the role is still
 * legible) and carry the "on" signal mostly through a strong emissive GLOW. The
 * old heavy diffuse lerp (0.5..0.95 toward the pure role hue) repainted the whole
 * belly cyan/violet, which read as an unnatural plaque over the abs/back; the
 * emissive-forward mix below stays meaty and reads clearly even through the glass
 * skin.
 */
function paintGlow(
  clone: THREE.MeshStandardMaterial,
  baseColor: THREE.Color,
  role: RomMuscleRole,
  level: number,
): void {
  const l = level <= 0 ? 0 : level > 1 ? 1 : level;
  // Light diffuse tint only: 0.10 at the floor -> 0.30 at peak effort, so the
  // muscle stays clearly RED-dominant at every level instead of turning solid
  // role-color (was 0.15 -> 0.45, which pushed the belly too far to amber).
  clone.color.copy(baseColor).lerp(ROLE_COLOR3[role], 0.1 + 0.2 * l);
  clone.emissive.copy(ROLE_COLOR3[role]);
  clone.emissiveIntensity = glowIntensity(role, l);
}

// IMPLICATED emphasis: the structure a PATHOLOGY blames (from the readout banner)
// glows a warm "injured" orange and PULSES (see the useFrame), so the eye is drawn
// to WHERE the problem is on the model. Distinct from the cool/amber role glows.
const IMPLICATED_HEX = 0xf97316;
const IMPLICATED_COLOR3 = new THREE.Color(IMPLICATED_HEX);
/** Base emissive for an implicated mesh; the pulse breathes around it. */
const IMPLICATED_EMISSIVE = 1.0;

/** Paint an implicated structure with the warm injured emphasis (pulsed live). */
function paintImplicated(clone: THREE.MeshStandardMaterial, baseColor: THREE.Color): void {
  // Push the diffuse noticeably toward orange (more than a role tint) and set a
  // strong emissive; the useFrame modulates emissiveIntensity for the pulse.
  clone.color.copy(baseColor).lerp(IMPLICATED_COLOR3, 0.45);
  clone.emissive.copy(IMPLICATED_COLOR3);
  clone.emissiveIntensity = IMPLICATED_EMISSIVE;
}

/** Side letter -> parsed-mesh side. */
function parsedSide(side: Side): 'left' | 'right' {
  return side === 'R' ? 'right' : 'left';
}

/** Every muscle across all regions, for resolving any movement's muscles. */
const ALL_MUSCLES = Object.values(MUSCLES_BY_REGION).flat();

// --- Manual-resistance overlay: the therapist's interaction with the patient. ---
// A physio never just watches the movement -- they RESIST it. Instead of a
// stylized prop, we place a REAL therapist HAND (extracted from the anatomy model,
// public/therapist-hand.glb -- palm + digits + wrist, ~2.5k verts) at the distal
// contact, pressing on the segment. That reads premium, not cartoonish.
//
// The GLB is normalized + reoriented; after the Blender Z-up -> glTF Y-up export
// its local frame is: FINGERS along Z (length 1), PALM NORMAL along Y, WIDTH along
// X. placeResistance orients the palm normal (+Y) along the resistance force and
// the fingers (Z) along the limb, then scales to the segment.
const THERAPIST_HAND_URL = '/therapist-hand.glb?v=1';
// A NITRILE-GLOVE blue-teal: unmistakably a clinician's hand, never confused with
// the patient's skin (a skin-toned hand blended into the arm and "no se apreciaba
// que era la mano del fisio").
const THERAPIST_GLOVE = 0x39a9c4;
useGLTF.preload(THERAPIST_HAND_URL);

// Which bone marks the DISTAL end of the segment a given driven bone moves. The
// therapist resists on that distal segment (a physio never resists at the joint
// itself). Verified names from scripts/dump-rig.mjs: humerus_gh -> forearm_flex
// (elbow), forearm_* -> hand_flex (wrist), shin_flex -> foot_flex (ankle).
const DISTAL_OF: Record<string, string> = {
  humerus_gh: 'forearm_flex',
  forearm_flex: 'hand_flex',
  forearm_rot: 'hand_flex',
  shin_flex: 'foot_flex',
};

/** The therapist-hand material: a nitrile glove, clearly not the patient. */
function makeTherapistHandMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: THERAPIST_GLOVE,
    roughness: 0.45,
    metalness: 0.0,
    // A slight self-glow so the glove reads on the dark stage + pops off the skin.
    emissive: new THREE.Color(THERAPIST_GLOVE).multiplyScalar(0.22),
    side: THREE.DoubleSide,
  });
}

interface GlowEntry {
  original: THREE.Material;
  clone: THREE.MeshStandardMaterial;
  /** True when this mesh is emphasized as a pathology's implicated structure. */
  implicated: boolean;
}

export function RigOverlays(): JSX.Element {
  const { scene } = useThree();
  const controls = useThree((s) => s.controls) as CameraControls | null;
  const camera = useThree((s) => s.camera);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  // The real therapist hand geometry (loaded once, reused for both hands).
  const handGltf = useGLTF(THERAPIST_HAND_URL) as unknown as { scene: THREE.Group };
  const handGeom = useMemo(() => {
    let g: THREE.BufferGeometry | null = null;
    handGltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !g) g = m.geometry;
    });
    return g;
  }, [handGltf]);
  const handGeomRef = useRef<THREE.BufferGeometry | null>(handGeom);
  handGeomRef.current = handGeom;

  // Muscle-id -> mesh-names resolution and a name -> mesh lookup, built from the
  // rig scene. Held in refs and populated from an EFFECT (post-commit), with a
  // per-frame retry until the rig meshes exist.
  //
  // COLD-LOAD FIX: on the first mount the rig's <primitive> (RigModel) is attached
  // to the scene a tick AFTER this component renders, so building this at RENDER
  // time (useMemo) traversed an EMPTY scene -> the highlight resolved 0 meshes and
  // stayed inert (no glow) until an unrelated HMR remount happened to catch a
  // populated scene. That is why the colors showed during hot-reload but never on
  // a fresh page load. Building in an effect + retrying, then rebroadcasting the
  // current command, makes the glow appear on a cold load without any user input.
  const resolutionRef = useRef<MuscleResolution | null>(null);
  const meshByNameRef = useRef<Map<string, THREE.Mesh>>(new Map());

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let tries = 0;
    const build = () => {
      if (cancelled) return;
      const names: string[] = [];
      const byName = new Map<string, THREE.Mesh>();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          names.push(m.name);
          byName.set(m.name, m);
        }
      });
      const res = buildMuscleResolution(ALL_MUSCLES, names);
      const ready = res.meshNamesByMuscleId.size > 0;
      if (ready || tries > 180) {
        resolutionRef.current = res;
        meshByNameRef.current = byName;
        if (!ready) {
          // eslint-disable-next-line no-console
          console.warn(
            '[RigOverlays] muscle highlight resolved 0 meshes after load; ' +
              'rig mesh names may have changed (scene highlight will be inert).',
          );
        }
        // Rebroadcast the current command so the glow applies to the now-present
        // meshes even if the user has not touched the slider yet.
        rigChannel.set({});
        return;
      }
      tries += 1;
      raf = requestAnimationFrame(build);
    };
    build();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scene]);

  // Currently glowing meshes -> how to restore them.
  const glowRef = useRef<Map<THREE.Mesh, GlowEntry>>(new Map());
  // Phase accumulator for the implicated-structure pulse (see useFrame).
  const pulseRef = useRef(0);
  // Didactic marker group (added to the scene, removed on unmount).
  const markerRef = useRef<THREE.Group | null>(null);
  // Manual-resistance group: therapist contact hand + force arrow + stabilizing
  // hand. Added to the scene, hidden until a resistance command sets it.
  const resistanceRef = useRef<THREE.Group | null>(null);
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

    // --- Manual-resistance group: the therapist's real hand pressing on the
    // distal segment (one clean contact hand -- the resisting hand). ---
    const resistance = new THREE.Group();
    const handMat = makeTherapistHandMaterial();
    const geom = handGeomRef.current;
    const contactHand = geom ? new THREE.Mesh(geom, handMat) : new THREE.Object3D();
    resistance.add(contactHand);
    resistance.visible = false;
    scene.add(resistance);
    resistanceRef.current = resistance;

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

    // Shoulder ELEVATION gestures get the dedicated Lyon-style protractor
    // (ShoulderRhythmArc) instead of this axis ring, so suppress the ring for them
    // to avoid two overlapping guides at the joint.
    const ELEVATION_ARC_IDS = new Set([
      'glenohumeral-abduction',
      'glenohumeral-flexion',
    ]);

    /** Orient + place the marker on the driven joint along the movement axis. */
    const placeMarker = (cmd: RigCommand): void => {
      const mk = markerRef.current;
      if (!mk) return;
      const show =
        cmd.showMarkers !== false &&
        !!cmd.movementId &&
        !ELEVATION_ARC_IDS.has(cmd.movementId);
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

    // Scratch vectors for the resistance placement (avoid per-command allocation).
    const rJoint = new THREE.Vector3();
    const rDistal = new THREE.Vector3();
    const rContact = new THREE.Vector3();
    const rLever = new THREE.Vector3();
    const rForce = new THREE.Vector3();
    const rSurf = new THREE.Vector3();
    const rTmp = new THREE.Vector3();
    const WORLD_DOWN = new THREE.Vector3(0, -1, 0);

    /**
     * Place the therapist's hands + force arrow for a resisted movement.
     *
     * POSITION: the contact hand sits ~85% down the DISTAL segment (the moving
     * lever, e.g. the humerus for shoulder abduction), found via the named distal
     * bone -- a physio resists on the segment, not at the joint. The stabilizing
     * hand sits just proximal to the joint.
     *
     * DIRECTION: the force pushes the segment back toward its ANATOMICAL NEUTRAL
     * (the limb hangs down at rest), which is exactly "opposing the gesture" for
     * every elevation/flexion the lab drives -- and needs no per-movement axis
     * sign. Degenerate only for pure long-axis rotations, where it falls back to
     * straight down. Only the limb joints (single-axis joint / shoulder chain)
     * draw it.
     */
    const placeResistance = (cmd: RigCommand): void => {
      const grp = resistanceRef.current;
      if (!grp) return;
      const ctrl = cmd.movementId ? getBoneControl(cmd.movementId) : null;
      const isLimb = ctrl?.kind === 'joint' || ctrl?.kind === 'chain';
      const on = cmd.resistance === true && !!cmd.movementId && isLimb;
      const joint = on && cmd.movementId ? findJoint(cmd.movementId, cmd.side) : null;
      if (!on || !joint || !ctrl) {
        grp.visible = false;
        return;
      }
      joint.updateWorldMatrix(true, true);
      joint.getWorldPosition(rJoint);
      // Distal end of the moving segment, by NAME (robust across the twist bones
      // that share the joint origin). Chain (shoulder) moves the humerus.
      const drivenBone = ctrl.kind === 'chain' ? 'humerus_gh' : ctrl.bone;
      const distalName = DISTAL_OF[drivenBone];
      let distalObj: THREE.Object3D | null = null;
      if (distalName) {
        joint.traverse((o) => {
          if (!distalObj && o !== joint && o.name.replace(/_\d+$/, '') === distalName) {
            distalObj = o;
          }
        });
      }
      if (distalObj) {
        (distalObj as THREE.Object3D).getWorldPosition(rDistal);
      } else {
        // Fallback: farthest descendant.
        let bestD = 0;
        let has = false;
        joint.traverse((o) => {
          if (o === joint) return;
          o.getWorldPosition(rTmp);
          const d = rTmp.distanceToSquared(rJoint);
          if (d > bestD) {
            bestD = d;
            rDistal.copy(rTmp);
            has = true;
          }
        });
        if (!has) {
          grp.visible = false;
          return;
        }
      }
      // Full segment length (joint -> distal) sizes the hands + arrow so they are
      // always proportional to the limb, never the giant fixed-size gloves.
      const fullLen = rJoint.distanceTo(rDistal);
      // Contact 82% down the moving segment.
      rContact.copy(rJoint).lerp(rDistal, 0.82);
      // Limb long-axis direction (joint -> distal).
      rLever.copy(rDistal).sub(rJoint).normalize();
      // RESISTANCE direction: toward the contact's rest (limb hanging straight
      // down) -- i.e. opposing the gesture. The therapist pushes THIS way.
      rTmp.copy(rJoint).addScaledVector(WORLD_DOWN, rContact.distanceTo(rJoint));
      rForce.copy(rTmp).sub(rContact);
      if (rForce.lengthSq() < 0.04 * 0.04) rForce.copy(WORLD_DOWN);
      rForce.normalize();
      // The hand sits on the LEADING surface (the side the limb is moving toward =
      // -force) and its palm pushes BACK against the motion (into the limb, along
      // +force). Radial component only (perpendicular to the limb) so it rests on
      // the surface. If degenerate (pure rotation), fall back to the camera side.
      rSurf.copy(rForce).negate();
      rSurf.addScaledVector(rLever, -rSurf.dot(rLever));
      if (rSurf.lengthSq() < 1e-4) {
        cameraRef.current.getWorldPosition(rTmp);
        rSurf.copy(rTmp).sub(rContact).addScaledVector(rLever, -rSurf.dot(rLever));
      }
      rSurf.normalize();

      // A real hand ~0.66 of the upper-arm length.
      const handScale = THREE.MathUtils.clamp(fullLen * 0.66, 0.08, 0.2);
      placeHandGrip(contactHand, rContact, rSurf, rLever, handScale);
      grp.visible = true;
    };

    // Place the therapist hand GRIPPING the limb: palm on the surface (palm normal
    // = -surfaceOut, i.e. into the limb), fingers along the limb, sitting on the
    // camera-facing side so it's always visible. GLB local frame: palm-normal=+Y,
    // fingers=+Z, width=+X.
    const hX = new THREE.Vector3();
    const hY = new THREE.Vector3();
    const hZ = new THREE.Vector3();
    const hBasis = new THREE.Matrix4();
    const PATIENT_FRONT = new THREE.Vector3(0, 0, 1); // the patient faces +Z
    const placeHandGrip = (
      hand: THREE.Object3D,
      at: THREE.Vector3,
      surfaceOut: THREE.Vector3,
      limbAxis: THREE.Vector3,
      scale: number,
    ): void => {
      hY.copy(surfaceOut).negate(); // palm normal points INTO the limb
      // Fingers point POSTERIOR so the WRIST faces the patient's FRONT -- it reads
      // as the therapist reaching from IN FRONT of the patient, not from the
      // shoulder. Perpendicular to the palm normal; fall back to the limb axis if
      // the surface faces front/back (degenerate).
      hZ.copy(PATIENT_FRONT).negate();
      hZ.addScaledVector(hY, -hZ.dot(hY));
      if (hZ.lengthSq() < 1e-4) {
        hZ.copy(limbAxis).addScaledVector(hY, -limbAxis.dot(hY));
      }
      hZ.normalize();
      hX.crossVectors(hY, hZ).normalize();
      hBasis.makeBasis(hX, hY, hZ);
      hand.quaternion.setFromRotationMatrix(hBasis);
      hand.scale.setScalar(scale);
      // Rest the palm on the surface (lift the center out by ~half the hand
      // thickness so the glove sits ON the skin, not sunk into it).
      hand.position.copy(at).addScaledVector(surfaceOut, scale * 0.16);
    };

    // --- Highlight: glow the active muscles' real meshes + emphasize the
    // pathology's IMPLICATED structures, restore the rest.
    const applyHighlight = (cmd: RigCommand): void => {
      const glow = glowRef.current;
      const resolution = resolutionRef.current;
      const meshByName = meshByNameRef.current;
      const wantSide = parsedSide(cmd.side);

      // Resolve a muscle id to its meshes on the active side (+ the non-lateralized
      // 'center' bellies -- many muscle heads carry no .l/.r suffix; excluding them
      // left the glow on tiny slivers). Mirrors partsForSide() in muscleResolver.
      const forMuscleMeshes = (muscleId: string, cb: (mesh: THREE.Mesh) => void): void => {
        const names = resolution?.meshNamesByMuscleId.get(muscleId);
        if (!names) return;
        for (const name of names) {
          const pside = parseMeshName(name).side;
          if (pside !== wantSide && pside !== 'center') continue;
          const mesh = meshByName.get(name);
          if (!mesh || !mesh.visible) continue;
          cb(mesh);
        }
      };

      // Target map: normal activation glow first (level drives intensity), then
      // overlay the implicated flag so those meshes get the injured emphasis.
      const targets = new Map<
        THREE.Mesh,
        { role: RomMuscleRole; level: number; implicated: boolean }
      >();
      const list = resolution ? cmd.highlight ?? [] : [];
      for (const h of list) {
        const level = h.level ?? 1;
        forMuscleMeshes(h.muscleId, (mesh) => {
          if (!targets.has(mesh)) targets.set(mesh, { role: h.role, level, implicated: false });
        });
      }
      const implicatedIds = resolution ? cmd.implicated ?? [] : [];
      for (const id of implicatedIds) {
        forMuscleMeshes(id, (mesh) => {
          const t = targets.get(mesh);
          if (t) t.implicated = true;
          else targets.set(mesh, { role: 'prime-mover', level: 1, implicated: true });
        });
      }

      // Remove glow from meshes no longer targeted.
      for (const [mesh, entry] of glow) {
        if (!targets.has(mesh)) {
          mesh.material = entry.original;
          entry.clone.dispose();
          glow.delete(mesh);
        }
      }
      // Add / update glow on targeted meshes, refreshed every command so it tracks
      // the arc. Implicated meshes get the warm injured emphasis (pulsed by the
      // useFrame); the rest get the role glow.
      for (const [mesh, { role, level, implicated }] of targets) {
        let entry = glow.get(mesh);
        if (!entry) {
          // Clone the shared material so only THIS mesh glows.
          const src = mesh.material as THREE.MeshStandardMaterial;
          const clone = (src.clone
            ? src.clone()
            : new THREE.MeshStandardMaterial()) as THREE.MeshStandardMaterial;
          mesh.material = clone;
          entry = { original: src, clone, implicated };
          glow.set(mesh, entry);
        }
        entry.implicated = implicated;
        const baseColor = (entry.original as THREE.MeshStandardMaterial).color;
        if (implicated) paintImplicated(entry.clone, baseColor);
        else paintGlow(entry.clone, baseColor, role, level);
      }
    };

    // --- Camera framing per plane on movement change.
    // Azimuth/polar so the gesture's plane faces the viewer: side-on (lateral) for
    // sagittal flexion/extension, an oblique for transverse rotation, front for
    // frontal abduction. Left side mirrors the azimuth so the driven limb stays
    // toward the camera.
    const planeView = (cmd: RigCommand): { azimuth: number; polar: number; plane: string } => {
      const plane = movementById(cmd.movementId)?.plane ?? '';
      let azimuth = 0;
      let polar = 1.35; // ~77 deg from top
      if (plane === 'Sagital') azimuth = Math.PI / 2; // side-on for flexion
      else if (plane === 'Transversal') { azimuth = Math.PI / 5; polar = 1.0; }
      else azimuth = 0; // Frontal (abduction): face front
      if (cmd.side === 'L') azimuth = -azimuth;
      return { azimuth, polar, plane };
    };

    const frameForPlane = (cmd: RigCommand): void => {
      if (!controls || !cmd.movementId) return;
      const { azimuth, polar, plane } = planeView(cmd);
      if (firstRef.current) {
        firstRef.current = false;
        lastFramedRef.current = cmd.movementId;
        // Orient the INITIAL view to the gesture's plane so the lab opens already
        // reading the movement -- entering the KNEE (sagittal flexion) lands on a
        // LATERAL/side-on view, where the knee fold reads in profile instead of the
        // muscles piling up in an oblique 3/4. Done instantly (no transition) so it
        // is in place before AutoFit's fitToBox, which only dollies to frame and
        // preserves this orientation. Frontal (shoulder) keeps AutoFit's 3/4 look.
        if (plane === 'Sagital' || plane === 'Transversal') {
          void controls.rotateTo(azimuth, polar, false);
        }
        return;
      }
      if (cmd.movementId === lastFramedRef.current) return;
      lastFramedRef.current = cmd.movementId;
      void controls.rotateTo(azimuth, polar, true);
    };

    const onCommand = (cmd: RigCommand): void => {
      applyHighlight(cmd);
      placeMarker(cmd);
      placeResistance(cmd);
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
      // Remove + dispose the marker and the resistance group. The therapist-hand
      // meshes SHARE the cached GLB geometry (handGeomRef) -- never dispose that,
      // or the drei useGLTF cache breaks; only dispose our own geometry/materials.
      const sharedHand = handGeomRef.current;
      const disposeGroup = (grp: THREE.Group | null): void => {
        if (!grp) return;
        scene.remove(grp);
        grp.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry && m.geometry !== sharedHand) m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        });
      };
      disposeGroup(markerRef.current);
      markerRef.current = null;
      disposeGroup(resistanceRef.current);
      resistanceRef.current = null;
    };
    // resolution/meshByName are read from refs (populated post-load), so they are
    // intentionally not deps; the retry effect rebroadcasts once they are ready.
  }, [scene, controls]);

  // Pulse the implicated ("injured") meshes so the eye is drawn to WHERE the
  // pathology localizes. No-op (early return) when nothing is implicated, so the
  // normal glow stays perfectly steady.
  useFrame((_, dt) => {
    const glow = glowRef.current;
    let any = false;
    for (const [, e] of glow) {
      if (e.implicated) {
        any = true;
        break;
      }
    }
    if (!any) return;
    pulseRef.current += dt;
    const s = 0.7 + 0.4 * Math.sin(pulseRef.current * 3.4); // ~0.3 .. 1.1
    for (const [, e] of glow) {
      if (e.implicated) e.clone.emissiveIntensity = IMPLICATED_EMISSIVE * s;
    }
  });

  return <group />;
}
