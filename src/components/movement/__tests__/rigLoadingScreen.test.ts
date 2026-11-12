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
import { readFileSync, statSync } from 'node:fs';
import {
  CSS,
  DEFAULT_TIMINGS,
  FASES,
  readTimings,
} from '../RigLoadingScreen';
import { chainedTime, LOADER_DURATION_S, markLoaderGone, stretchForBlock } from '../../LoaderVideo';

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
    // vacio. Desde que el centro es el video de carga (LoaderVideo) solo se
    // animan los rotulos y la barra: seis bloques.
    expect(frames.length).toBeGreaterThanOrEqual(6);
    expect(frames.map((f) => f.name)).toContain('cg-ventana');
    expect(frames.map((f) => f.name)).toContain('cg-casi');
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
    // El movimiento que se apaga es la lanzadera; el video se queda en su
    // poster (lo decide LoaderVideo, ver abajo).
    expect(reducido).toContain('.cg-relleno-1.cg-lanzadera { animation: none;');
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

// EL VIDEO DE CARGA EN TODA LA APLICACION.
//
// El usuario eligio su video para sustituir las pantallas de carga del
// laboratorio, de Explorar y de las esperas del escenario. Estos tests atan que
// las tres lo usan, que el fichero que se sirve es el PREPARADO (sin audio, 621
// KB; el original eran 7,3 MB) y que el build lo publica.
describe('el video de carga', () => {
  const leer = (f: string) => readFileSync(f, 'utf8');

  it('lo usan el laboratorio, Explorar y las esperas del escenario', () => {
    expect(leer('src/components/movement/RigLoadingScreen.tsx')).toContain('<LoaderVideo');
    expect(leer('src/components/CanvasLoader.tsx')).toContain('<LoaderVideo');
    const app = leer('src/App.tsx');
    const espera = app.slice(app.indexOf('function StageWait('));
    expect(espera.slice(0, 400)).toContain('<LoaderVideo');
  });

  it('se queda quieto (el poster) con prefers-reduced-motion o si falla', () => {
    const src = leer('src/components/LoaderVideo.tsx');
    expect(src).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(src).toMatch(/if \(still \|\| failed\)[\s\S]{0,120}<img[^>]*src=\{LOADER_POSTER\}/);
  });

  it('nunca suena ni se apodera de la pantalla', () => {
    const src = leer('src/components/LoaderVideo.tsx');
    for (const attr of ['autoPlay', 'muted', 'loop', 'playsInline']) expect(src).toContain(attr);
    expect(src).not.toMatch(/\bcontrols\b/);
  });

  it('el fichero servido es el preparado, y el build lo publica', () => {
    const mp4 = statSync('public/carga.mp4').size;
    expect(mp4).toBeGreaterThan(100_000);
    expect(mp4).toBeLessThan(1_500_000);
    expect(statSync('public/carga-poster.webp').size).toBeLessThan(120_000);
    const vite = leer('vite.config.ts');
    expect(vite).toContain("['carga.mp4', 1_500_000]");
    expect(vite).toContain("['carga-poster.webp', 120_000]");
    // Y la cache offline lo guarda con peticiones por trozos (Safari).
    expect(vite).toMatch(/carga\.mp4[\s\S]{0,400}rangeRequests: true/);
  });

  it('el relevo le dice al video cuanto va a durar el bloqueo', () => {
    // Volver al principio del bucle lo hace el hilo principal: MEDIDO en el
    // banco, con 10 s de bloqueo el video se congelo 3,2 s en su ultimo
    // fotograma. El relevo (justo antes del bloqueo) estira el video.
    const src = leer('src/components/movement/RigLoadingScreen.tsx');
    expect(src).toMatch(/el\.dataset\.run = '1';[\s\S]{0,400}stretchForBlock\(video, t\.parse \+ t\.prep \+ t\.paint\)/);
  });

  it('el mp4 no lleva pista de audio', () => {
    // Un mp4 con audio lleva una pista 'soun' en su caja hdlr.
    const buf = readFileSync('public/carga.mp4');
    expect(buf.includes(Buffer.from('soun'))).toBe(false);
    expect(buf.includes(Buffer.from('vide'))).toBe(true);
  });
});

describe('stretchForBlock: el video no llega al final con el hilo bloqueado', () => {
  const video = (currentTime: number, duration = LOADER_DURATION_S) => ({
    currentTime,
    duration,
    playbackRate: 1,
  });

  it('si lo que queda cubre el bloqueo con margen, no toca nada', () => {
    const v = video(2.5); // quedan 16,4 s; 10 s de bloqueo con margen son 12
    expect(stretchForBlock(v, 10_000)).toBe(1);
    expect(v.playbackRate).toBe(1);
  });

  it('si no lo cubre, ralentiza lo justo', () => {
    const v = video(9); // quedan 9,9 s; 10 s de bloqueo con margen son 12
    const r = stretchForBlock(v, 10_000);
    expect(r).toBeCloseTo(9.9167 / 12, 3);
    expect(v.playbackRate).toBe(r);
  });

  it('nunca por debajo de la mitad', () => {
    const v = video(18); // casi al final
    expect(stretchForBlock(v, 30_000)).toBe(0.5);
  });

  it('sin duracion conocida (aun sin metadatos) usa la del fichero', () => {
    const v = video(2, Number.NaN);
    expect(stretchForBlock(v, 10_000)).toBe(1);
  });

  it('el fichero dura lo que dice la constante', () => {
    // Dos ciclos de 9,458 s, medidos con ffprobe: 454 fotogramas a 24 fps.
    expect(LOADER_DURATION_S).toBeCloseTo(454 / 24, 2);
  });
});

describe('dos esperas seguidas son la misma espera', () => {
  it('la segunda sigue por donde iba la primera; tras una pausa larga, empieza de nuevo', () => {
    // Indice anatomico y luego el cuerpo: dos componentes, un solo video.
    expect(chainedTime(1_000, LOADER_DURATION_S)).toBe(0); // empieza la cadena
    markLoaderGone(5_000); // la primera se retira a los 4 s
    expect(chainedTime(5_400, LOADER_DURATION_S)).toBeCloseTo(4.4, 5); // sigue
    markLoaderGone(9_000);
    // Mucho despues, otra espera: es otra cadena, desde el principio.
    expect(chainedTime(30_000, LOADER_DURATION_S)).toBe(0);
  });

  it('da la vuelta con el bucle', () => {
    // Setenta segundos despues de la ultima: cadena nueva.
    expect(chainedTime(100_000, LOADER_DURATION_S)).toBe(0);
    markLoaderGone(119_500);
    expect(chainedTime(120_000, LOADER_DURATION_S)).toBeCloseTo(20 - LOADER_DURATION_S, 4);
  });
});
