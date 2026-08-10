// src/components/movement/NeuroSkinLayer.tsx
//
// THE DERMATOME ON THE REAL BODY. Selecting a root in the neuro panel lights that
// root's skin on the 3D rig, in the same segmental pigment the 2D plate uses, and
// it keeps glowing while the myotome demo drives the limb through its movement.
//
// That combination is the point. A plate shows a territory; a rig shows a
// movement. Showing the dermatome and the myotome of ONE root at the same time, on
// one body you can orbit, is the thing the flat plate cannot do and the reason this
// layer exists.
//
// -----------------------------------------------------------------------------
// HOW IT FINDS THE SKIN
// -----------------------------------------------------------------------------
// RigModel tags every skin patch `userData.rigLayer = 'skin'` (the body envelope
// and the distal hand/foot caps alike -- and the caps matter most, since that is
// where the ASIA key points are). This layer indexes those patches ONCE, groups
// them by canonical region name and side, and resolves each patch's position
// within its group into the two fractions the mapping is written in: lateral
// across the limb, level along it. See src/data/neuro/skinRegions.ts.
//
// Fractions are measured at the REST POSE and cached. That is correct rather than
// convenient: they answer "which part of the forearm is this patch", which does not
// change when the elbow bends. Recomputing them per frame on a posed limb would
// make a dermatome slide along the arm as it moves.
//
// -----------------------------------------------------------------------------
// HOW IT PAINTS, AND WHY NOT BY TOUCHING THE SHARED MATERIAL
// -----------------------------------------------------------------------------
// All body skin shares ONE material instance, and RigModel animates that instance
// every frame for the glass-skin fade. So tinting cannot mean writing to it: the
// whole body would change colour, and the fade would fight the tint.
//
// Instead each root gets one material of its own, cloned from the patch's material
// the first time it is needed, and the selected patches are swapped onto it. Two
// things fall out of that, both wanted:
//
//   * The tinted patches do NOT participate in the ghost fade, because the fade
//     writes only to the shared instance. During a myotome demo the body turns to
//     glass and the dermatome stays solid and lit -- exactly the reveal we want,
//     for free.
//   * Restoring is exact: every swap remembers the material it replaced.
//
// Patches are also forced VISIBLE while painted, and their previous visibility
// restored afterwards, so the map still appears when the user has peeled the skin
// layer off. Asking for a dermatome is asking to see skin.
//
// Fully reversible: materials disposed and every patch restored on unmount.
// ASCII source; no `any`.

import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

import {
  ownedPatches,
  resolvePatches,
  type PatchConfidence,
  type ResolvedPatch,
} from '../../lib/neuroSkin';
import { pigmentFor, type PlateFigure } from '../../data/neuro/plate';
import { neuroSkinChannel, type NeuroSkinCommand } from './neuroSkinChannel';

/**
 * How a painted territory is coloured.
 *
 * The first pass stained the skin -- it pulled the patch's own colour 68% toward the
 * pigment and left it there, on the theory that a territory should look like skin
 * under a wash rather than like plastic. On the real body that theory failed: a
 * desaturated teal mixed into a warm skin tone under studio lighting comes out
 * GREY, and C5's territory read as a grey plaque on the arm instead of as a marked
 * region. Nobody would guess it was the answer to what they clicked.
 *
 * So the territory is now painted, not stained. The pigment IS the colour, lifted a
 * little toward white so it still reads as lit rather than flat, with a matching
 * emissive so it holds up where the stage lighting falls away (the medial arm, the
 * back of the leg). The 2D plate can afford the muted version because it sits on
 * dark tissue; a body cannot.
 */
// The APP is lit far more brightly than the offline harness this was first tuned
// in -- studio IBL, a rim light and a higher exposure -- so values that read as a
// confident teal in the harness came out as pale mint in the product. Tuned against
// the app, and left low on purpose: it is easier to lose a pigment to light than to
// too little of it.
const TINT_LIGHTEN = 0.06;
const TINT_EMISSIVE = 0.4;
/** Slightly glossier than skin, so the region catches the key light as one surface. */
const TINT_ROUGHNESS = 0.55;

/**
 * A BROAD territory is a wash, not a fill.
 *
 * Where the rig only knows the region and not the band (see confidenceFor), the
 * patch is drawn translucent so the skin reads through it. That is the difference
 * between "this area, roughly" and "the boundary is here" -- and it is what stops
 * one wide shell of the forearm from teaching that C6 owns the whole thing.
 */
const BROAD_OPACITY = 0.68;
const BROAD_EMISSIVE = 0.28;
const BROAD_LIGHTEN = 0.02;

/** A skin patch of the live scene, positioned within its region. */
type Patch = ResolvedPatch<THREE.Mesh>;

/** Bounding-box centre of a mesh in world space, at whatever pose it is in. */
function worldCentre(mesh: THREE.Mesh, out: THREE.Vector3): THREE.Vector3 {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const bb = mesh.geometry.boundingBox;
  if (!bb) return out.set(0, 0, 0);
  bb.getCenter(out);
  return mesh.localToWorld(out);
}

/**
 * Read every skin patch out of the scene and hand it to the pure resolver.
 *
 * This is the only part of the pipeline that knows about three.js; the placing and
 * matching live in src/lib/neuroSkin.ts, where a test can run them against a
 * snapshot of the real rig.
 */
