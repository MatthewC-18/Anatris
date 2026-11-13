// src/lib/attachmentCallout.ts
//
// DONDE VA LA ETIQUETA DE "ORIGEN" / "INSERCION" EN EXPLORAR, Y POR DONDE
// SALEN SUS LINEAS GUIA.
//
// El usuario: "cuando pulso origen sale muy grande, uno encima de otro, y no se
// lee ni se aprecia lo que debemos ver". Medido en el codigo y en pantalla: cada
// punto de insercion llevaba SU PROPIA etiqueta, un sprite de 5 cm de alto en el
// mundo 3D, y todas decian el mismo texto ("Origen: clavicula, acromion y espina
// de la escapula" una vez por punto). Con varios puntos salian apiladas sobre el
// hombro, pisando los nombres del margen, y al acercar la camara crecian con el
// modelo.
//
// Ahora hay UNA etiqueta por parte, en pantalla y de tamano fijo, con una linea
// guia fina hasta cada punto. Aqui se decide donde va (placeCallout) y por que
// borde sale cada linea (leaderPath). Puro, para probarlo sin lienzo.
//
// Lo que dos revisiones adversariales encontraron, y como queda:
// - La etiqueta apretada contra el borde quedaba A LA ALTURA de dos puntos y
//   sus lineas, que salian todas del borde de abajo, la cruzaban por el texto
//   (medido en la captura del pectoral muy cerca: clavicula a la altura de la
//   etiqueta). Ahora cada linea sale por el borde que mira a SU punto, y una
//   curva que sale por un borde no vuelve a entrar en la caja.
// - Un punto pegado al borde de la caja no contaba como tapado aunque su anillo
//   y su halo cayeran sobre el texto: ahora se guarda un aire de PIN_CLEARANCE.
// - La etiqueta saltaba de lado sin necesidad: con el grupo centrado (como lo
//   deja el encuadre de origen / insercion, a 0,5 px de la mitad) por medio
//   pixel de camara, y al acercar la camara cruzaba todo el grupo (570 px en un
//   fotograma) aunque su sitio siguiera libre. Ahora se queda donde estaba
//   mientras su sitio siga libre y dentro de la banda.
// - Si no cabia ni encima, ni debajo, ni al lado, solo se probaban dos esquinas;
//   luego una rejilla de 12 px, que no veia huecos mas estrechos, valoraba
//   igual un punto bajo el texto que uno rozando el aire y costaba 21,7 ms con
//   50 puntos. Ahora el barrido prueba los bordes exactos de cada hueco y
//   puntua por orden: puntos bajo el texto, puntos en el aire, distancia al
//   grupo.
// - Los anillos de pantalla de puntos muy juntos se montaban (ringRadii).
// - En un lienzo bajo se soltaban a la vez las dos franjas reservadas; ahora se
//   suelta primero la de arriba y la barra de vistas la ultima.

export interface ScreenPoint {
  x: number;
  y: number;
}

/** Donde quedo respecto al grupo; 'free' si salio del barrido de la banda. */
export type CalloutSide = 'above' | 'below' | 'right' | 'left' | 'free';

export interface CalloutPlacement {
  /** Esquina de arriba a la izquierda de la etiqueta, en px del lienzo. */
  left: number;
  top: number;
  side: CalloutSide;
}

/** Franjas del lienzo donde la etiqueta no puede ir, en px desde cada borde. */
export interface CalloutReserve {
  top: number;
  bottom: number;
}

/** Aire entre la etiqueta y el grupo de puntos, al ponerla encima, debajo o al lado. */
export const CALLOUT_GAP = 40;
/** Aire con el borde del lienzo (o de la franja reservada). */
export const CALLOUT_MARGIN = 12;
/**
 * Aire minimo entre la caja de la etiqueta y el centro de cualquier punto. El
 * anillo de pantalla mide 7 px de radio y el halo 3D llega a 11 (22 px de
 * diametro con su pulso, AttachmentMarkers): con 12 ninguno toca el texto.
 */
export const PIN_CLEARANCE = 12;
/** Un poco por fuera del borde exacto de un hueco, para quedar dentro de el. */
const EDGE_EPS = 0.5;

const NO_RESERVE: CalloutReserve = { top: 0, bottom: 0 };

