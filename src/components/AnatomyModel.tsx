// src/components/AnatomyModel.tsx
//
// Loads the optimized GLB, applies per-mesh visibility based on active layers,
// side filter and current region, and handles hover + click selection with a
// cyan emissive highlight. Restores original material properties on deselect.
//
// IMPORTANT — material handling:
// Z-Anatomy shares a single material instance across many meshes (e.g. every
// "Skin-2" mesh points at the same THREE material). If we mutated those shared
// materials directly, highlighting one mesh would tint every sibling, and
// making skin transparent would also affect anything sharing that material.
// To avoid that, we CLONE each mesh's material once on load so every mesh owns
// its own material and can be styled independently.

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { AnatomyEntry } from '../types/anatomy';
import { useAnatomyStore } from '../store/anatomyStore';
import { colorForMaterial, colorForMaterialMesh } from '../lib/materialColors';

const MODEL_URL = '/modelo-opt.glb';
useGLTF.preload(MODEL_URL);

// Temporary diagnostic: logs the real material properties of the first few
// solid meshes so we can confirm what the GLB actually ships (vertex colors,
// baked maps, etc.). Set to false once colors are confirmed working.
const DEBUG_MAT = true;
let debugCount = 0;

// Highlight color (project accent cyan).
const HIGHLIGHT = 0x22d3ee;

// Skin appearance: a faint translucent "ghost" so internal structures stay
// visible while still conveying the body's silhouette — the way Complete
// Anatomy / Visible Body present skin.
const SKIN_COLOR = 0xbcd4e6; // cool, slightly blue tint
const SKIN_OPACITY = 0.16;

interface AnatomyModelProps {
  byMesh: Map<string, AnatomyEntry>;
  /** Optional region restriction: only these meshNames are eligible to show. */
  regionMeshes?: Set<string> | null;
  /** Called whenever the set of visible meshes changes, for camera framing. */
  onVisibleChange?: (meshes: THREE.Mesh[]) => void;
}

/** Cached per-mesh original material state so we can restore after highlight. */
interface OriginalMat {
  emissive: THREE.Color;
  emissiveIntensity: number;
}

