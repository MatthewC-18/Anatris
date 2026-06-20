// src/components/PhaseTrack.tsx
//
// The 7-phase pedagogical navigator for a region (Anatris's core differentiator).
// Horizontal numbered tabs 1..7 over a scrollable phase body.
//
//   - Per-muscle phases (anatomy / biomechanics / palpation) walk the region's
//     muscles in teaching order and PROJECT only the MuscleContent field groups
//     declared by the phase. No content is duplicated; it is read live from the
//     active region's content index. Clicking a muscle header calls
//     selectMuscle() so the rest of the app (3D highlight, SelectionPanel) reacts.
//   - The biomechanics phase additionally renders any guided gestures
//     (phase.guides) as a step-by-step walkthrough that drives the 3D model.
//   - Region phases (tests / pathology / treatment / case) render their own
//     first-class entities, each claim carrying its citations via the shared
//     CitationRow.
//
// PRESENTATION: an EDITORIAL reading layout, not stacked collapsible cards. Each
// muscle is a monograph-style entry separated by hairlines; fields are shown as
// always-open labeled prose (no accordions, no nested boxes). Region phases read
// as numbered entries. The goal is a calm, premium, textbook feel.
//
// REGION-AWARE: the track and the muscle content index are chosen from the
// active region (store.region) via trackForRegion / muscleContentForRegion.

import { useAnatomyStore } from '../store/anatomyStore';
import { trackForRegion } from '../data/trackByRegion';
import { isConceptModule, conceptForRegion } from '../data/conceptByRegion';
import { ConceptTrackView } from './ConceptTrackView';
import { muscleContentForRegion } from '../data/muscleContentByRegion';
import { PHASE_ORDER, PHASE_META } from '../types/pedagogy';
import { Sourced, SourcedList, ActionItem } from './MuscleContentSections';
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
import type { MuscleContent, MuscleContentIndex } from '../types/muscleContent';

interface PhaseTrackProps {
  /** Optional explicit track. When omitted, derived from the active region. */
  track?: RegionTrack;
}

export function PhaseTrack({ track: trackProp }: PhaseTrackProps) {
  // The active phase lives in the store so the Sidebar phase navigator and this
  // tab strip stay in sync (one source of truth).
  const active = useAnatomyStore((s) => s.learnPhase);
  const setActive = useAnatomyStore((s) => s.setLearnPhase);
  const region = useAnatomyStore((s) => s.region);

  // Conceptual modules (e.g. Fundamentos) are NOT anatomical regions: they have
  // no muscles or ROM, so they render their own section-based view instead of
  // the 7-phase anatomical track. Intercept BEFORE deriving the region track.
  const conceptTrack = conceptForRegion(region);
  if (isConceptModule(region) && conceptTrack) {
    return <ConceptTrackView track={conceptTrack} />;
  }

  const track = trackProp ?? trackForRegion(region);
  const content = muscleContentForRegion(region);
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

      {/* Phase header */}
      <div className="shrink-0 px-6 pt-5">
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600">
            Fase {meta.step} de 7
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-slate-50">
            {meta.label}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{meta.blurb}</p>
        </div>
      </div>

      {/* Phase body */}
      <div className="flex-1 overflow-y-auto px-6 pb-12 pt-6">
        <div className="mx-auto max-w-2xl">
          <PhaseBody phaseId={active} track={track} content={content} />
        </div>
      </div>
    </section>
  );
}

function PhaseBody({
  phaseId,
  track,
  content,
}: {
  phaseId: PhaseId;
  track: RegionTrack;
  content: MuscleContentIndex;
}) {
  const phases = track.phases;
  switch (phaseId) {
    case 'anatomy':
      return <PerMuscleView phase={phases.anatomy} content={content} />;
    case 'biomechanics':
      return <PerMuscleView phase={phases.biomechanics} content={content} />;
    case 'palpation':
      return <PerMuscleView phase={phases.palpation} content={content} />;
    case 'tests':
      return <TestsView phase={phases.tests} content={content} />;
    case 'pathology':
      return <PathologyView phase={phases.pathology} content={content} />;
    case 'treatment':
      return <TreatmentView phase={phases.treatment} />;
    case 'case':
      return <CaseView phase={phases.case} content={content} />;
  }
}

/* ===========================================================================
 * EDITORIAL PRIMITIVES (no boxes, no accordions)
 * ======================================================================== */

/** A labeled prose block: small caps label, then content. The building block of
 *  the monograph layout, replacing the old collapsible Section card. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:gap-x-6">
      <p className="pt-px font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A quiet, rule-marked callout for intros (no filled box). */
function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-accent/40 pl-4 text-slate-300">{children}</div>
  );
}

/** Section index pill used by the region-phase entries. */
function EntryIndex({ n }: { n: number }) {
  return (
    <span className="font-mono text-xs font-semibold text-accent/70">
      {String(n).padStart(2, '0')}
    </span>
  );
}

/* ===========================================================================
 * PER-MUSCLE PHASES (anatomy / biomechanics / palpation)
 * ======================================================================== */

