// src/components/movement/OrthopedicTestsPanel.tsx
//
// Biomechanics-lab panel: ORTHOPEDIC SPECIAL TESTS for the active region. Beyond
// listing maneuver + metrics + study, it adds three functions the usual
// test-list apps do not have:
//
//   1. DEMOSTRAR EN EL MODELO: a test drives the 3D rig THROUGH its provocative
//      maneuver (animated sweep) and glows the stressed structure.
//   2. RAZONAMIENTO (FAGAN): a pretest-probability slider + the test's LR update
//      the POST-test probability for a positive/negative result (Bayes).
//   3. CLUSTER: select several tests and see the combined post-test probability
//      if all are positive.
//
// -----------------------------------------------------------------------------
// DESIGN RULES. Read before adding anything here.
// -----------------------------------------------------------------------------
// This panel is the reason a physio pays, and it had drifted into the look of a
// generated dashboard: seven saturated colours competing at once, seven type
// sizes (down to 8px), and every block wrapped in its own tinted rounded box
// with a gradient on the help card. Dense is fine, this is an instrument. Noisy
// is not. So:
//
// 1. COLOUR IS A TWO-AXIS CODE, and nothing else. Sky is SENSIBILIDAD and
//    everything that follows from it (SnNout, "descarta", the negative branch).
//    Emerald is ESPECIFICIDAD and its consequences (SpPin, "confirma", the
//    positive branch). Amber marks things needing attention: a balanced profile,
//    a resisted maneuver, an unverified figure. Slate is "no aislado". The cyan
//    accent means INTERACTIVE STATE only -- selected, active, focused -- and is
//    never allowed to carry data. That is the whole palette; the loose #ffb877
//    and the rose stop-button are gone.
//
// 2. FOUR TYPE SIZES: 14px for a test name, 13px for prose, 11px for metadata
//    and every number (mono, tabular). Nothing smaller ships -- an 8px legend on
//    a clinical figure is decoration pretending to be information.
//
// 3. NO BOX INSIDE A BOX. The panel is one instrument surface. Everything within
//    is separated by hairlines and space. No nested rounded cards, no gradients.
//
// 4. SAY IT ONCE. Utility used to be encoded three times per row (edge bar,
//    dot, word). The edge bar and the word remain; the dot is gone.
//
// 5. THE 3D MANEUVER IS THE HEADLINE FEATURE, so it is reachable from the
//    COLLAPSED row. It used to be a small button buried under the metrics of an
//    expanded card, which is the last place a new user looks.
//
// LAYOUT: a full-height right-side sheet (fills its column, so little scrolling).
// Data: src/data/orthopedicTests. Type: OrthopedicTest. UI Spanish LATAM; code
// ASCII.

import { useEffect, useMemo, useRef, useState } from 'react';
import { testsForRegion } from '../../data/orthopedicTests';
import type {
  OrthopedicTest,
  TestUtility,
  DiagnosticMetrics,
} from '../../types/orthopedicTest';
import { getReference, formatReference, type ReferenceId } from '../../data/references';
import { rigChannel } from './RigModel';
import { demoChannel, useActiveDemo } from './demoChannel';
import { EVENTS, track } from '../../lib/analytics';
import { SaveButton } from '../SaveButton';
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  PlayIcon,
  StopIcon,
} from '../ui/Icons';

/** Namespace for this panel's demo ids on the shared demoChannel. */
const DEMO_NS = 'test:';

/**
 * Utility, as an edge rule + one word. See design rule 1: sky descarta, emerald
 * confirma, amber balanced, slate weak. The tooltip carries the teaching rule.
 */
const UTILITY: Record<
  TestUtility,
  { word: string; text: string; bar: string; tip: string }
> = {
  'rule-in': {
    word: 'Confirma',
    text: 'text-emerald-300',
    bar: 'border-emerald-400/70',
    tip: 'Alta especificidad (SpPin): un positivo confirma.',
  },
  'rule-out': {
    word: 'Descarta',
    text: 'text-sky-300',
    bar: 'border-sky-400/70',
    tip: 'Alta sensibilidad (SnNout): un negativo descarta.',
  },
  balanced: {
    word: 'Equilibrado',
    text: 'text-amber-300',
    bar: 'border-amber-400/70',
    tip: 'Sensibilidad y especificidad parecidas.',
  },
  weak: {
    word: 'En conjunto',
    text: 'text-slate-400',
    bar: 'border-slate-600/70',
    tip: 'Poca precisión aislado: úsalo dentro de un grupo de tests.',
  },
};

