// src/lib/phaseLabel.ts
//
// El nombre de una fase SIN su tramo entre parentesis. Los datos lo escriben
// como "Fase de ajuste (0-30°)", y donde el tramo ya se ensena al lado (el
// escenario, el paginador del margen) repetirlo era decir dos veces lo mismo en
// una linea. Vivia dentro de StageReadout; ahora lo usan dos piezas.

/** "Fase de ajuste (0-30°)" -> "Fase de ajuste". Si no queda nada, el original. */
export function sinRango(label: string): string {
  return label.replace(/\s*\([^()]*\d[^()]*\)\s*$/, '').trim() || label;
}

/** "-30" con el signo tipografico, no con un guion. */
export function grados(n: number): string {
  const r = Math.round(n);
  return r < 0 ? `−${Math.abs(r)}` : String(r);
}
