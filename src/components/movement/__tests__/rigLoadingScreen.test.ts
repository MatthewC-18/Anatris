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
  buildMs,
  CSS,
  DEFAULT_TIMINGS,
  FASES,
  LEARN_RATE,
  learnTimings,
  readTimings,
  remainingDuringDownload,
} from '../RigLoadingScreen';
import {
  LOADER_DURATION_S,
  MAX_RATE,
  MIN_RATE,
  REVEAL_S,
  revealRate,
} from '../../LoaderVideo';

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

const leer = (f: string) => readFileSync(f, 'utf8');

describe('la coreografia de la pantalla de carga', () => {
  // La del laboratorio (en el componente) y la lamina comun (index.css).
  const css = CSS + leer('src/index.css');
  const frames = keyframes(css).filter((f) => /^(cg|carga)-/.test(f.name));

  it('tiene animaciones que comprobar', () => {
    // Si el extractor dejara de encontrar bloques, el test de abajo pasaria en
    // vacio.
    expect(frames.length).toBeGreaterThanOrEqual(7);
    const nombres = frames.map((f) => f.name);
    for (const n of ['cg-ventana', 'cg-construir', 'carga-acercar', 'carga-lanzar']) {
      expect(nombres).toContain(n);
    }
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
    // el hilo principal y se congelan con el.
    const animadas = [...CSS.matchAll(/([^{}]+)\{[^{}]*\banimation:/g)].map((m) => m[1].trim());
    expect(animadas.length).toBeGreaterThan(6);
    for (const sel of animadas) {
      expect(sel, `selector animado: ${sel}`).not.toMatch(/-art\b|\bpath\b|\bcircle\b|\bg\b|\bsvg\b/);
    }
  });

  it('respeta prefers-reduced-motion sin apagar las fases', () => {
    const reducido = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reducido).toContain('.cg-relleno-1.cg-lanzadera { animation: none;');
    // Los rotulos y la linea del montaje NO se tocan ahi: la informacion se
    // sigue relevando.
    expect(reducido).not.toContain('cg-titulo');
    expect(reducido).not.toContain('cg-relleno-2');
    // Y el acercamiento lento del video se para (index.css).
    const comun = leer('src/index.css');
    expect(comun).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.carga-acercar, \.carga-lanzadera \{ animation: none; \}/);
  });

  it('el relevo no depende de React', () => {
    // El atributo que arranca la coreografia se pone A MANO. Si estuviera en el
    // JSX, un render posterior con el estado viejo lo quitaria y reiniciaria
    // todas las animaciones a mitad de la espera.
    const src = leer('src/components/movement/RigLoadingScreen.tsx');
    expect(src).toContain("el.dataset.run = '1'");
    expect(src).not.toMatch(/data-run=\{/);
  });

  it('el cargador cede un fotograma antes de bloquear el hilo', () => {
    // Sin esa cesion el relevo no llega a pintarse y la coreografia arranca
    // cuando el bloqueo ya ha terminado.
    const loader = leer('src/lib/compressedGLTF.ts');
    const i = loader.indexOf("setModelPhase(url, 'parsing')");
    const j = loader.indexOf('loader.parseAsync');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(loader.slice(i, j)).toContain('await nextPaint()');
  });

  it('cuatro fases, y la linea no se completa sola', () => {
    expect(FASES).toHaveLength(4);
    // Lo que completa la linea es el laboratorio, no un temporizador: el
    // montaje no pasa del 98 %.
    const construir = keyframes(CSS).find((f) => f.name === 'cg-construir')!.body;
    const pasos = [...construir.matchAll(/(\d+)%\s*\{\s*transform:\s*scaleX\(([\d.]+)\);\s*\}/g)].map(
      (m) => [Number(m[1]), Number(m[2])] as const,
    );
    expect(pasos[pasos.length - 1]).toEqual([100, 0.98]);
    expect(CSS).toContain(".cg[data-fuera='1'] .cg-relleno-2 { animation: none; transform: scaleX(1); }");
  });

  it('si la carga se alarga, la linea sigue avanzando: nunca se queda quieta en su tope', () => {
    // Medido el 12 nov: la primera visita sin cache de shaders tardo 15,9 s con
    // una prevision de 10; la linea de antes llegaba a su tope a los 10 s y se
    // quedaba quieta seis segundos.
    const construir = keyframes(CSS).find((f) => f.name === 'cg-construir')!.body;
    const pasos = [...construir.matchAll(/(\d+)%\s*\{\s*transform:\s*scaleX\(([\d.]+)\);\s*\}/g)].map(
      (m) => [Number(m[1]), Number(m[2])] as const,
    );
    expect(pasos.length).toBeGreaterThanOrEqual(6);
    // Al 50 % de la animacion (lo previsto) va por el 90 %, y ahi acaba la
    // construccion del video.
    expect(pasos).toContainEqual([50, 0.9]);
    // Despues, cada tramo avanza pero menos que el anterior: frena sin pararse.
    const cola = pasos.filter(([pc]) => pc >= 50);
    let antes = Infinity;
    for (let i = 1; i < cola.length; i++) {
      const paso = cola[i][1] - cola[i - 1][1];
      expect(paso).toBeGreaterThan(0);
      expect(paso).toBeLessThan(antes);
      antes = paso;
    }
  });
});

