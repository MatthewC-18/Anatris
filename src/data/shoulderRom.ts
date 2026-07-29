// src/data/shoulderRom.ts
//
// Range-of-motion data for the shoulder, modeled as JOINT MOVEMENTS with a
// phase breakdown (see src/types/rom.ts for the rationale: degrees belong to
// the movement, muscles contribute to ranges).
//
// AUTHORING RULES (same spirit as the clinical muscle content):
//   1. Degree ranges and phase boundaries are standard but vary slightly by
//      source. They're authored from Kapandji/Oatis conventions. NEVER invent a
//      page; every Citation is pageVerified:false until checked in your copy.
//   2. Muscle ids must match src/data/muscles/shoulder.ts exactly (kebab-case).
//   3. Spanish, user-facing, concise prose.
//
// ENCODING / AUTHORING RULE:
//   - User-facing strings (name, joint, plane, overview, label, description,
//     note): Latin American Spanish WITH accents and enies, UTF-8.
//   - Code, ids, keys, enum-like values (id, muscleId, role, region, ref) and
//     comments: ASCII.
//   - Editor ALWAYS UTF-8 without BOM.
//
// Status: abduction authored in full as the reference template (its 3-phase arc
// is the clearest teaching case). Flexion + rotations authored with the same
// structure. All page locators UNVERIFIED.

import type { RomMovement, RomMovementIndex } from '../types/rom';

