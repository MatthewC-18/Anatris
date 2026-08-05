// src/components/ConceptDiagrams.tsx
//
// The built-in 2D schematics of the conceptual modules (contraction types,
// lever classes, kinetic chains), extracted out of ConceptTrackView so BOTH
// surfaces can render them:
//
//   - `size="inline"`  the small figure inside the reading column (compact
//                      screens, where there is no stage beside the text);
//   - `size="stage"`   the full-size figure that fills the 3D stage on the
//                      sections that have no 3D overlay, which is what stops
//                      that half of the screen from sitting idle.
//
// The stage variant is not just the same SVG scaled up: it adds the labels and
// the worked example that do not fit at figure size. Data never embeds SVG; the
// section only names a diagram key.
//
// Palette matches the rest of the app: accent cyan = the primary cue, violet and
// amber separate the other two roles (same language as the planes overlay).

import type { ConceptDiagram } from '../types/concept';

export type DiagramSize = 'inline' | 'stage';

/** True when a section actually carries a schematic. */
export function hasDiagram(kind: ConceptDiagram | undefined): boolean {
  return kind != null && kind !== 'none';
}

export function ConceptDiagramView({
  kind,
  size = 'inline',
}: {
  kind: ConceptDiagram;
  size?: DiagramSize;
}) {
  if (kind === 'none') return null;
  const body = (
    <>
      {kind === 'contraction-types' && <ContractionDiagram size={size} />}
      {kind === 'lever-classes' && <LeverDiagram size={size} />}
      {kind === 'kinetic-chains' && <KineticChainDiagram size={size} />}
    </>
  );
  if (size === 'stage') return <figure className="w-full">{body}</figure>;
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
      {body}
    </div>
  );
}

/* ===========================================================================
 * CONTRACTION TYPES — concentric / eccentric / isometric
 * ======================================================================== */

const CONTRACTIONS = [
  {
    label: 'Concéntrica',
    note: 'El músculo se acorta y vence la carga',
    example: 'Subir la mancuerna',
    from: 100,
    to: 58,
    arrow: 'in' as const,
  },
  {
    label: 'Excéntrica',
    note: 'El músculo se alarga mientras frena la carga',
    example: 'Bajarla de forma controlada',
    from: 58,
    to: 100,
    arrow: 'out' as const,
  },
  {
    label: 'Isométrica',
    note: 'Genera tensión sin cambiar de longitud',
    example: 'Sostenerla quieta',
    from: 80,
    to: 80,
    arrow: 'none' as const,
  },
];

