// src/data/pathology/cervical.ts
//
// Pathological movement presets for the cervical region. Split out of the old
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

export const CERVICAL_PATHOLOGIES: MovementPathology[] = [
  {
    id: 'cervical-whiplash',
    name: 'Latigazo cervical (whiplash)',
    chip: 'Whiplash',
    summary:
      'Restricción dolorosa de la rotación tras un mecanismo de aceleración-desaceleración.',
    mechanism:
      'Tras el latigazo, la rotación es el movimiento más limitado y los flexores profundos (largo del cuello/cabeza) se inhiben, delegando en los superficiales (ECOM).',
    whyItHurts:
      'Girar la cabeza reproduce el dolor y queda restringido; la inhibición del control profundo perpetúa la cervicalgia.',
    implicated: ['longus-colli', 'sternocleidomastoid'],
    cite: [{ ref: 'magee', pageVerified: false }],
    appliesTo: ['cervical-rotation'],
    rangeCapDeg: 50,
  },
];
