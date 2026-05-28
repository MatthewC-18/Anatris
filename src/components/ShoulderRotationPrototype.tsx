// ShoulderRotationPrototype.tsx
//
// ISOLATED prototype for Option 2 (rigid bone rotation), HYBRID approach.
// PHASE 1 of the post-review iteration: make the gesture READ WELL for a
// physio. (Phase 2, not in this file yet, adds scapulohumeral rhythm: the
// scapula rotating ~1/3 of the humeral angle.)
//
// WHY THIS VERSION EXISTS (review of the first screenshots)
//   The rigid bone rotation worked, but the abduction did not "read":
//   - The default view is the model's BACK, where a laterally-rising arm
//     foreshortens and disappears. Abduction reads from an anterior/oblique view.
//   - The X/Y/Z axis buttons were useful to FIND the abduction axis during
//     prototyping; we now know it is Z (frontal plane). Exposing X/Y just let
//     the user pick a wrong axis that looked broken (arm swinging fore/aft).
//   - Ghost opacity 0.1 left an ugly "hole" where the deltoid used to be; a
//     physio reads the gesture better with the muscle faintly visible (~0.3)
//     than with bare bone.
//
// WHAT THIS VERSION DOES
//   1) Rigid bone block (Humerusr + Radiusr + Ulnar + hand) abducts about the
//      glenohumeral pivot. ABDUCTION AXIS IS FIXED to Z; no axis picker.
//   2) Shoulder-crossing muscles fade to a SOFT 0.3 opacity while the arm is
//      off the rest pose, so the gesture stays clean but the muscle volume is
//      still legible (no bare-bone hole).
//   3) Didactic MARKERS: glenohumeral rotation axis + middle-deltoid line of
//      action (origin -> humeral insertion that tracks the arm).
//   4) Optional ANATOMICAL FREEZE: re-solidify ONLY humeral-insertion muscles
//      in the current pose (schematic study aid).
//   5) CAMERA FRAMING: on first movement, animate the drei CameraControls to an
//      anterior-oblique view of the RIGHT shoulder so the abduction reads as
//      the arm rising to the side. Original camera pose is saved and restored
//      on unmount. We reach the controls via useThree().controls (drei exposes
//      them because Viewer3D uses <CameraControls makeDefault/>), so we do NOT
//      modify Viewer3D.tsx or wire any ref across components.
//
// Constraints honored (unchanged):
//   - Does NOT touch the store, Explore/Learn modes, or any existing behavior.
//   - Reads the live scene via useThree(). Fully reversible on unmount:
//     restores bone transforms, every muscle material it touched, the camera
//     pose, and removes the pivot + markers.
//   - ASCII-only source. UI strings Spanish LATAM. No `any`. English comments.

import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { CameraControls } from '@react-three/drei';
import * as THREE from 'three';

// --- Glenohumeral pivot for the RIGHT side, from the humeral-head world bbox.
const RIGHT_GH_PIVOT = new THREE.Vector3(-0.1709, 1.427, -0.0156);

// Abduction axis is FIXED. Frontal-plane abduction is about the model's Z axis
// (confirmed from the prototype screenshots). No longer user-selectable.
const ABDUCTION_AXIS = new THREE.Vector3(0, 0, 1);

// Right-limb bone container nodes to reparent under the pivot.
const RIGHT_LIMB_NODE_NAMES: readonly string[] = ['Humerusr', 'Radiusr', 'Ulnar'] as const;

// Muscle meshBases that CROSS THE SHOULDER (the ones that look broken under
// rigid rotation). Names verbatim from shoulder.ts meshBases (VERIFIED set).
const SHOULDER_CROSSING_BASES: readonly string[] = [
  'Supraspinatus_muscle',
  'Infraspinatus_muscle',
  'Teres_minor_muscle',
  'Subscapularis_muscle',
  'Acromial_part_of_deltoid_muscle',
  'Clavicular_part_of_deltoid_muscle',
  'Scapular_spinal_part_of_deltoid_muscle',
  'Deltoid_muscle',
  'Clavicular_head_of_pectoralis_major_muscle',
  'Sternocostal_head_of_pectoralis_major_muscle',
  '(Abdominal_part_of_pectoralis_major_muscle)',
  'Pectoralis_major_muscle',
  'Teres_major_muscle',
  'Latissimus_dorsi_muscle',
  'Long_head_of_biceps_brachii',
  'Short_head_of_biceps_brachii',
  'Biceps_brachii_muscle',
  'Long_head_of_triceps_brachii',
  'Triceps_brachii_muscle',
  'Coracobrachialis_muscle',
] as const;

