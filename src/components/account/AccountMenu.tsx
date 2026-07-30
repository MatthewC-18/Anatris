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
        className="shrink-0 rounded-lg border border-slate-800/80 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
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
        className="flex items-center gap-2 rounded-lg border border-slate-800/80 px-2 py-1.5 text-sm transition-colors hover:border-slate-700"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
          {initial}
        </span>
        <span
          className={`hidden rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide lg:inline ${
            isTrialing
              ? 'bg-amber-500/20 text-amber-300'
              : isPremium
                ? 'bg-emerald-600/20 text-emerald-300'
                : 'bg-slate-800 text-slate-400'
          }`}
        >
          {isTrialing ? 'Prueba' : isPremium ? 'Premium' : 'Free'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-xl border border-slate-800/80 bg-ink-950/95 p-1 shadow-xl backdrop-blur">
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