// ---------------------------------------------------------------------------
// Bayes / likelihood-ratio math.
// ---------------------------------------------------------------------------
function lrPosNum(m: DiagnosticMetrics): number | null {
  if (m.lrPositive != null) return m.lrPositive;
  if (m.sensitivity == null || m.specificity == null) return null;
  if (m.specificity >= 100) return Infinity;
  return (m.sensitivity / 100) / (1 - m.specificity / 100);
}
function lrNegNum(m: DiagnosticMetrics): number | null {
  if (m.lrNegative != null) return m.lrNegative;
  if (m.sensitivity == null || m.specificity == null || m.specificity === 0) return null;
  return (1 - m.sensitivity / 100) / (m.specificity / 100);
}
function postProb(prePct: number, lr: number): number {
  if (!isFinite(lr)) return 100;
  const pre = Math.min(99.9, Math.max(0.1, prePct)) / 100;
  const odds = pre / (1 - pre);
  const post = odds * lr;
  return (post / (1 + post)) * 100;
}
function lrLabel(lr: number | null, dp = 1): string {
  if (lr == null) return 's/d';
  if (!isFinite(lr)) return '∞';
  return lr.toFixed(dp);
}

// ---------------------------------------------------------------------------
// EXAM MODE: hide the metrics, the user predicts, then reveals. Turns the panel
// from a lookup table into a reasoning drill (SnNout / SpPin). A value >= 70% is
// treated as "alta" for grading the prediction (a common teaching cutoff; the
// real number is always shown on reveal so the nuance isn't lost).
// ---------------------------------------------------------------------------
const ALTA_THRESHOLD = 70;
type Level = 'alta' | 'baja';
/** A user's guess for one test before revealing (per axis + reveal flag). */
interface Prediction {
  sens: Level | null;
  espec: Level | null;
  revealed: boolean;
}
const EMPTY_PREDICTION: Prediction = { sens: null, espec: null, revealed: false };
/** Bucket a percentage into alta/baja (undefined stays undefined = "sin dato"). */
function levelOf(value: number | undefined): Level | undefined {
  if (value == null) return undefined;
  return value >= ALTA_THRESHOLD ? 'alta' : 'baja';
}

// ---------------------------------------------------------------------------
// Small presentational pieces.
// ---------------------------------------------------------------------------

/** A micro caption. One component, so the size and colour cannot drift. */
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
      {children}
    </span>
  );
}

