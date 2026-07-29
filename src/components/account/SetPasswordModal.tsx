// src/components/account/SetPasswordModal.tsx
//
// A single dialog for choosing a new password, reused in two places:
//   - recovery: the user arrived via a "reset password" email link (Supabase
//     hands us a temporary session). We must NOT let them dismiss it into a
//     half-authenticated state, so there's no cancel — only "guardar".
//   - change:   a signed-in user updates their password from the account menu.
//
// Both paths call updatePassword() on the active session, so this component is
// backend-agnostic like the rest of the auth UI.

import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

/**
 * App-wide gate that pops the "choose a new password" dialog whenever the user
 * lands via a recovery link (recoveryMode). Mounted once near the root so it
 * overlays every screen (landing, disclaimer, or the app itself).
 */
export function RecoveryGate() {
  const { recoveryMode, clearRecovery } = useAuth();
  return (
    <SetPasswordModal open={recoveryMode} mode="recovery" onClose={clearRecovery} />
  );
}

export function SetPasswordModal({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: 'recovery' | 'change';
  onClose: () => void;
}) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  function finish(): void {
    setPassword('');
    setConfirm('');
    setError(null);
    setDone(false);
    onClose();
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    const res = await updatePassword(password);
    setBusy(false);
    if (res.ok) {
      setDone(true);
      // In recovery mode we auto-close after a beat; in change mode the user
      // sees the confirmation and closes it.
      if (mode === 'recovery') window.setTimeout(finish, 1400);
    } else {
      setError(res.error ?? 'No se pudo actualizar la contraseña.');
    }
  }

  const title = mode === 'recovery' ? 'Elige una nueva contraseña' : 'Cambiar contraseña';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={mode === 'change' ? finish : undefined}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        disabled={mode === 'recovery'}
      />

      <div className="relative z-10 w-full max-w-sm animate-scale-in overflow-hidden rounded-2xl border border-slate-800/70 bg-ink-950 shadow-glass-lg">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-accent/10 to-transparent" />

        <div className="relative px-6 pb-6 pt-6">
          <h2 className="font-display text-base font-semibold text-slate-100">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {mode === 'recovery'
              ? 'Casi listo: define tu nueva contraseña para entrar.'
              : 'Introduce una nueva contraseña para tu cuenta.'}
          </p>

          {done ? (
            <div className="mt-5">
              <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
                Contraseña actualizada correctamente.
              </p>
              {mode === 'change' && (
                <button
                  type="button"
                  onClick={finish}
                  className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-accent-glow transition-colors hover:bg-accent-soft"
                >
                  Listo
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
                Nueva contraseña
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
                  placeholder="Mínimo 6 caracteres"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
                Repetir contraseña
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
                  placeholder="Repite la contraseña"
                />
              </label>

              {error && (
                <p className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
                  {error}
                </p>
              )}

              <div className="mt-1 flex gap-2">
                {mode === 'change' && (
                  <button
                    type="button"
                    onClick={finish}
                    className="flex-1 rounded-xl border border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-accent-glow transition-colors hover:bg-accent-soft disabled:opacity-50"
                >
                  {busy ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
