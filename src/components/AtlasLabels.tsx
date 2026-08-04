// src/components/AtlasLabels.tsx
//
// ATLAS PLATE LABELS for the Explorar viewer.
//
// A region is a tall, narrow thing in a wide canvas, so most of the viewport is
// empty background — a printed anatomy plate uses exactly that margin for the
// structure names, with a hairline leader running from each name to the thing it
// names. This does the same: it picks the region's teaching structures, projects
// one anchor point per structure to the screen, stacks the names into a left and
// a right column, and draws the leaders.
//
// TWO HALVES, ON PURPOSE.
// The anchors have to be projected with the live camera (useFrame → must be a
// child of <Canvas>), but crisp text at any zoom wants DOM. Those are two
// different React reconcilers, and they do NOT mix: `createPortal` from
// react-dom inside the R3F tree keeps reconciling with R3F, which greets a
// <button> with "Button is not part of the THREE namespace". So:
//
//   <AtlasPlate>      DOM, a sibling of the <Canvas>. Renders the names and the
//                     leader hairlines, and registers each element in the
//                     channel below.
//   <AtlasProjector>  inside the <Canvas>. Renders nothing; every frame it
//                     projects the anchors, stacks the columns and writes the
//                     transforms straight onto the elements the plate
//                     registered.
//
// Both are handed the SAME `targets` array (built once in Viewer3D), so index i
// means the same structure on both sides. React re-renders only when the SET of
// labels changes — region, layers, side filter. Nothing in the React tree
// re-renders while the camera moves, which is the rule the whole viewer is built
// on (see the perf note in AnatomyModel).
//
// The labels are also a two-way bridge: hovering one lights its structure in 3D
// (it writes the same hoveredMeshName the raycaster writes) and clicking one
// selects it, so the margin is a usable index of the region, not just decoration.
//
// The picking and stacking rules are pure functions in lib/atlasPlate.ts.

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnatomyStore } from '../store/anatomyStore';
import { stackColumn, type LabelTarget, type PlacedLabel } from '../lib/atlasPlate';

/** Vertical gap between two stacked labels, in CSS px. */
const LABEL_GAP = 26;
/**
 * The columns HUG THE MODEL rather than sitting at a fixed inset from the
 * viewport edge.
 *
 * A region is narrow and centred, so a fixed inset parked the names against the
 * window frame and left every leader crossing hundreds of pixels of empty
 * background — thin, aimless lines that read as clutter instead of as pointers.
 * Each frame the projector measures how wide the projected structures actually
 * are and sets the columns just outside that silhouette, so the leaders stay
 * short and deliberate whatever the zoom.
 *
 * MIN_INSET is the floor: enough room for the longest name at the plate's type
 * size (30ch at 11px, plus padding) so a name can never run off the edge. It is
 * itself capped as a fraction of the width, so a narrow canvas does not end up
 * all margin. MAX_FRACTION is the ceiling, so the columns cannot creep inward
 * over a zoomed-in model.
 */
const COLUMN_GUTTER = 64;
const COLUMN_MIN_INSET = 196;
const COLUMN_MIN_FRACTION = 0.26;
const COLUMN_MAX_FRACTION = 0.34;
/** Horizontal run before the leader turns and heads for its anchor. */
const ELBOW = 20;
/**
 * Where the curve's control point sits along the elbow-to-structure span. Low
 * values keep the leader flat out of the name and bend late (calm, editorial);
 * high values bend immediately and read as a swoop. 0.45 keeps the arc gentle at
 * the shallow angles most labels sit at.
 */
const CURVE_CONTROL = 0.45;
/** Room kept clear for the hover chip on top and the toolbar at the bottom. */
const PAD_TOP = 72;
const PAD_BOTTOM = 96;
/**
 * Below this canvas width there is no margin left to write in, so the plate
 * would crowd the model instead of framing it. Measured on the CANVAS, not the
 * window: on desktop the two side panels take 600 px before the viewer gets any,
 * and on a phone the panels become drawers and the canvas is full width.
 */
const MIN_WIDTH_FOR_LABELS = 600;