function PerMuscleView({
  phase,
  content,
}: {
  phase: PerMusclePhase;
  content: MuscleContentIndex;
}) {
  const selectMuscle = useAnatomyStore((s) => s.selectMuscle);
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);

  return (
    <div className="flex flex-col">
      {phase.intro && (
        <div className="mb-2">
          <Callout>
            <Sourced item={phase.intro} />
          </Callout>
        </div>
      )}

      {/* Guided gestures (biomechanics phase). Rendered before the muscle walk-
          through so the student can play the movement, then study the muscles. */}
      {phase.guides && phase.guides.length > 0 && (
        <div className="mb-2 flex flex-col gap-3">
          {phase.guides.map((g) => (
            <BiomechanicsGuide key={g.movementId} guide={g} />
          ))}
        </div>
      )}

      <div className="divide-y divide-slate-800/60">
        {phase.muscleIds.map((id) => {
          const muscle = content[id];
          if (!muscle) return null; // id with no card yet - skip silently
          const isSelected = id === selectedMuscleId;
          return (
            <article key={id} className="py-6 first:pt-3">
              <button
                type="button"
                onClick={() => selectMuscle(isSelected ? null : id)}
                title="Resaltar en el modelo 3D"
                className="group flex w-full items-baseline justify-between gap-3 text-left"
              >
                <span className="min-w-0">
                  <span
                    className={`font-display text-lg font-semibold transition-colors ${
                      isSelected
                        ? 'text-accent'
                        : 'text-slate-100 group-hover:text-white'
                    }`}
                  >
                    {muscle.nameEs}
                  </span>
                  <span className="ml-2 text-sm italic text-slate-500">
                    {muscle.nameLat}
                  </span>
                </span>
                {muscle.group && (
                  <span className="shrink-0 rounded-full border border-slate-700/70 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    {muscle.group}
                  </span>
                )}
              </button>

              <dl className="mt-4 space-y-4">
                {phase.fields.map((field) => (
                  <MuscleFieldGroup key={field} content={muscle} field={field} />
                ))}
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/** Projects ONE requested MuscleContent field group as an editorial Field. */
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
        <Field label="Origen">
          <Sourced item={content.origin} />
        </Field>
      );
    case 'insertion':
      return (
        <Field label="Inserción">
          <Sourced item={content.insertion} />
        </Field>
      );
    case 'innervation':
      return (
        <Field label="Inervación">
          <Sourced item={content.innervation.nerve} />
          {content.innervation.roots && (
            <div className="mt-2">
              <Sourced item={content.innervation.roots} />
            </div>
          )}
        </Field>
      );
    case 'actions': {
      const primary = content.actions.filter((a) => a.role === 'primary');
      const accessory = content.actions.filter((a) => a.role === 'accessory');
      return (
        <Field label="Acciones">
          {primary.length > 0 && (
            <ul className="flex flex-col gap-2">
              {primary.map((a, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-role-prime" />
                  <ActionItem action={a} />
                </li>
              ))}
            </ul>
          )}
          {accessory.length > 0 && (
            <ul className="mt-2.5 flex flex-col gap-2">
              {accessory.map((a, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600" />
                  <ActionItem action={a} />
                </li>
              ))}
            </ul>
          )}
        </Field>
      );
    }
    case 'biomechanics':
      if (!content.biomechanics || content.biomechanics.length === 0) return null;
      return (
        <Field label="Biomecánica">
          <SourcedList items={content.biomechanics} />
        </Field>
      );
    case 'functionalPositions':
      if (!content.functionalPositions) return null;
      return (
        <Field label="Posiciones">
          <p className="mb-0.5 text-[11px] font-medium text-slate-500">Acortado</p>
          <Sourced item={content.functionalPositions.shortened} />
          <p className="mb-0.5 mt-2.5 text-[11px] font-medium text-slate-500">
            Estirado
          </p>
          <Sourced item={content.functionalPositions.lengthened} />
        </Field>
      );
    case 'synergists':
      if (!content.synergists || content.synergists.length === 0) return null;
      return (
        <Field label="Sinergistas">
          <SourcedList items={content.synergists} />
        </Field>
      );
    case 'antagonists':
      if (!content.antagonists || content.antagonists.length === 0) return null;
      return (
        <Field label="Antagonistas">
          <SourcedList items={content.antagonists} />
        </Field>
      );
    case 'palpation':
      if (!content.palpation) return null;
      return (
        <Field label="Palpación">
          <Sourced item={content.palpation.howTo} />
          {content.palpation.position && (
            <div className="mt-2">
              <p className="mb-0.5 text-[11px] font-medium text-slate-500">
                Posición de acceso
              </p>
              <Sourced item={content.palpation.position} />
            </div>
          )}
        </Field>
      );
  }
}

/* ===========================================================================
 * REGION PHASES (tests / pathology / treatment / case)
 * ======================================================================== */

/** Small helper: a chip linking to a muscle by id (jumps it into selection). */
function MuscleLinkChips({
  ids,
  content,
}: {
  ids: string[];
  content: MuscleContentIndex;
}) {
  const selectMuscle = useAnatomyStore((s) => s.selectMuscle);
  if (ids.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const c = content[id];
        const label = c ? c.nameEs : id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => selectMuscle(id)}
            className="rounded-md border border-slate-700/60 px-2 py-0.5 text-[11px] font-medium text-slate-400 transition-colors hover:border-accent/50 hover:text-accent"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Editorial entry wrapper for the region phases: index + title, hairline-split. */
function Entry({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="py-6 first:pt-3">
      <header className="flex items-baseline gap-3">
        <EntryIndex n={n} />
        <h3 className="font-display text-lg font-semibold text-slate-100">{title}</h3>
      </header>
      <div className="mt-4 space-y-4">{children}</div>
    </article>
  );
}

function TestsView({
  phase,
  content,
}: {
  phase: TestsPhase;
  content: MuscleContentIndex;
}) {
  return (
    <div className="flex flex-col">
      {phase.intro && (
        <div className="mb-2">
          <Callout>
            <Sourced item={phase.intro} />
          </Callout>
        </div>
      )}
      <div className="divide-y divide-slate-800/60">
        {phase.tests.map((t, i) => (
          <Entry key={t.id} n={i + 1} title={t.name}>
            <Field label="Qué valora">
              <Sourced item={t.assesses} />
            </Field>
            <Field label="Procedimiento">
              <Sourced item={t.procedure} />
            </Field>
            <Field label="Signo positivo">
              <Sourced item={t.positiveSign} />
            </Field>
            {t.grading && <TestGradingBlock grading={t.grading} />}
            <MuscleLinkChips ids={t.targetMuscleIds} content={content} />
          </Entry>
        ))}
      </div>
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
    <div className="rounded-lg bg-ink-900/50 p-4">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-accent/80">
        Graduación de la respuesta
      </p>
      <div className="space-y-4">
        {grading.holdTime && (
          <Field label="Sostén">
            <Sourced item={grading.holdTime} />
          </Field>
        )}
        {grading.painVsWeakness && (
          <Field label="Dolor vs. debilidad">
            <Sourced item={grading.painVsWeakness} />
          </Field>
        )}
        {grading.grades && grading.grades.length > 0 && (
          <Field label="Por grados">
            <ul className="flex flex-col gap-2.5">
              {grading.grades.map((g, i) => (
                <li key={i}>
                  <p className="text-sm font-medium text-slate-200">{g.finding}</p>
                  <div className="mt-0.5">
                    <Sourced item={g.interpretation} />
                  </div>
                </li>
              ))}
            </ul>
          </Field>
        )}
      </div>
    </div>
  );
}

function PathologyView({
  phase,
  content,
}: {
  phase: PathologyPhase;
  content: MuscleContentIndex;
}) {
  return (
    <div className="flex flex-col">
      {phase.intro && (
        <div className="mb-2">
          <Callout>
            <Sourced item={phase.intro} />
          </Callout>
        </div>
      )}
      <div className="divide-y divide-slate-800/60">
        {phase.pathologies.map((p, i) => (
          <Entry key={p.id} n={i + 1} title={p.name}>
            <div className="text-sm leading-relaxed text-slate-300">
              <Sourced item={p.description} />
            </div>
            {p.presentation && (
              <Field label="Presentación">
                <Sourced item={p.presentation} />
              </Field>
            )}
            <MuscleLinkChips ids={p.relatedMuscleIds} content={content} />
          </Entry>
        ))}
      </div>
    </div>
  );
}

function TreatmentView({ phase }: { phase: TreatmentPhase }) {
  return (
    <div className="flex flex-col">
      {phase.intro && (
        <div className="mb-2">
          <Callout>
            <Sourced item={phase.intro} />
          </Callout>
        </div>
      )}
      <div className="divide-y divide-slate-800/60">
        {phase.principles.map((pr, i) => (
          <Entry key={pr.id} n={i + 1} title={pr.title}>
            <div className="text-sm leading-relaxed text-slate-300">
              <Sourced item={pr.rationale} />
            </div>
            {pr.examples && pr.examples.length > 0 && (
              <Field label="Ejemplos">
                <SourcedList items={pr.examples} />
              </Field>
            )}
          </Entry>
        ))}
      </div>
    </div>
  );
}

function CaseView({
  phase,
  content,
}: {
  phase: CasePhase;
  content: MuscleContentIndex;
}) {
  return (
    <div className="divide-y divide-slate-800/60">
      {phase.cases.map((c, ci) => (
        <Entry key={c.id} n={ci + 1} title={c.title}>
          <Field label="Caso">
            <Sourced item={c.vignette} />
          </Field>
          <ol className="space-y-3 border-l border-slate-800/60 pl-4">
            {c.steps.map((st, i) => (
              <li key={st.id}>
                <p className="text-sm font-medium text-slate-200">
                  <span className="mr-2 font-mono text-accent/70">{i + 1}</span>
                  {st.prompt}
                </p>
                <div className="mt-1">
                  <Sourced item={st.answer} />
                </div>
                {st.muscleIds && st.muscleIds.length > 0 && (
                  <MuscleLinkChips ids={st.muscleIds} content={content} />
                )}
              </li>
            ))}
          </ol>
        </Entry>
      ))}
    </div>
  );
}
