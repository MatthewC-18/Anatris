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
//   luego una rejilla de 12 px, que no veia huecos mas estrechos y valoraba
//   igual un punto bajo el texto que uno rozando el aire. Ahora el barrido mira
//   tambien los bordes exactos de cada hueco y puntua por orden: puntos bajo el
//   texto, puntos en el aire, distancia al grupo.
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
/** Paso de la rejilla del barrido cuando nada de lo anterior cabe. */
const SCAN_STEP = 12;
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

  // 3. Barrido de la banda: una rejilla y, ademas, los bordes exactos de los
  //    huecos que deja cada punto (por estrecho que sea el hueco, hay un
  //    candidato dentro). Gana, por orden: menos puntos bajo el texto, menos
  //    puntos en el aire de alrededor, mas cerca del centro del grupo.
  const xs: number[] = [xLo, xHi];
  const ys: number[] = [yLo, yHi];
  for (let x = xLo + SCAN_STEP; x < xHi; x += SCAN_STEP) xs.push(x);
  for (let y = yLo + SCAN_STEP; y < yHi; y += SCAN_STEP) ys.push(y);
  for (const p of pins) {
    for (const x of [p.x + c + EDGE_EPS, p.x - labelW - c - EDGE_EPS]) if (x > xLo && x < xHi) xs.push(x);
    for (const y of [p.y + c + EDGE_EPS, p.y - labelH - c - EDGE_EPS]) if (y > yLo && y < yHi) ys.push(y);
  }
  let best = { left: xLo, top: yLo, under: Infinity, near: Infinity, d: Infinity };
  for (const top of ys) {
    for (const left of xs) {
      let under = 0;
      let near = 0;
      for (const p of pins) {
        if (p.x >= left - c && p.x <= left + labelW + c && p.y >= top - c && p.y <= top + labelH + c) {
          if (p.x >= left && p.x <= left + labelW && p.y >= top && p.y <= top + labelH) under++;
          else near++;
        }
      }
      if (under > best.under || (under === best.under && near > best.near)) continue;
      const dx = left + labelW / 2 - cx;
      const dy = top + labelH / 2 - cy;
      const d = dx * dx + dy * dy;
      if (under < best.under || near < best.near || d < best.d) best = { left, top, under, near, d };
    }
  }
  return { left: best.left, top: best.top, side: 'free' };
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
