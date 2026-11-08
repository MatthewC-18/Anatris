// src/lib/patientPhrase.ts
//
// LO QUE EL PACIENTE LEE. Es la frase del "Modo paciente" (la pantalla que el
// fisio gira hacia él) y de la tarjeta de "Exportar para paciente". En las dos
// superficies es la ÚNICA frase que el paciente lee, así que es la única
// oportunidad que tiene el producto de hablar su idioma.
//
// EL DEFECTO QUE ESTO CIERRA, Y POR QUÉ NO ERA UN DESCUIDO SINO EL DISEÑO.
// Antes esto era un conjunto de reglas sobre el identificador del movimiento
// que interpolaba el NOMBRE DE LA REGIÓN:
//
//     if (/abduction/.test(id)) return `Separa ${r} hacia el lado, ...`;
//
// Con `REGIONS.shoulder.name === 'Hombro'` eso imprime, literalmente, «Separa
// hombro hacia el lado, despacio y sin dolor.» Y lo mismo en el raquis:
// «Inclina cervical hacia el lado», «Gira torácica hacia el lado», «Dobla
// lumbar». El encabezado del propio archivo decía que la frase debía ser
// «Separa el brazo hacia el lado», o sea que la intención estaba escrita y el
// código hacía otra cosa.
//
// El error de fondo es conceptual: **el paciente no mueve una articulación,
// mueve un segmento.** Nadie "separa su hombro": separa el brazo. Nadie "dobla
// su lumbar": se inclina hacia adelante. Derivar la frase del nombre de la
// región garantiza jerga, porque el nombre de la región ES el nombre clínico.
//
// Y el test que lo vigilaba exigía longitud >= 12 y un punto final, así que
// pasaba en verde con las 34 frases mal.
//
// POR QUÉ UNA TABLA DE 34 Y NO MÁS REGLAS: son 34 movimientos en total, y cada
// uno tiene una forma natural de decirse que ninguna regla general acierta
// ("acerca la oreja al hombro" para la inclinación cervical, "como para tocarte
// los pies" para la flexión lumbar). Escritas una vez, se leen bien las 34; la
// regla general vuelve a producir frases de robot en cuanto se le pide algo que
// no esperaba. Las reglas se quedan solo como RED para una región futura, y
// nombran siempre un segmento, nunca la articulación.
//
// Lo vigila `src/lib/__tests__/patientPhrase.test.ts`, que para los 34 exige:
// cero palabras de jerga, y que la frase nombre un segmento con su artículo.

import type { RomMovement } from '../types/rom';

const SLOW = 'despacio y sin dolor';

/**
 * Lo que el paciente hace, movimiento a movimiento. Verbo primero, segmento con
 * artículo, y un punto de referencia del cuerpo cuando ayuda a entenderlo (el
 * talón, la oreja, la barbilla): es lo que un fisio dice en voz alta.
 */
const PATIENT_PHRASE: Record<string, string> = {
  // --- Tobillo y pie
  'ankle-dorsiflexion': `Lleva el pie hacia arriba, ${SLOW}.`,
  'ankle-plantarflexion': `Estira el pie hacia abajo, como de puntillas, ${SLOW}.`,
  'ankle-inversion': `Gira la planta del pie hacia adentro, ${SLOW}.`,
  'ankle-eversion': `Gira la planta del pie hacia afuera, ${SLOW}.`,

  // --- Cuello
  'cervical-flexion': `Baja la barbilla hacia el pecho, ${SLOW}.`,
  'cervical-extension': `Lleva la cabeza hacia atrás para mirar arriba, ${SLOW}.`,
  'cervical-lateral-flexion': `Acerca la oreja al hombro sin levantarlo, ${SLOW}.`,
  'cervical-rotation': `Gira la cabeza para mirar por encima del hombro, ${SLOW}.`,

  // --- Codo
  'elbow-flexion': `Dobla el codo y acerca la mano al hombro, ${SLOW}.`,
  'elbow-extension': `Estira el codo del todo, ${SLOW}.`,
  'elbow-pronation': `Con el codo doblado y pegado al cuerpo, gira la palma de la mano hacia abajo, ${SLOW}.`,
  'elbow-supination': `Con el codo doblado y pegado al cuerpo, gira la palma de la mano hacia arriba, ${SLOW}.`,

  // --- Hombro
  'glenohumeral-abduction': `Separa el brazo hacia el lado, ${SLOW}.`,
  'glenohumeral-flexion': `Sube el brazo hacia adelante, ${SLOW}.`,
  'glenohumeral-internal-rotation': `Con el codo pegado al cuerpo, lleva la mano hacia la barriga, ${SLOW}.`,
  'glenohumeral-external-rotation': `Con el codo pegado al cuerpo, abre la mano hacia afuera, ${SLOW}.`,

  // --- Cadera
  'hip-flexion': `Sube la rodilla hacia el pecho, ${SLOW}.`,
  'hip-extension': `Lleva la pierna hacia atrás, ${SLOW}.`,
  'hip-abduction': `Separa la pierna hacia el lado, ${SLOW}.`,
  'hip-adduction': `Acerca la pierna hacia la otra, ${SLOW}.`,
  // Con la cadera y la rodilla dobladas, el giro de la cadera hacia adentro
  // lleva el pie hacia AFUERA. Es lo que el paciente ve, y es lo que se le dice.
  'hip-internal-rotation': `Deja la rodilla en su sitio y gira el pie hacia afuera, ${SLOW}.`,
  'hip-external-rotation': `Deja la rodilla en su sitio y gira el pie hacia adentro, ${SLOW}.`,

  // --- Rodilla
  'knee-flexion': `Dobla la rodilla y lleva el talón hacia atrás, ${SLOW}.`,
  'knee-extension': `Estira la rodilla del todo, ${SLOW}.`,
  'knee-internal-rotation': `Con la rodilla doblada, gira el pie hacia adentro, ${SLOW}.`,
  'knee-external-rotation': `Con la rodilla doblada, gira el pie hacia afuera, ${SLOW}.`,

  // --- Espalda media (torácica)
  'thoracic-flexion': `Redondea la espalda llevando los hombros hacia adelante, ${SLOW}.`,
  'thoracic-extension': `Abre el pecho y junta los omóplatos atrás, ${SLOW}.`,
  'thoracic-lateral-flexion': `Inclínate hacia el lado desde las costillas, ${SLOW}.`,
  'thoracic-rotation': `Gira los hombros hacia el lado dejando la cadera quieta, ${SLOW}.`,

  // --- Espalda baja (lumbar)
  'lumbar-flexion': `Inclínate hacia adelante como para tocarte los pies, ${SLOW}.`,
  'lumbar-extension': `Échate hacia atrás arqueando la espalda, ${SLOW}.`,
  'lumbar-lateral-flexion': `Inclínate hacia el lado deslizando la mano por la pierna, ${SLOW}.`,
  'lumbar-rotation': `Gira el tronco hacia el lado sin mover los pies, ${SLOW}.`,
};

