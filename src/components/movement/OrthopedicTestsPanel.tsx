// src/components/movement/OrthopedicTestsPanel.tsx
//
// Biomechanics-lab panel: ORTHOPEDIC SPECIAL TESTS for the active region. Beyond
// listing maneuver + metrics + study, it adds three premium functions the usual
// test-list apps do not have:
//
//   1. DEMOSTRAR EN EL MODELO: a test drives the 3D rig THROUGH its provocative
//      maneuver (animated sweep) and glows the stressed structure.
//   2. RAZONAMIENTO (FAGAN): a pretest-probability slider + the test's LR update
//      the POST-test probability for a positive/negative result (Bayes).
//   3. CLUSTER: select several tests and see the combined post-test probability
//      if all are positive.
//
// LAYOUT: a full-height right-side sheet (fills its column, so little scrolling)
// with a color-coded, low-chrome list instead of stacked cards. Data:
// src/data/orthopedicTests. Type: OrthopedicTest. UI Spanish LATAM; code ASCII.

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
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  PlayIcon,
  StopIcon,
} from '../ui/Icons';

/** Namespace for this panel's demo ids on the shared demoChannel. */
const DEMO_NS = 'test:';

/** Color-coded utility (accent bar + dot + one word, tooltip carries the rule). */
const UTILITY: Record<
  TestUtility,
  { word: string; dot: string; text: string; bar: string; tip: string }
