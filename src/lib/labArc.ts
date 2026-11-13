// src/lib/labArc.ts
//
// LA GEOMETRIA DEL ARCO QUE COMPARTEN LA CONSOLA Y EL MARGEN.
//
// En el margen rediseñado la pista del deslizador y las tiras de activacion de
// los musculos van en la MISMA columna, una debajo de otra, y el cursor del
// angulo de cada tira tiene que caer encima del pulgar del deslizador. Un fallo
// de uno o dos pixeles se ve peor que no alinear nada, asi que las dos piezas
// sacan sus posiciones de aqui, con la misma correccion del pulgar.

/** Lo que el arco permite de verdad con el cuadro clinico puesto. */
export interface EffectiveArc {
  min: number;
  max: number;
}

/**
 * El arco que se puede recorrer: el del gesto, recortado por el tope (perdida de
 * rango) y por el suelo (deficit de extension) del cuadro clinico activo. Es la
 * misma cuenta que hacia MovementControls en linea.
 */
export function effectiveArc(
  arc: { min: number; max: number },
  pathology?: { rangeCapDeg?: number | null; rangeFloorDeg?: number | null } | null,
): EffectiveArc {
  const cap = pathology?.rangeCapDeg ?? null;
  const floor = pathology?.rangeFloorDeg ?? null;
  return {
    min: floor != null ? Math.max(arc.min, floor) : arc.min,
    max: cap != null ? Math.min(arc.max, cap) : arc.max,
  };
}

/** Fraccion del arco en la que cae `deg`, en [0, 1]. */
export function arcFraction(deg: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return 0;
  const t = (deg - min) / span;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * Donde cae `deg` sobre una pista de deslizador, como valor CSS de `left`.
 *
 * El pulgar mide `thumbPx` (15 px, ver `.range-clinical`) y su CENTRO va de
 * thumb/2 a ancho - thumb/2, no de 0 al ancho: por eso la correccion. Es
 * `neutralMarkLeft` de MovementControls para cualquier grado, no solo el 0.
 */
export function axisLeft(deg: number, min: number, max: number, thumbPx = 15): string {
  const t = arcFraction(deg, min, max);
  const shift = (0.5 - t) * thumbPx;
  return `calc(${(t * 100).toFixed(4)}% + ${shift.toFixed(2)}px)`;
}

/**
 * Lo mismo en pixeles, para dibujar en un SVG del mismo ancho que la pista: el
 * centro del pulgar puesto en `deg`.
 */
export function axisX(deg: number, min: number, max: number, width: number, thumbPx = 15): number {
  return thumbPx / 2 + arcFraction(deg, min, max) * (width - thumbPx);
}

/**
 * A donde lleva el cuerpo pulsar una fase en el paginador: al CENTRO de la
 * parte de la fase que el arco permite.
 *
 * Nunca a un borde: en un borde compartido gana la fase ANTERIOR (ver
 * `phaseAtAngleIn`), asi que ir a los 30° de la abduccion abriria la fase de
 * ajuste y no el rango medio. Y `null` si el cuadro clinico deja la fase fuera
 * del arco (con el hombro congelado, tope 115°, la elevacion completa no se
 * alcanza): esa raya del paginador se apaga.
 */
export function phaseSeekTarget(
  phase: { startDeg: number; endDeg: number },
  effMin: number,
  effMax: number,
): number | null {
  const lo = Math.max(phase.startDeg, effMin);
  const hi = Math.min(phase.endDeg, effMax);
  if (hi - lo < 1) return null;
  return Math.round((lo + hi) / 2);
}
