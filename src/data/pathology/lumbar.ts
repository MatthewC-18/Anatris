// src/data/pathology/lumbar.ts
//
// Pathological movement presets for the lumbar region. Split out of the old
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

export const LUMBAR_PATHOLOGIES: MovementPathology[] = [
  {
    id: 'lumbar-instability',
    name: 'Inestabilidad segmentaria lumbar',
    chip: 'Inestabilidad',
    summary:
      'Movimiento aberrante y "catch" doloroso, sobre todo al reincorporarse de la flexión.',
    mechanism:
      'El fallo del control profundo (multífido + transverso, con retardo del feed-forward) deja un segmento con exceso de traslación en la zona neutra.',
    whyItHurts:
      'Aparece un arco doloroso y un "catch"/desviación al volver de la flexión; el paciente "trepa" sobre los muslos (signo de Gower).',
    implicated: ['multifidus-lumborum', 'transversus-abdominis'],
    cite: [{ ref: 'hicks-2005', pageVerified: false }],
    appliesTo: ['lumbar-flexion', 'lumbar-extension'],
  },
  {
    id: 'lumbar-disc-herniation',
    name: 'Hernia discal lumbar',
    chip: 'Hernia',
    summary: 'La flexión provoca dolor y limita el recorrido (patrón discogénico).',
    mechanism:
      'La flexión sube la presión intradiscal y desplaza el núcleo hacia atrás: con hernia posterolateral el arco de flexión se restringe y puede irradiar.',
    whyItHurts:
      'Flexionar (sentarse, atarse los zapatos) reproduce el dolor y a veces la irradiación radicular; la extensión suele aliviar (preferencia direccional).',
    implicated: ['multifidus-lumborum', 'transversus-abdominis'],
    cite: [{ ref: 'deville-2000', pageVerified: false }],
    appliesTo: ['lumbar-flexion'],
    rangeCapDeg: 35,
  },
];
