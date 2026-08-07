// src/data/pathology/knee.ts
//
// Pathological movement presets for the knee region. Split out of the old
// single pathologies.ts so each region ships separately: the free region stays
// bundled, the paid ones are served by the entitlement-checked "content" edge
// function (see data/premiumStore.ts).
//
// These presets are the product's strongest differentiator -- no other atlas
// shows an ALTERED movement pattern with its mechanism and implicated
// structure -- so they are exactly the content that must not be public.
//
// Every figure stays "modelled, not invented": each preset carries its cite.

import type { MovementPathology } from '../pathologies';

export const KNEE_PATHOLOGIES: MovementPathology[] = [
  {
    id: 'knee-extension-lag',
    name: 'Déficit de extensión (extension lag)',
    chip: 'Extension lag',
    summary:
      'El cuádriceps no completa los últimos grados: la rodilla no llega a estirarse del todo.',
    mechanism:
      'Debilidad o inhibición del cuádriceps (frecuente tras cirugía, derrame o dolor): en el rango terminal, con el peor brazo de palanca, la extensión activa queda incompleta y persiste una flexión residual.',
    whyItHurts:
      'La rodilla queda flexionada en apoyo: falla el bloqueo en extensión, se sobrecargan cuádriceps y fémoro-patelar y se altera la marcha.',
    implicated: ['vastus-medialis', 'rectus-femoris'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['knee-flexion', 'knee-extension'],
    rangeFloorDeg: 12,
  },
  {
    id: 'knee-patellar-maltracking',
    name: 'Maltracking rotuliano (déficit del VMO)',
    chip: 'Maltracking',
    summary:
      'La rótula se desliza lateralmente por déficit del vasto medial oblicuo.',
    mechanism:
      'Cuando el vasto medial oblicuo no contrarresta la tracción lateral del vasto lateral, la rótula sigue una trayectoria lateral, sobre todo en los primeros 0-30° de extensión.',
    whyItHurts:
      'Aumenta la presión en la faceta lateral fémoro-patelar → dolor anterior de rodilla y crepitación al subir y bajar escaleras.',
    implicated: ['vastus-medialis'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['knee-flexion', 'knee-extension'],
  },
];
