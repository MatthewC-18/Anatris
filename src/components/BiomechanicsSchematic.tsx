// src/components/BiomechanicsSchematic.tsx
//
// Schematic biomechanics engine. Renders an anatomically-readable (not
// photorealistic) diagram of a shoulder gesture: bones as filled silhouettes,
// muscles as BANDS whose width and color intensity track their activation, and
// annotations pointing at landmarks. Driven entirely by data/biomechanics/
// gestures.ts, so adding a gesture is a data edit, not a redraw.
//
// WHY THIS REPLACES MOVING THE 3D MODEL
//   The GLB has no skinning; rigid muscle meshes cannot deform, so any muscle
//   crossing the joint looks broken under motion. A schematic represents each
//   muscle as a shape between two points, which CAN shorten and thicken as it
//   contracts -- the honest, robust way to teach the mechanics.
//
// FEATURES
//   - Gesture selector (abduction / flexion / rotations) from the data file.
//   - Anterior / posterior view toggle (each gesture has a sensible default).
//   - Scapulohumeral rhythm: total = glenohumeral + scapular, with a setting
//     phase, per the gesture's rhythm data. The scapula visibly upward-rotates.
//   - Muscle bands: a tapered quad from origin landmark to humeral insertion.
//     Opacity and fill intensity follow the muscle's activation at the current
//     angle, so you SEE which muscle is working when.
//   - Landmark annotations with leader lines.
//   - A 'draft' badge for gestures whose geometry still needs tuning, so the
//     UI is honest about maturity.
//
// CONVENTIONS
//   - Front/anterior view of the RIGHT shoulder, drawn on the SCREEN LEFT
//     (mirror convention) so abduction rises up-and-left.
//   - Role colors mirror the app: prime-mover amber (#ffa51e), assistant sky
//     (#38bdf8), stabilizer violet (#a78bfa). Bone warm off-white.
//   - ASCII-only source. UI strings Spanish LATAM. No `any`. English comments.

import { useMemo, useState } from 'react';
import {
  gestures,
  gestureById,
  activationAt,
  type Gesture,
  type GestureMuscle,
  type LandmarkRef,
  type SchematicView,
} from '../data/biomechanics/gestures';
import { ROLE_TONE_CSS } from '../lib/romRolePalette';

const VIEW_W = 520;
const VIEW_H = 480;

// Los tonos del papel salen de la paleta compartida (romRolePalette), que es la
// que pinta el laboratorio: aqui estaban copiados a mano.
const ROLE_COLOR = ROLE_TONE_CSS;
const COLOR_BONE = '#e8e2d0';
const COLOR_BONE_EDGE = '#b8ae93';
const COLOR_BONE_DARK = '#d2c9b0';
// Grafito, no azul marino: el torax era #141b2a sobre un fondo #0d1320, el
// mismo marino que la paleta del sistema retiro (ver `slate` en
// tailwind.config.js) porque altera como se perciben los tonos del tejido.
const COLOR_THORAX_FILL = '#1b1e22';
const COLOR_THORAX_STROKE = '#2c3037';
const COLOR_LABEL = '#979ba3';
const COLOR_TITLE = '#f1f2f4';

const DEG = String.fromCharCode(0x00b0);

interface Pt {
  x: number;
  y: number;
}

// Glenohumeral center at rest and scapular pivot, per view. Anterior and
// posterior are mirror-ish but we keep separate constants so each can be tuned.
const LAYOUT: Record<
  SchematicView,
  { gh: Pt; scapPivot: Pt; thorax: { x: number; y: number; rx: number; ry: number } }
> = {
  anterior: {
    gh: { x: 305, y: 175 },
    scapPivot: { x: 258, y: 238 },
    thorax: { x: 228, y: 255, rx: 124, ry: 150 },
  },
  posterior: {
    gh: { x: 305, y: 175 },
    scapPivot: { x: 262, y: 238 },
    thorax: { x: 228, y: 255, rx: 124, ry: 150 },
  },
};

const HUMERUS_LEN = 172;
const FOREARM_LEN = 128;

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}
function rotate(p: Pt, c: Pt, r: number): Pt {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return {
    x: c.x + dx * Math.cos(r) - dy * Math.sin(r),
    y: c.y + dx * Math.sin(r) + dy * Math.cos(r),
  };
}

