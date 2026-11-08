// LAS ESTRUCTURAS QUE UNA PRUEBA VALORA, Y QUE SE PUEDEN ENCENDER.
//
// El panel de pruebas ortopédicas promete en su ayuda que al pulsar Demostrar
// el modelo "resalta la estructura evaluada". Medido sobre los 64 demos: 42 no
// encendían nada. La causa es que el único resalte que existía,
// `TestDemo.highlightMuscleId`, resuelve MÚSCULOS (resolveMuscleId.ts), y la
// mayoría de esas pruebas valoran un ligamento, un menisco, la cápsula, un
// tendón o un nervio. La rodilla era el caso extremo: 11 de 11 demos apagados,
// mientras cada prueba dice en su propio campo `target` exactamente qué
// ligamento valora.
//
// Esto da NOMBRE CLÍNICO a conjuntos de mallas del rig para poder encenderlas.
//
// LA FUENTE ES EL RIG, NO EL ÍNDICE. Un primer intento escribió este registro
// contra `public/anatomy-index.json` y resolvía a CERO mallas: ese índice
// describe el modelo de Explorar (6316 mallas) y el laboratorio carga
// `public/cuerpo-rig.opt.glb` (2659). Lo que hay en el rig se consulta con
// `npm run rig-find`, y `npm run audit-structures` lo vuelve a medir contra el
// GLB publicado en cada pasada.
//
// LA SEGUNDA RESTRICCIÓN: el laboratorio solo sabe mostrar cuatro capas (piel,
// músculo, hueso, conectivo), y la capa la decide `layerForMaterial` a partir
// del MATERIAL de la malla. Devuelve null para los nervios, los vasos, las
// bolsas serosas y las fascias: esas mallas están en el GLB pero el sistema de
// capas no las muestra nunca. Así que una prueba cuyo objetivo es una raíz
// nerviosa, el nervio cubital o la bolsa subacromial NO puede resaltar su
// estructura, y eso se DECLARA (`cannotShow` en el dato de la prueba) en vez de
// taparse con un resalte aproximado. Un resalte que enciende "algo parecido" es
// peor que ninguno: enseña una estructura falsa como si fuera la que el libro
// nombra. Lo mismo vale para lo que no está en el modelo: el rig no tiene
// cruzados, ni menisco lateral, ni colateral lateral de rodilla, ni labrum
// (glenoideo ni acetabular), ni cápsula glenohumeral, ni un solo ligamento de
// raquis, cadera o sacroilíaca.
//
// `expectMeshes` es la cifra MEDIDA sobre el GLB que se publica, y existe para
// que `npm run audit-structures` falle si una reexportación del modelo se lleva
// por delante un ligamento. Sin esa cifra, el registro se degrada en silencio y
// el síntoma vuelve a ser el de siempre: el botón se pulsa y no se enciende
// nada.

/** La capa del laboratorio a la que pertenece la estructura. */
export type StructureLayer = 'muscle' | 'bone' | 'connective' | 'skin';

export interface ClinicalStructure {
  /** Nombre clínico, como lo lee el fisio. */
  label: string;
  /** Capa que hay que tener encendida para verla. El demo la fuerza. */
  layer: StructureLayer;
  /** Patrones (anclados) que SÍ son esta estructura, contra el nombre de malla. */
  include: readonly RegExp[];
  /** Homónimos de otra región que hay que descartar. */
  exclude?: readonly RegExp[];
  /** Mallas que casan en el GLB publicado. Lo vigila `npm run audit-structures`. */
  expectMeshes: number;
}

/**
 * EL REGISTRO. Los ids llevan prefijo de región porque los nombres se repiten:
 * hay colateral en rodilla, codo, muñeca y tobillo.
 *
 * Los patrones van ANCLADOS y con el sufijo de lado explícito (`[lr]$`), que es
 * lo que separa `Ulnar_collateral_ligamentr` (el del CODO, y=1,09) de
 * `Ulnar_collateral_ligament_of_wrist_jointr` (el de la MUÑECA, y=0,85). Sin
 * anclar, una prueba de codo encendería la muñeca.
 */
