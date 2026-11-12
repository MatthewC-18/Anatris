// src/lib/learnTestBridge.ts
//
// EL PUENTE ENTRE EL PASO "TESTS CLINICOS" DE APRENDER Y EL PANEL DE PRUEBAS DEL
// LABORATORIO.
//
// POR QUE EXISTE. Las dos pantallas hablan de las mismas maniobras y no se
// conocian: el paso 4 de la ruta explicaba que valora la prueba de Neer, como se
// hace y que es positivo, y ahi se acababa, aunque el laboratorio tiene esa
// misma prueba con su demostracion en el modelo, su sensibilidad, su
// especificidad y el estudio del que salen. El fisio que leia la maniobra no
// tenia forma de verla.
//
// POR QUE NO BASTA CON EL ID. Las dos listas se escribieron por separado.
// Medido sobre las ocho rutas (la del hombro en el bundle y las siete de pago en
// supabase/functions/content/payloads/*.json), de las 43 pruebas del paso 4:
//   - 14 comparten id con el laboratorio (y 12 de esas 14 se llaman distinto:
//     "Prueba de Neer (pinzamiento)" en la ruta, "Test de Neer" en el panel);
//   - 14 tienen EL MISMO NOMBRE pero otro id: el laboratorio prefija o sufija la
//     region ("faber-patrick" frente a "hip-faber", "anterior-drawer" frente a
//     "anterior-drawer-knee", las cinco del tobillo);
//   - 5 son la misma maniobra con otro nombre y otro id (la tabla de abajo);
//   - 10 no estan en el laboratorio.
// Asi que se resuelve en tres pasos: id, nombre normalizado y, al final, una
// tabla de equivalencias escrita a mano.
//
// LA TABLA SOLO LLEVA LA MISMA MANIOBRA, NO UNA PARECIDA. Cada entrada se
// comprobo leyendo el `procedure` de la ruta contra el `maneuver` del panel. Se
// quedaron FUERA, a proposito: el test de flexion del codo (codo flexionado con
// la muneca en extension 1 a 3 minutos) frente a la flexion-compresion (anade
// presion sobre el nervio, 60 s, antebrazo supinado); la presion
// posteroanterior costovertebral (en prono, sobre transversas y angulos
// costales) frente a la compresion de la caja toracica (anteroposterior y
// lateral); y Yergason (supinacion resistida) frente a Speed (flexion resistida
// del hombro). Enlazarlas mandaria al fisio a demostrar otra prueba.
//
// Lo que no se resuelve no lleva enlace: el panel ignora en silencio un id que
// no conoce, y un boton que abre el laboratorio sin nada desplegado es un
// callejon sin salida.

import type { OrthopedicTest } from '../types/orthopedicTest';

/**
 * Pruebas de la ruta que son la misma maniobra que una del laboratorio con otro
 * id y otro nombre. Region -> id en la ruta -> id en el laboratorio.
 */
export const LEARN_TO_LAB_ALIAS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  shoulder: {
    // "Prueba de Jobe (lata vacia)" / "Lata vacía (Jobe)": plano escapular a
    // 90 grados, pulgar abajo, resistencia hacia abajo.
    jobe: 'empty-can',
    // "External rotation lag sign" / "Signo de retardo en rotación externa".
    'external-rotation-lag-sign': 'external-rotation-lag',
    // "Prueba de Gerber (lift-off)" / "Lift-off (Gerber)".
    'gerber-lift-off': 'lift-off',
    // "Aprensión y recolocación": la ruta describe las dos maniobras seguidas y
    // el laboratorio las tiene por separado; se abre la primera, la aprension,
    // que es desde donde se hace la recolocacion.
    'apprehension-relocation': 'apprehension',
  },
  thoracic: {
    // "Rotación torácica sentada" / "Rotación torácica en sedestación".
    'thoracic-rotation-seated': 'seated-thoracic-rotation',
  },
};

/** Nombre comparable: sin acentos, sin mayusculas y sin signos. */
export function normalizeTestName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * La prueba del laboratorio que corresponde a una prueba de la ruta de
 * Aprender, o null si el laboratorio no la tiene.
 *
 * @param region region de la ruta (las equivalencias son por region)
 * @param learn  la prueba tal como la escribe la ruta (id y nombre)
 * @param labTests las pruebas del panel de esa region (`testsForRegion`)
 */
export function labTestForLearn(
  region: string,
  learn: { id: string; name: string },
  labTests: readonly OrthopedicTest[],
): OrthopedicTest | null {
  const byId = labTests.find((t) => t.id === learn.id);
  if (byId) return byId;
  const name = normalizeTestName(learn.name);
  const byName = labTests.find((t) => normalizeTestName(t.name) === name);
  if (byName) return byName;
  const alias = LEARN_TO_LAB_ALIAS[region]?.[learn.id];
  if (alias) return labTests.find((t) => t.id === alias) ?? null;
  return null;
}
