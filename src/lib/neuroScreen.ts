// src/lib/neuroScreen.ts
//
// THE SEGMENTAL SCREEN: what the physio records root by root, and the reasoning
// that runs backwards from it to a level. Pure functions, no React.
//
// -----------------------------------------------------------------------------
// WHY THIS EXISTS
// -----------------------------------------------------------------------------
// The neuro panel could show a segmental screen but not TAKE one. Its twin, the
// orthopedic tests panel, reasons: you give it a pretest probability and it gives
// you a posttest one. Neuro listed facts and stopped, which is what every other
// app does, and it is the wrong way round -- a clinician does not look up C7, they
// find a weak triceps and a numb middle finger and ask which level explains both.
//
// So the screen is an INPUT, and this module answers the question it poses.
//
// -----------------------------------------------------------------------------
// WHAT IT WILL AND WILL NOT CLAIM
// -----------------------------------------------------------------------------
// It ranks the authored roots by how much the recorded findings deviate from
// normal, and says how much of the pattern is present. That is a WEIGHT OF
// EVIDENCE over one limb's screen, not a diagnosis, and there is no published
// coefficient behind the weights below -- they encode the ordinary clinical
// reading that a lost reflex counts for more than a merely brisk one and that
// three affected axes at one level beat one. The panel presents it as such.
//
// Three things it refuses to fold into a score, because each one changes what
// should happen next rather than which root it is:
//
//  * HYPERREFLEXIA IS NOT RADICULAR. A root lesion abolishes or damps its
//    reflex; a brisk or clonic one points ABOVE the root, to the cord. Scoring
//    it as segmental evidence would let a myelopathy present itself as a tidy
//    radiculopathy, which is the one mistake this screen exists to prevent.
//  * SEVERAL ROOTS AT ONCE is not a better answer, it is a different question
//    (plexus, peripheral nerve, polyneuropathy, or a progressive lesion).
//  * THE PERIPHERAL MIMIC always survives. Ranking a root does not exclude the
//    nerve that imitates it, so the leading root's mimic is always returned with
//    it and never suppressed by a high score.
//
// ASCII source; Spanish strings are UI text carried by the caller's data.

import type { NerveRoot } from '../types/neuro';

// ---------------------------------------------------------------------------
// THE THREE SCALES
//
// Real clinical scales, not invented ones. A physio already thinks in these
// numbers, and a screen that asked for "leve / moderado / grave" would be asking
// them to translate out of their own vocabulary and back again.
// ---------------------------------------------------------------------------

/** Sensation at the key point, on the ASIA/ISNCSCI 0-2 scale. */
export type SensationGrade = 0 | 1 | 2;

/** Strength of the key movement, on the 0-5 manual muscle test. */
export type StrengthGrade = 0 | 1 | 2 | 3 | 4 | 5;

/** Deep tendon reflex, on the conventional 0-4+ scale. */
export type ReflexGrade = 0 | 1 | 2 | 3 | 4;

// All three scales are authored ASCENDING, worst on the left. For sensation and
// strength that puts normal at the right end; for reflexes it puts NORMAL IN THE
// MIDDLE with hypo to its left and hyper to its right, which is how a reflex
// scale is drawn everywhere and makes 0 and 4 read as the two opposite errors
// they are.
export const SENSATION_SCALE: { value: SensationGrade; label: string; hint: string }[] = [
  { value: 0, label: 'Ausente', hint: '0 · no percibe el estímulo en el punto clave' },
  { value: 1, label: 'Alterada', hint: '1 · presente pero distinta: hipoestesia o disestesia' },
  { value: 2, label: 'Normal', hint: '2 · igual que en la cara: sensibilidad conservada' },
];

export const STRENGTH_SCALE: { value: StrengthGrade; hint: string }[] = [
  { value: 0, hint: '0 · ninguna contracción' },
  { value: 1, hint: '1 · contracción visible o palpable, sin movimiento' },
  { value: 2, hint: '2 · movimiento completo sin gravedad' },
  { value: 3, hint: '3 · vence la gravedad, no la resistencia' },
  { value: 4, hint: '4 · vence resistencia, pero menos de lo normal' },
  { value: 5, hint: '5 · fuerza normal contra resistencia máxima' },
];

export const REFLEX_SCALE: { value: ReflexGrade; hint: string }[] = [
  { value: 0, hint: '0 · abolido' },
  { value: 1, hint: '1 · disminuido' },
  { value: 2, hint: '2 · normal' },
  { value: 3, hint: '3 · aumentado' },
  { value: 4, hint: '4 · clonus' },
];

/** What was recorded for one root. `null` means not examined, which is not normal. */
export interface RootFinding {
  sensation: SensationGrade | null;
  strength: StrengthGrade | null;
  reflex: ReflexGrade | null;
}

export const EMPTY_FINDING: RootFinding = { sensation: null, strength: null, reflex: null };