export const CLINICAL_STRUCTURES: Record<string, ClinicalStructure> = {
  // ============================== HOMBRO ==============================
  // Lo único del hombro que el rig tiene y la clínica pide: el tendón de la
  // porción larga del bíceps. Es el `_1`/`_3` del músculo (material 'Tendon'),
  // no el vientre: `_2` es el vientre derecho y queda fuera a propósito.
  'biceps-long-head-tendon': {
    label: 'Tendón de la porción larga del bíceps',
    layer: 'connective',
    include: [/^Long_head_of_biceps_brachii_[13]$/],
    expectMeshes: 2,
  },

  // ============================= TORÁCICA =============================
  // Los intercostales existen en el rig pero `resolveMuscleId` no los conoce,
  // así que no hay `highlightMuscleId` que los encienda. Por aquí sí.
  'thoracic-intercostals': {
    label: 'Músculos intercostales',
    layer: 'muscle',
    include: [/^(External|Internal|Innermost)_intercostal_muscles[lr]$/],
    expectMeshes: 6,
  },

  // =============================== CADERA ===============================
  // La banda iliotibial no está como malla propia: lo que el rig tiene es el
  // tendón del tensor de la fascia lata, que es su porción proximal.
  'hip-itb': {
    label: 'Banda iliotibial (tendón del tensor de la fascia lata)',
    layer: 'connective',
    include: [/^Tensor_fasciae_latae_[24]$/],
    expectMeshes: 2,
  },

  // =============================== RODILLA ==============================
  'knee-mcl': {
    label: 'Ligamento colateral medial (porciones superficial y profunda)',
    layer: 'connective',
    include: [/^(Superficial|Deep)_part_of_tibial_collateral_ligament[lr]$/],
    expectMeshes: 4,
  },
  'knee-medial-meniscus': {
    label: 'Menisco medial y su anclaje meniscotibial',
    layer: 'connective',
    include: [
      /^Medial_meniscus[lr]$/,
      /^Posterior_meniscotibial_ligament_\(Medial_meniscus\)[lr]$/,
    ],
    expectMeshes: 4,
  },

  // ================================= CODO ================================
  'elbow-ucl': {
    label: 'Ligamento colateral cubital',
    layer: 'connective',
    include: [/^Ulnar_collateral_ligament[lr]$/],
    // El de la muñeca lleva el mismo nombre con otro destino articular.
    exclude: [/of_wrist_joint/i],
    expectMeshes: 2,
  },
  'elbow-rcl': {
    label: 'Ligamento colateral radial',
    layer: 'connective',
    include: [/^Radial_collateral_ligament[lr]$/],
    exclude: [/of_wrist_joint/i],
    expectMeshes: 2,
  },
  'elbow-capsule': {
    label: 'Cápsula del codo',
    layer: 'connective',
    include: [/^Articular_capsule_of_elbow_joint[lr]$/],
    expectMeshes: 2,
  },

  // =============================== TOBILLO ===============================
  'ankle-atfl': {
    label: 'Ligamento peroneoastragalino anterior',
    layer: 'connective',
    include: [/^Anterior_talofibular_ligament[lr]$/],
    expectMeshes: 2,
  },
  'ankle-cfl': {
    label: 'Ligamento calcaneoperoneo',
    layer: 'connective',
    include: [/^Calcaneofibular_ligament[lr]$/],
    expectMeshes: 2,
  },
  'ankle-syndesmosis': {
    label: 'Sindesmosis tibioperonea distal',
    layer: 'connective',
    include: [/^(Anterior|Posterior)_tibiofibular_ligament[lr]$/],
    expectMeshes: 4,
  },
  'achilles-tendon': {
    label: 'Tendón calcáneo (de Aquiles)',
    layer: 'connective',
    include: [/^Calcaneal_tendon[lr]$/],
    expectMeshes: 2,
  },
  // LAS DOS PUERTAS DEL DESFILADERO TORACICO.
  //
  // Lo que se comprime son el plexo braquial y la arteria subclavia, y de eso
  // el laboratorio no puede encender nada: `layerForMaterial` devuelve null
  // para los nervios y los vasos. Pero las PAREDES del desfiladero si son
  // musculo, y son lo que el fisioterapeuta trata:
  //
  //   - el triangulo interescalenico, entre el escaleno anterior y el medio,
  //     que es por donde pasan las raices y la arteria (puerta de Adson y de
  //     Roos);
  //   - el espacio retropectoral, bajo el pectoral menor, que es el que cierra
  //     la hiperabduccion de Wright.
  //
  // El escaleno posterior se deja fuera a proposito: no forma la puerta.
  // Medido sobre el GLB del rig: anterior 8 mallas + medio 8, pectoral menor 10.
  'interscalene-triangle': {
    label: 'Triángulo interescalénico (escaleno anterior y medio)',
    layer: 'muscle',
    include: [/^Scalenus_(anterior|medius)_muscle(e1|e|o)?[lr]$/],
    expectMeshes: 16,
  },
  'pectoralis-minor': {
    label: 'Pectoral menor (espacio retropectoral)',
    layer: 'muscle',
    include: [/^Pectoralis_minor_muscle(e1|e2|e|o)?[lr]$/],
    expectMeshes: 10,
  },
};

/** ¿Es esta malla parte de la estructura? */
export function meshIsStructure(structureId: string, meshName: string): boolean {
  const s = CLINICAL_STRUCTURES[structureId];
  if (!s) return false;
  for (const rx of s.exclude ?? []) if (rx.test(meshName)) return false;
  for (const rx of s.include) if (rx.test(meshName)) return true;
  return false;
}

/** Las mallas de una lista de estructuras, sin repetir. */
export function meshNamesForStructures(
  structureIds: readonly string[],
  allMeshNames: readonly string[],
): string[] {
  const out = new Set<string>();
  for (const id of structureIds) {
    for (const name of allMeshNames) {
      if (meshIsStructure(id, name)) out.add(name);
    }
  }
  return [...out];
}

/** Las capas que hay que encender para ver estas estructuras. */
export function layersForStructures(structureIds: readonly string[]): StructureLayer[] {
  const out = new Set<StructureLayer>();
  for (const id of structureIds) {
    const s = CLINICAL_STRUCTURES[id];
    if (s) out.add(s.layer);
  }
  return [...out];
}

/** El nombre clínico, para el panel. */
export function structureLabel(structureId: string): string | null {
  return CLINICAL_STRUCTURES[structureId]?.label ?? null;
}
