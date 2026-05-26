// src/components/AttachmentMarkers.tsx
//
// Renders 3D "pin" markers at the origin and/or insertion of the currently
// selected muscle, driven by the store's `partFocus`.
//
// WHY THIS EXISTS:
// Z-Anatomy ships tiny point-meshes (materials "Origin-*" / "End-*") that mark
// roughly where a muscle attaches, but they are visually negligible — a couple
// of pixels. Trying to recolor those meshes is pointless. Instead we read their
// WORLD POSITION and draw our own, controllable marker there: a glowing sphere
// with a soft halo and a camera-facing text label. This turns an invisible dot
// into a clear teaching pin ("Insertion: greater tubercle"), anchored at the
// anatomically-correct spot the model already knows.
//
// IMPORTANT — the markers are APPROXIMATE. Z-Anatomy places them near the
// attachment, not with surgical precision. Good enough for teaching the
// landmark a student will palpate; not a substitute for a true insertion
// footprint. Communicate that in UI copy if precision is implied.
//
// This component lives INSIDE the Canvas. It does not touch AnatomyModel's
// material/highlight logic — it only adds overlay geometry.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnatomyStore } from '../store/anatomyStore';
import { parseMeshName } from '../lib/parseMeshName';
import { getLandmarks } from '../data/attachmentLandmarks';
import type { MuscleResolution } from '../lib/muscleResolver';
import type { SideFilter } from '../store/anatomyStore';

// Colors match the panel/toolbar accent for each part so the UI and the 3D
// read as the same action. Origin = warm amber, Insertion = teal/green.
const ORIGIN_COLOR = 0xffb24d;
const INSERTION_COLOR = 0x2ee6a6;

// Marker sizing is in world units. The shoulder model is roughly ~1 unit tall
// per arm span fragment, so these are tuned small. Adjust if your scale differs.
const PIN_RADIUS = 0.012;
const HALO_RADIUS = 0.026;

interface AttachmentTarget {
  position: THREE.Vector3;
  part: 'origin' | 'insertion';
  label: string;
}

interface AttachmentMarkersProps {
  resolution: MuscleResolution;
}

/** Does a parsed mesh's side pass the current side filter? */
function sidePasses(side: 'left' | 'right' | 'center', filter: SideFilter): boolean {
  if (filter === 'both') return true;
  if (side === 'center') return true;
  return side === filter;
}

/**
 * Build a small canvas-based text sprite that always faces the camera. Cheap
 * and dependency-free (no drei Html overlay, no layout interference).
 */
function makeLabelSprite(text: string, hex: number): THREE.Sprite {
  const pad = 16;
  const fontSize = 44;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width) + pad * 2;
  const h = fontSize + pad * 2;
  canvas.width = w;
  canvas.height = h;

  // Rounded translucent dark plate.
  ctx.fillStyle = 'rgba(10, 15, 26, 0.82)';
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
  ctx.fill();

  // Accent left bar.
  const c = new THREE.Color(hex);
  ctx.fillStyle = `rgb(${c.r * 255 | 0}, ${c.g * 255 | 0}, ${c.b * 255 | 0})`;
  ctx.fillRect(0, 0, 6, h);

  // Text.
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#eef2f6';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad + 6, h / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false, // always readable, never buried in tissue
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  // Scale the sprite to a sensible world size based on its aspect ratio.
  const worldH = 0.05;
  sprite.scale.set((w / h) * worldH, worldH, 1);
  sprite.renderOrder = 999;
  return sprite;
}

