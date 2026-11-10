// EL PANEL NO PUBLICA CERTEZAS, NI EN UN SENTIDO NI EN EL OTRO.
//
// El bloque de Fagan coge la probabilidad pre-test del deslizador y devuelve la
// posterior con un decimal: es lo que mas autoridad aparenta de todo el panel.
// Y por dos veces ha publicado una certeza absoluta a partir de una serie de
// decenas de pacientes, una por cada extremo de la razon de verosimilitud:
//
//   - ESPECIFICIDAD 100%  ->  LR+ infinita  ->  "1% -> 100%". Corregido en su
//     dia devolviendo null y explicandolo en palabras.
//   - SENSIBILIDAD 100%   ->  LR- = 0       ->  "30% -> 0%" y "LR- 0.00". Este
//     se quedo sin guardar, porque cero ES finito y `isFinite` lo dejaba pasar.
//     Medido sobre el payload que se sirve (payloads/elbow.json), el moving
//     valgus stress --sensibilidad 100% por 17 de 17 pacientes en O'Driscoll
//     2005-- daba 0,0% de probabilidad post-test desde CUALQUIER pre-test: 10,
//     30, 70 y 90 por ciento. Es decir, un negativo descartaba la rotura del
//     ligamento colateral cubital con certeza absoluta.
//
// Asi que esto no vigila una funcion, vigila la REGLA: ninguna prueba del
// catalogo, con ninguna probabilidad previa, puede acabar en 0% ni en 100%.
// Cuando la cifra no se puede calcular, el panel imprime "s/d" y el bloque lo
// explica; eso es lo correcto y es lo que se comprueba aqui.

import { describe, expect, it } from 'vitest';
import { lrNegNum, lrPosNum, postProb, utilityBacked } from '../OrthopedicTestsPanel';
// El catalogo COMPLETO (las ocho regiones, las de pago incluidas): en
// ejecucion el panel solo trae la gratuita. Ver src/data/fullContent.ts.
import { ALL_TESTS_BY_REGION } from '../../../data/fullContent';
import type { OrthopedicTest } from '../../../types/orthopedicTest';

const TODAS: { region: string; test: OrthopedicTest }[] = Object.entries(
  ALL_TESTS_BY_REGION as Record<string, OrthopedicTest[]>,
).flatMap(([region, tests]) => tests.map((test) => ({ region, test })));

// Los cuatro extremos del deslizador y un punto medio.
const PRETESTS = [1, 10, 30, 70, 99];

describe('probabilidad post-test', () => {
  it('hay catalogo que vigilar', () => {
    expect(TODAS.length).toBeGreaterThan(50);
  });

  it('una razon de verosimilitud de 0 no se cifra, igual que una infinita', () => {
    for (const pre of PRETESTS) {
      expect(postProb(pre, 0), `LR- 0 con pre-test ${pre}%`).toBeNull();
      expect(postProb(pre, Infinity), `LR+ infinita con pre-test ${pre}%`).toBeNull();
    }
    // Y lo normal sigue funcionando.
    expect(postProb(30, 4.27)).toBeCloseTo(64.66, 1);
  });

  it('ninguna prueba del catalogo publica 0% ni 100%', () => {
    const certezas: string[] = [];
    for (const { region, test } of TODAS) {
      const lrs = [lrPosNum(test.metrics), lrNegNum(test.metrics)];
      for (const lr of lrs) {
        if (lr == null) continue;
        for (const pre of PRETESTS) {
          const post = postProb(pre, lr);
          if (post == null) continue;
          if (post <= 0 || post >= 100) {
            certezas.push(`${region}/${test.id}: LR ${lr} lleva ${pre}% a ${post}%`);
          }
        }
      }
    }
    expect(certezas).toEqual([]);
  });

  it('la prueba con sensibilidad 100% deja el negativo sin cifrar', () => {
    // El caso concreto que fallaba, por si alguien vuelve a tratar el cero como
    // un numero valido: no se exige que exista un test con sensibilidad 100,
    // pero si existe, su rama negativa no se cifra.
    const perfectas = TODAS.filter(({ test }) => test.metrics.sensitivity === 100);
    for (const { region, test } of perfectas) {
      const lrNeg = lrNegNum(test.metrics);
      expect(lrNeg, `${region}/${test.id}`).toBe(0);
      expect(postProb(30, lrNeg!), `${region}/${test.id}`).toBeNull();
    }
  });
});

describe('la etiqueta de utilidad', () => {
  // LA MISMA REGLA QUE LA AUDITORIA, desde el otro lado: el panel pinta la
  // palabra en gris cuando ninguna cifra la respalda, y `clinicalAudit` avisa
  // si en ese caso no hay `utilityBasis` que lo explique. Si las dos
  // definiciones se separan, el panel acaba gris con la auditoria en verde.
  it('la que no tiene cifra detras trae su motivo declarado', () => {
    const sinMotivo = TODAS.filter(
      ({ test }) => !utilityBacked(test) && !test.utilityBasis,
    ).map(({ region, test }) => `${region}/${test.id} (${test.utility})`);
    expect(sinMotivo).toEqual([]);
  });

  it('y hay alguna sin cifra, o esta comprobacion no comprueba nada', () => {
    const sinCifra = TODAS.filter(({ test }) => !utilityBacked(test));
    expect(sinCifra.length).toBeGreaterThan(0);
  });
});
