// src/components/account/AuthModal.tsx
//
// Premium sign-in / sign-up / password-recovery modal. Talks only to useAuth(),
// so it works identically on the mock backend (local testing) and on real
// Supabase. Offers three ways in:
//   - Google (OAuth)
//   - email + password (sign in / create account)
//   - "¿Olvidaste tu contraseña?" -> sends a recovery link
//
// The modal is drawn in the semantic theme tokens, so it belongs to whichever
// surface opened it: paper when it is launched from the public site, ink when it
// is launched from inside the product. It used to be hard-coded ink with an
// accent glow behind the brand mark, which meant the sign-up step of the funnel
// arrived as a dark neon panel over a light page.
//
// LAMINA (docs/sistema-lamina.md). El banco le contaba una caja y cuatro
// pastillas: el recuadro del modal, el boton de Google, los dos campos y el
// boton de enviar, cada uno con su borde y su relleno escritos a mano. Ahora:
//   - la superficie es la compartida (`SiteDialog`), que ademas lo hace un
//     dialogo de verdad: Escape, foco dentro y foco devuelto al cerrar;
//   - Google y "Entrar" son botones del sistema (`.btn-line`, `.btn-primary`);
//   - el error y el aviso son notas con regla a la izquierda, sin fondo tenido;
//   - los CAMPOS conservan su recuadro, a proposito (ver `AuthField`).

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { BrandMark } from '../BrandMark';
import { LegalModal, type LegalTab } from '../LegalScreen';
import { DialogClose, SiteDialog } from './SiteDialog';

type View = 'signin' | 'signup' | 'reset';

