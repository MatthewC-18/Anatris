// LAS TRES CAPAS FLOTANTES DEL LABORATORIO NO SE PUEDEN TAPAR ENTRE ELLAS.
//
// El laboratorio dibuja tres superficies sobre la escena: la columna izquierda
// (lectura clínica + consola), la pila derecha (tests / neuro / capas) y la
// tarjeta de disección, que aparece al pinchar un músculo.
//
// La tarjeta estaba centrada en la VENTANA y mide hasta 30rem. Medido: a 1024 px
// llegaba a 752 px mientras la hoja de tests abierta arrancaba en 624 --128 px
// de solape-- y con z-30 contra z-20 quedaba ENCIMA del panel que se estaba
// usando. Por la izquierda pisaba la consola otros 84 px. A 1280 px el solape
// desaparecía, así que el defecto sólo se veía en portátiles de 13 pulgadas: es
// exactamente la clase de fallo que no sale en la pantalla del que programa.
//
// Esto comprueba la geometría con las medidas reales de las clases, y comprueba
// además que las clases siguen ahí: una prueba que sólo hiciera la aritmética
// seguiría en verde después de borrar el arreglo.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/** Medidas en px, leídas de las clases de MovementView / los paneles. */
const GUTTER_L = 12; // left-3
const CONSOLE_W = 21.5 * 16; // w-[21.5rem]
const LEFT_EDGE = GUTTER_L + CONSOLE_W; // borde derecho de la columna izquierda
const GUTTER_R = 16; // right-4
const SHEET_W = 24 * 16; // w-[24rem] de la hoja de tests / neuro
const CARD_MAX = 30 * 16; // w-[min(94vw,30rem)] de la tarjeta de disección
/** lg:left-[22.25rem] y lg:right-[25rem] del contenedor de la tarjeta. */
const CARD_LEFT = 22.25 * 16;
const CARD_RIGHT_WITH_SHEET = 25 * 16;

const view = readFileSync('src/components/movement/MovementView.tsx', 'utf8');
const card = readFileSync('src/components/movement/DissectionPanel.tsx', 'utf8');

describe('geometría de las capas flotantes del laboratorio', () => {
  it('el contenedor de la disección empieza donde acaba la columna izquierda', () => {
    expect(view).toContain('lg:left-[22.25rem]');
    // 22.25rem = left-3 (0.75) + w-[21.5rem]: ni un pixel por debajo.
    expect(CARD_LEFT).toBeGreaterThanOrEqual(LEFT_EDGE);
  });

  it('se aparta cuando hay una hoja abierta a la derecha', () => {
    expect(view).toContain("rightPanel === 'none' ? 'lg:right-4' : 'lg:right-[25rem]'");
    // 25rem = right-4 (1) + w-[24rem]: el hueco acaba donde empieza la hoja.
    expect(CARD_RIGHT_WITH_SHEET).toBeGreaterThanOrEqual(GUTTER_R + SHEET_W);
  });

  it('la tarjeta acepta encogerse hasta el hueco', () => {
    // Sin `max-w-full` el contenedor estrecho no la estrecha: desborda y vuelve
    // a tapar la hoja, que es el defecto original con otra pinta.
    expect(card).toContain('max-w-full');
  });

  it('no se solapa con nada entre 1024 y 1920 px', () => {
    for (let w = 1024; w <= 1920; w += 1) {
      for (const sheetOpen of [false, true]) {
        const right = sheetOpen ? CARD_RIGHT_WITH_SHEET : GUTTER_R;
        const gap = w - CARD_LEFT - right;
        // El hueco puede ser estrecho, pero nunca negativo en este rango.
        expect(gap, `ventana ${w}px, hoja ${sheetOpen ? 'abierta' : 'cerrada'}`)
          .toBeGreaterThan(0);
        const cardW = Math.min(CARD_MAX, gap);
        const left = CARD_LEFT + (gap - cardW) / 2;
        const rightEdge = left + cardW;
        expect(left, `ventana ${w}px: pisa la consola`).toBeGreaterThanOrEqual(LEFT_EDGE);
        expect(rightEdge, `ventana ${w}px: pisa la pila derecha`).toBeLessThanOrEqual(
          w - right,
        );
      }
    }
  });

  it('demuestra que el centrado anterior SÍ se solapaba', () => {
    // La prueba de arriba sólo vale si la geometría vieja la habría suspendido.
    const w = 1024;
    const oldRight = w / 2 + CARD_MAX / 2;
    const sheetLeft = w - GUTTER_R - SHEET_W;
    expect(oldRight).toBeGreaterThan(sheetLeft);
    expect(Math.round(oldRight - sheetLeft)).toBe(128);
    const oldLeft = w / 2 - CARD_MAX / 2;
    expect(oldLeft).toBeLessThan(LEFT_EDGE);
    expect(Math.round(LEFT_EDGE - oldLeft)).toBe(84);
  });
});
