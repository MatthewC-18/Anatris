// src/lib/phaseLead.ts
//
// EL TITULAR DE UNA FASE, SACADO DE SU PROPIO TEXTO.
//
// El margen izquierdo del laboratorio ensenaba la descripcion entera de la fase
// (hasta 8 lineas a la vista) y el usuario lo veia "aglomerado": nadie lee un
// parrafo mientras el cuerpo se mueve. El rediseno pone UNA frase grande, la
// idea de la fase, y el resto detras de "Seguir leyendo".
//
// La frase NO se escribe aparte: es la primera oracion de la descripcion, que
// ya esta revisada y citada. Escribir 73 titulares nuevos seria contenido
// clinico nuevo sin revisar (regla de la casa: sin cifra ni frase defendible no
// se inventa). Medido sobre las 73 fases (las de `labReverse` incluidas): la
// primera oracion tiene una mediana de 122 caracteres, pero 18 pasan de 150 y
// la mas larga tiene 298. A 18 px en una columna de 344 px eso son diez lineas:
// no es un titular. Esas se cortan en su primera pausa fuerte (dos puntos, punto
// y coma o un parentesis) a partir del caracter 40, que es donde el texto ya ha
// dicho su idea y empieza a explicarla. En la abduccion del hombro:
//
//   "El supraespinoso y el deltoides se activan JUNTOS desde el primer grado"
//   "Pasados los 90° la actividad del deltoides empieza a descender mientras el
//    brazo sigue subiendo"
//
// Cuando hay corte, el titular acaba en puntos suspensivos y debajo asoma UNA
// linea de lo que sigue, empezando tambien por puntos suspensivos ("...(~120°),
// de modo que..."): se lee como continuacion y no como otra frase. "Seguir
// leyendo" abre el resto entero desde el corte.

/** Por encima de esto la primera oracion ya no es un titular. */
export const LEAD_MAX = 150;
/** Un corte antes de esto dejaria un titular sin idea ("El supraespinoso"). */
export const LEAD_MIN_CUT = 40;

export interface PhaseLead {
  /** La frase grande: un prefijo literal de la descripcion. */
  lead: string;
  /** Lo que sigue al titular, desde el corte (vacio si no queda nada). */
  rest: string;
  /** El titular se corto antes del final de su oracion. */
  cut: boolean;
}

/**
 * Fin de la primera oracion: un punto, cierre de exclamacion o de interrogacion
 * seguido de un espacio y una MAYUSCULA (o de nada). La mayuscula evita cortar
 * en "p. ej. el" o en "aprox. 30°"; el espacio, en "1.5".
 */
function firstSentenceEnd(text: string): number {
  const re = /[.!?](?=\s+[A-ZÁÉÍÓÚÑ¿¡"«(]|\s*$)/g;
  const m = re.exec(text);
  return m ? m.index + 1 : text.length;
}

/** El titular de una fase y lo que queda detras de "Seguir leyendo". */
export function phaseLead(description: string): PhaseLead {
  const text = description.trim();
  if (!text) return { lead: '', rest: '', cut: false };
  const end = firstSentenceEnd(text);
  const first = text.slice(0, end).trim();
  if (first.length <= LEAD_MAX) {
    return { lead: first, rest: text.slice(end).trim(), cut: false };
  }
  // La primera pausa fuerte a partir del caracter 40.
  const tail = first.slice(LEAD_MIN_CUT);
  const pausa = tail.search(/:|;|\s\(/);
  if (pausa < 0) return { lead: first, rest: text.slice(end).trim(), cut: false };
  const at = LEAD_MIN_CUT + pausa;
  const lead = first
    .slice(0, at)
    .replace(/[\s,]+$/, '')
    .trim();
  // Lo que sigue empieza en el corte; los dos puntos o el punto y coma del
  // corte no se repiten (el parentesis si: es parte de lo que se dice).
  const rest = text
    .slice(at)
    .replace(/^\s*[:;]\s*/, '')
    .trim();
  return { lead, rest, cut: true };
}