describe('un solo reloj para la linea y para el video', () => {
  it('los dos tramos de la linea miden lo que se espera que duren', () => {
    const src = leer('src/components/movement/RigLoadingScreen.tsx');
    expect(src).toContain('style={{ flexGrow: Math.max(1, Math.round(t.download)) }}');
    expect(src).toContain('style={{ flexGrow: Math.max(1, Math.round(tb)) }}');
    // Y el montaje se anima en lo mismo que mide su tramo: la mitad de la
    // animacion (el 90 % de la linea) es lo previsto, y la otra mitad, la cola
    // por si se alarga.
    expect(CSS).toContain('animation: cg-construir calc(var(--tb) * 2ms) linear both');
  });

  it('el video se acompasa en el MISMO instante del relevo, con el mismo numero', () => {
    const src = leer('src/components/movement/RigLoadingScreen.tsx');
    expect(src).toMatch(/el\.dataset\.run = '1';\s*paceReveal\(buildMs\(t\)\);/);
  });

  it('buildMs es el montaje: parseo + preparacion + primer fotograma', () => {
    expect(buildMs({ download: 1, parse: 900, prep: 5400, paint: 3700 })).toBe(10_000);
  });

  it('durante la descarga, lo que queda sale de lo que lleva en cuanto hay cifra', () => {
    const t = { download: 1000, parse: 500, prep: 3000, paint: 1500 };
    // Al 50% en 2 s: quedan 2 s de descarga y 5 s de montaje.
    expect(remainingDuringDownload(t, 2000, 0.5)).toBeCloseTo(7000, 6);
    // Sin cifra util (5%): lo esperado de descarga que falta y el montaje.
    expect(remainingDuringDownload(t, 300, 0.05)).toBeCloseTo(950 + 5000, 6);
  });
});

