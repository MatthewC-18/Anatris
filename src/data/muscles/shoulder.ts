// src/data/muscles/shoulder.ts
//
// Shoulder muscle data — STARTING with the rotator cuff as the proof of
// concept. The rotator cuff is the clinical heart of the shoulder and the
// model gives us clean data for all four muscles (belly + origin + insertion,
// both sides), so it's the right place to validate the whole pipeline.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ CLINICAL CONTENT DISCLAIMER                                               │
// │ The origin / insertion / innervation / action fields below are drafted    │
// │ from standard anatomical references and are intended as a well-structured │
// │ STARTING POINT. Before this ships in a clinical/professional product,     │
// │ every field must be verified against an authoritative source (e.g. a      │
// │ current edition of a standard anatomy text). Treat them as draft copy.    │
// └─────────────────────────────────────────────────────────────────────────┘
//
// The `meshBases` arrays use the exact parseMeshName() base names extracted
// from the live model, so each muscle resolves to its real meshes.

import type { Muscle, MuscleRegion } from '../../types/muscle';

const rotatorCuff: Muscle[] = [
  {
    id: 'supraspinatus',
    name: 'Supraespinoso',
    latin: 'Musculus supraspinatus',
    meshBases: ['Supraspinatus_muscle'],
    layer: 'muscles',
    groups: ['rotator-cuff', 'abductor'],
    origin: 'Fosa supraespinosa de la escápula.',
    insertion:
      'Faceta superior del troquíter (tubérculo mayor) del húmero; parte de su tendón se fusiona con la cápsula articular glenohumeral.',
    innervation: 'Nervio supraescapular',
    roots: ['C5', 'C6'],
    actions: [
      {
        joint: 'Glenohumeral',
        movement: 'Abducción',
        note: 'Inicia los primeros ~15° de abducción; sinergista del deltoides en el resto del rango.',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Estabilización',
        note: 'Comprime y centra la cabeza humeral en la cavidad glenoidea.',
      },
    ],
    clinicalNote:
      'El tendón supraespinoso es el más frecuentemente afectado en el síndrome de pinzamiento subacromial y en los desgarros del manguito. Se evalúa con la maniobra de Jobe (lata vacía).',
  },
  {
    id: 'infraspinatus',
    name: 'Infraespinoso',
    latin: 'Musculus infraspinatus',
    meshBases: ['Infraspinatus_muscle'],
    layer: 'muscles',
    groups: ['rotator-cuff', 'external-rotator'],
    origin: 'Fosa infraespinosa de la escápula.',
    insertion: 'Faceta media del troquíter (tubérculo mayor) del húmero.',
    innervation: 'Nervio supraescapular',
    roots: ['C5', 'C6'],
    actions: [
      {
        joint: 'Glenohumeral',
        movement: 'Rotación externa',
        note: 'Principal rotador externo junto con el redondo menor.',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Estabilización',
        note: 'Refuerza la cápsula posterior y centra la cabeza humeral.',
      },
    ],
    clinicalNote:
      'Su debilidad o atrofia es común en deportes de lanzamiento. Se evalúa con la rotación externa resistida con el codo a 90°.',
  },
  {
    id: 'teres-minor',
    name: 'Redondo menor',
    latin: 'Musculus teres minor',
    meshBases: ['Teres_minor_muscle'],
    layer: 'muscles',
    groups: ['rotator-cuff', 'external-rotator'],
    origin: 'Borde lateral de la escápula (mitad superior).',
    insertion: 'Faceta inferior del troquíter (tubérculo mayor) del húmero.',
    innervation: 'Nervio axilar',
    roots: ['C5', 'C6'],
    actions: [
      {
        joint: 'Glenohumeral',
        movement: 'Rotación externa',
        note: 'Sinergista del infraespinoso.',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Aducción',
        note: 'Contribución menor; también estabiliza la cabeza humeral.',
      },
    ],
    clinicalNote:
      'Inervado por el nervio axilar, a diferencia del resto del manguito. Se evalúa con la maniobra de Patte.',
  },
  {
    id: 'subscapularis',
    name: 'Subescapular',
    latin: 'Musculus subscapularis',
    meshBases: ['Subscapularis_muscle'],
    layer: 'muscles',
    groups: ['rotator-cuff', 'internal-rotator'],
    origin: 'Fosa subescapular (cara anterior/costal de la escápula).',
    insertion: 'Troquín (tubérculo menor) del húmero.',
    innervation: 'Nervios subescapulares superior e inferior',
    roots: ['C5', 'C6', 'C7'],
    actions: [
      {
        joint: 'Glenohumeral',
        movement: 'Rotación interna',
        note: 'Principal rotador interno del manguito.',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Estabilización',
        note: 'Único componente anterior del manguito; previene la traslación anterior de la cabeza humeral.',
      },
    ],
    clinicalNote:
      'Se evalúa con la maniobra de Gerber (lift-off) y el belly-press. Su lesión se asocia a inestabilidad anterior.',
  },
];

export const shoulderRegion: MuscleRegion = {
  id: 'shoulder',
  name: 'Hombro',
  muscles: [...rotatorCuff],
};

/** Flat export for convenience / lookups. */
export const shoulderMuscles: Muscle[] = shoulderRegion.muscles;
