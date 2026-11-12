// src/components/account/PremiumGate.tsx
//
// Shared UI + plumbing for the capability paywall (src/auth/entitlements.ts).
//
// WHY A CONTEXT: the locked capabilities live deep in the tree (the movement
// lab's tests / neuro panels, the patient-mode pill, the movement list), and
// the pricing overlay is owned by App. Prop-drilling `setOverlay` through five
// levels made every intermediate component know about billing. `UpgradeProvider`
// gives any descendant one call — `useUpgrade().openPricing(source)` — and also
// fires the funnel event with WHERE the user was when they hit the wall, which
// is the number that tells us which capability actually sells.
//
// DESIGN RULE: a locked capability is shown, not hidden. `PremiumPill` marks it
// in place; `PremiumTeaser` replaces a whole locked panel with what it does plus
// one CTA. An empty space communicates nothing; a lock communicates value.
//
// SIN CAJAS (sistema LAMINA, docs/sistema-lamina.md). `PremiumTeaser` se pinta
// DENTRO del margen derecho del laboratorio (pestanas Tests y Neuro bloqueadas)
// y era una tarjeta ambar con borde, con una pastilla dentro y un boton que era
// otro bloque tenido: tres recuadros anidados dentro de un margen que no admite
// ninguno. Ahora es lo que es cualquier otra seccion del margen: rotulo y filo,
// el titulo, la lista con una regla ambar a la izquierda (el ambar queda para
// decir "candado", no para pintar un fondo) y un boton.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { FEATURE_LABEL, type PremiumFeature } from '../../auth/entitlements';
import { useEntitlement } from '../../auth/AuthContext';
import { EVENTS, track } from '../../lib/analytics';

/* ---------------------------------------------------------------------------
 * Upgrade context
 * ------------------------------------------------------------------------ */

interface UpgradeContextValue {
  /** Open the pricing surface. `source` is recorded in the funnel event. */
  openPricing: (source?: string) => void;
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

export function UpgradeProvider({
  onOpenPricing,
  children,
}: {
  onOpenPricing: () => void;
  children: ReactNode;
}) {
  const value = useMemo<UpgradeContextValue>(
    () => ({
      openPricing: (source?: string) => {
        track(EVENTS.paywallViewed, { source: source ?? 'unknown' });
        onOpenPricing();
      },
    }),
    [onOpenPricing],
  );
  return <UpgradeContext.Provider value={value}>{children}</UpgradeContext.Provider>;
}

/**
 * Open the pricing surface from anywhere below <UpgradeProvider>. Falls back to
 * a no-op outside the provider so isolated renders (tests, storybook-style
 * harnesses) don't need the whole app shell.
 */
export function useUpgrade(): UpgradeContextValue {
  return useContext(UpgradeContext) ?? { openPricing: () => {} };
}

/**
 * One-stop hook for a gated capability: whether it's unlocked, and the click
 * handler to use when it isn't.
 */
export function useFeatureGate(feature: PremiumFeature): {
  unlocked: boolean;
  requestUpgrade: () => void;
  label: string;
} {
  const { canUseFeature } = useEntitlement();
  const { openPricing } = useUpgrade();
  const unlocked = canUseFeature(feature);
  return {
    unlocked,
    requestUpgrade: () => openPricing(feature),
    label: FEATURE_LABEL[feature],
  };
}

/* ---------------------------------------------------------------------------
 * Presentational pieces
 * ------------------------------------------------------------------------ */

/** Small lock glyph. Shared by the TopBar region nav and every locked control. */
export function LockGlyph({ className = '' }: { className?: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`opacity-80 ${className}`}
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/**
 * Marca "Premium" para una fila o un mando bloqueado, en su sitio. Era una
 * capsula ambar rellena; ahora es una etiqueta en mono con el candado, que dice
 * lo mismo sin dibujar una ficha.
 */
export function PremiumPill({ compact = false }: { compact?: boolean }) {
  return (
    <span className="tag inline-flex shrink-0 items-center gap-1 text-amber-300">
      <LockGlyph className="h-2.5 w-2.5" />
      {!compact && 'Premium'}
    </span>
  );
}

/**
 * Replaces a locked panel's body. Says what the capability DOES (so the value is
 * concrete) and offers exactly one action.
 *
 * El boton es `.btn-line` y no `.btn-primary` a proposito: en el margen derecho
 * del laboratorio convive con "Diseccionar" (la ficha acoplada al pie), que es
 * la accion principal de ese margen, y dos botones rellenos en la misma columna
 * dejan de decir cual es el principal. Es el mismo contorno que lleva "Hazte
 * Premium" en la barra: las puertas de venta se reconocen por el filo.
 */
export function PremiumTeaser({
  feature,
  title,
  lines,
  compact = false,
}: {
  feature: PremiumFeature;
  /** Overrides the default feature label as the headline. */
  title?: string;
  /** Two or three concrete things this capability gives the physio. */
  lines: string[];
  compact?: boolean;
}) {
  const { requestUpgrade, label } = useFeatureGate(feature);

  return (
    <section className={`flex flex-col ${compact ? 'gap-2.5' : 'gap-3.5'}`}>
      <div className="sec-head mb-0">
        <span className="kicker inline-flex items-center gap-1.5 text-amber-300">
          <LockGlyph className="h-2.5 w-2.5" />
          Premium
        </span>
        <span className="sec-rule" />
      </div>
      <h3
        className={`font-display font-semibold leading-snug text-fg ${
          compact ? 'text-sm' : 'text-base'
        }`}
      >
        {title ?? label}
      </h3>
      <ul className="note note-warn flex flex-col gap-1.5">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {/* El boton dice que hace (desbloquea) y la linea de debajo, adonde lleva
          (a los planes): un candado que no dice que pasa al pulsarlo se lee
          como un mando roto. */}
      <div className="flex flex-col gap-1.5">
        <button type="button" onClick={requestUpgrade} className="btn btn-line w-full text-fg">
          Desbloquear con Premium
        </button>
        <p className="text-[11px] leading-snug text-fg3">
          Abre los planes, con lo que incluye cada uno.
        </p>
      </div>
    </section>
  );
}
