// src/types/concept.ts
//
// Type definitions for CONCEPTUAL modules: teaching content that is NOT a body
// region and therefore does NOT fit the Muscle[] / RomMovement[] / 7-phase
// anatomical track. The first (and template) conceptual module is FUNDAMENTOS:
// planes & axes, movement nomenclature, contraction types, lever systems and
// kinetic chains - the vocabulary a student needs BEFORE studying any joint.
//
// DESIGN DECISION (why a separate type, not a fake region):
//   - A region's pedagogy is built around muscles and joint ROM. Fundamentos
//     has neither. Forcing it into RegionTrack would mean empty muscle lists and
//     fake "phases", confusing the data model.
//   - Instead, a ConceptTrack is a flat ordered list of SECTIONS. Each section
//     is self-contained didactic prose (Spanish, sourced) plus an OPTIONAL 3D
//     hook that reuses the existing viewer: a section can ask the viewer to
//     show the anatomical planes/axes overlay and frame a given camera view.
//     No rigging, no new asset - the same "narrate over the real model" honesty
//     used by the gesture guides.
//   - The store still addresses it by a region id ('fundamentos'), so TopBar,
//     routing and the panel shell are reused unchanged. The phase renderer
//     branches on whether the active id has a ConceptTrack (this file) or a
//     RegionTrack (pedagogy.ts).
//
// ENCODING: user-facing strings in UTF-8 Spanish with accents; ids/keys ASCII.

import type { SourcedText } from './muscleContent';
import type { CameraView } from './anatomy';

/* ===========================================================================
 * 3D OVERLAY HOOK (optional per section)
 * ===========================================================================
 * Reuses the live model. The viewer interprets these flags; the data stays
 * view-agnostic. A section with no `overlay` is pure reading content.
 */

/** Which didactic overlay to draw over the model for a section. */
export type ConceptOverlay =
  // The three cardinal anatomical planes as translucent quads through the body.
  | 'planes'
  // The three axes (vertical / sagittal / frontal) as lines through the body.
  | 'axes'
  // Both planes and axes together.
  | 'planes-and-axes'
  // No overlay; the section is read-only text + inline diagram.
  | 'none';

/** The 3D framing a section requests, reusing the existing camera system. */
export interface ConceptView {
  /** Overlay to draw. */
  overlay: ConceptOverlay;
  /** Camera view to frame the overlay legibly. */
  view: CameraView;
  /** Optional caption tying the 3D view to the concept. */
  caption?: SourcedText;
}

/* ===========================================================================
 * INLINE DIAGRAM HOOK (optional per section)
 * ===========================================================================
 * For concepts better shown as a 2D schematic than over the 3D model
 * (contraction types, lever classes). The renderer maps each key to a small
 * built-in SVG diagram; the data never embeds the SVG itself, mirroring how
 * the per-muscle phases reference content instead of copying it.
 */
export type ConceptDiagram =
  | 'contraction-types' // concentric / eccentric / isometric schematic
  | 'lever-classes' // first / second / third class levers
  | 'kinetic-chains' // open vs closed kinetic chain
  | 'none';

/* ===========================================================================
 * A CONCEPT SECTION
 * ======================================================================== */

/** One teaching unit of a conceptual module. Ordered within the track. */
export interface ConceptSection {
  /** Stable id, kebab-case, e.g. "planos-anatomicos". */
  id: string;
  /** Section title, Spanish, e.g. "Planos anatomicos". */
  title: string;
  /** One-line summary shown in the section list / tab. */
  summary: string;
  /** The main teaching prose, each statement sourced. Ordered paragraphs. */
  body: SourcedText[];
  /** Optional key-term glossary surfaced beside the prose. */
  terms?: ConceptTerm[];
  /** Optional 3D overlay framing (planes/axes over the live model). */
  view?: ConceptView;
  /** Optional inline 2D diagram key (contraction types, levers, chains). */
  diagram?: ConceptDiagram;
}

/** A single nomenclature term and its definition (e.g. "Flexion" -> ...). */
export interface ConceptTerm {
  term: string;
  definition: SourcedText;
}

/* ===========================================================================
 * THE CONCEPT TRACK
 * ======================================================================== */

/** A complete conceptual module: an ordered list of sections under an id that
 *  the store addresses like a region, but rendered by the concept renderer. */
export interface ConceptTrack {
  /** Module id, e.g. "fundamentos" (aligns with the store's region field). */
  conceptId: string;
  /** User-facing module name, e.g. "Fundamentos". */
  conceptName: string;
  /** Short framing shown at the top of the module. */
  intro: SourcedText;
  /** Ordered teaching sections. */
  sections: ConceptSection[];
}
