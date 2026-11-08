// LAS ESTRUCTURAS QUE UNA PRUEBA VALORA, Y QUE SE PUEDEN ENCENDER.
//
// El panel de pruebas ortopédicas promete en su ayuda que al pulsar Demostrar
// el modelo "resalta la estructura evaluada". Medido sobre los 65 demos: 42 no
// encendían nada. La causa es que el único resalte que existía,
// `TestDemo.highlightMuscleId`, resuelve MÚSCULOS (resolveMuscleId.ts), y casi
// todas esas pruebas valoran un ligamento, un menisco, la cápsula o el labrum.
// La rodilla era el caso extremo: 11 de 11 demos apagados, mientras cada prueba
// dice en su propio campo `target` exactamente qué ligamento valora.
//
// Esto da NOMBRE CLÍNICO a conjuntos de mallas del GLB para poder encenderlas.
//
// LA RESTRICCIÓN QUE MANDA: el laboratorio solo sabe mostrar cuatro capas
// (piel, músculo, hueso, conectivo). El mapeo lo hace `layerForMaterial` a
// partir del MATERIAL, y devuelve null para los nervios y los vasos: esas
// mallas quedan etiquetadas 'hidden' y el sistema de capas no las muestra
// nunca. Así que una prueba cuyo objetivo es una raíz nerviosa, la médula o una
// arteria NO puede resaltar su estructura, y eso se DECLARA (`cannotShow` en el
// dato de la prueba) en vez de taparse con un resalte aproximado. Un resalte
// que enciende "algo parecido" es peor que ninguno: enseña una estructura falsa
// como si fuera la que el libro nombra.
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
 * EL REGISTRO. Los ids llevan prefijo de región cuando el nombre es ambiguo
 * entre regiones (hay colateral en rodilla, codo, muñeca y tobillo, y labrum en
 * hombro y cadera).
 */
export const CLINICAL_STRUCTURES: Record<string, ClinicalStructure> = {};

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
