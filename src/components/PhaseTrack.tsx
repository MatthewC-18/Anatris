// src/components/PhaseTrack.tsx
//
// The 7-phase pedagogical navigator for a region (Anatris's core differentiator).
// Horizontal numbered tabs 1..7 over a scrollable phase body.
//
//   - Per-muscle phases (anatomy / biomechanics / palpation) walk the region's
//     muscles in teaching order and PROJECT only the MuscleContent field groups
//     declared by the phase. No content is duplicated; it is read live from the
//     active region's content index. Clicking a muscle header selects it so the
//     rest of the app (3D highlight, SelectionPanel) reacts.
//   - The biomechanics phase additionally renders the guided gestures
//     (phase.guides) as a step-by-step walkthrough that drives the 3D model.
//   - Region phases (tests / pathology / treatment / case) render their own
//     first-class entities, each claim carrying its citations via the shared
//     CitationRow.
//
// PRESENTACION: LAMINA (docs/sistema-lamina.md). Es la pantalla de LECTURA de la
// aplicacion, asi que se compone como la pagina de un libro y no como un panel:
//   - la barra de pasos son pestanas numeradas subrayadas (.tabs), no siete
//     pastillas con un circulo tintado por numero;
//   - cada musculo o entrada es una monografia separada por filos, con el rotulo
//     de cada campo colgado en una columna a la izquierda y el texto a la
//     derecha, siempre abierto (sin acordeones ni cajas anidadas);
//   - las notas de introduccion son una regla a la izquierda (.note), y la
//     graduacion de un test, que era un bloque tintado, es una subseccion con su
//     rotulo y su filo.
//
// EL ANCHO DE LINEA. La columna era `max-w-2xl` (42 rem) y los parrafos que no
// van dentro de un campo (la introduccion, la descripcion de una patologia, el
// fundamento de un principio de tratamiento) la ocupaban entera: a 14 px de
// Plex Sans, con un avance medio del orden de 0,47 em por caracter en texto
// espanol, salen unos 90 caracteres por linea, muy por encima de los 60 a 75
// que se leen sin perder el renglon. Ahora el texto corrido no pasa de unos
// 30 a 32 rem (unos 70 caracteres): el de los campos cae en la columna de la
// derecha, los parrafos sueltos se sangran hasta ella, y las introducciones y
// los recorridos guiados, que van a todo el ancho, se acotan a 32 rem.
//
// REGION-AWARE: the track and the muscle content index are chosen from the
// active region (store.region) via trackForRegion / muscleContentForRegion.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { trackForRegion } from '../data/trackByRegion';
import { isConceptModule, conceptForRegion } from '../data/conceptByRegion';
import { ConceptTrackView } from './ConceptTrackView';
import { muscleContentForRegion } from '../data/muscleContentByRegion';
import { testsForRegion } from '../data/orthopedicTests';
import { casesForRegion } from '../data/clinicalCases';
import { PHASE_ORDER, PHASE_META } from '../types/pedagogy';
import { Sourced, SourcedList, ActionItem } from './MuscleContentSections';
import { BiomechanicsGuide } from './BiomechanicsGuide';
import { LockGlyph, useFeatureGate } from './account/PremiumGate';
import { CheckIcon } from './ui/Icons';
import { useIsCompact } from '../hooks/useIsCompact';
import { goToTestInLab } from '../lib/caseEvidence';
import { labTestForLearn } from '../lib/learnTestBridge';
import { formatRoute } from '../lib/routing';
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
import type { OrthopedicTest } from '../types/orthopedicTest';

/** La columna del rotulo (7,5 rem) mas el hueco (1,5 rem): lo que se sangra un
 *  parrafo suelto para caer en la misma columna que el texto de un campo. */
