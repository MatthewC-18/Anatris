// src/components/account/AccountMenu.tsx
//
// TopBar account control. Signed out: a "Iniciar sesión" button. Signed in: a
// menu showing the email, the plan badge, and actions (upgrade / manage billing
// / sign out). Lives in the header flow like the other TopBar controls.

import { useEffect, useRef, useState } from 'react';
import { useAuth, useEntitlement } from '../../auth/AuthContext';

export function AccountMenu({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { snapshot, signOut, startCheckout, manageBilling } = useAuth();
  const { isPremium } = useEntitlement();
  const [open, setOpen] = useState(false);
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
        Iniciar sesión
      </button>
    );
  }

  const initial = snapshot.user.email.charAt(0).toUpperCase() || '?';

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
            isPremium ? 'bg-emerald-600/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {isPremium ? 'Premium' : 'Free'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-xl border border-slate-800/80 bg-ink-950/95 p-1 shadow-xl backdrop-blur">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-slate-200">
              {snapshot.user.email}
            </p>
            <p className="text-xs text-slate-500">
              Plan {isPremium ? 'Premium' : 'Gratuito'}
            </p>
          </div>
          <div className="my-1 h-px bg-slate-800/60" />

          {!isPremium ? (
            <MenuItem
              label="Mejorar a Premium"
              accent
              onClick={async () => {
                setOpen(false);
                await startCheckout();
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
            label="Cerrar sesión"
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
          />
        </div>
      )}
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
