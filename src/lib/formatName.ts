// src/lib/formatName.ts
//
// Turns a raw Z-Anatomy canonical name into a clean, human-readable label.
// Anatomical nomenclature is largely Latin/English by convention, so we keep
// term bodies as-is and focus on: stripping technical suffixes, fixing
// casing, and appending laterality in Spanish.

import type { Side } from '../types/anatomy';

/**
 * Z-Anatomy suffixes we strip from display names:
 *   .r .l   side
 *   .t      text label
 *   .g      group
 *   .j      joint container
 *   .e .o   muscle end / origin
 *   .i .s   (insertion/start helper nodes seen in the model)
 *   .st     UI panel groups (Colors.st, etc.)
 */
const SUFFIX_RE = /\.(r|l|t|g|j|e|o|i|s|st)\b/gi;

/**
 * A small translation table for the most common anatomical words. Not
 * exhaustive by design — unmatched terms stay in their original form, which
 * is acceptable (and often expected) in anatomy education.
 */
const TERM_MAP: Array<[RegExp, string]> = [
  [/\bmuscle\b/gi, 'músculo'],
  [/\bbone\b/gi, 'hueso'],
  [/\bnerve\b/gi, 'nervio'],
  [/\bartery\b/gi, 'arteria'],
  [/\bvein\b/gi, 'vena'],
  [/\bligament\b/gi, 'ligamento'],
  [/\btendon\b/gi, 'tendón'],
  [/\bjoint\b/gi, 'articulación'],
  [/\barticular capsule\b/gi, 'cápsula articular'],
  [/\bof the\b/gi, 'del'],
  [/\bof\b/gi, 'de'],
  [/\bhead\b/gi, 'cabeza'],
  [/\bbody\b/gi, 'cuerpo'],
  [/\bneck\b/gi, 'cuello'],
  [/\bprocess\b/gi, 'proceso'],
  [/\bleft\b/gi, 'izquierdo'],
  [/\bright\b/gi, 'derecho'],
];

const SIDE_LABEL: Record<Side, string> = {
  right: 'derecho',
  left: 'izquierdo',
  center: '',
};

/**
 * Produce a display label from a canonical name + known side.
 * Example: ("Deltoid.r", "right") -> "Deltoid, derecho"
 *          ("Articular capsule of hip joint.l", "left")
 *              -> "Articular capsule de hip articulación, izquierdo"
 */
export function formatCanonicalName(canonical: string, side: Side): string {
  let base = canonical.replace(SUFFIX_RE, '');
  // collapse leftover dots/underscores and whitespace
  base = base.replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Apply light translation pass.
  for (const [re, es] of TERM_MAP) base = base.replace(re, es);

  // Capitalize first letter only.
  base = base.charAt(0).toUpperCase() + base.slice(1);

  const sideLabel = SIDE_LABEL[side];
  return sideLabel ? `${base}, ${sideLabel}` : base;
}

/**
 * A shorter version without laterality, for compact lists (e.g. command
 * palette). Keeps the original term mostly intact.
 */
export function formatShortName(canonical: string): string {
  let base = canonical.replace(SUFFIX_RE, '');
  base = base.replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}
