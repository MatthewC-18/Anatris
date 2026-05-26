// src/components/RomMuscleMarkers.tsx
//
// Numbered 3D pins for the muscles currently active in a ROM highlight. This is
// the 3D half of the list<->3D identity bridge for the ROM panel.
//
// THE PROBLEM IT SOLVES:
// In a ROM highlight, color encodes ROLE (amber=prime-mover, sky=assistant,
// violet=stabilizer), not identity. With several muscles sharing a role (e.g.
// three violet stabilizers) a student can't tell which violet is which. Each
// muscle gets a STABLE NUMBER (from src/lib/romNumber.ts, ordered anatomically)
// shown both on its panel chip and on a pin floating at its centroid here. The
// number is the locator; the color stays the role.
//
// HOVER SPOTLIGHT:
// When a muscle is "focused" (romFocusMuscleId â€” set by hovering its chip in
// the panel, or its mesh in 3D), its pin reveals the full Spanish NAME next to
// the number, and the pin enlarges/brightens. Everything else stays as-is. The
// hover only changes what THIS overlay shows; the actual emissive intensity
// modulation of the meshes is handled in AnatomyModel (it reads the same store
// field). Camera never moves on hover.
//
// This component is a sibling of AttachmentMarkers, mirrors its structure
// (read world positions of possibly-hidden meshes, draw camera-facing sprites
// with depthTest:false), and likewise does NOT touch AnatomyModel's material
// logic â€” it only adds overlay geometry.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnatomyStore } from '../store/anatomyStore';
import { parseMeshName } from '../lib/parseMeshName';
import { buildRomNumbering } from '../lib/romNumber';
import { shoulderMuscles } from '../data/muscles/shoulder';
import type { MuscleResolution } from '../lib/muscleResolver';
import type { SideFilter } from '../store/anatomyStore';
import type { RomMuscleRole } from '../types/rom';

// Mirror of the 3D emissive role colors (AnatomyModel.ROM_ROLE_COLOR), used to
// tint the number badge so the pin reads as the same role as the glowing mesh.
const ROLE_COLOR: Record<RomMuscleRole, number> = {
  'prime-mover': 0xffa51e, // amber
  assistant: 0x38bdf8, // sky-400
  stabilizer: 0xa78bfa, // violet-400
};

// Pin sizing in world units, tuned to the same shoulder scale as
// AttachmentMarkers (where PIN_RADIUS = 0.012). The numbered badge is a sprite,
// so these control its on-screen world height.
const BADGE_WORLD_H = 0.055; // normal
const BADGE_WORLD_H_FOCUS = 0.075; // focused (slightly larger)

interface RomMarker {
  muscleId: string;
  number: number;
  role: RomMuscleRole;
  name: string;
  position: THREE.Vector3;
}

interface RomMuscleMarkersProps {
  resolution: MuscleResolution;
}

/** Does a parsed mesh's side pass the current side filter? */
function sidePasses(side: 'left' | 'right' | 'center', filter: SideFilter): boolean {
  if (filter === 'both') return true;
  if (side === 'center') return true;
  return side === filter;
}

/**
 * Build a camera-facing badge sprite: a rounded plate with a colored ring and
 * the muscle's number, optionally followed by its name when focused. Cheap,
 * dependency-free (no drei Html), always readable (depthTest:false).
 */
