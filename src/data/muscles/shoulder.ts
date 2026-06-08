// src/data/muscles/shoulder.ts
//
// Shoulder muscle data — full functional set of the shoulder region (~17
// muscles): rotator cuff + superficial glenohumeral movers + scapulothoracic
// movers + the biarticular arm muscles that cross the shoulder.
//
// ┌────────────────────────────────────────────────────────────────────────┐
// │ CLINICAL CONTENT DISCLAIMER                                               │
// │ The origin / insertion / innervation / action fields below are drafted    │
// │ from standard anatomical references and are intended as a well-structured │
// │ STARTING POINT. Before this ships in a clinical/professional product,     │
// │ every field must be verified against an authoritative source (e.g. a      │
// │ current edition of a standard anatomy text). Treat them as draft copy.    │
// └─────────────────────────────────────────────────────────────────────────┘
//
// meshBases STATUS: VERIFIED. Every base below was produced by running the
// real parseMeshName() over the actual mesh names extracted from the model, so
// each muscle resolves to its real meshes (both sides, all parts).
//
// Modeling notes discovered from the real names:
// - The DELTOID is modeled as three named parts (acromial / clavicular /
//   scapular-spinal), each its own base with belly + origin, PLUS a shared
//   insertion stored under the base "Deltoid_muscle" (insertion only). So the
//   full deltoid spans 4 bases.
// - PECTORALIS MAJOR likewise: three head bases (clavicular / sternocostal /
//   abdominal) + a shared insertion under "Pectoralis_major_muscle". The
//   abdominal-part base literally INCLUDES the parentheses in its name.
// - BICEPS / TRICEPS BRACHII: each head is its own base, plus a shared
//   insertion base ("Biceps_brachii_muscle" / "Triceps_brachii_muscle"). Only
//   the long head of each crosses the shoulder, but all heads are listed so the
//   muscle highlights completely in 3D.
// - RHOMBOIDS exist as major + minor separately; both bases are listed.

//
// ENCODING / AUTHORING RULE:
//   - User-facing strings (name, latin, origin, insertion, innervation,
//     movement, note, clinicalNote): Latin American Spanish WITH accents and
//     enies, UTF-8.
//   - Code, ids, keys, enum-like values (id, meshBases, layer, depth, groups,
//     roots, joint) and comments: ASCII.
//   - Editor ALWAYS UTF-8 without BOM.
//
import type { Muscle, MuscleRegion } from '../../types/muscle';

/* ===========================================================================
 * ROTATOR CUFF
 * ======================================================================== */
