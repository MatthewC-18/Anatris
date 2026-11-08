// EL PIE ESTABA APAGADO ENTERO, Y NADIE LO VEIA.
//
// Tres reglas distintas se juntaban sobre la region de tobillo:
//
//  1. `inDistalRegion` tapaba todo lo que cae por debajo de y=0,12 --el pie
//     completo-- y dejaba solo la piel. Eso apagaba 45 mallas de hueso, 54 de
//     musculo y 160 de tejido conectivo, el ASTRAGALO y el CALCANEO incluidos,
//     que son las dos piezas de la articulacion que la region existe para
//     explorar. Pelar la piel en el tobillo no dejaba nada debajo.
//  2. RigModel escondia por NOMBRE los cuatro musculos digitales de la pierna,
//     que son exactamente cuatro de los musculos que la region acredita: el
//     panel los nombraba y en el modelo no se encendia ninguno.
//  3. El reparto de peso del tobillo miraba solo la ALTURA, y el dorso del
//     mediopie esta a la altura de la articulacion aunque este 5 cm por delante.
//
// La (1) se comprobo rasterizando el pie desde el GLB que se publica: sale
// articulado y limpio, hueso y musculo. No habia nada que tapar.
//
// Esta prueba vigila que ninguna de las tres vuelva.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { inDistalRegion } from '../rigLimbTrim';
import { ANKLE_BAND_M, ANKLE_FORWARD_START_M } from '../rigAnkleRebind';
import { ankleMuscles } from '../../data/muscles/ankle';

const src = (p: string): string => readFileSync(resolve(__dirname, '../..', p), 'utf8');

describe('el pie se ve', () => {
  it('la tapa distal ya no se traga el pie', () => {
    // Alturas medidas sobre el GLB que se publica: calcaneo y=0,037,
    // escafoides y=0,062, tobillo y=0,078.
    for (const y of [0.01, 0.037, 0.062, 0.078, 0.11]) {
      expect(inDistalRegion(new THREE.Vector3(0.08, y, 0)), `y=${y}`).toBe(false);
    }
  });

  it('pero sigue tapando la mano, que es para lo que estaba', () => {
    expect(inDistalRegion(new THREE.Vector3(0.24, 0.72, 0))).toBe(true);
    // El antebrazo (mas cerca del eje) y el tronco quedan fuera.
    expect(inDistalRegion(new THREE.Vector3(0.1, 0.72, 0))).toBe(false);
    expect(inDistalRegion(new THREE.Vector3(0.24, 1.2, 0))).toBe(false);
  });

  it('y la altura no serviria para separar el retropie de los dedos', () => {
    // El calcaneo esta POR DEBAJO del escafoides: cualquier corte por altura que
    // salvara el escafoides se dejaria fuera el talon. Por eso no se intento.
    expect(0.037).toBeLessThan(0.062);
  });

  it('RigModel ya no esconde los musculos digitales de la PIERNA', () => {
    const s = src('components/movement/RigModel.tsx');
    // El recorte del ANTEBRAZO sigue, acotado a la banda del brazo.
    expect(s).toMatch(/inArmBand\(center\)/);
    // El de la pierna no: era un filtro por nombre con un limite de altura.
    expect(s).not.toMatch(/center\.y\s*<\s*0\.6\s*&&\s*\/\(digitorum\|hallucis\)/);
  });

  it('y la region de tobillo acredita esos cuatro musculos', () => {
    const ids = new Set(ankleMuscles.map((m) => m.id));
    for (const id of [
      'extensor-digitorum-longus',
      'extensor-hallucis-longus',
      'flexor-digitorum-longus',
      'flexor-hallucis-longus',
    ]) {
      expect(ids.has(id), `${id} deberia seguir acreditado`).toBe(true);
    }
  });

  it('el reparto del tobillo mira tambien hacia DELANTE, no solo la altura', () => {
    expect(ANKLE_FORWARD_START_M).toBeGreaterThan(0);
    expect(ANKLE_FORWARD_START_M).toBeLessThan(ANKLE_BAND_M);
    const s = src('lib/rigAnkleRebind.ts');
    expect(s).toMatch(/ANKLE_FORWARD_START_M\)\s*\/\s*ANKLE_BAND_M/);
    // Y la direccion del pie se MIDE: la armadura de la pierna tiene cuatro
    // huesos y ninguno en los dedos, asi que no hay hueso de la punta.
    expect(s).toMatch(/function footForward\(\s*\n?\s*meshes: readonly THREE\.SkinnedMesh\[\]/);
  });
});

describe('el banco de render no inventa defectos', () => {
  it('el recorte de lado mide la X, no el radio de la esfera', () => {
    // Comparar |centro.x| con el RADIO metia la pierna CONTRARIA en las hojas
    // laterales: una malla larga y fina tiene un radio enorme. Sus tendones,
    // quietos, parecian salir disparados del pie posado.
    const s = readFileSync(
      resolve(__dirname, '../../../scripts/render-pose.mts'),
      'utf8',
    );
    expect(s).toMatch(/_box\.min\.x < 0 && _box\.max\.x > 0/);
    expect(s).not.toMatch(/Math\.abs\(_c\.x\) <= bs\.radius/);
  });

  it('y la tapa distal la IMPORTA en vez de copiarla', () => {
    const s = readFileSync(
      resolve(__dirname, '../../../scripts/render-pose.mts'),
      'utf8',
    );
    expect(s).toMatch(/import \{ inDistalRegion \} from '\.\.\/src\/lib\/rigLimbTrim\.ts'/);
    expect(s).not.toMatch(/const inDistalRegion = \(c: THREE\.Vector3\)/);
  });
});
