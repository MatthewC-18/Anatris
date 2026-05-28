// src/components/AbductionSchematic.tsx
//
// Schematic 2D biomechanics diagram for shoulder abduction. This is the
// honest, robust alternative to rotating the rigid Z-Anatomy meshes (which
// cannot deform, so a muscle crossing the joint always looked broken).
//
// WHY A SCHEMATIC INSTEAD OF MOVING THE 3D MODEL
//   - The GLB has no skinning. A rigid muscle mesh cannot keep one end on the
//     scapula and the other on the humerus, so the realistic model breaks under
//     motion. A schematic represents each muscle as a LINE between two points,
//     which CAN shorten/lengthen honestly as the joint moves -- exactly the
//     thing a physio needs to see.
//   - It does not touch the heavy model, mesh names, or measured pivots, so it
//     is robust and cheap.
//
// WHAT IT TEACHES (the clinically important content)
//   1) Scapulohumeral rhythm: total elevation = glenohumeral + scapulothoracic.
//      A "setting phase" (~0-30 deg) is mostly glenohumeral; beyond it the
//      scapula contributes about a third (classic ~2:1 GH:ST rhythm). The
//      scapula visibly upward-rotates as the arm rises.
//   2) Lines of action: middle deltoid (prime mover past ~15 deg) and
//      supraspinatus (initiator, 0-15 deg, and head centerer). Their drawn
//      length changes with the angle, illustrating contraction.
//   3) The glenohumeral rotation axis and joint center.
//
// CONVENTIONS
//   - Front view of the RIGHT shoulder. The right arm is drawn on the SCREEN
//     LEFT (mirror/front-view convention), abducting up and out to the left.
//   - Role colors mirror the rest of the app: deltoid prime-mover amber
//     (#ffa51e), supraspinatus assistant/initiator sky (#38bdf8), GH axis
//     violet (#a78bfa). Bone is a warm off-white. This keeps the schematic and
//     the 3D scene speaking the same visual language.
//   - ASCII-only source. UI strings Spanish LATAM. No `any`. English comments.

import { useMemo, useState } from 'react';

// ---- Role / tissue colors (match AnatomyModel + RomPanel). ----
const COLOR_DELTOID = '#ffa51e'; // amber, prime mover
const COLOR_SUPRA = '#38bdf8'; // sky, initiator/assistant
const COLOR_AXIS = '#a78bfa'; // violet, GH axis
const COLOR_BONE = '#e8e2d0';
const COLOR_BONE_DARK = '#d8d0ba';
const COLOR_THORAX_FILL = '#161d2e';
const COLOR_THORAX_STROKE = '#243049';
const COLOR_LABEL = '#94a3b8';
const COLOR_TITLE = '#e2e8f0';

// ---- Geometry (SVG user units, y-down). ----
const VIEW_W = 520;
const VIEW_H = 460;
const GH_REST = { x: 300, y: 170 }; // glenohumeral center at rest
const SCAP_PIVOT = { x: 255, y: 235 }; // scapula rotates about ~its center
const THORAX = { x: 225, y: 250, rx: 120, ry: 150 };
const HUMERUS_LEN = 170;
const FOREARM_LEN = 130;

// Setting phase: below this, abduction is essentially all glenohumeral.
const SETTING_PHASE_DEG = 30;
// Beyond the setting phase, the scapula takes ~1/3 of the additional motion
// (the classic 2:1 glenohumeral:scapulothoracic rhythm).
const SCAP_SHARE = 1 / 3;

interface RhythmSplit {
  gh: number; // glenohumeral contribution (humerus relative to scapula), deg
  scap: number; // scapulothoracic contribution (scapular upward rotation), deg
}

function splitRhythm(totalDeg: number): RhythmSplit {
  if (totalDeg <= SETTING_PHASE_DEG) return { gh: totalDeg, scap: 0 };
  const beyond = totalDeg - SETTING_PHASE_DEG;
  const scap = beyond * SCAP_SHARE;
  return { gh: totalDeg - scap, scap };
}

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

interface Pt {
  x: number;
  y: number;
}