/** root id -> what was recorded. */
export type NeuroScreenState = Record<string, RootFinding>;

/** True when nothing at all has been recorded, so the readout stays hidden. */
export function isScreenEmpty(screen: NeuroScreenState): boolean {
  return !Object.values(screen).some(
    (f) => f.sensation != null || f.strength != null || f.reflex != null,
  );
}

// ---------------------------------------------------------------------------
// SCORING
// ---------------------------------------------------------------------------

// Deviation weights per axis. Absent beats altered, abolished beats damped, and a
// 3/5 that cannot beat gravity beats a 4/5 that merely gives way. Comparable
// across axes so that one level with two mild findings outranks another with one
// severe -- which is the ordinary reading of a segmental screen.
const SENSATION_WEIGHT: Record<SensationGrade, number> = { 2: 0, 1: 2, 0: 3 };
const STRENGTH_WEIGHT: Record<StrengthGrade, number> = { 5: 0, 4: 2, 3: 3, 2: 4, 1: 4, 0: 4 };
// Grades 3 and 4 score ZERO here on purpose: brisk is not segmental. They are
// reported separately as an upper motor neuron sign.
const REFLEX_WEIGHT: Record<ReflexGrade, number> = { 2: 0, 1: 2, 0: 3, 3: 0, 4: 0 };

/** A root's score is only meaningful next to the most it could have scored. */
const MAX_SCORE_WITH_REFLEX = 3 + 4 + 3;
const MAX_SCORE_NO_REFLEX = 3 + 4;

/** How much of the level's pattern is present, which is the real confidence cue. */
export type PatternExtent = 'aislado' | 'parcial' | 'completo';

export interface RootScore {
  root: NerveRoot;
  /** Summed deviation. 0 when everything recorded was normal. */
  score: number;
  /** score / the most this root could have scored, 0..1. */
  fraction: number;
  /** How many of its axes deviate (sensation, strength, reflex). */
  affectedAxes: number;
  /** How many of its axes were examined at all. */
  examinedAxes: number;
  extent: PatternExtent;
}

/** Axes this root can even be graded on: not every root has a reflex. */
function axesOf(root: NerveRoot): number {
  return root.reflex ? 3 : 2;
}

function scoreRoot(root: NerveRoot, f: RootFinding): RootScore {
  let score = 0;
  let affected = 0;
  let examined = 0;
  if (f.sensation != null) {
    examined++;
    const w = SENSATION_WEIGHT[f.sensation];
    score += w;
    if (w > 0) affected++;
  }
  if (f.strength != null) {
    examined++;
    const w = STRENGTH_WEIGHT[f.strength];
    score += w;
    if (w > 0) affected++;
  }
  if (f.reflex != null && root.reflex) {
    examined++;
    const w = REFLEX_WEIGHT[f.reflex];
    score += w;
    if (w > 0) affected++;
  }
  const max = root.reflex ? MAX_SCORE_WITH_REFLEX : MAX_SCORE_NO_REFLEX;
  const extent: PatternExtent =
    affected >= axesOf(root) ? 'completo' : affected >= 2 ? 'parcial' : 'aislado';
  return {
    root,
    score,
    fraction: max > 0 ? score / max : 0,
    affectedAxes: affected,
    examinedAxes: examined,
    extent,
  };
}

/** A finding that changes what happens next, not which root it is. */
export interface ScreenCaveat {
  id: 'upper-motor-neuron' | 'multi-root' | 'nothing-abnormal';
  /** Spanish, shown verbatim. */
  label: string;
  detail: string;
}

export interface Localization {
  /** Every root, most deviant first; ties keep the authored proximal-to-distal order. */
  ranked: RootScore[];
  /**
   * The same scores in ANATOMICAL order, which is what the readout draws.
   *
   * Sorting the visible bars by score looked like the obvious choice and was
   * wrong twice over: it puts C7 above C5 in a column a physio reads as a spine,
   * and it makes the rows jump as grades are entered. Bar LENGTH already carries
   * the ranking, so the axis is free to stay anatomical and match the plate and
   * the list beside it.
   */
  byLevel: RootScore[];
  /** The best explanation, or null when nothing recorded was abnormal. */
  leading: RootScore | null;
  /**
   * Roots scoring within reach of the leader. More than one means the screen does
   * NOT isolate a level, which the readout has to say out loud.
   */
  contenders: RootScore[];
  caveats: ScreenCaveat[];
}

/**
 * Ranked roots close enough to the leader to be rivals.
 *
 * Absolute, not proportional: at these small integer scores a ratio test makes 2
 * vs 3 look decisive when it is one grade of one axis. Adjacent dermatomes
 * genuinely overlap, so a screen one point apart has not chosen between them.
 */
const CONTENDER_MARGIN = 1;