function indexPatches(scene: THREE.Object3D): Patch[] {
  const raw: {
    ref: THREE.Mesh;
    name: string;
    x: number;
    y: number;
    span?: number;
  }[] = [];
  const c = new THREE.Vector3();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.userData.rigLayer !== 'skin') return;
    worldCentre(mesh, c);
    const bb = mesh.geometry.boundingBox;
    // World-space width, so `spread` compares like with like across patches. The
    // mesh's own scale is baked in by localToWorld on the two corners.
    const lo = bb ? mesh.localToWorld(bb.min.clone()) : null;
    const hi = bb ? mesh.localToWorld(bb.max.clone()) : null;
    raw.push({
      ref: mesh,
      name: mesh.name,
      x: c.x,
      y: c.y,
      span: lo && hi ? Math.abs(hi.x - lo.x) : undefined,
    });
  });
  return resolvePatches(raw);
}

export function NeuroSkinLayer(): JSX.Element {
  const { scene } = useThree();
  const patchesRef = useRef<Patch[] | null>(null);
  /** Per-root tinted material, built on first use and disposed on unmount. */
  const materialsRef = useRef(new Map<string, THREE.Material>());
  /** What we changed, so it can be put back exactly. */
  const paintedRef = useRef(new Map<THREE.Mesh, { material: THREE.Material; visible: boolean }>());
  const cmdRef = useRef<NeuroSkinCommand>(neuroSkinChannel.get());

  // Rebuilt on demand rather than in an effect: the rig streams in, so the first
  // selection may arrive before every patch exists.
  const ensureIndex = (): Patch[] => {
    const cached = patchesRef.current;
    if (cached && cached.length > 0) return cached;
    const built = indexPatches(scene);
    patchesRef.current = built;
    return built;
  };

  const tintFor = (
    figure: PlateFigure,
    root: string,
    confidence: PatchConfidence,
    from: THREE.Material,
  ): THREE.Material => {
    const key = `${figure}:${root}:${confidence}`;
    const cached = materialsRef.current.get(key);
    if (cached) return cached;
    const sure = confidence === 'sure';
    const pigment = new THREE.Color(pigmentFor(figure, root));
    const clone = from.clone();
    const std = clone as THREE.MeshStandardMaterial;
    if (std.color) {
      std.color
        .copy(pigment)
        .lerp(new THREE.Color(0xffffff), sure ? TINT_LIGHTEN : BROAD_LIGHTEN);
    }
    if (std.emissive) {
      std.emissive = pigment.clone();
      std.emissiveIntensity = sure ? TINT_EMISSIVE : BROAD_EMISSIVE;
    }
    if (typeof std.roughness === 'number') std.roughness = TINT_ROUGHNESS;
    // A SURE territory is the subject: solid, writing depth. A BROAD one is a wash
    // over skin, so it stays translucent and does not occlude what is behind it.
    std.transparent = !sure;
    std.opacity = sure ? 1 : BROAD_OPACITY;
    std.depthWrite = sure;
    materialsRef.current.set(key, clone);
    return clone;
  };

  const restoreAll = () => {
    for (const [mesh, prev] of paintedRef.current) {
      mesh.material = prev.material;
      mesh.visible = prev.visible;
    }
    paintedRef.current.clear();
  };

  const apply = (cmd: NeuroSkinCommand) => {
    cmdRef.current = cmd;
    restoreAll();
    if (!cmd.figure || cmd.roots.length === 0) return;
    const patches = ensureIndex();
    if (patches.length === 0) return;
    for (const root of cmd.roots) {
      for (const { patch, confidence } of ownedPatches(patches, cmd.figure, root)) {
        // First writer wins: with two roots selected (compare mode) a patch that
        // somehow matched both keeps the first, so the pair never flickers by
        // iteration order.
        if (paintedRef.current.has(patch.ref)) continue;
        const material = patch.ref.material as THREE.Material;
        paintedRef.current.set(patch.ref, { material, visible: patch.ref.visible });
        patch.ref.material = tintFor(cmd.figure, root, confidence, material);
        // Asking for a dermatome is asking to see skin, even with the layer peeled.
        patch.ref.visible = true;
      }
    }
  };

  useEffect(() => {
    // Apply whatever is already selected (the panel may have published before the
    // rig finished loading), then follow the channel.
    apply(neuroSkinChannel.get());
    const off = neuroSkinChannel.subscribe(apply);
    return () => {
      off();
      restoreAll();
      for (const m of materialsRef.current.values()) m.dispose();
      materialsRef.current.clear();
      patchesRef.current = null;
    };
    // `apply` closes only over refs, so it is stable for this effect's purposes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // The rig loads asynchronously: a selection made while it was still streaming
  // would find no patches. Retry a few times, then stop -- a rig that has no skin
  // after this long does not have skin.
  useEffect(() => {
    if (patchesRef.current && patchesRef.current.length > 0) return;
    let tries = 0;
    const id = window.setInterval(() => {
      tries++;
      const found = indexPatches(scene);
      if (found.length > 0) {
        patchesRef.current = found;
        apply(cmdRef.current);
        window.clearInterval(id);
      } else if (tries > 20) {
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return useMemo(() => <group />, []);
}