interface RhythmSplit {
  gh: number;
  scap: number;
}
function splitRhythm(g: Gesture, total: number): RhythmSplit {
  const { settingPhaseDeg, scapularShare } = g.rhythm;
  if (total <= settingPhaseDeg || scapularShare === 0) return { gh: total, scap: 0 };
  const beyond = total - settingPhaseDeg;
  const scap = beyond * scapularShare;
  return { gh: total - scap, scap };
}

// Landmark positions in the scapula's LOCAL (pre-rotation) frame, per view.
// These are hand-placed on the scapula silhouette so muscle origins sit in
// anatomically sensible spots. The engine rotates them with the scapula.
function landmarkLocal(ref: LandmarkRef, view: SchematicView): Pt {
  // Anterior coordinates; posterior overrides a few that differ.
  const anterior: Record<LandmarkRef, Pt> = {
    acromion: { x: 308, y: 150 },
    'clavicle-lateral': { x: 320, y: 150 },
    coracoid: { x: 295, y: 168 },
    'supraspinous-fossa': { x: 268, y: 165 },
    'infraspinous-fossa': { x: 262, y: 200 },
    'subscapular-fossa': { x: 270, y: 205 },
    'inferior-angle': { x: 255, y: 288 },
    'lateral-border': { x: 285, y: 250 },
  };
  if (view === 'posterior') {
    const posterior: Partial<Record<LandmarkRef, Pt>> = {
      'supraspinous-fossa': { x: 270, y: 162 },
      'infraspinous-fossa': { x: 268, y: 205 },
      acromion: { x: 312, y: 152 },
    };
    return posterior[ref] ?? anterior[ref];
  }
  return anterior[ref];
}

// Build a tapered muscle band (4-point polygon) from origin to insertion.
// Width scales with activation so an active muscle visibly thickens.
function muscleBand(origin: Pt, insertion: Pt, activation: number): string {
  const dx = insertion.x - origin.x;
  const dy = insertion.y - origin.y;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular unit vector.
  const nx = -dy / len;
  const ny = dx / len;
  const halfWidthOrigin = 6 + activation * 8;
  const halfWidthInsert = 3 + activation * 4;
  const o1 = { x: origin.x + nx * halfWidthOrigin, y: origin.y + ny * halfWidthOrigin };
  const o2 = { x: origin.x - nx * halfWidthOrigin, y: origin.y - ny * halfWidthOrigin };
  const i1 = { x: insertion.x + nx * halfWidthInsert, y: insertion.y + ny * halfWidthInsert };
  const i2 = { x: insertion.x - nx * halfWidthInsert, y: insertion.y - ny * halfWidthInsert };
  return `M${o1.x},${o1.y} L${i1.x},${i1.y} L${i2.x},${i2.y} L${o2.x},${o2.y} Z`;
}