interface LabelRow {
  label: HTMLElement | null;
  /** The <g> that owns the leader's color, and its hover / selected state. */
  group: SVGGElement | null;
  /** The leader path: horizontal run out of the name, then a tangent curve. */
  leader: SVGPathElement | null;
  /** The stroke gradient, re-aimed each frame so the fade follows the path. */
  grad: SVGLinearGradientElement | null;
  /** Ring + core at the structure end, moved as one. */
  pin: SVGGElement | null;
}

/**
 * The DOM elements the projector writes to, keyed by target index. Module-level
 * and mutable by design: this is the seam between the two reconcilers, and it
 * must never cause a render (same pattern as the movement lab's channels).
 */
const rows: LabelRow[] = [];

function rowAt(i: number): LabelRow {
  rows[i] ??= { label: null, group: null, leader: null, grad: null, pin: null };
  return rows[i];
}

function hideRow(row: LabelRow | undefined): void {
  if (!row) return;
  // `visibility` and not just opacity: an invisible button that still answers
  // the pointer would swallow clicks meant for the model behind it.
  if (row.label) row.label.style.visibility = 'hidden';
  if (row.group) row.group.style.visibility = 'hidden';
}

/* ------------------------------------------------------------------ */
/*  Inside the Canvas: projection + layout, no DOM of its own          */
/* ------------------------------------------------------------------ */

