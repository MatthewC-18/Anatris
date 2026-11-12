// LA LINEA DE TIEMPO DE LOS DEMOS.
//
// El brazo de Hawkins-Kennedy atravesaba el torax porque el demo sostenia los
// componentes de la maniobra (codo a 90, rotacion interna a 70) FIJOS desde el
// primer fotograma, con el brazo todavia abajo. `npm run audit-demo-path` lo
// mide sobre el modelo; esto fija la logica que lo evita.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_DEMO_ORDER,
  DEMO_HOLD_REST_MS,
  DEMO_HOLD_TARGET_MS,
  baseAngle,
  loopAt,
  strokeAt,
  strokePlan,
} from '../demoTimeline';

describe('el trazo de ida', () => {
  it('por defecto, primero la base y despues la maniobra', () => {
    expect(DEFAULT_DEMO_ORDER).toBe('base-first');
    // En reposo no hay NADA de maniobra: es lo que mantenia el antebrazo fuera
    // del torax.
    expect(strokeAt('base-first', 0, true, 0.6)).toEqual({ base: 0, comp: 0 });
    // Al acabar el primer tramo la base ha llegado y la maniobra no ha empezado.
    const mitad = strokeAt('base-first', 0.6, true, 0.6);
    expect(mitad.base).toBe(1);
    expect(mitad.comp).toBe(0);
    expect(strokeAt('base-first', 1, true, 0.6)).toEqual({ base: 1, comp: 1 });
  });

  it('el orden de antes metia la maniobra entera desde el principio', () => {
    // Se conserva para poder medirlo: es el que daba un 19,4% del antebrazo
    // dentro del tronco en Hawkins-Kennedy.
    expect(strokeAt('together', 0, true)).toEqual({ base: 0, comp: 1 });
  });

  it('componentes primero: la base espera a que la maniobra este puesta', () => {
    expect(strokeAt('components-first', 0.39, true, 0.4).base).toBe(0);
    expect(strokeAt('components-first', 0.4, true, 0.4).comp).toBe(1);
  });

  it('sin componentes, solo hay base', () => {
    for (const o of ['base-first', 'together', 'components-first', 'proportional'] as const) {
      expect(strokeAt(o, 0.5, false).comp).toBe(0);
      expect(strokeAt(o, 1, false).base).toBe(1);
    }
  });

  it('nunca da un salto: cada tramo entra y sale suave', () => {
    let prev = strokeAt('base-first', 0, true, 0.6);
    for (let k = 1; k <= 200; k++) {
      const f = strokeAt('base-first', k / 200, true, 0.6);
      expect(Math.abs(f.base - prev.base)).toBeLessThan(0.03);
      expect(Math.abs(f.comp - prev.comp)).toBeLessThan(0.03);
      prev = f;
    }
  });
});

describe('el bucle entero', () => {
  const plan = strokePlan('base-first', 90, [90, 70]);

  it('dura lo que tardan la base a 26 grados/s y la maniobra a 40', () => {
    // 90/26 = 3,46 s de base y 90/40 = 2,25 s de maniobra.
    expect(plan.ms).toBeCloseTo(3462 + 2250, -1);
    expect(plan.split).toBeCloseTo(3462 / 5712, 2);
  });

  it('ida, espera larga en la prueba, vuelta y espera corta en reposo', () => {
    expect(loopAt(0, 'base-first', true, plan).phase).toBe('out');
    expect(loopAt(plan.ms + 10, 'base-first', true, plan)).toEqual({ phase: 'hold', base: 1, comp: 1 });
    expect(loopAt(plan.ms + DEMO_HOLD_TARGET_MS + 10, 'base-first', true, plan).phase).toBe('back');
    const reposo = loopAt(2 * plan.ms + DEMO_HOLD_TARGET_MS + 10, 'base-first', true, plan);
    expect(reposo).toEqual({ phase: 'rest', base: 0, comp: 0 });
  });

  it('la vuelta es la ida al reves: lo ultimo que entro sale primero', () => {
    // Al empezar la vuelta lo que baja es la maniobra; la base sigue arriba.
    const f = loopAt(plan.ms + DEMO_HOLD_TARGET_MS + 300, 'base-first', true, plan);
    expect(f.base).toBe(1);
    expect(f.comp).toBeLessThan(1);
  });

  it('se repite', () => {
    const ciclo = 2 * plan.ms + DEMO_HOLD_TARGET_MS + DEMO_HOLD_REST_MS;
    for (const ms of [5, 1200, plan.ms + 50, ciclo - 100]) {
      const a = loopAt(ciclo + ms, 'base-first', true, plan);
      const b = loopAt(ms, 'base-first', true, plan);
      expect(a.phase).toBe(b.phase);
      expect(a.base).toBeCloseTo(b.base, 9);
      expect(a.comp).toBeCloseTo(b.comp, 9);
    }
  });
});

describe('el arco compartido', () => {
  it('en la extension de codo y rodilla, la posicion sostenida es el 0', () => {
    expect(baseAngle(0, 120, true)).toBe(120);
    expect(baseAngle(1, 120, true)).toBe(0);
    expect(baseAngle(1, 90, false)).toBe(90);
  });
});

describe('los dos paneles usan el bucle compartido', () => {
  for (const f of ['OrthopedicTestsPanel.tsx', 'NeuroPanel.tsx']) {
    it(f, () => {
      const src = readFileSync(`src/components/movement/${f}`, 'utf8');
      expect(src).toContain('startDemoLoop({');
      expect(src).toContain('order: d.order');
      // Al rig no se le mandan los componentes del dato tal cual: se le mandan
      // los que escala el bucle en cada fotograma.
      expect(src).toContain('const push = (deg: number, components: typeof d.components) =>');
      const push = src.slice(src.indexOf('const push = (deg: number, components'));
      const payload = push.slice(0, push.indexOf('});'));
      expect(payload).not.toContain('components: d.components');
      expect(src).not.toContain('const DPS = 26;');
    });
  }
});
