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

/**
 * EL NOMBRE DE LA FASE EN UN DEMO DE PRUEBA.
 *
 * Las fases nombran el motor del gesto ACTIVO de pie ("Inicio-medio (erector
 * lumbar)", "Rango medio (deltoides motor)"), y una prueba casi nunca es ese
 * gesto: la extension lumbar PASIVA salia rotulada con el erector como motor, el
 * Slump con el "motor abdominal" y la aprension anterior, a 90 grados, con el
 * deltoides (capturas de los demos, 15 nov). En un demo de prueba que no es
 * resistida se quita el parentesis final; con `resists` el paciente si contrae
 * y el motor se queda. Los miotomas (`neuro:`) no cambian: alli el gesto activo
 * ES la prueba.
 *
 * Quita tambien parentesis que no son motores ("Desbloqueo (inicio)", "Final
 * (despegue)"): el nombre que queda sigue siendo cierto, y no hay forma de
 * distinguirlos sin inventarse una lista.
 */
export function nombreDeFase(
  label: string,
  demoId: string | null,
  demo: { examinerForce?: 'resists' | 'applies' } | null | undefined,
): string {
  const sinMotor = !!demoId?.startsWith('test:') && demo?.examinerForce !== 'resists';
  if (!sinMotor) return sinRango(label);
  return label.replace(/\s*\([^()]*\)\s*$/, '').trim() || sinRango(label);
}
