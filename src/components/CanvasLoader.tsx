// src/components/CanvasLoader.tsx
//
// La espera de Explorar mientras baja el modelo: el video de carga de toda la
// aplicacion (src/components/LoaderVideo.tsx) con el porcentaje real de drei
// debajo. Se retira cuando el visor se marca listo.
//
// Era un anillo girando dentro de un disco y una barra con brillo: el mismo
// "cargando" de cualquier programa, y con el hilo ocupado el anillo se paraba.
// El video lo lleva el compositor y sigue (ver LoaderVideo).

import { LoaderVideo } from './LoaderVideo';

interface CanvasLoaderProps {
  progress: number;
}

export function CanvasLoader({ progress }: CanvasLoaderProps) {
  const pct = Math.min(100, Math.round(progress));

  return (
    <div className="viewer-bg stage-wait absolute inset-0 z-10 animate-fade-in">
      <LoaderVideo />
      <p role="status" aria-live="polite" className="stage-note text-fg2">
        Cargando el modelo anatómico <span className="num text-brand">{pct}%</span>
      </p>
      {/* Un filo que se llena, no una barra con brillo. */}
      <div className="h-px w-56 bg-line" aria-hidden>
        <div
          className="h-px bg-brand transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
