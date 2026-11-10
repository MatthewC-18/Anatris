// src/data/__tests__/testClusters.test.ts
//
// QUE SE VIGILA AQUI. Un conjunto medido apunta a sus pruebas por `id`, una
// cadena suelta que el compilador no comprueba. Si alguien renombra un test o
// lo mueve de region, el conjunto deja de reconocerse en silencio: el panel
// vuelve a multiplicar razones de verosimilitud y enseña una probabilidad que
// ningun estudio respalda, sin que nada falle.
//
// Tambien se vigila que el conjunto NO se aplique por debajo de su umbral ni
// cuando se mezcla una prueba ajena, porque en esos dos casos la cifra del
// estudio ya no describe lo que el usuario tiene delante.

import { describe, expect, it } from 'vitest';
import {
  TEST_CLUSTERS,
  clusterLrPositive,
  measuredCluster,
  partialCluster,
} from '../testClusters';
import { ALL_TESTS_BY_REGION } from '../fullContent';
import { REFERENCES } from '../references';

// TODAS LAS REGIONES. Estaba cableado al lumbar porque solo habia un conjunto;
// el de Wainner es cervical, y una tabla con una sola region habria hecho
// fallar la propia comprobacion ("region sin tabla") en vez de vigilarla.
// `fullContent` es el indice de build y de test (el de ejecucion solo trae el
// nivel gratuito).
const BY_REGION: Record<string, { id: string }[]> = ALL_TESTS_BY_REGION;

describe('conjuntos de pruebas medidos', () => {
  it('hay alguno (si no, este archivo no vigila nada)', () => {
    expect(TEST_CLUSTERS.length).toBeGreaterThan(0);
  });

  it('cada prueba del conjunto existe en SU region', () => {
    const rotos: string[] = [];
    for (const c of TEST_CLUSTERS) {
      const tests = BY_REGION[c.region];
      expect(tests, `region sin tabla en el test: ${c.region}`).toBeDefined();
      for (const id of c.tests) {
        if (!tests.some((t) => t.id === id)) rotos.push(`${c.id} -> ${id}`);
      }
    }
    expect(rotos).toEqual([]);
  });

  it('el umbral cabe dentro del conjunto y las cifras son porcentajes', () => {
    for (const c of TEST_CLUSTERS) {
      expect(c.minPositive).toBeGreaterThan(1);
      expect(c.minPositive).toBeLessThanOrEqual(c.tests.length);
      if (c.sensitivity != null) {
        expect(c.sensitivity).toBeGreaterThan(0);
        expect(c.sensitivity).toBeLessThanOrEqual(100);
      }
      if (c.specificity != null) {
        expect(c.specificity).toBeGreaterThan(0);
        expect(c.specificity).toBeLessThanOrEqual(100);
      }
      if (c.lrPositive != null) expect(c.lrPositive).toBeGreaterThan(1);
    }
  });

  it('todo conjunto trae ALGUNA cifra publicada', () => {
    // Un conjunto sin cifra no sirve para nada: el panel seguiria estimando
    // multiplicando razones, que es el error que este fichero evita. Y hay dos
    // formas legitimas de traerla, porque no todas las fuentes publican lo
    // mismo: sensibilidad + especificidad (Laslett) o la razon de verosimilitud
    // a secas (Wainner, cuyo resumen no da las otras dos).
    for (const c of TEST_CLUSTERS) {
      const tieneCifra =
        c.lrPositive != null || (c.sensitivity != null && c.specificity != null);
      expect(tieneCifra, `${c.id} no publica ninguna cifra`).toBe(true);
    }
  });

  it('cada conjunto se aplica al alcanzar SU umbral y no antes', () => {
    // La version anterior solo probaba TEST_CLUSTERS[0]: anadir un conjunto
    // roto no habria hecho fallar nada.
    for (const c of TEST_CLUSTERS) {
      const justo = c.tests.slice(0, c.minPositive);
      const pocas = c.tests.slice(0, c.minPositive - 1);
      expect(measuredCluster(c.region, justo)?.id, c.id).toBe(c.id);
      expect(measuredCluster(c.region, pocas), c.id).toBeNull();
    }
  });

  it('cada cita del conjunto existe en la bibliografia', () => {
    const huerfanas: string[] = [];
    for (const c of TEST_CLUSTERS)
      for (const cite of c.cite) if (!REFERENCES[cite.ref]) huerfanas.push(`${c.id} -> ${cite.ref}`);
    expect(huerfanas).toEqual([]);
  });

  it('se aplica al alcanzar el umbral y no antes', () => {
    const c = TEST_CLUSTERS[0];
    const justo = c.tests.slice(0, c.minPositive);
    const pocas = c.tests.slice(0, c.minPositive - 1);
    expect(measuredCluster(c.region, justo)?.id).toBe(c.id);
    expect(measuredCluster(c.region, pocas)).toBeNull();
  });

  it('no se aplica si se mezcla una prueba ajena al conjunto', () => {
    const c = TEST_CLUSTERS[0];
    const ajena = (BY_REGION[c.region] ?? []).find((t) => !c.tests.includes(t.id));
    expect(ajena, 'hace falta una prueba de la region fuera del conjunto').toBeDefined();
    const mezcla = [...c.tests.slice(0, c.minPositive), ajena!.id];
    expect(measuredCluster(c.region, mezcla)).toBeNull();
  });

  it('no se aplica a una region que no es la suya', () => {
    const c = TEST_CLUSTERS[0];
    expect(measuredCluster('hombro', c.tests.slice(0, c.minPositive))).toBeNull();
  });
});

