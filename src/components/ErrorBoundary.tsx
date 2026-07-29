// src/components/ErrorBoundary.tsx
//
// React error boundary. A render/runtime crash anywhere below it is caught here
// and replaced with a friendly fallback instead of an unmounted white screen.
// This matters most for the code-split 3D workspace (three.js / @react-three),
// where a bad GLB, a WebGL failure or a null deref would otherwise blank the app.
//
// Two placements (see main.tsx + App.tsx):
//   - variant="page"   : root safety net around the whole app (offers a reload).
//   - variant="inline" : scoped around the 3D area so the TopBar/nav survive; it
//     resets automatically when `resetKeys` change (e.g. the user switches region
//     or mode), letting them navigate out of a broken view without a reload.
//
// UI strings Spanish (LATAM). English comments.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** 'page' = full-screen fallback (root); 'inline' = fills its container. */
  variant?: 'page' | 'inline';
  /** Short noun phrase for the fallback copy, e.g. "la vista 3D". */
  label?: string;
  /** When any of these change while errored, the boundary clears the error. */
  resetKeys?: unknown[];
  /** Optional custom fallback; receives a reset() callback. */
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/** Element-wise identity comparison of two resetKeys arrays. */
function keysChanged(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  if (a === b) return false;
  if (!a || !b || a.length !== b.length) return true;
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) return true;
  }
  return false;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[Anatris] Error capturado por ErrorBoundary:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props): void {
    // Recover automatically when the caller navigates (resetKeys changed).
    if (this.state.error && keysChanged(prev.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null });
    }
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.reset);
      return (
        <Fallback
          variant={this.props.variant ?? 'page'}
          label={this.props.label}
          error={this.state.error}
          onReset={this.reset}
        />
      );
    }
    return this.props.children;
  }
}

function Fallback({
  variant,
  label,
  error,
  onReset,
}: {
  variant: 'page' | 'inline';
  label?: string;
  error: Error;
  onReset: () => void;
}) {
  const what = label ?? 'esta sección';
  return (
    <div
      className={`flex ${
        variant === 'page' ? 'min-h-screen bg-ink-950' : 'h-full min-h-[50vh]'
      } w-full items-center justify-center px-6 py-10 text-slate-200`}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-900/40 bg-amber-950/20 text-amber-300">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
            <path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-display text-lg font-semibold text-slate-50">
          Algo salió mal en {what}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Ocurrió un error inesperado. Puedes reintentar o recargar la aplicación.
        </p>
        <details className="mt-3 text-left">
          <summary className="cursor-pointer text-[11px] text-slate-600 hover:text-slate-400">
            Detalles técnicos
          </summary>
          <p className="mt-1 max-h-24 overflow-y-auto break-words font-mono text-[11px] text-slate-500">
            {error.message}
          </p>
        </details>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60"
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-accent/20 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/30"
          >
            Recargar
          </button>
        </div>
      </div>
    </div>
  );
}
