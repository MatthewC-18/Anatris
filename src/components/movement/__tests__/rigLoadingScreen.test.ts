// LA PANTALLA DE CARGA TIENE QUE SEGUIR MOVIENDOSE CON EL HILO BLOQUEADO.
//
// Entre el fin de la descarga y el primer fotograma del laboratorio el hilo
// principal no suelta durante unos diez segundos (parseo, montaje, pases de
// preparacion, subida a la GPU; medido con bootClock). En ese tramo lo unico
// que el navegador sigue animando es lo que lleva el COMPOSITOR: `transform` y
// `opacity`. Una sola animacion de `width`, `height`, `top`, `clip-path`,
// `stroke-dashoffset` o `background-position` y esa pieza se queda congelada
// justo cuando mas se la mira.
//
// No se puede comprobar mirando --con el hilo bloqueado no hay ni captura de
// pantalla-- asi que se comprueba la condicion que lo garantiza.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CSS,
  DEFAULT_TIMINGS,
  FASES,
  readTimings,
} from '../RigLoadingScreen';

/** Los bloques `@keyframes nombre { ... }` del CSS, con su cuerpo entero. */
function keyframes(css: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
    }
    out.push({ name: m[1], body: css.slice(re.lastIndex, i - 1) });
  }
  return out;
}

describe('la coreografia de la pantalla de carga', () => {
  const frames = keyframes(CSS);

  it('tiene animaciones que comprobar', () => {
    // Si el extractor dejara de encontrar bloques, el test de abajo pasaria en
    // vacio.
    expect(frames.length).toBeGreaterThanOrEqual(8);
    expect(frames.map((f) => f.name)).toContain('cg-abducir');
    expect(frames.map((f) => f.name)).toContain('cg-ventana');
  });

  it('cada @keyframes anima SOLO transform u opacity', () => {
    for (const f of frames) {
      const props = [...f.body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      expect(props.length, `@keyframes ${f.name} sin propiedades`).toBeGreaterThan(0);
      for (const prop of props) {
        expect(['transform', 'opacity'], `@keyframes ${f.name} anima "${prop}"`).toContain(prop);
      }
    }
  });

  it('lo que se anima son elementos HTML, no piezas del SVG', () => {
    // En Chrome las animaciones CSS sobre <g> o <path> no se componen: corren en
    // el hilo principal y se congelan con el. Las clases animadas son todas de
    // envoltorios <div> (marco, fondo, piel, brazo, titulo, relleno).
    const animadas = [...CSS.matchAll(/([^{}]+)\{[^{}]*\banimation:/g)].map((m) => m[1].trim());
    expect(animadas.length).toBeGreaterThan(6);
    for (const sel of animadas) {
      expect(sel, `selector animado: ${sel}`).not.toMatch(/-art\b|\bpath\b|\bcircle\b|\bg\b|\bsvg\b/);
    }
  });

  it('respeta prefers-reduced-motion sin apagar las fases', () => {
    const reducido = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reducido).toContain('.cg-brazo { animation: none; }');
    // Los rotulos y la barra NO se tocan ahi: la informacion se sigue relevando.
    expect(reducido).not.toContain('cg-titulo');
    expect(reducido).not.toContain('cg-relleno-2');
  });

  it('el relevo no depende de React', () => {
    // El atributo que arranca la coreografia se pone A MANO. Si estuviera en el
    // JSX, un render posterior con el estado viejo lo quitaria y reiniciaria
    // todas las animaciones a mitad de la espera.
    const src = readFileSync('src/components/movement/RigLoadingScreen.tsx', 'utf8');
    expect(src).toContain("el.dataset.run = '1'");
    expect(src).not.toMatch(/data-run=\{/);
  });

  it('el cargador cede un fotograma antes de bloquear el hilo', () => {
    // Sin esa cesion el relevo no llega a pintarse y la coreografia arranca
    // cuando el bloqueo ya ha terminado.
    const loader = readFileSync('src/lib/compressedGLTF.ts', 'utf8');
    const i = loader.indexOf("setModelPhase(url, 'parsing')");
    const j = loader.indexOf('loader.parseAsync');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(loader.slice(i, j)).toContain('await nextPaint()');
  });

  it('cuatro fases, y la ultima barra no se completa sola', () => {
    expect(FASES).toHaveLength(4);
    // Lo que completa la ultima barra es el laboratorio, no un temporizador.
    expect(CSS).toMatch(/@keyframes cg-casi \{[^}]*\}\s*to \{ transform: scaleX\(\.9\); \}|cg-casi \{ from \{ transform: scaleX\(0\); \} to \{ transform: scaleX\(\.9\); \} \}/);
  });
});

describe('los tiempos aprendidos', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    };
  });

  it('sin nada guardado, los medidos por defecto', () => {
    expect(readTimings()).toEqual(DEFAULT_TIMINGS);
  });

  it('usa los de la ultima carga de este equipo', () => {
    store.set('anatris.carga.v1', JSON.stringify({ parse: 400, prep: 2500, paint: 1500 }));
    expect(readTimings()).toEqual({ parse: 400, prep: 2500, paint: 1500 });
  });

  it('un dato roto o absurdo no se usa', () => {
    store.set('anatris.carga.v1', '{no es json');
    expect(readTimings()).toEqual(DEFAULT_TIMINGS);
    // Cero, negativos o dos minutos por tramo: mejor los de por defecto que una
    // coreografia que dura un instante o un cuarto de hora.
    store.set('anatris.carga.v1', JSON.stringify({ parse: 0, prep: 2500, paint: 1500 }));
    expect(readTimings()).toEqual(DEFAULT_TIMINGS);
    store.set('anatris.carga.v1', JSON.stringify({ parse: 400, prep: 999_999, paint: 1500 }));
    expect(readTimings()).toEqual(DEFAULT_TIMINGS);
  });
});
