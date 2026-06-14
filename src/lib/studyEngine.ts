// src/lib/studyEngine.ts
//
// Study-module engine. PURE, data-driven generation of study material from the
// existing clinical muscle data — no new content is authored here. Every quiz
// question and flashcard is derived from the `Muscle` records a region already
// ships (name, latin, origin, insertion, innervation, roots, actions, groups),
// so adding a region to MUSCLES_BY_REGION automatically gives it a quiz and a
// deck for free.
//
// Design notes
// ------------
// - Everything is deterministic given its inputs EXCEPT the shuffling, which
//   uses Math.random. Quiz sessions want fresh order each run, so that's fine;
//   the pure builders below return the full pool and the UI samples from it.
// - A multiple-choice question is only emitted when we can find enough DISTINCT
//   distractors (wrong options) in the region. Small regions degrade gracefully
//   to 3 options instead of 4 rather than producing a broken question.
// - All user-facing prose is Latin American Spanish, matching the rest of the
//   app; ids/keys stay ASCII.

import type { Muscle } from '../types/muscle';
import { FUNCTIONAL_GROUP_LABEL } from '../types/muscle';

/* ===========================================================================
 * TYPES
 * ======================================================================== */

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

/** Which muscle attribute a question is testing (for analytics / theming). */
export type QuizKind =
  | 'latin'
  | 'origin'
  | 'insertion'
  | 'innervation'
  | 'roots'
  | 'action'
  | 'group';

export interface QuizQuestion {
  id: string;
  kind: QuizKind;
  /** The muscle the question is about (for context chips). */
  subject: string;
  /** Full prompt shown to the student. */
  prompt: string;
  /** Options in random order; exactly one has `correct: true`. */
  options: QuizOption[];
}

export interface FlashcardFact {
  label: string;
  value: string;
}

export interface Flashcard {
  id: string;
  /** Front of the card (the cue). */
  front: string;
  /** Secondary cue, e.g. the Latin name. */
  sub?: string;
  /** Back of the card: the facts to recall. */
  facts: FlashcardFact[];
}

/* ===========================================================================
 * SMALL PURE HELPERS
 * ======================================================================== */

