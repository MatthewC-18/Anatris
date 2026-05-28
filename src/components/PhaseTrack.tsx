// src/components/PhaseTrack.tsx
//
// The 7-phase pedagogical navigator for a region (Anatris's core differentiator).
// Horizontal numbered tabs 1..7 over a scrollable phase body.
//
//   - Per-muscle phases (anatomy / biomechanics / palpation) walk the region's
//     muscles in teaching order and PROJECT only the MuscleContent field groups
//     declared by the phase. No content is duplicated; it is read live from
//     SHOULDER_MUSCLES. Clicking a muscle header calls selectMuscle() so the
//     rest of the app (3D highlight, SelectionPanel) reacts.
//   - The biomechanics phase additionally renders any guided gestures
//     (phase.guides) as a step-by-step walkthrough that drives the 3D model.
//   - Region phases (tests / pathology / treatment / case) render their own
//     first-class entities, each claim carrying its citations via the shared
//     CitationRow.
//
// Styling reuses the project's existing tokens (slate/ink/accent, glass) and
// the shared MuscleContentSections primitives, so it matches SelectionPanel.

import { useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { SHOULDER_MUSCLES } from '../data/shoulderMuscles';
import { SHOULDER_TRACK } from '../data/shoulderPhases';
import { PHASE_ORDER, PHASE_META } from '../types/pedagogy';
import {
  Section,
  Sourced,
  SourcedList,
  ActionItem,
} from './MuscleContentSections';
import { BiomechanicsGuide } from './BiomechanicsGuide';
import type {
  PhaseId,
  RegionTrack,
  PerMusclePhase,
  TestsPhase,
  PathologyPhase,
  TreatmentPhase,
  CasePhase,
  MuscleField,
} from '../types/pedagogy';
import type { MuscleContent } from '../types/muscleContent';

interface PhaseTrackProps {
  /** The region track to display. Defaults to the shoulder. */
  track?: RegionTrack;
}

export function PhaseTrack({ track = SHOULDER_TRACK }: PhaseTrackProps) {
  const [active, setActive] = useState<PhaseId>('anatomy');
  const meta = PHASE_META[active];

  return (
    <section className="flex h-full w-full flex-col bg-ink-900/40">
      {/* Tab strip 1..7 */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-800/60 px-3 py-2">
        {PHASE_ORDER.map((id) => {
          const m = PHASE_META[id];
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              title={m.blurb}
              className={`group flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isActive
                    ? 'bg-accent/30 text-accent'
                    : 'bg-slate-800/70 text-slate-400'
                }`}
              >
                {m.step}
              </span>
              <span className="font-medium">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Phase blurb */}
      <div className="shrink-0 px-5 pt-4">
        <h2 className="font-display text-lg font-semibold text-slate-50">
          {meta.step}. {meta.label}
        </h2>
        <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
          {meta.blurb}
        </p>
      </div>

      {/* Phase body */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4">
        <PhaseBody phaseId={active} track={track} />
      </div>
    </section>
  );
}

function PhaseBody({
  phaseId,
  track,
}: {
  phaseId: PhaseId;
  track: RegionTrack;
}) {
  const phases = track.phases;
  switch (phaseId) {
    case 'anatomy':
      return <PerMuscleView phase={phases.anatomy} />;
    case 'biomechanics':
      return <PerMuscleView phase={phases.biomechanics} />;
    case 'palpation':
      return <PerMuscleView phase={phases.palpation} />;
    case 'tests':
      return <TestsView phase={phases.tests} />;
    case 'pathology':
      return <PathologyView phase={phases.pathology} />;
    case 'treatment':
      return <TreatmentView phase={phases.treatment} />;
    case 'case':
      return <CaseView phase={phases.case} />;
  }
}

/* ===========================================================================
 * PER-MUSCLE PHASES (anatomy / biomechanics / palpation)
 * ======================================================================== */

function PerMuscleView({ phase }: { phase: PerMusclePhase }) {
  const selectMuscle = useAnatomyStore((s) => s.selectMuscle);
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);

  return (
    <div className="flex flex-col gap-3">
      {phase.intro && (
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-3">
          <Sourced item={phase.intro} />
        </div>
      )}

      {/* Guided gestures (biomechanics phase). Rendered before the muscle walk-
          through so the student can play the movement, then study the muscles. */}
      {phase.guides && phase.guides.length > 0 && (
        <div className="flex flex-col gap-3">
          {phase.guides.map((g) => (
            <BiomechanicsGuide key={g.movementId} guide={g} />
          ))}
        </div>
      )}

      {phase.muscleIds.map((id) => {
        const content = SHOULDER_MUSCLES[id];
        if (!content) return null; // id with no card yet - skip silently
        const isSelected = id === selectedMuscleId;
        return (
          <div
            key={id}
            className={`rounded-xl border bg-slate-900/30 transition-colors ${
              isSelected ? 'border-accent/50' : 'border-slate-800/60'
            }`}
          >
            <button
              type="button"
              onClick={() => selectMuscle(isSelected ? null : id)}
              className="flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left"
            >
              <span>
                <span className="font-display text-base font-semibold text-slate-100">
                  {content.nameEs}
                </span>
                <span className="ml-2 text-xs italic text-slate-500">
                  {content.nameLat}
                </span>
              </span>
              {content.group && (
                <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                  {content.group}
                </span>
              )}
            </button>
            <div className="flex flex-col gap-2 px-4 pb-4">
              <MuscleFieldGroups content={content} fields={phase.fields} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Projects the requested MuscleContent field groups, in declared order. */
function MuscleFieldGroups({
  content,
  fields,
}: {
  content: MuscleContent;
  fields: MuscleField[];
}) {
  return (
    <>
      {fields.map((field) => (
        <MuscleFieldGroup key={field} content={content} field={field} />
      ))}
    </>
  );
}

function MuscleFieldGroup({
  content,
  field,
}: {
  content: MuscleContent;
  field: MuscleField;
}) {
  switch (field) {
    case 'origin':
      return (
        <Section title="Origen" defaultOpen>
          <Sourced item={content.origin} />
        </Section>
      );
    case 'insertion':
      return (
        <Section title="Insercion" defaultOpen>
          <Sourced item={content.insertion} />
        </Section>
      );
    case 'innervation':
      return (
        <Section title="Inervacion">
          <Sourced item={content.innervation.nerve} />
          {content.innervation.roots && (
            <div className="mt-2">
              <Sourced item={content.innervation.roots} />
            </div>
          )}
        </Section>
      );
    case 'actions': {
      const primary = content.actions.filter((a) => a.role === 'primary');
      const accessory = content.actions.filter((a) => a.role === 'accessory');
      return (
        <Section title="Acciones" defaultOpen>
          {primary.length > 0 && (
            <>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-rose-300/80">
                Principales
              </p>
              <ul className="flex flex-col gap-2">
                {primary.map((a, i) => (
                  <li key={i}>
                    <ActionItem action={a} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {accessory.length > 0 && (
            <>
              <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Accesorias
              </p>
              <ul className="flex flex-col gap-2">
                {accessory.map((a, i) => (
                  <li key={i}>
                    <ActionItem action={a} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      );
    }
    case 'biomechanics':
      if (!content.biomechanics || content.biomechanics.length === 0) return null;
      return (
        <Section title="Biomecanica">
          <SourcedList items={content.biomechanics} />
        </Section>
      );
    case 'functionalPositions':
      if (!content.functionalPositions) return null;
      return (
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
      );
    case 'synergists':
      if (!content.synergists || content.synergists.length === 0) return null;
      return (
        <Section title="Sinergistas">
          <SourcedList items={content.synergists} />
        </Section>
      );
    case 'antagonists':
      if (!content.antagonists || content.antagonists.length === 0) return null;
      return (
        <Section title="Antagonistas">
          <SourcedList items={content.antagonists} />
        </Section>
      );
    case 'palpation':
      if (!content.palpation) return null;
      return (
        <Section title="Palpacion" defaultOpen>
          <Sourced item={content.palpation.howTo} />
          {content.palpation.position && (
            <div className="mt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Posicion de acceso
              </p>
              <Sourced item={content.palpation.position} />
            </div>
          )}
        </Section>
      );
  }
}

/* ===========================================================================
 * REGION PHASES (tests / pathology / treatment / case)
 * ======================================================================== */

/** Small helper: a chip linking to a muscle by id (jumps it into selection). */
function MuscleLinkChips({ ids }: { ids: string[] }) {
  const selectMuscle = useAnatomyStore((s) => s.selectMuscle);
  if (ids.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const c = SHOULDER_MUSCLES[id];
        const label = c ? c.nameEs : id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => selectMuscle(id)}
            className="rounded-md border border-slate-700/60 bg-slate-800/40 px-2 py-0.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-accent/50 hover:text-accent"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function TestsView({ phase }: { phase: TestsPhase }) {
  return (
    <div className="flex flex-col gap-3">
      {phase.intro && (
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-3">
          <Sourced item={phase.intro} />
        </div>
      )}
      {phase.tests.map((t) => (
        <div
          key={t.id}
          className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4"
        >
          <h3 className="font-display text-base font-semibold text-slate-100">
            {t.name}
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            <Labeled label="Que valora">
              <Sourced item={t.assesses} />
            </Labeled>
            <Labeled label="Procedimiento">
              <Sourced item={t.procedure} />
            </Labeled>
            <Labeled label="Signo positivo">
              <Sourced item={t.positiveSign} />
            </Labeled>
            {t.grading && <TestGradingBlock grading={t.grading} />}
          </div>
          <MuscleLinkChips ids={t.targetMuscleIds} />
        </div>
      ))}
    </div>
  );
}

/** Renders the graded-response guidance of a test (sustain time, pain vs.
 *  weakness, and interpretation by intensity). */
function TestGradingBlock({
  grading,
}: {
  grading: NonNullable<TestsPhase['tests'][number]['grading']>;
}) {
  return (
    <div className="mt-1 rounded-lg border border-slate-800/50 bg-ink-900/40 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent/80">
        Graduacion de la respuesta
      </p>
      <div className="flex flex-col gap-3">
        {grading.holdTime && (
          <Labeled label="Tiempo de sosten">
            <Sourced item={grading.holdTime} />
          </Labeled>
        )}
        {grading.painVsWeakness && (
          <Labeled label="Dolor vs. debilidad">
            <Sourced item={grading.painVsWeakness} />
          </Labeled>
        )}
        {grading.grades && grading.grades.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Interpretacion por grados
            </p>
            <ul className="flex flex-col gap-2">
              {grading.grades.map((g, i) => (
                <li key={i} className="rounded-md bg-slate-800/30 px-2.5 py-2">
                  <p className="text-sm font-medium text-slate-200">{g.finding}</p>
                  <div className="mt-1">
                    <Sourced item={g.interpretation} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function PathologyView({ phase }: { phase: PathologyPhase }) {
  return (
    <div className="flex flex-col gap-3">
      {phase.intro && (
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-3">
          <Sourced item={phase.intro} />
        </div>
      )}
      {phase.pathologies.map((p) => (
        <div
          key={p.id}
          className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4"
        >
          <h3 className="font-display text-base font-semibold text-slate-100">
            {p.name}
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            <Sourced item={p.description} />
            {p.presentation && (
              <Labeled label="Presentacion">
                <Sourced item={p.presentation} />
              </Labeled>
            )}
          </div>
          <MuscleLinkChips ids={p.relatedMuscleIds} />
        </div>
      ))}
    </div>
  );
}

function TreatmentView({ phase }: { phase: TreatmentPhase }) {
  return (
    <div className="flex flex-col gap-3">
      {phase.intro && (
        <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-3">
          <Sourced item={phase.intro} />
        </div>
      )}
      {phase.principles.map((pr) => (
        <div
          key={pr.id}
          className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4"
        >
          <h3 className="font-display text-base font-semibold text-slate-100">
            {pr.title}
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            <Sourced item={pr.rationale} />
            {pr.examples && pr.examples.length > 0 && (
              <Labeled label="Ejemplos">
                <SourcedList items={pr.examples} />
              </Labeled>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CaseView({ phase }: { phase: CasePhase }) {
  return (
    <div className="flex flex-col gap-4">
      {phase.cases.map((c) => (
        <div
          key={c.id}
          className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4"
        >
          <h3 className="font-display text-base font-semibold text-slate-100">
            {c.title}
          </h3>
          <div className="mt-3">
            <Labeled label="Caso">
              <Sourced item={c.vignette} />
            </Labeled>
          </div>
          <ol className="mt-4 flex flex-col gap-3">
            {c.steps.map((st, i) => (
              <li
                key={st.id}
                className="rounded-lg border border-slate-800/50 bg-ink-900/40 p-3"
              >
                <p className="text-sm font-medium text-slate-200">
                  <span className="mr-2 text-accent">{i + 1}.</span>
                  {st.prompt}
                </p>
                <div className="mt-2">
                  <Sourced item={st.answer} />
                </div>
                {st.muscleIds && st.muscleIds.length > 0 && (
                  <MuscleLinkChips ids={st.muscleIds} />
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

/** Small labeled wrapper used across region phases. */
function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}
