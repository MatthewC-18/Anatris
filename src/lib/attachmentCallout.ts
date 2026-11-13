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
// centrada sobre el grupo y siempre dentro del lienzo. Pura, para probarla sin
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
  /** La etiqueta va encima de los puntos. */
  above: boolean;
}

/** Aire entre la etiqueta y el punto mas cercano. */
export const CALLOUT_GAP = 40;
/** Aire con el borde del lienzo. */
export const CALLOUT_MARGIN = 12;

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
  const roomAbove = minY - gap - labelH - margin;
  const roomBelow = height - margin - (maxY + gap + labelH);
  const centroY = (minY + maxY) / 2;
  // Encima si cabe y el grupo esta en la mitad de arriba (el fondo libre suele
  // estar encima del hombro y debajo de la rodilla); si no, donde haya mas sitio.
  const above =
    roomAbove >= 0 && (centroY < height / 2 || roomBelow < 0) ? true : roomBelow >= 0 ? false : roomAbove >= roomBelow;
  const top = above ? Math.max(margin, minY - gap - labelH) : Math.min(height - margin - labelH, maxY + gap);
  const cx = (minX + maxX) / 2;
  const left = Math.min(Math.max(cx - labelW / 2, margin), Math.max(margin, width - margin - labelW));
  return {
    left,
    top,
    anchorX: left + labelW / 2,
    anchorY: above ? top + labelH : top,
    above,
  };
}
