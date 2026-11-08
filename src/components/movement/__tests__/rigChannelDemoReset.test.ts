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

  it('la consola NO empuja con `set` a pelo en ningun sitio', async () => {
    // El guardian: el defecto vuelve en cuanto alguien escriba `rigChannel.set`
    // desde la consola y se deje un campo de demo sin nombrar.
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(resolve(__dirname, '../MovementControls.tsx'), 'utf8');
    expect(src).not.toMatch(/rigChannel\.set\(/);
    expect(src).toMatch(/rigChannel\.setFromConsole\(/);
  });
});