/** Fisher-Yates shuffle returning a new array (does not mutate input). */
export function shuffle<T>(input: readonly T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Pick up to `n` distinct distractor strings from `pool` that differ from
 * `correct` (case/whitespace-insensitive) and from each other. Returns fewer
 * than `n` when the pool is too small; callers decide whether that's enough.
 */
function pickDistractors(correct: string, pool: string[], n: number): string[] {
  const seen = new Set<string>([norm(correct)]);
  const out: string[] = [];
  for (const candidate of shuffle(pool)) {
    const key = norm(candidate);
    if (!candidate || seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
    if (out.length === n) break;
  }
  return out;
}

/**
 * Assemble a multiple-choice question from one correct answer plus a pool of
 * candidate wrong answers. Returns null when fewer than 2 distractors exist
 * (a 2-option MCQ is too easy to be worth showing).
 */
function makeQuestion(
  id: string,
  kind: QuizKind,
  subject: string,
  prompt: string,
  correct: string,
  distractorPool: string[],
): QuizQuestion | null {
  const distractors = pickDistractors(correct, distractorPool, 3);
  if (distractors.length < 2) return null;
  const options: QuizOption[] = shuffle([
    { id: `${id}-c`, text: correct, correct: true },
    ...distractors.map((text, i) => ({ id: `${id}-d${i}`, text, correct: false })),
  ]);
  return { id, kind, subject, prompt, options };
}

/** First action of a muscle rendered as "Movimiento (Articulación)". */
function primaryAction(m: Muscle): string | null {
  const a = m.actions[0];
  return a ? `${a.movement} (${a.joint})` : null;
}

/** Functional-group labels of a muscle, Spanish. */
function groupLabels(m: Muscle): string[] {
  return m.groups.map((g) => FUNCTIONAL_GROUP_LABEL[g]);
}

/* ===========================================================================
 * QUIZ BUILDER
 * ======================================================================== */

/**
 * Build every quiz question derivable from a region's muscles. The UI samples
 * a session (e.g. 10 questions) from this pool. Questions that can't gather
 * enough distractors are silently dropped.
 */
export function buildQuizQuestions(muscles: Muscle[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  // Pre-compute candidate pools once.
  const latins = muscles.map((m) => m.latin);
  const origins = muscles.map((m) => m.origin);
  const insertions = muscles.map((m) => m.insertion);
  const innervations = muscles.map((m) => m.innervation);
  const rootStrings = muscles.map((m) => m.roots.join('–')).filter(Boolean);
  const actionStrings = muscles
    .map(primaryAction)
    .filter((x): x is string => x != null);
  const allGroupLabels = Array.from(
    new Set(muscles.flatMap(groupLabels)),
  );

  for (const m of muscles) {
    // 1. Latin name.
    push(
      makeQuestion(
        `${m.id}-latin`,
        'latin',
        m.name,
        `¿Cuál es el nombre anatómico (en latín) del ${m.name}?`,
        m.latin,
        latins,
      ),
    );

    // 2. Origin.
    push(
      makeQuestion(
        `${m.id}-origin`,
        'origin',
        m.name,
        `¿Cuál es el origen del ${m.name}?`,
        m.origin,
        origins,
      ),
    );

    // 3. Insertion.
    push(
      makeQuestion(
        `${m.id}-insertion`,
        'insertion',
        m.name,
        `¿Cuál es la inserción del ${m.name}?`,
        m.insertion,
        insertions,
      ),
    );

    // 4. Innervation.
    push(
      makeQuestion(
        `${m.id}-innervation`,
        'innervation',
        m.name,
        `¿Qué nervio inerva el ${m.name}?`,
        m.innervation,
        innervations,
      ),
    );

    // 5. Spinal roots.
    const roots = m.roots.join('–');
    if (roots) {
      push(
        makeQuestion(
          `${m.id}-roots`,
          'roots',
          m.name,
          `¿Qué raíces nerviosas corresponden al ${m.name}?`,
          roots,
          rootStrings,
        ),
      );
    }

    // 6. Primary action.
    const action = primaryAction(m);
    if (action) {
      push(
        makeQuestion(
          `${m.id}-action`,
          'action',
          m.name,
          `¿Cuál es una acción principal del ${m.name}?`,
          action,
          actionStrings,
        ),
      );
    }

    // 7. Functional group. Distractors must be groups this muscle does NOT
    // belong to, so a muscle in several groups never has a "wrong" option that
    // is actually correct.
    const myGroups = new Set(groupLabels(m));
    const correctGroup = groupLabels(m)[0];
    if (correctGroup) {
      const wrongGroups = allGroupLabels.filter((g) => !myGroups.has(g));
      push(
        makeQuestion(
          `${m.id}-group`,
          'group',
          m.name,
          `¿A qué grupo funcional pertenece el ${m.name}?`,
          correctGroup,
          wrongGroups,
        ),
      );
    }
  }

  return questions;

  function push(q: QuizQuestion | null) {
    if (q) questions.push(q);
  }
}

/* ===========================================================================
 * FLASHCARD BUILDER
 * ======================================================================== */

/** Build one recall flashcard per muscle from its clinical record. */
export function buildFlashcards(muscles: Muscle[]): Flashcard[] {
  return muscles.map((m) => {
    const facts: FlashcardFact[] = [
      { label: 'Latín', value: m.latin },
      { label: 'Origen', value: m.origin },
      { label: 'Inserción', value: m.insertion },
      {
        label: 'Inervación',
        value: m.roots.length
          ? `${m.innervation} (${m.roots.join('–')})`
          : m.innervation,
      },
    ];
    if (m.actions.length) {
      facts.push({
        label: 'Acciones',
        value: m.actions.map((a) => `${a.movement} (${a.joint})`).join(' · '),
      });
    }
    if (m.clinicalNote) {
      facts.push({ label: 'Nota clínica', value: m.clinicalNote });
    }
    return { id: m.id, front: m.name, sub: m.latin, facts };
  });
}
