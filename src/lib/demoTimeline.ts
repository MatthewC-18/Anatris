// src/lib/demoTimeline.ts
//
// LA LINEA DE TIEMPO DE UN DEMO: en que orden entran el movimiento base y los
// componentes de la maniobra.
//
// "En los tests el brazo atraviesa el cuerpo desde donde sale para el
// movimiento." Visto en Hawkins-Kennedy: el demo sostenia los COMPONENTES (codo a
// 90 y rotacion interna a 70) FIJOS durante todo el barrido de la flexion desde 0.
// Con el brazo abajo, un antebrazo doblado y rotado hacia dentro apunta al
// abdomen: durante el primer tercio del barrido el antebrazo y la mano del
// examinador, que va colocada sobre el, estaban DENTRO del torax.
//
// Un fisio no explora asi: primero lleva el brazo a la posicion y despues aplica
// la maniobra (o al reves, segun la prueba). Aqui se escribe ese orden, UNA vez,
// y lo usan los dos paneles que mueven demos (Tests y Neuro) y el banco que lo
// mide (`npm run audit-demo-path`). Antes cada panel llevaba su propio bucle.
//
// Sin dependencias: funcion pura.

/** Como se reparten el movimiento base y los componentes en un trazo. */
export type DemoOrder =
  /** Los dos a la vez y los componentes YA puestos desde el principio. Era el
   *  unico orden que existia; se conserva para poder medirlo. */
  | 'together'
  /** Primero el movimiento base hasta su angulo; despues se anaden los
   *  componentes. Hawkins: flexion a 90 y, alli, la rotacion interna forzada. */
  | 'base-first'
  /** Primero los componentes; despues el movimiento base. Una rotacion que se
   *  explora con el brazo ya abducido. */
  | 'components-first'
  /** Los dos crecen juntos, en proporcion. */
  | 'proportional';

/** El orden por defecto, cuando el demo no declara otro. Ver `npm run audit-demo-path`. */
export const DEFAULT_DEMO_ORDER: DemoOrder = 'base-first';

/** En un instante del trazo: cuanto del angulo base y cuanto de los componentes. */
export interface StrokeFrame {
  /** Fraccion del movimiento base hacia la posicion sostenida, 0..1. */
  base: number;
  /** Fraccion de cada componente, 0..1. */
  comp: number;
}

const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
/** Entrada y salida suaves dentro de cada tramo: un brazo no arranca de golpe. */
const ease = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};

/**
 * Un trazo de ida, `t` de 0 (reposo) a 1 (posicion de la prueba). La vuelta es el
 * mismo trazo recorrido al reves, asi que lo que entro el ultimo sale el primero.
 *
 * @param split En los ordenes por tramos, que parte del trazo se lleva el primer
 *              tramo. Lo calcula `strokePlan` con las duraciones de cada uno.
 */
export function strokeAt(
  order: DemoOrder,
  t: number,
  hasComponents: boolean,
  split = 0.6,
): StrokeFrame {
  const u = clamp01(t);
  if (!hasComponents) return { base: ease(u), comp: 0 };
  switch (order) {
    case 'together':
      return { base: ease(u), comp: 1 };
    case 'proportional':
      return { base: ease(u), comp: ease(u) };
    case 'components-first':
      return u < split ? { base: 0, comp: ease(u / split) } : { base: ease((u - split) / (1 - split)), comp: 1 };
    case 'base-first':
    default:
      return u < split ? { base: ease(u / split), comp: 0 } : { base: 1, comp: ease((u - split) / (1 - split)) };
  }
}

/** Velocidad de exploracion, no de animacion (ver la nota del bucle de Tests). */
export const DEMO_BASE_DPS = 26;
/** Los componentes van algo mas rapido: son el gesto corto que se anade. */
export const DEMO_COMP_DPS = 40;
/** Esperas: larga en la posicion de la prueba, corta en reposo. */
export const DEMO_HOLD_TARGET_MS = 2800;
export const DEMO_HOLD_REST_MS = 800;

/** Cuanto dura un trazo de ida y que parte se lleva el primer tramo. */
export function strokePlan(
  order: DemoOrder,
  baseSpanDeg: number,
  componentDegs: readonly number[],
): { ms: number; split: number } {
  const baseMs = (Math.abs(baseSpanDeg) / DEMO_BASE_DPS) * 1000;
  const compMax = componentDegs.reduce((m, d) => Math.max(m, Math.abs(d)), 0);
  const compMs = compMax > 0 ? Math.max(600, (compMax / DEMO_COMP_DPS) * 1000) : 0;
  if (compMs === 0 || order === 'together' || order === 'proportional') {
    return { ms: Math.max(600, baseMs), split: 0.6 };
  }
  const total = Math.max(600, baseMs + compMs);
  const first = order === 'base-first' ? baseMs : compMs;
  // Ningun tramo por debajo del 20% del trazo: uno de 0,1 s se lee como un salto.
  return { ms: total, split: Math.min(0.8, Math.max(0.2, first / total)) };
}