describe('la velocidad del video', () => {
  it('la construccion acaba cuando acaba la carga, dentro de un margen que no se nota', () => {
    // Quedan 6 s de construccion y 6 s de carga: velocidad normal.
    expect(revealRate(REVEAL_S - 6, 6000)).toBeCloseTo(1, 6);
    // Quedan 6 s de construccion y 5 s de carga: un poco mas deprisa.
    expect(revealRate(REVEAL_S - 6, 5000)).toBeCloseTo(1.2, 6);
  });

  it('nunca mas lento que 0,8 ni mas rapido que 1,25 (se veria a saltos)', () => {
    expect(revealRate(0, 60_000)).toBe(MIN_RATE);
    expect(revealRate(0, 1000)).toBe(MAX_RATE);
    expect(MIN_RATE).toBe(0.8);
    expect(MAX_RATE).toBe(1.25);
  });

  it('ya construido, velocidad normal: la cola es un plano quieto', () => {
    expect(revealRate(REVEAL_S + 3, 5000)).toBe(1);
  });

  it('el fichero dura lo que dicen las constantes', () => {
    // 6,1 s de construccion ralentizados x1,3934 = 203 fotogramas a 24 fps, y
    // 768 fotogramas (32 s) de plano quieto: ffprobe da 8,4583 y 40,4583 s.
    expect(REVEAL_S).toBeCloseTo(203 / 24, 3);
    expect(LOADER_DURATION_S).toBeCloseTo(971 / 24, 3);
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
    store.set(
      'anatris.carga.v1',
      JSON.stringify({ download: 800, parse: 400, prep: 2500, paint: 1500 }),
    );
    expect(readTimings()).toEqual({ download: 800, parse: 400, prep: 2500, paint: 1500 });
  });

  it('una entrada de antes (sin descarga) sigue valiendo, con la descarga por defecto', () => {
    store.set('anatris.carga.v1', JSON.stringify({ parse: 400, prep: 2500, paint: 1500 }));
    expect(readTimings()).toEqual({
      download: DEFAULT_TIMINGS.download,
      parse: 400,
      prep: 2500,
      paint: 1500,
    });
  });

  it('lo nuevo entra a medias con lo anterior: una carga rara no manda entera', () => {
    // Los tiempos medidos el 12 nov: la primera visita sin cache de shaders.
    const fria = { download: 663, parse: 889, prep: 5574, paint: 9461 };
    expect(LEARN_RATE).toBe(0.5);
    const siguiente = learnTimings(DEFAULT_TIMINGS, fria);
    // Guardada tal cual, la visita siguiente se preveia en 15,9 s (tardo 10,5).
    expect(buildMs(fria)).toBe(15_924);
    expect(buildMs(siguiente)).toBe(12_976);
    // Y converge: tres cargas iguales despues, a menos de un 15 % de lo medido.
    const normal = { download: 120, parse: 852, prep: 5631, paint: 4044 };
    let t = siguiente;
    for (let i = 0; i < 3; i++) t = learnTimings(t, normal);
    expect(Math.abs(buildMs(t) - buildMs(normal)) / buildMs(normal)).toBeLessThan(0.15);
  });

  it('lo guardado es la mezcla, no la ultima carga', () => {
    const src = leer('src/components/movement/RigLoadingScreen.tsx');
    expect(src).toContain('JSON.stringify(learnTimings(readTimings(), t))');
  });

  it('una carga con la pestana oculta no se aprende', () => {
    // Oculta, el primer fotograma espera a que vuelva: medido, 6,8 y 9,3 s
    // contra 4,0 a 4,6 a la vista.
    const src = leer('src/components/movement/RigLoadingScreen.tsx');
    expect(src).toMatch(/visibilitychange[\s\S]{0,120}marks\.oculta = true/);
    expect(src).toContain("marks.oculta = typeof document !== 'undefined' && document.visibilityState === 'hidden';");
    const guardar = src.slice(src.indexOf('export function noteRigPainted'));
    expect(guardar.indexOf('if (marks.oculta) return;')).toBeGreaterThan(0);
    expect(guardar.indexOf('if (marks.oculta) return;')).toBeLessThan(guardar.indexOf('localStorage.setItem'));
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
// El usuario eligio su video para las esperas: el laboratorio, Explorar y las
// del escenario de App. Estos tests atan que las tres lo usan, que el fichero
// que se sirve es el PREPARADO (la construccion ralentizada y el plano quieto,
// sin audio) y que el build lo publica con un nombre nuevo para el service
// worker.
describe('el video de carga', () => {
  it('lo usan el laboratorio, Explorar y las esperas del escenario', () => {
    expect(leer('src/components/movement/RigLoadingScreen.tsx')).toContain('<LoaderVideo');
    expect(leer('src/components/CanvasLoader.tsx')).toContain('<LoaderVideo');
    const app = leer('src/App.tsx');
    const espera = app.slice(app.indexOf('function StageWait('));
    expect(espera.slice(0, 600)).toContain('<LoaderVideo');
  });

  it('la carga del laboratorio se pinta en toda la zona, no solo en el escenario', () => {
    // Las dos esperas encadenadas (App y el cuerpo) en el mismo rectangulo: el
    // video no salta de sitio.
    expect(leer('src/App.tsx')).toContain('<main ref={setLoaderSlot} className="relative min-w-0 flex-1">');
    expect(leer('src/components/movement/RigViewer.tsx')).toContain('createPortal(pantalla, loaderSlot)');
  });

  it('un solo <video> para todas las esperas: se mueve de hueco, no se recrea', () => {
    const src = leer('src/components/LoaderVideo.tsx');
    expect(src).toContain("document.createElement('video')");
    expect(src).toMatch(/useLayoutEffect\(\(\) => \{[\s\S]{0,400}host\.current\.appendChild\(v\)/);
    // Sin <video> en el JSX (con atributos; los comentarios lo nombran sin
    // ellos): si lo hubiera, cada espera tendria el suyo.
    expect(src).not.toMatch(/<video\s+[a-zA-Z]+[=\s]/);
  });

  it('se queda quieto (el poster) con prefers-reduced-motion o si falla', () => {
    const src = leer('src/components/LoaderVideo.tsx');
    expect(src).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(src).toMatch(/if \(still \|\| failed\)[\s\S]{0,160}<img[\s\S]{0,200}src=\{LOADER_POSTER\}/);
  });

  it('nunca suena ni se apodera de la pantalla', () => {
    const src = leer('src/components/LoaderVideo.tsx');
    for (const linea of ['v.muted = true;', 'v.autoplay = true;', 'v.playsInline = true;', 'v.loop = false;']) {
      expect(src).toContain(linea);
    }
    expect(src).not.toMatch(/\bcontrols\b/);
  });

  it('el fichero servido es el preparado, y el build lo publica', () => {
    const mp4 = statSync('public/carga-revelado.mp4').size;
    expect(mp4).toBeGreaterThan(200_000);
    expect(mp4).toBeLessThan(1_200_000);
    expect(statSync('public/carga-revelado.webp').size).toBeLessThan(120_000);
    const vite = leer('vite.config.ts');
    expect(vite).toContain("['carga-revelado.mp4', 1_200_000]");
    expect(vite).toContain("['carga-revelado.webp', 120_000]");
    // Y la cache offline lo guarda con peticiones por trozos (Safari).
    expect(vite).toMatch(/carga-revelado\.mp4[\s\S]{0,400}rangeRequests: true/);
  });

  it('el mp4 no lleva pista de audio', () => {
    // Un mp4 con audio lleva una pista 'soun' en su caja hdlr.
    const buf = readFileSync('public/carga-revelado.mp4');
    expect(buf.includes(Buffer.from('soun'))).toBe(false);
    expect(buf.includes(Buffer.from('vide'))).toBe(true);
  });
});
