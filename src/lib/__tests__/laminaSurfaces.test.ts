// EL SISTEMA LAMINA NO VUELVE ATRAS.
//
// "Que no tenga el mismo diseno de las otras paginas, que son como tarjetas
// dentro de tarjetas." La regla que lo resuelve (docs/sistema-lamina.md) es que
// dentro de un margen no hay cajas, y este test es lo que la sostiene: cada
// fichero que se convierte entra en la lista de abajo y, desde ese momento, una
// caja nueva sin justificar suspende la suite.
//
// La lista CRECE. No se le quita un fichero para que pase el test: se quita la
// caja, o se justifica con `caja-ok: <motivo>` donde el recuadro es el objeto.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { auditSurfaces, surfaceKinds, unjustifiedBoxes } from '../laminaSurfaces';

describe('el detector de cajas', () => {
  it('ve una caja: radio, contorno y relleno', () => {
    expect(surfaceKinds('rounded-xl border border-slate-800 bg-slate-900/60 p-3')).toEqual(['caja']);
  });

  it('ve un bloque: radio y relleno sin contorno', () => {
    // La caja que no se ve en el codigo y si en pantalla. La primera version
    // del banco no la contaba.
    expect(surfaceKinds('rounded-lg bg-slate-100/[0.05] p-2')).toEqual(['bloque']);
  });

  it('ve una pastilla: ficha con relleno o contorno', () => {
    expect(surfaceKinds('rounded-full border px-2 py-0.5 text-[10px]')).toEqual(['pastilla']);
    expect(surfaceKinds('rounded bg-accent/20 px-1.5 text-accent')).toEqual(['pastilla']);
  });

  it('un relleno que solo aparece al pasar NO es una caja', () => {
    // Es la respuesta de un boton, no un recuadro en reposo.
    expect(surfaceKinds('rounded-lg p-1 text-fg3 hover:bg-fg/[0.06] hover:text-fg')).toEqual([]);
    expect(surfaceKinds('rounded-lg p-1 disabled:bg-slate-800 focus:bg-slate-700')).toEqual([]);
  });

  it('una clase con variante de ancho cuenta como su clase base', () => {
    expect(surfaceKinds('sm:rounded-lg sm:border sm:bg-amber-950/20')).toEqual(['caja']);
  });

  it('junta la firma repartida entre las ramas de un condicional', () => {
    // `border` en una cadena y el relleno en otra: literal a literal no es una
    // caja en ninguna; el elemento si lo es.
    const src = [
      'const x = (',
      '  <div',
      "    className={`rounded-xl border px-3 ${on ? 'bg-accent/20' : 'bg-ink-900'}`}",
      '  />',
      ');',
    ].join('\n');
    const h = auditSurfaces(src);
    expect(h.map((f) => f.kind)).toEqual(['caja']);
    expect(h[0].line).toBe(3);
  });

  it('no se pierde en una plantilla dentro de otra', () => {
    const src =
      "<a className={`tab ${a ? `x ${b ? 'rounded-lg border bg-card' : ''}` : ''}`} />\n" +
      '<b className="rounded-xl border bg-card" />';
    // Dos elementos, dos cajas: si el cierre de la primera expresion se
    // calculara mal, la segunda no se veria o se contaria dentro de la primera.
    expect(auditSurfaces(src).filter((f) => f.kind === 'caja')).toHaveLength(2);
  });

  it('lo que no dibuja nada no se marca', () => {
    expect(surfaceKinds('btn btn-quiet btn-sm')).toEqual([]);
    expect(surfaceKinds('tab h-full')).toEqual([]);
    expect(surfaceKinds('h-2 w-2 rounded-full bg-brand')).toEqual([]); // un punto, sin px
    expect(surfaceKinds('border-b border-line/75 px-4')).toEqual([]); // un filo
    expect(surfaceKinds('border-l-2 border-accent pl-2.5')).toEqual([]); // una regla a la izquierda
  });

  it('una superficie flotante se cuenta aparte y no necesita motivo', () => {
    expect(surfaceKinds('instrument absolute right-0 top-full z-50 mt-1 p-1')).toEqual(['superficie']);
  });

  it('`caja-ok:` justifica, en la linea o en las dos de encima', () => {
    const src = [
      '{/* caja-ok: la tarjeta de repaso es el objeto que se voltea */}',
      '<div className="rounded-xl border border-line bg-card p-6" />',
    ].join('\n');
    const h = auditSurfaces(src);
    expect(h[0].justified).toBe('la tarjeta de repaso es el objeto que se voltea');
    expect(unjustifiedBoxes(src)).toHaveLength(0);
  });
});

/**
 * Ficheros YA convertidos al sistema LAMINA. Cero cajas sin justificar.
 * Anadir aqui cada fichero en cuanto se convierte.
 */