const LABEL_GRID = 'grid grid-cols-1 gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-x-6';
const PROSE_INDENT = 'sm:pl-[9rem]';
/** Lo mismo como margen, para lo que ya lleva su propia regla a la izquierda
 *  (los pasos de un caso): el filo tiene que caer en la columna, no antes.
 *  Escrito entero y no derivado de PROSE_INDENT porque Tailwind solo genera
 *  las clases que lee literales en el codigo. */
const PROSE_OFFSET = 'sm:ml-[9rem]';

/* ===========================================================================
 * EL PASO POR EL QUE IBA
 *
 * El paso activo vivia solo en memoria (`learnPhase`, que arranca en
 * 'anatomy'): al recargar se volvia siempre al paso 1, y al cambiar de region
 * el paso se arrastraba a la otra (de "Tests clinicos" del hombro se aterrizaba
 * en "Tests clinicos" de la rodilla sin haber visto su anatomia). Y nada decia
 * que pasos se habian abierto ya. Ahora cada region recuerda su ultimo paso y
 * los que se han VISITADO (abierto, no "leido": la aplicacion no sabe si se han
 * leido). Es una comodidad de este navegador, asi que va en localStorage y cada
 * acceso esta protegido: sin almacenamiento la ruta simplemente no se recuerda.
 * ======================================================================== */

const STEPS_KEY = 'anatris.learn.steps';

interface StepMemory {
  last?: PhaseId;
  visited: PhaseId[];
}

function isPhaseId(value: unknown): value is PhaseId {
  return typeof value === 'string' && (PHASE_ORDER as readonly string[]).includes(value);
}

function readAllStepMemory(): Record<string, unknown> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(STEPS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readStepMemory(region: string): StepMemory {
  const entry = readAllStepMemory()[region];
  if (!entry || typeof entry !== 'object') return { visited: [] };
  const { last, visited } = entry as { last?: unknown; visited?: unknown };
  return {
    last: isPhaseId(last) ? last : undefined,
    visited: Array.isArray(visited) ? visited.filter(isPhaseId) : [],
  };
}

function writeStepMemory(region: string, memory: StepMemory): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const all = readAllStepMemory();
    all[region] = memory;
    window.localStorage.setItem(STEPS_KEY, JSON.stringify(all));
  } catch {
    // Sin almacenamiento la ruta no se recuerda entre visitas. No es un error.
  }
}

/** Cambia de modo por el mismo canal que el boton Atras (ver `goToTestInLab`
 *  en src/lib/caseEvidence.ts): App ya sabe reaccionar a `popstate`. */
