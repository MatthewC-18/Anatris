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
//
// LAMINA (docs/sistema-lamina.md). Era el dialogo mas encajonado de la cuenta:
// el banco le contaba 5 cajas y 2 bloques en 170 lineas. Un recuadro de 16 px
// de radio con un degradado de acento arriba, dos campos de 12 px de radio con
// su anillo, una caja verde de exito, una caja rosa de error y dos botones
// rellenos con resplandor. Y estaba escrito en tinta fija (`bg-ink-950`,
// `slate-*`, `accent`) aunque se abre "sobre cualquier pantalla", o sea tambien
// sobre la landing en papel: un panel oscuro con brillo cian encima de una
// pagina clara, el mismo defecto que AuthModal ya habia corregido.
//
// Ahora comparte superficie y campos con el inicio de sesion (`SiteDialog`,
// `AuthField`), los avisos son notas con regla a la izquierda y los botones son
// los del sistema. En modo recuperacion sigue sin poder cerrarse: ni aspa, ni
// velo, ni Escape.

import { useId, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { AuthField } from './AuthModal';
import { DialogClose, SiteDialog } from './SiteDialog';

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
  const titleId = useId();

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
  // Solo el cambio voluntario se puede abandonar. Ver la cabecera.
  const dismiss = mode === 'change' ? finish : undefined;

  return (
    <SiteDialog onClose={dismiss} labelledBy={titleId} layer="above" className="max-w-sm">
      {dismiss && <DialogClose onClose={dismiss} className="absolute right-2 top-2 z-10" />}

      <div className="px-6 pb-6 pt-6">
        <h2 id={titleId} className="font-display text-base font-semibold text-fg">
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-fg3">
          {mode === 'recovery'
            ? 'Casi listo: define tu nueva contraseña para entrar.'
            : 'Introduce una nueva contraseña para tu cuenta.'}
        </p>

        {done ? (
          <div className="mt-5">
            <p role="status" className="note note-brand text-[13px] text-fg">
              Contraseña actualizada correctamente.
            </p>
            {mode === 'change' && (
              <button
                type="button"
                onClick={finish}
                data-autofocus
                className="btn btn-primary mt-4 h-11 w-full text-sm"
              >
                Listo
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
            <AuthField
              label="Nueva contraseña"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              data-autofocus
            />
            <AuthField
              label="Repetir contraseña"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
            />

            {error && (
              <p role="alert" className="note border-rose-500 text-[13px] text-rose-500">
                {error}
              </p>
            )}

            <div className="mt-1 flex gap-2">
              {mode === 'change' && (
                <button type="button" onClick={finish} className="btn btn-line h-11 flex-1 text-sm">
                  Cancelar
                </button>
              )}
              <button type="submit" disabled={busy} className="btn btn-primary h-11 flex-1 text-sm">
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </SiteDialog>
  );
}
