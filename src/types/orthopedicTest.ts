// src/types/orthopedicTest.ts
//
// Data model for ORTHOPEDIC SPECIAL TESTS (pruebas ortopedicas / tests
// clinicos) shown in the biomechanics lab. Each test carries the maneuver, the
// positive finding, the diagnostic-accuracy metrics (sensibilidad,
// especificidad, y razones de verosimilitud) and the STUDY it comes from.
//
// AUTHORING / ENCODING RULE (same as the rest of the data layer):
//   - User-facing strings: Latin American Spanish WITH accents/enie, UTF-8.
//   - Code, ids, keys, enum-like values: ASCII only (kebab-case ids).
//
// HONESTY CONVENTION: sensibilidad/especificidad vary a LOT by study, degree of
// tear, and positivity criterion. Every metric set points to the study it came
// from and carries `verified: false` until the number is checked against the
// primary source (mirrors `pageVerified: false` on the book citations). The UI
// surfaces the unverified flag so the physio can confirm before publishing.

/** A study/source backing a test's metrics; verified=false until checked. */
export interface StudyCitation {
  /** Key into REFERENCES (references.ts). */
  ref: string;
  /** True once the exact numbers were checked against the primary source. */
  verified: boolean;
  /** Optional page/table locator within the source. */
  locator?: string;
}

/**
 * Diagnostic-accuracy metrics for a test, as POINT ESTIMATES in percent.
 * Likelihood ratios are optional and, when omitted, the UI derives an
 * approximate LR from sens/spec (clearly labelled "aprox."). `note` carries the
 * spread/context (e.g. "varia 60-79% segun grado de rotura").
 */
export interface DiagnosticMetrics {
  /** Sensibilidad, 0..100 (%). Omitted when the source did not report it. */
  sensitivity?: number;
  /** Especificidad, 0..100 (%). */
  specificity?: number;
  /** Razon de verosimilitud positiva (LR+), if the study reported one. */
  lrPositive?: number;
  /** Razon de verosimilitud negativa (LR-), if the study reported one. */
  lrNegative?: number;
  /** Spread / caveat shown under the bars. */
  note?: string;
}

/**
 * How to reproduce the test's provocative position on the 3D rig. Maps the test
 * to a driveable movement (movementId from *Rom.ts) + a target angle, plus an
 * optional muscle to glow (muscleId as used by RigOverlays). Optional: tests
 * whose position the current rig cannot approximate simply omit it (no demo
 * button). `note` documents the part of the maneuver the single-axis rig cannot
 * reproduce (e.g. an added rotation), shown next to the button.
 */
export interface TestDemo {
  /** movementId the rig already knows how to drive. */
  movementId: string;
  /** Clinical angle to pose at (deg). */
  angleDeg: number;
  /** Which side to pose (default 'R'). */
  side?: 'R' | 'L';
  /** Muscle/structure to glow while posed (muscleId from the region's muscles). */
  highlightMuscleId?: string;
  /**
   * True for a RESISTED test (the examiner opposes the patient's effort, e.g.
   * Jobe/empty-can, Speed, O'Brien). The demo then shows the therapist's hand on
   * the distal segment resisting the driven movement, so the maneuver reads as the
   * two-person interaction it is. Only set it where the generic distal-segment
   * resistance is anatomically right (NOT belly-press/lift-off, whose hand is on
   * the abdomen/lumbar, nor passive tests where the examiner just moves the limb).
   */
  resisted?: boolean;
  /** What the rig approximation leaves out (shown as a caveat). */
  note?: string;
}

/**
 * How the test is best used, from its metric profile:
 *   - 'rule-out'  (SnNout): high sensibilidad -> a NEGATIVE result rules the
 *      condition OUT. Good screening test.
 *   - 'rule-in'   (SpPin):  high especificidad -> a POSITIVE result rules the
 *      condition IN. Good confirmation test.
 *   - 'balanced':  moderate both ways; use within a cluster of tests.
 *   - 'weak':      low accuracy alone; interpret only as part of a test cluster.
 */
export type TestUtility = 'rule-out' | 'rule-in' | 'balanced' | 'weak';

export interface OrthopedicTest {
  /** Stable kebab-case id, unique across all regions. */
  id: string;
  /** User-facing name (Spanish). */
  name: string;
  /** Eponyms / synonyms shown as secondary labels. */
  aka?: string[];
  /** Region id (matches store.region): 'shoulder', 'cervical', ... */
  region: string;
  /** Clinical grouping shown as a section header (e.g. "Pinzamiento subacromial"). */
  category: string;
  /** What structure/condition the test targets (e.g. "Supraespinoso"). */
  target: string;
  /** One line: what the test is trying to detect. */
  purpose: string;
  /** How the maneuver is performed (position + action). */
  maneuver: string;
  /** What counts as a POSITIVE result. */
  positive: string;
  /** Diagnostic-accuracy metrics + their study. */
  metrics: DiagnosticMetrics;
  /** Derived clinical use of the test (drives the SnNout/SpPin badge). */
  utility: TestUtility;
  /** How to read a positive/negative given the metric profile. */
  interpretation: string;
  /** Optional teaching pearl (false positives, confounders, tips). */
  pearl?: string;
  /** How to reproduce the provocative position on the 3D rig (optional). */
  demo?: TestDemo;
  /** Study/studies the metrics come from. */
  cite: StudyCitation[];
}

/** region id -> tests. */
export type OrthopedicTestIndex = Record<string, OrthopedicTest[]>;
