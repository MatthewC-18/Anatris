// src/components/movement/ActivationStrip.tsx
//
// LA CURVA DE UN MUSCULO A LO LARGO DE TODO EL ARCO, CON EL ANGULO ENCIMA.
//
// El margen enseñaba el reclutamiento como diez barras de este grado: cuanto
// trabaja cada musculo AHORA, sin decir cuando entra ni cuando se apaga. Esta
// tira dibuja la envolvente entera del gesto (el dato de `activations`, el mismo
// que enciende el brillo de la escena), resalta el tramo de la fase en curso y
// lleva un cursor en el angulo actual con un punto sobre la curva. Se lee sin
// leer: el deltoides sube hasta los 90° y despues cae, el serrato entra tarde.
//
// EL CURSOR CAE ENCIMA DEL PULGAR DEL DESLIZADOR. La tira va en la misma columna
// que la pista de la consola, con el mismo dominio (el arco efectivo) y la misma
// correccion del pulgar: el dibujo ocupa solo el recorrido del CENTRO del pulgar
// (de 7,5 px a ancho - 7,5 px, ver labArc.ts), asi que la fraccion del arco es
// la misma en las dos piezas. Un fallo de uno o dos pixeles se veria peor que no
// alinear nada.
//
// La geometria (los trazados) depende de la curva y del dominio, no del angulo:
// se memoiza, y por fotograma solo se mueven el cursor y el punto.

import { memo, useId, useMemo } from 'react';
import type { ActivationKnot, RomMuscleRole } from '../../types/rom';
import { levelAt } from '../../lib/romActivation';
import { ROLE_TONE_CSS } from '../../lib/romRolePalette';
import { arcFraction } from '../../lib/labArc';

/** Alto del dibujo en unidades del viewBox (el ancho son 1000). */
const VB_W = 1000;
const VB_H = 100;
/** Aire arriba para que el trazo en el nivel 1 no se corte. */
const TOP = 8;

interface ActivationStripProps {
  curve: ActivationKnot[];
  role: RomMuscleRole;
  /** El papel en el lado negativo de un arco bidireccional (la rotacion interna). */
  roleWhenNegative?: RomMuscleRole;
  /** El arco que se puede recorrer: el mismo que el deslizador. */
  min: number;
  max: number;
  /** El tramo de la fase en curso, que va resaltado. */
  windowStart: number;
  windowEnd: number;
  /** El angulo actual. */
  angle: number;
  /** La tira de la lista entera, mas baja (el alto lo pone el CSS: `.strip`). */
  small?: boolean;
}

/** Los puntos de la envolvente entre `a` y `b`: los extremos y los nudos de dentro. */
function samplePoints(curve: ActivationKnot[], a: number, b: number): [number, number][] {
  const pts: [number, number][] = [[a, levelAt(curve, a)]];
  for (const k of curve) if (k.deg > a && k.deg < b) pts.push([k.deg, levelAt(curve, k.deg)]);
  pts.push([b, levelAt(curve, b)]);
  return pts;
}

function toXY(deg: number, level: number, min: number, max: number): string {
  const x = arcFraction(deg, min, max) * VB_W;
  const y = TOP + (1 - level) * (VB_H - TOP);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

/** Trazado de la linea y del area bajo ella, entre `a` y `b`. */
function paths(curve: ActivationKnot[], a: number, b: number, min: number, max: number) {
  if (b <= a) return null;
  const pts = samplePoints(curve, a, b);
  const line = 'M' + pts.map(([d, l]) => toXY(d, l, min, max)).join('L');
  const x0 = (arcFraction(a, min, max) * VB_W).toFixed(2);
  const x1 = (arcFraction(b, min, max) * VB_W).toFixed(2);
  const area = `${line}L${x1},${VB_H}L${x0},${VB_H}Z`;
  return { line, area };
}

export const ActivationStrip = memo(function ActivationStrip({
  curve,
  role,
  roleWhenNegative,
  min,
  max,
  windowStart,
  windowEnd,
  angle,
  small = false,
}: ActivationStripProps) {
  const clipId = useId();
  const tone = ROLE_TONE_CSS[role];
  const toneNeg = ROLE_TONE_CSS[roleWhenNegative ?? role];

  // La geometria: solo cambia con la curva y el arco.
  const geo = useMemo(() => {
    const split = roleWhenNegative && min < 0 && max > 0;
    return {
      neg: split ? paths(curve, min, 0, min, max) : null,
      pos: paths(curve, split ? 0 : min, max, min, max),
      wx0: arcFraction(Math.max(windowStart, min), min, max) * VB_W,
      wx1: arcFraction(Math.min(windowEnd, max), min, max) * VB_W,
    };
  }, [curve, roleWhenNegative, min, max, windowStart, windowEnd]);

  const t = arcFraction(angle, min, max);
  const level = levelAt(curve, Math.max(min, Math.min(angle, max)));
  const callado = level <= 0.02;
  const toneNow = angle < 0 && roleWhenNegative ? toneNeg : tone;

  const tramo = (p: { line: string; area: string } | null, color: string, key: string) =>
    p && (
      <g key={key} style={{ color }}>
        {/* Todo el arco: solo el trazo, sin relleno. */}
        <path
          d={p.line}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.6}
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
        />
        {/* La fase en curso, encendida. */}
        <g clipPath={`url(#${clipId})`}>
          <path d={p.area} fill="currentColor" fillOpacity={0.16} />
          <path
            d={p.line}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </g>
    );

  return (
    <div className={`strip ${small ? 'is-small' : ''}`} aria-hidden="true">
      <div className="strip-in">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={geo.wx0} y={-10} width={Math.max(0, geo.wx1 - geo.wx0)} height={VB_H + 20} />
            </clipPath>
          </defs>
          <line
            x1={0}
            y1={VB_H}
            x2={VB_W}
            y2={VB_H}
            className="stroke-line"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {tramo(geo.neg, toneNeg, 'neg')}
          {tramo(geo.pos, tone, 'pos')}
        </svg>
        <span className="strip-cursor" style={{ left: `${t * 100}%` }} />
        <span
          className={`strip-dot ${callado ? 'strip-dot-off' : ''}`}
          style={{
            left: `${t * 100}%`,
            top: `${((TOP + (1 - level) * (VB_H - TOP)) / VB_H) * 100}%`,
            background: callado ? undefined : toneNow,
          }}
        />
      </div>
    </div>
  );
});
