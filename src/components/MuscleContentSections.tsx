// src/components/MuscleContentSections.tsx
//
// Shared render primitives for displaying MuscleContent. Extracted verbatim
// (styles unchanged) from SelectionPanel.tsx so that both the SelectionPanel
// (right-hand click panel) and the PhaseTrack (pedagogical phases) render
// muscle content identically without duplicating the markup.
//
// NOTE: SelectionPanel.tsx currently keeps its own private copies of these
// components and is intentionally left untouched. A later low-risk refactor can
// switch SelectionPanel to import from here to de-duplicate. Until then, keep
// the two in sync if you change the styling.

import { useState } from 'react';
import { REFERENCES } from '../data/references';
import type {
  SourcedText,
  Citation,
  MuscleAction,
} from '../types/muscleContent';

/** Renders the citation chips under a claim. Mirror of SelectionPanel's row. */
export function CitationRow({ cites }: { cites: Citation[] }) {
  if (!cites || cites.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {cites.map((c, i) => {
        const ref = REFERENCES[c.ref];
        const label = ref ? ref.authors.split(',')[0] : c.ref;
        const locator = c.page ?? c.section;
        return (
          <span
            key={i}
            title={ref ? `${ref.authors}. ${ref.title}` : c.ref}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 bg-slate-800/40 px-1.5 py-0.5 text-[10px] font-medium text-slate-400"
          >
            {label}
            {locator ? `, ${locator}` : ''}
            {!c.pageVerified && (
              <span title="Pagina por confirmar" className="text-amber-400/80">
                {String.fromCharCode(0x26a0)}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function Sourced({ item }: { item: SourcedText }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-300">{item.text}</p>
      <CitationRow cites={item.cite} />
    </div>
  );
}

export function SourcedList({ items }: { items: SourcedText[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <li key={i}>
          <Sourced item={it} />
        </li>
      ))}
    </ul>
  );
}

export function ActionItem({ action }: { action: MuscleAction }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-300">{action.text}</p>
      <CitationRow cites={action.cite} />
    </div>
  );
}

export function Section({
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
    <div className="rounded-lg border border-slate-800/60 bg-slate-900/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
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
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="px-3 pb-3 pt-0.5">{children}</div>}
    </div>
  );
}