/** One slim labelled 0..100 metric bar (sensibilidad / especificidad). */
function MetricBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number | undefined;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[5.5rem] shrink-0 text-[11px] text-slate-400">{label}</span>
      <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${color}`}
          style={{ width: `${value ?? 0}%` }}
        />
      </span>
      <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-300">
        {value != null ? `${value}%` : 's/d'}
      </span>
    </div>
  );
}

/** A labelled block of prose in the expanded detail (no card chrome). */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Kicker>{label}</Kicker>
      <p className="mt-0.5 text-[13px] leading-relaxed text-slate-300">{children}</p>
    </div>
  );
}

/**
 * Fagan reasoning: pretest -> posttest for a positive / negative result.
 * Drawn as two labelled readings on a hairline-separated block rather than a
 * tinted card, and the arrow states the actual transition (30% -> 68%) because
 * that difference IS the clinical point of the test.
 */
function FaganBlock({ metrics, pretest }: { metrics: DiagnosticMetrics; pretest: number }) {
  const lrPos = lrPosNum(metrics);
  const lrNeg = lrNegNum(metrics);
  const postPos = lrPos != null ? postProb(pretest, lrPos) : null;
  const postNeg = lrNeg != null ? postProb(pretest, lrNeg) : null;
  return (
    <div className="border-t border-slate-800/70 pt-2.5">
      <Kicker>Probabilidad post-test</Kicker>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <FaganResult
          title="Si sale positivo"
          pretest={pretest}
          value={postPos}
          lr={`LR+ ${lrLabel(lrPos)}`}
          tone="emerald"
        />
        <FaganResult
          title="Si sale negativo"
          pretest={pretest}
          value={postNeg}
          lr={`LR− ${lrLabel(lrNeg, 2)}`}
          tone="sky"
        />
      </div>
    </div>
  );
}

function FaganResult({
  title,
  pretest,
  value,
  lr,
  tone,
}: {
  title: string;
  pretest: number;
  value: number | null;
  lr: string;
  tone: 'emerald' | 'sky';
}) {
  const text = tone === 'emerald' ? 'text-emerald-300' : 'text-sky-300';
  const bar = tone === 'emerald' ? 'bg-emerald-400' : 'bg-sky-400';
  return (
    <div>
      <span className="block text-[11px] text-slate-400">{title}</span>
      <span className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums">
        <span className="text-[11px] text-slate-500">{Math.round(pretest)}%</span>
        <span className="text-[11px] text-slate-600">→</span>
        <span className={`text-lg font-semibold leading-none ${text}`}>
          {value != null ? `${Math.round(value)}%` : 's/d'}
        </span>
      </span>
      <span className="mt-1.5 flex h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <span className={`h-full rounded-full ${bar}`} style={{ width: `${value ?? 0}%` }} />
      </span>
      <span className="mt-1 block font-mono text-[11px] text-slate-500">{lr}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exam-mode prediction block: two alta/baja choices (sensibilidad, especificidad)
// and a Revelar button; after revealing, per-axis feedback. Shown INSTEAD of the
// metric bars while unrevealed, so the user commits before seeing the numbers.
// ---------------------------------------------------------------------------
function LevelChoice({
  label,
  picked,
  onPick,
}: {
  label: string;
  picked: Level | null;
  onPick: (l: Level) => void;
}) {
  const btn = (l: Level, text: string) => (
    <button
      type="button"
      onClick={() => onPick(l)}
      className={`flex-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
        picked === l
          ? 'border-accent/50 bg-accent/10 text-accent'
          : 'border-slate-700 text-slate-400 hover:text-slate-200'
      }`}
    >
      {text}
    </button>
  );
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[5.5rem] shrink-0 text-[11px] text-slate-400">{label}</span>
      <div className="flex flex-1 gap-1.5">
        {btn('alta', 'Alta')}
        {btn('baja', 'Baja')}
      </div>
    </div>
  );
}

/** Per-axis reveal feedback: your guess vs. the real bucket + the number. */
/**
 * What a sensitivity / specificity figure MEANS for the patient in front of you.
 *
 * The panel showed the two numbers and the SpPin / SnNout mnemonics and assumed
 * the rest. A physio reviewing it wrote "no está muy entendible lo de
 * especificidad y sensibilidad" -- fair: a percentage with a Latin mnemonic next
 * to it explains nothing about what the test just told you. These sentences use
 * THIS test's own figure and count the people it gets wrong, which is the half
 * that decides whether you can act on the result.
 */
export function metricMeaning(axis: 'sens' | 'espec', value: number | undefined): string | null {
  if (value == null || !isFinite(value)) return null;
  const hit = Math.round(value);
  const miss = 100 - hit;
  return axis === 'sens'
    ? `De cada 100 personas que SÍ tienen la lesión, da positivo en ${hit}. ` +
      `A ${miss} se le escapan.`
    : `De cada 100 personas que NO la tienen, da negativo en ${hit}. ` +
      `${miss} dan un falso positivo.`;
}

function AxisResult({
  label,
  axis,
  guess,
  actual,
  value,
}: {
  label: string;
  axis: 'sens' | 'espec';
  guess: Level | null;
  actual: Level | undefined;
  value: number | undefined;
}) {
  if (actual === undefined) {
    return (
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-500">sin dato reportado</span>
      </div>
    );
  }
  const ok = guess === actual;
  const meaning = metricMeaning(axis, value);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className={ok ? 'text-emerald-300' : 'text-amber-300'}>
            {ok ? <CheckIcon size={12} /> : <CloseIcon size={12} />}
          </span>
          <span className="font-mono tabular-nums text-slate-200">
            {value}% ({actual})
          </span>
        </span>
      </div>
      {meaning && (
        <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{meaning}</p>
      )}
    </div>
  );
}

function ExamBlock({
  test,
  prediction,
  onPredict,
  onReveal,
}: {
  test: OrthopedicTest;
  prediction: Prediction;
  onPredict: (axis: 'sens' | 'espec', level: Level) => void;
  onReveal: () => void;
}) {
  const sensActual = levelOf(test.metrics.sensitivity);
  const especActual = levelOf(test.metrics.specificity);
  const hasSens = sensActual !== undefined;
  const hasEspec = especActual !== undefined;
  const u = UTILITY[test.utility];

  if (prediction.revealed) {
    const sensOk = !hasSens || prediction.sens === sensActual;
    const especOk = !hasEspec || prediction.espec === especActual;
    const bothOk = sensOk && especOk;
    return (
      <div className="border-t border-slate-800/70 pt-2.5">
        <div className="flex items-center justify-between">
          <Kicker>Tu predicción</Kicker>
          <span
            className={`text-[11px] font-medium ${
              bothOk ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {bothOk ? 'Bien razonado' : 'Revisa el perfil'}
          </span>
        </div>
        <div className="mt-1.5 space-y-1">
          <AxisResult
            label="Sensibilidad"
            axis="sens"
            guess={prediction.sens}
            actual={sensActual}
            value={test.metrics.sensitivity}
          />
          <AxisResult
            label="Especificidad"
            axis="espec"
            guess={prediction.espec}
            actual={especActual}
            value={test.metrics.specificity}
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          <span className={u.text}>Uso: {u.word}.</span> {u.tip}
        </p>
      </div>
    );
  }

  const canReveal =
    (!hasSens || prediction.sens != null) && (!hasEspec || prediction.espec != null);
  return (
    <div className="border-t border-slate-800/70 pt-2.5">
      <Kicker>Predice antes de ver los números</Kicker>
      <div className="mt-2 space-y-1.5">
        {hasSens ? (
          <LevelChoice
            label="Sensibilidad"
            picked={prediction.sens}
            onPick={(l) => onPredict('sens', l)}
          />
        ) : (
          <p className="text-[11px] text-slate-500">Esta prueba no reporta sensibilidad.</p>
        )}
        {hasEspec ? (
          <LevelChoice
            label="Especificidad"
            picked={prediction.espec}
            onPick={(l) => onPredict('espec', l)}
          />
        ) : (
          <p className="text-[11px] text-slate-500">Esta prueba no reporta especificidad.</p>
        )}
      </div>
      <button
        type="button"
        onClick={onReveal}
        disabled={!canReveal}
        className="mt-2.5 w-full rounded border border-accent/40 px-2.5 py-1.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600 disabled:hover:bg-transparent"
      >
        Revelar
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "How to use" guide (probabilities + Fagan). Shown once, re-openable.
// ---------------------------------------------------------------------------
const HELP_KEY = 'anatris.testsHelp.v1';
function readHelpSeen(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(HELP_KEY) === '1';
  } catch {
    return false;
  }
}
function writeHelpSeen(): void {
  try {
    window.localStorage.setItem(HELP_KEY, '1');
  } catch {
    /* storage unavailable: guide reappears next session */
  }
}

function HelpStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="w-4 shrink-0 font-mono text-[11px] tabular-nums text-slate-600">
        {n}
      </span>
      <span className="text-[13px] leading-relaxed text-slate-300">{children}</span>
    </li>
  );
}

function HelpCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="border-b border-slate-800/70 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <Kicker>Cómo leer estos tests</Kicker>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] text-slate-400 transition-colors hover:text-slate-100"
        >
          Entendido
        </button>
      </div>
      <ol className="mt-2.5 space-y-2">
        <HelpStep n={1}>
          Ajusta la <span className="text-slate-100">probabilidad pre-test</span>: que
          tan probable crees la lesión antes de explorar.
        </HelpStep>
        <HelpStep n={2}>
          Cada prueba trae <span className="text-sky-300">sensibilidad</span> y{' '}
          <span className="text-emerald-300">especificidad</span>. Un negativo descarta
          cuando la sensibilidad es alta; un positivo confirma cuando la especificidad
          lo es.
        </HelpStep>
        <HelpStep n={3}>
          Cada fila muestra a cuanto sube tu sospecha si esa prueba sale positiva. Al
          abrirla verás también el caso negativo.
        </HelpStep>
        <HelpStep n={4}>
          <span className="text-slate-100">Combinar</span> suma varias pruebas y calcula
          la certeza si todas resultan positivas.
        </HelpStep>
        <HelpStep n={5}>
          <span className="text-accent">Demostrar</span> reproduce la maniobra sobre el
          modelo 3D y resalta la estructura evaluada.
        </HelpStep>
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One test: a COMPACT row that expands to the full detail.
// ---------------------------------------------------------------------------
function TestRow({
  test,
  expanded,
  onToggle,
  pretest,
  clusterMode,
  selected,
  onToggleSelect,
  demoing,
  onDemo,
  examMode,
  prediction,
  onPredict,
  onReveal,
}: {
  test: OrthopedicTest;
  expanded: boolean;
  onToggle: () => void;
  pretest: number;
  clusterMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  demoing: boolean;
  onDemo: () => void;
  examMode: boolean;
  prediction: Prediction;
  onPredict: (axis: 'sens' | 'espec', level: Level) => void;
  onReveal: () => void;
}) {
  const u = UTILITY[test.utility];
  const lrPos = lrPosNum(test.metrics);
  const lrNeg = lrNegNum(test.metrics);
  const derived = test.metrics.lrPositive == null;
  const sens = test.metrics.sensitivity;
  const espec = test.metrics.specificity;
  // In exam mode the numbers stay hidden until the user reveals their prediction.
  const hideMetrics = examMode && !prediction.revealed;
  // The headline number of the whole panel: where this test leaves you if it is
  // positive, from the pretest currently on the slider.
  const postPos = lrPos != null ? postProb(pretest, lrPos) : null;

  return (
    <div
      className={`border-l-2 transition-colors ${u.bar} ${
        selected ? 'bg-accent/[0.06]' : expanded ? 'bg-slate-800/20' : 'hover:bg-slate-800/20'
      }`}
    >
      <div className="flex items-center gap-2 py-2 pl-3 pr-2">
        {clusterMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Añadir ${test.name} al conjunto`}
            className="accent-accent"
          />
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 flex-col text-left"
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium text-slate-100">{test.name}</span>
            <span
              className={`shrink-0 text-[11px] ${hideMetrics ? 'text-slate-600' : u.text}`}
              title={hideMetrics ? 'Predice el uso antes de revelar' : u.tip}
            >
              {hideMetrics ? '?' : u.word}
            </span>
          </span>

          <span className="mt-1 flex items-center gap-2 truncate text-[11px] text-slate-500">
            <span className="truncate">{test.target}</span>
            {test.demo?.resisted && (
              <span className="shrink-0 text-amber-400/90">Resistido</span>
            )}
          </span>

          {/* The pretest -> posttest transition, on every row. This is what turns
              the list from a reference table into a decision aid: the slider at
              the top visibly moves every test at once. */}
          {!hideMetrics && (
            <span className="mt-1 flex items-center gap-3 font-mono text-[11px] tabular-nums">
              {postPos != null ? (
                <span className="flex items-baseline gap-1">
                  <span className="text-slate-600">{Math.round(pretest)}</span>
                  <span className="text-slate-700">→</span>
                  <span className="font-semibold text-emerald-300">
                    {Math.round(postPos)}%
                  </span>
                  <span className="ml-0.5 text-slate-600">si +</span>
                </span>
              ) : (
                <span className="text-slate-600">sin LR</span>
              )}
              <span className="text-sky-300/80">Se {sens ?? 's/d'}</span>
              <span className="text-emerald-300/80">Es {espec ?? 's/d'}</span>
            </span>
          )}
        </button>

        {/* Save to "Mi colección" — reachable without expanding, because the
            moment you decide a test matters to you is while scanning the list,
            not after reading the whole card. */}
        <SaveButton kind="test" region={test.region} id={test.id} label={test.name} size="sm" />

        {/* Star action, reachable without expanding. */}
        {test.demo && (
          <button
            type="button"
            onClick={onDemo}
            aria-label={demoing ? `Detener ${test.name}` : `Demostrar ${test.name} en el modelo`}
            title={demoing ? 'Detener la maniobra' : 'Reproducir la maniobra en el modelo 3D'}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
              demoing
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-slate-700 text-slate-400 hover:border-accent/60 hover:text-accent'
            }`}
          >
            {demoing ? <StopIcon size={12} /> : <PlayIcon size={12} />}
          </button>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? `Cerrar ${test.name}` : `Abrir ${test.name}`}
          className="shrink-0 p-1 text-slate-600 transition-colors hover:text-slate-300"
        >
          <ChevronDownIcon
            size={13}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pb-4 pl-3 pr-2 pt-1">
          {!hideMetrics && (
            <div className="space-y-1.5">
              <MetricBar label="Sensibilidad" value={sens} color="bg-sky-400" />
              <MetricBar label="Especificidad" value={espec} color="bg-emerald-400" />
              <p className="pl-[6.5rem] font-mono text-[11px] text-slate-500">
                LR+ {lrLabel(lrPos)} · LR− {lrLabel(lrNeg, 2)}
                {derived && <span className="ml-1.5 text-slate-600">aprox.</span>}
              </p>
            </div>
          )}
          {hideMetrics && (
            <p className="font-mono text-[11px] text-slate-600">Métricas ocultas</p>
          )}

          {examMode && (
            <ExamBlock
              test={test}
              prediction={prediction}
              onPredict={onPredict}
              onReveal={onReveal}
            />
          )}

          {test.aka && test.aka.length > 0 && (
            <p className="text-[11px] text-slate-500">También: {test.aka.join(', ')}</p>
          )}
          <Detail label="Objetivo">{test.purpose}</Detail>
          <Detail label="Maniobra">{test.maneuver}</Detail>
          <Detail label="Positivo">{test.positive}</Detail>

          {/* RESISTED TESTS. The manual resistance lives here, in the maneuver
              that actually calls for it, rather than as a switch on the free
              movement. Pressing Demostrar shows the same thing on the model:
              the physio's hand opposing the gesture. */}
          {test.demo?.resisted && (
            <div className="border-l-2 border-amber-400/60 pl-3">
              <Kicker>Prueba resistida</Kicker>
              <ol className="mt-1 space-y-1 text-[13px] leading-relaxed text-slate-300">
                <li>1. El paciente sostiene la posición y empuja.</li>
                <li>2. Aplica resistencia en el segmento distal, oponiéndote al movimiento.</li>
              </ol>
              <p className="mt-1 text-[11px] text-slate-500">
                En Demostrar verás la mano del fisio resistiendo sobre el modelo.
              </p>
            </div>
          )}

          {/* Interpretacion reveals the intended use (the exam answer); hold it
              until the prediction is revealed. */}
          {!hideMetrics && <Detail label="Interpretación">{test.interpretation}</Detail>}
          {!hideMetrics && <FaganBlock metrics={test.metrics} pretest={pretest} />}

          {test.demo?.note && (
            <p className="text-[11px] text-slate-500">En el modelo: {test.demo.note}</p>
          )}
          {!hideMetrics && test.metrics.note && (
            <p className="text-[11px] leading-relaxed text-slate-400">{test.metrics.note}</p>
          )}
          {test.pearl && (
            <p className="border-l-2 border-slate-700 pl-3 text-[13px] leading-relaxed text-slate-400">
              {test.pearl}
            </p>
          )}
          <div className="space-y-0.5 pt-0.5">
            {test.cite.map((c) => {
              const ref = getReference(c.ref as ReferenceId);
              if (!ref) return null;
              return (
                <p key={c.ref} className="text-[11px] leading-snug text-slate-500">
                  {formatReference(ref)}
                  {!c.verified && (
                    <span
                      className="ml-1.5 text-amber-500/80"
                      title="Valores por verificar contra la fuente primaria"
                    >
                      por verificar
                    </span>
                  )}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function OrthopedicTestsPanel({
  region,
  open,
  onOpenChange,
  onOpenEvidence,
  bare = false,
}: {
  region: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open the region's full "Evidencia" page (all sources + PubMed links). */
  onOpenEvidence?: () => void;
  /**
   * Render for the compact bottom sheet: no frosted panel, no fixed width, no
   * close button. The sheet's tab bar already frames and dismisses this, so the
   * floating chrome would be a second card inside the first -- and `w-[24rem]`
   * is wider than the phone it is sitting on.
   */
  bare?: boolean;
}) {
  const tests = useMemo(() => testsForRegion(region), [region]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pretest, setPretest] = useState(30);
  const [clusterMode, setClusterMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Filters. A region can carry a couple of dozen maneuvers, and until now the
  // only way to reach one was to scroll and read every name.
  const [query, setQuery] = useState('');
  const [only3d, setOnly3d] = useState(false);
  // The demoChannel arbiter owns which demo (if any) animates the rig. Deriving
  // demoId from it (instead of local state) means a demo started here stops
  // cleanly the moment the console or the neuro panel reclaims the rig.
  const activeDemo = useActiveDemo();
  const demoId = activeDemo?.startsWith(DEMO_NS) ? activeDemo.slice(DEMO_NS.length) : null;
  const [showHelp, setShowHelp] = useState(() => !readHelpSeen());
  // Exam mode: hide metrics, let the user predict per test, then reveal.
  const [examMode, setExamMode] = useState(false);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});

  const dismissHelp = () => {
    setShowHelp(false);
    writeHelpSeen();
  };

  const toggleExam = () => {
    setExamMode((on) => {
      const next = !on;
      // Exam and cluster are mutually exclusive (cluster leaks combined numbers).
      if (next) {
        setClusterMode(false);
        setSelected(new Set());
        track(EVENTS.examModeStarted, { region });
      }
      return next;
    });
  };

  /** Expand/collapse a test card, reporting which test was opened. */
  const toggleTest = (id: string) => {
    setExpandedId((cur) => {
      const next = cur === id ? null : id;
      if (next) track(EVENTS.testOpened, { region, test: next });
      return next;
    });
  };
  const predict = (testId: string, axis: 'sens' | 'espec', level: Level) =>
    setPredictions((cur) => {
      const p = cur[testId] ?? EMPTY_PREDICTION;
      if (p.revealed) return cur;
      return { ...cur, [testId]: { ...p, [axis]: level } };
    });
  const reveal = (testId: string) =>
    setPredictions((cur) => {
      const p = cur[testId] ?? EMPTY_PREDICTION;
      return { ...cur, [testId]: { ...p, revealed: true } };
    });

  // Name, alias and target all match, because a physio looking for "Neer" and a
  // student looking for "supraespinoso" are both looking for the same row.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tests.filter((t) => {
      if (only3d && !t.demo) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.target.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.aka ?? []).some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [tests, query, only3d]);

  const demoCount = useMemo(() => tests.filter((t) => t.demo).length, [tests]);

  const groups = useMemo(() => {
    const map = new Map<string, OrthopedicTest[]>();
    for (const t of visible) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return [...map.entries()];
  }, [visible]);

  const byId = useMemo(() => new Map(tests.map((t) => [t.id, t])), [tests]);

  // Combined post-test if every selected test is positive (product of LR+,
  // assuming conditional independence -- flagged in the UI).
  const cluster = useMemo(() => {
    if (selected.size === 0) return null;
    let lr = 1;
    let known = 0;
    for (const id of selected) {
      const m = byId.get(id)?.metrics;
      if (!m) continue;
      const l = lrPosNum(m);
      if (l == null) continue;
      lr *= isFinite(l) ? l : 1e6;
      known += 1;
    }
    if (known === 0) return null;
    return { count: selected.size, lr, post: postProb(pretest, lr) };
  }, [selected, byId, pretest]);

  const startDemo = (t: OrthopedicTest) => {
    if (t.demo) demoChannel.start(DEMO_NS + t.id);
  };
  const stopDemo = () => demoChannel.stop();

  // ANIMATE the active demo: sweep 0 -> target -> 0 (with holds) so the maneuver
  // is shown MOVING, not snapped. Loops while active; releases on stop/unmount.
  // Honors prefers-reduced-motion (snap to the provocative position).
  const rafRef = useRef(0);
  useEffect(() => {
    if (!demoId) return;
    const test = byId.get(demoId);
    const d = test?.demo;
    if (!test || !d) return;
    const side = d.side ?? 'R';
    const target = d.angleDeg;
    const highlight = d.highlightMuscleId
      ? [{ muscleId: d.highlightMuscleId, role: 'prime-mover' as const, level: 1 }]
      : [];
    // Built ONCE per demo, not per frame: the readout compares it by identity to
    // decide whether anything changed, so a fresh object every frame would defeat
    // the very re-render it is meant to stop.
    const demoInfo = {
      label: test.name,
      targetDeg: target,
      structure: test.target,
      resisted: d.resisted === true,
      note: d.note,
    };
    // ghostSkin: true forces the translucent glass skin for the WHOLE demo, even
    // for tests that glow no muscle, so the body never shows as opaque skin that
    // clips/"se sale" while the joint moves.
    const push = (deg: number) =>
      rigChannel.set({
        movementId: d.movementId,
        side,
        angleDeg: deg,
        highlight,
        showMarkers: false,
        ghostSkin: true,
        // Resisted tests (Jobe, Speed, O'Brien...) show the therapist's hand
        // resisting the movement -- the two-person interaction they really are.
        resistance: d.resisted === true,
        // The joints that make this maneuver itself, held while the base
        // movement sweeps.
        components: d.components,
        // Fixed for the whole demo, so the readout can describe the maneuver
        // instead of recomputing (and flickering) its analysis every frame.
        demo: demoInfo,
      });
    // On stop, RELEASE the channel (only if this demo still owns it): the
    // console reacts by re-pushing its own live state, which restores the pose
    // and clears the demo-only flags (ghostSkin, resistance).
    const release = () => demoChannel.stop(DEMO_NS + demoId);

    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      push(target);
      return release;
    }

    // Claim the rig for this maneuver straight away, before the first animation
    // frame: pressing Demostrar switches the readout to the test immediately
    // instead of after the browser gets round to scheduling a frame.
    push(0);

    // Exam pace, not animation pace. The old 55 deg/s with a 1 s hold swept a
    // 90 deg test in under two seconds, which is faster than the position can
    // be read (and far faster than a physio moves a patient's limb). Half the
    // speed plus a long hold AT the provocative position is what makes the
    // maneuver legible.
    const DPS = 26;
    const HOLD_AT_TARGET_MS = 2800;
    const HOLD_AT_REST_MS = 800;
    let last = 0;
    let dir: 1 | -1 = 1;
    let angle = 0;
    let holdUntil = 0;
    const step = (ts: number) => {
      if (!last) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if (holdUntil) {
        if (ts >= holdUntil) holdUntil = 0;
      } else {
        angle += dir * DPS * dt;
        if (angle >= target) {
          angle = target;
          dir = -1;
          holdUntil = ts + HOLD_AT_TARGET_MS;
        } else if (angle <= 0) {
          angle = 0;
          dir = 1;
          holdUntil = ts + HOLD_AT_REST_MS;
        }
      }
      push(angle);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      release();
    };
  }, [demoId, byId]);

  if (tests.length === 0) return null;

  if (!open && !bare) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="instrument pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:text-white"
      >
        <TestTubeIcon />
        Tests ortopédicos
        <span className="font-mono text-[11px] tabular-nums text-slate-400">
          {tests.length}
        </span>
      </button>
    );
  }

  return (
    <div
      className={
        bare
          ? 'flex min-h-0 w-full flex-1 flex-col'
          : 'instrument pointer-events-auto flex min-h-0 w-[24rem] max-w-[calc(100vw-2rem)] flex-1 flex-col overflow-hidden'
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/70 px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold text-slate-50">
            <TestTubeIcon />
            Tests ortopédicos
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {examMode
              ? 'Modo examen: predice el perfil y revela'
              : `${tests.length} pruebas, ${demoCount} con maniobra en 3D`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <HeaderToggle active={examMode} onClick={toggleExam} label="Examen" title="Oculta los números: predice el perfil de cada test y revélalo">
            <ExamIcon />
          </HeaderToggle>
          <HeaderToggle active={showHelp} onClick={() => setShowHelp((s) => !s)} label="Guía" title="Cómo se usa este panel">
            <InfoIcon />
          </HeaderToggle>
          {!bare && (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar tests"
              className="-mr-1 rounded p-1.5 text-slate-500 transition-colors hover:text-slate-200"
            >
              <CloseIcon size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Pretest slider: the control every number in the list answers to. */}
      <div className="border-b border-slate-800/70 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <Kicker>Probabilidad pre-test</Kicker>
          <span className="font-mono text-base font-semibold tabular-nums text-slate-100">
            {Math.round(pretest)}%
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={99}
          step={1}
          value={pretest}
          onChange={(e) => setPretest(Number(e.target.value))}
          aria-label="Probabilidad pre-test"
          className="mt-2 w-full accent-accent"
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500">
            Tu sospecha antes de explorar.
          </span>
          {!examMode && (
            <button
              type="button"
              onClick={() => {
                setClusterMode((c) => !c);
                setSelected(new Set());
              }}
              className={`flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                clusterMode
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {clusterMode && <CheckIcon size={10} />}
              Combinar
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-slate-800/70 px-4 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar prueba, estructura o grupo"
          aria-label="Buscar prueba"
          className="min-w-0 flex-1 rounded border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-[13px] text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-accent/60"
        />
        <button
          type="button"
          onClick={() => setOnly3d((v) => !v)}
          aria-pressed={only3d}
          title="Mostrar solo las pruebas con maniobra en el modelo 3D"
          className={`flex shrink-0 items-center gap-1.5 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors ${
            only3d
              ? 'border-accent/50 bg-accent/10 text-accent'
              : 'border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <PlayIcon size={10} />
          3D
        </button>
      </div>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {showHelp && <HelpCard onDismiss={dismissHelp} />}

        {groups.length === 0 && (
          <p className="px-4 py-6 text-center text-[13px] text-slate-500">
            Ninguna prueba coincide con el filtro.
          </p>
        )}

        {groups.map(([category, list]) => (
          <section key={category} className="pt-3">
            <div className="mb-1 flex items-center gap-2 px-4">
              <h3 className="text-[11px] uppercase tracking-[0.08em] text-slate-400">
                {category}
              </h3>
              <span className="h-px flex-1 bg-slate-800/70" />
              <span className="font-mono text-[11px] tabular-nums text-slate-600">
                {list.length}
              </span>
            </div>
            <div className="pl-2 pr-1">
              {list.map((t) => (
                <TestRow
                  key={t.id}
                  test={t}
                  expanded={expandedId === t.id}
                  onToggle={() => toggleTest(t.id)}
                  pretest={pretest}
                  clusterMode={clusterMode}
                  selected={selected.has(t.id)}
                  onToggleSelect={() =>
                    setSelected((cur) => {
                      const next = new Set(cur);
                      if (next.has(t.id)) next.delete(t.id);
                      else next.add(t.id);
                      return next;
                    })
                  }
                  demoing={demoId === t.id}
                  onDemo={() => (demoId === t.id ? stopDemo() : startDemo(t))}
                  examMode={examMode}
                  prediction={predictions[t.id] ?? EMPTY_PREDICTION}
                  onPredict={(axis, level) => predict(t.id, axis, level)}
                  onReveal={() => reveal(t.id)}
                />
              ))}
            </div>
          </section>
        ))}

        <div className="px-4 py-4">
          {onOpenEvidence && (
            <button
              type="button"
              onClick={onOpenEvidence}
              className="mb-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-accent transition-opacity hover:opacity-80"
            >
              <BookIcon />
              Ver toda la evidencia
            </button>
          )}
          <p className="text-[11px] leading-relaxed text-slate-600">
            Valores orientativos de la literatura, por verificar contra la fuente
            primaria. Interpreta cada prueba dentro del cuadro clínico y en conjunto,
            no de forma aislada.
          </p>
        </div>
      </div>

      {/* Combined result (only when combining with a selection). */}
      {clusterMode && cluster && (
        <div className="border-t border-slate-800/70 px-4 py-3">
          <div className="flex items-baseline justify-between">
            <Kicker>
              {cluster.count} prueba{cluster.count > 1 ? 's' : ''} positiva
              {cluster.count > 1 ? 's' : ''} a la vez
            </Kicker>
            <span className="flex items-baseline gap-1.5 font-mono tabular-nums">
              <span className="text-[11px] text-slate-500">{Math.round(pretest)}%</span>
              <span className="text-[11px] text-slate-600">→</span>
              <span className="text-lg font-semibold leading-none text-emerald-300">
                {Math.round(cluster.post)}%
              </span>
            </span>
          </div>
          <span className="mt-2 flex h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <span
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${cluster.post}%` }}
            />
          </span>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
            LR+ combinado {lrLabel(cluster.lr)}. Asume independencia entre pruebas: es
            una aproximación docente, no un valor de estudio.
          </p>
        </div>
      )}
    </div>
  );
}

/** Header segmented toggle. One component so the two never drift apart. */
function HeaderToggle({
  active,
  onClick,
  label,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={title}
      className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
        active
          ? 'border-accent/50 bg-accent/10 text-accent'
          : 'border-slate-700 text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
      {label}
    </button>
  );
}

function TestTubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 3h6M10 3v13a2.5 2.5 0 0 0 5 0V3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 10h5" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 3v14" strokeLinecap="round" />
    </svg>
  );
}

function ExamIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 5.5a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3.5V9h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 14.5l2 2 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