export function AttachmentMarkers({ resolution }: AttachmentMarkersProps) {
  const { scene } = useThree();
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const partFocus = useAnatomyStore((s) => s.partFocus);
  const sideFilter = useAnatomyStore((s) => s.sideFilter);

  const groupRef = useRef<THREE.Group>(null);
  const haloRefs = useRef<THREE.Mesh[]>([]);
  const clockRef = useRef(0);

  // Spanish label per part. Kept generic; a future per-muscle map can refine it
  // (e.g. "Inserción: troquíter") but the part name alone already teaches.
  const partLabel = useMemo(
    () => ({ origin: 'Origen', insertion: 'Inserción' }) as const,
    [],
  );

  // Resolve the world positions of the focused part's marker meshes for the
  // selected muscle. Recomputed when selection / part / side changes.
  const [targets, setTargets] = useState<AttachmentTarget[]>([]);

  useEffect(() => {
    if (selectedMuscleId == null || partFocus == null) {
      setTargets([]);
      return;
    }
    // Ensure world matrices are fresh before reading positions.
    scene.updateWorldMatrix(true, true);

    const out: AttachmentTarget[] = [];
    const wpos = new THREE.Vector3();

    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      // Does this mesh belong to the selected muscle?
      const muscle = resolution.muscleByMeshName.get(m.name);
      if (!muscle || muscle.id !== selectedMuscleId) return;
      // Is it the focused part?
      const parsed = parseMeshName(m.name);
      if (parsed.part !== partFocus) return;
      if (!sidePasses(parsed.side, sideFilter)) return;

      m.getWorldPosition(wpos);
      if (!isFinite(wpos.x)) return;

      // Prefer the specific bony landmark ("Inserción: troquíter") when the
      // muscle has one in the landmark map; otherwise fall back to the generic
      // part name.
      const landmarks = getLandmarks(muscle.id);
      const landmark = landmarks
        ? partFocus === 'origin'
          ? landmarks.origin
          : landmarks.insertion
        : null;
      const label = landmark
        ? `${partLabel[partFocus]}: ${landmark}`
        : partLabel[partFocus];

      out.push({
        position: wpos.clone(),
        part: partFocus,
        label,
      });
    });

    setTargets(out);
  }, [selectedMuscleId, partFocus, sideFilter, resolution, scene, partLabel]);

  // Build the marker objects (sphere + halo + label) whenever targets change.
  // We rebuild rather than diff because the set is tiny (1-2 markers).
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Dispose previous children to avoid leaks.
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      disposeObject(child);
    }
    haloRefs.current = [];

    for (const t of targets) {
      const color = t.part === 'origin' ? ORIGIN_COLOR : INSERTION_COLOR;

      const pin = new THREE.Group();
      pin.position.copy(t.position);

      // Solid glowing core.
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(PIN_RADIUS, 24, 24),
        new THREE.MeshBasicMaterial({ color, depthTest: false }),
      );
      core.renderOrder = 998;
      pin.add(core);

      // Soft translucent halo (animated).
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(HALO_RADIUS, 24, 24),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.28,
          depthTest: false,
          depthWrite: false,
        }),
      );
      halo.renderOrder = 997;
      pin.add(halo);
      haloRefs.current.push(halo);

      // Camera-facing label, lifted slightly above the pin.
      const sprite = makeLabelSprite(t.label, color);
      sprite.position.set(0, HALO_RADIUS + 0.04, 0);
      pin.add(sprite);

      group.add(pin);
    }

    return () => {
      // On unmount, clean up.
      if (group) {
        while (group.children.length > 0) {
          const child = group.children[0];
          group.remove(child);
          disposeObject(child);
        }
      }
    };
  }, [targets]);

  // Gentle breathing pulse on the halos so the pin reads as "active".
  useFrame((_, delta) => {
    clockRef.current += delta;
    const s = 1 + Math.sin(clockRef.current * 3) * 0.18;
    for (const halo of haloRefs.current) {
      halo.scale.setScalar(s);
      const mat = halo.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.22 + (Math.sin(clockRef.current * 3) + 1) * 0.08;
    }
  });

  return <group ref={groupRef} />;
}

/** Recursively dispose geometries / materials / textures of an object. */
function disposeObject(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as THREE.Mesh).material as
      | THREE.Material
      | THREE.Material[]
      | undefined;
    if (Array.isArray(mat)) mat.forEach(disposeMaterial);
    else if (mat) disposeMaterial(mat);
  });
  const sprite = obj as THREE.Sprite;
  if (sprite.isSprite && sprite.material) disposeMaterial(sprite.material);
}

function disposeMaterial(mat: THREE.Material) {
  const m = mat as THREE.MeshBasicMaterial | THREE.SpriteMaterial;
  if ('map' in m && m.map) m.map.dispose();
  mat.dispose();
}
