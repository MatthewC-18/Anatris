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

import { useMemo } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { buildBoneList } from '../lib/boneList';
import { REGIONS, resolveRegionMeshes } from '../data/regiones';
import type { AnatomyIndex } from '../types/anatomy';

interface BoneListProps {
  index: AnatomyIndex;
}

export function BoneList({ index }: BoneListProps) {
  const region = useAnatomyStore((s) => s.region);
  const selectedBoneId = useAnatomyStore((s) => s.selectedBoneId);
  const selectBone = useAnatomyStore((s) => s.selectBone);
  const requestFocus = useAnatomyStore((s) => s.requestFocus);

  const bones = useMemo(() => {
    const def = region ? REGIONS[region] : null;
    // No region selected = whole body. Listing every bone in the skeleton would
    // be inventory, not a study aid, so the section simply says so.
    if (!def) return [];
    const names = index.entries.map((e) => e.meshName);
    return buildBoneList(index.entries, resolveRegionMeshes(def, names));
  }, [region, index]);

  if (!region) {
    return (
      <p className="px-1 py-2 text-xs leading-snug text-slate-500">
        Elige una región para ver sus huesos.
      </p>
    );
  }

  if (bones.length === 0) {
    return (
      <p className="px-1 py-2 text-xs leading-snug text-slate-500">
        Esta región no tiene huesos propios en el modelo.
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
    if (meshNames.length > 0) requestFocus(meshNames);
  };

  return (
    <ul className="flex flex-col gap-0.5">
      {bones.map((bone) => {
        const active = selectedBoneId === bone.id;
        return (
          <li key={bone.id}>
            <button
              type="button"
              onClick={() => handleClick(bone.id, bone.meshNames)}
              aria-pressed={active}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                active
                  ? 'bg-slate-200/10 text-slate-50'
                  : 'text-slate-300 hover:bg-slate-200/[0.06] hover:text-slate-100'
              }`}
            >
              <span className="min-w-0 truncate">{bone.name}</span>
              {bone.bilateral && (
                <span className="shrink-0 text-[9px] uppercase tracking-[0.1em] text-slate-600">
                  Bilateral
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
