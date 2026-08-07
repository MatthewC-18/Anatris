// src/data/pathology/thoracic.ts
//
// Pathological movement presets for the thoracic region. Split out of the old
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

export const THORACIC_PATHOLOGIES: MovementPathology[] = [
  {
    id: 'thoracic-hyperkyphosis',
    name: 'Hipercifosis / rigidez torácica',
    chip: 'Hipercifosis',
    summary: 'Aumento de la cifosis con pérdida de la extensión torácica.',
    mechanism:
      'La rigidez articular y el acortamiento anterior fijan el tórax en flexión: la extensión (enderezar la cifosis) es lo primero que se pierde y el erector trabaja en desventaja.',
    whyItHurts:
      'Limita la elevación del brazo y la respiración, y sobrecarga las charnelas cervicotorácica y toracolumbar por compensación.',
    implicated: ['longissimus-thoracis', 'iliocostalis-thoracis'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['thoracic-extension'],
    rangeCapDeg: 12,
  },
];
