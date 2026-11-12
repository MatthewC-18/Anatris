// src/components/account/SiteDialog.tsx
//
// El cascaron de los dialogos que se abren en LOS DOS MUNDOS: sobre el sitio
// publico (papel o tinta, segun el tema elegido) y dentro del producto (siempre
// tinta). Son tres: iniciar sesion, elegir contrasena y los textos legales.
//
// POR QUE NO ES `.instrument`. La superficie flotante del sistema LAMINA es
// grafito fijo (`rgb(15 17 20)` en `.glass-strong`, src/index.css), y eso es
// correcto dentro del producto. Pero estos tres tambien se abren sobre la
// landing, y un panel de grafito encima de una pagina en papel es justo el
// defecto que AuthModal ya habia corregido una vez ("the sign-up step of the
// funnel arrived as a dark neon panel over a light page"). Asi que la
// superficie se dibuja con los tokens del tema, que resuelven solos a papel o a
// tinta, y con las mismas medidas que `.instrument`: 6 px de radio, un filo.
//
// Cada uno de los tres traia su propio velo, su propio recuadro y ninguna
// gestion de teclado: ni `role="dialog"`, ni Escape, ni foco. Ahora comparten
// este, que es un dialogo de verdad (`useDialogFocus`).

import { useRef, type ReactNode } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface SiteDialogProps {
  /** Cierra con Escape, con el velo y con el aspa. Sin valor, no se puede cerrar. */
  onClose?: () => void;
  /** `id` del titulo visible del dialogo. */
  labelledBy: string;
  /** Capa: los legales se abren ENCIMA del inicio de sesion. */
  layer?: 'modal' | 'above';
  /** Ancho maximo y lo que haga falta del contenedor (`max-w-sm`, `flex`...). */
  className?: string;
  children: ReactNode;
}

export function SiteDialog({
  onClose,
  labelledBy,
  layer = 'modal',
  className = '',
  children,
}: SiteDialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  useDialogFocus(panel, { onEscape: onClose });

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${
        layer === 'above' ? 'z-[70]' : 'z-[60]'
      }`}
    >
      {/* El velo no es un boton: cerrar ya tiene el aspa y Escape, y un segundo
          "Cerrar" del tamano de la pantalla solo confundia al lector. */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        // caja-ok: es la superficie flotante del dialogo; `.instrument` es grafito fijo y este se abre tambien sobre el sitio en papel
        className={`relative z-10 w-full animate-scale-in rounded-md border border-line bg-card shadow-xl outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/** El aspa de cerrar, igual en los tres dialogos. */
export function DialogClose({ onClose, className = '' }: { onClose: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label="Cerrar"
      onClick={onClose}
      className={`btn btn-quiet btn-icon ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
