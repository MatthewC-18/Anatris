// LA FRASE DE LA FASE NO PUEDE OSCILAR.
//
// PhaseStack contaba las lineas de continuacion con una cuenta que daba 1 con
// la continuacion sin pintar y 0 con ella pintada, y como el resultado estaba en
// las dependencias de su efecto, React cortaba a las 50 vueltas y el
// laboratorio entero caia en la ErrorBoundary ("Algo salio mal en la vista 3D"
// al empezar la flexion del codo). jsdom no mide layout, asi que la cuenta vive
// en una funcion pura y aqui se fija con las cifras medidas en Chrome.

import { describe, it, expect } from 'vitest';
import { PHASE_CONT_LINE_PX, phaseContinuationLines } from '../phaseFit';

const GAP = 6; // mt-1.5 con la fuente raiz de 16 px

/** La cuenta de antes (LabMarginParts.tsx hasta el 25 nov 2026), para fijar el fallo. */
function cuentaVieja(blocks: number[], index: number, contH: number, painted: boolean): number {
  const nucleo = blocks.map((h, i) => h - (i === index ? contH : 0));
  const alto = Math.max(...nucleo);
  const lh = painted ? PHASE_CONT_LINE_PX : 20;
  return Math.max(0, Math.floor((alto - nucleo[index] - GAP) / lh));
}

/** Alto pintado de la fase activa con k lineas de continuacion. */
const conLineas = (core: number, k: number) => (k > 0 ? core + GAP + k * PHASE_CONT_LINE_PX : core);

describe('phaseContinuationLines', () => {
  it('codo, flexion, fase "Rango medio" a 1440x900: la cuenta vieja oscilaba 1-0, la nueva da 1 en las dos ramas', () => {
    // Medido en la app (Chrome con la grafica): bloques 146,55 / 116,11 / 122,44 px
    // sin continuacion; con 1 linea pintada (20,14 px + 6 de margen) el bloque
    // activo mide 142,25.
    const sinPintar = [146.55, 116.11, 122.44];
    const pintada = [146.55, 142.25, 122.44];
    expect(cuentaVieja(sinPintar, 1, 0, false)).toBe(1);
    expect(cuentaVieja(pintada, 1, 20.14, true)).toBe(0);

    expect(phaseContinuationLines({ blockHeights: sinPintar, index: 1, contHeight: 0, contGapPx: GAP })).toBe(1);
    expect(phaseContinuationLines({ blockHeights: pintada, index: 1, contHeight: 20.14, contGapPx: GAP })).toBe(1);
  });

  it('1920x1080, fase "Final" (caia a 100 grados): holgura de 20,79 px, 1 linea pintada o no', () => {
    const sinPintar = [159.98, 145.59, 133.19];
    const pintada = [159.98, 145.59, conLineas(133.19, 1)];
    expect(cuentaVieja(sinPintar, 2, 0, false)).toBe(1);
    expect(cuentaVieja(pintada, 2, PHASE_CONT_LINE_PX, true)).toBe(0);

    expect(phaseContinuationLines({ blockHeights: sinPintar, index: 2, contHeight: 0, contGapPx: GAP })).toBe(1);
    expect(
      phaseContinuationLines({ blockHeights: pintada, index: 2, contHeight: PHASE_CONT_LINE_PX, contGapPx: GAP }),
    ).toBe(1);
  });

  it('el resultado no depende de cuantas lineas esten pintadas ya (punto fijo en la segunda pasada)', () => {
    const cores = [
      [180.3, 97.7, 120.9],
      [140.2, 133.4, 99.1, 150.6],
      [210.0, 75.25],
    ];
    for (const core of cores) {
      core.forEach((_, index) => {
        const base = phaseContinuationLines({ blockHeights: core, index, contHeight: 0, contGapPx: GAP });
        for (let k = 0; k <= 4; k++) {
          const blocks = core.map((h, i) => (i === index ? conLineas(h, k) : h));
          const contHeight = k > 0 ? k * PHASE_CONT_LINE_PX : 0;
          expect(phaseContinuationLines({ blockHeights: blocks, index, contHeight, contGapPx: GAP })).toBe(base);
        }
      });
    }
  });

  it('la fase mas alta no tiene sitio para continuacion', () => {
    expect(phaseContinuationLines({ blockHeights: [120, 180, 150], index: 1, contHeight: 0, contGapPx: GAP })).toBe(0);
  });

  it('un indice fuera de rango no inventa lineas', () => {
    expect(phaseContinuationLines({ blockHeights: [120, 180], index: 2, contHeight: 0, contGapPx: GAP })).toBe(0);
    expect(phaseContinuationLines({ blockHeights: [], index: 0, contHeight: 0, contGapPx: GAP })).toBe(0);
  });
});
