// src/components/movement/RigModel.tsx
//
// The biomechanical rig runtime. Loads the SKINNED rig GLB (public/cuerpo-rig.glb
// -- 5 armatures, 65 bones, 972 skinned meshes), caches every bone by its
// armature subtree (so the L/R name collision never bites: we descend from the
// UNIQUE armature root), and drives a clinical movement on demand by rotating
// the mapped bone in its LOCAL space and replicating the Blender drivers that
// glTF dropped (scapulohumeral rhythm, patellar glide).
//
// The skinned meshes deform automatically once the bone matrices change -- this
// is real skeletal deformation, not the old rigid-block reparenting.
//
// Driven from the DOM via `rigChannel` (module-level pub/sub, same pattern as
// the legacy shoulderRigChannel) so the control panel outside the <Canvas> can
// command the rig without prop-drilling a ref across the canvas boundary.
//
// Fully reversible: bones are restored to their captured rest pose on unmount.
// ASCII-only source; no `any`.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  getBoneControl,
  resolveArmatureName,
  distributeSpineAngle,
  type Side,
  type RigAxis,
} from '../../lib/boneMap';
import {
  colorForMaterial,
  colorForMaterialMesh,
  materialIsMuscleOrBone,
  tissueClassForMaterial,
  type TissueClass,
} from '../../lib/materialColors';
import type { RomMuscleRole } from '../../types/rom';

// Cache-bust query so browsers/drei re-fetch after a rig re-export instead of
// serving a stale cached GLB. Bump on every cuerpo-rig.glb re-export.
const RIG_URL = '/cuerpo-rig.glb?v=4';

// The five unique armature roots. Bone names collide between sides, so we ALWAYS
// look a bone up inside its armature subtree, never globally.
const ARMATURE_NAMES: readonly string[] = [
  'Shoulder_Armature_R',
  'Shoulder_Armature_L',
  'Leg_Armature_R',
  'Leg_Armature_L',
  'Spine_Armature',
] as const;

const AXIS_VEC: Record<RigAxis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};
const DEG2RAD = Math.PI / 180;

// ---------------------------------------------------------------------------
// Duplicate-overlap removal.
//
// Z-Anatomy ships several distal bones TWICE: two near-coincident skinned
// meshes of the SAME bone with DIFFERENT tessellation, occupying the same
// volume. Two opaque surfaces in the same place Z-fight into a flickering,
// speckled mess -- worst on the dense little hand and foot bones, which is what
// made the hands "look broken". The runtime keeps ONE copy per (dominant bone +
// near-coincident center) cluster (the higher-resolution mesh) and hides the
// rest. ~140 redundant meshes across the model, ~60% of them in the hands/feet.
// ---------------------------------------------------------------------------

/** Two meshes count as the same bone when their centers are within this (m). */
const DUP_EPS = 0.004; // 4 mm -- tighter than any inter-bone gap, so distinct
// carpals/tarsals never collapse into each other.

const _tmpCenter = new THREE.Vector3();

/** World-space center of a (possibly skinned) mesh, at the rest pose. */
function meshWorldCenter(mesh: THREE.Mesh): THREE.Vector3 {
  const g = mesh.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere?.center ?? _tmpCenter.set(0, 0, 0);
  return c.clone().applyMatrix4(mesh.matrixWorld);
}

/** Dominant (highest-weight) bone name of a skinned mesh, or '' if not skinned. */
function dominantBoneName(mesh: THREE.Mesh): string {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return '';
  const idx = mesh.geometry.getAttribute('skinIndex');
  const wgt = mesh.geometry.getAttribute('skinWeight');
  if (!idx || !wgt) return '';
  const acc = new Map<number, number>();
  const n = Math.min(idx.count, 200);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k);
      if (w > 0) {
        const b = idx.getComponent(i, k);
        acc.set(b, (acc.get(b) ?? 0) + w);
      }
    }
  }
  let best = -1;
  let bw = 0;
  for (const [b, w] of acc) if (w > bw) { bw = w; best = b; }
  return best >= 0 && sk.skeleton.bones[best] ? sk.skeleton.bones[best].name : '';
}

interface DupCandidate {
  mesh: THREE.Mesh;
  center: THREE.Vector3;
  vcount: number;
  bone: string;
}

/**
 * Hide redundant overlapping copies in-place. Among meshes that share a dominant
 * bone and sit within DUP_EPS of each other, keep only the one with the most
 * vertices (smoothest) and hide the others.
 */
