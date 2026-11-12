// LA HOJA DE REVISION PINTA LA MISMA FIGURA QUE LA APP.
//
// scripts/render-neuro-plate.mts copia a mano tres colores de DermatomeMap (el
// contorno, la sombra y el tejido de la figura) para rasterizar las laminas que
// se revisan sin abrir la app. Al pasar el panel Neuro al sistema LAMINA la
// figura cambio de azul marino a grafito y el script siguio con los viejos: la
// hoja de revision ya no se parecia a la pantalla. Este test lo ata.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const constante = (src: string, nombre: string): string | undefined =>
  src.match(new RegExp(`const ${nombre} = '([^']+)'`))?.[1];

describe('los colores de la figura de dermatomas', () => {
  const app = readFileSync('src/components/movement/DermatomeMap.tsx', 'utf8');
  const banco = readFileSync('scripts/render-neuro-plate.mts', 'utf8');
  for (const nombre of ['RIM', 'SHADE', 'TISSUE']) {
    it(`${nombre} es el mismo en la app y en el banco`, () => {
      const enApp = constante(app, nombre);
      expect(enApp, `DermatomeMap.tsx ya no define ${nombre}`).toBeDefined();
      expect(constante(banco, nombre)).toBe(enApp);
    });
  }
});
