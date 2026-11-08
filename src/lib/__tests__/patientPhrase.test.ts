// LO QUE EL PACIENTE LEE, VIGILADO POR SUS PROPIAS REGLAS.
//
// Esta frase es la única que el paciente lee en el "Modo paciente" y en la
// tarjeta exportada. El test que había aquí exigía longitud >= 12 y un punto
// final, y con eso pasaba en verde mientras las 34 frases decían cosas como
// «Separa hombro hacia el lado», «Inclina cervical hacia el lado» o «Dobla
// lumbar»: el nombre de la REGIÓN interpolado como si fuera el segmento que el
// paciente mueve. Un test que no puede fallar no vigila nada.
//
// Así que ahora se comprueba lo que de verdad define la frase:
//
//   1. CERO JERGA. Si el paciente tiene que saber qué es una abducción, la
//      frase no es para él.
//   2. NOMBRA UN SEGMENTO CON SU ARTÍCULO. Es la prueba mecánica que caza
//      exactamente el defecto viejo: en «Separa hombro...» la palabra que sigue
//      al verbo no es un artículo. El paciente no mueve una articulación, mueve
//      el brazo, la pierna, la cabeza.
//   3. Las 34 están ESCRITAS, no derivadas de una regla.

import { describe, it, expect } from 'vitest';
// Reads the FULL registry on purpose. The runtime `romByRegion` now carries
// only the free tier (premium regions are fetched behind an entitlement check),
// so iterating that one would silently shrink this test from 34 movements to 4
// and it would keep passing while covering almost nothing.
import { ALL_ROM_BY_REGION } from '../../data/fullContent';
import { REGIONS } from '../../data/regiones';
import { patientInstruction } from '../patientPhrase';

/**
 * Palabras que un paciente no tiene por qué conocer. Incluye los nombres de los
 * bloques del raquis, que es por donde entraba el defecto: el nombre de la
 * región ES el término clínico.
 */
const JERGA = [
  'abducción',
  'aducción',
  'pronación',
  'supinación',
  'flexión',
  'extensión',
  'rotación',
  'dorsiflexión',
  'plantarflexión',
  'inversión',
  'eversión',
  'glenohumeral',
  'cervical',
  'torácica',
  'torácico',
  'lumbar',
  'raquis',
  'articulación',
];

const ARTICULOS = ['el', 'la', 'los', 'las'];

describe('patientInstruction', () => {
  it('da una frase a cada uno de los 34 movimientos, y la frase acaba en punto', () => {
    const bad: string[] = [];
    // Guard against the shrink above: if a future change drops regions from the
    // full registry, fail loudly instead of quietly testing less.
    expect(Object.keys(ALL_ROM_BY_REGION).length).toBeGreaterThanOrEqual(8);
    let n = 0;
    for (const [region, movements] of Object.entries(ALL_ROM_BY_REGION)) {
      const name = REGIONS[region]?.name ?? region;
      for (const mv of movements) {
        n += 1;
        const s = patientInstruction(mv, name).trim();
        if (s.length < 20 || !s.endsWith('.')) bad.push(`${mv.id}: "${s}"`);
      }
    }
    expect(bad).toEqual([]);
    expect(n).toBe(34);
  });

  it('no usa ni una palabra de jerga clínica', () => {
    const bad: string[] = [];
    for (const [region, movements] of Object.entries(ALL_ROM_BY_REGION)) {
      const name = REGIONS[region]?.name ?? region;
      for (const mv of movements) {
        const s = patientInstruction(mv, name).toLowerCase();
        for (const w of JERGA) {
          if (s.includes(w)) bad.push(`${mv.id}: "${w}" en "${s}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('nombra el segmento con su artículo, no la articulación a secas', () => {
    // LA PRUEBA QUE CAZA EL DEFECTO VIEJO. «Separa hombro hacia el lado» pone
    // un sustantivo desnudo detrás del verbo. Se acepta el artículo detrás del
    // primer verbo, un verbo reflexivo ('Inclínate', 'Échate') o una frase que
    // abre con 'Con ...' / 'Deja ...', que es como un fisio da una instrucción
    // con punto de partida.
    const bad: string[] = [];
    for (const [region, movements] of Object.entries(ALL_ROM_BY_REGION)) {
      const name = REGIONS[region]?.name ?? region;
      for (const mv of movements) {
        const s = patientInstruction(mv, name).trim();
        const words = s.split(/\s+/);
        const first = words[0] ?? '';
        const second = (words[1] ?? '').toLowerCase();
        const ok =
          ARTICULOS.includes(second) || // «Separa el brazo...»
          /te$/.test(first) || // «Inclínate...», «Échate...»
          first === 'Con' || // «Con el codo doblado, ...»
          first === 'Deja'; // «Deja la rodilla en su sitio y ...»
        if (!ok) bad.push(`${mv.id}: "${s}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('las 34 están escritas a mano, no derivadas de una regla', () => {
    // Si alguien añade un movimiento y no le escribe su frase, la red lo salva
    // --no imprime jerga-- pero esta prueba lo dice, que es el punto.
    const genericas = ['Mueve el cuerpo', 'Dobla el cuerpo', 'Estira el cuerpo', 'Gira el cuerpo'];
    const bad: string[] = [];
    for (const [region, movements] of Object.entries(ALL_ROM_BY_REGION)) {
      const name = REGIONS[region]?.name ?? region;
      for (const mv of movements) {
        const s = patientInstruction(mv, name);
        if (genericas.some((g) => s.startsWith(g))) bad.push(`${mv.id}: "${s}"`);
      }
    }
    expect(bad).toEqual([]);
  });
});