> = {
  'rule-in': {
    word: 'Confirma',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    bar: 'border-emerald-400/70',
    tip: 'Alta especificidad (SpPin): un positivo confirma.',
  },
  'rule-out': {
    word: 'Descarta',
    dot: 'bg-sky-400',
    text: 'text-sky-300',
    bar: 'border-sky-400/70',
    tip: 'Alta sensibilidad (SnNout): un negativo descarta.',
  },
  balanced: {
    word: 'Equilibrado',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    bar: 'border-amber-400/70',
    tip: 'Sensibilidad y especificidad parecidas.',
  },
  weak: {
    word: 'En conjunto',
    dot: 'bg-slate-400',
    text: 'text-slate-300',
    bar: 'border-slate-500/70',
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
    <div className="flex items-center gap-2">
      <span className="w-11 shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800/80">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${color}`}
          style={{ width: `${value ?? 0}%` }}
        />
      </span>
      <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-300">
        {value != null ? `${value}%` : 's/d'}
      </span>
    </div>
  );
}

/** A labelled block of prose in the expanded detail (no card chrome). */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <p className="text-xs leading-relaxed text-slate-300">{children}</p>
    </div>
  );
}

/** Fagan reasoning: pretest -> posttest for a positive / negative result. */
function FaganBlock({ metrics, pretest }: { metrics: DiagnosticMetrics; pretest: number }) {
  const lrPos = lrPosNum(metrics);
  const lrNeg = lrNegNum(metrics);
  const postPos = lrPos != null ? postProb(pretest, lrPos) : null;
  const postNeg = lrNeg != null ? postProb(pretest, lrNeg) : null;
  return (
    <div className="rounded-lg bg-slate-800/30 px-2.5 py-2">
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-500">
        <span>Probabilidad post-test</span>
        <span className="font-mono text-slate-400">pre {Math.round(pretest)}%</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FaganResult title="Si positivo" value={postPos} lr={`LR+ ${lrLabel(lrPos)}`} up />
        <FaganResult title="Si negativo" value={postNeg} lr={`LR− ${lrLabel(lrNeg, 2)}`} up={false} />
      </div>
    </div>
  );
}

function FaganResult({
  title,
  value,
  lr,
  up,
}: {
  title: string;
  value: number | null;
  lr: string;
  up: boolean;
}) {
  const color = up ? 'text-emerald-300' : 'text-sky-300';
  const bar = up ? 'bg-emerald-400' : 'bg-sky-400';
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] text-slate-500">{title}</span>
        <span className={`font-mono text-base font-bold tabular-nums ${color}`}>
          {value != null ? `${Math.round(value)}%` : 's/d'}
        </span>
      </div>
      <span className="mt-1 flex h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <span className={`h-full rounded-full ${bar}`} style={{ width: `${value ?? 0}%` }} />
      </span>
      <span className="mt-0.5 block font-mono text-[9px] text-slate-500">{lr}</span>
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
  disabled,
}: {
  label: string;
  picked: Level | null;
  onPick: (l: Level) => void;
  disabled: boolean;
}) {
  const btn = (l: Level, text: string) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(l)}
      className={`flex-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
        picked === l
          ? 'border-accent/50 bg-accent/15 text-accent'
          : 'border-slate-700 text-slate-400 hover:bg-slate-800/60 disabled:hover:bg-transparent'
      }`}
    >
      {text}
    </button>
  );
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="flex flex-1 gap-1.5">
        {btn('alta', 'Alta')}
        {btn('baja', 'Baja')}
      </div>
    </div>
  );
}

/** Per-axis reveal feedback: your guess vs. the real bucket + the number. */
function AxisResult({
  label,
  guess,
  actual,
  value,
}: {
  label: string;
  guess: Level | null;
  actual: Level | undefined;
  value: number | undefined;
}) {
  if (actual === undefined) {
    return (
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-500">sin dato reportado</span>
      </div>
    );
  }
  const ok = guess === actual;
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-400">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={ok ? 'text-emerald-300' : 'text-rose-300'}>
          {ok ? <CheckIcon size={12} /> : <CloseIcon size={12} />}
        </span>
        <span className="font-mono tabular-nums text-slate-200">
          {value}% ({actual})
        </span>
      </span>
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
      <div className="rounded-lg bg-slate-800/30 px-2.5 py-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            Tu predicción
          </span>
          <span
            className={`text-[11px] font-semibold ${
              bothOk ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {bothOk ? 'Bien razonado' : 'Revisa el perfil'}
          </span>
        </div>
        <div className="space-y-1">
          <AxisResult
            label="Sensibilidad"
            guess={prediction.sens}
            actual={sensActual}
            value={test.metrics.sensitivity}
          />
          <AxisResult
            label="Especificidad"
            guess={prediction.espec}
            actual={especActual}
            value={test.metrics.specificity}
          />
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px]">
          <span className={`h-1.5 w-1.5 rounded-full ${u.dot}`} />
          <span className={u.text}>Uso: {u.word}.</span>
          <span className="text-slate-500">{u.tip}</span>
        </p>
      </div>
    );
  }

  const canReveal = (!hasSens || prediction.sens != null) && (!hasEspec || prediction.espec != null);
  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-2">
      <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
        Predice antes de ver los números
      </p>
      <div className="space-y-1.5">
        {hasSens ? (
          <LevelChoice
            label="Sens"
            picked={prediction.sens}
            onPick={(l) => onPredict('sens', l)}
            disabled={false}
          />
        ) : (
          <p className="text-[11px] text-slate-500">Esta prueba no reporta sensibilidad.</p>
        )}
        {hasEspec ? (
          <LevelChoice
            label="Espec"
            picked={prediction.espec}
            onPick={(l) => onPredict('espec', l)}
            disabled={false}
          />
        ) : (
          <p className="text-[11px] text-slate-500">Esta prueba no reporta especificidad.</p>
        )}
      </div>
      <button
        type="button"
        onClick={onReveal}
        disabled={!canReveal}
        className="mt-2 w-full rounded-md border border-accent/40 bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-transparent disabled:text-slate-600"
      >
        Revelar
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Premium "how to use" guide (probabilities + Fagan). Shown once, re-openable.
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
    <li className="flex gap-2">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
        {n}
      </span>
      <span className="text-[11px] leading-snug text-slate-300">{children}</span>
    </li>
  );
}

function HelpCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-br from-accent/10 via-slate-900/30 to-slate-900/30">
      <div className="flex items-center justify-between gap-2 border-b border-accent/15 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
          <InfoIcon />
          Cómo leer estos tests
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 transition-colors hover:bg-slate-800"
        >
          Entendido
        </button>
      </div>

      {/* Mini pre -> post visual. */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-col items-center rounded-lg border border-slate-700/70 bg-slate-900/60 px-2.5 py-1.5">
          <span className="text-[9px] uppercase tracking-wide text-slate-500">Pre-test</span>
          <span className="font-mono text-base font-bold tabular-nums text-slate-200">30%</span>
          <span className="text-[8px] text-slate-500">tu sospecha</span>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <ChevronRightIcon size={11} className="text-slate-600" />
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
              Positivo
            </span>
            <ChevronRightIcon size={11} className="text-slate-600" />
            <span className="font-mono text-sm font-bold tabular-nums text-emerald-300">44%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ChevronRightIcon size={11} className="text-slate-600" />
            <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-300">
              Negativo
            </span>
            <ChevronRightIcon size={11} className="text-slate-600" />
            <span className="font-mono text-sm font-bold tabular-nums text-sky-300">17%</span>
          </div>
        </div>
      </div>

      <ol className="space-y-1.5 px-3 pb-2.5">
        <HelpStep n={1}>
          Ajusta la <b className="text-slate-100">probabilidad pre-test</b> con el
          deslizador: qué tan probable crees la lesión antes de explorar.
        </HelpStep>
        <HelpStep n={2}>
          Cada test trae <span className="text-sky-300">sensibilidad</span> y{' '}
          <span className="text-emerald-300">especificidad</span>. Regla práctica:
          un negativo descarta cuando la sensibilidad es alta, un positivo confirma
          cuando la especificidad es alta.
        </HelpStep>
        <HelpStep n={3}>
          Al abrir un test, la <b className="text-slate-100">calculadora de Fagan</b>{' '}
          te muestra la <b className="text-slate-100">probabilidad post-test</b> si
          sale positivo o negativo, partiendo de tu pre-test.
        </HelpStep>
        <HelpStep n={4}>
          <b className="text-slate-100">Conjunto</b>: combina varios tests para ver
          cuánto sube la certeza si todos resultan positivos.
        </HelpStep>
        <HelpStep n={5}>
          <b className="inline-flex items-center gap-1 align-baseline text-accent">
            <PlayIcon size={10} />
            Demostrar
          </b>
          : reproduce la maniobra en el modelo 3D y resalta la estructura evaluada.
        </HelpStep>
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One test: a COMPACT row (accent bar + name + one metric line) that expands to
// the full detail. Compact collapsed height keeps the list scannable; the bars,
// Fagan and demo live in the expanded view.
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
  return (
    <div
      className={`border-l-2 pl-3 pr-1 transition-colors ${u.bar} ${
        selected ? 'bg-accent/5' : expanded ? 'bg-slate-800/25' : 'hover:bg-slate-800/25'
      }`}
    >
      <div className="flex items-center gap-2 py-1.5">
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
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-slate-100">{test.name}</span>
            <span
              className="flex shrink-0 items-center gap-1.5"
              title={hideMetrics ? 'Predice el uso antes de revelar' : u.tip}
            >
              {hideMetrics ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                  <span className="text-[11px] font-medium text-slate-500">?</span>
                </>
              ) : (
                <>
                  <span className={`h-1.5 w-1.5 rounded-full ${u.dot}`} />
                  <span className={`text-[11px] font-medium ${u.text}`}>{u.word}</span>
                </>
              )}
              <ChevronDownIcon
                size={12}
                className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
            <span className="truncate">{test.target}</span>
            <span className="text-slate-700">·</span>
            {hideMetrics ? (
              <span className="shrink-0 font-mono text-slate-600">Se ? · Es ?</span>
            ) : (
              <>
                <span className="shrink-0 font-mono text-sky-300/90">Se {sens ?? 's/d'}</span>
                <span className="shrink-0 font-mono text-emerald-300/90">Es {espec ?? 's/d'}</span>
              </>
            )}
            {/* Resisted marker on the COLLAPSED row: which tests need the physio's
                hand is a property of the list, and hiding it inside the expanded
                detail meant the resisted tests could not be found at all. */}
            {test.demo?.resisted && (
              <span className="shrink-0 font-semibold text-[#ffb877]/90">Resistido</span>
            )}
          </span>
        </button>
      </div>

      {expanded && (
        <div className="space-y-2.5 pb-3 pt-1">
          {/* Full metric bars + demo. Bars/LR hide in exam mode until revealed;
              the demo button never leaks a number, so it stays available. */}
          <div className="space-y-1">
            {!hideMetrics && (
              <>
                <MetricBar label="Sens" value={sens} color="bg-sky-400" />
                <MetricBar label="Espec" value={espec} color="bg-emerald-400" />
              </>
            )}
            <div className="flex items-center justify-between pt-0.5">
              {hideMetrics ? (
                <span className="font-mono text-[10px] text-slate-600">LR oculto</span>
              ) : (
                <span className="font-mono text-[10px] text-slate-500">
                  LR+ {lrLabel(lrPos)} · LR− {lrLabel(lrNeg, 2)}
                  {derived && <span className="ml-1 text-slate-600">aprox.</span>}
                </span>
              )}
              {test.demo && (
                <button
                  type="button"
                  onClick={onDemo}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    demoing
                      ? 'bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/40'
                      : 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/40 hover:bg-accent/25'
                  }`}
                >
                  {demoing ? <StopIcon size={11} /> : <PlayIcon size={11} />}
                  {demoing ? 'Detener' : 'Demostrar'}
                </button>
              )}
            </div>
          </div>

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
            <div className="border-l-2 border-[#ffb877]/70 bg-[#ffb877]/[0.09] py-1.5 pl-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#ffb877]">
                Prueba resistida
              </span>
              <ol className="mt-1 space-y-1 text-[11px] leading-snug text-slate-200">
                <li>1. El paciente sostiene la posición y empuja.</li>
                <li>
                  2. Aplica resistencia en el segmento distal, oponiéndote al movimiento.
                </li>
              </ol>
              <p className="mt-1 text-[10px] text-slate-400">
                En Demostrar verás la mano del fisio resistiendo sobre el modelo.
              </p>
            </div>
          )}
          {/* Interpretación reveals the intended use (the exam answer); hold it
              until the prediction is revealed. */}
          {!hideMetrics && <Detail label="Interpretación">{test.interpretation}</Detail>}

          {!hideMetrics && <FaganBlock metrics={test.metrics} pretest={pretest} />}

          {test.demo?.note && (
            <p className="text-[10px] text-slate-500">En el modelo: {test.demo.note}</p>
          )}
          {!hideMetrics && test.metrics.note && (
            <p className="text-[11px] text-slate-400">{test.metrics.note}</p>
          )}
          {test.pearl && <p className="text-[11px] italic text-slate-400">💡 {test.pearl}</p>}
          <div>
            {test.cite.map((c) => {
              const ref = getReference(c.ref as ReferenceId);
              if (!ref) return null;
              return (
                <p key={c.ref} className="text-[10px] leading-snug text-slate-500">
                  {formatReference(ref)}{' '}
                  {!c.verified && (
                    <span
                      className="text-amber-500/80"
                      title="Valores por verificar contra la fuente primaria"
                    >
                      · por verificar
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
}: {
  region: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open the region's full "Evidencia" page (all sources + PubMed links). */
  onOpenEvidence?: () => void;
}) {
  const tests = useMemo(() => testsForRegion(region), [region]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pretest, setPretest] = useState(30);
  const [clusterMode, setClusterMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  const groups = useMemo(() => {
    const map = new Map<string, OrthopedicTest[]>();
    for (const t of tests) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return [...map.entries()];
  }, [tests]);

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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="instrument pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:text-white"
      >
        <TestTubeIcon />
        Tests ortopédicos
        <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">
          {tests.length}
        </span>
      </button>
    );
  }

  return (
    <div className="instrument pointer-events-auto flex min-h-0 w-[24rem] max-w-[calc(100vw-2rem)] flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/60 px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-slate-50">
            <TestTubeIcon />
            Tests ortopédicos
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {examMode
              ? 'Modo examen: predice el perfil y revela'
              : `${tests.length} pruebas con sensibilidad, especificidad, estudio y modelo 3D`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={toggleExam}
            aria-label="Modo examen"
            aria-pressed={examMode}
            title="Oculta los números: predice el perfil de cada test y revélalo"
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors ${
              examMode
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ExamIcon />
            Examen
          </button>
          <button
            type="button"
            onClick={() => setShowHelp((s) => !s)}
            aria-label="Cómo se usa"
            aria-pressed={showHelp}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors ${
              showHelp
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <InfoIcon />
            Guía
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar tests"
            className="-mr-1 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100/[0.06] hover:text-slate-200"
          >
            <CloseIcon size={15} />
          </button>
        </div>
      </div>

      {/* Pretest slider (drives Fagan + conjunto) */}
      <div className="border-b border-slate-800/60 px-4 py-2.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-500">
          <span>Probabilidad pre-test</span>
          <span className="font-mono text-sm font-bold tabular-nums text-slate-200">
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
          className="mt-1.5 w-full accent-accent"
        />
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            Tu sospecha clínica antes de explorar.
          </span>
          {!examMode && (
            <button
              type="button"
              onClick={() => {
                setClusterMode((c) => !c);
                setSelected(new Set());
              }}
              className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                clusterMode
                  ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/40'
                  : 'text-slate-300 ring-1 ring-inset ring-slate-700 hover:bg-slate-100/[0.06]'
              }`}
            >
              {clusterMode && <CheckIcon size={10} />}
              Combinar
            </button>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {showHelp && (
          <div className="p-3 pb-0">
            <HelpCard onDismiss={dismissHelp} />
          </div>
        )}
        {groups.map(([category, list]) => (
          <section key={category} className="px-3 pt-3">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                {category}
              </h3>
              <span className="h-px flex-1 bg-slate-800/70" />
            </div>
            <div>
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
        <div className="px-4 py-3">
          {onOpenEvidence && (
            <button
              type="button"
              onClick={onOpenEvidence}
              className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              <BookIcon />
              Ver toda la evidencia
            </button>
          )}
          <p className="text-[10px] leading-snug text-slate-600">
            Valores orientativos de la literatura, por verificar contra la fuente
            primaria. Interpreta cada test dentro del cuadro clínico y en conjunto,
            no de forma aislada.
          </p>
        </div>
      </div>

      {/* Combined result (only when combining with a selection). */}
      {clusterMode && cluster && (
        <div className="border-t border-slate-800/60 bg-slate-900/60 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              {cluster.count} test{cluster.count > 1 ? 's' : ''} positivo
              {cluster.count > 1 ? 's' : ''} a la vez
            </span>
            <span className="font-mono text-lg font-bold tabular-nums text-emerald-300">
              {Math.round(cluster.post)}%
            </span>
          </div>
          <span className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <span
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${cluster.post}%` }}
            />
          </span>
          <p className="mt-1 text-[9px] leading-snug text-slate-600">
            Probabilidad post-test si todos resultan positivos (LR+ combinado{' '}
            {lrLabel(cluster.lr)}). Asume independencia entre tests: es una
            aproximación docente, no un valor de estudio.
          </p>
        </div>
      )}
    </div>
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
