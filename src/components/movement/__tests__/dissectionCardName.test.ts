// EL TITULO DE LA TARJETA DE DISECCION, CUANDO NO HAY FICHA.
//
// `makeSelection` tiene dos salidas: con ficha, el nombre en espanol, el latino
// y la nota clinica; sin ficha, `prettifyBase` del nombre de la malla, que es
// una cadena de Blender en ingles ("Lateral head of gastrocnemius"). El panel
// pintaba las dos igual, en la misma tipografia y en el mismo sitio, asi que la
// tarjeta presentaba el nombre del modelo como si fuera el nombre clinico.
//
// Y no es un caso raro. Medido sobre las 942 mallas vivas de capa muscular del
// rig, el universo de una region resuelve entre 217 y 419 (el techo, con el
// catalogo entero, son 600): entre 183 y 343 mallas abren la tarjeta sin ficha.
//
// Se comprueba en el fuente porque el entorno de pruebas es node y no hay
// testing-library para montar el componente, igual que en
// `neuroMyotomeDemo.test.ts`.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeSelection } from '../dissectChannel';
import type { Muscle } from '../../../types/muscle';

const PANEL = readFileSync(resolve(__dirname, '../DissectionPanel.tsx'), 'utf8');

describe('la tarjeta de diseccion sin ficha', () => {
  it('sigue siendo el caso que hay que rotular: sin musculo no hay latino', () => {
    const sel = makeSelection('Lateral_head_of_gastrocnemiusl', 'muscle', undefined);
    expect(sel.latin).toBeNull();
    expect(sel.note).toBeNull();
    // El titulo es la cadena del modelo, en ingles.
    expect(sel.label).toMatch(/gastrocnemius/i);
  });

  it('con ficha SI hay latino, y entonces no se rotula nada', () => {
    const gastro = {
      id: 'gastrocnemius',
      name: 'Gastrocnemio',
      latin: 'Musculus gastrocnemius',
      meshBases: ['Lateral_head_of_gastrocnemius'],
    } as unknown as Muscle;
    const sel = makeSelection('Lateral_head_of_gastrocnemiusl', 'muscle', gastro);
    expect(sel.label).toBe('Gastrocnemio');
    expect(sel.latin).toBe('Musculus gastrocnemius');
  });

  it('el panel avisa de que ese titulo es el nombre del modelo', () => {
    expect(PANEL).toMatch(/sin ficha clínica disponible/);
    // Solo para musculo: el tejido conectivo no tiene ficha por diseno, y
    // rotular los cientos de tendones y capsulas con el mismo aviso seria
    // ruido, no honestidad.
    expect(PANEL).toMatch(/selection\.layer === 'muscle' &&/);
  });
});
