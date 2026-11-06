// src/lib/caseDistractors.ts
//
// ¿SE PUEDE RESPONDER UN PASO SIN RAZONAR?
//
// Los casos ya sobrevivieron a un defecto de esta familia: la opción correcta
// era la `a` en los 38 pasos de los 15 casos, así que el ejercicio se aprobaba
// pulsando siempre el primer botón. Eso se arregló en la vista (caseOptions.ts
// desordena), y esto es la SEGUNDA mitad del mismo problema, la que desordenar
// no toca.
//
// Mira un paso así, del caso C6 de cervical:
//
//   «¿Qué prueba reproduce el dolor radicular al cerrar el foramen?»
//     Spurling (correcta) | Thomas | McMurray | Jobe
//
// Thomas es de CADERA, McMurray de RODILLA, Jobe de HOMBRO. El estudiante está
// en la región cervical, mirando un cuello. Una opción pertenece a la parte del
// cuerpo que tiene en pantalla y tres no, así que la respuesta sale gratis: sin
// dermatoma, sin mecanismo, sin razonar. Y peor: la explicación gasta sus
// palabras diciendo de qué parte del cuerpo son las otras tres, trivia
// anatómica en lugar de la discriminación clínica que el paso venía a enseñar.
//
// El distractor honrado es otra prueba de la MISMA región que un estudiante
// podría elegir razonablemente y que es incorrecta para ESTA presentación: la
// distracción cervical (que ALIVIA el dolor radicular en vez de reproducirlo),
// el ULNT mediano (mecanosensibilidad neural, no cierre foraminal), el
// Sharp-Purser (inestabilidad cervical alta, otra pregunta). Así el paso hay
// que razonarlo y la explicación puede enseñar la diferencia.
//
// Esto vive en una función pura, como caseOptions, porque el fallo es invisible
// mirando la pantalla: cada pregunta, por separado, parece perfectamente bien.

import type { CaseStep } from '../types/clinicalCase';
import type { OrthopedicTest } from '../types/orthopedicTest';

/** Una prueba nombrada en un texto, y la región a la que pertenece. */
export interface NamedTest {
  region: string;
  testName: string;
}

interface Needle {
  needle: string;
  region: string;
  testName: string;
}