export function AtlasProjector({ targets }: { targets: LabelTarget[] }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  // Scratch, reused every frame so the loop never allocates.
  const ndc = useRef(new THREE.Vector3()).current;
  const placed = useRef<PlacedLabel[]>([]).current;
  const leftCol = useRef<PlacedLabel[]>([]).current;
  const rightCol = useRef<PlacedLabel[]>([]).current;

  useFrame(() => {
    if (targets.length === 0) return;
    if (size.width < MIN_WIDTH_FOR_LABELS) {
      for (let i = 0; i < targets.length; i++) hideRow(rows[i]);
      return;
    }
    placed.length = 0;
    let minAx = Infinity;
    let maxAx = -Infinity;

    // 1. Project each target and keep the anchor that sits FURTHEST out, so a
    //    paired structure is labelled on the side the leader has room to reach.
    for (let i = 0; i < targets.length; i++) {
      let sx = 0;
      let sy = 0;
      let outermost = -Infinity;
      for (const anchor of targets[i].anchors) {
        ndc.copy(anchor).project(camera);
        if (ndc.z > 1) continue; // behind the camera
        if (Math.abs(ndc.x) <= outermost) continue;
        outermost = Math.abs(ndc.x);
        sx = (ndc.x * 0.5 + 0.5) * size.width;
        sy = (-ndc.y * 0.5 + 0.5) * size.height;
      }
      const offScreen =
        sy < -40 || sy > size.height + 40 || sx < -80 || sx > size.width + 80;
      if (outermost === -Infinity || offScreen) {
        hideRow(rows[i]);
        continue;
      }
      const pin = targets[i].pin;
      placed.push({
        i,
        ax: sx,
        ay: sy,
        y: sy,
        left: pin ? pin === 'left' : sx < size.width / 2,
      });
      if (sx < minAx) minAx = sx;
      if (sx > maxAx) maxAx = sx;
    }
    if (placed.length === 0) return;

    // 1b. Park each column just outside the silhouette we just measured, so the
    //     leaders stay short instead of reaching across empty background.
    const maxInset = size.width * COLUMN_MAX_FRACTION;
    const minInset = Math.min(COLUMN_MIN_INSET, size.width * COLUMN_MIN_FRACTION);
    const leftInset = Math.min(Math.max(minAx - COLUMN_GUTTER, minInset), maxInset);
    const rightInset = Math.min(
      Math.max(size.width - maxAx - COLUMN_GUTTER, minInset),
      maxInset,
    );

    // 2. Stack each margin so no two names overlap.
    leftCol.length = 0;
    rightCol.length = 0;
    for (const p of placed) (p.left ? leftCol : rightCol).push(p);
    stackColumn(leftCol, size.height, LABEL_GAP, PAD_TOP, PAD_BOTTOM);
    stackColumn(rightCol, size.height, LABEL_GAP, PAD_TOP, PAD_BOTTOM);

    // 3. Write the geometry. No React involved.
    for (const p of placed) {
      const row = rows[p.i];
      if (!row) continue;
      const tipX = p.left ? leftInset : size.width - rightInset;
      const elbowX = p.left ? tipX + ELBOW : tipX - ELBOW;
      if (row.label) {
        row.label.style.visibility = 'visible';
        row.label.style.transform =
          `translate3d(${tipX}px, ${p.y}px, 0) translate(${p.left ? '-100%' : '0'}, -50%)`;
      }
      if (row.group) row.group.style.visibility = 'visible';
      if (row.leader) {
        // Straight out of the name at its own height, then ONE curve into the
        // structure. The control point sits on the run's line, so the curve
        // leaves the elbow tangent to it and the path has no corner anywhere.
        const cx = elbowX + (p.ax - elbowX) * CURVE_CONTROL;
        row.leader.setAttribute(
          'd',
          `M${tipX},${p.y}L${elbowX},${p.y}Q${cx},${p.y} ${p.ax},${p.ay}`,
        );
      }
      if (row.grad) {
        // Aim the fade along the leader: full weight at the name, gone at the
        // structure. userSpaceOnUse because a polyline's bounding box can be
        // zero-height, which makes an objectBoundingBox gradient degenerate.
        row.grad.setAttribute('x1', String(tipX));
        row.grad.setAttribute('y1', String(p.y));
        row.grad.setAttribute('x2', String(p.ax));
        row.grad.setAttribute('y2', String(p.ay));
      }
      if (row.pin) row.pin.setAttribute('transform', `translate(${p.ax},${p.ay})`);
    }
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  Outside the Canvas: the names themselves                           */
/* ------------------------------------------------------------------ */

export function AtlasPlate({ targets }: { targets: LabelTarget[] }) {
  const setHovered = useAnatomyStore((s) => s.setHovered);
  const selectMesh = useAnatomyStore((s) => s.selectMesh);
  const selectMuscle = useAnatomyStore((s) => s.selectMuscle);
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);

  // Drop registrations for labels that no longer exist, so a stale element from
  // the previous region can never be written to.
  rows.length = targets.length;

  if (targets.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {/* Leaders first, so a name always sits on top of its own hairline. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {targets.map((t, i) => (
          <g
            key={t.key}
            ref={(el) => {
              rowAt(i).group = el;
            }}
            className={[
              'atlas-leader',
              t.muscleId && t.muscleId === selectedMuscleId ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ visibility: 'hidden' }}
          >
            {/* The gradient lives INSIDE the group on purpose: that is what lets
                its stops resolve `currentColor` against the group's color, so
                hover and selection are one CSS property on one element. Parked
                in a shared <defs> it would resolve against the <defs>. */}
            <linearGradient
              id={`atlas-leader-${i}`}
              gradientUnits="userSpaceOnUse"
              ref={(el) => {
                rowAt(i).grad = el;
              }}
            >
              <stop offset="0" stopColor="currentColor" stopOpacity="0.7" />
              <stop offset="0.45" stopColor="currentColor" stopOpacity="0.34" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
            <path
              ref={(el) => {
                rowAt(i).leader = el;
              }}
              d=""
              stroke={`url(#atlas-leader-${i})`}
            />
            <g
              ref={(el) => {
                rowAt(i).pin = el;
              }}
            >
              <circle className="atlas-leader-ring" r="4" />
              <circle className="atlas-leader-core" r="1.4" />
            </g>
          </g>
        ))}
      </svg>

      {targets.map((t, i) => (
        <button
          key={t.key}
          type="button"
          ref={(el) => {
            rowAt(i).label = el;
          }}
          style={{ visibility: 'hidden' }}
          className={[
            'atlas-label',
            t.kind === 'bone' ? 'atlas-label-bone' : '',
            t.muscleId && t.muscleId === selectedMuscleId ? 'atlas-label-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onPointerEnter={() => {
            // Light the leader straight on the element. Routing this through the
            // store would re-render every name on every pointer sweep across the
            // model, which is exactly what the plate is built to avoid.
            rows[i]?.group?.classList.add('is-hot');
            setHovered(t.meshNames[0] ?? null);
          }}
          onPointerLeave={() => {
            rows[i]?.group?.classList.remove('is-hot');
            setHovered(null);
          }}
          onClick={() => {
            selectMesh(t.meshNames[0] ?? null);
            selectMuscle(t.muscleId ?? null);
          }}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
