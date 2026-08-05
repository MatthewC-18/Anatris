// src/lib/clinicalAudit.ts
//
// Internal-consistency audit of the clinical data layer, as a PURE function so
// both the CLI (scripts/audit-clinical-data.mts) and the regression test
// (src/lib/__tests__/clinicalAudit.test.ts) share exactly one implementation.
//
// It catches the "stale state / forgotten site" class of bug the data layer is
// prone to: a muscleId renamed in one place but not another, a citation to a ref
// that no longer exists (getReference throws in dev), a test demo pointing at a
// movement that isn't drivable, metrics out of range, etc. None of these are
// type errors, so only a data-aware audit finds them.

import { ROM_BY_REGION } from '../data/romByRegion';
import { MUSCLES_BY_REGION } from '../data/musclesByRegion';
import { ORTHOPEDIC_TESTS_BY_REGION } from '../data/orthopedicTests';
import { PATHOLOGIES } from '../data/pathologies';
import { CLINICAL_CASES } from '../data/clinicalCases';
import { REFERENCES } from '../data/references';
import { BONE_MAP } from './boneMap';
import type { RomMovement } from '../types/rom';
import type { OrthopedicTest } from '../types/orthopedicTest';
import type { Citation } from '../types/muscleContent';

export interface AuditIssue {
  level: 'ERROR' | 'WARN';
  where: string;
  msg: string;
}

export interface RegionProgress {
  romCites: number;
  romVerified: number;
  testCites: number;
  testVerified: number;
}

export interface AuditResult {
  issues: AuditIssue[];
  progress: Record<string, RegionProgress>;
}

