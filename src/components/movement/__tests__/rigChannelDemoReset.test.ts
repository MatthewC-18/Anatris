// EL CODO QUE SE QUEDABA DOBLADO EL RESTO DE LA SESION.
//
// `rigChannel.set` es un PATCH: lo que no se nombra, sobrevive. Los demos de
// test ortopedico y de miotoma escriben cuatro campos que la consola no escribe
// nunca --`ghostSkin`, `resistance`, `demo` y `components`--, y cada empuje de
// la consola los limpiaba A MANO, enumerandolos. `components` se quedo fuera de
// las tres enumeraciones.
//
// Medido entonces: el miotoma C5 lleva `elbow-flexion` a 90 grados. Tras pulsar
// su play, `applyComponents` lo seguia aplicando en CADA comando posterior
// --abduccion, flexion, rotaciones, y tambien al cambiar de region-- y la mano
// quedaba a 33,2 cm de donde debia, con el codo doblado, hasta recargar la
// pagina. Once de los tests de hombro y dos miotomas cervicales traen
// componentes, asi que llegar a ese estado es trivial.
//
// La correccion no es acordarse de la lista en cada sitio: es que la consola
// empuje por `setFromConsole`, que limpia los cuatro de una pieza.

import { describe, expect, it, beforeEach } from 'vitest';
import { rigChannel } from '../RigModel';

const CONSOLA = {
  movementId: 'glenohumeral-abduction',
  side: 'R' as const,
  angleDeg: 90,
  highlight: [],
  showMarkers: true,
};

function soltarDemo() {
  // Lo que escribe el play de un miotoma C5 / de un test con componentes.
  rigChannel.set({
    movementId: 'glenohumeral-abduction',
    angleDeg: 90,
    ghostSkin: true,
    resistance: true,
    demo: { testName: 'Miotoma C5', maneuver: 'Abduccion de hombro' } as never,
    components: [{ movementId: 'elbow-flexion', angleDeg: 90 }],
  });
}