// Subset that INSERTS ON THE HUMERUS and travels with the arm. Only these are
// re-solidified by the anatomical freeze.
const HUMERAL_INSERTION_BASES: readonly string[] = [
  'Supraspinatus_muscle',
  'Infraspinatus_muscle',
  'Teres_minor_muscle',
  'Subscapularis_muscle',
  'Acromial_part_of_deltoid_muscle',
  'Clavicular_part_of_deltoid_muscle',
  'Scapular_spinal_part_of_deltoid_muscle',
  'Deltoid_muscle',
  'Pectoralis_major_muscle',
  'Clavicular_head_of_pectoralis_major_muscle',
  'Sternocostal_head_of_pectoralis_major_muscle',
  '(Abdominal_part_of_pectoralis_major_muscle)',
  'Teres_major_muscle',
  'Latissimus_dorsi_muscle',
  'Coracobrachialis_muscle',
] as const;

// SOFT fade (was 0.1 = bare-bone hole). 0.3 keeps the muscle volume legible.
const SOFT_OPACITY = 0.3;
const PROTO_MARKER_NAME = 'PROTO_BiomechMarkers';
const PROTO_PIVOT_NAME = 'PROTO_RightShoulderPivot';

// Camera framing: an anterior-oblique view of the right shoulder, so abduction
// reads as the arm rising to the side. Direction is FROM target TO camera, in
// world space: +X (model right is -X, so the camera sits on the +X / front-
// right), slightly above (+Y) and in front (+Z, since the default rest view in
// Viewer3D looks from +Z). Tweak live if the read isn't ideal.
const FRAMING_DIR = new THREE.Vector3(0.7, 0.25, 0.85).normalize();
const FRAMING_DISTANCE = 1.1; // world units from the shoulder target

type ControlsLike = CameraControls;

// ---------------------------------------------------------------------------
// Module-level channel so the DOM panel drives the in-canvas rig.
// ---------------------------------------------------------------------------
interface RigState {
  angleDeg: number; // abduction angle in degrees
  includeHand: boolean;
  freezeMuscles: boolean; // re-solidify humeral-insertion muscles in current pose
  showMarkers: boolean; // biomechanics axis + deltoid line of action
  frameCamera: boolean; // auto-frame the shoulder when moving
}

type Listener = (s: RigState) => void;

const channel = (() => {
  let state: RigState = {
    angleDeg: 0,
    includeHand: true,
    freezeMuscles: false,
    showMarkers: true,
    frameCamera: true,
  };
  const listeners = new Set<Listener>();
  return {
    get: (): RigState => state,
    set: (patch: Partial<RigState>): void => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l(state));
    },
    subscribe: (l: Listener): (() => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
})();

// ---------------------------------------------------------------------------
// Scene lookup helpers.
// ---------------------------------------------------------------------------
function findByName(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (!found && o.name === name) found = o;
  });
  return found;
}

function findRightHandContainers(scene: THREE.Object3D): THREE.Object3D[] {
  const limbRoot = findByName(scene, 'Bones_of_free_part_of_upper_limbg');
  if (!limbRoot) return [];
  const out: THREE.Object3D[] = [];
  const handTokens = [
    'metacarpal_bone',
    'phalanx_of_',
    'capitate_bone',
    'hamate_bone',
    'lunate_bone',
    'scaphoid_bone',
    'pisiform_bone',
    'trapezium_bone',
    'trapezoid_bone',
    'triquetrum_bone',
  ];
  limbRoot.children.forEach((child) => {
    const lower = child.name.toLowerCase();
    const isHand = handTokens.some((t) => lower.includes(t));
    const isRight = lower.endsWith('r'); // right side suffix
    if (isHand && isRight) out.push(child);
  });
  return out;
}

function meshMatchesAnyBase(meshName: string, bases: readonly string[]): boolean {
  for (const base of bases) {
    if (meshName.startsWith(base)) return true;
  }
  return false;
}

interface MuscleMeshRecord {
  mesh: THREE.Mesh;
  saved: Array<{
    material: THREE.MeshStandardMaterial;
    transparent: boolean;
    opacity: number;
    depthWrite: boolean;
  }>;
}

