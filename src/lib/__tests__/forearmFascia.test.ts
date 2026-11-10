// EL ANTEBRAZO ERA EL UNICO MIEMBRO QUE ENSENABA EL HUESO.
//
// Contando por filas de pantalla lo que hay dentro del contorno de cada segmento
// en /hombro/movimiento (misma camara, el mismo fotograma para los cuatro):
//
//   segmento        musculo   palido (hueso)   se ve el escenario
//   brazo +x          89,4%        9,6%             0,5%
//   muslo +x          96,6%        1,5%             0,6%
//   ANTEBRAZO +x      56,3%       24,9%            18,7%
//   ANTEBRAZO -x      64,0%       23,1%            12,4%
//
// El antebrazo era el unico con una varilla de marfil dentro y el unico por el
// que se veia el fondo. Lo que cierra ese hueco en el cuerpo es la FASCIA
// ANTEBRAQUIAL, y el laboratorio la tenia apagada junto con el resto de la
// fascia. Encendiendola, misma camara:
//
//   ANTEBRAZO +x      82,4%        0,0%            12,5%
//   ANTEBRAZO -x      71,3%       16,6%            11,9%
//   brazo +x          89,3%        9,6%             0,5%   <- sin tocar
//   muslo +x          96,6%        1,5%             0,6%   <- sin tocar
//
// Lo que NO arregla: el 12% de hueco sigue ahi. Ese es otro defecto y se mide
// aparte; no se tapa diciendo que esto lo resolvio.
//
// Dos cosas tienen que seguir siendo verdad para que esto no se degrade:
//   1. que la fascia que se enciende sea SOLO la del antebrazo;
//   2. que vaya pintada de carne profunda y por detras, porque en su marfil
//      convierte los dos brazos en mangas blancas (probado y descartado).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEEP_FLESH, layerForMaterial, meshIsForearmFascia } from '../materialColors';

/** Luminancia relativa aproximada de un hex sRGB, 0..255. */
function lum(hex: number): number {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rojos de vientre REALES, leidos del rig preparado en el navegador. */
const VIENTRES = [0xa13042, 0xb63649, 0xc23949, 0xc8455f, 0xcc5155, 0xcc5951, 0xce725a, 0xcd6a56];

describe('la fascia que cierra el antebrazo', () => {
  it('reconoce las dos mallas del antebrazo y ninguna otra fascia', () => {
    expect(meshIsForearmFascia('Antebrachial_fascia', 'Fascia')).toBe(true);
    expect(meshIsForearmFascia('Antebrachial_fascia001', 'Fascia')).toBe(true);
    // Las demas fascias del cuerpo NO: no cierran ningun hueco y taparian musculo.
    for (const otra of [
      'Fascia_lata',
      'Thoracolumbar_fascia',
      'Cervical_fascia',
      'Plantar_fascia',
      'Gluteal_fascia',
    ]) {
      expect(meshIsForearmFascia(otra, 'Fascia'), otra).toBe(false);
    }
    expect(meshIsForearmFascia(null)).toBe(false);
    expect(meshIsForearmFascia(undefined)).toBe(false);
  });

  it('exige el material Fascia, para que no la encienda un homonimo', () => {
    expect(meshIsForearmFascia('Antebrachial_fascia', 'Muscle-1')).toBe(false);
    expect(meshIsForearmFascia('Antebrachial_fascia', 'Skin-3')).toBe(false);
    // Sin material declarado se acepta por nombre: asi la usa el audit, que lee
    // el GLB donde la malla y su material viajan juntos.
    expect(meshIsForearmFascia('Antebrachial_fascia')).toBe(true);
  });

  it('el material Fascia sigue SIN capa propia: la excepcion es la del antebrazo', () => {
    // Si algun dia `layerForMaterial('Fascia')` devolviera una capa, se
    // encenderia la fascia de todo el cuerpo y volverian las mangas blancas.
    expect(layerForMaterial('Fascia')).toBeNull();
    expect(layerForMaterial('Bursa')).toBeNull();
  });

  it('la carne profunda es mas oscura que cualquier vientre del rig', () => {
    // Su papel es ser FONDO. Si se acerca al tono de un vientre, el antebrazo se
    // lee como un unico musculo liso en vez de como vientres sobre carne.
    for (const v of VIENTRES) {
      expect(lum(DEEP_FLESH), `vientre #${v.toString(16)}`).toBeLessThan(lum(v));
    }
    // Y sigue siendo CARNE: el rojo manda sobre los otros dos canales.
    const r = (DEEP_FLESH >> 16) & 0xff;
    const g = (DEEP_FLESH >> 8) & 0xff;
    const b = DEEP_FLESH & 0xff;
    expect(r).toBeGreaterThan(g + 40);
    expect(r).toBeGreaterThan(b + 40);
  });
});

describe('como la monta RigModel', () => {
  const src = readFileSync('src/components/movement/RigModel.tsx', 'utf8');

  it('decide la fascia ANTES de descartar lo que no tiene capa', () => {
    // `layerForMaterial('Fascia')` es null, asi que si la rama se pusiera
    // despues del descarte nunca se ejecutaria y el antebrazo seguiria igual.
    const iFascia = src.indexOf('meshIsForearmFascia(mesh.name, matName)');
    const iNull = src.indexOf('const layer = layerForMaterial(matName);');
    expect(iFascia).toBeGreaterThan(0);
    expect(iNull).toBeGreaterThan(0);
    expect(iFascia).toBeLessThan(iNull);
  });

  it('va con la capa del musculo, no con la conectiva', () => {
    // Es la envoltura de ese musculo. Si colgara de `connective`, el usuario
    // podria apagarla y volver a abrir el antebrazo sin saber por que.
    expect(src).toContain("mesh.userData.rigLayer = 'muscle';");
    expect(src).toContain('mesh.userData.rigDeepFascia = true;');
  });

  it('se dibuja por detras y con desplazamiento de poligono', () => {
    // La fascia y la superficie de los vientres son COINCIDENTES (radio maximo
    // 0,063 vs 0,062 en el codo, 0,039 vs 0,035 en la muneca): sin esto se
    // pelean por el pixel y el antebrazo parpadea al girar la camara.
    expect(src).toContain('polygonOffset: true');
    expect(src).toContain('mesh.renderOrder = -1;');
    expect(src).toContain('color: DEEP_FLESH');
  });

  it('no se puede diseccionar ni la resalta el raton', () => {
    // Quitarla vuelve a abrir el antebrazo, y su nombre no resuelve a ninguna
    // ficha del catalogo.
    expect(src).toContain('if (m.userData.rigDeepFascia === true) continue;');
    expect(src).toContain('if (m.userData.rigDeepFascia === true) return false;');
  });
});
