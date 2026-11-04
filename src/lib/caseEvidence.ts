// src/lib/caseEvidence.ts
//
// EL PUENTE ENTRE UN CASO CLINICO Y LA PRUEBA QUE LO RESUELVE.
//
// POR QUE EXISTE. Los casos eran texto y nada mas: viñeta, pregunta, cuatro
// opciones, explicacion. Quince casos, treinta y ocho pasos, todos con la misma
// forma en pantalla, y la frase que los cerraba -- "la maniobra de Jobe carga
// selectivamente al supraespinoso" -- se quedaba en una afirmacion sin respaldo
// a la vista, aunque la aplicacion YA tiene el respaldo: las 79 pruebas
// ortopedicas con su sensibilidad, su especificidad, sus razones de
// verosimilitud, el estudio del que salen y una demostracion en el rig.
//
// Un paso que nombra una prueba la ENSEÑA ahora: los numeros reales debajo de
// la explicacion y un enlace que abre el laboratorio con esa prueba desplegada.
// Es lo que separa "te lo cuento" de "mira".
//
// COMO SE NAVEGA, Y POR QUE ASI. No hay router; `App` sincroniza (region, modo)
// con la barra de direcciones y escucha `popstate`. Empujar la URL y disparar
// un `popstate` deja que ese unico camino haga el trabajo, en vez de pasar un
// callback por `StudyView` hasta `CaseView` para hacer lo mismo peor.
//
// El parametro se CONSUME: `writeRoute` conserva la query string a proposito
// (Stripe vuelve con `?checkout=success`), de modo que un `?prueba=` que no se
// borrase seguiria pegado a la URL al cambiar de region y volveria a abrir la
// prueba sin que nadie lo pidiese.

import { testsForRegion } from '../data/orthopedicTests';
import type { OrthopedicTest } from '../types/orthopedicTest';
import type { CaseStep } from '../types/clinicalCase';
import { formatRoute } from './routing';

/** Nombre del parametro de URL que abre una prueba en el laboratorio. */
export const FOCUS_TEST_PARAM = 'prueba';

/**
 * La prueba ortopedica que ilustra este paso, si la nombra y esta disponible.
 *
 * Devuelve null cuando el paso no apunta a ninguna, y tambien cuando la region
 * es de pago y su contenido todavia no ha llegado del edge function: el bloque
 * de evidencia simplemente no se dibuja, en vez de dejar un hueco roto.
 */
export function testForStep(region: string, step: CaseStep): OrthopedicTest | null {
  if (!step.showsTest) return null;
  return testsForRegion(region).find((t) => t.id === step.showsTest) ?? null;
}

/** La direccion que abre el laboratorio de una region con una prueba desplegada. */
export function labTestHref(region: string, testId: string): string {
  return `${formatRoute({ region, mode: 'movement' })}?${FOCUS_TEST_PARAM}=${encodeURIComponent(testId)}`;
}

/**
 * Lleva al laboratorio de la region con esa prueba abierta.
 *
 * `popstate` es el mismo canal que usa el boton Atras del navegador, asi que
 * `App` ya sabe reaccionar: no hace falta un segundo camino que mantener.
 */
export function goToTestInLab(region: string, testId: string): void {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', labTestHref(region, testId));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Lee el `?prueba=` de la direccion Y LO BORRA.
 *
 * Se borra con `replaceState` para no meter una entrada mas en el historial:
 * el usuario ya gasto una al llegar aqui, y volver Atras debe devolverlo al
 * caso, no a la misma pantalla sin el parametro.
 */
export function consumeFocusTest(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const id = params.get(FOCUS_TEST_PARAM);
  if (!id) return null;
  params.delete(FOCUS_TEST_PARAM);
  const q = params.toString();
  window.history.replaceState(
    {},
    '',
    window.location.pathname + (q ? `?${q}` : '') + window.location.hash,
  );
  return id;
}