/** Minúsculas, sin tildes, la puntuación convertida en espacios. */
export function normalizeLabel(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Palabras que van en mayúscula pero no son el nombre de nadie.
 *
 * Hace falta porque el detector busca EPÓNIMOS, y en castellano clínico medio
 * rótulo empieza con una palabra en mayúscula que describe la maniobra en vez
 * de nombrarla.
 */
const NOT_A_NAME = new Set([
  'test', 'prueba', 'maniobra', 'signo', 'estres', 'cajon', 'compresion',
  'distraccion', 'rotacion', 'flexion', 'extension', 'elevacion', 'percusion',
  'expansion', 'aduccion', 'abduccion', 'inclinacion', 'tension', 'arco',
  'lata', 'brazo', 'press', 'aprension', 'recolocacion', 'sorpresa', 'dolor',
  'empuje', 'insuficiencia', 'inestabilidad', 'pivot', 'moving', 'lift',
  'belly', 'drop', 'joint', 'passive', 'posterior', 'anterior', 'valgus',
  'varus', 'squeeze', 'talar', 'inversion', 'external', 'upper', 'cervical',
  'transverse', 'alar', 'reflejo', 'golfer', 'resisted', 'figura', 'log',
  'straight', 'crossed', 'reverse', 'prone', 'thigh', 'sacral', 'closed',
  'supine', 'chest', 'elevated', 'hyperabduction', 'seated', 'rib', 'painful',
  'empty', 'active', 'palm', 'cross', 'scarf', 'relocation', 'apprehension',
  'surprise', 'compression', 'distraction', 'gapping', 'slr', 'xslr', 'ple',
  'pit', 'east', 'erls', 'rom', 'ultt', 'ulnt',
]);

/**
 * Construye las agujas con las que se reconoce una prueba en un texto libre.
 *
 * Dos clases, y hacen falta las dos:
 *   - el rótulo entero, normalizado («cajon anterior de tobillo»), para las
 *     pruebas que se llaman como su maniobra;
 *   - sus EPÓNIMOS: las palabras en mayúscula que no son la primera del rótulo
 *     («Thomas» de «Prueba de Thomas», «Lasègue», «Jobe»), más los acrónimos en
 *     mayúsculas enteras («FADIR», «FABER»). Una opción escribe «Test de
 *     Thomas» mientras el dato dice «Prueba de Thomas», así que ninguna
 *     coincidencia de rótulo completo se dispararía nunca.
 *
 * La primera versión usaba TODAS las palabras de cuatro letras o más y era
 * inútil de la manera ruidosa: «ligamento» apuntaba a la biblioteca cervical,
 * así que el «Ligamento cruzado anterior» del caso de rodilla salía como una
 * prueba cervical. Una aguja o es específica o es ruido.
 */
export function buildTestNeedles(
  testsByRegion: Record<string, OrthopedicTest[]>,
): (text: string) => NamedTest[] {
  const needles: Needle[] = [];
  for (const [region, list] of Object.entries(testsByRegion)) {
    for (const t of list) {
      for (const label of [t.name, ...(t.aka ?? [])]) {
        const whole = normalizeLabel(label);
        if (whole.includes(' ')) needles.push({ needle: whole, region, testName: t.name });
        const words = label.split(/[\s/(),]+/).filter(Boolean);
        words.forEach((w, i) => {
          const n = normalizeLabel(w);
          if (n.length < 4 || NOT_A_NAME.has(n)) return;
          // Un nombre, no una descripción: en mayúscula inicial y nunca la
          // primera palabra del rótulo (que casi siempre es Test / Prueba /
          // Signo). Un acrónimo en mayúsculas enteras sí vale de primera.
          const isAcronym = w === w.toUpperCase() && /[A-Z]/.test(w);
          if (i === 0 && !isAcronym) return;
          if (!/^[A-ZÁÉÍÓÚÑ]/.test(w)) return;
          needles.push({ needle: n, region, testName: t.name });
        });
      }
    }
  }

  // Una aguja compartida por dos regiones no dice nada sobre la región, así que
  // se descarta. «Estrés en valgo» existe en rodilla y en codo: correcto.
  const byNeedle = new Map<string, Set<string>>();
  for (const n of needles) {
    const set = byNeedle.get(n.needle) ?? new Set<string>();
    set.add(n.region);
    byNeedle.set(n.needle, set);
  }
  const usable = needles.filter((n) => (byNeedle.get(n.needle)?.size ?? 0) === 1);

  return (text: string): NamedTest[] => {
    const hay = normalizeLabel(text);
    const hits: Needle[] = [];
    for (const n of usable) {
      // Palabras completas, para que «mill» no salte dentro de «millones».
      if (!new RegExp(`(^| )${n.needle}( |$)`).test(hay)) continue;
      hits.push(n);
    }
    // UN ROTULO QUE CONTIENE A OTRO SE QUEDA SOLO CON EL LARGO. El codo tiene
    // «Estrés en valgo del codo» y la rodilla «Estrés en valgo», que es prefijo
    // del primero: sin esto, la opcion del codo salia como prueba de codo Y de
    // rodilla, y un paso de codo con cuatro distractores de codo pasaba por
    // mezclado.
    const kept = hits.filter(
      (h) => !hits.some((o) => o !== h && o.needle.length > h.needle.length && o.needle.includes(h.needle)),
    );
    const out = new Map<string, string>();
    for (const n of kept) out.set(n.region, n.testName);
    return [...out].map(([region, testName]) => ({ region, testName }));
  };
}

/** Lo medido de un paso: qué región nombra cada opción. */
export interface StepDistractorReading {
  /** Un paso está en juego cuando la MITAD o más de sus opciones nombra una prueba. */
  asksForATest: boolean;
  /** Cuántas opciones nombran una prueba de la región del caso. */
  sameRegion: number;
  total: number;
  /** La correcta es de la región. */
  correctIsSameRegion: boolean;
  /** Por opción, en el orden autoral. */
  options: { correct: boolean; text: string; named: NamedTest[] }[];
  /**
   * Falla cuando la correcta es la ÚNICA opción de la región: entonces basta
   * mirar de qué parte del cuerpo es cada opción.
   */
  answerableByRegionAlone: boolean;
}

export function readStepDistractors(
  step: CaseStep,
  caseRegion: string,
  namedTestsIn: (text: string) => NamedTest[],
): StepDistractorReading {
  const options = step.options.map((o) => ({
    correct: o.correct,
    text: o.text,
    named: namedTestsIn(o.text),
  }));
  const naming = options.filter((o) => o.named.length > 0).length;
  const asksForATest = naming >= Math.ceil(step.options.length / 2);
  const sameRegion = options.filter((o) => o.named.some((n) => n.region === caseRegion)).length;
  const correctIsSameRegion = options.some(
    (o) => o.correct && o.named.some((n) => n.region === caseRegion),
  );
  return {
    asksForATest,
    sameRegion,
    total: step.options.length,
    correctIsSameRegion,
    options,
    answerableByRegionAlone: asksForATest && correctIsSameRegion && sameRegion === 1,
  };
}
