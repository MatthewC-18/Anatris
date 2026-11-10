// EL UNIVERSO DE MUSCULOS, REGION POR REGION.
//
// El laboratorio resuelve cada `muscleId` contra los nombres de malla del rig
// con el universo de `useAllMuscles`: hombro gratuito + payload de LA REGION
// ABIERTA + el suelo minimo. Si un panel nombra un id que no esta en ese
// universo, no pasa nada visible: el play se pulsa, la articulacion se mueve y
// NO SE ENCIENDE NINGUN MUSCULO. Sin excepcion y sin aviso.
//
// Eso es lo que pasaba con los demos de miotoma. El panel Neuro no es por
// region sino por EXTREMIDAD --el juego cervical sirve a hombro, codo y
// cervical; el lumbosacro a cadera, rodilla, tobillo y lumbar--, asi que una
// raiz nombra fichas de otra region: C6 el braquiorradial (codo), L3 el
// cuadriceps (rodilla), L2 el psoas (cadera). Medido contra las 942 mallas
// vivas de capa muscular del GLB, 22 de las 40 acreditaciones de miotoma no
// encendian ni una malla: lumbar 7/7, tobillo 7/7, cadera 6/7, cervical 1/4,
// hombro 1/4.
//
// `labMuscleUniverse.test.ts` vigila que NADIE construya el universo con el
// registro estatico. Esta prueba vigila lo otro: que el universo que si se
// construye CONTENGA lo que cada region nombra. Las mallas las comprueba
// `npm run audit-glow`, que carga el GLB; aqui se comprueba el dato.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MINIMO_RESOLUBLE } from '../useMuscleResolution';
import { shoulderMuscles } from '../../data/muscles/shoulder';
import { FREE_REGIONS } from '../../auth/entitlements';
import {
  ALL_MUSCLES_BY_REGION,
  ALL_REGION_IDS,
  ALL_ROM_LOOKUP_BY_REGION,
} from '../../data/fullContent';
import { NEURO_BY_REGION } from '../../data/neuro';
import type { Muscle } from '../../types/muscle';

/** Toda ficha del catalogo, una por id. */
const CATALOGO = new Map<string, Muscle>();
for (const list of Object.values(ALL_MUSCLES_BY_REGION)) {
  for (const m of list) if (!CATALOGO.has(m.id)) CATALOGO.set(m.id, m);
}

const LIBRE = new Set(shoulderMuscles.map((m) => m.id));

/**
 * Lo que una region tiene SIN el suelo: el nivel gratuito mas lo que viaja en
 * su payload (`romLookupMuscles`, que es lo que lee `allLoadedPremiumMuscles`).
 * Para una region gratuita no hay payload que cargar.
 */
function sinSuelo(region: string): Set<string> {
  if (FREE_REGIONS.has(region)) return new Set(LIBRE);
  return new Set([
    ...LIBRE,
    ...(ALL_ROM_LOOKUP_BY_REGION[region] ?? ALL_MUSCLES_BY_REGION[region] ?? []).map(
      (m) => m.id,
    ),
  ]);
}

/** Los ids que los demos de miotoma de esta region encienden. */
function idsDeMiotoma(region: string): string[] {
  const out: string[] = [];
  for (const root of NEURO_BY_REGION[region]?.roots ?? []) {
    for (const id of root.demo?.highlightMuscleIds ?? []) out.push(id);
  }
  return out;
}

describe('el suelo siempre resoluble', () => {
  it('cubre toda ficha que un demo de miotoma nombra y su region no tiene', () => {
    const suelo = new Set(MINIMO_RESOLUBLE.map((m) => m.id));
    const faltan: string[] = [];
    for (const region of ALL_REGION_IDS) {
      const tiene = sinSuelo(region);
      for (const id of idsDeMiotoma(region)) {
        if (!tiene.has(id) && !suelo.has(id)) faltan.push(`${region} -> ${id}`);
      }
    }
    expect(
      [...new Set(faltan)],
      'anade estas fichas a MINIMO_RESOLUBLE (src/hooks/useMuscleResolution.ts): ' +
        'su demo de miotoma se pulsa y no enciende nada',
    ).toEqual([]);
  });

  it('no inventa datos: nombre, latino y bases salen de la ficha de verdad', () => {
    // El suelo es una COPIA a mano (no puede importar los ficheros de pago, eso
    // volveria a meter la biblioteca en el paquete publico), asi que lo que
    // vigila que no se desvie es esta comprobacion.
    const malos: string[] = [];
    for (const m of MINIMO_RESOLUBLE) {
      const real = CATALOGO.get(m.id);
      if (!real) {
        malos.push(`${m.id}: no existe en ningun catalogo`);
        continue;
      }
      if (real.name !== m.name) malos.push(`${m.id}: nombre "${m.name}" != "${real.name}"`);
      if (real.latin !== m.latin) malos.push(`${m.id}: latino "${m.latin}" != "${real.latin}"`);
      if (JSON.stringify(real.meshBases) !== JSON.stringify(m.meshBases)) {
        malos.push(`${m.id}: bases ${JSON.stringify(m.meshBases)} != ${JSON.stringify(real.meshBases)}`);
      }
    }
    expect(malos).toEqual([]);
  });

  it('y NO lleva contenido de pago', () => {
    // El muro de pago: el suelo va en el paquete publico, asi que puede llevar
    // el nombre y las bases de malla (el GLB se sirve publico) y nada mas. El
    // origen, la insercion, la inervacion, las raices, las acciones y la nota
    // clinica llegan con el payload de la region, tras el control de acceso.
    for (const m of MINIMO_RESOLUBLE) {
      expect(m.origin, m.id).toBe('');
      expect(m.insertion, m.id).toBe('');
      expect(m.innervation, m.id).toBe('');
      expect(m.roots, m.id).toEqual([]);
      expect(m.actions, m.id).toEqual([]);
      expect(m.clinicalNote, m.id).toBeUndefined();
    }
  });
});

describe('el payload de cada region premium', () => {
  it('carga las fichas que sus paneles nombran, incluidas las prestadas', () => {
    // Esta es la via que da la ficha COMPLETA al que paga: el suelo solo sabe
    // el nombre. La compone `scripts/build-premium-content.mts` en
    // `romLookupMuscles`; aqui se comprueba contra el JSON escrito, que es lo
    // que la funcion `content` sirve de verdad.
    const faltan: string[] = [];
    for (const region of ALL_REGION_IDS) {
      if (FREE_REGIONS.has(region)) continue;
      const payload = leerPayload(region);
      if (!payload) {
        faltan.push(`${region}: falta el payload, corre "npm run build-premium-content"`);
        continue;
      }
      const tiene = new Set([
        ...LIBRE,
        ...(payload.romLookupMuscles ?? payload.muscles ?? []).map((m) => m.id),
      ]);
      for (const id of idsDeMiotoma(region)) {
        if (!tiene.has(id)) faltan.push(`${region} -> ${id}`);
      }
    }
    expect(
      [...new Set(faltan)],
      'el payload de la region no trae la ficha: corre "npm run build-premium-content"',
    ).toEqual([]);
  });
});

function leerPayload(
  region: string,
): { muscles?: Muscle[]; romLookupMuscles?: Muscle[] } | null {
  try {
    return JSON.parse(
      readFileSync(
        resolve(__dirname, `../../../supabase/functions/content/payloads/${region}.json`),
        'utf8',
      ),
    );
  } catch {
    return null;
  }
}