/**
 * EL SEGMENTO QUE EL PACIENTE MUEVE, con su artículo. Nunca el nombre de la
 * región: la articulación no es lo que el paciente mueve, y su nombre es
 * precisamente el término clínico que hay que evitar.
 *
 * Solo lo usa la red de abajo, para una región futura que todavía no tenga sus
 * frases escritas.
 */
const SEGMENT: Record<string, string> = {
  glenohumeral: 'el brazo',
  shoulder: 'el brazo',
  elbow: 'el codo',
  wrist: 'la mano',
  hip: 'la pierna',
  knee: 'la rodilla',
  ankle: 'el pie',
  cervical: 'la cabeza',
  thoracic: 'el tronco',
  lumbar: 'el tronco',
};

/** El segmento de un identificador de movimiento, o el tronco por defecto. */
function segmentOf(id: string): string {
  for (const [key, seg] of Object.entries(SEGMENT)) {
    if (id.startsWith(`${key}-`) || id.includes(key)) return seg;
  }
  return 'el cuerpo';
}

/**
 * Instrucción corta y en lenguaje llano (español LATAM) de lo que el paciente
 * hace. `regionName` se conserva en la firma porque la usa el título de la
 * tarjeta; la frase NO la interpola, que era el defecto.
 */
export function patientInstruction(movement: RomMovement, regionName: string): string {
  const written = PATIENT_PHRASE[movement.id];
  if (written) return written;

  // --- RED, para una región que entre sin sus frases escritas. Nombra el
  // segmento, nunca la articulación, para que el peor caso siga siendo legible.
  const id = movement.id.toLowerCase();
  const s = segmentOf(id);
  if (/dorsiflexion/.test(id)) return `Lleva el pie hacia arriba, ${SLOW}.`;
  if (/plantarflexion/.test(id)) return `Estira el pie hacia abajo, ${SLOW}.`;
  if (/inversion/.test(id)) return `Gira la planta del pie hacia adentro, ${SLOW}.`;
  if (/eversion/.test(id)) return `Gira la planta del pie hacia afuera, ${SLOW}.`;
  if (/pronation/.test(id)) return `Gira la palma de la mano hacia abajo, ${SLOW}.`;
  if (/supination/.test(id)) return `Gira la palma de la mano hacia arriba, ${SLOW}.`;
  if (/abduction/.test(id)) return `Separa ${s} hacia el lado, ${SLOW}.`;
  if (/adduction/.test(id)) return `Acerca ${s} hacia el centro del cuerpo, ${SLOW}.`;
  if (/internal-rotation/.test(id)) return `Gira ${s} hacia adentro, ${SLOW}.`;
  if (/external-rotation/.test(id)) return `Gira ${s} hacia afuera, ${SLOW}.`;
  if (/lateral-flexion/.test(id)) return `Inclina ${s} hacia el lado, ${SLOW}.`;
  if (/rotation/.test(id)) return `Gira ${s} hacia el lado, ${SLOW}.`;
  if (/flexion/.test(id)) return `Dobla ${s}, ${SLOW}, hasta donde te resulte cómodo.`;
  if (/extension/.test(id)) return `Estira ${s}, ${SLOW}.`;
  // Y si ni eso: una frase con el segmento, y el nombre clínico fuera. Mejor
  // genérica que con jerga -- el nombre tecnico ya esta en el titulo.
  void regionName;
  return `Mueve ${s} con cuidado, ${SLOW}.`;
}

/** A short exercise title, e.g. "Flexión · Codo". */
export function patientTitle(movement: RomMovement, regionName: string): string {
  return `${movement.name} · ${regionName}`;
}
