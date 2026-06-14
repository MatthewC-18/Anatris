// src/components/account/AuthModal.tsx
//
// Email/password sign-in & sign-up modal. Talks only to useAuth(), so it works
// identically on the mock backend (local testing) and on real Supabase.

import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

type Tab = 'signin' | 'signup';

export function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { signIn, signUp, backend } = useAuth();
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fn = tab === 'signin' ? signIn : signUp;
    const res = await fn(email.trim(), password);
    setBusy(false);
    if (res.ok) {
      onClose();
      setEmail('');
      setPassword('');
    } else {
      setError(res.error ?? 'No se pudo completar la operación.');
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-slate-800/60 bg-ink-950 shadow-2xl">
        <div className="flex gap-1 border-b border-slate-800/60 p-1">
          <TabBtn id="signin" label="Iniciar sesión" tab={tab} setTab={setTab} />
          <TabBtn id="signup" label="Crear cuenta" tab={tab} setTab={setTab} />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3 px-5 py-5">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-400">
            Correo
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent/60"
              placeholder="tu@correo.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-400">
            Contraseña
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent/60"
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-lg bg-accent/20 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/30 disabled:opacity-50"
          >
            {busy
              ? 'Procesando…'
              : tab === 'signin'
                ? 'Entrar'
                : 'Crear cuenta'}
          </button>

          {backend === 'mock' && (
            <p className="text-center text-[11px] leading-relaxed text-slate-600">
              Modo demo (sin Supabase configurado): cualquier correo válido y una
              contraseña de 6+ caracteres inician sesión.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function TabBtn({
  id,
  label,
  tab,
  setTab,
}: {
  id: Tab;
  label: string;
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  const active = tab === id;
  return (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-accent/20 text-accent' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
