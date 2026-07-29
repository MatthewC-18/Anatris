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
import { romForRegion } from '../data/romByRegion';
import { muscleContentForRegion } from '../data/muscleContentByRegion';
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
      if (!ref) continue;
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

/** Textbooks sourcing a region's ROM + muscle content, by cite weight. */
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

  walkCitations(romForRegion(region), collect);
  walkCitations(muscleContentForRegion(region), collect);

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