/**
 * Which root best explains the screen.
 *
 * Order is stable: `roots` is the authored proximal-to-distal list, and equal
 * scores keep it, so the readout never reshuffles two levels between renders.
 */
export function localizeRoot(roots: NerveRoot[], screen: NeuroScreenState): Localization {
  const scored = roots.map((r) => scoreRoot(r, screen[r.id] ?? EMPTY_FINDING));
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const abnormal = ranked.filter((r) => r.score > 0);
  const leading = abnormal[0] ?? null;
  const contenders = leading
    ? abnormal.filter((r) => leading.score - r.score <= CONTENDER_MARGIN)
    : [];

  const caveats: ScreenCaveat[] = [];

  // Brisk or clonic reflexes: above the root, not at it.
  //
  // The `root.reflex` guard is the SAME one scoreRoot applies, and it has to be:
  // the state shape can hold a reflex grade for a root that has no reflex, and
  // reading that field by two different rules once produced a screen claiming
  // hyperreflexia at L5, which has no tendon to tap.
  const brisk = scored.filter((s) => {
    if (!s.root.reflex) return false;
    const g = screen[s.root.id]?.reflex;
    return g === 3 || g === 4;
  });
  if (brisk.length > 0) {
    caveats.push({
      id: 'upper-motor-neuron',
      label: 'Reflejo aumentado: no es radicular',
      detail:
        `Registraste hiperreflexia en ${brisk
          .map((b) => b.root.label)
          .join(', ')}. Una raíz comprimida abole o disminuye su reflejo; un reflejo vivo ` +
        'apunta por encima de la raíz, a la médula. Explora Hoffmann, Babinski, clonus y marcha, y valora derivar.',
    });
  }

  if (contenders.length > 1) {
    caveats.push({
      id: 'multi-root',
      label: 'Más de un nivel afectado',
      detail:
        `Los hallazgos no separan ${contenders
          .map((c) => c.root.label)
          .join(' de ')}. Dermatomas vecinos se solapan, así que puede ser una sola raíz mal delimitada, ` +
        'pero varios niveles a la vez también son plexo, nervio periférico o polineuropatía. Compara los puntos clave y los reflejos antes de decidir.',
    });
  }

  // Only when there is genuinely nothing abnormal. A screen whose sole finding is
  // a brisk reflex scores zero segmentally -- by design, see the header -- and
  // calling that "normal" would be the exact inversion of the truth.
  if (!leading && !isScreenEmpty(screen) && brisk.length === 0) {
    caveats.push({
      id: 'nothing-abnormal',
      label: 'Tamizaje segmentario normal',
      detail:
        'Todo lo que registraste está dentro de lo normal. Un tamizaje normal no descarga la sospecha: ' +
        'si hay dolor radicular, apóyate en la puesta en tensión neural y en los tests ortopédicos.',
    });
  }

  return { ranked, byLevel: scored, leading, contenders, caveats };
}

// ---------------------------------------------------------------------------
// THE RECORD
// ---------------------------------------------------------------------------

const SENSATION_WORD: Record<SensationGrade, string> = {
  2: 'normal',
  1: 'alterada',
  0: 'ausente',
};

/**
 * The screen as a line for the clinical record.
 *
 * Plain text on purpose: it has to survive being pasted into whatever software
 * the clinic actually runs, which is not going to be this app.
 */
export function screenSummary(
  roots: NerveRoot[],
  screen: NeuroScreenState,
  setTitle: string,
): string {
  const parts: string[] = [];
  for (const r of roots) {
    const f = screen[r.id];
    if (!f) continue;
    const bits: string[] = [];
    if (f.sensation != null) bits.push(`sensibilidad ${SENSATION_WORD[f.sensation]}`);
    if (f.strength != null) bits.push(`fuerza ${f.strength}/5`);
    if (f.reflex != null && r.reflex) bits.push(`reflejo ${f.reflex}/4`);
    if (bits.length > 0) parts.push(`${r.label}: ${bits.join(', ')}`);
  }
  if (parts.length === 0) return '';

  const { leading, contenders, caveats } = localizeRoot(roots, screen);
  const lines = [`Tamizaje neurológico segmentario · ${setTitle}`, parts.join(' · ')];
  if (leading) {
    const level =
      contenders.length > 1
        ? contenders.map((c) => c.root.label).join(' / ')
        : leading.root.label;
    lines.push(`Patrón ${leading.extent} compatible con ${level}.`);
    if (leading.root.mimic) {
      lines.push(`A descartar: ${leading.root.mimic.nerve}.`);
    }
  }
  for (const c of caveats) {
    if (c.id !== 'nothing-abnormal') lines.push(`${c.label}. ${c.detail}`);
    else lines.push(c.label + '.');
  }
  lines.push('Tamizaje orientativo, contenido educativo. No sustituye la valoración médica.');
  return lines.join('\n');
}
