// EL ARMAZON Y LAS RUTAS: el boton Atras no se queda atrapado y cada pantalla
// tiene su titulo.
//
// Los dos defectos estaban en los efectos de App.tsx, que un test en node no
// puede montar. Lo que si puede es reproducir la PILA DEL HISTORIAL con las
// funciones reales de rutas (`formatRoute`, `parseRoute`) y la regla real
// (`settledMode`), y comprobar leyendo el codigo que App aplica esa regla.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { allRoutes, formatRoute, parseRoute, type AppRoute } from '../routing';
import { documentTitleFor, regionDisplayName, settledMode } from '../shellRoute';
import type { AppMode } from '../../components/TopBar';

/** El historial del navegador, lo justo: una pila y un indice. */
class FakeHistory {
  entries: string[];
  index = 0;
  constructor(first: string) {
    this.entries = [first];
  }
  get path(): string {
    return this.entries[this.index];
  }
  /** Como `writeRoute`: no escribe si la direccion ya es esa; si no, apila. */
  write(path: string): void {
    if (this.path === path) return;
    this.entries = this.entries.slice(0, this.index + 1).concat(path);
    this.index += 1;
  }
  back(): void {
    if (this.index > 0) this.index -= 1;
  }
}

/**
 * Los efectos de App ante un estado nuevo, hasta que se asienta: escribir la
 * ruta y corregir el modo. `guard` es la regla nueva (no escribir una ruta que
 * se va a corregir); sin ella es el comportamiento anterior.
 */
function settle(h: FakeHistory, state: AppRoute, guard: boolean): AppRoute {
  let s = state;
  for (let i = 0; i < 4; i++) {
    const target = settledMode(s.region, s.mode);
    if (!(guard && target !== s.mode)) h.write(formatRoute(s));
    if (target === s.mode) return s;
    s = { ...s, mode: target };
  }
  throw new Error('el modo no se asienta');
}

/** Pulsar Atras: el navegador retrocede y App lee la ruta (popstate). */
function pressBack(h: FakeHistory, guard: boolean): string {
  h.back();
  const route = parseRoute(h.path);
  if (route) settle(h, route, guard);
  return h.path;
}

describe('Atras desde Fundamentos', () => {
  const walk = (guard: boolean) => {
    // El usuario esta en el hombro, en Explorar, y elige Fundamentos en la barra.
    const h = new FakeHistory('/hombro/explorar');
    settle(h, { region: 'fundamentos', mode: 'explore' }, guard);
    return h;
  };

  it('ANTES: quedaban dos entradas y Atras rebotaba para siempre', () => {
    const h = walk(false);
    expect(h.entries).toEqual([
      '/hombro/explorar',
      '/fundamentos/explorar',
      '/fundamentos/aprender',
    ]);
    // Diez pulsaciones de Atras y sigue en Fundamentos.
    for (let i = 0; i < 10; i++) {
      expect(pressBack(h, false)).toBe('/fundamentos/aprender');
    }
  });

  it('AHORA: una entrada, y Atras vuelve al hombro a la primera', () => {
    const h = walk(true);
    expect(h.entries).toEqual(['/hombro/explorar', '/fundamentos/aprender']);
    expect(pressBack(h, true)).toBe('/hombro/explorar');
  });

  it('la regla solo corrige un modulo conceptual abierto en Explorar', () => {
    expect(settledMode('fundamentos', 'explore')).toBe('learn');
    for (const mode of ['learn', 'study', 'movement'] as AppMode[]) {
      expect(settledMode('fundamentos', mode)).toBe(mode);
    }
    for (const mode of ['explore', 'learn', 'study', 'movement'] as AppMode[]) {
      expect(settledMode('knee', mode)).toBe(mode);
      expect(settledMode(null, mode)).toBe(mode);
    }
  });

  it('App escribe la ruta solo con el modo ya asentado', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).toContain('settledMode(region, mode)');
    // El efecto que escribe la ruta se salta el estado que va a corregirse.
    expect(app).toMatch(/if \(shownMode !== mode\) return;[\s\S]{0,400}writeRoute\(/);
  });
});

describe('el titulo del documento', () => {
  it('nombra la region y el modo', () => {
    expect(documentTitleFor('knee', 'movement')).toBe('Rodilla · Movimiento | Anatris');
    expect(documentTitleFor('shoulder', 'explore')).toBe('Hombro · Explorar | Anatris');
    expect(documentTitleFor('fundamentos', 'learn')).toBe('Fundamentos · Aprender | Anatris');
  });

  it('las 36 rutas tienen 36 titulos distintos', () => {
    const titles = allRoutes().map((path) => {
      const r = parseRoute(path)!;
      return documentTitleFor(r.region, r.mode);
    });
    expect(titles).toHaveLength(36);
    expect(new Set(titles).size).toBe(36);
    // Ninguno se queda sin region (saldria "Explorar | Anatris").
    for (const t of titles) expect(t).toMatch(/^.+ · .+ \| Anatris$/);
  });

  it('el modo se llama igual que en la barra superior', () => {
    // El nombre sale del slug de la ruta. Si alguien cambia el slug y no la
    // etiqueta de la barra (o al reves), el titulo diria otra cosa que la
    // pestana que el usuario tiene seleccionada.
    const bar = readFileSync('src/components/TopBar.tsx', 'utf8');
    for (const mode of ['explore', 'learn', 'study', 'movement'] as AppMode[]) {
      const name = documentTitleFor('shoulder', mode).split(' · ')[1].replace(' | Anatris', '');
      expect(bar, name).toContain(`label: '${name}'`);
    }
  });

  it('cada region de las rutas tiene nombre', () => {
    for (const path of allRoutes()) {
      const r = parseRoute(path)!;
      expect(regionDisplayName(r.region), r.region).toBeTruthy();
    }
  });

  it('App lo asigna', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).toContain('document.title = documentTitleFor(');
  });
});