describe('lo que un demo deja puesto', () => {
  beforeEach(() => {
    rigChannel.setFromConsole({ movementId: null, angleDeg: 0, highlight: [] });
  });

  it('el demo lo pone', () => {
    soltarDemo();
    const s = rigChannel.get();
    expect(s.components).toHaveLength(1);
    expect(s.ghostSkin).toBe(true);
    expect(s.resistance).toBe(true);
    expect(s.demo).not.toBeNull();
  });

  it('y el siguiente empuje de la consola se lo lleva ENTERO', () => {
    soltarDemo();
    rigChannel.setFromConsole(CONSOLA);
    const s = rigChannel.get();
    expect(s.components, 'el codo se quedaba doblado 90 grados').toEqual([]);
    expect(s.ghostSkin).toBe(false);
    expect(s.resistance).toBe(false);
    expect(s.demo).toBeNull();
    // Y lo que la consola SI manda, manda.
    expect(s.movementId).toBe('glenohumeral-abduction');
    expect(s.angleDeg).toBe(90);
  });

  it('tambien al salir del laboratorio, que es el otro empuje', () => {
    soltarDemo();
    rigChannel.setFromConsole({ movementId: null, angleDeg: 0, highlight: [], implicated: [] });
    const s = rigChannel.get();
    expect(s.components).toEqual([]);
    expect(s.demo).toBeNull();
    expect(s.movementId).toBeNull();
  });

  it('un demo puede pisar al demo anterior sin que la consola intervenga', () => {
    soltarDemo();
    rigChannel.set({ components: [], demo: null, ghostSkin: false, resistance: false });
    expect(rigChannel.get().components).toEqual([]);
  });

  it('se lleva tambien la estructura resaltada', () => {
    // MEDIDO EN EL NAVEGADOR, y es el quinto campo que cae en la misma trampa:
    // tras demostrar McMurray el menisco medial se quedaba visible y pulsando
    // en naranja para siempre, porque `set` es un parche y el empuje de la
    // consola no mencionaba `structures`.
    rigChannel.set({ structures: ['knee-medial-meniscus'] });
    expect(rigChannel.get().structures).toEqual(['knee-medial-meniscus']);
    rigChannel.setFromConsole(CONSOLA);
    expect(
      rigChannel.get().structures,
      'el menisco se quedaba encendido al parar el demo',
    ).toEqual([]);
  });

  it('la consola NO empuja con `set` a pelo en ningun sitio', async () => {
    // El guardian: el defecto vuelve en cuanto alguien escriba `rigChannel.set`
    // desde la consola y se deje un campo de demo sin nombrar.
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(resolve(__dirname, '../MovementControls.tsx'), 'utf8');
    expect(src).not.toMatch(/rigChannel\.set\(/);
    expect(src).toMatch(/rigChannel\.setFromConsole\(/);
  });

  // EL GUARDIAN DE VERDAD: no comprueba los campos de hoy, comprueba la REGLA.
  //
  // Este defecto ha caido tres veces por el mismo camino: alguien anade un
  // campo que solo un demo escribe y no lo mete en DEMO_ONLY_RESET, asi que al
  // parar el demo el campo se queda puesto (el codo doblado 90 grados; el
  // menisco encendido en naranja para siempre). Enumerar los campos en un test
  // no sirve: el test enumera lo mismo que el codigo y los dos se olvidan del
  // nuevo a la vez. Asi que aqui se comparan las CLAVES que los paneles de demo
  // empujan contra las que la consola empuja: la diferencia es, por definicion,
  // lo que solo un demo pone, y tiene que estar en la lista de apagado.
  it('todo campo que solo un demo escribe esta en DEMO_ONLY_RESET', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const read = (f: string) => readFileSync(resolve(__dirname, '..', f), 'utf8');

    /** Fuera comentarios y cadenas: dentro hay `texto:` a patadas. */
    const strip = (s: string): string =>
      s
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, ' ')
        .replace(/'(?:\\.|[^'\\])*'/g, "''")
        .replace(/"(?:\\.|[^"\\])*"/g, '""')
        .replace(/`(?:\\.|[^`\\])*`/g, '``');

    /** Las claves de primer nivel de cada objeto pasado a `fn(`. */
    const keysPushedTo = (src: string, fn: string): Set<string> => {
      const out = new Set<string>();
      const clean = strip(src);
      let from = 0;
      for (;;) {
        const i = clean.indexOf(fn, from);
        if (i < 0) break;
        from = i + fn.length;
        let depth = 0;
        let objDepth = -1;
        for (let k = from - 1; k < clean.length; k += 1) {
          const c = clean[k];
          if (c === '(' || c === '{' || c === '[') {
            depth += 1;
            if (c === '{' && objDepth < 0) objDepth = depth;
          } else if (c === ')' || c === '}' || c === ']') {
            depth -= 1;
            if (depth === 0) break;
          } else if (depth === objDepth) {
            // `clave:` y tambien la forma abreviada `clave,` / `clave}`, que es
            // como la consola empuja `showMarkers`. Lo que distingue una clave
            // de un VALOR (`demo: demoInfo`, `ghostSkin: true`) es lo que viene
            // ANTES: una clave solo puede ir tras `{` o tras `,`.
            const m = /^([A-Za-z_$][\w$]*)\s*[:,}]/.exec(clean.slice(k));
            if (!m) continue;
            let p = k - 1;
            while (p >= 0 && /\s/.test(clean[p])) p -= 1;
            if (p >= 0 && (clean[p] === '{' || clean[p] === ',')) out.add(m[1]);
          }
        }
      }
      return out;
    };

    const demoKeys = new Set([
      ...keysPushedTo(read('OrthopedicTestsPanel.tsx'), 'rigChannel.set('),
      ...keysPushedTo(read('NeuroPanel.tsx'), 'rigChannel.set('),
    ]);
    const consoleKeys = keysPushedTo(read('MovementControls.tsx'), 'rigChannel.setFromConsole(');
    const resetKeys = new Set(
      keysPushedTo(read('RigModel.tsx'), 'const DEMO_ONLY_RESET ='),
    );

    expect(demoKeys.size, 'no se han leido las claves del panel de tests').toBeGreaterThan(5);
    expect(consoleKeys.size, 'no se han leido las claves de la consola').toBeGreaterThan(3);

    const soloDemo = [...demoKeys].filter((k) => !consoleKeys.has(k)).sort();
    const sinApagar = soloDemo.filter((k) => !resetKeys.has(k));
    expect(
      sinApagar,
      `estos campos los escribe solo un demo y la consola no los apaga: al parar ` +
        `el demo se quedan puestos. Metelos en DEMO_ONLY_RESET (RigModel.tsx).`,
    ).toEqual([]);
  });
});