export function AnatomyModel({
  byMesh,
  regionMeshes,
  onVisibleChange,
}: AnatomyModelProps) {
  const { scene } = useGLTF(MODEL_URL) as unknown as { scene: THREE.Group };
// TEMP DEBUG: expone la escena y THREE en la consola para diagnóstico.
  // Quitar cuando terminemos de arreglar la lateralidad.
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__scene = scene;
    (window as unknown as Record<string, unknown>).THREE = THREE;
  }
  const activeLayers = useAnatomyStore((s) => s.activeLayers);
  const sideFilter = useAnatomyStore((s) => s.sideFilter);
  const selectedMeshName = useAnatomyStore((s) => s.selectedMeshName);
  const hoveredMeshName = useAnatomyStore((s) => s.hoveredMeshName);
  const selectMesh = useAnatomyStore((s) => s.selectMesh);
  const setHovered = useAnatomyStore((s) => s.setHovered);

  // Collect all meshes once.
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) list.push(o as THREE.Mesh);
    });
    return list;
  }, [scene]);

  // Per-instance laterality, computed from world-space X position.
  //
  // The index can't carry side reliably: 760 mesh names are duplicated
  // (a bone's left and right instances share one runtime name), so the
  // name→entry map collapses them to a single `side`. Position is unique
  // per instance, so we resolve side here instead.
  //   +X = body's LEFT, -X = body's RIGHT (verified visually).
  // Midline structures (|x| < threshold) are 'center' and always shown.
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

  // One-time material setup: clone each material (so meshes are independent)
  // and make skin meshes translucent. Runs once per loaded scene.
  const preparedRef = useRef(false);
  useEffect(() => {
    if (preparedRef.current) return;
    preparedRef.current = true;

    for (const mesh of meshes) {
      // Clone material(s) so this mesh owns them and can be styled alone.
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }

      const entry = byMesh.get(mesh.name);
      if (!entry) continue;

      // Skin → translucent ghost. depthWrite:false stops it from hiding the
      // structures behind it; renderOrder pushes it to draw last (over solids).
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
        // Assign the anatomical atlas color by material name so muscles read
        // red, arteries red, veins blue, nerves yellow, etc.
        //
        // Three things can silently kill material.color:
        //   1. vertexColors === true  → final = color * per-vertex color
        //      (Z-Anatomy bakes grey/white vertex colors, washing ours out)
        //   2. a baked `map` texture   → final = map * color
        //   3. emissive left non-black → adds a grey wash on top
        // We strip all three on solid tissue so our flat atlas color shows.
        const atlasColor = colorForMaterialMesh(entry.materialName, mesh.name);
        const tune = (m: THREE.Material) => {
          const std = m as THREE.MeshStandardMaterial;

          // One-time peek at what the GLB actually gives us (first few only).
          if (DEBUG_MAT && debugCount < 8) {
            debugCount += 1;
            // eslint-disable-next-line no-console
            console.log('[MAT DEBUG]', entry.materialName, {
              vertexColors: (std as THREE.Material).vertexColors,
              hasMap: !!std.map,
              metalness: std.metalness,
              roughness: std.roughness,
              color: std.color?.getHexString(),
              emissive: std.emissive?.getHexString(),
            });
          }

          if (atlasColor !== null && 'color' in std && std.color) {
            // Kill anything that would tint/override our flat color.
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
    }
  }, [meshes, byMesh]);

  // Cache original emissive values once (per mesh) — after cloning above.
  const originals = useRef<Map<string, OriginalMat>>(new Map());
  useEffect(() => {
    const map = originals.current;
    for (const mesh of meshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (mat && 'emissive' in mat && !map.has(mesh.uuid)) {
        map.set(mesh.uuid, {
          emissive: mat.emissive.clone(),
          emissiveIntensity: mat.emissiveIntensity ?? 1,
        });
      }
    }
  }, [meshes]);

  // Apply visibility whenever filters change.
  useEffect(() => {
    const visible: THREE.Mesh[] = [];
    for (const mesh of meshes) {
      const entry = byMesh.get(mesh.name);

      // Unknown meshes: hide (keeps stray UI panels out).
      if (!entry) {
        mesh.visible = false;
        continue;
      }

      // Non-anatomical geometry (Text labels, Planes, Lines, Directions,
      // Movement arrows, Black backing, ...) returns null from the color map.
      // These 1100+ Text meshes otherwise sit in front of the body as grey
      // clutter, making everything look washed-out. Never render them here;
      // labels will be drawn as proper HTML overlays in a later phase.
      if (colorForMaterial(entry.materialName) === null) {
        mesh.visible = false;
        continue;
      }

      const meshSide = sideByUuid.get(mesh.uuid) ?? 'center';
      const layerOn = activeLayers.has(entry.layer);
      const sideOn =
        sideFilter === 'both' ||
        meshSide === 'center' ||
        meshSide === sideFilter;
      const regionOn = !regionMeshes || regionMeshes.has(mesh.name);
      const notHidden = !entry.hiddenByDefault || activeLayers.has('reference');

      const show = layerOn && sideOn && regionOn && notHidden;
      mesh.visible = show;
      if (show) visible.push(mesh);
    }
    onVisibleChange?.(visible);
 }, [meshes, byMesh, activeLayers, sideFilter, regionMeshes, onVisibleChange, sideByUuid]);

  // Apply highlight (selected = strong, hovered = soft). Skin is never
  // highlighted — it's a passive reference layer.
  useEffect(() => {
    const map = originals.current;
    for (const mesh of meshes) {
      const entry = byMesh.get(mesh.name);
      if (entry?.layer === 'skin') continue;

      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mat || !('emissive' in mat)) continue;
      const orig = map.get(mesh.uuid);
      if (!orig) continue;

      if (mesh.name === selectedMeshName) {
        mat.emissive.setHex(HIGHLIGHT);
        mat.emissiveIntensity = 0.9;
      } else if (mesh.name === hoveredMeshName) {
        mat.emissive.setHex(HIGHLIGHT);
        mat.emissiveIntensity = 0.35;
      } else {
        mat.emissive.copy(orig.emissive);
        mat.emissiveIntensity = orig.emissiveIntensity;
      }
    }
  }, [meshes, byMesh, selectedMeshName, hoveredMeshName]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    // R3F gives ALL ray hits in `intersections`, sorted near→far. Invisible
    // reference planes / movement arrows / skin sit in front of the muscles,
    // so we must skip them and pick the first genuinely selectable mesh
    // behind them, instead of just taking the closest hit.
    for (const hit of e.intersections) {
      const mesh = hit.object as THREE.Mesh;
      if (!mesh.visible) continue;
      const entry = byMesh.get(mesh.name);
      if (!entry) continue;
      if (entry.layer === 'skin') continue;
      if (entry.layer === 'reference') continue;
      selectMesh(mesh.name);
      return;
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    for (const hit of e.intersections) {
      const mesh = hit.object as THREE.Mesh;
      if (!mesh.visible) continue;
      const entry = byMesh.get(mesh.name);
      if (!entry) continue;
      if (entry.layer === 'skin') continue;
      if (entry.layer === 'reference') continue;
      setHovered(mesh.name);
      document.body.style.cursor = 'pointer';
      return;
    }
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
