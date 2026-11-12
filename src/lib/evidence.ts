// src/lib/evidence.ts
//
// Builds the per-region EVIDENCE model consumed by the "Evidencia" page. It
// gathers, for one region:
//   - STUDIES: the diagnostic-accuracy journal articles cited by that region's
//     orthopedic tests, grouped by source, with which tests use each one and
//     how many of those citations are verified against the primary source.
//   - BOOKS: the textbooks (Kapandji/Oatis/Dufour/Gray) that source the
//     region's ROM and muscle content, with a rough cite weight.
//
// This is the honesty layer made visible: every clinical number in the app
// traces to a source, and the page shows exactly which sources are still
// pending verification. Journals link straight to PubMed (see references.ts).

import { testsForRegion } from '../data/orthopedicTests';
import { ROM_BY_REGION } from '../data/romByRegion';
import { muscleContentForRegion } from '../data/muscleContentByRegion';
import { TRACK_BY_REGION } from '../data/trackByRegion';
import { premiumRom, premiumTrack } from '../data/premiumStore';
import { REFERENCES, isJournalRef, type Reference } from '../data/references';

/** One test that cites a given study, with that citation's verified state. */
export interface StudyUsage {
  testId: string;
  testName: string;
  category: string;
  verified: boolean;
  locator?: string;
}

/** A study (journal article) and every region test that leans on it. */
export interface EvidenceStudy {
  ref: Reference;
  usedBy: StudyUsage[];
  /** Citations of this study (across the region's tests) that are verified. */
  verifiedCount: number;
  /** Total citations of this study across the region's tests. */
  totalCount: number;
}

/** A textbook cited by the region's descriptive/biomechanics content. */
export interface EvidenceBook {
  ref: Reference;
  /** How many sourced claims in the region point to it (a rough weight). */
  citeCount: number;
  /** True when at least one of those citations has a verified page/section. */
  anyPageVerified: boolean;
}

export interface RegionEvidence {
  studies: EvidenceStudy[];
  books: EvidenceBook[];
  /** Verified vs. total study citations across the region (headline honesty). */
  studyVerified: number;
  studyTotal: number;
}

/**
 * Depth-first walk collecting every citation `ref` under a `cite` / `rangeCite`
 * array, calling back with the ref id and whether its page was verified. Lets
 * us harvest book usage from the whole ROM + muscle-content tree without
 * hard-coding each field.
 */
function walkCitations(
  node: unknown,
  onCite: (ref: string, pageVerified: boolean) => void,
): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walkCitations(item, onCite);
    return;
  }
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if ((key === 'cite' || key === 'rangeCite') && Array.isArray(value)) {
      for (const c of value) {
        if (c && typeof c === 'object' && 'ref' in c) {
          const entry = c as { ref: string; pageVerified?: boolean };
          onCite(String(entry.ref), Boolean(entry.pageVerified));
        }
      }
    } else {
      walkCitations(value, onCite);
    }
  }
}

/** Studies cited by a region's orthopedic tests, grouped by source. */
function studiesForRegion(region: string | null): EvidenceStudy[] {
  const tests = testsForRegion(region);
  const map = new Map<string, EvidenceStudy>();
  for (const t of tests) {
    for (const c of t.cite) {
      const ref = REFERENCES[c.ref];
      // UN LIBRO NO ES UN ESTUDIO. Un test que cita a Magee (su texto de
      // exploracion) salia en "Estudios" de la cadera como si fuera un articulo
      // de precision diagnostica. Los libros se cuentan en `booksForRegion`.
      if (!ref || !isJournalRef(ref)) continue;
      let study = map.get(c.ref);
      if (!study) {
        study = { ref, usedBy: [], verifiedCount: 0, totalCount: 0 };
        map.set(c.ref, study);
      }
      study.usedBy.push({
        testId: t.id,
        testName: t.name,
        category: t.category,
        verified: c.verified,
        locator: c.locator,
      });
      study.totalCount += 1;
      if (c.verified) study.verifiedCount += 1;
    }
  }
  // Oldest-first reads like a bibliography; ties broken by author.
  return [...map.values()].sort(
    (a, b) => a.ref.year - b.ref.year || a.ref.authors.localeCompare(b.ref.authors),
  );
}

/** La ROM de la region, o nada si la de pago aun no ha llegado. */
function ownRom(region: string | null): unknown {
  if (!region) return ROM_BY_REGION.shoulder;
  return ROM_BY_REGION[region] ?? premiumRom(region) ?? null;
}

/** La ruta de Aprender de la region, o nada si la de pago aun no ha llegado. */
function ownTrack(region: string | null): unknown {
  if (!region) return TRACK_BY_REGION.shoulder;
  return TRACK_BY_REGION[region] ?? premiumTrack(region) ?? null;
}

/** Textbooks sourcing a region's ROM, muscle content, learning track and tests, by cite weight. */
function booksForRegion(region: string | null): EvidenceBook[] {
  const counts = new Map<string, { count: number; verified: boolean }>();
  const collect = (ref: string, pageVerified: boolean) => {
    const r = REFERENCES[ref];
    if (!r || isJournalRef(r)) return; // studies are handled separately
    const prev = counts.get(ref) ?? { count: 0, verified: false };
    prev.count += 1;
    prev.verified = prev.verified || pageVerified;
    counts.set(ref, prev);
  };

  // La ROM PROPIA: `romForRegion` cae a la del hombro cuando la de pago aun no
  // ha llegado, y contaba los libros del hombro para el tobillo.
  const rom = ownRom(region);
  if (rom) walkCitations(rom, collect);
  walkCitations(muscleContentForRegion(region), collect);
  // LA RUTA DE APRENDER TAMBIEN CITA LIBROS, y no se contaba: el tobillo
  // perdia a Magee y las cuentas por libro se quedaban cortas (pedido del
  // agente de la tanda 2a). Solo la ruta de ESTA region: `trackForRegion` cae a
  // la del hombro cuando la de pago aun no ha llegado, y contaria los libros
  // del hombro como si fueran del tobillo.
  const track = ownTrack(region);
  if (track) walkCitations(track, collect);
  // Y los libros que citan los tests (que ya no cuentan como estudios).
  for (const t of testsForRegion(region)) {
    for (const c of t.cite) collect(c.ref, Boolean(c.verified));
  }

  return [...counts.entries()]
    .map(([id, { count, verified }]) => ({
      ref: REFERENCES[id],
      citeCount: count,
      anyPageVerified: verified,
    }))
    .sort((a, b) => b.citeCount - a.citeCount);
}

/** Full evidence model for a region (studies + books + headline verified count). */
export function evidenceForRegion(region: string | null): RegionEvidence {
  const studies = studiesForRegion(region);
  const books = booksForRegion(region);
  let studyVerified = 0;
  let studyTotal = 0;
  for (const s of studies) {
    studyVerified += s.verifiedCount;
    studyTotal += s.totalCount;
  }
  return { studies, books, studyVerified, studyTotal };
}
