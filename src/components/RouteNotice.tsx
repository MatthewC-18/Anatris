// src/components/RouteNotice.tsx
//
// Orientation for a visitor who lands on an address this app does not serve: a
// typo, a stale bookmark, a link to a page that never existed.
//
// The app already recovers on its own (an unparseable path falls back to the
// default region and the address bar is rewritten), but silently. From the
// visitor's side that reads as "I asked for one thing and got another, and
// nobody said why". This is the missing sentence: it names the address that did
// not resolve, says where they ended up, and lists the regions so they can go
// somewhere on purpose.
//
// Deliberately NOT a blocking 404 screen. The content behind it is real and
// usable, so this sits over it as a dismissible note. The path is captured ONCE
// on mount, before the router normalises the address away.

import { useEffect, useMemo, useState } from 'react';
import type { AppMode } from './TopBar';
import { CloseIcon } from './ui/Icons';
import { REGIONS } from '../data/regiones';
import { isUnknownPath, regionSlugs } from '../lib/routing';

interface Props {
  /** Region the app settled on, so the note can say where the visitor landed. */
  landedRegion: string;
  /** Jump to a region; the caller also closes any overlay and syncs the URL. */
  onGo: (region: string, mode: AppMode) => void;
}

export default function RouteNotice({ landedRegion, onGo }: Props) {
  // Read the address ONCE, on mount: App rewrites it moments later.
  const [badPath] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const p = window.location.pathname;
    return isUnknownPath(p) ? p : null;
  });
  const [open, setOpen] = useState(true);

  // Regions in URL order, with the labels the rest of the app uses.
  const regions = useMemo(
    () =>
      regionSlugs()
        .map(({ id }) => ({ id, name: REGIONS[id]?.name }))
        .filter((r): r is { id: string; name: string } => !!r.name),
    [],
  );

  const landedName = REGIONS[landedRegion]?.name;

  // Esc dismisses, like every other transient surface in the app.
  useEffect(() => {
    if (!open || !badPath) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, badPath]);

  if (!badPath || !open) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4"
    >
      <div className="instrument pointer-events-auto w-full max-w-lg px-5 py-4 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="kicker">Dirección no encontrada</p>
            <p className="mt-2 truncate font-mono text-sm text-slate-300">{badPath}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar aviso"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Esa página no existe.
          {landedName ? ` Te hemos dejado en ${landedName}.` : ''} Elige una región
          para seguir desde donde quieras.
        </p>

        <div className="hairline my-4" />

        <p className="kicker">Regiones</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {regions.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onGo(r.id, 'explore');
                setOpen(false);
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-200"
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
