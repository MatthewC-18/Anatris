// src/components/TopBar.tsx
//
// Slim top bar: wordmark, primary module navigation, and the command-palette
// trigger. Navigation is display-only for now (routing comes later).

import { useAnatomyStore } from '../store/anatomyStore';

const MODULES = ['Fundamentos', 'Hombro', 'Codo', 'Columna', 'Rodilla'];

export function TopBar() {
  const setPaletteOpen = useAnatomyStore((s) => s.setPaletteOpen);

  return (
    <header className="flex h-12 shrink-0 items-center gap-6 border-b border-slate-800/60 bg-ink-950/90 px-4">
      {/* Wordmark */}
      <div className="flex items-center gap-2">
        <span className="font-display text-base font-bold tracking-tight text-slate-50">
          Anatris
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      </div>
      
      {/* Module nav */}
      <nav className="flex items-center gap-1">
        {MODULES.map((m, i) => (
          <button
            key={m}
            className={[
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              i === 1
                ? 'bg-slate-800/60 text-slate-100'
                : 'text-slate-500 hover:text-slate-300',
            ].join(' ')}
          >
            {m}
          </button>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Search trigger */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-300"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Buscar estructura</span>
        <span className="kbd ml-2">⌘K</span>
      </button>
    </header>
  );
}
