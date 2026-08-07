// src/data/testimonials.ts
//
// Real testimonials shown on the landing.
//
// ============================ RULE, NOT A SUGGESTION ========================
// EVERY entry here must be a REAL person who has USED Anatris and has given
// EXPLICIT PERMISSION to be quoted by name. No composites, no "representative"
// quotes, no placeholders that ship. In a health-adjacent product a fabricated
// endorsement is not marketing licence — it is a lie to a clinician about
// whether other clinicians trust your numbers, and it is the fastest way to
// lose the only asset this project has (credibility).
//
// If you have none yet, LEAVE THIS ARRAY EMPTY. The landing renders no
// testimonial section at all when it is empty, which is honest and costs
// nothing. An empty section beats an invented one.
//
// For each entry collect, in writing (a WhatsApp message is enough):
//   - the quote, in their own words
//   - name, role/title, and institution or clinic
//   - permission to publish all of the above on the public site
// ============================================================================

export interface Testimonial {
  /** Their words, verbatim. Do not polish into marketing copy. */
  quote: string;
  /** Full name, as they want it published. */
  name: string;
  /** Role/title — e.g. "Fisioterapeuta, MSc" or "Docente de Kinesiología". */
  role: string;
  /** Clinic, hospital or university. */
  institution: string;
}

/**
 * EMPTY BY DESIGN until real, permissioned quotes exist. See the rule above.
 * Getting the first three is the highest-return task on the current plan
 * (docs/plan-maestro-2026.md, §3.4).
 */
export const TESTIMONIALS: Testimonial[] = [];
