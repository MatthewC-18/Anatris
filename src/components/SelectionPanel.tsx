// src/components/SelectionPanel.tsx
//
// Right-hand contextual panel. Empty state prompts the user to click a
// structure; selected state shows the readable name, side/layer pills, and
// collapsible sections for clinical metadata (mostly placeholders until the
// content phase populates them).

import { useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { LAYER_META, SIDE_META } from '../lib/anatomyMeta';
import { formatCanonicalName } from '../lib/formatName';
import type { AnatomyEntry } from '../types/anatomy';

interface SelectionPanelProps {
  byMesh: Map<string, AnatomyEntry>;
}

const SECTIONS: Array<{ id: string; title: string; placeholder: string }> = [
  { id: 'origin', title: 'Origen e inserción', placeholder: 'Sin datos para esta estructura todavía.' },
  { id: 'innervation', title: 'Inervación', placeholder: 'Información de inervación pendiente.' },
  { id: 'function', title: 'Función y biomecánica', placeholder: 'Acciones y rol biomecánico pendientes.' },
  { id: 'pathology', title: 'Patologías relacionadas', placeholder: 'Vínculos a patologías pendientes.' },
  { id: 'physio', title: 'Relevancia en fisioterapia', placeholder: 'Notas clínicas pendientes.' },
];

export function SelectionPanel({ byMesh }: SelectionPanelProps) {
  const selectedMeshName = useAnatomyStore((s) => s.selectedMeshName);
  const clearSelection = useAnatomyStore((s) => s.clearSelection);

  const entry = selectedMeshName ? byMesh.get(selectedMeshName) : undefined;

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-slate-800/60 bg-ink-900/60">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <h2 className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Selección
        </h2>
        {entry && (
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-300"
          >
            Limpiar
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {!entry ? <EmptyState /> : <Detail entry={entry} />}
      </div>
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/40">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-slate-600"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      </div>
      <p className="max-w-[220px] text-sm leading-relaxed text-slate-500">
        Haz click sobre una estructura del modelo para ver su información
        detallada.
      </p>
    </div>
  );
}

function Detail({ entry }: { entry: AnatomyEntry }) {
  const layer = LAYER_META[entry.layer];
  const sideLabel = SIDE_META[entry.side].label;

  return (
    <div className="animate-slide-in-right">
      <h3 className="font-display text-xl font-semibold leading-snug text-slate-50">
        {formatCanonicalName(entry.canonicalName, entry.side)}
      </h3>
      <p className="mt-1 font-mono text-[11px] text-slate-600">{entry.canonicalName}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300">
          <span className={`h-2 w-2 rounded-full ${layer.dot}`} />
          {layer.label}
        </span>
        {entry.side !== 'center' && (
          <span className="rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300">
            {sideLabel}
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {SECTIONS.map((s, i) => (
          <Accordion key={s.id} title={s.title} defaultOpen={i === 0}>
            <p className="text-sm leading-relaxed text-slate-500">{s.placeholder}</p>
          </Accordion>
        ))}
      </div>
    </div>
  );
}

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-800/30"
      >
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 pt-0 animate-fade-in">{children}</div>}
    </div>
  );
}