function ContractionDiagram({ size }: { size: DiagramSize }) {
  if (size === 'inline') {
    return (
      <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label="Tipos de contracción">
        {CONTRACTIONS.map((r, i) => {
          const y = 24 + i * 42;
          const x = 110;
          return (
            <g key={r.label}>
              <text x="0" y={y + 4} className="fill-slate-300" fontSize="11" fontWeight="600">
                {r.label}
              </text>
              <text x="0" y={y + 18} className="fill-slate-500" fontSize="9">
                {r.note}
              </text>
              <line x1={x} y1={y} x2={x + 110} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
              <rect x={x} y={y - 6} width={r.to} height="12" rx="3" fill="#22d3ee" opacity="0.35" />
              <rect x={x} y={y - 6} width={r.from} height="12" rx="3" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 460 320" className="w-full" role="img" aria-label="Tipos de contracción muscular">
      <defs>
        <marker id="cd-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill="#22d3ee" />
        </marker>
      </defs>

      <text x="0" y="16" className="fill-slate-500" fontSize="11" letterSpacing="1.6">
        LONGITUD DEL MÚSCULO BAJO TENSIÓN
      </text>

      {CONTRACTIONS.map((r, i) => {
        const y = 74 + i * 84;
        const x = 150;
        return (
          <g key={r.label}>
            <text x="0" y={y - 8} className="fill-slate-200" fontSize="14" fontWeight="600">
              {r.label}
            </text>
            <text x="0" y={y + 10} className="fill-slate-500" fontSize="11">
              {r.example}
            </text>

            {/* reference length (relaxed) */}
            <line x1={x} y1={y - 22} x2={x} y2={y + 22} stroke="#334155" strokeWidth="1" />
            <line
              x1={x}
              y1={y}
              x2={x + 260}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {/* start length (outline) and end length (filled) */}
            <rect
              x={x}
              y={y - 13}
              width={r.from * 2.4}
              height="26"
              rx="6"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              opacity="0.75"
            />
            <rect x={x} y={y - 13} width={r.to * 2.4} height="26" rx="6" fill="#22d3ee" opacity="0.28" />

            {/* direction of the length change */}
            {r.arrow !== 'none' && (
              <line
                x1={r.arrow === 'in' ? x + r.from * 2.4 - 6 : x + r.from * 2.4 + 6}
                y1={y + 30}
                x2={r.arrow === 'in' ? x + r.to * 2.4 + 8 : x + r.to * 2.4 - 8}
                y2={y + 30}
                stroke="#22d3ee"
                strokeWidth="1.6"
                markerEnd="url(#cd-arrow)"
              />
            )}
            {r.arrow === 'none' && (
              <text x={x + r.to * 2.4 + 12} y={y + 5} className="fill-slate-500" fontSize="11">
                sin cambio
              </text>
            )}

            <text x={x} y={y + 46} className="fill-slate-500" fontSize="10.5">
              {r.note}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ===========================================================================
 * LEVER CLASSES — first / second / third
 * ======================================================================== */

const LEVERS = [
  {
    label: '1.er género',
    seq: ['E', 'F', 'R'] as const,
    note: 'Fulcro en medio',
    example: 'La cabeza sobre la columna cervical',
  },
  {
    label: '2.o género',
    seq: ['F', 'R', 'E'] as const,
    note: 'Resistencia en medio · favorece la fuerza',
    example: 'Ponerse de puntillas',
  },
  {
    label: '3.er género',
    seq: ['F', 'E', 'R'] as const,
    note: 'Potencia en medio · favorece velocidad y amplitud',
    example: 'La flexión del codo. Es el más frecuente del cuerpo',
  },
];

const LEVER_COLOR: Record<string, string> = { F: '#a78bfa', E: '#22d3ee', R: '#ffa51e' };
const LEVER_NAME: Record<string, string> = { F: 'Fulcro', E: 'Potencia', R: 'Resistencia' };

function LeverDiagram({ size }: { size: DiagramSize }) {
  if (size === 'inline') {
    return (
      <div className="flex flex-col gap-3">
        <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label="Géneros de palanca">
          {LEVERS.map((lv, i) => {
            const y = 30 + i * 42;
            const xs = [120, 200, 280];
            return (
              <g key={lv.label}>
                <text x="0" y={y - 6} className="fill-slate-300" fontSize="11" fontWeight="600">
                  {lv.label}
                </text>
                <text x="0" y={y + 8} className="fill-slate-500" fontSize="9">
                  {lv.note}
                </text>
                <line x1="110" y1={y} x2="290" y2={y} stroke="#475569" strokeWidth="2" />
                {lv.seq.map((k, j) => (
                  <g key={j}>
                    <circle cx={xs[j]} cy={y} r="7" fill={LEVER_COLOR[k]} />
                    <text
                      x={xs[j]}
                      y={y + 3}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="700"
                      className="fill-ink-950"
                    >
                      {k}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
        <LeverLegend />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <svg viewBox="0 0 460 300" className="w-full" role="img" aria-label="Géneros de palanca">
        {LEVERS.map((lv, i) => {
          const y = 56 + i * 86;
          const xs = [190, 290, 390];
          return (
            <g key={lv.label}>
              <text x="0" y={y - 10} className="fill-slate-200" fontSize="14" fontWeight="600">
                {lv.label}
              </text>
              <text x="0" y={y + 8} className="fill-slate-500" fontSize="11">
                {lv.note}
              </text>
              <text x="0" y={y + 26} className="fill-slate-600" fontSize="10.5">
                {lv.example}
              </text>

              {/* the bone as the bar */}
              <line
                x1="170"
                y1={y}
                x2="410"
                y2={y}
                stroke="#475569"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {lv.seq.map((k, j) => (
                <g key={j}>
                  <circle cx={xs[j]} cy={y} r="11" fill={LEVER_COLOR[k]} />
                  <text
                    x={xs[j]}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    className="fill-ink-950"
                  >
                    {k}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <LeverLegend />
    </div>
  );
}

function LeverLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-[11.5px] text-slate-400">
      {(['F', 'E', 'R'] as const).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: LEVER_COLOR[k] }}
          />
          {k} = {LEVER_NAME[k]}
        </span>
      ))}
    </div>
  );
}

/* ===========================================================================
 * KINETIC CHAINS — open vs closed
 * ======================================================================== */

function KineticChainDiagram({ size }: { size: DiagramSize }) {
  if (size === 'inline') {
    return (
      <svg viewBox="0 0 320 140" className="w-full" role="img" aria-label="Cadenas cinéticas">
        <text x="0" y="16" className="fill-slate-300" fontSize="11" fontWeight="600">
          Cadena abierta
        </text>
        <text x="0" y="30" className="fill-slate-500" fontSize="9">
          El extremo distal se mueve libre
        </text>
        <line x1="20" y1="55" x2="80" y2="45" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
        <line x1="80" y1="45" x2="140" y2="60" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
        <circle cx="80" cy="45" r="4" fill="#a78bfa" />
        <circle cx="140" cy="60" r="5" fill="#ffa51e" />
        <text x="148" y="63" className="fill-slate-500" fontSize="9">
          libre
        </text>

        <text x="0" y="92" className="fill-slate-300" fontSize="11" fontWeight="600">
          Cadena cerrada
        </text>
        <text x="0" y="106" className="fill-slate-500" fontSize="9">
          El extremo distal está fijo
        </text>
        <line x1="20" y1="128" x2="80" y2="120" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
        <line x1="80" y1="120" x2="140" y2="132" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
        <circle cx="80" cy="120" r="4" fill="#a78bfa" />
        <line x1="120" y1="135" x2="160" y2="135" stroke="#64748b" strokeWidth="2" />
        <text x="148" y="128" className="fill-slate-500" fontSize="9">
          fijo
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 460 300" className="w-full" role="img" aria-label="Cadenas cinéticas">
      <defs>
        <marker id="kc-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill="#ffa51e" />
        </marker>
        <pattern id="kc-ground" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#64748b" strokeWidth="1.2" />
        </pattern>
      </defs>

      {/* ---- OPEN CHAIN ---- */}
      <text x="0" y="22" className="fill-slate-200" fontSize="14" fontWeight="600">
        Cadena abierta
      </text>
      <text x="0" y="42" className="fill-slate-500" fontSize="11">
        El extremo distal se mueve libre en el espacio
      </text>
      <text x="0" y="60" className="fill-slate-600" fontSize="10.5">
        Extensión de rodilla sentado · permite aislar un músculo
      </text>

      {/* thigh fixed, shin swinging */}
      <line x1="60" y1="105" x2="200" y2="105" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
      <circle cx="200" cy="105" r="8" fill="#a78bfa" />
      <line x1="200" y1="105" x2="285" y2="150" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" />
      <line x1="200" y1="105" x2="300" y2="108" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      <circle cx="285" cy="150" r="7" fill="#ffa51e" />
      <path d="M262 168 A 70 70 0 0 0 300 122" stroke="#ffa51e" strokeWidth="1.6" fill="none" markerEnd="url(#kc-arrow)" />
      <text x="312" y="112" className="fill-slate-400" fontSize="11">
        extremo libre
      </text>

      <line x1="0" y1="196" x2="460" y2="196" stroke="#1e293b" strokeWidth="1" />

      {/* ---- CLOSED CHAIN ---- */}
      <text x="0" y="222" className="fill-slate-200" fontSize="14" fontWeight="600">
        Cadena cerrada
      </text>
      <text x="0" y="242" className="fill-slate-500" fontSize="11">
        El extremo distal está fijo contra una resistencia
      </text>
      <text x="0" y="260" className="fill-slate-600" fontSize="10.5">
        Sentadilla · reparte la carga y exige co-contracción
      </text>

      {/* foot planted, body moving over it */}
      <rect x="150" y="288" width="180" height="8" fill="url(#kc-ground)" opacity="0.65" />
      <line x1="150" y1="288" x2="330" y2="288" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="250" cy="288" r="7" fill="#ffa51e" />
      <line x1="250" y1="288" x2="215" y2="240" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" />
      <circle cx="215" cy="240" r="8" fill="#a78bfa" />
      <line x1="215" y1="240" x2="285" y2="222" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" />
      <text x="298" y="226" className="fill-slate-400" fontSize="11">
        extremo fijo
      </text>
    </svg>
  );
}