function makeBadgeSprite(
  numberText: string,
  name: string | null,
  hex: number,
  focused: boolean,
): THREE.Sprite {
  const fontSize = 46;
  const padX = 18;
  const padY = 12;
  const gap = 12;
  const ringR = fontSize * 0.62; // radius of the number disc

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Measure name (if shown).
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  const nameText = focused && name ? name : '';
  const nameW = nameText ? Math.ceil(ctx.measureText(nameText).width) : 0;

  const discD = ringR * 2;
  const w = padX + discD + (nameText ? gap + nameW + padX : padX);
  const h = Math.max(discD, fontSize) + padY * 2;
  canvas.width = w;
  canvas.height = h;

  const c = new THREE.Color(hex);
  const rgb = `${(c.r * 255) | 0}, ${(c.g * 255) | 0}, ${(c.b * 255) | 0}`;

  // Background plate (only when name is shown; bare number stays minimal).
  if (nameText) {
    ctx.fillStyle = 'rgba(10, 15, 26, 0.86)';
    const r = 16;
    const pw = w;
    const ph = h;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(pw, 0, pw, ph, r);
    ctx.arcTo(pw, ph, 0, ph, r);
    ctx.arcTo(0, ph, 0, 0, r);
    ctx.arcTo(0, 0, pw, 0, r);
    ctx.closePath();
    ctx.fill();
  }

  // Number disc: filled circle in the role color, with a dark glyph for
  // contrast. Centered vertically; left-anchored horizontally.
  const cx = padX + ringR;
  const cy = h / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${rgb})`;
  ctx.fill();
  // Bright outer ring for separation against tissue.
  ctx.lineWidth = focused ? 5 : 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.stroke();

  // Number glyph (dark on the colored disc for legibility).
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#0a0f1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numberText, cx, cy + 2);

  // Name (focused only).
  if (nameText) {
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#eef2f6';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(nameText, cx + ringR + gap, cy + 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const worldH = focused ? BADGE_WORLD_H_FOCUS : BADGE_WORLD_H;
  sprite.scale.set((w / h) * worldH, worldH, 1);
  sprite.renderOrder = 1000; // above attachment markers (999)
  return sprite;
}

export function RomMuscleMarkers({ resolution }: RomMuscleMarkersProps) {
  const { scene } = useThree();
  const romHighlight = useAnatomyStore((s) => s.romHighlight);
  const romFocusMuscleId = useAnatomyStore((s) => s.romFocusMuscleId);
  const sideFilter = useAnatomyStore((s) => s.sideFilter);

  const groupRef = useRef<THREE.Group>(null);
  const clockRef = useRef(0);
  // Track which child sprite belongs to which muscle, for the focus pulse.
  const focusedChildRef = useRef<THREE.Sprite | null>(null);

  // muscleId -> Spanish name, once.
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const mus of shoulderMuscles) m.set(mus.id, mus.name);
    return m;
  }, []);

  // Compute the markers: one per highlighted muscle, at the centroid of its
  // visible meshes (respecting the side filter). Recomputed when the highlight,
  // the focus, or the side filter changes. (Focus changes the rendered sprite
  // content â€” number vs number+name â€” so it must rebuild.)
  const [markers, setMarkers] = useState<RomMarker[]>([]);

  useEffect(() => {
    if (!romHighlight || romHighlight.size === 0) {
      setMarkers([]);
      return;
    }
    scene.updateWorldMatrix(true, true);

    const numbering = buildRomNumbering(romHighlight.keys());

    // Accumulate centroid per muscle from its visible meshes.
    const acc = new Map<string, { sum: THREE.Vector3; count: number }>();
    const wpos = new THREE.Vector3();

    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (!m.visible) return; // only meshes actually on screen contribute
      const muscle = resolution.muscleByMeshName.get(m.name);
      if (!muscle || !romHighlight.has(muscle.id)) return;
      const parsed = parseMeshName(m.name);
      if (!sidePasses(parsed.side, sideFilter)) return;

      m.getWorldPosition(wpos);
      if (!isFinite(wpos.x)) return;

      const entry = acc.get(muscle.id);
      if (entry) {
        entry.sum.add(wpos);
        entry.count += 1;
      } else {
        acc.set(muscle.id, { sum: wpos.clone(), count: 1 });
      }
    });

    const out: RomMarker[] = [];
    for (const [muscleId, role] of romHighlight) {
      const entry = acc.get(muscleId);
      if (!entry || entry.count === 0) continue; // no visible mesh -> no pin
      const centroid = entry.sum.clone().multiplyScalar(1 / entry.count);
      out.push({
        muscleId,
        number: numbering.get(muscleId) ?? 0,
        role,
        name: nameById.get(muscleId) ?? muscleId,
        position: centroid,
      });
    }

    setMarkers(out);
  }, [romHighlight, romFocusMuscleId, sideFilter, resolution, scene, nameById]);

  // Build sprite objects whenever markers change. Tiny set (typ. 2-5), so we
  // rebuild rather than diff.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      disposeObject(child);
    }
    focusedChildRef.current = null;

    for (const mk of markers) {
      const focused = mk.muscleId === romFocusMuscleId;
      const sprite = makeBadgeSprite(
        String(mk.number),
        mk.name,
        ROLE_COLOR[mk.role],
        focused,
      );
      sprite.position.copy(mk.position);
      // Lift the badge slightly up so it sits above the muscle belly, not
      // buried in it.
      sprite.position.y += 0.03;
      group.add(sprite);
      if (focused) focusedChildRef.current = sprite;
    }

    return () => {
      if (group) {
        while (group.children.length > 0) {
          const child = group.children[0];
          group.remove(child);
          disposeObject(child);
        }
      }
    };
  }, [markers, romFocusMuscleId]);

  // Gentle pulse on the focused badge so the spotlight reads as "active".
  useFrame((_, delta) => {
    clockRef.current += delta;
    const sprite = focusedChildRef.current;
    if (!sprite) return;
    const base = (sprite.userData.baseScaleX as number) ?? sprite.scale.x;
    if (sprite.userData.baseScaleX == null) {
      sprite.userData.baseScaleX = sprite.scale.x;
      sprite.userData.baseScaleY = sprite.scale.y;
    }
    const pulse = 1 + Math.sin(clockRef.current * 4) * 0.06;
    sprite.scale.x = base * pulse;
    sprite.scale.y = (sprite.userData.baseScaleY as number) * pulse;
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