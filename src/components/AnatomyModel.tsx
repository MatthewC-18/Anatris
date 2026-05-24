// src/components/AnatomyModel.tsx
//
// Loads the optimized GLB, applies per-mesh visibility based on active layers,
// side filter and current region, and handles hover + click selection with a
// strong emissive highlight. Restores original material on deselect.
//
// IMPORTANT — material handling:
// Z-Anatomy shares a single material instance across many meshes (e.g. every
// "Skin-2" mesh points at the same THREE material). If we mutated those shared
// materials directly, highlighting one mesh would tint every sibling. To avoid
// that, we CLONE each mesh's material once on load so every mesh owns its own
// material and can be styled independently.
//
// HIGHLIGHT DESIGN:
// - Selected muscle/mesh -> bright AMBER emissive (reads clearly over the red
//   muscle tissue; cyan washed out to grey on red).
// - When a muscle is selected, everything NOT part of it is dimmed slightly so
//   the eye lands on the highlighted structure — the Complete Anatomy look.
// - Hover -> soft amber.
//
// ISOLATE / PEEL ON SELECT:
// - When a muscle with a known `depth` is selected, every OTHER muscle that is
//   MORE SUPERFICIAL (smaller depth) becomes a translucent ghost, so you can
//   see through what physically covers the selected muscle. This is anatomical
//   (camera-independent): the deltoid always ghosts when you pick supraspinatus.
//   Only muscles are ghosted in this version — bones stay solid as reference.
//
// PART FOCUS (origin / insertion):
// - When `partFocus` is set, the meshes of that part (origin or insertion) of
//   the SELECTED muscle glow, while the rest of the SAME muscle is dimmed but
//   still visible — so you see WHERE it attaches without losing the muscle's
//   identity. Other muscles keep their normal selected/ghost/dim behaviour, so
//   part focus stacks on top of the isolate effect rather than replacing it.

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AnatomyEntry } from '../types/anatomy';
import { useAnatomyStore } from '../store/anatomyStore';
import { colorForMaterial, colorForMaterialMesh } from '../lib/materialColors';
import type { MuscleResolution } from '../lib/muscleResolver';
import { parseMeshName, type MusclePart } from '../lib/parseMeshName';
import { shoulderMuscles } from '../data/muscles/shoulder';
const MODEL_URL = '/modelo-opt.glb';
useGLTF.preload(MODEL_URL);

// Highlight color: bright amber/orange. Chosen because the muscle atlas color
// is red — a cyan emissive mixes with red into a muddy grey, while amber stays
// vivid and unmistakable on top of red, bone and tendon alike.
const HIGHLIGHT = 0xffa51e;
const HIGHLIGHT_INTENSITY_SELECTED = 1.1;
const HIGHLIGHT_INTENSITY_HOVER = 0.4;

// PART FOCUS colors. The focused attachment glows in a distinct hue so it reads
// as "this specific part", not just "selected". Cyan-green stands apart from
// the amber selection glow. The non-focused rest of the muscle is dimmed.
const PART_HIGHLIGHT = 0x2ee6a6; // bright teal/green for the focused part
const PART_HIGHLIGHT_INTENSITY = 1.2;
const PART_DIM = 0.22; // how dark the rest of the selected muscle goes (lower = darker)

// ATTENTION PULSE: when a muscle is freshly selected it glows brighter and
// "breathes" a couple of times, then settles into the steady selected glow.
// This draws the eye to the structure the moment it's picked from the list.
const PULSE_DURATION = 1.4; // seconds the whole pulse animation lasts
const PULSE_CYCLES = 2.5; // how many bright pulses within that duration
const PULSE_PEAK = 6.0; // emissiveIntensity at the brightest point (very bright)

// When a muscle is selected, non-selected solid tissue is gently dimmed so the
// highlighted structure pops. 1 = no dimming; lower = darker surroundings.
const DIM_WHEN_FOCUSED = 0.3;

