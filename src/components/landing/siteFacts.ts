// src/components/landing/siteFacts.ts
//
// LO QUE EL SITIO PROMETE, EN UN SOLO SITIO Y BAJO TEST.
//
// La landing, Precios y el muro de pago imprimen cifras y listas de lo que
// incluye cada plan. Estaban escritas a mano en tres ficheros, con una nota que
// pedia "recontar a mano cuando una region gane contenido" y otra que pedia
// "mantener las dos listas sincronizadas". Medido el 11 nov 2026, ninguna de
// las tres cosas se habia mantenido:
//
//   - La landing decia 79 tests ortopedicos. Son 80 (14 hombro, 8 codo, 9
//     cadera, 11 rodilla, 5 tobillo, 12 cervical, 10 toracica, 11 lumbar).
//   - La landing decia 113 musculos. 113 es la suma de las listas por region;
//     once musculos biarticulares estan en dos (biceps y triceps en hombro y
//     codo, recto femoral en cadera y rodilla, gemelos en rodilla y tobillo...).
//     Musculos distintos hay 102.
//   - Precios decia "17 musculos" del hombro. La lista tiene 18.
//   - La landing decia que CADA maniobra trae sensibilidad, especificidad y
//     demostracion en 3D. De las 80, 51 tienen las dos cifras publicadas (las
//     demas van sin cifra, que es la regla de la casa: no se inventa) y 58 se
//     demuestran sobre el modelo.
//   - El muro de pago listaba 5 de las 7 cosas que Precios promete: se dejaba
//     el panel neurologico y la evidencia.
//
// En una pagina que vende rigor, una cifra que no cuadra con lo que el lector
// puede contar dentro pone en duda las clinicas. Asi que ahora viven aqui, y
// `__tests__/siteFacts.test.ts` las recuenta contra los datos en cada
// ejecucion: si alguien anade un test o un musculo, el test dice que numero
// hay que escribir.
//
// SIN IMPORTAR LOS DATOS, a proposito: este modulo va en el trozo de entrada
// (lo usa la landing) y traer los registros aqui devolveria la biblioteca de
// pago al paquete publico. Los numeros se escriben; el test los comprueba.

import type { PremiumFeature } from '../../auth/entitlements';

/** Cifras que la landing imprime. Cada una se recuenta en el test. */
export const SITE_FACTS = {
  /** Entradas del selector de region, con la columna como una sola. */
  regions: 6,
  /** Musculos DISTINTOS con ficha (ids unicos entre todas las regiones). */
  muscles: 102,
  /** Musculos de la region gratuita (el hombro). */
  shoulderMuscles: 18,
  /** Tests ortopedicos, todos con su cita. */
  tests: 80,
  /** Tests con sensibilidad Y especificidad publicadas. */
  testsWithBothFigures: 51,
  /** Tests que se demuestran sobre el modelo 3D. */
  testsWithDemo: 58,
} as const;

/**
 * Una linea de la promesa de Premium y la parte del contrato que cubre:
 * capacidades de src/auth/entitlements.ts, o `regions` para el acceso por
 * region. El test exige que entre todas cubran el contrato entero y que
 * ninguna prometa algo que el contrato no nombra.
 */
export interface PromiseLine {
  text: string;
  covers: readonly (PremiumFeature | 'regions')[];
}

/** Lo que abre Premium. Lo leen Precios y el muro de pago: una sola lista. */
export const PREMIUM_PROMISE: readonly PromiseLine[] = [
  {
    text: 'Tests ortopédicos: sensibilidad, especificidad, nomograma de Fagan, clusters, modo examen y maniobras resistidas en 3D',
    covers: ['orthopedic-tests'],
  },
  {
    text: 'Laboratorio de movimiento completo, con todos los arcos y los presets patológicos',
    covers: ['movement-full', 'pathologies'],
  },
  {
    text: 'Modo paciente a pantalla completa y tarjeta imprimible para llevarse a casa',
    covers: ['patient-mode'],
  },
  {
    text: 'Panel neurológico: dermatomas, miotomas y reflejos por raíz',
    covers: ['neuro'],
  },
  {
    text: 'Todas las regiones: codo, cadera, rodilla, tobillo y columna',
    covers: ['regions'],
  },
  {
    text: 'Evidencia clínica enlazada a los estudios originales',
    covers: ['evidence'],
  },
  {
    text: 'Progreso sincronizado en todos tus dispositivos',
    covers: ['sync'],
  },
];

/** Lo que trae el plan gratuito. */
export const FREE_PROMISE: readonly string[] = [
  `Región del hombro completa: ${SITE_FACTS.shoulderMuscles} músculos con su ficha clínica y sus citas`,
  'Módulo de Fundamentos',
  'Repaso espaciado, cuestionarios y tarjetas del hombro',
  'Laboratorio de movimiento en demostración, con un arco',
];