// LA CIFRA MEDIDA, MIENTRAS AUN FALTAN POSITIVAS.
//
// Por debajo del umbral el panel vuelve a su estimacion, que es la MAS
// OPTIMISTA de las dos: medido con las razones del propio catalogo, dos pruebas
// sacroiliacas marcadas dan 30% -> 79,3% (producto de LR+ 8,96) frente al
// 30% -> 64,7% que da la cifra medida de Laslett para tres o mas (LR+ 4,27). Y
// la advertencia que lo explica vivia DENTRO del bloque del conjunto medido, o
// sea que solo aparecia cuando la cifra ya era la buena. `partialCluster` es lo
// que permite ensenar la referencia antes.
describe('conjunto que aun no llega a su umbral', () => {
  it('reconoce la seleccion incompleta y deja de hacerlo al alcanzar el umbral', () => {
    for (const c of TEST_CLUSTERS) {
      const pocas = c.tests.slice(0, c.minPositive - 1);
      const justo = c.tests.slice(0, c.minPositive);
      expect(partialCluster(c.region, pocas)?.id, c.id).toBe(c.id);
      expect(partialCluster(c.region, justo), c.id).toBeNull();
      // Los dos son excluyentes: nunca se enseñan las dos cosas a la vez.
      expect(measuredCluster(c.region, pocas), c.id).toBeNull();
      expect(measuredCluster(c.region, justo)?.id, c.id).toBe(c.id);
    }
  });

  it('nada seleccionado no es un conjunto incompleto', () => {
    for (const c of TEST_CLUSTERS) expect(partialCluster(c.region, [])).toBeNull();
  });

  it('con una prueba ajena mezclada, la referencia no aplica', () => {
    const c = TEST_CLUSTERS[0];
    const ajena = (BY_REGION[c.region] ?? []).find((t) => !c.tests.includes(t.id))!;
    expect(partialCluster(c.region, [c.tests[0], ajena.id])).toBeNull();
  });

  it('la razon del conjunto es la publicada, o la derivada de sus dos cifras', () => {
    const laslett = TEST_CLUSTERS.find((c) => c.id === 'si-laslett');
    const wainner = TEST_CLUSTERS.find((c) => c.id === 'cervical-wainner');
    // Laslett publica 94/78: 94/(100-78) = 4,27.
    if (laslett) expect(clusterLrPositive(laslett)).toBeCloseTo(4.27, 2);
    // Wainner solo publica la razon, y manda sobre cualquier derivada.
    if (wainner) expect(clusterLrPositive(wainner)).toBe(30.3);
  });
});