export function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { signIn, signUp, signInWithGoogle, resetPassword, backend } = useAuth();
  const [view, setView] = useState<View>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);
  const titleId = useId();

  if (!open) return null;

  function reset(): void {
    setError(null);
    setNotice(null);
    setPassword('');
  }

  function go(v: View): void {
    reset();
    setView(v);
  }

  function close(): void {
    onClose();
    setEmail('');
    setPassword('');
    setError(null);
    setNotice(null);
    setView('signin');
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    if (view === 'reset') {
      const res = await resetPassword(email.trim());
      setBusy(false);
      if (res.ok) setNotice(res.message ?? 'Revisa tu correo.');
      else setError(res.error ?? 'No se pudo enviar el enlace.');
      return;
    }

    const fn = view === 'signin' ? signIn : signUp;
    const res = await fn(email.trim(), password);
    setBusy(false);
    if (res.ok) close();
    else setError(res.error ?? 'No se pudo completar la operación.');
  }

  async function google(): Promise<void> {
    setGoogleBusy(true);
    setError(null);
    setNotice(null);
    const res = await signInWithGoogle();
    // On Supabase this redirects away and never returns here; on the mock it
    // signs in immediately, so close the modal.
    if (res.ok) close();
    else {
      setGoogleBusy(false);
      setError(res.error ?? 'No se pudo continuar con Google.');
    }
  }

  const title =
    view === 'signin'
      ? 'Iniciar sesión'
      : view === 'signup'
        ? 'Crear cuenta'
        : 'Recuperar contraseña';
  const subtitle =
    view === 'signin'
      ? 'Accede para continuar donde lo dejaste.'
      : view === 'signup'
        ? 'La cuenta es gratuita y no se pide tarjeta.'
        : 'Te enviamos un enlace para establecer una nueva.';

  return (
    <>
      <SiteDialog onClose={close} labelledBy={titleId} className="max-w-sm">
        <DialogClose onClose={close} className="absolute right-2 top-2 z-10" />

        <div className="px-6 pb-6 pt-7">
          {/* Brand + headline */}
          <div className="mb-6">
            <BrandMark className="h-5 w-5 text-fg" title="Anatris" />
            <h2 id={titleId} className="mt-4 font-display text-lg font-semibold text-fg">
              {title}
            </h2>
            <p className="mt-1 text-[13px] text-fg3">{subtitle}</p>
          </div>

          {view !== 'reset' && (
            <>
              {/* Google. Era un boton blanco fijo, tambien sobre tinta: la unica
                  mancha blanca del producto. Con el contorno del sistema se lee
                  igual de claro en papel y en tinta, y la G conserva sus cuatro
                  colores, que es lo que la identifica. */}
              <button
                type="button"
                onClick={google}
                disabled={googleBusy}
                className="btn btn-line h-11 w-full gap-2.5 text-sm text-fg"
              >
                <GoogleIcon className="h-4 w-4" />
                {googleBusy ? 'Conectando…' : 'Continuar con Google'}
              </button>

              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[11px] text-fg3">o con tu correo</span>
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="flex flex-col gap-3">
            <AuthField
              label="Correo"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              data-autofocus
            />

            {view !== 'reset' && (
              <AuthField
                label="Contraseña"
                aside={
                  view === 'signin' && (
                    <button
                      type="button"
                      onClick={() => go('reset')}
                      className="text-fg3 transition-colors hover:text-fg"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )
                }
                type="password"
                required
                minLength={6}
                autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={view === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
              />
            )}

            {error && (
              <p role="alert" className="note border-rose-500 text-[13px] text-rose-500">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="note note-brand text-[13px]">
                {notice}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-primary mt-1 h-11 w-full text-sm">
              {busy
                ? 'Procesando…'
                : view === 'signin'
                  ? 'Entrar'
                  : view === 'signup'
                    ? 'Crear cuenta'
                    : 'Enviar enlace'}
            </button>

            {view === 'reset' && (
              <button
                type="button"
                onClick={() => go('signin')}
                className="text-center text-[13px] text-fg3 transition-colors hover:text-fg"
              >
                Volver a iniciar sesión
              </button>
            )}

            {view === 'signup' && (
              <p className="text-[11px] leading-relaxed text-fg3">
                Al crear una cuenta aceptas los{' '}
                <button
                  type="button"
                  onClick={() => setLegalTab('terminos')}
                  className="text-fg2 underline transition-colors hover:text-fg"
                >
                  Términos
                </button>{' '}
                y la{' '}
                <button
                  type="button"
                  onClick={() => setLegalTab('privacidad')}
                  className="text-fg2 underline transition-colors hover:text-fg"
                >
                  Política de privacidad
                </button>
                .
              </p>
            )}
          </form>

          {/* Switch sign in <-> sign up */}
          {view !== 'reset' && (
            <p className="mt-6 border-t border-line pt-4 text-[13px] text-fg3">
              {view === 'signin' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => go(view === 'signin' ? 'signup' : 'signin')}
                className="font-medium text-brand underline transition-opacity hover:opacity-80"
              >
                {view === 'signin' ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>
            </p>
          )}

          {backend === 'mock' && (
            <p className="mt-4 text-[11px] leading-relaxed text-fg3">
              Modo demo (sin Supabase): cualquier correo válido con contraseña de
              6+ caracteres inicia sesión, y «Google» entra con una cuenta de
              prueba.
            </p>
          )}
        </div>
      </SiteDialog>

      <LegalModal
        open={legalTab !== null}
        defaultTab={legalTab ?? 'terminos'}
        onClose={() => setLegalTab(null)}
      />
    </>
  );
}

/**
 * Un campo del formulario de acceso: rotulo encima y la caja donde se escribe.
 *
 * LA CAJA SE QUEDA, Y ES LA UNICA. El sistema tiene un campo sin caja
 * (`.field`, una linea), que es lo correcto para un filtro dentro de un margen.
 * Aqui no: es un formulario de acceso, se usa una vez, a menudo en un telefono y
 * con el gestor de contrasenas rellenandolo. El recuadro es el objeto donde se
 * escribe (el autorrelleno del navegador lo pinta entero, y sin caja ese tinte
 * queda como una mancha sin borde), y es lo que cualquiera reconoce como "aqui
 * va el correo". Un solo filo, 4 px de radio, 44 px de alto para el pulgar.
 *
 * 16 px de letra por debajo de `sm`: con menos, Safari en iOS amplia la pagina
 * al enfocar el campo y el dialogo se sale de la pantalla. Iba a 14 px.
 *
 * `aside` va FUERA del <label>: "¿Olvidaste tu contraseña?" estaba dentro, asi
 * que el rotulo del campo de contrasena se leia con el texto del enlace pegado.
 */
export function AuthField({
  label,
  aside,
  ...input
}: {
  label: string;
  aside?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <label htmlFor={id} className="font-medium text-fg2">
          {label}
        </label>
        {aside}
      </div>
      <input
        id={id}
        {...input}
        // caja-ok: el campo de un formulario de acceso es el objeto donde se escribe; un filo, 4 px de radio
        className="h-11 rounded border border-line bg-page px-3 text-base text-fg outline-none transition-colors placeholder:text-fg3 focus:border-brand sm:text-sm"
      />
    </div>
  );
}

/** Official multi-color Google "G" mark. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.76z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.61H1.27a12 12 0 0 0 0 10.78l4-3.12z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.12C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