// Muscles more superficial than the selected one become a translucent ghost so
// you can see through them. Lower = more see-through.
const GHOST_OPACITY = 0.14;

// Skin appearance: a faint translucent "ghost".
const SKIN_COLOR = 0xbcd4e6;
const SKIN_OPACITY = 0.16;

interface AnatomyModelProps {
  byMesh: Map<string, AnatomyEntry>;
  regionMeshes?: Set<string> | null;
  onVisibleChange?: (meshes: THREE.Mesh[]) => void;
  resolution: MuscleResolution;
}

/** Cached per-mesh original material state so we can restore after highlight. */
interface OriginalMat {
  emissive: THREE.Color;
  emissiveIntensity: number;
  color: THREE.Color;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

export function AnatomyModel({
  byMesh,
  regionMeshes,
  onVisibleChange,
  resolution,
}: AnatomyModelProps) {
  const { scene } = useGLTF(MODEL_URL) as unknown as { scene: THREE.Group };

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__scene = scene;
    (window as unknown as Record<string, unknown>).THREE = THREE;
  }

  const activeLayers = useAnatomyStore((s) => s.activeLayers);
  const sideFilter = useAnatomyStore((s) => s.sideFilter);
  const showOriginInsertion = useAnatomyStore((s) => s.showOriginInsertion);
  const selectedMeshName = useAnatomyStore((s) => s.selectedMeshName);
  const hoveredMeshName = useAnatomyStore((s) => s.hoveredMeshName);
  const selectMesh = useAnatomyStore((s) => s.selectMesh);
  const setHovered = useAnatomyStore((s) => s.setHovered);
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const partFocus = useAnatomyStore((s) => s.partFocus);