const abduction: RomMovement = {
  id: 'glenohumeral-abduction',
  name: 'Abducción',
  joint: 'Glenohumeral (con participación escapulotorácica)',
  plane: 'Frontal',
  totalRangeDeg: { min: 0, max: 180 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'La elevación del brazo en el plano frontal hasta 180° no es solo glenohumeral: combina movimiento en la articulación glenohumeral y rotación de la escápula sobre el tórax, en una proporción aproximada de 2:1 (ritmo escapulohumeral). Distintos músculos lideran en distintos tramos del arco.',
  region: 'shoulder',
  // Frontal plane -> rig local Z. Advisory data for markers/camera framing.
  rig: { axis: [0, 0, 1] },
  // Lab-only: the arc continues past neutral into cross-body ADDUCTION, so the
  // lab can sweep a signed abduccion/aduccion arc through 0.
  labReverse: {
    name: 'Aducción',
    minDeg: -30,
    phases: [
      {
        startDeg: -30,
        endDeg: 0,
        label: 'Aducción',
        description:
          'Desde la abducción, llevar el brazo hacia la línea media (y cruzarla) es trabajo del pectoral mayor, el dorsal ancho y el redondo mayor. El subescapular acompaña centrando la cabeza humeral.',
        muscles: [
          {
            muscleId: 'pectoralis-major',
            role: 'prime-mover',
            note: 'Aductor potente, sobre todo al cruzar la línea media.',
          },
          {
            muscleId: 'latissimus-dorsi',
            role: 'prime-mover',
            note: 'Aductor y extensor; desciende y aproxima el húmero.',
          },
          { muscleId: 'teres-major', role: 'assistant' },
          { muscleId: 'subscapularis', role: 'stabilizer' },
        ],
        cite: [
          { ref: 'kapandji', pageVerified: false },
          { ref: 'oatis', pageVerified: false },
        ],
      },
    ],
  },
  phases: [
    {
      startDeg: 0,
      endDeg: 30,
      label: 'Fase de ajuste (0-30°)',
      description:
        'El supraespinoso y el deltoides se activan JUNTOS desde el primer grado (coactivación electromiográfica, no "primero el supraespinoso y luego el deltoides"). A 0° el supraespinoso tiene el mejor brazo de palanca: inicia la abducción y, con el resto del manguito, comprime y centra la cabeza humeral. El deltoides ya trabaja, pero con su línea de acción casi vertical rinde poco torque. La escápula permanece en su posición de "ajuste", con rotación variable y mínima: el movimiento es prácticamente glenohumeral.',
      muscles: [
        {
          muscleId: 'supraspinatus',
          role: 'prime-mover',
          note: 'Mejor brazo de palanca a 0°: inicia la abducción y comprime la cabeza humeral. Coactivo con el deltoides desde el primer grado.',
        },
        {
          muscleId: 'deltoid',
          role: 'prime-mover',
          note: 'Activo desde 0°, pero con escasa ventaja mecánica cerca de la vertical; su torque crece hacia los 90°.',
        },
        {
          muscleId: 'infraspinatus',
          role: 'stabilizer',
          note: 'Con el subescapular, par depresor-centrador de la cabeza humeral.',
        },
        { muscleId: 'subscapularis', role: 'stabilizer' },
        { muscleId: 'teres-minor', role: 'stabilizer' },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      startDeg: 30,
      endDeg: 90,
      label: 'Rango medio (deltoides motor)',
      flag: {
        label: 'Arco doloroso',
        detail:
          'Aquí comienza el conflicto subacromial (60-120°) si el espacio está comprometido.',
        tone: 'warn',
      },
      description:
        'La porción acromial (media) del deltoides se vuelve el motor principal y alcanza su máxima ventaja mecánica cerca de los 90°. El supraespinoso sigue abduciendo y, con el manguito, forma el par de fuerzas que deprime la cabeza para que no ascienda contra el acromion. Desde los ~30° la escápula empieza su rotación superior en el ritmo ~2:1 (trapecio + serrato anterior). Es aquí donde comienza el arco doloroso (60-120°) cuando el espacio subacromial está comprometido.',
      muscles: [
        {
          muscleId: 'deltoid',
          role: 'prime-mover',
          note: 'Porción acromial (media): motor principal, ventaja mecánica máxima cerca de 90°.',
        },
        {
          muscleId: 'supraspinatus',
          role: 'assistant',
          note: 'Sigue abduciendo y deprime la cabeza humeral (par de fuerzas con el deltoides).',
        },
        {
          muscleId: 'infraspinatus',
          role: 'stabilizer',
          note: 'Par depresor que impide el ascenso de la cabeza y el pinzamiento.',
        },
        { muscleId: 'subscapularis', role: 'stabilizer' },
        {
          muscleId: 'serratus-anterior',
          role: 'assistant',
          note: 'Desde ~30° inicia la rotación superior de la escápula (ritmo escapulohumeral ~2:1).',
        },
        {
          muscleId: 'trapezius',
          role: 'assistant',
          note: 'Acompaña la rotación superior escapular desde el rango medio.',
        },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      startDeg: 90,
      endDeg: 120,
      label: 'Transición a la elevación (90-120°)',
      flag: {
        label: 'Arco doloroso',
        detail:
          'La rotación externa del húmero libera el troquíter del arco coracoacromial.',
        tone: 'warn',
      },
      description:
        'Pasados los 90° la actividad del deltoides empieza a descender mientras el brazo sigue subiendo: la rotación superior de la escápula (serrato anterior y trapecio inferior) se convierte en el motor de la elevación. El húmero rota externamente para hacer rodar el troquíter y liberarlo del arco coracoacromial. El deltoides sigue generando torque glenohumeral, pero ya no es el único protagonista.',
      muscles: [
        {
          muscleId: 'serratus-anterior',
          role: 'prime-mover',
          note: 'Motor de la rotación superior escapular: asume la elevación pasados los 90°.',
        },
        {
          muscleId: 'trapezius',
          role: 'prime-mover',
          note: 'Fibras inferiores: rotación superior y báscula posterior de la escápula.',
        },
        {
          muscleId: 'deltoid',
          role: 'prime-mover',
          note: 'Sigue elevando el húmero, aunque su actividad EMG desciende tras los 90°.',
        },
        {
          muscleId: 'infraspinatus',
          role: 'stabilizer',
          note: 'Rotación externa que libera el troquíter del arco coracoacromial.',
        },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      startDeg: 120,
      endDeg: 180,
      label: 'Elevación completa (120-180°)',
      flag: {
        label: 'Control escapular',
        detail:
          'Su fallo en esta fase reproduce el pinzamiento y limita la vertical.',
        tone: 'pearl',
      },
      description:
        'En el último tercio la articulación glenohumeral se acerca a su techo (~120°), de modo que la rotación superior de la escápula predomina para completar el arco: el serrato anterior y el trapecio inferior orientan la glenoides hacia arriba, manteniendo la congruencia y dejando espacio al troquíter. Un fallo del control escapular en esta fase reproduce el conflicto subacromial y limita la vertical.',
      muscles: [
        {
          muscleId: 'serratus-anterior',
          role: 'prime-mover',
          note: 'Con el trapecio, completa la rotación superior escapular hasta la vertical.',
        },
        {
          muscleId: 'trapezius',
          role: 'prime-mover',
          note: 'Fibras inferiores: sostienen la glenoides orientada hacia arriba.',
        },
        { muscleId: 'deltoid', role: 'assistant' },
        {
          muscleId: 'supraspinatus',
          role: 'stabilizer',
          note: 'Mantiene centrada la cabeza humeral en el arco final.',
        },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],
  activations: [
    {
      muscleId: 'supraspinatus',
      role: 'prime-mover',
      note: 'Inicia la abducción con su mejor palanca a 0° y sigue centrando la cabeza humeral.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.9 },
        { deg: 30, level: 1 },
        { deg: 90, level: 0.7 },
        { deg: 180, level: 0.5 },
      ],
    },
    {
      muscleId: 'deltoid',
      role: 'prime-mover',
      note: 'Motor de la elevación; su torque crece hasta el máximo cerca de 90-100°.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.3 },
        { deg: 30, level: 0.6 },
        { deg: 90, level: 1 },
        { deg: 120, level: 0.9 },
        { deg: 180, level: 0.72 },
      ],
    },
    {
      muscleId: 'infraspinatus',
      role: 'stabilizer',
      note: 'Par depresor-centrador; su rotación externa libera el troquíter tras los 90°.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.4 },
        { deg: 60, level: 0.5 },
        { deg: 120, level: 0.75 },
        { deg: 180, level: 0.6 },
      ],
    },
    {
      muscleId: 'teres-minor',
      role: 'stabilizer',
      note: 'Acompaña al infraespinoso como depresor y rotador externo del manguito.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.3 },
        { deg: 120, level: 0.5 },
        { deg: 180, level: 0.5 },
      ],
    },
    {
      muscleId: 'subscapularis',
      role: 'stabilizer',
      note: 'Centrador anterior; estabiliza en todo el arco y aduce en el tramo negativo.',
      curve: [
        { deg: -30, level: 0.4 },
        { deg: 0, level: 0.35 },
        { deg: 90, level: 0.42 },
        { deg: 180, level: 0.35 },
      ],
    },
    {
      muscleId: 'serratus-anterior',
      role: 'prime-mover',
      note: 'Rotación superior de la escápula; entra tras la fase de ajuste (~30°) y domina el tramo alto.',
      curve: [
        { deg: 30, level: 0 },
        { deg: 60, level: 0.4 },
        { deg: 120, level: 0.85 },
        { deg: 180, level: 1 },
      ],
    },
    {
      muscleId: 'trapezius',
      role: 'prime-mover',
      note: 'Con el serrato forma el par de rotación superior escapular; pico al final del arco.',
      curve: [
        { deg: 30, level: 0 },
        { deg: 60, level: 0.4 },
        { deg: 120, level: 0.8 },
        { deg: 180, level: 1 },
      ],
    },
    {
      muscleId: 'pectoralis-major',
      role: 'prime-mover',
      note: 'Solo en el tramo de ADUCCIÓN (bajo 0°): aductor potente al cruzar la línea media.',
      curve: [
        { deg: -30, level: 1 },
        { deg: 0, level: 0.15 },
        { deg: 8, level: 0 },
      ],
    },
    {
      muscleId: 'latissimus-dorsi',
      role: 'prime-mover',
      note: 'Aductor-extensor en el tramo de aducción; desciende y aproxima el húmero.',
      curve: [
        { deg: -30, level: 0.9 },
        { deg: 0, level: 0.15 },
        { deg: 8, level: 0 },
      ],
    },
    {
      muscleId: 'teres-major',
      role: 'assistant',
      note: 'Asiste la aducción contra resistencia en el tramo negativo.',
      curve: [
        { deg: -30, level: 0.7 },
        { deg: 0, level: 0.1 },
        { deg: 8, level: 0 },
      ],
    },
  ],
};

const flexion: RomMovement = {
  id: 'glenohumeral-flexion',
  name: 'Flexión',
  joint: 'Glenohumeral (con participación escapulotorácica)',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 180 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Elevación del brazo hacia adelante en el plano sagital. Como en la abducción, los últimos grados dependen de la rotación superior de la escápula.',
  region: 'shoulder',
  // Sagittal plane -> rig local X.
  rig: { axis: [1, 0, 0] },
  // Lab-only: the arc continues past neutral into EXTENSION, so a flexion in the
  // lab arranca desde la extensión máxima y barre hasta la flexión completa.
  labReverse: {
    name: 'Extensión',
    minDeg: -60,
    phases: [
      {
        startDeg: -60,
        endDeg: 0,
        label: 'Extensión',
        description:
          'Llevar el brazo hacia atrás en el plano sagital lo realizan el dorsal ancho, el redondo mayor y la porción espinal (posterior) del deltoides; la porción larga del tríceps asiste desde la escápula.',
        muscles: [
          {
            muscleId: 'latissimus-dorsi',
            role: 'prime-mover',
            note: 'Principal extensor del hombro desde la flexión.',
          },
          {
            muscleId: 'deltoid',
            role: 'prime-mover',
            note: 'Porción espinal (posterior): extensor y rotador externo.',
          },
          { muscleId: 'teres-major', role: 'assistant' },
          {
            muscleId: 'triceps-brachii',
            role: 'assistant',
            note: 'Porción larga; cruza el hombro y asiste la extensión.',
          },
        ],
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
    ],
  },
  phases: [
    {
      startDeg: 0,
      endDeg: 60,
      label: 'Inicio',
      description:
        'La porción clavicular (anterior) del deltoides y el pectoral mayor (cabeza clavicular) impulsan los primeros grados de flexión.',
      muscles: [
        {
          muscleId: 'deltoid',
          role: 'prime-mover',
          note: 'Porción clavicular (anterior).',
        },
        {
          muscleId: 'pectoralis-major',
          role: 'assistant',
          note: 'Cabeza clavicular; flexiona el brazo desde la extensión.',
        },
        {
          muscleId: 'coracobrachialis',
          role: 'assistant',
        },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 60,
      endDeg: 120,
      label: 'Rango medio',
      flag: {
        label: 'Pinzamiento anterior (Neer)',
        detail:
          'La flexión hacia adelante lleva el troquíter y el supraespinoso bajo el arco coracoacromial: es la base del signo de Neer.',
        tone: 'warn',
      },
      description:
        'El deltoides anterior sostiene la elevación mientras la escápula suma su rotación superior en el ritmo escapulohumeral (~2:1): el trapecio y el serrato anterior orientan la glenoides hacia arriba. El manguito mantiene centrada la cabeza humeral.',
      muscles: [
        {
          muscleId: 'deltoid',
          role: 'prime-mover',
          note: 'Porción clavicular (anterior): motor de la flexión.',
        },
        {
          muscleId: 'serratus-anterior',
          role: 'assistant',
          note: 'Inicia la rotación superior de la escápula (ritmo escapulohumeral ~2:1).',
        },
        {
          muscleId: 'trapezius',
          role: 'assistant',
          note: 'Acompaña la rotación superior escapular.',
        },
        { muscleId: 'supraspinatus', role: 'stabilizer' },
        { muscleId: 'infraspinatus', role: 'stabilizer' },
        { muscleId: 'subscapularis', role: 'stabilizer' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 120,
      endDeg: 180,
      label: 'Final',
      flag: {
        label: 'Rotación superior escapular obligada',
        detail:
          'Sin la báscula de la escápula (serrato anterior + trapecio inferior) el brazo no alcanza la vertical; su fallo limita la flexión y reproduce el conflicto.',
        tone: 'pearl',
      },
      description:
        'En el último tercio la glenohumeral se acerca a su techo, de modo que la rotación superior de la escápula predomina para completar el arco: el serrato anterior y el trapecio inferior orientan la glenoides hacia arriba y llevan la mano a la vertical. El manguito mantiene centrada la cabeza humeral hasta el final.',
      muscles: [
        { muscleId: 'trapezius', role: 'prime-mover' },
        { muscleId: 'serratus-anterior', role: 'prime-mover' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'deltoid',
      role: 'prime-mover',
      note: 'Porción clavicular (anterior) en la flexión; la espinal (posterior) trabaja en la extensión.',
      curve: [
        { deg: -60, level: 0.6 },
        { deg: -20, level: 0.4 },
        { deg: 0, level: 0.45 },
        { deg: 90, level: 1 },
        { deg: 180, level: 0.7 },
      ],
    },
    {
      muscleId: 'pectoralis-major',
      role: 'assistant',
      note: 'Cabeza clavicular; impulsa los primeros grados de flexión y decae en la elevación alta.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.45 },
        { deg: 60, level: 0.6 },
        { deg: 120, level: 0.3 },
        { deg: 180, level: 0.15 },
      ],
    },
    {
      muscleId: 'coracobrachialis',
      role: 'assistant',
      note: 'Lleva el brazo adelante; aporte máximo en el inicio de la flexión.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.45 },
        { deg: 60, level: 0.5 },
        { deg: 120, level: 0.3 },
        { deg: 180, level: 0.2 },
      ],
    },
    {
      muscleId: 'serratus-anterior',
      role: 'prime-mover',
      note: 'Rotación superior escapular; entra hacia los 60° y domina la elevación alta.',
      curve: [
        { deg: 60, level: 0 },
        { deg: 90, level: 0.5 },
        { deg: 180, level: 1 },
      ],
    },
    {
      muscleId: 'trapezius',
      role: 'prime-mover',
      note: 'Par de rotación superior con el serrato; pico en el tramo final.',
      curve: [
        { deg: 60, level: 0 },
        { deg: 90, level: 0.45 },
        { deg: 180, level: 1 },
      ],
    },
    {
      muscleId: 'supraspinatus',
      role: 'stabilizer',
      note: 'Manguito: centra la cabeza humeral a lo largo de la elevación.',
      curve: [
        { deg: -30, level: 0.25 },
        { deg: 0, level: 0.35 },
        { deg: 180, level: 0.42 },
      ],
    },
    {
      muscleId: 'infraspinatus',
      role: 'stabilizer',
      note: 'Centrador posterior del manguito durante la flexión.',
      curve: [
        { deg: -30, level: 0.25 },
        { deg: 0, level: 0.35 },
        { deg: 180, level: 0.45 },
      ],
    },
    {
      muscleId: 'subscapularis',
      role: 'stabilizer',
      note: 'Centrador anterior del manguito durante la flexión.',
      curve: [
        { deg: -30, level: 0.25 },
        { deg: 0, level: 0.35 },
        { deg: 180, level: 0.4 },
      ],
    },
    {
      muscleId: 'latissimus-dorsi',
      role: 'prime-mover',
      note: 'Solo en el tramo de EXTENSIÓN (bajo 0°): principal extensor del hombro.',
      curve: [
        { deg: -60, level: 1 },
        { deg: 0, level: 0.15 },
        { deg: 8, level: 0 },
      ],
    },
    {
      muscleId: 'teres-major',
      role: 'assistant',
      note: 'Asiste la extensión en el tramo negativo.',
      curve: [
        { deg: -60, level: 0.7 },
        { deg: 0, level: 0.1 },
        { deg: 8, level: 0 },
      ],
    },
    {
      muscleId: 'triceps-brachii',
      role: 'assistant',
      note: 'Porción larga: cruza el hombro y asiste la extensión en el tramo negativo.',
      curve: [
        { deg: -60, level: 0.5 },
        { deg: 0, level: 0.1 },
        { deg: 8, level: 0 },
      ],
    },
  ],
};

const externalRotation: RomMovement = {
  id: 'glenohumeral-external-rotation',
  name: 'Rotación externa',
  joint: 'Glenohumeral',
  plane: 'Transversal',
  totalRangeDeg: { min: 0, max: 80 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Rotación del húmero hacia afuera, evaluada con el codo flexionado a 90° y pegado al cuerpo. Rango aproximado de 80°, variable entre fuentes y sujetos.',
  region: 'shoulder',
  // Transverse plane -> rig local Y.
  rig: { axis: [0, 1, 0] },
  // Lab-only: the transverse arc continues past neutral into INTERNAL rotation,
  // so the rotation gesture sweeps the full internal<->external range.
  labReverse: {
    name: 'Rotación interna',
    minDeg: -100,
    phases: [
      {
        startDeg: -100,
        endDeg: 0,
        label: 'Rotación interna',
        description:
          'Hacia el lado interno del arco transversal, el subescapular es el rotador interno del manguito y el pectoral mayor, el dorsal ancho y el redondo mayor aportan potencia.',
        muscles: [
          {
            muscleId: 'subscapularis',
            role: 'prime-mover',
            note: 'Único componente anterior del manguito.',
          },
          { muscleId: 'pectoralis-major', role: 'assistant' },
          { muscleId: 'latissimus-dorsi', role: 'assistant' },
          { muscleId: 'teres-major', role: 'assistant' },
        ],
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
    ],
  },
  phases: [
    {
      startDeg: 0,
      endDeg: 80,
      label: 'Arco completo',
      flag: {
        label: 'Estabilidad anterior',
        detail:
          'El manguito posterior (infraespinoso, redondo menor) frena la traslación anterior de la cabeza humeral; su déficit se asocia a aprensión anterior.',
        tone: 'pearl',
      },
      description:
        'El infraespinoso y el redondo menor son los rotadores externos principales en todo el arco; el deltoides posterior asiste.',
      muscles: [
        {
          muscleId: 'infraspinatus',
          role: 'prime-mover',
          note: 'Principal rotador externo.',
        },
        {
          muscleId: 'teres-minor',
          role: 'prime-mover',
        },
        {
          muscleId: 'deltoid',
          role: 'assistant',
          note: 'Porción espinal (posterior).',
        },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'infraspinatus',
      role: 'prime-mover',
      note: 'Principal rotador externo; crece de forma continua en todo el arco.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.6 },
        { deg: 80, level: 1 },
      ],
    },
    {
      muscleId: 'teres-minor',
      role: 'prime-mover',
      note: 'Asiste la rotación externa y refuerza la cápsula posterior.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.5 },
        { deg: 80, level: 0.9 },
      ],
    },
    {
      muscleId: 'deltoid',
      role: 'assistant',
      note: 'Fibras posteriores: asisten la ER, sobre todo con el brazo en abducción.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.2 },
        { deg: 40, level: 0.35 },
        { deg: 80, level: 0.5 },
      ],
    },
    {
      muscleId: 'subscapularis',
      role: 'prime-mover',
      note: 'Motor de la ROTACIÓN INTERNA (tramo negativo) y freno de la traslación anterior.',
      curve: [
        { deg: -100, level: 1 },
        { deg: -40, level: 0.85 },
        { deg: 0, level: 0.35 },
        { deg: 80, level: 0.3 },
      ],
    },
    {
      muscleId: 'pectoralis-major',
      role: 'assistant',
      note: 'Rotador interno potente en el tramo negativo.',
      curve: [
        { deg: -100, level: 0.75 },
        { deg: -30, level: 0.6 },
        { deg: 0, level: 0.1 },
        { deg: 8, level: 0 },
      ],
    },
    {
      muscleId: 'latissimus-dorsi',
      role: 'assistant',
      note: 'Rotador interno en el tramo negativo.',
      curve: [
        { deg: -100, level: 0.6 },
        { deg: 0, level: 0.1 },
        { deg: 8, level: 0 },
      ],
    },
    {
      muscleId: 'teres-major',
      role: 'assistant',
      note: 'Rotador interno contra resistencia en el tramo negativo.',
      curve: [
        { deg: -100, level: 0.55 },
        { deg: 0, level: 0.1 },
        { deg: 8, level: 0 },
      ],
    },
  ],
};

const internalRotation: RomMovement = {
  id: 'glenohumeral-internal-rotation',
  name: 'Rotación interna',
  joint: 'Glenohumeral',
  plane: 'Transversal',
  totalRangeDeg: { min: 0, max: 100 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Rotación del húmero hacia adentro. El rango efectivo es mayor que el de la rotación externa, en parte porque el tronco deja de limitar cuando la mano pasa por detrás.',
  region: 'shoulder',
  // Transverse plane -> rig local Y.
  rig: { axis: [0, 1, 0] },
  // Lab-only: the arc continues past neutral into EXTERNAL rotation.
  labReverse: {
    name: 'Rotación externa',
    minDeg: -80,
    phases: [
      {
        startDeg: -80,
        endDeg: 0,
        label: 'Rotación externa',
        description:
          'Hacia el lado externo del arco transversal, el infraespinoso y el redondo menor son los rotadores externos principales; el deltoides posterior asiste.',
        muscles: [
          { muscleId: 'infraspinatus', role: 'prime-mover' },
          { muscleId: 'teres-minor', role: 'prime-mover' },
          {
            muscleId: 'deltoid',
            role: 'assistant',
            note: 'Porción espinal (posterior).',
          },
        ],
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
    ],
  },
  phases: [
    {
      startDeg: 0,
      endDeg: 100,
      label: 'Arco completo',
      flag: {
        label: 'Déficit de rotación interna (GIRD)',
        detail:
          'En deportistas de lanzamiento, la pérdida de rotación interna glenohumeral por rigidez capsular posterior (GIRD) se asocia a lesión del labrum y pinzamiento interno.',
        tone: 'warn',
      },
      description:
        'El subescapular es el rotador interno principal del manguito; el pectoral mayor, el dorsal ancho y el redondo mayor son rotadores internos potentes que asisten.',
      muscles: [
        {
          muscleId: 'subscapularis',
          role: 'prime-mover',
          note: 'Único componente anterior del manguito.',
        },
        { muscleId: 'pectoralis-major', role: 'assistant' },
        { muscleId: 'latissimus-dorsi', role: 'assistant' },
        { muscleId: 'teres-major', role: 'assistant' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'subscapularis',
      role: 'prime-mover',
      note: 'Principal rotador interno del manguito; crece en todo el arco.',
      curve: [
        { deg: -80, level: 0.35 },
        { deg: 0, level: 0.55 },
        { deg: 100, level: 1 },
      ],
    },
    {
      muscleId: 'pectoralis-major',
      role: 'assistant',
      note: 'Rotador interno potente cuando hay carga; se suma tras los ~45°.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.3 },
        { deg: 45, level: 0.6 },
        { deg: 100, level: 0.85 },
      ],
    },
    {
      muscleId: 'latissimus-dorsi',
      role: 'assistant',
      note: 'Rotador interno de potencia en el tramo positivo.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.25 },
        { deg: 100, level: 0.72 },
      ],
    },
    {
      muscleId: 'teres-major',
      role: 'assistant',
      note: 'Rotador interno contra resistencia en el tramo positivo.',
      curve: [
        { deg: -5, level: 0 },
        { deg: 0, level: 0.2 },
        { deg: 100, level: 0.65 },
      ],
    },
    {
      muscleId: 'infraspinatus',
      role: 'prime-mover',
      note: 'Motor de la ROTACIÓN EXTERNA (tramo negativo).',
      curve: [
        { deg: -80, level: 1 },
        { deg: 0, level: 0.4 },
        { deg: 100, level: 0.3 },
      ],
    },
    {
      muscleId: 'teres-minor',
      role: 'prime-mover',
      note: 'Rotador externo en el tramo negativo.',
      curve: [
        { deg: -80, level: 0.9 },
        { deg: 0, level: 0.35 },
        { deg: 100, level: 0.25 },
      ],
    },
    {
      muscleId: 'deltoid',
      role: 'assistant',
      note: 'Fibras posteriores: asisten la rotación externa en el tramo negativo.',
      curve: [
        { deg: -80, level: 0.5 },
        { deg: -40, level: 0.35 },
        { deg: 0, level: 0.1 },
        { deg: 5, level: 0 },
      ],
    },
  ],
};

/**
 * Shoulder ROM movements, keyed by id. Add elbow/other regions in their own
 * files following this same structure.
 */
export const SHOULDER_ROM: RomMovementIndex = {
  'glenohumeral-abduction': abduction,
  'glenohumeral-flexion': flexion,
  'glenohumeral-external-rotation': externalRotation,
  'glenohumeral-internal-rotation': internalRotation,
};

/** Convenience array for iterating/rendering all shoulder movements. */
export const SHOULDER_ROM_LIST: RomMovement[] = Object.values(SHOULDER_ROM);