/** En que punto del bucle (ida, espera, vuelta, espera) cae un instante. */
export type LoopPhase = 'out' | 'hold' | 'back' | 'rest';

export interface LoopFrame extends StrokeFrame {
  phase: LoopPhase;
}

/**
 * El bucle entero de un demo en un instante `ms` desde que empezo: ida, espera
 * larga en la posicion de la prueba, vuelta y espera corta en reposo.
 */
export function loopAt(
  ms: number,
  order: DemoOrder,
  hasComponents: boolean,
  plan: { ms: number; split: number },
): LoopFrame {
  const out = plan.ms;
  const cycle = out + DEMO_HOLD_TARGET_MS + out + DEMO_HOLD_REST_MS;
  const m = ((ms % cycle) + cycle) % cycle;
  if (m < out) return { phase: 'out', ...strokeAt(order, m / out, hasComponents, plan.split) };
  if (m < out + DEMO_HOLD_TARGET_MS) return { phase: 'hold', base: 1, comp: hasComponents ? 1 : 0 };
  if (m < out + DEMO_HOLD_TARGET_MS + out) {
    const t = 1 - (m - out - DEMO_HOLD_TARGET_MS) / out;
    return { phase: 'back', ...strokeAt(order, t, hasComponents, plan.split) };
  }
  return { phase: 'rest', base: 0, comp: 0 };
}

/**
 * El angulo base que corresponde a una fraccion del trazo.
 *
 * En un arco compartido (`arcFrom: 'max'`, la extension del codo y de la rodilla)
 * la posicion que se sostiene es 0 y el reposo es el angulo pedido, asi que el
 * trazo va de `target` a 0.
 */
export function baseAngle(frac: number, target: number, fromMax: boolean): number {
  return fromMax ? target * (1 - frac) : target * frac;
}

/** Un componente de la maniobra: el mismo forma que `TestDemoComponent`. */
export interface DemoComponent {
  movementId: string;
  angleDeg: number;
}

/**
 * EL BUCLE DE UN DEMO, para los dos paneles que los mueven (Tests y Neuro).
 *
 * Antes cada panel llevaba el suyo, copiado: barrido a 26 grados/s, espera de
 * 2,8 s en la posicion de la prueba y de 0,8 s en reposo, y los componentes
 * FIJOS durante todo el recorrido. Ese ultimo detalle es el que metia el
 * antebrazo en el torax (ver la cabecera). Aqui se escribe una vez, con el
 * orden de `strokeAt`, y lo mide `npm run audit-demo-path`.
 *
 * `push` recibe el angulo base y los componentes ya escalados en cada
 * fotograma. Devuelve la funcion que lo para.
 */
export function startDemoLoop(opts: {
  target: number;
  fromMax: boolean;
  components: readonly DemoComponent[] | undefined;
  order?: DemoOrder;
  /** Sin animacion: se posa directamente en la posicion de la prueba. */
  reduceMotion?: boolean;
  push: (deg: number, components: DemoComponent[] | undefined) => void;
}): () => void {
  const comps = opts.components ?? [];
  const has = comps.length > 0;
  const order = opts.order ?? DEFAULT_DEMO_ORDER;
  const scaled = (k: number): DemoComponent[] | undefined =>
    has ? comps.map((c) => ({ movementId: c.movementId, angleDeg: c.angleDeg * k })) : undefined;
  const at = (base: number, comp: number) =>
    opts.push(baseAngle(base, opts.target, opts.fromMax), scaled(comp));

  if (opts.reduceMotion) {
    at(1, 1);
    return () => {};
  }
  const plan = strokePlan(
    order,
    opts.target,
    comps.map((c) => c.angleDeg),
  );
  // El primer fotograma YA, antes de que el navegador programe una animacion:
  // pulsar Demostrar cambia la lectura a la prueba en ese instante.
  const first = strokeAt(order, 0, has, plan.split);
  at(first.base, first.comp);
  let t0 = 0;
  let raf = 0;
  const step = (ts: number) => {
    if (!t0) t0 = ts;
    const f = loopAt(ts - t0, order, has, plan);
    at(f.base, f.comp);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