  // Collect all meshes once.
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) list.push(o as THREE.Mesh);
    });
    return list;
  }, [scene]);

  // Per-instance laterality from world-space X position.
  //   +X = body's LEFT, -X = body's RIGHT (verified visually).
  const sideByUuid = useMemo(() => {
    const SIDE_X_THRESHOLD = 0.02;
    const map = new Map<string, 'right' | 'left' | 'center'>();
    const v = new THREE.Vector3();
    scene.updateWorldMatrix(true, true);
    for (const mesh of meshes) {
      mesh.getWorldPosition(v);
      const side =
        v.x > SIDE_X_THRESHOLD ? 'left' : v.x < -SIDE_X_THRESHOLD ? 'right' : 'center';
      map.set(mesh.uuid, side);
    }
    return map;
  }, [scene, meshes]);

  // Per-mesh muscle PART (belly / origin / insertion / tendon), decoded from
  // the flattened Z-Anatomy name. We use this to hide the small origin (.o) and
  // insertion (.e) marker meshes by default — they're clutter in the dissection
  // view and only wanted when teaching a specific structure's attachments — AND
  // now also to drive the part-focus highlight.
  const partByUuid = useMemo(() => {
    const map = new Map<string, MusclePart>();
    for (const mesh of meshes) {
      map.set(mesh.uuid, parseMeshName(mesh.name).part);
    }
    return map;
  }, [meshes]);

  // Build a uuid -> muscleId map ONCE per (meshes, resolution). Resolving by
  // name inside the highlight loop is fragile because `resolution` is a fresh
  // object each render; precomputing here makes highlight cheap and stable.
  const muscleIdByUuid = useMemo(() => {
    const map = new Map<string, string>();
    for (const mesh of meshes) {
      const muscle = resolution.muscleByMeshName.get(mesh.name);
      if (muscle) map.set(mesh.uuid, muscle.id);
    }
    return map;
  }, [meshes, resolution]);
  // id -> depth, built straight from the clinical data (not from meshes), so
  // it's robust regardless of how selection propagates.
  const depthByMuscleId = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of shoulderMuscles) {
      if (typeof m.depth === 'number') map.set(m.id, m.depth);
    }
    return map;
  }, []);

  // uuid -> anatomical depth of the muscle this mesh belongs to (if any).
  // Used to ghost more-superficial muscles when a deeper one is selected.
  const muscleDepthByUuid = useMemo(() => {
    const map = new Map<string, number>();
    for (const mesh of meshes) {
      const muscle = resolution.muscleByMeshName.get(mesh.name);
      if (muscle) {
        const d = depthByMuscleId.get(muscle.id);
        if (typeof d === 'number') {
          map.set(mesh.uuid, d);
        }
      }
    }
    return map;
  }, [meshes, resolution, depthByMuscleId]);

  // Depth of the currently selected muscle (null if none / no depth assigned).
  const selectedDepth = useMemo(() => {
    if (selectedMuscleId == null) return null;
    return depthByMuscleId.get(selectedMuscleId) ?? null;
  }, [selectedMuscleId, depthByMuscleId]);

  // Does the selected muscle actually have meshes for the focused part? If a
  // muscle's origin/insertion isn't modelled as separate meshes, focusing it
  // would dim the whole muscle to nothing — so we only engage part focus when
  // there's at least one mesh of that part for the selected muscle.
  const partFocusHasMeshes = useMemo(() => {
    if (partFocus == null || selectedMuscleId == null) return false;
    for (const mesh of meshes) {
      if (muscleIdByUuid.get(mesh.uuid) !== selectedMuscleId) continue;
      if (partByUuid.get(mesh.uuid) === partFocus) return true;
    }
    return false;
  }, [partFocus, selectedMuscleId, meshes, muscleIdByUuid, partByUuid]);

  // ----- attention pulse state (driven by useFrame, not React renders) -----
  // pulseStart < 0 means "no pulse running". The set of meshes that should
  // pulse is captured when selection changes, so the frame loop can animate
  // just those materials without touching anything else.
  const pulseStartRef = useRef<number>(-1);
  const pulseMeshesRef = useRef<THREE.Mesh[]>([]);
  const clockRef = useRef(0);
  // Reusable color objects so the per-frame pulse doesn't allocate every tick.
  const pulseColorRef = useRef(new THREE.Color());
  const pulseAmberRef = useRef(new THREE.Color(HIGHLIGHT));
  const pulseYellowRef = useRef(new THREE.Color(0xfff04d));

  // One-time material setup: clone each material and style skin / solid tissue.
  const preparedRef = useRef(false);
  // originals are captured DURING preparation, so they always exist before any
  // highlight runs (no more "if (!orig) continue" skipping the very first paint).
  const originals = useRef<Map<string, OriginalMat>>(new Map());

  useEffect(() => {
    if (preparedRef.current) return;
    preparedRef.current = true;
    const origMap = originals.current;

    for (const mesh of meshes) {
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }

      const entry = byMesh.get(mesh.name);
      if (!entry) continue;

      if (entry.layer === 'skin') {
        const apply = (m: THREE.Material) => {
          const std = m as THREE.MeshStandardMaterial;
          std.vertexColors = false;
          if (std.map) std.map = null;
          std.transparent = true;
          std.opacity = SKIN_OPACITY;
          std.depthWrite = false;
          std.side = THREE.FrontSide;
          if ('color' in std && std.color) std.color.setHex(SKIN_COLOR);
          if ('emissive' in std && std.emissive) std.emissive.setHex(0x000000);
          if ('roughness' in std) std.roughness = 0.9;
          if ('metalness' in std) std.metalness = 0.0;
          std.needsUpdate = true;
        };
        if (Array.isArray(mesh.material)) mesh.material.forEach(apply);
        else apply(mesh.material);
        mesh.renderOrder = 10;
      } else {
        const atlasColor = colorForMaterialMesh(entry.materialName, mesh.name);
        const tune = (m: THREE.Material) => {
          const std = m as THREE.MeshStandardMaterial;
          if (atlasColor !== null && 'color' in std && std.color) {
            std.vertexColors = false;
            if (std.map) std.map = null;
            std.color.setHex(atlasColor);
            if ('emissive' in std && std.emissive) std.emissive.setHex(0x000000);
          }
          if ('roughness' in std) std.roughness = 0.55;
          if ('metalness' in std) std.metalness = 0.0;
          std.needsUpdate = true;
        };
        if (Array.isArray(mesh.material)) mesh.material.forEach(tune);
        else if (mesh.material) tune(mesh.material);
      }

      // Capture original emissive + base color + transparency NOW
      // (post-clone, post-tune).
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (mat && 'emissive' in mat) {
        origMap.set(mesh.uuid, {
          emissive: mat.emissive.clone(),
          emissiveIntensity: mat.emissiveIntensity ?? 1,
          color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
          opacity: mat.opacity ?? 1,
          transparent: mat.transparent ?? false,
          depthWrite: mat.depthWrite ?? true,
        });
      }
    }
  }, [meshes, byMesh]);

  // Visibility.
  useEffect(() => {
    const visible: THREE.Mesh[] = [];
    for (const mesh of meshes) {
      const entry = byMesh.get(mesh.name);
      if (!entry) {
        mesh.visible = false;
        continue;
      }
      if (colorForMaterial(entry.materialName) === null) {
        mesh.visible = false;
        continue;
      }
      const meshSide = sideByUuid.get(mesh.uuid) ?? 'center';
      const layerOn = activeLayers.has(entry.layer);
      const sideOn =
        sideFilter === 'both' || meshSide === 'center' || meshSide === sideFilter;
      const regionOn = !regionMeshes || regionMeshes.has(mesh.name);
      const notHidden = !entry.hiddenByDefault || activeLayers.has('reference');
      // Origin (.o) and insertion (.e) marker meshes are hidden unless the user
      // explicitly turns them on. Bellies and tendons are never hidden by this.
      const part = partByUuid.get(mesh.uuid);
      const markerOn =
        showOriginInsertion || (part !== 'origin' && part !== 'insertion');
      const show = layerOn && sideOn && regionOn && notHidden && markerOn;
      mesh.visible = show;
      if (show) visible.push(mesh);
    }
    onVisibleChange?.(visible);
  }, [
    meshes,
    byMesh,
    activeLayers,
    sideFilter,
    regionMeshes,
    onVisibleChange,
    sideByUuid,
    partByUuid,
    showOriginInsertion,
  ]);

  // Highlight + isolate + part focus. Runs whenever selection/hover/muscle/part
  // changes. Robust: it never skips a mesh for lack of a cached original — it
  // falls back to black.
  useEffect(() => {
    const map = originals.current;
    const focusing = selectedMuscleId != null || selectedMeshName != null;
    // Part focus only engages if the selected muscle actually has meshes of
    // that part (otherwise it would dim the whole muscle to nothing).
    const partActive = partFocus != null && partFocusHasMeshes;

    for (const mesh of meshes) {
      const entry = byMesh.get(mesh.name);
      // Only touch meshes that belong to a real, highlightable anatomical
      // layer. Skip skin, reference labels, groups, and anything unclassified —
      // these may share a material instance with visible meshes, and tinting
      // their emissive would bleed the highlight onto invisible siblings.
      if (!entry) continue;
      if (entry.layer === 'skin') continue;
      if (entry.layer === 'reference') continue;

      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mat || !('emissive' in mat)) continue;

      const orig = map.get(mesh.uuid);
      const origEmissive = orig ? orig.emissive : new THREE.Color(0x000000);
      const origEmissiveIntensity = orig ? orig.emissiveIntensity : 1;
      const origColor = orig ? orig.color : null;
      const origOpacity = orig ? orig.opacity : 1;
      const origTransparent = orig ? orig.transparent : false;
      const origDepthWrite = orig ? orig.depthWrite : true;

      const muscleOfMeshId = muscleIdByUuid.get(mesh.uuid);
      const isSelectedMuscle =
        selectedMuscleId != null && muscleOfMeshId === selectedMuscleId;
      const isSelectedMesh = mesh.name === selectedMeshName;
      const isHovered = mesh.name === hoveredMeshName;

      // Part-focus sub-roles, only meaningful for the selected muscle's meshes.
      const myPart = partByUuid.get(mesh.uuid);
      const isFocusedPart =
        partActive && isSelectedMuscle && myPart === partFocus;
      const isOtherPartOfSelected =
        partActive && isSelectedMuscle && myPart !== partFocus;

      // Should this mesh be ghosted? Only when isolating a muscle that has a
      // known depth, and this mesh belongs to a DIFFERENT muscle that is more
      // superficial (smaller depth). Bones / non-muscles are never ghosted.
      const myDepth = muscleDepthByUuid.get(mesh.uuid);
      const shouldGhost =
        selectedDepth != null &&
        !isSelectedMuscle &&
        typeof myDepth === 'number' &&
        myDepth < selectedDepth;

      // Always reset transparency baseline first (so deselect restores it).
      mat.transparent = origTransparent;
      mat.opacity = origOpacity;
      mat.depthWrite = origDepthWrite;

      if (isFocusedPart) {
        // The attachment we're teaching: distinct teal glow, drawn on top.
        mat.emissive.setHex(PART_HIGHLIGHT);
        mat.emissiveIntensity = PART_HIGHLIGHT_INTENSITY;
        if (origColor && mat.color) mat.color.copy(origColor);
        mat.depthTest = true;
        mesh.renderOrder = 6;
      } else if (isOtherPartOfSelected) {
        // Rest of the selected muscle: dimmed but visible, keeps context. No
        // emissive glow so the focused part clearly stands out against it.
        mesh.renderOrder = 4;
        mat.emissive.copy(origEmissive);
        mat.emissiveIntensity = origEmissiveIntensity;
        if (origColor && mat.color) {
          mat.color.copy(origColor).multiplyScalar(PART_DIM);
        }
      } else if (isSelectedMesh || isSelectedMuscle) {
        // Strong amber glow on the selected structure. Render it LAST so it
        // draws on top of any translucent ghosts in front of it.
        mat.emissive.setHex(HIGHLIGHT);
        mat.emissiveIntensity = HIGHLIGHT_INTENSITY_SELECTED;
        if (origColor && mat.color) mat.color.copy(origColor); // full color
        mat.depthTest = true;
        mesh.renderOrder = 5;
      } else if (shouldGhost) {
        // Translucent ghost: see through what covers the selected muscle.
        // Render BEFORE the selected muscle and don't write depth, so the
        // amber structure behind it shows through cleanly.
        mat.emissive.copy(origEmissive);
        mat.emissiveIntensity = origEmissiveIntensity;
        if (origColor && mat.color) mat.color.copy(origColor);
        mat.transparent = true;
        mat.opacity = GHOST_OPACITY;
        mat.depthWrite = false;
        mesh.renderOrder = 1;
      } else if (isHovered) {
        mat.emissive.setHex(HIGHLIGHT);
        mat.emissiveIntensity = HIGHLIGHT_INTENSITY_HOVER;
        if (origColor && mat.color) mat.color.copy(origColor);
      } else {
        // Not selected. Restore emissive; dim the base color while focusing.
        mesh.renderOrder = 0;
        mat.emissive.copy(origEmissive);
        mat.emissiveIntensity = origEmissiveIntensity;
        if (origColor && mat.color) {
          if (focusing) {
            mat.color.copy(origColor).multiplyScalar(DIM_WHEN_FOCUSED);
          } else {
            mat.color.copy(origColor);
          }
        }
      }
      mat.needsUpdate = true;
    }
  }, [
    meshes,
    byMesh,
    selectedMeshName,
    hoveredMeshName,
    selectedMuscleId,
    selectedDepth,
    muscleIdByUuid,
    muscleDepthByUuid,
    partByUuid,
    partFocus,
    partFocusHasMeshes,
  ]);

  // Trigger the attention pulse whenever the SELECTED MUSCLE changes. We
  // capture the exact meshes to pulse here (cheap, only on selection change)
  // and let the frame loop below animate their glow over PULSE_DURATION.
  useEffect(() => {
    if (selectedMuscleId == null) {
      pulseStartRef.current = -1;
      pulseMeshesRef.current = [];
      return;
    }
    const targets: THREE.Mesh[] = [];
    for (const mesh of meshes) {
      if (muscleIdByUuid.get(mesh.uuid) === selectedMuscleId) targets.push(mesh);
    }
    pulseMeshesRef.current = targets;
    pulseStartRef.current = clockRef.current; // start "now"
  }, [selectedMuscleId, meshes, muscleIdByUuid]);

  // Frame loop: drive the pulse animation. While a pulse is active we override
  // the selected meshes' emissiveIntensity with a decaying sine "breathing"
  // that eases back down to the steady selected glow, then we stop touching it.
  //
  // The pulse is suppressed while a part focus is active, so it doesn't fight
  // the teal attachment highlight.
  useFrame((_, delta) => {
    clockRef.current += delta;
    const start = pulseStartRef.current;
    if (start < 0) return;
    if (partFocus != null) {
      // Part focus owns the look right now; stop pulsing.
      pulseStartRef.current = -1;
      return;
    }

    const t = clockRef.current - start; // seconds since pulse began
    const targets = pulseMeshesRef.current;

    if (t >= PULSE_DURATION || targets.length === 0) {
      // Pulse finished: settle to the steady selected intensity and stop.
      for (const mesh of targets) {
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (mat && 'emissive' in mat) {
          mat.emissiveIntensity = HIGHLIGHT_INTENSITY_SELECTED;
        }
      }
      pulseStartRef.current = -1;
      return;
    }

    // progress 0..1 across the whole animation.
    const p = t / PULSE_DURATION;
    // A sine that completes PULSE_CYCLES bumps, multiplied by a fade-out so the
    // last pulses are gentler and it lands softly on the steady value.
    const wave = Math.sin(p * Math.PI * 2 * PULSE_CYCLES);
    const envelope = 1 - p; // linear fade so the pulse calms down
    const bump = Math.max(0, wave) * envelope; // only brighten, never darken
    const intensity =
      HIGHLIGHT_INTENSITY_SELECTED +
      bump * (PULSE_PEAK - HIGHLIGHT_INTENSITY_SELECTED);

    // Also shift the emissive COLOR toward bright yellow at each peak. Pure
    // brightness can saturate and stop reading; a hue shift always reads. We
    // lerp from amber (HIGHLIGHT) toward yellow proportionally to the bump.
    const pulseColor = pulseColorRef.current
      .copy(pulseAmberRef.current)
      .lerp(pulseYellowRef.current, bump);

    for (const mesh of targets) {
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (mat && 'emissive' in mat) {
        mat.emissive.copy(pulseColor);
        mat.emissiveIntensity = intensity;
      }
    }
  });

  const pickFromIntersections = (
    intersections: ThreeEvent<MouseEvent>['intersections'],
  ): THREE.Mesh | null => {
    for (const hit of intersections) {
      const mesh = hit.object as THREE.Mesh;
      if (!mesh.visible) continue;
      const entry = byMesh.get(mesh.name);
      if (!entry) continue;
      if (entry.layer === 'skin') continue;
      if (entry.layer === 'reference') continue;
      return mesh;
    }
    return null;
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const mesh = pickFromIntersections(e.intersections);
    if (!mesh) return;
    selectMesh(mesh.name);
    const muscle = resolution.muscleByMeshName.get(mesh.name);
    useAnatomyStore.getState().selectMuscle(muscle ? muscle.id : null);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const mesh = pickFromIntersections(
      e.intersections as unknown as ThreeEvent<MouseEvent>['intersections'],
    );
    if (!mesh) return;
    setHovered(mesh.name);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(null);
    document.body.style.cursor = 'default';
  };

  return (
    <primitive
      object={scene}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}
