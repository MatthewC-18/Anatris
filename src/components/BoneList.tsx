// src/components/BoneList.tsx
//
// Sidebar section listing the active region's BONES.
//
// It exists for the same reason MuscleList does -- the structures you cannot
// click are the ones you most need a list for -- but nobody had built the bone
// half. A physiotherapist reviewing the shoulder checked two structures by name
// and wrote "no se muestra todos los músculos o huesos: romboides ✓ / clavícula
// ✗". The rhomboid was findable because it is a muscle; the clavicle was not,
// because the rail had no place to put it.
//
// Clicking a bone selects it as a STRUCTURE (both sides, however Z-Anatomy chose
// to name them) and flies the camera to it, mirroring MuscleList's behaviour.
//
// LAMINA: cada estructura es una fila `.opt` (texto y un punto), igual que en
// la lista de musculos. Antes era un boton con relleno gris al seleccionar; la
// seleccion la dicen ahora el punto de acento y el peso de la letra.
//
// The list itself (which structures, under which Spanish name) is built by
// lib/regionStructures.ts, shared with the sheet and the search so the three
// name a structure the same way.

import { useMemo } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { listRegionStructures, type StructureKind } from '../lib/regionStructures';
import type { AnatomyIndex } from '../types/anatomy';

interface BoneListProps {
  index: AnatomyIndex;
  /** Which layer to list. Bones by default; 'nerves' for the plexus. */
  kind?: StructureKind;
}

export function BoneList({ index, kind = 'bones' }: BoneListProps) {
  const region = useAnatomyStore((s) => s.region);
  const selectedBoneId = useAnatomyStore((s) => s.selectedBoneId);
  const selectBone = useAnatomyStore((s) => s.selectBone);
  const requestFocus = useAnatomyStore((s) => s.requestFocus);
  const activeLayers = useAnatomyStore((s) => s.activeLayers);
  const setLayer = useAnatomyStore((s) => s.setLayer);

  const bones = useMemo(
    () => listRegionStructures(index.entries, region, kind),
    [region, index, kind],
  );

  if (!region) {
    return (
      <p className="py-1 text-xs leading-relaxed text-fg3">
        Elige una región para ver sus {kind === 'nerves' ? 'nervios' : 'huesos'}.
      </p>
    );
  }

  if (bones.length === 0) {
    return (
      <p className="py-1 text-xs leading-relaxed text-fg3">
        Esta región no tiene {kind === 'nerves' ? 'nervios' : 'huesos'} propios en el modelo.
      </p>
    );
  }

  const handleClick = (id: string, meshNames: string[]) => {
    // Clicking the selected bone again deselects it, so the list is a toggle and
    // there is always a way back to the plain view.
    if (selectedBoneId === id) {
      selectBone(null);
      return;
    }
    selectBone(id, meshNames);
    // The nerve layer is OFF by default (branches leaving a cut-out region trail
    // into mid-air). Picking a nerve by name is an unambiguous request to see it,
    // so switch the layer on rather than focusing the camera on nothing -- the
    // physio's "no hay nervios" was partly never finding that toggle.
    if (kind === 'nerves' && !activeLayers.has('nerves')) setLayer('nerves', true);
    if (meshNames.length > 0) requestFocus(meshNames);
  };

  return (
    <ul className="flex flex-col">
      {bones.map((bone) => {
        const active = selectedBoneId === bone.id;
        return (
          <li key={bone.id}>
            <button
              type="button"
              onClick={() => handleClick(bone.id, bone.meshNames)}
              aria-pressed={active}
              // 44 px en el cajon tactil (por debajo de lg), la fila normal de
              // 30 px en el margen de escritorio.
              className={`opt min-h-[44px] lg:min-h-[1.875rem] ${active ? 'is-active' : ''}`}
            >
              {/* Sin la etiqueta "Bilateral" que llevaba cada fila: en el tobillo
                  la repetian las 27, en la rodilla las 6 y en el raquis ninguna,
                  asi que no distinguia nada. El lado lo dice la ficha al
                  seleccionar ("Ambos lados"). */}
              <span className="min-w-0 flex-1 truncate" title={bone.name}>
                {bone.name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
