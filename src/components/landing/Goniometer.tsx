// src/components/landing/Goniometer.tsx
//
// A goniometer — the protractor physiotherapists use to measure a joint's range
// of motion — drawn as the landing's signature graphic. It exists so the page
// reads as a purpose-built clinical instrument, not a generic product hero: a
// real degree scale, a swept range, a moving arm with a numeric read-out, and
// muscle-role markers placed along the arc to show that different muscles lead
// in different parts of the range (the app's core idea).
//
// Geometry is computed in JS (polar -> screen) so the arc, ticks and arms stay
// exact; the outer arc is a polyline to sidestep SVG arc-flag ambiguity.

const O = { x: 170, y: 212 }; // pivot (joint center)
const R = 134; // scale radius

function polar(deg: number, r = R) {
  const a = (deg * Math.PI) / 180;
  return { x: O.x + r * Math.cos(a), y: O.y - r * Math.sin(a) };
}

const fmt = (deg: number, r: number) => {
  const p = polar(deg, r);
  return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
};

/** Outer 0-180 measurement arc, sampled every 2 degrees. */
const ARC = Array.from({ length: 91 }, (_, i) => polar(i * 2))
  .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
  .join(' ');

const MAJOR = [0, 45, 90, 135, 180];
const TICKS = Array.from({ length: 13 }, (_, i) => i * 15);

/** Muscle-role markers along the range, in the app's color language. */
const MARKERS: { deg: number; cls: string }[] = [
  { deg: 24, cls: 'fill-role-prime' },
  { deg: 72, cls: 'fill-role-assist' },
  { deg: 118, cls: 'fill-role-prime' },
  { deg: 158, cls: 'fill-role-stabilize' },
];

const ANGLE = 116; // the "current" measured position

export function Goniometer({ className }: { className?: string }) {
  const tip = polar(ANGLE, R - 4);

  // Filled wedge of the swept range (pivot -> inner arc -> back).
  const wedge =
    `M ${O.x} ${O.y} L ${fmt(0, R - 24)} ` +
    Array.from({ length: 30 }, (_, i) => `L ${fmt((ANGLE / 29) * i, R - 24)}`).join(' ') +
    ' Z';

  return (
    <svg
      viewBox="0 0 340 250"
      className={className}
      fill="none"
      role="img"
      aria-label="Goniómetro: rango de movimiento medido y músculos activos por tramo"
    >
      <path d={wedge} className="fill-accent/10" />

      {/* horizon / reference baseline */}
      <line
        x1={O.x - R - 6}
        y1={O.y}
        x2={O.x + R + 6}
        y2={O.y}
        className="stroke-slate-700/50"
        strokeWidth="1"
      />

      {/* measurement arc */}
      <polyline points={ARC} className="stroke-slate-600" strokeWidth="1.5" strokeLinecap="round" />

      {/* degree ticks */}
      {TICKS.map((d) => {
        const major = MAJOR.includes(d);
        const a = polar(d, R);
        const b = polar(d, R - (major ? 16 : 9));
        return (
          <line
            key={d}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className={major ? 'stroke-slate-500' : 'stroke-slate-700'}
            strokeWidth={major ? 1.5 : 1}
          />
        );
      })}

      {/* major degree labels */}
      {MAJOR.map((d) => {
        const p = polar(d, R + 15);
        return (
          <text
            key={d}
            x={p.x}
            y={p.y + 3}
            textAnchor="middle"
            className="fill-slate-500 font-mono text-[9px]"
          >
            {d}°
          </text>
        );
      })}

      {/* fixed reference arm */}
      <line
        x1={O.x}
        y1={O.y}
        x2={polar(0, R - 24).x}
        y2={polar(0, R - 24).y}
        className="stroke-slate-500"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* moving arm */}
      <line
        x1={O.x}
        y1={O.y}
        x2={tip.x}
        y2={tip.y}
        className="stroke-accent"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* role markers */}
      {MARKERS.map((m) => {
        const p = polar(m.deg, R);
        return <circle key={m.deg} cx={p.x} cy={p.y} r="4" className={m.cls} />;
      })}

      {/* pivot */}
      <circle cx={O.x} cy={O.y} r="5" className="fill-ink-700 stroke-accent" strokeWidth="2" />

      {/* read-out */}
      <text
        x={tip.x + 8}
        y={tip.y - 6}
        className="fill-accent font-mono text-[13px] font-semibold"
      >
        {ANGLE}°
      </text>
    </svg>
  );
}
