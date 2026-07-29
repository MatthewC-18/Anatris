// src/lib/biomech/lumbarCoupling.ts
//
// Pure coupling for LUMBAR FLEXION — the trunk's "rhythm equivalent": the
// LUMBOPELVIC RHYTHM. A forward bend is not just lumbar spine motion; the pelvis
// rotates over the hips too, and the two share the movement in a set sequence.
//
// MODEL (Kapandji / Oatis): the lumbar spine reverses its lordosis and LEADS the
// early bend; the pelvis (hip flexion) ramps in and DOMINATES the later range. The
// coupled pelvic contribution here is a didactic model of that sequence (it varies
// by person and task), same honesty discipline as ./shoulderChain. READOUT only —
// the lab drives the lumbar segment; the pelvic share is shown, not posed.
//
// ASCII source; no `any`.

export type LumbopelvicLeader = 'lumbar' | 'pelvis' | 'balanced';

export interface LumbopelvicRhythm {
  /** Lumbar spine flexion (the driven angle), degrees. */
  lumbarDeg: number;
  /** Coupled pelvic / hip flexion at this point (modelled), degrees. */
  pelvicDeg: number;
  /** Total trunk forward bend so far (lumbar + pelvic), degrees. */
  totalDeg: number;
  lumbarPct: number;
  pelvicPct: number;
  /** Lumbar : pelvis, e.g. "1.4:1". */
  ratio: string;
  leader: LumbopelvicLeader;
}

/** Lumbopelvic split for a given lumbar flexion angle. Null at/below neutral. */
export function lumbopelvicRhythm(lumbarDeg: number): LumbopelvicRhythm | null {
  const l = lumbarDeg < 0 ? 0 : lumbarDeg;
  if (l <= 0.5) return null;
  const seg = (lo: number, hi: number): number => Math.max(Math.min(l, hi) - lo, 0);
  // Pelvis stays quiet while the lumbar reverses (first ~25 deg), then ramps in and
  // leads the rest, so the ratio shifts from lumbar-led to pelvis-led across the arc.
  const pelvic = 0.25 * seg(0, 25) + 1.1 * seg(25, 60);
  const total = l + pelvic;
  const ratio = pelvic > 0.1 ? `${(l / pelvic).toFixed(1)}:1` : '—';
  const leader: LumbopelvicLeader =
    l > pelvic * 1.15 ? 'lumbar' : pelvic > l * 1.15 ? 'pelvis' : 'balanced';
  return {
    lumbarDeg: l,
    pelvicDeg: pelvic,
    totalDeg: total,
    lumbarPct: total > 0 ? (l / total) * 100 : 0,
    pelvicPct: total > 0 ? (pelvic / total) * 100 : 0,
    ratio,
    leader,
  };
}