const rotatorCuff: Muscle[] = [
  {
    id: 'supraspinatus',
    name: 'Supraespinoso',
    latin: 'Musculus supraspinatus',
    meshBases: ['Supraspinatus_muscle'],
    // supraspinatus
    layer: 'muscles',
    depth: 3,
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
    // infraspinatus
    layer: 'muscles',
    depth: 3,
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
    // teres-minor
    layer: 'muscles',
    depth: 3,
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
    // subscapularis
    layer: 'muscles',
    depth: 4,
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

/* ===========================================================================
 * SUPERFICIAL GLENOHUMERAL MOVERS
 * ======================================================================== */
const glenohumeralSuperficial: Muscle[] = [
  {
    id: 'deltoid',
    name: 'Deltoides',
    latin: 'Musculus deltoideus',
    // 3 partes (cada una con vientre + origen) + inserción común "Deltoid_muscle".
    meshBases: [
      'Acromial_part_of_deltoid_muscle',
      'Clavicular_part_of_deltoid_muscle',
      'Scapular_spinal_part_of_deltoid_muscle',
      'Deltoid_muscle',
    ],
    // deltoid
    layer: 'muscles',
    depth: 1,
    groups: ['abductor', 'flexor', 'extensor'],
    origin:
      'Parte clavicular: tercio lateral de la clavícula. Parte acromial: acromion. Parte espinal: espina de la escápula.',
    insertion: 'Tuberosidad deltoidea, en la cara lateral de la diáfisis humeral.',
    innervation: 'Nervio axilar',
    roots: ['C5', 'C6'],
    actions: [
      {
        joint: 'Glenohumeral',
        movement: 'Abducción',
        note: 'La parte acromial (media) es el motor principal de la abducción a partir de los ~15°.',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Flexión',
        note: 'A cargo de la parte clavicular (anterior).',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Extensión',
        note: 'A cargo de la parte espinal (posterior).',
      },
    ],
    clinicalNote:
      'Su atrofia o parálisis (lesión del nervio axilar, p. ej. tras luxación glenohumeral o fractura del cuello quirúrgico) produce el signo de la "charretera" y debilidad marcada de la abducción.',
  },
  {
    id: 'pectoralis-major',
    name: 'Pectoral mayor',
    latin: 'Musculus pectoralis major',
    // Cabezas clavicular / esternocostal / abdominal + inserción común.
    // OJO: la base abdominal incluye los paréntesis en el nombre.
    meshBases: [
      'Clavicular_head_of_pectoralis_major_muscle',
      'Sternocostal_head_of_pectoralis_major_muscle',
      '(Abdominal_part_of_pectoralis_major_muscle)',
      'Pectoralis_major_muscle',
    ],
    // pectoralis-major
    layer: 'muscles',
    depth: 1,
    groups: ['adductor', 'internal-rotator', 'flexor'],
    origin:
      'Cabeza clavicular: mitad medial de la clavícula. Cabeza esternocostal: esternón y cartílagos costales de las 6 primeras costillas; parte abdominal: aponeurosis del oblicuo externo.',
    insertion: 'Cresta del tubérculo mayor (labio lateral del surco intertubercular) del húmero.',
    innervation: 'Nervios pectorales medial y lateral',
    roots: ['C5', 'C6', 'C7', 'C8', 'T1'],
    actions: [
      {
        joint: 'Glenohumeral',
        movement: 'Aducción',
        note: 'Aductor potente del brazo.',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Rotación interna',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Flexión',
        note: 'La cabeza clavicular flexiona el brazo ya extendido.',
      },
    ],
    clinicalNote:
      'El borde inferior forma el pliegue axilar anterior. Su rotura (en levantadores de peso) produce dolor y equimosis en el surco deltopectoral.',
  },
  {
    id: 'pectoralis-minor',
    name: 'Pectoral menor',
    latin: 'Musculus pectoralis minor',
    meshBases: ['Pectoralis_minor_muscle'],
    // pectoralis-minor
    layer: 'muscles',
    depth: 2,
    groups: ['depressor', 'protractor'],
    origin: 'Cara anterior de las costillas 3.ª a 5.ª.',
    insertion: 'Apófisis coracoides de la escápula.',
    innervation: 'Nervio pectoral medial',
    roots: ['C8', 'T1'],
    actions: [
      {
        joint: 'Escapulotorácica',
        movement: 'Depresión y báscula anterior de la escápula',
        note: 'Tira de la escápula hacia abajo y adelante; protractor.',
      },
    ],
    clinicalNote:
      'Su acortamiento es causa frecuente de hombros enrollados (postura cifótica) y puede comprimir el plexo braquial (síndrome del desfiladero torácico, variante pectoral menor).',
  },
  {
    id: 'teres-major',
    name: 'Redondo mayor',
    latin: 'Musculus teres major',
    meshBases: ['Teres_major_muscle'],
    // teres-major
    layer: 'muscles',
    depth: 2,
    groups: ['adductor', 'internal-rotator', 'extensor'],
    origin: 'Ángulo inferior y borde lateral inferior de la escápula.',
    insertion: 'Cresta del tubérculo menor (labio medial del surco intertubercular) del húmero.',
    innervation: 'Nervio subescapular inferior',
    roots: ['C5', 'C6'],
    actions: [
      {
        joint: 'Glenohumeral',
        movement: 'Aducción',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Rotación interna',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Extensión',
        note: 'Junto con el dorsal ancho, lleva el brazo elevado de vuelta a la posición neutra.',
      },
    ],
    clinicalNote:
      'A menudo llamado "el pequeño ayudante del dorsal ancho" por compartir acciones. Forma el límite inferior del espacio cuadrangular.',
  },
];

/* ===========================================================================
 * SCAPULOTHORACIC MOVERS
 * ======================================================================== */
const scapulothoracic: Muscle[] = [
  {
    id: 'latissimus-dorsi',
    name: 'Dorsal ancho',
    latin: 'Musculus latissimus dorsi',
    meshBases: ['Latissimus_dorsi_muscle'],
    // latissimus-dorsi
    layer: 'muscles',
    depth: 1,
    groups: ['adductor', 'internal-rotator', 'extensor'],
    origin:
      'Apófisis espinosas de T7–L5, fascia toracolumbar, cresta ilíaca y 3-4 costillas inferiores (vía aponeurosis).',
    insertion: 'Suelo del surco intertubercular del húmero.',
    innervation: 'Nervio toracodorsal',
    roots: ['C6', 'C7', 'C8'],
    actions: [
      {
        joint: 'Glenohumeral',
        movement: 'Extensión',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Aducción',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Rotación interna',
        note: 'Movimiento del brazo "de rascarse la espalda" o de remo descendente.',
      },
    ],
    clinicalNote:
      'Forma el pliegue axilar posterior. Importante en escaladores, nadadores y en transferencias con muletas/silla de ruedas (depresión del hombro contra el peso corporal).',
  },
  {
    id: 'trapezius',
    name: 'Trapecio',
    latin: 'Musculus trapezius',
    // 3 partes nombradas (descendente / transversa / ascendente).
    meshBases: [
      'Descending_part_of_trapezius_muscle',
      'Transverse_part_of_trapezius_muscle',
      'Ascending_part_of_trapezius_muscle',
    ],
    // trapezius
    layer: 'muscles',
    depth: 1,
    groups: ['elevator', 'retractor', 'depressor'],
    origin:
      'Protuberancia occipital externa, ligamento nucal y apófisis espinosas de C7–T12.',
    insertion: 'Tercio lateral de la clavícula, acromion y espina de la escápula.',
    innervation: 'Nervio accesorio (XI) y ramos de C3–C4',
    roots: ['NC XI', 'C3', 'C4'],
    actions: [
      {
        joint: 'Escapulotorácica',
        movement: 'Elevación',
        note: 'Fibras superiores (descendentes).',
      },
      {
        joint: 'Escapulotorácica',
        movement: 'Retracción (aducción)',
        note: 'Fibras medias (transversas).',
      },
      {
        joint: 'Escapulotorácica',
        movement: 'Depresión y rotación superior',
        note: 'Fibras inferiores (ascendentes); contribuyen a la rotación superior de la glenoides en la elevación del brazo.',
      },
    ],
    clinicalNote:
      'Las fibras superiores tienden a sobreactivarse y acortarse (tensión cervical); las inferiores tienden a debilitarse. Su debilidad altera el ritmo escapulohumeral y favorece la discinesia escapular.',
  },
  {
    id: 'rhomboids',
    name: 'Romboides',
    latin: 'Musculi rhomboidei (major et minor)',
    // Mayor y menor existen como bases separadas.
    meshBases: ['Rhomboid_major_muscle', 'Rhomboid_minor_muscle'],
    // rhomboids
    layer: 'muscles',
    depth: 2,
    groups: ['retractor', 'elevator'],
    origin:
      'Romboides menor: apófisis espinosas de C7–T1. Romboides mayor: apófisis espinosas de T2–T5.',
    insertion: 'Borde medial de la escápula, desde la espina hasta el ángulo inferior.',
    innervation: 'Nervio dorsal de la escápula',
    roots: ['C4', 'C5'],
    actions: [
      {
        joint: 'Escapulotorácica',
        movement: 'Retracción (aducción)',
        note: 'Acercan la escápula a la columna.',
      },
      {
        joint: 'Escapulotorácica',
        movement: 'Rotación inferior',
        note: 'Bajan la glenoides; trabajan con el elevador de la escápula.',
      },
    ],
    clinicalNote:
      'Su debilidad (lesión del nervio dorsal de la escápula) provoca una escápula alada leve con desplazamiento lateral. Importantes en el control postural escapular.',
  },
  {
    id: 'serratus-anterior',
    name: 'Serrato anterior',
    latin: 'Musculus serratus anterior',
    meshBases: ['Serratus_anterior_muscle'],
    // serratus-anterior
    layer: 'muscles',
    depth: 3,
    groups: ['protractor'],
    origin: 'Caras laterales de las 8-9 costillas superiores.',
    insertion: 'Borde medial de la escápula (cara costal), sobre todo el ángulo inferior.',
    innervation: 'Nervio torácico largo',
    roots: ['C5', 'C6', 'C7'],
    actions: [
      {
        joint: 'Escapulotorácica',
        movement: 'Protracción (abducción)',
        note: 'Mantiene la escápula contra la pared torácica; motor del "puñetazo".',
      },
      {
        joint: 'Escapulotorácica',
        movement: 'Rotación superior',
        note: 'Esencial para elevar el brazo por encima de la cabeza (junto con el trapecio).',
      },
    ],
    clinicalNote:
      'Su parálisis (lesión del nervio torácico largo) produce la escápula alada clásica. Es clave en el ritmo escapulohumeral.',
  },
  {
    id: 'levator-scapulae',
    name: 'Elevador de la escápula',
    latin: 'Musculus levator scapulae',
    meshBases: ['Levator_scapulae'],
    // levator-scapulae
    layer: 'muscles',
    depth: 2,
    groups: ['elevator', 'retractor'],
    origin: 'Tubérculos posteriores de las apófisis transversas de C1–C4.',
    insertion: 'Ángulo superior y borde medial superior de la escápula.',
    innervation: 'Nervio dorsal de la escápula y ramos cervicales C3–C4',
    roots: ['C3', 'C4', 'C5'],
    actions: [
      {
        joint: 'Escapulotorácica',
        movement: 'Elevación',
        note: 'Eleva el ángulo superior de la escápula.',
      },
      {
        joint: 'Escapulotorácica',
        movement: 'Rotación inferior',
      },
    ],
    clinicalNote:
      'Foco frecuente de dolor cervical y puntos gatillo, sobre todo en posturas mantenidas frente a pantalla. A menudo hipertónico junto al trapecio superior.',
  },
  {
    id: 'subclavius',
    name: 'Subclavio',
    latin: 'Musculus subclavius',
    meshBases: ['Subclavius_muscle'],
    // subclavius
    layer: 'muscles',
    depth: 3,
    groups: ['depressor'],
    origin: 'Unión de la 1.ª costilla con su cartílago costal.',
    insertion: 'Cara inferior del tercio medio de la clavícula.',
    innervation: 'Nervio del subclavio',
    roots: ['C5', 'C6'],
    actions: [
      {
        joint: 'Esternoclavicular',
        movement: 'Depresión y estabilización de la clavícula',
        note: 'Protege los vasos subclavios y estabiliza la articulación esternoclavicular.',
      },
    ],
    clinicalNote:
      'Pequeño y profundo, pero clínicamente relevante como protector de los vasos subclavios en fracturas de clavícula.',
  },
  {
    id: 'omohyoid',
    name: 'Omohioideo',
    latin: 'Musculus omohyoideus',
    meshBases: ['Omohyoid_muscle'],
    // omohyoid
    layer: 'muscles',
    depth: 2,
    groups: ['depressor'],
    origin: 'Vientre inferior: borde superior de la escápula, cerca de la escotadura.',
    insertion: 'Vientre superior: cuerpo del hueso hioides.',
    innervation: 'Asa cervical',
    roots: ['C1', 'C2', 'C3'],
    actions: [
      {
        joint: 'Hioides',
        movement: 'Depresión del hioides',
        note: 'Músculo infrahioideo; participa en la deglución y fonación, no en el movimiento del brazo.',
      },
    ],
    clinicalNote:
      'Se incluye por su origen escapular, pero funcionalmente pertenece al cuello (infrahioideos). Su vientre intermedio cruza el paquete vasculonervioso del cuello.',
  },
];

/* ===========================================================================
 * BIARTICULAR ARM MUSCLES (cross the shoulder)
 * ======================================================================== */
const armMuscles: Muscle[] = [
  {
    id: 'biceps-brachii',
    name: 'Bíceps braquial',
    latin: 'Musculus biceps brachii',
    // Cabezas larga + corta + inserción común "Biceps_brachii_muscle".
    meshBases: [
      'Long_head_of_biceps_brachii',
      'Short_head_of_biceps_brachii',
      'Biceps_brachii_muscle',
    ],
    // biceps-brachii
    layer: 'muscles',
    depth: 2,
    groups: ['flexor'],
    origin:
      'Cabeza larga: tubérculo supraglenoideo de la escápula. Cabeza corta: apófisis coracoides.',
    insertion: 'Tuberosidad del radio y, vía aponeurosis bicipital, a la fascia del antebrazo.',
    innervation: 'Nervio musculocutáneo',
    roots: ['C5', 'C6'],
    actions: [
      {
        joint: 'Glenohumeral',
        movement: 'Flexión',
        note: 'Contribución débil; la cabeza larga ayuda a estabilizar la cabeza humeral.',
      },
      {
        joint: 'Codo',
        movement: 'Flexión y supinación',
        note: 'Acción principal en el codo y antebrazo.',
      },
    ],
    clinicalNote:
      'El tendón de la cabeza larga discurre por el surco intertubercular y es origen frecuente de tendinopatía y dolor anterior del hombro (signo de Speed, Yergason).',
  },
  {
    id: 'triceps-brachii',
    name: 'Tríceps braquial',
    latin: 'Musculus triceps brachii',
    // 3 cabezas + inserción común. Solo la cabeza larga cruza el hombro.
    meshBases: [
      'Long_head_of_triceps_brachii',
      'Lateral_head_of_triceps_brachii',
      'Medial_head_of_triceps_brachii',
      'Triceps_brachii_muscle',
    ],
    // triceps-brachii
    layer: 'muscles',
    depth: 2,
    groups: ['extensor', 'adductor'],
    origin:
      'Cabeza larga: tubérculo infraglenoideo de la escápula. Cabezas lateral y medial: cara posterior del húmero.',
    insertion: 'Olécranon del cúbito.',
    innervation: 'Nervio radial',
    roots: ['C6', 'C7', 'C8'],
    actions: [
      {
        joint: 'Glenohumeral',
        movement: 'Extensión y aducción',
        note: 'Solo la cabeza larga cruza el hombro y aporta extensión/aducción.',
      },
      {
        joint: 'Codo',
        movement: 'Extensión',
        note: 'Extensor principal del codo.',
      },
    ],
    clinicalNote:
      'La cabeza larga separa los espacios cuadrangular y triangular en la región posterior del hombro, relevantes para el trayecto del nervio axilar y la arteria circunfleja.',
  },
  {
    id: 'coracobrachialis',
    name: 'Coracobraquial',
    latin: 'Musculus coracobrachialis',
    meshBases: ['Coracobrachialis_muscle'],
    // coracobrachialis
    layer: 'muscles',
    depth: 2,
    groups: ['flexor', 'adductor'],
    origin: 'Apófisis coracoides de la escápula (junto con la cabeza corta del bíceps).',
    insertion: 'Cara medial de la diáfisis humeral, tercio medio.',
    innervation: 'Nervio musculocutáneo',
    roots: ['C5', 'C6', 'C7'],
    actions: [
      {
        joint: 'Glenohumeral',
        movement: 'Flexión',
      },
      {
        joint: 'Glenohumeral',
        movement: 'Aducción',
        note: 'Estabiliza el húmero durante movimientos finos.',
      },
    ],
    clinicalNote:
      'El nervio musculocutáneo lo perfora, un reparo anatómico útil. Forma parte de la pared lateral de la axila.',
  },
];

export const shoulderRegion: MuscleRegion = {
  id: 'shoulder',
  name: 'Hombro',
  muscles: [
    ...rotatorCuff,
    ...glenohumeralSuperficial,
    ...scapulothoracic,
    ...armMuscles,
  ],
};

/** Flat export for convenience / lookups. */
export const shoulderMuscles: Muscle[] = shoulderRegion.muscles;