/** Ningun punto cae dentro de la caja agrandada con el aire de PIN_CLEARANCE. */
function clearOf(left: number, top: number, w: number, h: number, pins: readonly ScreenPoint[]): boolean {
  const c = PIN_CLEARANCE;
  for (const p of pins) {
    if (p.x >= left - c && p.x <= left + w + c && p.y >= top - c && p.y <= top + h + c) return false;
  }
  return true;
}

/**
 * La banda vertical donde puede ir la etiqueta. Si con las dos franjas no cabe,
 * se suelta primero la de arriba (el aviso al pasar el raton, pasajero) y solo
 * despues la de abajo (la barra de vistas, que es opaca y la taparia entera).
 */
function verticalBand(height: number, labelH: number, reserve: CalloutReserve): { yMin: number; yMax: number } {
  const m = CALLOUT_MARGIN;
  let yMin = reserve.top + m;
  let yMax = height - reserve.bottom - m;
  if (yMax - yMin < labelH) yMin = m;
  if (yMax - yMin < labelH) yMax = height - m;
  return { yMin, yMax };
}

/**
 * @param prev donde quedo la etiqueta en el fotograma anterior (o null la
 *   primera vez, o si cambio lo que se nombra). Si su sitio sigue libre, se
 *   queda: una etiqueta que salta de lado mientras se mira cansa la vista.
 */
export function placeCallout(
  pins: readonly ScreenPoint[],
  width: number,
  height: number,
  labelW: number,
  labelH: number,
  reserve: CalloutReserve = NO_RESERVE,
  prev: CalloutPlacement | null = null,
): CalloutPlacement | null {
  if (pins.length === 0) return null;
  const gap = CALLOUT_GAP;
  const m = CALLOUT_MARGIN;
  const c = PIN_CLEARANCE;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pins) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const { yMin, yMax } = verticalBand(height, labelH, reserve);
  const xLo = m;
  const xHi = Math.max(m, width - m - labelW);
  const yLo = yMin;
  const yHi = Math.max(yMin, yMax - labelH);
  const clampX = (x: number) => Math.min(Math.max(x, xLo), xHi);
  const clampY = (y: number) => Math.min(Math.max(y, yLo), yHi);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Las cuatro posiciones de siempre, siguiendo al grupo, con su sitio
  // "natural" (sin apretar contra el borde).
  const natural = {
    above: minY - gap - labelH >= yLo,
    below: maxY + gap <= yHi,
    right: maxX + gap <= xHi,
    left: minX - gap - labelW >= xLo,
  };
  const spot = {
    above: { left: clampX(cx - labelW / 2), top: clampY(minY - gap - labelH) },
    below: { left: clampX(cx - labelW / 2), top: clampY(maxY + gap) },
    right: { left: clampX(maxX + gap), top: clampY(cy - labelH / 2) },
    left: { left: clampX(minX - gap - labelW), top: clampY(cy - labelH / 2) },
  };

  // 0. Donde estaba, si sigue libre. Un lado sigue al grupo; un hueco del
  //    barrido se queda quieto en la pantalla.
  if (prev) {
    const s = prev.side === 'free' ? { left: clampX(prev.left), top: clampY(prev.top) } : spot[prev.side];
    if (clearOf(s.left, s.top, labelW, labelH, pins)) return { left: s.left, top: s.top, side: prev.side };
  }

  // 1. Las que caben sin apretar, en orden de preferencia; 2. las apretadas
  //    contra el borde, que valen si ningun punto queda pegado a la caja (la
  //    linea de cada punto sale por el borde que lo mira, leaderPath).
  let firstV: 'above' | 'below';
  if (natural.above && natural.below) firstV = cy < height / 2 ? 'above' : 'below';
  else if (natural.above) firstV = 'above';
  else if (natural.below) firstV = 'below';
  else firstV = minY - yLo >= yHi - maxY ? 'above' : 'below';
  const secondV = firstV === 'above' ? 'below' : 'above';
  const firstH: 'right' | 'left' = xHi - (maxX + gap) >= minX - gap - labelW - xLo ? 'right' : 'left';
  const secondH = firstH === 'right' ? 'left' : 'right';
  const order: Array<'above' | 'below' | 'right' | 'left'> = [firstV, secondV, firstH, secondH];
  for (const pass of [true, false]) {
    for (const side of order) {
      if (natural[side] !== pass) continue;
      const s = spot[side];
      if (clearOf(s.left, s.top, labelW, labelH, pins)) return { left: s.left, top: s.top, side };
    }
  }

  // 3. Barrido de la banda: el hueco mas cercano al grupo, primero con todo su
  //    aire alrededor y, si no lo hay, al menos sin ningun punto debajo del
  //    texto. Si ni eso (puntos por toda la banda mas juntos que la etiqueta),
  //    centrada sobre el grupo.
  const ux = cx - labelW / 2;
  const uy = cy - labelH / 2;
  const box = { w: labelW, h: labelH, xLo, xHi, yLo, yHi, ux, uy };
  const free = nearestClear(pins, c, box) ?? nearestClear(pins, 0, box);
  if (free) return { left: free.left, top: free.top, side: 'free' };
  return { left: clampX(ux), top: clampY(uy), side: 'free' };
}

