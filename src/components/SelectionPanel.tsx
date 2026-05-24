// src/components/SelectionPanel.tsx
//
// Right-hand contextual panel. Empty state prompts the user to click a
// structure. When a structure is selected:
//   - If it resolves to a muscle with authored content, show the full clinical
//     card (origin, insertion, innervation, actions with hierarchy, functional
//     positions, biomechanics, palpation, pathologies, notes) — every claim
//     with its citation(s).
//   - Otherwise, fall back to the basic name + side/layer pills.
//
// The Origin and Insertion sections also carry "Ver origen / Ver inserción"
// controls that highlight that attachment on the 3D model (PartFocusControls,
// shared with the toolbar).

import { useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { LAYER_META, SIDE_META } from '../lib/anatomyMeta';
import { formatCanonicalName } from '../lib/formatName';
import { resolveMuscleId } from '../lib/resolveMuscleId';
import { SHOULDER_MUSCLES } from '../data/shoulderMuscles';
import { REFERENCES } from '../data/references';
import { PartFocusControls } from './PartFocusControls';
import type { AnatomyEntry } from '../types/anatomy';
import type {
  MuscleContent,
  SourcedText,
  Citation,
  MuscleAction,
} from '../types/muscleContent';

interface SelectionPanelProps {
  byMesh: Map<string, AnatomyEntry>;
}

export function SelectionPanel({ byMesh }: SelectionPanelProps) {
  const selectedMeshName = useAnatomyStore((s) => s.selectedMeshName);
  const clearSelection = useAnatomyStore((s) => s.clearSelection);

  const entry = selectedMeshName ? byMesh.get(selectedMeshName) : undefined;
  const muscleId = selectedMeshName ? resolveMuscleId(selectedMeshName) : null;
  const content = muscleId ? SHOULDER_MUSCLES[muscleId] : undefined;

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
        {!entry ? (
          <EmptyState />
        ) : content ? (
          <MuscleCard entry={entry} content={content} />
        ) : (
          <BasicDetail entry={entry} />
        )}
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

/** Fallback for structures without authored clinical content. */
function BasicDetail({ entry }: { entry: AnatomyEntry }) {
  const layer = LAYER_META[entry.layer];
  const sideLabel = SIDE_META[entry.side].label;

  return (
    <div className="animate-slide-in-right">
      <h3 className="font-display text-xl font-semibold leading-snug text-slate-50">
        {formatCanonicalName(entry.canonicalName, entry.side)}
      </h3>
      <p className="mt-1 font-mono text-[11px] text-slate-600">
        {entry.canonicalName}
      </p>

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

      <p className="mt-6 text-sm leading-relaxed text-slate-500">
        Esta estructura todavía no tiene contenido clínico detallado.
      </p>
    </div>
  );
}

/** Full clinical card for a muscle with authored content. */
function MuscleCard({
  entry,
  content,
}: {
  entry: AnatomyEntry;
  content: MuscleContent;
}) {
  const layer = LAYER_META[entry.layer];
  const sideLabel = SIDE_META[entry.side].label;

  const primaryActions = content.actions.filter((a) => a.role === 'primary');
  const accessoryActions = content.actions.filter((a) => a.role === 'accessory');

  return (
    <div className="animate-slide-in-right">
      <h3 className="font-display text-xl font-semibold leading-snug text-slate-50">
        {content.nameEs}
      </h3>
      <p className="mt-0.5 text-sm italic text-slate-400">{content.nameLat}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300">
          <span className={`h-2 w-2 rounded-full ${layer.dot}`} />
          {layer.label}
        </span>
        {content.group && (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            {content.group}
          </span>
        )}
        {entry.side !== 'center' && (
          <span className="rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300">
            {sideLabel}
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Section title="Origen" defaultOpen>
          <Sourced item={content.origin} />
          <PartFocusControls variant="panel" />
        </Section>

        <Section title="Inserción" defaultOpen>
          <Sourced item={content.insertion} />
          <PartFocusControls variant="panel" />
        </Section>

        <Section title="Inervación">
          <Sourced item={content.innervation.nerve} />
          {content.innervation.roots && (
            <div className="mt-2">
              <Sourced item={content.innervation.roots} />
            </div>
          )}
        </Section>

        <Section title="Acciones">
          {primaryActions.length > 0 && (
            <>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-rose-300/80">
                Principales
              </p>
              <ul className="flex flex-col gap-2">
                {primaryActions.map((a, i) => (
                  <li key={i}>
                    <ActionItem action={a} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {accessoryActions.length > 0 && (
            <>
              <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Accesorias
              </p>
              <ul className="flex flex-col gap-2">
                {accessoryActions.map((a, i) => (
                  <li key={i}>
                    <ActionItem action={a} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        {content.functionalPositions && (
          <Section title="Posiciones funcionales">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Acortado
            </p>
            <Sourced item={content.functionalPositions.shortened} />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Estirado
            </p>
            <Sourced item={content.functionalPositions.lengthened} />
          </Section>
        )}

        {content.biomechanics && content.biomechanics.length > 0 && (
          <Section title="Biomecánica">
            <SourcedList items={content.biomechanics} />
          </Section>
        )}

        {content.palpation && (
          <Section title="Palpación">
            <Sourced item={content.palpation.howTo} />
            {content.palpation.position && (
              <div className="mt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Posición de acceso
                </p>
                <Sourced item={content.palpation.position} />
              </div>
            )}
          </Section>
        )}

        {content.synergists && content.synergists.length > 0 && (
          <Section title="Sinergistas">
            <SourcedList items={content.synergists} />
          </Section>
        )}

        {content.antagonists && content.antagonists.length > 0 && (
          <Section title="Antagonistas">
            <SourcedList items={content.antagonists} />
          </Section>
        )}

        {content.pathologies && content.pathologies.length > 0 && (
          <Section title="Patologías frecuentes">
            <SourcedList items={content.pathologies} />
          </Section>
        )}

        {content.clinicalNotes && content.clinicalNotes.length > 0 && (
          <Section title="Relevancia clínica">
            <SourcedList items={content.clinicalNotes} />
          </Section>
        )}
      </div>
    </div>
  );
}

function ActionItem({ action }: { action: MuscleAction }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-300">{action.text}</p>
      <CitationRow cites={action.cite} />
    </div>
  );
}

function Sourced({ item }: { item: SourcedText }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-300">{item.text}</p>
      <CitationRow cites={item.cite} />
    </div>
  );
}

function SourcedList({ items }: { items: SourcedText[] }) {
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

/** Renders the citation chips under a claim. */
function CitationRow({ cites }: { cites: Citation[] }) {
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
              <span title="Página por confirmar" className="text-amber-400/80">
                ⚠
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function Section({
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