function hideOverlapDuplicates(candidates: DupCandidate[]): number {
  let hidden = 0;
  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i];
    if (!a.mesh.visible || !a.bone) continue;
    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j];
      if (!b.mesh.visible || b.bone !== a.bone) continue;
      if (a.center.distanceTo(b.center) > DUP_EPS) continue;
      // Same bone, coincident -> a duplicate. Hide the lower-resolution one.
      if (b.vcount <= a.vcount) {
        b.mesh.visible = false;
      } else {
        a.mesh.visible = false;
      }
      hidden++;
      if (!a.mesh.visible) break; // a was the one hidden; stop pairing it
    }
  }
  return hidden;
}

// ---------------------------------------------------------------------------
// Channel: the DOM control panel commands the in-canvas rig through this.
// ---------------------------------------------------------------------------
/** One muscle to emphasize in the scene, with its role (drives the glow color). */
export interface RigHighlight {
  muscleId: string;
  role: RomMuscleRole;
}

export interface RigCommand {
  /** movementId from *Rom.ts, or null for the rest pose. */
  movementId: string | null;
  /** Which limb to drive (ignored by spine movements). */
  side: Side;
  /** Clinical angle in degrees (signed: negative drives the opposite gesture). */
  angleDeg: number;
  /**
   * Muscles to emphasize in the scene for the CURRENT phase (RigOverlays glows
   * their real meshes on the active side, colored by role). Undefined/empty =
   * nothing glows.
   */
  highlight?: RigHighlight[];
  /** Whether the didactic rotation-axis marker is shown (RigOverlays). */
  showMarkers?: boolean;
}

type Listener = (s: RigCommand) => void;