// Rotate point p about center c by r radians (SVG y-down coords).
function rotate(p: Pt, c: Pt, r: number): Pt {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return {
    x: c.x + dx * Math.cos(r) - dy * Math.sin(r),
    y: c.y + dx * Math.sin(r) + dy * Math.cos(r),
  };
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function AbductionSchematic(): JSX.Element {
  const [angle, setAngle] = useState<number>(30);

  const geom = useMemo(() => {
    const { gh, scap } = splitRhythm(angle);

    // Scapula rotates about its pivot. For a screen-left arm, upward rotation
    // is counter-clockwise on screen, i.e. negative angle in y-down coords.
    const scapRad = -deg2rad(scap);

    // Scapula triangle (front view, right scapula on screen-left).
    const scapBase: Pt[] = [
      { x: 300, y: 150 },
      { x: 230, y: 200 },
      { x: 255, y: 290 },
    ];
    const scap3 = scapBase.map((p) => rotate(p, SCAP_PIVOT, scapRad));

    // GH center travels with the scapula.
    const ghNow = rotate(GH_REST, SCAP_PIVOT, scapRad);

    // Clavicle: sternoclavicular joint (fixed) to acromial end (moves a little
    // with the scapula). Keep medial end fixed for context.
    const claviculeMedial: Pt = { x: 362, y: 138 };
    const claviculeLateral = rotate({ x: 305, y: 150 }, SCAP_PIVOT, scapRad);

    // Humerus hangs straight down at rest; abduction swings the distal end out
    // to screen-left and up, by `gh` degrees relative to the (rotated) scapula.
    const humAngle = deg2rad(90 + gh); // 90 = straight down; +gh swings up-left
    const cos = Math.cos(humAngle);
    const sin = Math.sin(humAngle);
    const elbow: Pt = { x: ghNow.x - cos * HUMERUS_LEN, y: ghNow.y + sin * HUMERUS_LEN };
    const wrist: Pt = {
      x: elbow.x - cos * FOREARM_LEN,
      y: elbow.y + sin * FOREARM_LEN,
    };

    // Muscle attachment points.
    const acromion = rotate({ x: 305, y: 145 }, SCAP_PIVOT, scapRad);
    const deltoidTuberosity: Pt = {
      x: ghNow.x - cos * HUMERUS_LEN * 0.45,
      y: ghNow.y + sin * HUMERUS_LEN * 0.45,
    };
    const supraOrigin = rotate({ x: 262, y: 168 }, SCAP_PIVOT, scapRad);
    const greaterTubercle: Pt = { x: ghNow.x - cos * 22, y: ghNow.y + sin * 22 };

    return {
      gh,
      scap,
      scap3,
      ghNow,
      claviculeMedial,
      claviculeLateral,
      elbow,
      wrist,
      acromion,
      deltoidTuberosity,
      supraOrigin,
      greaterTubercle,
      deltoidLen: dist(acromion, deltoidTuberosity),
      supraLen: dist(supraOrigin, greaterTubercle),
    };
  }, [angle]);

  const scapPath = `M${geom.scap3[0].x},${geom.scap3[0].y} L${geom.scap3[1].x},${geom.scap3[1].y} L${geom.scap3[2].x},${geom.scap3[2].y} Z`;

  return (
    <div className="flex w-full flex-col gap-4">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full rounded-xl"
        style={{ background: '#0d1320' }}
        role="img"
        aria-label="Esquema de abduccion de hombro derecho, vista frontal"
      >
        <text x={20} y={30} fill={COLOR_TITLE} fontSize={14} fontFamily="ui-sans-serif, system-ui">
          Abduccion de hombro {String.fromCharCode(0x2014)} vista frontal (lado derecho)
        </text>

        {/* Thorax context */}
        <ellipse
          cx={THORAX.x}
          cy={THORAX.y}
          rx={THORAX.rx}
          ry={THORAX.ry}
          fill={COLOR_THORAX_FILL}
          stroke={COLOR_THORAX_STROKE}
          strokeWidth={1.5}
        />
        <text x={THORAX.x - 18} y={THORAX.y + THORAX.ry - 12} fill="#475569" fontSize={12}>
          Torax
        </text>

        {/* Scapula (upward-rotating) */}
        <path d={scapPath} fill="none" stroke={COLOR_BONE} strokeWidth={1.8} />

        {/* Clavicle */}
        <line
          x1={geom.claviculeMedial.x}
          y1={geom.claviculeMedial.y}
          x2={geom.claviculeLateral.x}
          y2={geom.claviculeLateral.y}
          stroke={COLOR_BONE}
          strokeWidth={6}
          strokeLinecap="round"
        />

        {/* Humerus + forearm */}
        <line
          x1={geom.ghNow.x}
          y1={geom.ghNow.y}
          x2={geom.elbow.x}
          y2={geom.elbow.y}
          stroke={COLOR_BONE}
          strokeWidth={9}
          strokeLinecap="round"
        />
        <line
          x1={geom.elbow.x}
          y1={geom.elbow.y}
          x2={geom.wrist.x}
          y2={geom.wrist.y}
          stroke={COLOR_BONE}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <circle cx={geom.elbow.x} cy={geom.elbow.y} r={5} fill={COLOR_BONE_DARK} />
        <circle cx={geom.ghNow.x} cy={geom.ghNow.y} r={7} fill={COLOR_BONE_DARK} />

        {/* Muscle lines of action (these SHORTEN as the muscle contracts) */}
        <line
          x1={geom.acromion.x}
          y1={geom.acromion.y}
          x2={geom.deltoidTuberosity.x}
          y2={geom.deltoidTuberosity.y}
          stroke={COLOR_DELTOID}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <line
          x1={geom.supraOrigin.x}
          y1={geom.supraOrigin.y}
          x2={geom.greaterTubercle.x}
          y2={geom.greaterTubercle.y}
          stroke={COLOR_SUPRA}
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        {/* GH rotation axis + center */}
        <line
          x1={geom.ghNow.x - 22}
          y1={geom.ghNow.y}
          x2={geom.ghNow.x + 22}
          y2={geom.ghNow.y}
          stroke={COLOR_AXIS}
          strokeWidth={2}
        />
        <circle cx={geom.ghNow.x} cy={geom.ghNow.y} r={4} fill={COLOR_AXIS} />

        {/* Split readout on the diagram */}
        <text x={20} y={VIEW_H - 18} fill={COLOR_LABEL} fontSize={12}>
          Glenohumeral {geom.gh.toFixed(0)}
          {String.fromCharCode(0x00b0)} + Escapulotoracica {geom.scap.toFixed(0)}
          {String.fromCharCode(0x00b0)}
        </text>
      </svg>

      {/* Control */}
      <div>
        <label className="mb-1 block text-sm text-slate-200">
          Abduccion: <strong>{angle}</strong>
          {String.fromCharCode(0x00b0)}
        </label>
        <input
          type="range"
          min={0}
          max={150}
          step={1}
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-3.5 rounded" style={{ background: COLOR_DELTOID }} />
          Deltoides medio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-3.5 rounded" style={{ background: COLOR_SUPRA }} />
          Supraespinoso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-3.5 rounded" style={{ background: COLOR_AXIS }} />
          Eje glenohumeral
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-3.5 rounded" style={{ background: COLOR_BONE }} />
          Hueso
        </span>
      </div>

      {/* Clinical readout */}
      <div className="text-sm leading-relaxed text-slate-400">
        <p className="mb-1">
          <span style={{ color: COLOR_SUPRA }}>Supraespinoso</span>: inicia la abduccion
          (0{String.fromCharCode(0x2013)}15{String.fromCharCode(0x00b0)}) y centra la cabeza humeral
          en la glenoides.
        </p>
        <p className="mb-1">
          <span style={{ color: COLOR_DELTOID }}>Deltoides medio</span>: motor principal a partir de
          ~15{String.fromCharCode(0x00b0)}.
        </p>
        <p>
          Reparto del movimiento: la fase de ajuste (0{String.fromCharCode(0x2013)}
          {SETTING_PHASE_DEG}
          {String.fromCharCode(0x00b0)}) es casi puramente glenohumeral; mas alla, la escapula
          rota hacia arriba aportando ~1/3 del movimiento (ritmo escapulohumeral ~2:1).
        </p>
      </div>
    </div>
  );
}
