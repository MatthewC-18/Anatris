// src/data/references.ts
//
// Centralized bibliography for the educational content. Every clinical claim
// in a muscle/structure entry points to one of these references by `id`, plus
// an optional page locator. Defining sources once means: edition changes live
// in a single place, and the "Fuentes" page for a module can be generated
// automatically from the set of references actually cited.
//
// IMPORTANT — page numbers:
//   Page numbers vary by edition and (for Dufour) by volume. Content authored
//   without a verified physical/edition copy should set `pageVerified: false`
//   on the citation (see Citation in ./muscleContent.ts), NOT guess a page.
//   The UI surfaces unverified pages so they can be confirmed against the
//   actual book before publishing.

export interface Reference {
  /** Stable short id used by citations. Never reuse or repurpose. */
  id: string;
  /** Author(s), "Apellido AA" style, multiple separated by ", ". */
  authors: string;
  /** Full work title. */
  title: string;
  /** Edition label as printed (e.g. "6.ª edición"). Empty if N/A. */
  edition: string;
  /** Publisher. */
  publisher: string;
  /** Year of the cited edition. */
  year: number;
  /** Optional volume label, used by multi-volume works (Dufour). */
  volume?: string;
  /** Optional note shown in the bibliography (e.g. translation info). */
  note?: string;
}

/**
 * The authoritative sources for this project.
 * Kapandji is the primary biomechanics reference; Oatis and Dufour reinforce
 * kinesiology and functional anatomy; a descriptive-anatomy source backs
 * origin/insertion/innervation facts.
 *
 * NOTE: edition/year/publisher fields below reflect commonly used Spanish
 * editions but should be checked against YOUR physical copies and adjusted —
 * they affect how citations render. Marked with `// VERIFY` where you most
 * likely need to confirm the exact edition you own.
 */
export const REFERENCES: Record<string, Reference> = {
  kapandji: {
    id: 'kapandji',
    authors: 'Kapandji AI',
    title: 'Fisiología articular. Tomo 1: Miembro superior',
    edition: '6.ª edición', // VERIFY: confirma la edición de tu ejemplar
    publisher: 'Editorial Médica Panamericana',
    year: 2006, // VERIFY
    volume: 'Tomo 1 — Miembro superior',
    note: 'Referencia principal de biomecánica articular.',
  },

  oatis: {
    id: 'oatis',
    authors: 'Oatis CA',
    title: 'Kinesiology: The Mechanics and Pathomechanics of Human Movement',
    edition: '3rd edition', // VERIFY: 2ª o 3ª según tu ejemplar
    publisher: 'Wolters Kluwer',
    year: 2017, // VERIFY
    note: 'Cinesiología y patomecánica del movimiento humano.',
  },

  dufour: {
    id: 'dufour',
    authors: 'Dufour M',
    title: 'Anatomía del aparato locomotor',
    edition: '2.ª edición', // VERIFY
    publisher: 'Elsevier Masson',
    year: 2018, // VERIFY
    volume: 'Tomo 1 — Miembro superior', // VERIFY: confirma el tomo del MMSS
    note: 'Anatomía funcional descriptiva por regiones.',
  },

  // A descriptive-anatomy backbone for origin/insertion/innervation.
  // Swap or remove if you prefer to rely solely on Dufour for descriptive data.
  descriptive: {
    id: 'descriptive',
    authors: 'Drake RL, Vogl AW, Mitchell AWM',
    title: 'Gray. Anatomía para estudiantes',
    edition: '4.ª edición', // VERIFY
    publisher: 'Elsevier',
    year: 2020, // VERIFY
    note: 'Anatomía descriptiva de referencia.',
  },
};

/** Type-safe set of valid reference ids. */
export type ReferenceId = keyof typeof REFERENCES;

/** Resolve a reference by id (throws in dev if missing, to catch typos). */
export function getReference(id: ReferenceId): Reference {
  const ref = REFERENCES[id];
  if (!ref && import.meta.env.DEV) {
    throw new Error(`Referencia desconocida: "${id}"`);
  }
  return ref;
}

/** Format a reference for display in a bibliography list (Vancouver-ish). */
export function formatReference(ref: Reference): string {
  const parts = [
    `${ref.authors}.`,
    `${ref.title}.`,
    ref.edition ? `${ref.edition}.` : '',
    `${ref.publisher}; ${ref.year}.`,
  ].filter(Boolean);
  return parts.join(' ');
}