export const rigChannel = (() => {
  let state: RigCommand = {
    movementId: null,
    side: 'R',
    angleDeg: 0,
    highlight: [],
    showMarkers: true,
  };
  const listeners = new Set<Listener>();
  return {
    get: (): RigCommand => state,
    set: (patch: Partial<RigCommand>): void => {
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
// Component.
// ---------------------------------------------------------------------------
export function RigModel({ onReady }: { onReady?: () => void } = {}): JSX.Element {
  const { scene } = useGLTF(RIG_URL) as unknown as { scene: THREE.Group };

  // Cache bones per armature (boneName -> object) and capture each bone's rest
  // quaternion ONCE, so every movement starts from the true neutral pose and we
  // can fully restore on unmount.
  const rig = useMemo(() => {
    const byArmature = new Map<string, Map<string, THREE.Object3D>>();
    const restQuat = new Map<THREE.Object3D, THREE.Quaternion>();
    for (const armName of ARMATURE_NAMES) {
      const root = scene.getObjectByName(armName);
      if (!root) {
        // eslint-disable-next-line no-console
        console.warn(`[RigModel] armature not found: ${armName}`);
        continue;
      }
      const bones = new Map<string, THREE.Object3D>();
      // Only bones live under an armature root. CRITICAL: three's GLTFLoader
      // makes node names unique by appending "_1", "_2", ... when they collide
      // between skins -- and our bone names are identical on both sides. So the
      // second-loaded side becomes "humerus_gh_1", etc. We key by the BASE name
      // (suffix stripped); base names are unique within one armature subtree, so
      // the lookup works whichever side got renamed.
      root.traverse((o) => {
        const base = o.name.replace(/_\d+$/, '');
        if (!bones.has(base)) bones.set(base, o);
        if (!restQuat.has(o)) restQuat.set(o, o.quaternion.clone());
      });
      byArmature.set(armName, bones);
    }
    return { byArmature, restQuat };
  }, [scene]);

  // PREMIUM LOOK (one-time). The raw rig GLB renders near-white with floating
  // Z-Anatomy text/label panels, and ships heavy MeshPhysicalMaterials
  // (clearcoat/specular) -- 1300+ of those is a shader-compile storm and a
  // fragment-rate sink. We REPLACE every material with one lightweight
  // MeshStandardMaterial (single shared shader program) tinted from the SAME
  // clinical atlas palette the master model uses (muscles red, bone ivory,
  // vessels, ...), share materials by color so the GPU flips state rarely, and
  // HIDE non-anatomical reference geometry (Text/Directions/Movement) plus the
  // superficial Skin layers (heavy overdraw, only occludes the muscles/bones the
  // lab is about). Result: reads like a clinical model AND renders fast.
  const preparedRef = useRef(false);
  useEffect(() => {
    if (preparedRef.current) return;
    preparedRef.current = true;
    // World matrices must be current before we read mesh centers for dedup.
    scene.updateMatrixWorld(true);
    // Meshes that survive the visibility filter -- fed to the duplicate-overlap
    // pass below.
    const dupCandidates: DupCandidate[] = [];
    // PREMIUM per-tissue shading. One lightweight MeshStandardMaterial per
    // (color, tissue): bone reads as polished ivory (lower roughness + a touch
    // more environment reflection -> pearly sheen), muscle stays matte and wet-
    // looking (higher roughness, low reflection), everything else neutral. The
    // <Environment> in RigViewer provides the image-based reflections these
    // envMapIntensity values pick up. Cached by hex+tissue so the GPU still
    // shares a handful of programs across 1100+ meshes.
    const TISSUE_PBR: Record<TissueClass, { roughness: number; metalness: number; env: number }> = {
      bone: { roughness: 0.42, metalness: 0.0, env: 0.7 },
      muscle: { roughness: 0.72, metalness: 0.0, env: 0.22 },
      other: { roughness: 0.6, metalness: 0.0, env: 0.35 },
    };
    const matByKey = new Map<string, THREE.MeshStandardMaterial>();
    const flatMat = (hex: number, tissue: TissueClass): THREE.MeshStandardMaterial => {
      const key = `${hex}|${tissue}`;
      let m = matByKey.get(key);
      if (!m) {
        const pbr = TISSUE_PBR[tissue];
        m = new THREE.MeshStandardMaterial({
          color: hex,
          roughness: pbr.roughness,
          metalness: pbr.metalness,
          envMapIntensity: pbr.env,
        });
        matByKey.set(key, m);
      }
      return m;
    };
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const matName = first?.name ?? '';
      const base = colorForMaterial(matName);
      // Z-Anatomy ORGANIZATIONAL CONTAINERS (the ".g" group nodes like
      // "Muscular_systemg001", "Bones_of_handg001", "Joints_of_lower_limbg001"
      // and "General_terms") are aggregate overlays skinned to a single
      // arbitrary bone. They duplicate the real per-structure meshes and, when
      // that bone rotates, swing across the scene -- this is the "mis-placed
      // hand" and "stray leg bone" the user saw. Hide them; the real meshes
      // (Fibula_1, Capitate_bone, Biceps...) stay. The master model's anatomy
      // index already drops these; we replicate that here by name.
      const isGroupContainer =
        /g0\d\d$/.test(mesh.name) ||
        /_system/i.test(mesh.name) ||
        /^General[_ ]terms$/i.test(mesh.name);
      // MOVEMENT LAB = MUSCLE + BONE only. Hide aggregate containers and every
      // non-muscle/bone structure (tendons, ligaments, capsules, cartilage,
      // nerves, arteries, veins, fascia, organs, skin, reference geometry). The
      // dense neurovascular/connective swarm at the hands and feet -- and the
      // ivory tendons that read as "loose bones" -- is what looked broken.
      if (base === null || isGroupContainer || !materialIsMuscleOrBone(matName)) {
        mesh.visible = false;
        return;
      }
      // NOTE on the hands: re-importing cuerpo-rig.glb into Blender shows the
      // hand bones "exploded" into radial spikes, which looks like a broken
      // asset -- but that is a BLENDER glTF-importer artifact. In three.js the
      // GPU skinning (verified vertex-by-vertex with SkinnedMesh.applyBoneTransform)
      // places every visible hand bone/muscle compactly (<6 cm); only vessels/
      // fascia/nerves measure ~15 cm and those are already hidden as non-muscle/
      // bone. So the hands render correctly here. What actually looked broken was
      // the doubled hand bones Z-fighting -- handled by hideOverlapDuplicates
      // below. Hands are therefore kept (no movement drives hand_flex, but the
      // wrist looks far cleaner whole than as a stump).
      const dom = dominantBoneName(mesh);
      const hex = colorForMaterialMesh(matName, mesh.name) ?? base;
      const tissue = tissueClassForMaterial(matName);
      // Dispose the original physical material(s) before swapping.
      const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = flatMat(hex, tissue);
      old.forEach((m) => m && m.dispose());
      // This mesh is kept -- record it for the duplicate-overlap pass.
      dupCandidates.push({
        mesh,
        center: meshWorldCenter(mesh),
        vcount: mesh.geometry.getAttribute('position')?.count ?? 0,
        bone: dom,
      });
    });
    // Remove the doubled Z-Anatomy bones that Z-fight into a speckled mess
    // (worst at the hands/feet) -- keep one copy per coincident bone cluster.
    hideOverlapDuplicates(dupCandidates);
    // Signal the viewer that the rig is loaded AND styled, so it can dismiss the
    // loader. Gating on drei's load progress alone hangs on a CACHED reload (no
    // progress events fire), leaving the overlay stuck at 0% over a live rig.
    onReady?.();
  }, [scene, onReady]);

  // Bones currently rotated away from rest, so the next command can reset just
  // those before applying (one movement at a time, no accumulation).
  const touchedRef = useRef<Set<THREE.Object3D>>(new Set());

  const apply = useCallback(
    (cmd: RigCommand) => {
      const { byArmature, restQuat } = rig;

      // Reset everything we touched last time back to rest.
      for (const b of touchedRef.current) {
        const rq = restQuat.get(b);
        if (rq) b.quaternion.copy(rq);
      }
      touchedRef.current.clear();

      const rotate = (bone: THREE.Object3D, axis: RigAxis, rad: number): void => {
        const rq = restQuat.get(bone);
        if (rq) bone.quaternion.copy(rq);
        else bone.quaternion.identity();
        // Rotate about the bone's LOCAL axis, on top of the rest orientation.
        bone.rotateOnAxis(AXIS_VEC[axis], rad);
        touchedRef.current.add(bone);
      };

      const done = () => scene.updateMatrixWorld(true);

      if (!cmd.movementId || cmd.angleDeg === 0) {
        done();
        return;
      }
      const ctrl = getBoneControl(cmd.movementId);
      if (!ctrl || ctrl.kind === 'unsupported') {
        done();
        return;
      }

      if (ctrl.kind === 'joint') {
        const armName = resolveArmatureName(ctrl.armatureBase, cmd.side);
        const bones = byArmature.get(armName);
        if (!bones) {
          done();
          return;
        }
        const bone = bones.get(ctrl.bone);
        if (!bone) {
          // eslint-disable-next-line no-console
          console.warn(`[RigModel] bone not found: ${armName} / ${ctrl.bone}`);
          done();
          return;
        }
        const rad = ctrl.sign[cmd.side] * cmd.angleDeg * DEG2RAD;
        rotate(bone, ctrl.axis, rad);

        // Replicated drivers (scapula, patella) -- same armature subtree.
        if (ctrl.couplings) {
          for (const cp of ctrl.couplings) {
            const cb = bones.get(cp.bone);
            if (cb) rotate(cb, cp.axis, cp.follow(rad));
          }
        }
      } else if (ctrl.kind === 'chain') {
        // Cross-armature decomposition (scapulohumeral rhythm + humeral external
        // rotation + thoracic lean). A pure function returns named radian
        // outputs; targets place each on the rig. Several targets may hit the
        // SAME bone on different local axes, so we reset a bone to rest only the
        // FIRST time it is seen this pass and compose subsequent axes on top, in
        // the order the targets are listed.
        const outputs = ctrl.decompose(cmd.angleDeg, cmd.side);
        const shoulderBones = byArmature.get(
          resolveArmatureName('Shoulder_Armature', cmd.side),
        );
        const spineBones = byArmature.get('Spine_Armature');
        const seen = new Set<THREE.Object3D>();
        for (const { key, target } of ctrl.targets) {
          const rad = outputs[key];
          if (rad === undefined) continue;
          const map = target.armature === 'spine' ? spineBones : shoulderBones;
          if (!map) continue;
          for (const bn of target.bones) {
            const bone = map.get(bn);
            if (!bone) {
              // eslint-disable-next-line no-console
              console.warn(`[RigModel] chain bone not found: ${target.armature}/${bn}`);
              continue;
            }
            if (!seen.has(bone)) {
              const rq = restQuat.get(bone);
              if (rq) bone.quaternion.copy(rq);
              else bone.quaternion.identity();
              seen.add(bone);
              touchedRef.current.add(bone);
            }
            bone.rotateOnAxis(AXIS_VEC[target.axis], rad);
          }
        }
      } else {
        // spine: distribute the regional angle across the vertebra block.
        const bones = byArmature.get(ctrl.armature);
        if (!bones) {
          done();
          return;
        }
        const perLevelDeg = distributeSpineAngle(ctrl, cmd.angleDeg);
        ctrl.bones.forEach((bn, i) => {
          const bone = bones.get(bn);
          if (bone) rotate(bone, ctrl.axis, perLevelDeg[i] * DEG2RAD);
        });
      }

      done();
    },
    [rig, scene],
  );

  useEffect(() => {
    apply(rigChannel.get());
    const unsub = rigChannel.subscribe(apply);
    return () => {
      unsub();
      // Restore the rest pose so a re-entry starts clean (useGLTF caches scene).
      for (const b of touchedRef.current) {
        const rq = rig.restQuat.get(b);
        if (rq) b.quaternion.copy(rq);
      }
      touchedRef.current.clear();
      scene.updateMatrixWorld(true);
    };
  }, [apply, rig, scene]);

  return <primitive object={scene} />;
}
