// src/data/pathology/elbow.ts
//
// Pathological movement presets for the elbow region. Split out of the old
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

export const ELBOW_PATHOLOGIES: MovementPathology[] = [
  {
    id: 'elbow-flexion-contracture',
    name: 'Contractura en flexión',
    chip: 'Contractura',
    summary: 'El codo pierde los últimos grados de extensión y queda algo flexionado.',
    mechanism:
      'Retracción capsular y del braquial tras inmovilización, traumatismo o artrosis: el codo no alcanza los 0° y conserva una flexión residual.',
    whyItHurts:
      'La extensión terminal es lo primero que se pierde y lo más difícil de recuperar; limita alcanzar y cargar con el brazo estirado.',
    implicated: ['brachialis', 'biceps-brachii'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['elbow-flexion', 'elbow-extension'],
    rangeFloorDeg: 30,
  },
  {
    id: 'lateral-epicondylitis',
    name: 'Epicondilalgia lateral (codo de tenista)',
    chip: 'Epicondilalgia',
    summary: 'Tendinopatía del origen extensor común en el epicóndilo lateral.',
    mechanism:
      'Sobrecarga por prensión y extensión de muñeca repetidas: el origen extensor común (sobre todo el ECRB) se degenera en el epicóndilo lateral.',
    whyItHurts:
      'Duele el epicóndilo lateral con la extensión resistida de muñeca y la prensión; el codo no pierde recorrido, pero cargar en extensión reproduce el dolor.',
    implicated: ['common-extensor-origin'],
    cite: [{ ref: 'saroja-2014', pageVerified: false }],
    appliesTo: ['elbow-extension'],
  },
];
