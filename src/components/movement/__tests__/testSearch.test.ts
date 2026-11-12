// EL BUSCADOR DEL PANEL DE TESTS ENCUENTRA CON Y SIN TILDE, Y LA ETIQUETA DE
// USO NO NIEGA UNA CIFRA QUE LA FILA ENSENA.
//
// 1. El buscador comparaba en minusculas pero con las tildes puestas. Quien
//    escribe como se escribe en un buscador ("aprehension", "cubital",
//    "lumbar") no encontraba "Prueba de aprehensión" ni "Neuropatía del
//    cubital": la lista quedaba vacia con la prueba delante. MEDIDO sobre el
//    catalogo entero (las 80 pruebas de las ocho regiones): 66 llevan alguna
//    tilde en el nombre, el alias, la estructura o el grupo, y 41 en el propio
//    nombre. Es decir, la mitad de los nombres no se encontraban escritos sin
//    tilde.
//
// 2. El titulo de una etiqueta sin respaldo decia siempre "sin sensibilidad
//    ni especificidad publicadas". De las 13 pruebas cuya etiqueta no tiene la
//    cifra que la sostiene, dos SI publican una de las dos (elbow/tinel-cubital,
//    sensibilidad 70; hip/hip-faber, sensibilidad 82): el titulo negaba el
//    "Se 82" de la misma fila.

import { describe, expect, it } from 'vitest';
import { testMatchesQuery, unbackedTip, utilityBacked } from '../OrthopedicTestsPanel';
// El catalogo COMPLETO (las ocho regiones, las de pago incluidas): en
// ejecucion el panel solo trae la gratuita. Ver src/data/fullContent.ts.
import { ALL_TESTS_BY_REGION } from '../../../data/fullContent';
import type { OrthopedicTest } from '../../../types/orthopedicTest';

const TODAS: OrthopedicTest[] = Object.values(
  ALL_TESTS_BY_REGION as Record<string, OrthopedicTest[]>,
).flat();

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

describe('el buscador de pruebas', () => {
  it('hay catalogo con tildes que vigilar', () => {
    const conTilde = TODAS.filter((t) => sinTildes(t.name) !== t.name);
    // 41 de 80 el dia que se midio; si baja a cero, esto ya no prueba nada.
    expect(conTilde.length).toBeGreaterThan(20);
  });

  it('encuentra cada prueba por su nombre escrito SIN tildes', () => {
    const perdidas = TODAS.filter((t) => !testMatchesQuery(t, sinTildes(t.name))).map(
      (t) => `${t.region}/${t.id}`,
    );
    expect(perdidas).toEqual([]);
  });

  it('y CON tildes, y sin importar mayusculas', () => {
    const perdidas = TODAS.filter(
      (t) => !testMatchesQuery(t, t.name) || !testMatchesQuery(t, t.name.toUpperCase()),
    ).map((t) => `${t.region}/${t.id}`);
    expect(perdidas).toEqual([]);
  });

  it('busca tambien por estructura, grupo y alias', () => {
    const t = TODAS.find((x) => (x.aka ?? []).length > 0)!;
    expect(testMatchesQuery(t, t.aka![0])).toBe(true);
    expect(testMatchesQuery(t, sinTildes(t.category))).toBe(true);
    expect(testMatchesQuery(t, sinTildes(t.target))).toBe(true);
  });

  it('una busqueda vacia o de espacios no filtra', () => {
    expect(TODAS.every((t) => testMatchesQuery(t, '   '))).toBe(true);
  });

  it('y lo que no esta no aparece', () => {
    expect(TODAS.some((t) => testMatchesQuery(t, 'zzzz-no-existe'))).toBe(false);
  });
});

describe('el titulo de una etiqueta sin respaldo', () => {
  const sinRespaldo = TODAS.filter((t) => !utilityBacked(t));

  it('hay etiquetas sin respaldo, y alguna con una sola cifra', () => {
    expect(sinRespaldo.length).toBeGreaterThan(0);
    expect(
      sinRespaldo.some((t) => (t.metrics.sensitivity == null) !== (t.metrics.specificity == null)),
    ).toBe(true);
  });

  it('no dice "ni sensibilidad ni especificidad" si la prueba publica una de las dos', () => {
    const mienten = sinRespaldo
      .filter((t) => t.metrics.sensitivity != null || t.metrics.specificity != null)
      .filter((t) => /sin sensibilidad ni especificidad/.test(unbackedTip(t)))
      .map((t) => `${t.region}/${t.id}`);
    expect(mienten).toEqual([]);
  });

  it('nombra la cifra que falta', () => {
    for (const t of sinRespaldo) {
      const tip = unbackedTip(t);
      if (t.metrics.sensitivity == null && t.metrics.specificity != null) {
        expect(tip, `${t.region}/${t.id}`).toMatch(/sin la sensibilidad/);
      }
      if (t.metrics.specificity == null && t.metrics.sensitivity != null) {
        expect(tip, `${t.region}/${t.id}`).toMatch(/sin la especificidad/);
      }
    }
  });

  it('y lleva el motivo declarado en el dato', () => {
    for (const t of sinRespaldo) {
      expect(unbackedTip(t), `${t.region}/${t.id}`).toContain(t.utilityBasis ?? '');
    }
  });
});
