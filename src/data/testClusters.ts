// src/data/testClusters.ts
//
// CUANDO EL CONJUNTO DE PRUEBAS SE HA MEDIDO, NO HAY QUE CALCULARLO.
//
// El panel permite marcar varias pruebas como positivas a la vez y estima la
// probabilidad combinada multiplicando sus razones de verosimilitud. Es una
// aproximacion docente y el propio panel lo avisa, porque esa multiplicacion
// supone que las pruebas son independientes entre si.
//
// En la sacroiliaca esa suposicion es justo lo contrario de lo que dice la
// literatura. Laslett (2005, 48 pacientes, bloqueo anestesico intraarticular
// como patron de referencia) estudio las pruebas sueltas Y sus combinaciones, y
// su conclusion es que las sueltas no sirven: lo que sirve es el conjunto. Como
// midio ese conjunto, multiplicar las razones de verosimilitud de cinco pruebas
// que provocan la MISMA articulacion inflaria la probabilidad hasta un numero
// que ningun estudio respalda.
//
// Asi que cuando existe una cifra medida para el conjunto, se muestra esa.
//
// Para anadir un conjunto hacen falta las dos cosas: las pruebas que lo forman
// (por su `id`) y el umbral de positivas con el que se midio. Sin las dos, el
// panel sigue con su estimacion y su aviso.

import type { StudyCitation } from '../types/orthopedicTest';

/** Un conjunto de pruebas cuya precision COMBINADA se ha medido. */
export interface TestCluster {
  /** Id estable. */
  id: string;
  /** Region a la que pertenece, igual que en las pruebas. */
  region: string;
  /** Nombre corto para la cabecera del bloque. */
  name: string;
  /** Pruebas que forman el conjunto, por su `id`. */
  tests: string[];
  /**
   * Cuantas positivas hacen falta para que la cifra medida sea aplicable.
   *
   * Por debajo de este umbral el conjunto NO se aplica: el estudio no midio esa
   * situacion y el panel vuelve a su estimacion con su aviso.
   */
  minPositive: number;
  /**
   * Sensibilidad y especificidad del conjunto, TAL COMO LAS PUBLICA LA FUENTE.
   *
   * Opcionales porque hay conjuntos reales de los que la fuente no las publica.
   * El de Wainner para la radiculopatia cervical es el caso: su resumen da la
   * razon de verosimilitud positiva del conjunto de cuatro variables (30,3) y
   * nada mas. Obligar a rellenarlas habria exigido inventarlas o dejar el
   * conjunto fuera, y dejarlo fuera significa que el panel multiplica las cuatro
   * razones sueltas --que es justo el error que este fichero existe para evitar.
   */
  sensitivity?: number;
  specificity?: number;
  /**
   * Razon de verosimilitud positiva del conjunto, cuando la fuente la da
   * directamente. Tiene PRIORIDAD sobre sensitivity/specificity: es la cifra
   * publicada y no una derivada.
   */
  lrPositive?: number;
  /** Lo que hay que saber para no usarlo mal. */
  note: string;
  /** De donde sale la cifra. */
  cite: StudyCitation[];
}

export const TEST_CLUSTERS: TestCluster[] = [
  {
    id: 'si-laslett',
    region: 'lumbar',
    name: 'Conjunto sacroilíaco de Laslett',
    // Son cinco entradas en la aplicación y seis pruebas en el estudio, porque
    // allí el Gaenslen cuenta una vez por cada lado.
    tests: [
      'si-distraction',
      'si-thigh-thrust',
      'si-compression',
      'si-sacral-thrust',
      'si-gaenslen',
    ],
    minPositive: 3,
    sensitivity: 94,
    specificity: 78,
    note: 'Cifra MEDIDA del conjunto, no calculada: tres o más positivas de seis dan 94% de sensibilidad y 78% de especificidad frente a bloqueo anestésico intraarticular (Laslett, 48 pacientes). Aquí no vale multiplicar razones de verosimilitud, porque las cinco provocan la MISMA articulación y no son independientes. El otro extremo también está medido y es el más útil en consulta: cuando las seis pruebas son negativas, la sacroilíaca queda descartada como origen del dolor.',
    cite: [
      {
        ref: 'laslett-2005',
        verified: true,
        locator: 'Resumen: 3 o más de 6 positivas, 94% / 78%',
      },
    ],
  },
  {
    id: 'cervical-wainner',
    region: 'cervical',
    name: 'Conjunto de Wainner (radiculopatía cervical)',
    // Las cuatro variables del clúster, que ya estaban en la aplicación como
    // pruebas sueltas y las cuatro citando a Wainner.
    tests: ['spurling', 'cervical-distraction', 'ulnt-median', 'cervical-rotation-limit'],
    minPositive: 4,
    // SIN sensibilidad ni especificidad A PROPÓSITO: el resumen de Wainner no
    // las publica para el clúster. Lo que publica es la razón de verosimilitud,
    // y es la que se muestra.
    lrPositive: 30.3,
    note: 'Cifra MEDIDA del conjunto: con las CUATRO variables positivas, la razón de verosimilitud positiva es 30,3 (Wainner 2003, 82 pacientes, frente a electrodiagnóstico). No se muestran sensibilidad ni especificidad del conjunto porque la fuente no las publica. Aquí multiplicar las razones sueltas sobreestima: las cuatro exploran la misma radiculopatía y no son independientes. Dos advertencias del propio estudio: los intervalos de confianza de todas sus razones son amplios, y los autores piden validar el clúster en otra muestra antes de usarlo como regla.',
    cite: [
      {
        ref: 'wainner-2003',
        verified: true,
        locator: 'Resumen: clúster de 4 variables, LR+ 30,3 (sin sens/esp publicadas)',
      },
    ],
  },
];

/** Conjuntos de una región. */
export function clustersForRegion(region: string): TestCluster[] {
  return TEST_CLUSTERS.filter((c) => c.region === region);
}

/**
 * El conjunto medido que cubre una seleccion de pruebas, si lo hay.
 *
 * Exige que TODAS las marcadas pertenezcan al conjunto -- si el usuario mezcla
 * una prueba de otra cosa, la cifra del estudio ya no describe lo que tiene
 * delante -- y que se alcance el umbral con el que se midio.
 */
export function measuredCluster(
  region: string,
  selected: Iterable<string>,
): TestCluster | null {
  const ids = [...selected];
  if (!ids.length) return null;
  for (const c of clustersForRegion(region)) {
    if (ids.length < c.minPositive) continue;
    if (ids.every((id) => c.tests.includes(id))) return c;
  }
  return null;
}