/** Run the full clinical-data consistency audit. Pure: no I/O, no console. */
export function runClinicalAudit(): AuditResult {
  const issues: AuditIssue[] = [];
  const err = (where: string, msg: string) => issues.push({ level: 'ERROR', where, msg });
  const warn = (where: string, msg: string) => issues.push({ level: 'WARN', where, msg });

  const refKeys = new Set(Object.keys(REFERENCES));
  const progress: Record<string, RegionProgress> = {};
  const prog = (region: string): RegionProgress =>
    (progress[region] ??= { romCites: 0, romVerified: 0, testCites: 0, testVerified: 0 });

  // ----- ROM -----
  for (const [region, movements] of Object.entries(ROM_BY_REGION as Record<string, RomMovement[]>)) {
    const muscleIds = new Set((MUSCLES_BY_REGION[region] ?? []).map((m) => m.id));
    const p = prog(region);
    for (const mv of movements) {
      const at = `ROM ${region}/${mv.id}`;
      if (!(mv.id in BONE_MAP)) warn(at, 'sin entrada en BONE_MAP (no se anima en el lab)');

      const rng = mv.totalRangeDeg;
      if (!rng || !isFinite(rng.min) || !isFinite(rng.max) || rng.max < rng.min) {
        err(at, `totalRangeDeg inválido: ${JSON.stringify(rng)}`);
      }

      const checkCites = (cites: Citation[] | undefined, ctx: string) => {
        for (const c of cites ?? []) {
          p.romCites += 1;
          if (c.pageVerified) p.romVerified += 1;
          if (!refKeys.has(c.ref)) err(ctx, `cita a ref inexistente '${c.ref}'`);
        }
      };
      checkCites(mv.rangeCite, `${at} rangeCite`);

      const phases = [...(mv.phases ?? []), ...(mv.labReverse?.phases ?? [])];
      for (const ph of phases) {
        checkCites(ph.cite, `${at} fase "${ph.label}"`);
        for (const mu of ph.muscles ?? []) {
          if (muscleIds.size && !muscleIds.has(mu.muscleId)) {
            err(`${at} fase "${ph.label}"`, `muscleId '${mu.muscleId}' no existe en músculos de ${region}`);
          }
        }
      }
      for (const a of mv.activations ?? []) {
        if (muscleIds.size && !muscleIds.has(a.muscleId)) {
          err(`${at} activations`, `muscleId '${a.muscleId}' no existe en ${region}`);
        }
        let prev = -Infinity;
        for (const k of a.curve ?? []) {
          if (k.level < 0 || k.level > 1) err(`${at} activation ${a.muscleId}`, `level fuera de [0,1]: ${k.level}`);
          if (k.deg < prev) warn(`${at} activation ${a.muscleId}`, `curve no ascendente (deg=${k.deg})`);
          prev = k.deg;
        }
      }
    }
  }

  // ----- Orthopedic tests -----
  for (const [region, tests] of Object.entries(
    ORTHOPEDIC_TESTS_BY_REGION as Record<string, OrthopedicTest[]>,
  )) {
    const romIds = new Set((ROM_BY_REGION[region] ?? []).map((m) => m.id));
    const muscleIds = new Set((MUSCLES_BY_REGION[region] ?? []).map((m) => m.id));
    const p = prog(region);
    const seen = new Set<string>();
    for (const t of tests) {
      const at = `TEST ${region}/${t.id}`;
      if (seen.has(t.id)) err(`TEST ${region}`, `id duplicado '${t.id}'`);
      seen.add(t.id);
      if (t.region !== region) warn(at, `campo region='${t.region}' != clave '${region}'`);

      for (const c of t.cite ?? []) {
        p.testCites += 1;
        if (c.verified) p.testVerified += 1;
        if (!refKeys.has(c.ref)) err(at, `cita a ref inexistente '${c.ref}'`);
      }

      const m = t.metrics ?? {};
      for (const key of ['sensitivity', 'specificity'] as const) {
        const v = m[key];
        if (v != null && (v < 0 || v > 100)) err(at, `${key}=${v} fuera de [0,100]`);
      }
      if (t.demo) {
        if (!romIds.has(t.demo.movementId)) {
          err(at, `demo.movementId '${t.demo.movementId}' no está en el ROM de ${region}`);
        } else if (!(t.demo.movementId in BONE_MAP)) {
          warn(at, `demo.movementId '${t.demo.movementId}' no es drivable`);
        }
        const hm = t.demo.highlightMuscleId;
        if (hm && muscleIds.size && !muscleIds.has(hm)) {
          err(at, `demo.highlightMuscleId '${hm}' no existe en ${region}`);
        }
      }
      if (t.utility === 'rule-out' && m.sensitivity != null && m.sensitivity < 80) {
        warn(at, `utility 'rule-out' pero sensibilidad ${m.sensitivity} < 80`);
      }
      if (t.utility === 'rule-in' && m.specificity != null && m.specificity < 80) {
        warn(at, `utility 'rule-in' pero especificidad ${m.specificity} < 80`);
      }
    }
  }

  // ----- Movement pathology presets -----
  // A preset points at movement ids and muscle ids that live in OTHER files, so
  // it is exactly the kind of cross-file reference that rots silently. It also
  // carries a single rangeCapDeg shared by every movement in `appliesTo`: a cap
  // above a movement's own max is inert (the preset looks broken in the lab),
  // which is worth a warning.
  const romById = new Map<string, RomMovement>();
  for (const movements of Object.values(ROM_BY_REGION as Record<string, RomMovement[]>)) {
    for (const mv of movements) romById.set(mv.id, mv);
  }
  const allMuscleIds = new Set<string>();
  for (const muscles of Object.values(MUSCLES_BY_REGION)) {
    for (const m of muscles) allMuscleIds.add(m.id);
  }
  const seenPathologies = new Set<string>();
  for (const p of PATHOLOGIES) {
    const at = `PATOLOGIA ${p.id}`;
    if (seenPathologies.has(p.id)) err('PATOLOGIA', `id duplicado '${p.id}'`);
    seenPathologies.add(p.id);

    for (const c of p.cite ?? []) {
      if (!refKeys.has(c.ref)) err(at, `cita a ref inexistente '${c.ref}'`);
    }
    for (const mu of p.implicated ?? []) {
      if (!allMuscleIds.has(mu)) err(at, `implicated '${mu}' no existe en ninguna región`);
    }
    if (!p.appliesTo?.length) err(at, 'appliesTo vacío: el preset nunca se ofrece');
    for (const mvId of p.appliesTo ?? []) {
      const mv = romById.get(mvId);
      if (!mv) {
        err(at, `appliesTo '${mvId}' no es un movimiento de ningún ROM`);
        continue;
      }
      if (p.rangeCapDeg != null && p.rangeCapDeg >= mv.totalRangeDeg.max) {
        warn(
          at,
          `rangeCapDeg ${p.rangeCapDeg} >= max de '${mvId}' (${mv.totalRangeDeg.max}): el tope no se nota`,
        );
      }
      if (p.rangeFloorDeg != null && p.rangeFloorDeg <= mv.totalRangeDeg.min) {
        warn(
          at,
          `rangeFloorDeg ${p.rangeFloorDeg} <= min de '${mvId}' (${mv.totalRangeDeg.min}): el suelo no se nota`,
        );
      }
    }
  }

  // ----- Clinical cases -----
  // Exactly one correct option per step is the invariant the case UI assumes;
  // a step with zero or two correct answers cannot be completed correctly.
  const seenCases = new Set<string>();
  for (const [region, cases] of Object.entries(CLINICAL_CASES)) {
    for (const c of cases) {
      const at = `CASO ${region}/${c.id}`;
      if (seenCases.has(c.id)) err('CASO', `id duplicado '${c.id}'`);
      seenCases.add(c.id);
      if (c.region !== region) warn(at, `campo region='${c.region}' != clave '${region}'`);
      if (!c.steps.length) err(at, 'caso sin pasos');
      for (const s of c.steps) {
        const correct = s.options.filter((o) => o.correct).length;
        if (correct !== 1) {
          err(at, `paso '${s.id}' tiene ${correct} opciones correctas (debe ser 1)`);
        }
        const ids = new Set(s.options.map((o) => o.id));
        if (ids.size !== s.options.length) err(at, `paso '${s.id}' con ids de opción repetidos`);
      }
    }
  }

  return { issues, progress };
}
