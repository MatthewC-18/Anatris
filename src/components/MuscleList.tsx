// src/components/MuscleList.tsx
//
// Sidebar section listing the region's muscles grouped by functional group
// (rotator cuff, abductors, ...). This is the primary way to reach DEEP muscles
// that are occluded in the 3D view and can't be clicked directly.
//
// Clicking a muscle:
//   - selects it (selectedMuscleId) -> highlighted in 3D, clinical panel shows
//   - requests the camera to focus on its meshes
// Clicking a group header selects/focuses the whole group at once.

import { useMemo } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { shoulderMuscles } from '../data/muscles/shoulder';
import { FUNCTIONAL_GROUP_LABEL, type FunctionalGroup } from '../types/muscle';
import type { Muscle } from '../types/muscle';
import type { MuscleResolution } from '../lib/muscleResolver';

interface MuscleListProps {
  resolution: MuscleResolution;
}

// Display order of groups in the list.
const GROUP_ORDER: FunctionalGroup[] = [
  'rotator-cuff',
  'abductor',
  'adductor',
  'flexor',
  'extensor',
  'internal-rotator',
  'external-rotator',
  'elevator',
  'depressor',
  'protractor',
  'retractor',
];

export function MuscleList({ resolution }: MuscleListProps) {
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const selectMuscle = useAnatomyStore((s) => s.selectMuscle);
  const selectMesh = useAnatomyStore((s) => s.selectMesh);
  const requestFocus = useAnatomyStore((s) => s.requestFocus);

  // Group muscles by their (first / primary) functional groups. A muscle can
  // appear under several groups — that's intentional for the dual view.
  const grouped = useMemo(() => {
    const map = new Map<FunctionalGroup, Muscle[]>();
    for (const muscle of shoulderMuscles) {
      for (const g of muscle.groups) {
        const list = map.get(g) ?? [];
        list.push(muscle);
        map.set(g, list);
      }
    }
    return map;
  }, []);

  const focusMuscleIds = (ids: string[]) => {
    const names: string[] = [];
    for (const id of ids) {
      const meshes = resolution.meshNamesByMuscleId.get(id);
      if (meshes) names.push(...meshes);
    }
    if (names.length > 0) requestFocus(names);
  };

  const handleMuscleClick = (muscle: Muscle) => {
    selectMuscle(muscle.id);
    // Also set a representative mesh so the clinical panel (which reads
    // selectedMeshName) shows this muscle's record.
    const meshes = resolution.meshNamesByMuscleId.get(muscle.id);
    if (meshes && meshes.length > 0) selectMesh(meshes[0]);
    focusMuscleIds([muscle.id]);
  };

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
        Músculos del hombro
      </p>
      <div className="flex flex-col gap-3">
        {GROUP_ORDER.filter((g) => grouped.has(g)).map((group) => {
          const muscles = grouped.get(group)!;
          return (
            <div key={group}>
              <button
                type="button"
                onClick={() => focusMuscleIds(muscles.map((m) => m.id))}
                className="mb-1 flex w-full items-center gap-2 text-left text-[11px] font-semibold uppercase tracking-wide text-cyan-500/80 transition-colors hover:text-cyan-400"
              >
                <span className="h-px flex-1 bg-cyan-900/30" />
                {FUNCTIONAL_GROUP_LABEL[group]}
                <span className="h-px flex-1 bg-cyan-900/30" />
              </button>
              <ul className="flex flex-col gap-0.5">
                {muscles.map((muscle) => {
                  const active = muscle.id === selectedMuscleId;
                  return (
                    <li key={muscle.id}>
                      <button
                        type="button"
                        onClick={() => handleMuscleClick(muscle)}
                        className={[
                          'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                          active
                            ? 'bg-accent/15 text-accent'
                            : 'text-slate-300 hover:bg-slate-800/40',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                            active ? 'bg-accent' : 'bg-slate-600',
                          ].join(' ')}
                        />
                        <span className="truncate">{muscle.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
