// src/lib/selectionSheet.ts
//
// QUE FICHA ABRE LO SELECCIONADO. Logica pura del margen derecho de Explorar
// (SelectionPanel), separada del componente para poder medirla contra el indice
// real y fijarla con una prueba.
//
// EL DEFECTO QUE CIERRA: LA FICHA Y EL RESALTE USABAN DOS RESOLUTORES DISTINTOS.
// El modelo decide a que musculo pertenece una malla con `buildMuscleResolution`
// (las `meshBases` de cada ficha), y con eso enciende el musculo entero y
// escribe el nombre del hover. El panel, en cambio, lo decidia con
// `resolveMuscleId`, una tabla de alias escrita a mano para el hombro, el codo y
// el miembro inferior, que no conoce NINGUN musculo del raquis. Asi que en las
// tres regiones del raquis el musculo se encendia, el hover decia "Iliocostal
// del cuello" y la ficha de al lado titulaba "Musculo iliocostalis colli" con
// la linea "Esta estructura todavia no tiene contenido clinico detallado",
// teniendo la region las 23 fichas escritas.
//
// Medido con public/anatomy-index.json y los ocho contenidos (mallas de musculo
// de cada region que se pueden pinchar):
//
//   region     mallas   abrian ficha   caian al nombre crudo
//   cervical     108        12              96
//   toracica      66         0              66
//   lumbar        54         6              48
//   hombro       169       149              20   (las 20 digitaciones del serrato)
//   tobillo      112        86              26
//
// Y desde la LISTA de musculos, que selecciona por la primera malla: 22 de los
// 23 de cervical, los 11 de toracica y 9 de los 11 de lumbar no abrian ficha.
//
// Ahora la ficha se decide en este orden:
//   1. El musculo seleccionado en el store (`selectedMuscleId`): es el que el
//      modelo esta encendiendo. Cubre tambien a quien selecciona un musculo sin
//      malla ("Ver en el atlas" desde la coleccion, las fichas de Aprender), que
//      antes dejaba el panel en "Explora el modelo" con el musculo encendido.
//   2. El musculo de la malla segun el MISMO resolutor que el resalte.
//   3. La tabla de alias, que sigue sabiendo cosas que las `meshBases` no (los
//      dos grupos epicondileos del codo), salvo para bolsas, fascias y vainas:
//      "Deltoid_fascia" y "Semimembranosus_bursa" abrian la ficha del musculo.
//   4. Si nada de eso da un musculo, la estructura por su nombre.

import { musclesForRegion, musclesForRomLookup } from '../data/musclesByRegion';
import { muscleContentForRegion } from '../data/muscleContentByRegion';
import { materialIsAccessoryTissue } from './materialColors';
import { resolveMuscleId } from './resolveMuscleId';
import type { MuscleResolution } from './muscleResolver';
import { atlasDisplayName, type RegionStructure } from './regionStructures';
import type { AnatomyEntry } from '../types/anatomy';
import type { Muscle } from '../types/muscle';
import type { MuscleContent } from '../types/muscleContent';

export interface SheetInput {
  region: string | null;
  selectedMeshName: string | null;
  selectedMuscleId: string | null;
  /** Every mesh of a structure picked from the bone / nerve list, if any. */
  selectedBoneMeshes: string[] | null;
  byMesh: Map<string, AnatomyEntry>;
  resolution?: MuscleResolution;
  /** mesh name -> listed structure of the active region (regionStructuresByMesh). */
  structures?: Map<string, RegionStructure>;
}

/** A muscle: the rich sheet when the region has one, the muscle's own fields otherwise. */
export interface MuscleSheet {
  kind: 'muscle';
  muscleId: string;
  name: string;
  latin: string;
  /** Rich, cited content (the region's content index), when authored. */
  content?: MuscleContent;
  /** The simpler record, used when there is no rich content. */
  muscle?: Muscle;
  /** Every mesh of the muscle in the scene: what lights up, what "Centrar" frames. */
  meshNames: string[];
}

/** Anything that is not a muscle: a bone, a nerve, a ligament, a vessel. */
export interface StructureSheet {
  kind: 'structure';
  entry: AnatomyEntry;
  name: string;
  /** What is lit: the whole listed structure, or the clicked mesh. */
  meshNames: string[];
}

export type Sheet = { kind: 'none' } | MuscleSheet | StructureSheet;

/** The muscle record for an id, looking where the region can name it from. */
function findMuscle(
  region: string | null,
  id: string,
  resolution: MuscleResolution | undefined,
): Muscle | undefined {
  const own =
    musclesForRegion(region).find((m) => m.id === id) ??
    musclesForRomLookup(region).find((m) => m.id === id);
  if (own) return own;
  // A muscle of another region that happens to be on screen: the resolver's
  // universe still knows its name, which beats the raw mesh name.
  const names = resolution?.meshNamesByMuscleId.get(id);
  return names && names.length > 0 ? resolution?.muscleByMeshName.get(names[0]) : undefined;
}

export function resolveSheet(input: SheetInput): Sheet {
  const { region, selectedMeshName, selectedMuscleId, selectedBoneMeshes, byMesh, resolution } =
    input;
  const entry = selectedMeshName ? byMesh.get(selectedMeshName) : undefined;

  let muscleId: string | null = selectedMuscleId;
  if (!muscleId && selectedMeshName && entry) {
    muscleId = resolution?.muscleByMeshName.get(selectedMeshName)?.id ?? null;
    if (!muscleId && !materialIsAccessoryTissue(entry.materialName, selectedMeshName)) {
      muscleId = resolveMuscleId(selectedMeshName);
    }
  }

  if (muscleId) {
    const content = muscleContentForRegion(region)[muscleId];
    const muscle = findMuscle(region, muscleId, resolution);
    if (content || muscle) {
      return {
        kind: 'muscle',
        muscleId,
        name: content?.nameEs ?? muscle?.name ?? muscleId,
        latin: content?.nameLat ?? muscle?.latin ?? '',
        content,
        muscle,
        meshNames:
          resolution?.meshNamesByMuscleId.get(muscleId) ??
          (selectedMeshName ? [selectedMeshName] : []),
      };
    }
    // An id nothing here can name: fall through to the mesh, if there is one.
  }

  if (entry && selectedMeshName) {
    const listed = input.structures?.get(selectedMeshName);
    return {
      kind: 'structure',
      entry,
      name: listed?.name ?? atlasDisplayName(entry.canonicalName),
      meshNames:
        selectedBoneMeshes && selectedBoneMeshes.length > 0
          ? selectedBoneMeshes
          : [selectedMeshName],
    };
  }

  return { kind: 'none' };
}

/** True when a simple muscle record has nothing clinical to print. */
export function muscleRecordIsEmpty(m: Muscle): boolean {
  return (
    !m.origin &&
    !m.insertion &&
    !m.innervation &&
    m.actions.length === 0 &&
    !m.clinicalNote
  );
}
