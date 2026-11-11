// src/components/account/AccountMenu.tsx
//
// TopBar account control. Signed out: a "Iniciar sesión" button. Signed in: a
// menu showing the email, the plan badge, and actions (upgrade / manage billing
// / sign out). Lives in the header flow like the other TopBar controls.

import { useEffect, useRef, useState } from 'react';
import { useAuth, useEntitlement } from '../../auth/AuthContext';
import { SetPasswordModal } from './SetPasswordModal';

export function AccountMenu({
  onOpenAuth,
  onOpenPricing,
  onOpenOverlay,
}: {
  onOpenAuth: () => void;
  onOpenPricing: () => void;
  /** Open an app overlay ("about" / "legal"). These moved out of the header bar
   *  so the four modes and the upgrade CTA fit on a laptop; they are also
   *  reachable from the always-visible Guía hub for signed-out visitors. */
  onOpenOverlay?: (overlay: 'about' | 'legal') => void;
}) {
  const { snapshot, signOut, manageBilling } = useAuth();
  const { isPremium } = useEntitlement();
  const [open, setOpen] = useState(false);
  const [changePw, setChangePw] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!snapshot.user) {
    return (
      <button
        type="button"
        onClick={onOpenAuth}
        className="btn btn-quiet shrink-0"
      >
        <span className="sm:hidden">Entrar</span>
        <span className="hidden sm:inline">Iniciar sesión</span>
      </button>
    );
  }

  const initial = snapshot.user.email.charAt(0).toUpperCase() || '?';
  // A trialing subscription is premium, but flag it distinctly so the user knows
  // they're on a free trial and when it converts to a paid charge.
  const sub = snapshot.subscription;
  const isTrialing = sub.status === 'trialing';
  const trialEnd =
    isTrialing && sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd).toLocaleDateString('es', {
          day: 'numeric',
          month: 'long',
        })
      : null;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn btn-quiet gap-2 px-1.5"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
          {initial}
        </span>
        {/* El plan, como etiqueta y no como ficha de color: el tono va en la
            letra. Una pastilla tintada junto al avatar era otra caja mas en
            una barra que ya no tiene ninguna. */}
        <span
          className={`tag hidden lg:inline ${
            isTrialing ? 'text-amber-300' : isPremium ? 'text-emerald-300' : ''
          }`}
        >
          {isTrialing ? 'Prueba' : isPremium ? 'Premium' : 'Free'}
        </span>
      </button>

      {open && (
        <div className="instrument absolute right-0 top-full z-50 mt-1 w-60 overflow-hidden p-1">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-slate-200">
              {snapshot.user.email}
            </p>
            <p className="text-xs text-slate-500">
              {isTrialing
                ? `Prueba Premium${trialEnd ? ` · termina el ${trialEnd}` : ''}`
                : `Plan ${isPremium ? 'Premium' : 'Gratuito'}`}
            </p>
          </div>
          <div className="my-1 h-px bg-slate-800/60" />

          {!isPremium ? (
            <MenuItem
              label="Mejorar a Premium"
              accent
              onClick={() => {
                setOpen(false);
                onOpenPricing();
              }}
            />
          ) : (
            <MenuItem
              label="Gestionar suscripción"
              onClick={async () => {
                setOpen(false);
                await manageBilling();
              }}
            />
          )}
          <MenuItem
            label="Cambiar contraseña"
            onClick={() => {
              setOpen(false);
              setChangePw(true);
            }}
          />
          {onOpenOverlay && (
            <>
              <div className="my-1 h-px bg-slate-800/60" />
              <MenuItem
                label="Acerca de"
                onClick={() => {
                  setOpen(false);
                  onOpenOverlay('about');
                }}
              />
              <MenuItem
                label="Legal"
                onClick={() => {
                  setOpen(false);
                  onOpenOverlay('legal');
                }}
              />
              <div className="my-1 h-px bg-slate-800/60" />
            </>
          )}
          <MenuItem
            label="Cerrar sesión"
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
          />
        </div>
      )}

      <SetPasswordModal
        open={changePw}
        mode="change"
        onClose={() => setChangePw(false)}
      />
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  accent,
}: {
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors ${
        accent
          ? 'text-accent hover:bg-accent/10'
          : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
      }`}
    >
      {label}
    </button>
  );
}
