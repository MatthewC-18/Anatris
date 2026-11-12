// LOS DIALOGOS SE PUEDEN USAR CON TECLADO.
//
// El entorno de estos tests es node (sin DOM), asi que aqui se fija la LOGICA
// que decide el hook --a donde salta el foco y que teclas no pasan a los atajos
// de debajo-- y, leyendo el codigo, que cada superficie modal del armazon lo
// usa. Antes de `useDialogFocus` ni la guia, ni los planes, ni los cajones
// moviles se cerraban con Escape.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { swallowsShortcut, trapTarget } from '../useDialogFocus';

describe('la vuelta del foco dentro de un dialogo', () => {
  it('en medio, el navegador sigue solo', () => {
    expect(trapTarget(4, 1, false)).toBeNull();
    expect(trapTarget(4, 2, true)).toBeNull();
  });

  it('en el ultimo, Tab vuelve al primero', () => {
    expect(trapTarget(4, 3, false)).toBe(0);
  });

  it('en el primero, Mayus+Tab va al ultimo', () => {
    expect(trapTarget(4, 0, true)).toBe(3);
  });

  it('con el foco en el contenedor entra por el extremo que toca', () => {
    expect(trapTarget(4, -1, false)).toBe(0);
    expect(trapTarget(4, -1, true)).toBe(3);
  });

  it('sin nada enfocable el foco se queda en el contenedor', () => {
    expect(trapTarget(0, -1, false)).toBe(-1);
  });
});

describe('los atajos sueltos no pasan por debajo de un dialogo', () => {
  const key = (
    k: string,
    mod: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean }> = {},
  ) => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, ...mod });

  it('D, A, Z, R y las vistas 1 a 6 se quedan en el dialogo', () => {
    // Son los atajos que hoy escuchan en window: DissectionPanel (d, a, z),
    // RigViewer (r) y ViewToolbar (1..6).
    for (const k of ['d', 'a', 'z', 'r', 'R', '1', '6']) {
      expect(swallowsShortcut(key(k), false), k).toBe(true);
    }
  });

  it('escribiendo en un campo no se toca nada', () => {
    expect(swallowsShortcut(key('d'), true)).toBe(false);
  });

  it('el espacio y las teclas con nombre siguen su camino', () => {
    // El espacio activa el boton enfocado; Enter, las flechas y Tab no son
    // atajos de una letra.
    for (const k of [' ', 'Enter', 'ArrowRight', 'Tab']) {
      expect(swallowsShortcut(key(k), false), k).toBe(false);
    }
  });

  it('con Ctrl o Cmd la tecla es del usuario', () => {
    expect(swallowsShortcut(key('c', { ctrlKey: true }), false)).toBe(false);
    expect(swallowsShortcut(key('r', { metaKey: true }), false)).toBe(false);
  });
});

describe('cada superficie modal del armazon es un dialogo', () => {
  // Los que dibujan su propio dialogo: los cascarones de App (superposiciones y
  // cajones), el tour y el cascaron compartido de los dialogos del sitio.
  const DIALOGOS = [
    'src/App.tsx',
    'src/components/OnboardingTour.tsx',
    'src/components/account/SiteDialog.tsx',
  ];

  for (const path of DIALOGOS) {
    it(path, () => {
      const src = readFileSync(path, 'utf8');
      expect(src).toContain('useDialogFocus(');
      expect(src).toContain('role="dialog"');
      expect(src).toContain('aria-modal="true"');
    });
  }

  // Y los tres que se abren sobre el sitio y sobre el producto usan ese
  // cascaron en vez de un recuadro propio sin teclado.
  for (const path of [
    'src/components/LegalScreen.tsx',
    'src/components/account/AuthModal.tsx',
    'src/components/account/SetPasswordModal.tsx',
  ]) {
    it(`${path} usa SiteDialog`, () => {
      const src = readFileSync(path, 'utf8');
      expect(src).toContain('<SiteDialog');
      expect(src).not.toContain('fixed inset-0');
    });
  }

  it('recuperar la contrasena no se puede cerrar con Escape ni con el velo', () => {
    // El enlace de recuperacion deja una sesion temporal: cerrar el dialogo a
    // medias dejaria al usuario dentro sin contrasena.
    const src = readFileSync('src/components/account/SetPasswordModal.tsx', 'utf8');
    expect(src).toContain("const dismiss = mode === 'change' ? finish : undefined;");
    expect(src).toContain('<SiteDialog onClose={dismiss}');
  });

  it('los dos cascarones de App se cierran con Escape', () => {
    const src = readFileSync('src/App.tsx', 'utf8');
    // Uno por OverlayShell y otro por DrawerShell.
    expect(src.match(/useDialogFocus\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(src.match(/onEscape: onClose/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