/**
 * El sitio de la etiqueta mas cercano a la posicion centrada (ux, uy), dentro
 * de la banda, con al menos `k` px de aire entre la caja y cada punto; null si
 * no hay ninguno.
 *
 * Los huecos estan limitados por los bordes de la banda y por las lineas donde
 * un punto entra o sale de la caja agrandada; dentro de cada hueco, el sitio
 * mas cercano es la posicion centrada llevada al hueco. Basta, pues, probar
 * esas coordenadas: ningun hueco, por estrecho que sea, se queda sin
 * candidato (una rejilla fija de 12 px no veia uno de 1 px en un caso real del
 * pectoral). Filas y columnas van ordenadas por distancia y se corta en cuanto
 * ninguna puede quedar mas cerca: con 50 puntos en 1660 x 1014 la rejilla
 * costaba 21,7 ms por llamada.
 */
function nearestClear(
  pins: readonly ScreenPoint[],
  k: number,
  b: { w: number; h: number; xLo: number; xHi: number; yLo: number; yHi: number; ux: number; uy: number },
): { left: number; top: number } | null {
  const fx: number[] = [b.xLo, b.xHi, Math.min(Math.max(b.ux, b.xLo), b.xHi)];
  const fy: number[] = [b.yLo, b.yHi, Math.min(Math.max(b.uy, b.yLo), b.yHi)];
  for (const p of pins) {
    const x1 = p.x + k + EDGE_EPS;
    const x2 = p.x - b.w - k - EDGE_EPS;
    const y1 = p.y + k + EDGE_EPS;
    const y2 = p.y - b.h - k - EDGE_EPS;
    if (x1 > b.xLo && x1 < b.xHi) fx.push(x1);
    if (x2 > b.xLo && x2 < b.xHi) fx.push(x2);
    if (y1 > b.yLo && y1 < b.yHi) fy.push(y1);
    if (y2 > b.yLo && y2 < b.yHi) fy.push(y2);
  }
  fx.sort((a, z) => Math.abs(a - b.ux) - Math.abs(z - b.ux));
  fy.sort((a, z) => Math.abs(a - b.uy) - Math.abs(z - b.uy));
  // Los puntos de la franja vertical de cada columna, una sola vez.
  const cols = fx.map((left) => pins.filter((p) => p.x >= left - k && p.x <= left + b.w + k));
  let best: { left: number; top: number } | null = null;
  let bestD = Infinity;
  for (const top of fy) {
    const dy2 = (top - b.uy) * (top - b.uy);
    if (dy2 >= bestD) break;
    for (let i = 0; i < fx.length; i++) {
      const left = fx[i];
      const d = (left - b.ux) * (left - b.ux) + dy2;
      if (d >= bestD) break;
      let ok = true;
      for (const p of cols[i]) {
        if (p.y >= top - k && p.y <= top + b.h + k) {
          ok = false;
          break;
        }
      }
      if (ok) {
        best = { left, top };
        bestD = d;
        break;
      }
    }
  }
  return best;
}

/** Radio del anillo de pantalla de un punto aislado (AttachmentCallout). */
export const RING_RADIUS = 7;
/** El menor: por debajo el anillo ya no se distingue del nucleo. */
export const RING_RADIUS_MIN = 2.5;

