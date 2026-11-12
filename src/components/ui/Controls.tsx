// src/components/ui/Controls.tsx
//
// Los tres mandos primitivos del laboratorio. Cubren todos los ajustes de los
// margenes:
//
//   Switch     una fila con su interruptor (encendido / apagado)
//   Segmented  de 2 a 4 opciones excluyentes, cortas, en una fila
//   IconButton una accion cuadrada, solo icono, con nombre accesible
//
// SISTEMA LAMINA (docs/sistema-lamina.md): NINGUNO DIBUJA UNA CAJA.
//
// `Segmented` era una pista redondeada con borde y, dentro, una ficha blanca
// rellena para la opcion activa: una caja dentro de otra, y ademas el objeto
// mas brillante del panel para decir "Derecho". Ahora son pestanas (`.tabs` y
// `.tab`): texto y un subrayado de 2 px bajo la activa, que es la receta del
// sistema para "un control segmentado de 2 a 4 opciones cortas".
//
// `IconButton` era un cuadrado de 8 px de radio, y su variante principal un
// relleno del acento con un halo de 16 px: el boton de reproducir brillaba mas
// que el musculo que se estaba estudiando. Ahora es `.btn .btn-icon`: la
// variante `primary` usa `.btn-primary` (el relleno sobrio del sistema, sin
// sombra) y la otra `.btn-quiet` (texto que responde al pasar).
//
// `Switch` conserva la pista y el pulgar, que ES el objeto y no una caja (la
// regla admite `rounded-full` para pulgares de interruptor), con las medidas de
// las filas de capas (28 x 16) para que los dos interruptores del laboratorio
// sean el mismo.
//
// LA API NO CAMBIA: mismos props, mismos roles y mismos `aria-*`. Los usan
// otros paneles (la ficha de diseccion, la consola) y ninguno tiene que tocar
// nada para recibir el aspecto nuevo.

import type { ReactNode } from 'react';
import { LockGlyph } from '../account/PremiumGate';

/* ---------------------------------------------------------------------------
 * Switch
 * ------------------------------------------------------------------------ */
export function Switch({
  checked,
  onChange,
  label,
  icon,
  hint,
  tone = 'accent',
  locked = false,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  icon?: ReactNode;
  /** Optional second line under the label. */
  hint?: string;
  /** Track color when on. */
  tone?: 'accent' | 'amber';
  /** Shows a lock instead of the track; onChange still fires (opens pricing). */
  locked?: boolean;
  disabled?: boolean;
}) {
  const on = checked && !locked;
  const trackOn =
    tone === 'amber' ? 'border-[#ff8c1a]/60 bg-[#ff8c1a]/70' : 'border-brand/50 bg-brand/60';
  return (
    <button
      type="button"
      role={locked ? undefined : 'switch'}
      aria-checked={locked ? undefined : checked}
      onClick={onChange}
      disabled={disabled}
      className="group flex w-full items-center gap-2.5 py-1.5 text-left transition-opacity disabled:opacity-40"
    >
      {icon && (
        <span className={on ? 'text-brand' : 'text-fg3 group-hover:text-fg2'}>{icon}</span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-xs font-medium transition-colors ${
            locked ? 'text-amber-200/90' : on ? 'text-fg' : 'text-fg2 group-hover:text-fg'
          }`}
        >
          {label}
        </span>
        {hint && <span className="mt-0.5 block truncate text-[11px] text-fg3">{hint}</span>}
      </span>
      {locked ? (
        <span className="text-amber-300/80">
          <LockGlyph />
        </span>
      ) : (
        <span
          className={`relative h-[16px] w-[28px] shrink-0 rounded-full border transition-colors duration-200 ${
            on ? trackOn : 'border-line bg-card'
          }`}
        >
          <span
            className={`absolute top-[2px] h-[10px] w-[10px] rounded-full transition-all duration-200 ${
              on ? 'left-[14px] bg-fg' : 'left-[2px] bg-fg3'
            }`}
          />
        </span>
      )}
    </button>
  );
}

/* ---------------------------------------------------------------------------
 * Segmented
 * ------------------------------------------------------------------------ */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'sm',
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'xs';
}) {
  // Los dos tamanos solo cambian el cuerpo y el aire; el subrayado es el mismo.
  // `.tab` trae 13 px y 10 px de relleno, pensado para las pestanas de un
  // margen entero; en linea con un rotulo tiene que ser mas bajo o descuadra la
  // fila en la que se sienta.
  const pad = size === 'xs' ? 'py-1.5 text-[11px]' : 'py-2 text-xs';
  const gap = size === 'xs' ? 'gap-3' : 'gap-4';
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      // `inline-flex`: el filo de base mide lo que miden las opciones, no el
      // ancho del padre. Es un mando en linea, no la cabecera de un panel.
      className={`tabs inline-flex shrink-0 ${gap}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            // `.tab` se enciende con `aria-selected`, que es de pestana; esto es
            // un grupo de radio y su atributo es `aria-checked`, asi que la
            // activa se marca con la clase.
            className={`tab ${pad} ${active ? 'is-active' : ''}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * IconButton
 * ------------------------------------------------------------------------ */
export function IconButton({
  onClick,
  label,
  children,
  variant = 'ghost',
  disabled = false,
  className = '',
}: {
  onClick: () => void;
  /** Accessible name; also the tooltip. */
  label: string;
  children: ReactNode;
  variant?: 'ghost' | 'primary';
  disabled?: boolean;
  className?: string;
}) {
  const skin = variant === 'primary' ? 'btn-primary' : 'btn-quiet';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`btn btn-icon shrink-0 ${skin} ${className}`}
    >
      {children}
    </button>
  );
}
