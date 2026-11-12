// src/components/CanvasLoader.tsx
//
// La espera de Explorar mientras baja el modelo: la lamina de carga de toda la
// aplicacion (`.carga` en index.css, el video de src/components/LoaderVideo.tsx)
// con el porcentaje real de drei en la linea. Se retira cuando el visor se marca
// listo.
//
// Era un anillo girando dentro de un disco y una barra con brillo: el mismo
// "cargando" de cualquier programa, y con el hilo ocupado el anillo se paraba.

import { LoaderVideo } from './LoaderVideo';

interface CanvasLoaderProps {
  progress: number;
}

export function CanvasLoader({ progress }: CanvasLoaderProps) {
  const pct = Math.min(100, Math.round(progress));

  return (
    <div className="viewer-bg carga animate-fade-in">
      <div className="carga-video">
        <div className="carga-acercar">
          <LoaderVideo />
        </div>
      </div>
      <div className="carga-texto">
        <p className="carga-marca">Anatris</p>
        <p className="carga-titulo">Atlas anatómico</p>
        <div className="carga-linea" aria-hidden>
          <span
            className="carga-relleno transition-transform duration-300 ease-out"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
        <p role="status" aria-live="polite" className="carga-estado">
          Cargando el modelo anatómico <span className="num text-brand">{pct}%</span>
        </p>
      </div>
    </div>
  );
}