const CONVERTIDOS = [
  'src/App.tsx',
  'src/components/AbductionSchematic.tsx',
  'src/components/AtlasLabels.tsx',
  'src/components/BoneList.tsx',
  'src/components/BrandMark.tsx',
  'src/components/CanvasLoader.tsx',
  'src/components/CommandPalette.tsx',
  'src/components/GuideHub.tsx',
  'src/components/LegalScreen.tsx',
  'src/components/MedicalDisclaimer.tsx',
  'src/components/MuscleList.tsx',
  'src/components/OnboardingTour.tsx',
  'src/components/PartFocusControls.tsx',
  'src/components/RouteNotice.tsx',
  'src/components/SaveButton.tsx',
  'src/components/SelectionPanel.tsx',
  'src/components/Sidebar.tsx',
  'src/components/ThemeToggle.tsx',
  'src/components/TopBar.tsx',
  'src/components/ViewToolbar.tsx',
  'src/components/Viewer3D.tsx',
  'src/components/ViewerHud.tsx',
  'src/components/account/AccountMenu.tsx',
  'src/components/account/AuthModal.tsx',
  'src/components/account/PremiumGate.tsx',
  'src/components/account/SetPasswordModal.tsx',
  'src/components/account/SiteDialog.tsx',
  'src/components/landing/Goniometer.tsx',
  'src/components/landing/HeroMedia.tsx',
  'src/components/landing/SocialProof.tsx',
  'src/components/movement/LabCallouts.tsx',
  'src/components/movement/LayerControls.tsx',
  'src/components/movement/MobileLabSheet.tsx',
  'src/components/movement/MovementControls.tsx',
  'src/components/movement/MovementView.tsx',
  'src/components/movement/RhythmReadout.tsx',
  'src/components/movement/RigLoadingScreen.tsx',
  'src/components/movement/RigViewer.tsx',
  'src/components/movement/StageReadout.tsx',
  'src/components/study/CollectionView.tsx',
  'src/components/study/FlashcardsView.tsx',
  'src/components/study/FlipCard.tsx',
  'src/components/study/QuizView.tsx',
  'src/components/study/ReviewView.tsx',
  'src/components/study/StudyDashboard.tsx',
  'src/components/study/StudyView.tsx',
  'src/components/ui/Controls.tsx',
  'src/components/ui/Icons.tsx',
  'src/dev/loaderHarness.tsx',
] as const;

describe('los ficheros convertidos no vuelven a tener cajas', () => {
  for (const path of CONVERTIDOS) {
    it(path, () => {
      const quedan = unjustifiedBoxes(readFileSync(path, 'utf8'));
      expect(
        quedan.map((f) => `${path}:${f.line}  ${f.kind}  ${f.text}`),
        'caja, bloque o pastilla sin justificar (ver docs/sistema-lamina.md)',
      ).toEqual([]);
    });
  }
});

describe('el laboratorio es una lamina, no un lienzo con tarjetas encima', () => {
  const view = readFileSync('src/components/movement/MovementView.tsx', 'utf8');

  it('los dos margenes estan acoplados, en el flujo', () => {
    expect(view).toContain('margin margin-l');
    expect(view).toContain('margin margin-r');
    // Nada de columnas en `absolute` sobre el lienzo: es lo que tapaba el brazo
    // en abduccion y lo que obligaba a sumar rems para que no se pisaran.
    expect(view).not.toMatch(/absolute top-3 bottom-3 left-3/);
    expect(view).not.toMatch(/absolute top-4 right-4 bottom-4/);
  });

  it('la ficha de diseccion va acoplada al margen derecho en escritorio', () => {
    expect(view).toContain('<DissectionPanel docked />');
  });

  it('el escenario conserva su instancia al entrar y salir del modo paciente', () => {
    // RigViewer se monta UNA vez en la vista de escritorio: si hubiera dos
    // (una por modo) React desmontaria el lienzo al cambiar y el cuerpo
    // volveria a cargarse entero.
    const escritorio = view.slice(view.lastIndexOf('<div className="flex h-full w-full">'));
    expect(escritorio.match(/<RigViewer/g)).toHaveLength(1);
    expect(escritorio).toContain("refitKey={patientMode ? 'paciente' : 'clinico'}");
  });

  it('el escenario nunca se queda sin sitio entre 1024 y 1920 px', () => {
    // Los margenes miden 19rem por debajo de xl y 21.5 + 23rem desde xl. El
    // cuerpo es vertical: con 380 px de ancho de escenario sigue cabiendo.
    expect(view).toContain('w-[19rem] shrink-0 xl:w-[21.5rem]');
    expect(view).toContain('w-[19rem] shrink-0 xl:w-[23rem]');
    for (let w = 1024; w <= 1920; w++) {
      const margenes = w >= 1280 ? (21.5 + 23) * 16 : 19 * 2 * 16;
      expect(w - margenes, `ventana ${w}px`).toBeGreaterThanOrEqual(380);
    }
  });
});
