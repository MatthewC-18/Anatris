// src/data/pathology/ankle.ts
//
// Pathological movement presets for the ankle region. Split out of the old
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

export const ANKLE_PATHOLOGIES: MovementPathology[] = [
  {
    id: 'ankle-dorsiflexion-restriction',
    name: 'Restricción de dorsiflexión',
    chip: 'Dorsiflexión',
    summary:
      'El tobillo no alcanza los grados de dorsiflexión que la marcha y la sentadilla necesitan.',
    mechanism:
      'Retracción del tríceps sural o bloqueo del deslizamiento posterior del astrágalo en la mortaja: la tibia no puede avanzar sobre el pie en la fase media de apoyo.',
    whyItHurts:
      'El cuerpo busca los grados que faltan río abajo y río arriba: pronación compensatoria del retropié, valgo dinámico de rodilla y despegue precoz del talón. Es un factor de riesgo reconocido de dolor femoropatelar y de tendinopatía aquílea.',
    implicated: ['gastrocnemius', 'soleus'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['ankle-dorsiflexion'],
    rangeCapDeg: 8,
  },
  {
    id: 'ankle-lateral-instability',
    name: 'Inestabilidad lateral crónica',
    chip: 'Inestabilidad',
    summary:
      'Tras esguinces de repetición, la inversión gana recorrido y pierde control.',
    mechanism:
      'La laxitud del ligamento peroneoastragalino anterior, unida al déficit propioceptivo y a la reacción tardía de los peroneos, deja el retropié sin freno en la inversión.',
    whyItHurts:
      'Sensación de fallo en terreno irregular y esguinces de repetición. El problema no es solo el ligamento: es el retardo del reflejo peroneo, y por eso el trabajo propioceptivo es el tratamiento de referencia.',
    implicated: ['fibularis-longus', 'fibularis-brevis'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['ankle-inversion'],
  },
  {
    id: 'ankle-achilles-tendinopathy',
    name: 'Tendinopatía aquílea',
    chip: 'Aquíleo',
    summary:
      'Dolor y pérdida de fuerza en la flexión plantar contra carga.',
    mechanism:
      'Degeneración por sobrecarga del tendón calcáneo, habitualmente en su porción media. El recorrido pasivo se conserva, pero la flexión plantar bajo carga duele y pierde potencia.',
    whyItHurts:
      'Dolor y rigidez matutina en el tendón, dolor al iniciar la carrera que mejora al calentar y reaparece después. El talón despega con menos fuerza y el paso se acorta.',
    implicated: ['gastrocnemius', 'soleus'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['ankle-plantarflexion'],
    rangeCapDeg: 35,
  },
  {
    id: 'ankle-tibialis-posterior-dysfunction',
    name: 'Disfunción del tibial posterior',
    chip: 'Tibial post.',
    summary:
      'El sostén activo del arco medial falla y el retropié se va a valgo: la inversión pierde fuerza.',
    mechanism:
      'La insuficiencia del tibial posterior, principal inversor y sostén dinámico del arco longitudinal medial, deja que el retropié caiga en valgo y el antepié abduzca (pie plano adquirido del adulto).',
    whyItHurts:
      'Dolor por dentro del tobillo, por detrás del maléolo medial, con incapacidad progresiva de ponerse de puntillas sobre un solo pie. Vista por detrás, aparece el signo de "demasiados dedos".',
    implicated: ['tibialis-posterior', 'flexor-digitorum-longus'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['ankle-inversion'],
    rangeCapDeg: 15,
  },
  {
    id: 'ankle-peroneal-tendinopathy',
    name: 'Tendinopatía de los peroneos',
    chip: 'Peroneos',
    summary:
      'La eversión duele y pierde fuerza: el freno lateral del tobillo trabaja de más.',
    mechanism:
      'Sobrecarga de los tendones peroneos en su trayecto retromaleolar, habitualmente secundaria a esguinces de repetición o a un retropié varo: los peroneos compensan de forma continua la tendencia a la inversión.',
    whyItHurts:
      'Dolor por detrás y por debajo del maléolo lateral, que aumenta al caminar por terreno irregular y a la eversión resistida. Con frecuencia coexiste con la inestabilidad lateral crónica: son las dos caras del mismo problema.',
    implicated: ['fibularis-longus', 'fibularis-brevis'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['ankle-eversion'],
    rangeCapDeg: 8,
  },
];