function collectRightShoulderMuscleMeshes(scene: THREE.Object3D): MuscleMeshRecord[] {
  const SIDE_X_THRESHOLD = 0.02;
  const records: MuscleMeshRecord[] = [];
  const v = new THREE.Vector3();
  scene.updateWorldMatrix(true, true);
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!meshMatchesAnyBase(mesh.name, SHOULDER_CROSSING_BASES)) return;
    mesh.getWorldPosition(v);
    if (v.x >= -SIDE_X_THRESHOLD) return; // RIGHT side only (x < 0)

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const saved: MuscleMeshRecord['saved'] = [];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (!std) continue;
      saved.push({
        material: std,
        transparent: std.transparent,
        opacity: std.opacity,
        depthWrite: std.depthWrite,
      });
    }
    records.push({ mesh, saved });
  });
  return records;
}

// fade=true -> soft translucent; fade=false -> restore original state.
function setMeshFaded(rec: MuscleMeshRecord, fade: boolean): void {
  for (const s of rec.saved) {
    const std = s.material;
    if (fade) {
      std.transparent = true;
      std.opacity = SOFT_OPACITY;
      std.depthWrite = false;
    } else {
      std.transparent = s.transparent;
      std.opacity = s.opacity;
      std.depthWrite = s.depthWrite;
    }
    std.needsUpdate = true;
  }
}

function applyRotation(pivot: THREE.Group, angleDeg: number): void {
  const rad = THREE.MathUtils.degToRad(angleDeg);
  pivot.quaternion.setFromAxisAngle(ABDUCTION_AXIS, rad);
  pivot.updateMatrixWorld(true);
}

// ---------------------------------------------------------------------------
// Biomechanics markers at the GH pivot: rotation axis + middle-deltoid line of
// action + a dot at the rotation center.
// ---------------------------------------------------------------------------
function buildMarkers(angleDeg: number): THREE.Group {
  const group = new THREE.Group();
  group.name = PROTO_MARKER_NAME;
  group.position.copy(RIGHT_GH_PIVOT);

  // (a) Rotation axis line through the pivot (along the abduction axis).
  const axisLen = 0.18;
  const axisPts = [
    ABDUCTION_AXIS.clone().multiplyScalar(-axisLen),
    ABDUCTION_AXIS.clone().multiplyScalar(axisLen),
  ];
  const axisGeom = new THREE.BufferGeometry().setFromPoints(axisPts);
  const axisMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 }); // sky-400
  const axisLine = new THREE.Line(axisGeom, axisMat);
  axisLine.renderOrder = 999;
  group.add(axisLine);

  // (b) Middle-deltoid line of action: fixed acromial origin near the pivot to
  // the deltoid tuberosity partway down the humeral shaft, rotated by the
  // current angle so it tracks the arm.
  const originLocal = new THREE.Vector3(-0.02, 0.04, 0.0); // near acromion, fixed
  const insertionRest = new THREE.Vector3(0.0, -0.16, 0.0); // down the resting arm
  const rad = THREE.MathUtils.degToRad(angleDeg);
  const q = new THREE.Quaternion().setFromAxisAngle(ABDUCTION_AXIS, rad);
  const insertionLocal = insertionRest.clone().applyQuaternion(q);

  const deltGeom = new THREE.BufferGeometry().setFromPoints([originLocal, insertionLocal]);
  const deltMat = new THREE.LineBasicMaterial({ color: 0xffa51e }); // amber
  const deltLine = new THREE.Line(deltGeom, deltMat);
  deltLine.renderOrder = 999;
  group.add(deltLine);

  // Rotation-center dot.
  const dotGeom = new THREE.SphereGeometry(0.008, 12, 12);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const dot = new THREE.Mesh(dotGeom, dotMat);
  dot.renderOrder = 999;
  group.add(dot);

  return group;
}