function goToMode(region: string, mode: 'explore' | 'study'): void {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', formatRoute({ region, mode }));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Abre Explorar con un musculo ya seleccionado. */
function goToMuscleInExplore(region: string): void {
  goToMode(region, 'explore');
}

/**
 * DONDE SE VE EL MUSCULO. En la vista compacta Aprender lleva el modelo encima
 * del texto (45vh), y seleccionar un musculo lo resalta ahi mismo. Desde lg NO
 * HAY MODELO en Aprender: App monta el visor con `lg:hidden` y a su lado solo
 * estan el margen y esta columna. Alli, pulsar un nombre "Resaltar en el modelo
 * 3D" lo seleccionaba en un modelo que no estaba en pantalla, o sea que no
 * pasaba nada visible. En pantalla ancha el nombre lleva a Explorar con el
 * musculo ya seleccionado: el modelo y su ficha completa.
 */
function useShowMuscle(region: string): {
  show: (id: string) => void;
  hint: string;
} {
  const compact = useIsCompact();
  const selectMuscle = useAnatomyStore((s) => s.selectMuscle);
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  return {
    show: (id: string) => {
      if (compact) {
        selectMuscle(selectedMuscleId === id ? null : id);
        return;
      }
      selectMuscle(id);
      goToMuscleInExplore(region);
    },
    hint: compact ? 'Resaltar en el modelo 3D' : 'Ver en Explorar, con el modelo 3D y su ficha',
  };
}

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
  const regionKey = region ?? 'shoulder';
  const concept = isConceptModule(region);

  const [visited, setVisited] = useState<ReadonlySet<PhaseId>>(() => new Set());

  // Al entrar en una region: su ultimo paso (o el 1 si es la primera vez).
  // Efecto de layout para que no se pinte un fotograma con el paso de la region
  // anterior.
  useLayoutEffect(() => {
    if (concept) return;
    const memory = readStepMemory(regionKey);
    const step = memory.last ?? 'anatomy';
    const seen = new Set<PhaseId>(memory.visited);
    seen.add(step);
    setVisited(seen);
    setActive(step);
    writeStepMemory(regionKey, { last: step, visited: [...seen] });
  }, [regionKey, concept, setActive]);

  const choose = (id: PhaseId) => {
    const seen = new Set(visited);
    seen.add(id);
    setVisited(seen);
    setActive(id);
    writeStepMemory(regionKey, { last: id, visited: [...seen] });
  };

  // CADA PASO EMPIEZA ARRIBA. El cuerpo es el mismo contenedor con scroll para
  // los siete pasos: al pulsar "Tests clinicos" desde el final de la anatomia
  // (18 musculos en el hombro) el paso nuevo se abria a media pagina, con su
  // titulo y su introduccion fuera de vista.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [active, regionKey]);

  // Conceptual modules (e.g. Fundamentos) are NOT anatomical regions: they have
  // no muscles or ROM, so they render their own section-based view instead of
  // the 7-phase anatomical track. Intercept BEFORE deriving the region track.
  const conceptTrack = conceptForRegion(region);
  if (concept && conceptTrack) {
    return <ConceptTrackView track={conceptTrack} />;
  }

  const track = trackProp ?? trackForRegion(region);
  const content = muscleContentForRegion(region);
  const meta = PHASE_META[active];

  return (
    <section className="flex h-full w-full flex-col bg-page">
      {/* LOS SIETE PASOS, COMO PESTANAS NUMERADAS. El contenedor se desliza en
          horizontal cuando no caben (en un movil no caben siete rotulos) y el
          filo de base va DENTRO de lo que se desliza: puesto en el propio
          contenedor con scroll, el subrayado de 2 px de la activa, que pisa ese
          filo, se recortaria a 1 px contra el borde del scroll. Un paso ya
          visitado lleva una marca despues del rotulo. */}
      <div className="shrink-0 overflow-x-auto">
        <div role="tablist" aria-label="Pasos de la ruta" className="tabs min-w-max px-6">
          {PHASE_ORDER.map((id) => {
            const m = PHASE_META[id];
            const isActive = id === active;
            const seen = visited.has(id);
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`learn-step-${id}`}
                aria-selected={isActive}
                aria-controls="learn-step-panel"
                onClick={() => choose(id)}
                title={m.blurb}
                className="tab"
              >
                <span
                  className={`num text-[11px] ${
                    isActive ? 'text-brand' : seen ? 'text-fg2' : 'text-fg3'
                  }`}
                >
                  {m.step}
                </span>
                {m.label}
                {seen && !isActive && (
                  <span className="text-fg3" aria-hidden="true">
                    <CheckIcon size={11} />
                  </span>
                )}
                {seen && <span className="sr-only">, visitado</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase header */}
      <div className="shrink-0 px-6 pt-6">
        <div className="mx-auto max-w-[39rem]">
          <p className="kicker">
            Fase {meta.step} de 7
            <span className="ml-2 text-fg3/80">· {visited.size} de 7 visitadas</span>
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-fg">{meta.label}</h2>
          <p className="mt-1.5 max-w-[32rem] text-sm leading-relaxed text-fg3">{meta.blurb}</p>
        </div>
      </div>

      {/* Phase body. Keyed by region and phase: anatomy, biomechanics and
          palpation share one component, so without the key a citation opened
          in one step stayed open on whatever took its place in the next. */}
      <div
        ref={bodyRef}
        id="learn-step-panel"
        role="tabpanel"
        aria-labelledby={`learn-step-${active}`}
        className="flex-1 overflow-y-auto px-6 pb-12 pt-5"
      >
        <div className="mx-auto max-w-[39rem]">
          <PhaseBody
            key={`${regionKey}:${active}`}
            phaseId={active}
            region={regionKey}
            track={track}
            content={content}
          />
        </div>
      </div>
    </section>
  );
}

function PhaseBody({
  phaseId,
  region,
  track,
  content,
}: {
  phaseId: PhaseId;
  region: string;
  track: RegionTrack;
  content: MuscleContentIndex;
}) {
  const phases = track.phases;
  switch (phaseId) {
    case 'anatomy':
      return (
        <PerMuscleView phaseId={phaseId} region={region} phase={phases.anatomy} content={content} />
      );
    case 'biomechanics':
      return (
        <PerMuscleView
          phaseId={phaseId}
          region={region}
          phase={phases.biomechanics}
          content={content}
        />
      );
    case 'palpation':
      return (
        <PerMuscleView
          phaseId={phaseId}
          region={region}
          phase={phases.palpation}
          content={content}
        />
      );
    case 'tests':
      return <TestsView region={region} phase={phases.tests} content={content} />;
    case 'pathology':
      return <PathologyView region={region} phase={phases.pathology} content={content} />;
    case 'treatment':
      return <TreatmentView phase={phases.treatment} />;
    case 'case':
      return <CaseView region={region} phase={phases.case} content={content} />;
  }
}

/* ===========================================================================
 * EDITORIAL PRIMITIVES (no boxes, no accordions)
 * ======================================================================== */

/** A labeled prose block: the label hangs in its own column on the left and the
 *  content reads to the right. The building block of the monograph layout. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={LABEL_GRID}>
      {/* `pt-[5px]` baja el rotulo de 10 px hasta la primera linea del texto de
          14 px que tiene al lado, para que los dos compartan renglon. */}
      <p className="kicker pt-[5px] leading-snug">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Un parrafo suelto (sin rotulo), sangrado hasta la columna del texto. */
function Prose({ children }: { children: React.ReactNode }) {
  return <div className={PROSE_INDENT}>{children}</div>;
}

/** La introduccion de un paso: una regla de acento a la izquierda, sin caja,
 *  acotada al mismo ancho de linea que el resto del texto. */
function Callout({ children }: { children: React.ReactNode }) {
  return <div className="note note-brand max-w-[32rem]">{children}</div>;
}

/** Section index used by the region-phase entries. */
function EntryIndex({ n }: { n: number }) {
  return (
    <span className="num text-xs font-semibold text-brand/70">{String(n).padStart(2, '0')}</span>
  );
}

/* ===========================================================================
 * PER-MUSCLE PHASES (anatomy / biomechanics / palpation)
 * ======================================================================== */

/**
 * Si un musculo tiene algo que ensenar en este campo. La misma regla decide si
 * se pinta el campo (MuscleFieldGroup) y si el musculo entra en el paso: antes
 * eran dos cosas distintas, y un musculo sin ningun campo salia igual, con su
 * nombre y nada debajo.
 */
function fieldHasContent(content: MuscleContent, field: MuscleField): boolean {
  switch (field) {
    case 'origin':
      return !!content.origin;
    case 'insertion':
      return !!content.insertion;
    case 'innervation':
      return !!content.innervation;
    case 'actions':
      return (content.actions ?? []).length > 0;
    case 'biomechanics':
      return (content.biomechanics ?? []).length > 0;
    case 'functionalPositions':
      return !!content.functionalPositions;
    case 'synergists':
      return (content.synergists ?? []).length > 0;
    case 'antagonists':
      return (content.antagonists ?? []).length > 0;
    case 'palpation':
      return !!content.palpation;
  }
}

/** Como se nombra lo que falta en cada paso por musculo (femenino singular:
 *  "la ... no esta redactada", "sin ... redactada"). */
const MISSING_NOUN: Record<'anatomy' | 'biomechanics' | 'palpation', string> = {
  anatomy: 'ficha anatómica',
  biomechanics: 'biomecánica',
  palpation: 'guía de palpación',
};

function PerMuscleView({
  phaseId,
  region,
  phase,
  content,
}: {
  phaseId: 'anatomy' | 'biomechanics' | 'palpation';
  region: string;
  phase: PerMusclePhase;
  content: MuscleContentIndex;
}) {
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const { show, hint } = useShowMuscle(region);

  // LOS MUSCULOS SIN NADA QUE ENSENAR EN ESTE PASO NO SE PINTAN UNO A UNO.
  // Medido sobre las ocho rutas: en Palpacion, la cadera listaba 19 musculos y
  // NINGUNO tiene `palpation` ni `functionalPositions` (los dos campos del
  // paso), y el tobillo 12 de 12; el raquis cervical 16 de 23, el toracico 2 de
  // 7 y el lumbar 2 de 11. Cada uno salia como un titulo con nada debajo: en la
  // cadera, 19 titulos seguidos y ni una linea de texto. Ahora se dice una vez,
  // con sus nombres, que esa parte no esta redactada. Sin inventar contenido.
  const { shown, missing } = useMemo(() => {
    const shownIds: string[] = [];
    const missingNames: string[] = [];
    for (const id of phase.muscleIds) {
      const muscle = content[id];
      if (!muscle) continue; // id with no card yet - skip silently
      if (phase.fields.some((f) => fieldHasContent(muscle, f))) shownIds.push(id);
      else missingNames.push(muscle.nameEs);
    }
    return { shown: shownIds, missing: missingNames };
  }, [phase, content]);

  // LOS RECORRIDOS GUIADOS, DE UNO EN UNO. Se montaban los cuatro a la vez
  // (seis de las ocho regiones tienen cuatro) y cada uno, al montarse, mandaba
  // su paso 1 al modelo: el modelo ensenaba el ULTIMO gesto mientras los cuatro
  // marcaban su paso 1 como activo. Y cada uno guardaba el lado que encontraba
  // para devolverlo al salir; como todos los pasos de todas las guias fijan el
  // lado derecho, la segunda guardaba el "derecho" que habia puesto la primera,
  // y al dejar Biomecanica el filtro podia quedarse en "derecho" con medio
  // cuerpo escondido. Con un solo recorrido montado, cambiar de gesto desmonta
  // el anterior (devuelve el lado y limpia el resaltado) antes de montar el
  // siguiente.
  const guides = phase.guides ?? [];
  const [guideId, setGuideId] = useState<string | null>(guides[0]?.movementId ?? null);
  const activeGuide = guides.find((g) => g.movementId === guideId) ?? guides[0];

  return (
    <div className="flex flex-col">
      {phase.intro && (
        <div className="mb-4">
          <Callout>
            <Sourced item={phase.intro} />
          </Callout>
        </div>
      )}

      {/* Guided gestures (biomechanics phase). Rendered before the muscle walk-
          through so the student can play the movement, then study the muscles. */}
      {activeGuide && (
        <div className="mb-2 max-w-[32rem]">
          {guides.length > 1 && (
            <div className="overflow-x-auto pt-3">
              <div role="tablist" aria-label="Recorridos guiados" className="tabs min-w-max">
                {guides.map((g) => (
                  <button
                    key={g.movementId}
                    type="button"
                    role="tab"
                    aria-selected={g.movementId === activeGuide.movementId}
                    onClick={() => setGuideId(g.movementId)}
                    className="tab"
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <BiomechanicsGuide key={activeGuide.movementId} guide={activeGuide} />
        </div>
      )}

      {shown.length === 0 && missing.length > 0 && (
        <p className="note note-warn max-w-[32rem]">
          La {MISSING_NOUN[phaseId]} de los {missing.length} músculos de esta región todavía no está
          redactada.
        </p>
      )}

      <div className="divide-y divide-line/75">
        {shown.map((id) => {
          const muscle = content[id];
          const isSelected = id === selectedMuscleId;
          return (
            <article key={id} className="py-6 first:pt-3">
              <button
                type="button"
                onClick={() => show(id)}
                title={hint}
                className="group flex w-full items-baseline justify-between gap-3 rounded text-left"
              >
                <span className="min-w-0">
                  <span
                    className={`font-display text-lg font-semibold transition-colors ${
                      isSelected ? 'text-brand' : 'text-fg group-hover:text-brand'
                    }`}
                  >
                    {muscle.nameEs}
                  </span>
                  <span className="ml-2 text-sm italic text-fg3">{muscle.nameLat}</span>
                </span>
                {/* El grupo funcional ("Manguito rotador") es un dato, no un
                    boton: etiqueta en mono, sin la pastilla con borde. */}
                {muscle.group && <span className="tag shrink-0">{muscle.group}</span>}
              </button>

              <div className="mt-4 space-y-4">
                {phase.fields.map((field) => (
                  <MuscleFieldGroup key={field} content={muscle} field={field} />
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {shown.length > 0 && missing.length > 0 && (
        <p className="note mt-4 max-w-[32rem]">
          Sin {MISSING_NOUN[phaseId]} redactada todavía: {missing.join(', ')}.
        </p>
      )}
    </div>
  );
}

/** Projects ONE requested MuscleContent field group as an editorial Field. */
function MuscleFieldGroup({ content, field }: { content: MuscleContent; field: MuscleField }) {
  if (!fieldHasContent(content, field)) return null;
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
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fg3" />
                  <ActionItem action={a} />
                </li>
              ))}
            </ul>
          )}
        </Field>
      );
    }
    case 'biomechanics':
      return (
        <Field label="Biomecánica">
          <SourcedList items={content.biomechanics ?? []} />
        </Field>
      );
    case 'functionalPositions':
      if (!content.functionalPositions) return null;
      return (
        <Field label="Posiciones">
          <p className="mb-0.5 text-[11px] font-medium text-fg3">Acortado</p>
          <Sourced item={content.functionalPositions.shortened} />
          <p className="mb-0.5 mt-2.5 text-[11px] font-medium text-fg3">Estirado</p>
          <Sourced item={content.functionalPositions.lengthened} />
        </Field>
      );
    case 'synergists':
      return (
        <Field label="Sinergistas">
          <SourcedList items={content.synergists ?? []} />
        </Field>
      );
    case 'antagonists':
      return (
        <Field label="Antagonistas">
          <SourcedList items={content.antagonists ?? []} />
        </Field>
      );
    case 'palpation':
      if (!content.palpation) return null;
      return (
        <Field label="Palpación">
          <Sourced item={content.palpation.howTo} />
          {content.palpation.position && (
            <div className="mt-2">
              <p className="mb-0.5 text-[11px] font-medium text-fg3">Posición de acceso</p>
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

/** The muscles a test, pathology or case step involves: text links separated by
 *  a middle dot (they used to be bordered chips). Each one shows the muscle: in
 *  place on the compact model, or in Explorar where Aprender has no model. */
function MuscleLinkChips({
  ids,
  content,
  region,
  indent = true,
}: {
  ids: string[];
  content: MuscleContentIndex;
  region: string;
  /** false where the row already sits inside the indented column (case steps). */
  indent?: boolean;
}) {
  const { show, hint } = useShowMuscle(region);
  // Solo los que tienen ficha: un id sin ficha se pintaba tal cual
  // ("pectoralis-major") y abria Explorar sin nada seleccionado. Medido con el
  // registro completo, hoy los 533 enlaces de las ocho rutas tienen ficha y
  // musculo con el mismo id; esto evita que un dato nuevo lo rompa en pantalla.
  const linked = ids.filter((id) => content[id]);
  if (linked.length === 0) return null;
  return (
    <p
      className={`mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 ${indent ? PROSE_INDENT : ''}`}
    >
      <span className="kicker mr-1">Músculos</span>
      {linked.map((id, i) => {
        const label = content[id].nameEs;
        return (
          <span key={id} className="inline-flex items-baseline gap-2">
            {i > 0 && (
              <span className="text-fg3" aria-hidden="true">
                ·
              </span>
            )}
            <button
              type="button"
              onClick={() => show(id)}
              title={hint}
              className="rounded text-[13px] font-medium text-fg2 underline decoration-line underline-offset-4 transition-colors hover:text-brand hover:decoration-brand/60"
            >
              {label}
            </button>
          </span>
        );
      })}
    </p>
  );
}

/** Editorial entry wrapper for the region phases: index + title, hairline-split. */
function Entry({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <article className="py-6 first:pt-3">
      <header className="flex items-baseline gap-3">
        <EntryIndex n={n} />
        <h3 className="font-display text-lg font-semibold text-fg">{title}</h3>
      </header>
      <div className="mt-4 space-y-4">{children}</div>
    </article>
  );
}

function TestsView({
  region,
  phase,
  content,
}: {
  region: string;
  phase: TestsPhase;
  content: MuscleContentIndex;
}) {
  // Las pruebas del panel del laboratorio de ESTA region (en una de pago,
  // instaladas desde el edge function antes de que App deje pintarla).
  const labTests = useMemo(() => testsForRegion(region), [region]);
  return (
    <div className="flex flex-col">
      {phase.intro && (
        <div className="mb-4">
          <Callout>
            <Sourced item={phase.intro} />
          </Callout>
        </div>
      )}
      <div className="divide-y divide-line/75">
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
            <MuscleLinkChips ids={t.targetMuscleIds} content={content} region={region} />
            <LabBridge
              region={region}
              learnName={t.name}
              lab={labTestForLearn(region, t, labTests)}
            />
          </Entry>
        ))}
      </div>
    </div>
  );
}

/**
 * EL PUENTE AL LABORATORIO. La prueba que se acaba de leer, abierta en el panel
 * de pruebas con su ficha desplegada (sensibilidad, especificidad, estudio) y,
 * si la tiene, su demostracion en el modelo. Es el mismo enlace que usan los
 * casos clinicos (`goToTestInLab`) y la misma puerta de pago que el panel.
 *
 * Donde la ruta y el panel no comparten la prueba no se pinta nada (ver
 * src/lib/learnTestBridge.ts: 33 de las 43 pruebas tienen pareja). Y el rotulo
 * no promete una demostracion que no existe: una prueba sin `demo` abre su
 * ficha, no "la demostracion".
 */
function LabBridge({
  region,
  learnName,
  lab,
}: {
  region: string;
  learnName: string;
  lab: OrthopedicTest | null;
}) {
  const gate = useFeatureGate('orthopedic-tests');
  if (!lab) return null;
  const renamed = lab.name !== learnName;
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${PROSE_INDENT}`}>
      <button
        type="button"
        onClick={() => (gate.unlocked ? goToTestInLab(region, lab.id) : gate.requestUpgrade())}
        className="btn btn-line btn-sm"
      >
        {/* Con candado si el panel de pruebas no esta desbloqueado: mejor
            decirlo aqui que mandar al usuario a una puerta cerrada. */}
        {!gate.unlocked && <LockGlyph className="h-3 w-3" />}
        {lab.demo ? 'Ver la demostración en 3D →' : 'Abrir su ficha en el laboratorio →'}
      </button>
      {/* El panel la llama de otra manera en 12 de las 14 que comparten id
          ("Test de Neer" frente a "Prueba de Neer (pinzamiento)"): se dice,
          para que el fisio sepa que es la misma. */}
      {renamed && <span className="text-xs text-fg3">En el laboratorio: «{lab.name}»</span>}
    </p>
  );
}

/** Renders the graded-response guidance of a test (sustain time, pain vs.
 *  weakness, and interpretation by intensity). Era un bloque tintado dentro de
 *  la entrada; ahora es una subseccion: rotulo de acento y filo hasta el borde,
 *  y sus campos con la misma columna que el resto. */
function TestGradingBlock({
  grading,
}: {
  grading: NonNullable<TestsPhase['tests'][number]['grading']>;
}) {
  return (
    <div className="pt-2">
      <div className="sec-head">
        <span className="kicker text-brand/80">Graduación de la respuesta</span>
        <span className="sec-rule" />
      </div>
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
                  <p className="text-sm font-medium text-fg">{g.finding}</p>
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
  region,
  phase,
  content,
}: {
  region: string;
  phase: PathologyPhase;
  content: MuscleContentIndex;
}) {
  return (
    <div className="flex flex-col">
      {phase.intro && (
        <div className="mb-4">
          <Callout>
            <Sourced item={phase.intro} />
          </Callout>
        </div>
      )}
      <div className="divide-y divide-line/75">
        {phase.pathologies.map((p, i) => (
          <Entry key={p.id} n={i + 1} title={p.name}>
            <Prose>
              <Sourced item={p.description} />
            </Prose>
            {p.presentation && (
              <Field label="Presentación">
                <Sourced item={p.presentation} />
              </Field>
            )}
            <MuscleLinkChips ids={p.relatedMuscleIds} content={content} region={region} />
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
        <div className="mb-4">
          <Callout>
            <Sourced item={phase.intro} />
          </Callout>
        </div>
      )}
      <div className="divide-y divide-line/75">
        {phase.principles.map((pr, i) => (
          <Entry key={pr.id} n={i + 1} title={pr.title}>
            <Prose>
              <Sourced item={pr.rationale} />
            </Prose>
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
  region,
  phase,
  content,
}: {
  region: string;
  phase: CasePhase;
  content: MuscleContentIndex;
}) {
  // LOS CASOS DE ESTE PASO SE LEEN; LOS DE REPASAR SE RESUELVEN. Son dos
  // colecciones distintas (en el hombro, 2 casos aqui y 3 en Repasar, con
  // opciones desordenadas, explicacion y, cuando el paso la nombra, la prueba
  // que lo respalda), y nada llevaba de una a otra: el paso terminaba en la
  // respuesta escrita.
  const toSolve = useMemo(() => casesForRegion(region).length, [region]);
  return (
    <div className="flex flex-col">
      <div className="divide-y divide-line/75">
        {phase.cases.map((c, ci) => (
          <Entry key={c.id} n={ci + 1} title={c.title}>
            <Field label="Caso">
              <Sourced item={c.vignette} />
            </Field>
            <ol className={`space-y-3 border-l border-line pl-4 ${PROSE_OFFSET}`}>
              {c.steps.map((st, i) => (
                <li key={st.id}>
                  <p className="text-sm font-medium text-fg">
                    <span className="num mr-2 text-brand/70">{i + 1}</span>
                    {st.prompt}
                  </p>
                  <div className="mt-1">
                    <Sourced item={st.answer} />
                  </div>
                  {st.muscleIds && st.muscleIds.length > 0 && (
                    <MuscleLinkChips
                      ids={st.muscleIds}
                      content={content}
                      region={region}
                      indent={false}
                    />
                  )}
                </li>
              ))}
            </ol>
          </Entry>
        ))}
      </div>
      {toSolve > 0 && (
        <p className="note note-brand mt-2 max-w-[32rem]">
          Para resolver casos paso a paso, eligiendo la respuesta antes de verla, Repasar tiene{' '}
          {toSolve} {toSolve === 1 ? 'caso' : 'casos'} de esta región en su pestaña Casos.{' '}
          <button
            type="button"
            onClick={() => goToMode(region, 'study')}
            className="rounded font-medium text-brand underline-offset-4 hover:underline"
          >
            Abrir Repasar →
          </button>
        </p>
      )}
    </div>
  );
}
