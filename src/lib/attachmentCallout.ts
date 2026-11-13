// src/lib/attachmentCallout.ts
//
// DONDE VA LA ETIQUETA DE "ORIGEN" / "INSERCION" EN EXPLORAR.
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
// guia fina hasta cada punto. Esta funcion decide donde: encima del grupo de
// puntos si hay sitio (y si el grupo esta en la mitad de arriba), si no debajo,
// y si con la camara muy cerca no cabe ni encima ni debajo, AL LADO del grupo.
// Siempre dentro del lienzo y sin tapar ningun punto. Pura, para probarla sin
// lienzo.

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface CalloutPlacement {
  /** Esquina de arriba a la izquierda de la etiqueta, en px del lienzo. */
  left: number;
  top: number;
  /** De donde salen las lineas guia: el centro del borde que mira a los puntos. */
  anchorX: number;
  anchorY: number;
  /** Donde quedo respecto al grupo. */
  side: 'above' | 'below' | 'right' | 'left';
}

/** Aire entre la etiqueta y el punto mas cercano. */
export const CALLOUT_GAP = 40;
/** Aire con el borde del lienzo. */
export const CALLOUT_MARGIN = 12;

/** La caja tapa algun punto. */
function covers(left: number, top: number, w: number, h: number, pins: readonly ScreenPoint[]): boolean {
  return pins.some((p) => p.x >= left && p.x <= left + w && p.y >= top && p.y <= top + h);
}

export function placeCallout(
  pins: readonly ScreenPoint[],
  width: number,
  height: number,
  labelW: number,
  labelH: number,
  gap = CALLOUT_GAP,
  margin = CALLOUT_MARGIN,
): CalloutPlacement | null {
  if (pins.length === 0) return null;
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
  const clampX = (x: number) => Math.min(Math.max(x, margin), Math.max(margin, width - margin - labelW));
  const clampY = (y: number) => Math.min(Math.max(y, margin), Math.max(margin, height - margin - labelH));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // 1. Encima o debajo, centrada sobre el grupo.
  const roomAbove = minY - gap - labelH - margin;
  const roomBelow = height - margin - (maxY + gap + labelH);
  const above =
    roomAbove >= 0 && (cy < height / 2 || roomBelow < 0) ? true : roomBelow >= 0 ? false : roomAbove >= roomBelow;
  const left = clampX(cx - labelW / 2);
  const top = clampY(above ? minY - gap - labelH : maxY + gap);
  if (!covers(left, top, labelW, labelH, pins)) {
    return { left, top, anchorX: left + labelW / 2, anchorY: above ? top + labelH : top, side: above ? 'above' : 'below' };
  }

  // 2. Con la camara muy cerca el grupo llena el alto y la etiqueta, apretada
  //    contra el borde, caeria encima de un punto: al lado del grupo, donde haya
  //    mas sitio.
  const roomRight = width - margin - (maxX + gap + labelW);
  const roomLeft = minX - gap - labelW - margin;
  const right = roomRight >= roomLeft;
  const sideLeft = clampX(right ? maxX + gap : minX - gap - labelW);
  const sideTop = clampY(cy - labelH / 2);
  if (!covers(sideLeft, sideTop, labelW, labelH, pins)) {
    return {
      left: sideLeft,
      top: sideTop,
      anchorX: right ? sideLeft : sideLeft + labelW,
      anchorY: sideTop + labelH / 2,
      side: right ? 'right' : 'left',
    };
  }

  // 3. Ni asi (los puntos ocupan todo el lienzo): en la esquina de arriba que
  //    menos puntos tape. Mejor una etiqueta en un rincon que encima del dato.
  const corners = [
    { left: margin, top: margin },
    { left: Math.max(margin, width - margin - labelW), top: margin },
  ];
  const tapa = (c: { left: number; top: number }) =>
    pins.filter((p) => p.x >= c.left && p.x <= c.left + labelW && p.y >= c.top && p.y <= c.top + labelH).length;
  const best = tapa(corners[0]) <= tapa(corners[1]) ? corners[0] : corners[1];
  return { left: best.left, top: best.top, anchorX: best.left + labelW / 2, anchorY: best.top + labelH, side: 'above' };
}