// ---------------------------------------------------------------------------
// In-canvas rig. Mount as a child of <Canvas> (inside SceneContents).
// ---------------------------------------------------------------------------
export function ShoulderRotationRig(): null {
  const { scene, controls } = useThree();
  const pivotRef = useRef<THREE.Group | null>(null);
  const markerRef = useRef<THREE.Group | null>(null);
  const muscleRecordsRef = useRef<MuscleMeshRecord[]>([]);
  // Saved camera pose (position + target) so we can restore on unmount.
  const camSavedRef = useRef<{
    pos: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);
  // Whether we've already framed the shoulder this session (frame once, on the
  // first time the arm leaves the rest pose).
  const framedRef = useRef(false);
  const movedRef = useRef<
    Array<{
      node: THREE.Object3D;
      parent: THREE.Object3D;
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
      scale: THREE.Vector3;
    }>
  >([]);

  useEffect(() => {
    const st = channel.get();

    // --- Pivot at the glenohumeral center.
    const pivot = new THREE.Group();
    pivot.name = PROTO_PIVOT_NAME;
    pivot.position.copy(RIGHT_GH_PIVOT);
    scene.add(pivot);
    pivotRef.current = pivot;

    // --- Gather bone nodes to move.
    const targets: THREE.Object3D[] = [];
    RIGHT_LIMB_NODE_NAMES.forEach((n) => {
      const node = findByName(scene, n);
      if (node) targets.push(node);
      // eslint-disable-next-line no-console
      else console.warn(`[ShoulderRotationRig] node not found: ${n}`);
    });
    if (st.includeHand) {
      findRightHandContainers(scene).forEach((n) => targets.push(n));
    }

    const moved = movedRef.current;
    moved.length = 0;
    targets.forEach((node) => {
      const parent = node.parent;
      if (!parent) return;
      moved.push({
        node,
        parent,
        position: node.position.clone(),
        quaternion: node.quaternion.clone(),
        scale: node.scale.clone(),
      });
      pivot.attach(node);
    });

    // --- Collect right shoulder muscle meshes (for fade / freeze).
    muscleRecordsRef.current = collectRightShoulderMuscleMeshes(scene);

    // eslint-disable-next-line no-console
    console.log(
      `[ShoulderRotationRig] attached ${moved.length} bone node(s); tracking ` +
        `${muscleRecordsRef.current.length} shoulder muscle mesh(es)`,
    );

    // --- Camera helper. drei's CameraControls is exposed on useThree().controls
    // because Viewer3D mounts <CameraControls makeDefault/>. It may be null for
    // a frame or two while mounting, so we guard.
    const getControls = (): ControlsLike | null => {
      const c = controls as unknown;
      if (
        c &&
        typeof (c as ControlsLike).setLookAt === 'function' &&
        typeof (c as ControlsLike).getTarget === 'function' &&
        typeof (c as ControlsLike).getPosition === 'function'
      ) {
        return c as ControlsLike;
      }
      return null;
    };

    const frameShoulder = (): void => {
      const c = getControls();
      if (!c) return;
      // Save the current pose ONCE so we can restore it on unmount.
      if (!camSavedRef.current) {
        const pos = new THREE.Vector3();
        const target = new THREE.Vector3();
        c.getPosition(pos);
        c.getTarget(target);
        camSavedRef.current = { pos: pos.clone(), target: target.clone() };
      }
      const target = RIGHT_GH_PIVOT.clone();
      const camPos = target
        .clone()
        .add(FRAMING_DIR.clone().multiplyScalar(FRAMING_DISTANCE));
      void c.setLookAt(
        camPos.x,
        camPos.y,
        camPos.z,
        target.x,
        target.y,
        target.z,
        true, // animate
      );
    };

    const restoreCamera = (): void => {
      const c = getControls();
      const saved = camSavedRef.current;
      if (!c || !saved) return;
      void c.setLookAt(
        saved.pos.x,
        saved.pos.y,
        saved.pos.z,
        saved.target.x,
        saved.target.y,
        saved.target.z,
        true,
      );
    };

    // --- Apply the current visual state.
    const applyState = (s: RigState): void => {
      if (pivotRef.current) applyRotation(pivotRef.current, s.angleDeg);

      const moving = s.angleDeg > 0;

      // Camera: frame the shoulder the first time the arm moves (if enabled);
      // when the arm returns to rest, restore the saved pose.
      if (moving && s.frameCamera && !framedRef.current) {
        framedRef.current = true;
        frameShoulder();
      } else if (!moving && framedRef.current) {
        framedRef.current = false;
        restoreCamera();
        camSavedRef.current = null; // allow re-saving next time we move
      }

      // Muscle visibility. At rest: everything solid (model looks normal).
      // Moving + no freeze: soft-fade all shoulder muscles. Moving + freeze:
      // solidify humeral-insertion subset, fade the rest.
      for (const rec of muscleRecordsRef.current) {
        let fade: boolean;
        if (!moving) {
          fade = false;
        } else if (s.freezeMuscles) {
          const isHumeral = meshMatchesAnyBase(rec.mesh.name, HUMERAL_INSERTION_BASES);
          fade = !isHumeral;
        } else {
          fade = true;
        }
        setMeshFaded(rec, fade);
      }

      // Markers.
      if (markerRef.current && markerRef.current.parent) {
        markerRef.current.parent.remove(markerRef.current);
        markerRef.current = null;
      }
      if (s.showMarkers) {
        const markers = buildMarkers(s.angleDeg);
        scene.add(markers);
        markerRef.current = markers;
      }
    };

    applyState(st);
    const unsub = channel.subscribe(applyState);

    return () => {
      unsub();

      // Restore camera pose first (uses the saved pose if we framed).
      restoreCamera();
      camSavedRef.current = null;
      framedRef.current = false;

      // Restore muscle materials.
      for (const rec of muscleRecordsRef.current) setMeshFaded(rec, false);
      muscleRecordsRef.current = [];

      // Remove markers.
      if (markerRef.current && markerRef.current.parent) {
        markerRef.current.parent.remove(markerRef.current);
      }
      markerRef.current = null;

      // Restore bone nodes.
      const p = pivotRef.current;
      moved.forEach(({ node, parent, position, quaternion, scale }) => {
        parent.add(node);
        node.position.copy(position);
        node.quaternion.copy(quaternion);
        node.scale.copy(scale);
        node.updateMatrix();
        node.updateMatrixWorld(true);
      });
      moved.length = 0;
      if (p && p.parent) p.parent.remove(p);
      pivotRef.current = null;
      // eslint-disable-next-line no-console
      console.log('[ShoulderRotationRig] restored model, muscles, camera, removed pivot + markers');
    };
    // Reparenting + collection happen once at mount; live updates via channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, controls]);

  return null;
}

// ---------------------------------------------------------------------------
// DOM control panel. Mount OUTSIDE the canvas (e.g. in App.tsx).
// ---------------------------------------------------------------------------
export function ShoulderRotationPanel(): JSX.Element {
  const [angle, setAngle] = useState<number>(channel.get().angleDeg);
  const [includeHand, setIncludeHand] = useState<boolean>(channel.get().includeHand);
  const [freezeMuscles, setFreezeMuscles] = useState<boolean>(channel.get().freezeMuscles);
  const [showMarkers, setShowMarkers] = useState<boolean>(channel.get().showMarkers);
  const [frameCamera, setFrameCamera] = useState<boolean>(channel.get().frameCamera);

  useEffect(() => {
    channel.set({ angleDeg: angle, includeHand, freezeMuscles, showMarkers, frameCamera });
  }, [angle, includeHand, freezeMuscles, showMarkers, frameCamera]);

  const warn = String.fromCharCode(0x26a0); // ASCII-safe warning glyph

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 50,
        width: 300,
        padding: 16,
        borderRadius: 12,
        background: 'rgba(17, 17, 20, 0.92)',
        color: '#f4f4f5',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: 13,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Prototipo: abduccion de hombro</div>
      <div style={{ opacity: 0.7, marginBottom: 12, lineHeight: 1.4 }}>
        Brazo derecho en el plano frontal. Bloque rigido de hueso; los musculos
        del hombro se atenuan durante el gesto (no tienen deformacion real).
      </div>

      <label style={{ display: 'block', marginBottom: 6 }}>
        Abduccion: <strong>{angle}</strong>&deg;
      </label>
      <input
        type="range"
        min={0}
        max={120}
        step={1}
        value={angle}
        onChange={(e) => setAngle(Number(e.target.value))}
        style={{ width: '100%', marginBottom: 14 }}
      />

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={frameCamera}
          onChange={(e) => setFrameCamera(e.target.checked)}
        />
        Encuadrar el hombro automaticamente
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={showMarkers}
          onChange={(e) => setShowMarkers(e.target.checked)}
        />
        Marcadores biomecanicos (eje + linea del deltoides)
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={freezeMuscles}
          onChange={(e) => setFreezeMuscles(e.target.checked)}
        />
        Congelar musculos del humero en esta posicion (esquematico)
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={includeHand}
          onChange={(e) => setIncludeHand(e.target.checked)}
        />
        Incluir mano y dedos
      </label>

      <div style={{ opacity: 0.6, fontSize: 11, lineHeight: 1.4 }}>
        {warn} &quot;Congelar musculos&quot; vuelve solidos solo los que se
        insertan en el humero (deltoides y manguito); los de origen escapular
        siguen atenuados porque su anclaje quedaria fuera de sitio.
        <br />
        {warn} Cambiar &quot;Incluir mano&quot; requiere apagar y encender el
        prototipo (los nodos se reagrupan al montar).
      </div>
    </div>
  );
}
