// LA POSE QUE EL FISIO DEJÓ PUESTA, mientras el laboratorio sigue abierto.
//
// -----------------------------------------------------------------------------
// POR QUÉ NO PUEDE SER ESTADO DEL COMPONENTE
// -----------------------------------------------------------------------------
// La consola de movimiento (MovementControls) se MONTA DE NUEVO en tres
// situaciones corrientes, y en las tres perdía lo que el usuario había puesto:
//
//   1. En el móvil, la hoja del laboratorio dibuja una pestaña a la vez. Pasar a
//      Tests y volver a Movimiento desmonta la consola: el gesto elegido volvía
//      al primero de la lista y el ángulo a 0. Quien estaba enseñando una
//      abducción a 120° volvía y tenía el brazo colgando.
//   2. Entrar y salir del MODO PACIENTE. Las dos vistas dibujan la consola en
//      ramas distintas del árbol, así que React la desmonta aunque la `key` sea
//      la misma. Es justo el momento en que la pose importa: se gira la pantalla
//      hacia el paciente para mostrarle ESA posición.
//   3. Cualquier cambio de distribución que mueva la consola de sitio.
//
// La pose no es un dato del paciente --es el ángulo de un modelo-- así que aquí
// no hay la reserva que sí tiene `neuroScreenStore` con los hallazgos. Pero sí
// se comparte su alcance: vive mientras la pestaña está abierta y muere con
// ella. No se escribe en disco: reabrir la aplicación días después con el codo
// a 95° no es memoria útil, es desconcierto.
//
// Va POR REGIÓN, porque cada región tiene sus propios movimientos: recordar
// "abducción glenohumeral, 120°" al entrar en la rodilla no significa nada.
//
// Un mapa de módulo, como `neuroScreenStore` y `demoChannel`: sin suscripción,
// porque solo hay una consola montada a la vez (MovementView dibuja la de
// escritorio o la de la hoja, nunca las dos), así que la consola lee una vez al
// montar y escribe al cambiar.

export interface ConsolePose {
  movementId: string;
  side: 'R' | 'L';
  angleDeg: number;
}

const byRegion = new Map<string, ConsolePose>();

/** Lo que había puesto en esta región, o null si es la primera vez. */
export function readPose(region: string | null): ConsolePose | null {
  if (!region) return null;
  return byRegion.get(region) ?? null;
}

/** Escritura directa. Se llama al cambiar de gesto, de lado o de ángulo. */
export function writePose(region: string | null, pose: ConsolePose): void {
  if (!region) return;
  byRegion.set(region, pose);
}

/** Olvidar la pose de una región (cambio de paciente, reinicio del laboratorio). */
export function clearPose(region: string | null): void {
  if (region) byRegion.delete(region);
}