export function BiomechanicsSchematic(): JSX.Element {
  const [gestureId, setGestureId] = useState<string>(gestures[0].id);
  const gesture = gestureById.get(gestureId) ?? gestures[0];
  const [view, setView] = useState<SchematicView>(gesture.defaultView);
  const [angle, setAngle] = useState<number>(Math.round(gesture.rangeDeg * 0.25));

  // When the gesture changes, reset the view + angle to sensible defaults.
  const onGestureChange = (id: string): void => {
    const g = gestureById.get(id);
    setGestureId(id);
    if (g) {
      setView(g.defaultView);
      setAngle(Math.round(g.rangeDeg * 0.25));
    }
  };

  const layout = LAYOUT[view];

  const geom = useMemo(() => {
    const { gh, scap } = splitRhythm(gesture, angle);
    const scapRad = -deg2rad(scap); // upward rotation = CCW on screen
    const ghNow = rotate(layout.gh, layout.scapPivot, scapRad);

    // Scapula silhouette (triangle-ish) - local points, then rotated.
    const scapLocal: Pt[] =
      view === 'posterior'
        ? [
            { x: 312, y: 150 },
            { x: 228, y: 198 },
            { x: 255, y: 295 },
            { x: 300, y: 235 },
          ]
        : [
            { x: 308, y: 150 },
            { x: 232, y: 200 },
            { x: 255, y: 292 },
            { x: 298, y: 232 },
          ];
    const scapPts = scapLocal.map((p) => rotate(p, layout.scapPivot, scapRad));

    // Scapular spine (posterior view only) - a ridge line across the scapula.
    const spineA = rotate({ x: 300, y: 168 }, layout.scapPivot, scapRad);
    const spineB = rotate({ x: 235, y: 192 }, layout.scapPivot, scapRad);

    // Clavicle.
    const clavMedial: Pt = { x: 366, y: 140 };
    const clavLateral = rotate({ x: 312, y: 150 }, layout.scapPivot, scapRad);

    // Humerus. For frontal-plane (abduction) the arm rises in-plane. For
    // sagittal/transverse gestures we still rotate in-plane as a readable
    // approximation (Phase B will refine per-plane geometry).
    const humAngle = deg2rad(90 + gh);
    const cos = Math.cos(humAngle);
    const sin = Math.sin(humAngle);
    const elbow: Pt = { x: ghNow.x - cos * HUMERUS_LEN, y: ghNow.y + sin * HUMERUS_LEN };
    const wrist: Pt = { x: elbow.x - cos * FOREARM_LEN, y: elbow.y + sin * FOREARM_LEN };

    const pointAlongHumerus = (frac: number): Pt => ({
      x: ghNow.x - cos * HUMERUS_LEN * frac,
      y: ghNow.y + sin * HUMERUS_LEN * frac,
    });

    // Per-muscle drawn geometry + activation at current angle.
    const t = gesture.rangeDeg === 0 ? 0 : angle / gesture.rangeDeg;
    const muscles = gesture.muscles.map((m: GestureMuscle) => {
      const originLocal = landmarkLocal(m.originRef, view);
      const origin = rotate(originLocal, layout.scapPivot, scapRad);
      const insertion = pointAlongHumerus(m.insertionAlongHumerus);
      const act = activationAt(m.activation, t);
      return {
        id: m.id,
        label: m.label,
        role: m.role,
        origin,
        insertion,
        activation: act,
        band: muscleBand(origin, insertion, act),
      };
    });

    return {
      gh,
      scap,
      ghNow,
      scapPts,
      spineA,
      spineB,
      clavMedial,
      clavLateral,
      elbow,
      wrist,
      muscles,
    };
  }, [gesture, angle, view, layout]);

  const scapPath = `M${geom.scapPts.map((p) => `${p.x},${p.y}`).join(' L')} Z`;

  return (
    <div className="flex w-full flex-col gap-3">
      {/* EL GESTO, A LA VISTA. Era un desplegable con caja: cuatro gestos caben
          en una lista de opciones y asi se ve cuales hay sin abrir nada. */}
      <div role="radiogroup" aria-label="Gesto" className="flex flex-col">
        {gestures.map((g) => (
          <button
            key={g.id}
            type="button"
            role="radio"
            aria-checked={g.id === gestureId}
            onClick={() => onGestureChange(g.id)}
            className="opt"
          >
            {g.name}
            {g.status === 'draft' && <span className="tag ml-auto">Borrador</span>}
          </button>
        ))}
      </div>

      {/* La vista: dos pestanas, no un control segmentado con caja. */}
      <div role="tablist" aria-label="Vista del esquema" className="tabs">
        {(['anterior', 'posterior'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className="tab"
          >
            {v === 'anterior' ? 'Frontal' : 'Posterior'}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full bg-card"
        role="img"
        aria-label={`Esquema de ${gesture.name} de hombro derecho`}
      >
        <text x={20} y={28} fill={COLOR_TITLE} fontSize={14} fontFamily="ui-sans-serif, system-ui">
          {gesture.name} de hombro · vista {view === 'anterior' ? 'frontal' : 'posterior'} (lado derecho)
        </text>
        {gesture.status === 'draft' && (
          <text x={20} y={46} fill="#f59e0b" fontSize={11}>
            Geometría en borrador: pendiente de afinar
          </text>
        )}

        {/* Thorax */}
        <ellipse
          cx={layout.thorax.x}
          cy={layout.thorax.y}
          rx={layout.thorax.rx}
          ry={layout.thorax.ry}
          fill={COLOR_THORAX_FILL}
          stroke={COLOR_THORAX_STROKE}
          strokeWidth={1.5}
        />

        {/* Scapula silhouette */}
        <path d={scapPath} fill={COLOR_BONE} fillOpacity={0.16} stroke={COLOR_BONE_EDGE} strokeWidth={1.6} />
        {view === 'posterior' && (
          <line
            x1={geom.spineA.x}
            y1={geom.spineA.y}
            x2={geom.spineB.x}
            y2={geom.spineB.y}
            stroke={COLOR_BONE_EDGE}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Clavicle */}
        <line
          x1={geom.clavMedial.x}
          y1={geom.clavMedial.y}
          x2={geom.clavLateral.x}
          y2={geom.clavLateral.y}
          stroke={COLOR_BONE}
          strokeWidth={7}
          strokeLinecap="round"
        />

        {/* Muscle bands (drawn under the bone outline so bone reads on top) */}
        {geom.muscles.map((m) => (
          <path
            key={m.id}
            d={m.band}
            fill={ROLE_COLOR[m.role]}
            fillOpacity={0.25 + m.activation * 0.55}
            stroke={ROLE_COLOR[m.role]}
            strokeOpacity={0.4 + m.activation * 0.5}
            strokeWidth={1}
          />
        ))}

        {/* Humerus + forearm (silhouette: thick rounded bone) */}
        <line
          x1={geom.ghNow.x}
          y1={geom.ghNow.y}
          x2={geom.elbow.x}
          y2={geom.elbow.y}
          stroke={COLOR_BONE}
          strokeWidth={11}
          strokeLinecap="round"
        />
        <line
          x1={geom.ghNow.x}
          y1={geom.ghNow.y}
          x2={geom.elbow.x}
          y2={geom.elbow.y}
          stroke={COLOR_BONE_EDGE}
          strokeWidth={11}
          strokeLinecap="round"
          fillOpacity={0}
          strokeOpacity={0.0}
        />
        <line
          x1={geom.elbow.x}
          y1={geom.elbow.y}
          x2={geom.wrist.x}
          y2={geom.wrist.y}
          stroke={COLOR_BONE}
          strokeWidth={7}
          strokeLinecap="round"
        />
        {/* Humeral head + elbow joints */}
        <circle cx={geom.ghNow.x} cy={geom.ghNow.y} r={9} fill={COLOR_BONE_DARK} stroke={COLOR_BONE_EDGE} strokeWidth={1} />
        <circle cx={geom.elbow.x} cy={geom.elbow.y} r={5.5} fill={COLOR_BONE_DARK} />

        {/* GH rotation axis marker */}
        <line
          x1={geom.ghNow.x - 24}
          y1={geom.ghNow.y}
          x2={geom.ghNow.x + 24}
          y2={geom.ghNow.y}
          stroke={ROLE_COLOR.stabilizer}
          strokeWidth={2}
          strokeDasharray="4 3"
        />

        {/* Split readout */}
        <text x={20} y={VIEW_H - 16} fill={COLOR_LABEL} fontSize={12}>
          Glenohumeral {geom.gh.toFixed(0)}
          {DEG}
          {gesture.rhythm.scapularShare > 0
            ? ` + Escapulotorácica ${geom.scap.toFixed(0)}${DEG}`
            : ''}
        </text>
      </svg>

      {/* Slider */}
      <div>
        <label className="mb-1 block text-sm text-fg2">
          {gesture.name}: <strong className="num text-fg">{angle}</strong>
          {DEG}
        </label>
        <input
          type="range"
          min={0}
          max={gesture.rangeDeg}
          step={1}
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Active-muscle legend with live activation bars */}
      <div className="flex flex-col gap-1.5">
        {geom.muscles.map((m) => (
          <div key={m.id} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: ROLE_COLOR[m.role] }}
              aria-hidden="true"
            />
            <span className="w-44 shrink-0 text-fg2">{m.label}</span>
            {/* Medidor de 2 px (.meter): el color es el del papel del musculo y
                el valor, la activacion en el angulo actual. */}
            <span
              className="meter flex-1"
              style={
                {
                  '--v': Math.round(m.activation * 100),
                  color: ROLE_COLOR[m.role],
                } as React.CSSProperties
              }
            />
          </div>
        ))}
      </div>

      {/* Clinical note */}
      <p className="text-sm leading-relaxed text-fg2">{gesture.note}</p>
      <p className="note">
        Las barras muestran la activación relativa de cada músculo en el ángulo
        actual. El grosor de cada banda en el esquema sigue esa misma activación.
      </p>
    </div>
  );
}
