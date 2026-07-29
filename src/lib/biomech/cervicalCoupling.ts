// src/lib/biomech/cervicalCoupling.ts
//
// Pure coupling for CERVICAL ROTATION — the neck's "rhythm equivalent": how the
// total head rotation is SHARED between the atlanto-axial joint (C1-C2) and the
// subaxial segments (C2-C7).
//
// MODEL (Kapandji / Oatis): roughly HALF of cervical rotation happens at C1-C2,
// and the atlanto-axial joint LEADS early (the obliquus inferior capitis spins the
// atlas on the axis first); the subaxial column then catches up so the whole ~80
// deg arc ends near a 50/50 split. Modelled, not page-exact (same discipline as
// ./shoulderChain). READOUT only — it does not drive the rig.
//
// ASCII source; no `any`.

export interface CervicalRotationSplit {
  /** Atlanto-axial (C1-C2) contribution at this angle, degrees. */
  c1c2Deg: number;
  /** Subaxial (C2-C7) contribution at this angle, degrees. */
  subaxialDeg: number;
  c1c2Pct: number;
  subaxialPct: number;
  /** C1-C2 : subaxial, e.g. "1.3:1". */
  ratio: string;
}

/** Split cervical rotation into atlanto-axial + subaxial. Null at/below neutral. */
export function cervicalRotationSplit(deg: number): CervicalRotationSplit | null {
  const d = deg < 0 ? -deg : deg; // symmetric left/right
  if (d <= 0.5) return null;
  const seg = (lo: number, hi: number): number => Math.max(Math.min(d, hi) - lo, 0);
  // Front-loaded: C1-C2 takes 65% of the first 40 deg, then 35% of the next 40, so
  // the whole 80 deg arc lands ~50/50 while the atlas clearly leads early.
  const c1c2 = 0.65 * seg(0, 40) + 0.35 * seg(40, 80);
  const subaxial = Math.max(0, d - c1c2);
  const total = c1c2 + subaxial;
  const ratio = subaxial > 0.1 ? `${(c1c2 / subaxial).toFixed(1)}:1` : '—';
  return {
    c1c2Deg: c1c2,
    subaxialDeg: subaxial,
    c1c2Pct: total > 0 ? (c1c2 / total) * 100 : 0,
    subaxialPct: total > 0 ? (subaxial / total) * 100 : 0,
    ratio,
  };
}