/**
 * EL RADIO DEL ANILLO DE CADA PUNTO, PARA QUE NO SE MONTEN UNOS SOBRE OTROS.
 *
 * En la vista con que se abre el origen del pectoral los diez puntos quedan a
 * 6-13 px unos de otros en el movil (8 pares mas cerca que los 14 px de dos
 * anillos) y a 10 px un par en escritorio: un racimo de circulos encima del
 * sitio que se queria ver. Cada anillo mide como mucho la mitad de la
 * distancia a su vecino mas cercano (menos 1 px de aire), entre RING_RADIUS_MIN
 * y RING_RADIUS. `screen[i]` null (punto que no se ve) da 0.
 */
export function ringRadii(screen: readonly (ScreenPoint | null)[], out: number[] = []): number[] {
  out.length = screen.length;
  for (let i = 0; i < screen.length; i++) {
    const a = screen[i];
    if (!a) {
      out[i] = 0;
      continue;
    }
    let nearest = Infinity;
    for (let j = 0; j < screen.length; j++) {
      const b = screen[j];
      if (!b || j === i) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < nearest) nearest = d;
    }
    out[i] = Math.min(RING_RADIUS, Math.max(RING_RADIUS_MIN, nearest / 2 - 1));
  }
  return out;
}

/**
 * La linea guia de la etiqueta a un punto: sale perpendicular al borde de la
 * caja que mira al punto (el de arriba, el de abajo o uno de los lados, segun
 * hacia donde quede mas lejos) y entra en el punto en la misma direccion, una S
 * suave. Todos sus puntos de control quedan del lado de fuera de ese borde, asi
 * que la curva no vuelve a entrar en la caja: nunca cruza el texto. Un punto
 * que queda debajo de la caja (solo si no habia ningun hueco) no lleva linea.
 */
export function leaderPath(
  box: { left: number; top: number; width: number; height: number },
  p: ScreenPoint,
): string {
  const right = box.left + box.width;
  const bottom = box.top + box.height;
  const ox = p.x < box.left ? box.left - p.x : p.x > right ? p.x - right : 0;
  const oy = p.y < box.top ? box.top - p.y : p.y > bottom ? p.y - bottom : 0;
  if (ox === 0 && oy === 0) return '';
  if (oy >= ox) {
    const ax = box.left + box.width / 2;
    const ay = p.y < box.top ? box.top : bottom;
    const dy = (p.y - ay) * 0.5;
    return `M${ax},${ay}C${ax},${ay + dy} ${p.x},${p.y - dy} ${p.x},${p.y}`;
  }
  const ax = p.x < box.left ? box.left : right;
  const ay = box.top + box.height / 2;
  const dx = (p.x - ax) * 0.5;
  return `M${ax},${ay}C${ax + dx},${ay} ${p.x - dx},${p.y} ${p.x},${p.y}`;
}

/**
 * EL PUNTO 3D NO CRECE SIN LIMITE AL ACERCAR LA CAMARA.
 *
 * Los puntos son esferas con tamano de mundo (nucleo de 12 mm y halo de 26 mm,
 * AttachmentMarkers). Medido en capturas a 1440 x 900 con el origen del
 * pectoral: el nucleo mide ~1 px en la vista de la region (alli el punto lo
 * dibuja el anillo de pantalla) y, acercando la camara, 31, 57 y hasta 206 px de
 * diametro, con el halo a mas del doble. Tapaba justo lo que se queria ver: el
 * sitio de la insercion. Esta escala deja un objeto de `worldSize` en `maxPx`
 * como mucho en pantalla, y no lo toca mientras quepa.
 *
 * `depth` es la profundidad en el espacio de la camara (positiva delante).
 */
export function pinScreenScale(
  worldSize: number,
  depth: number,
  fovDeg: number,
  viewportH: number,
  maxPx: number,
  zoom = 1,
): number {
  if (!(depth > 0) || !(worldSize > 0)) return 1;
  const px = (worldSize * viewportH * zoom) / (2 * depth * Math.tan((fovDeg * Math.PI) / 360));
  return px > maxPx ? maxPx / px : 1;
}
