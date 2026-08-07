// src/data/pathology/shoulder.ts
//
// Pathological movement presets for the shoulder region. Split out of the old
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

export const SHOULDER_PATHOLOGIES: MovementPathology[] = [
  {
    id: 'scapular-dyskinesis',
    name: 'Discinesia escapular',
    chip: 'Discinesia',
    summary:
      'Alteración del control de la escápula: rota y bascula menos durante la elevación.',
    mechanism:
      'La rotación superior de la escápula (serrato anterior + trapecio inferior) disminuye, de modo que el húmero asume más del arco: el ritmo escapulohumeral se descompensa y la proporción húmero:escápula se dispara.',
    whyItHurts:
      'Con la escápula "quieta", la glenoides no se orienta a tiempo y el troquíter choca antes contra el arco coracoacromial: reaparece el arco doloroso y el manguito se sobrecarga.',
    implicated: ['serratus-anterior', 'trapezius'],
    cite: [{ ref: 'kibler-2013', pageVerified: false }],
    appliesTo: ['glenohumeral-abduction'],
    shoulderMod: { scapulaGainMul: 0.5 },
  },
  {
    id: 'subacromial-impingement',
    name: 'Pinzamiento subacromial',
    chip: 'Pinzamiento',
    summary:
      'Conflicto del manguito y la bursa en el espacio subacromial durante la elevación.',
    mechanism:
      'El par depresor del manguito (supraespinoso/infraespinoso) no centra la cabeza humeral y, con frecuencia, se asocia una menor rotación superior de la escápula: la cabeza asciende y estrecha el espacio subacromial.',
    whyItHurts:
      'Entre 60 y 120° el troquíter y la bursa quedan atrapados bajo el acromion → arco doloroso. Ceden primero el supraespinoso y la bursa subacromial.',
    implicated: ['supraspinatus', 'infraspinatus'],
    cite: [{ ref: 'ludewig-2009', pageVerified: false }],
    appliesTo: ['glenohumeral-abduction'],
    shoulderMod: { scapulaGainMul: 0.8 },
  },
  {
    id: 'frozen-shoulder',
    name: 'Hombro congelado (capsulitis adhesiva)',
    chip: 'Congelado',
    summary: 'Restricción capsular global: pérdida de movilidad activa y pasiva.',
    mechanism:
      'La cápsula fibrótica limita el deslizamiento glenohumeral. La elevación se topa pronto (~115°) y la escápula "encoge" para sustituir (báscula/elevación compensatoria).',
    whyItHurts:
      'Patrón capsular: la rotación externa es la más limitada, luego la abducción. Forzar la elevación solo sube el muñón del hombro (sustitución escapular), sin ganar arco real.',
    implicated: ['subscapularis', 'trapezius'],
    cite: [{ ref: 'kelley-2013', pageVerified: false }],
    appliesTo: ['glenohumeral-abduction'],
    shoulderMod: { scapulaGainMul: 1.25 },
    rangeCapDeg: 115,
  },
];
