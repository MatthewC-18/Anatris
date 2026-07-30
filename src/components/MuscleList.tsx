// src/components/MuscleList.tsx
//
// Sidebar section listing the active region's muscles. This is the primary way
// to reach DEEP muscles that are occluded in the 3D view and can't be clicked.
//
// The muscle source follows the active region (store.region) via
// musclesForRegion (src/data/musclesByRegion.ts), so adding a region is a
// one-line entry in that central registry, not a change here.
//
// ONE ROW PER MUSCLE.
// The previous version nested the list under functional-group headers and
// inserted a muscle once per group it belongs to. In the shoulder that turned 18
// muscles into 37 rows -- supraspinatus under both "Manguito rotador" and
// "Abductores", trapezius three times -- which read as a bug and made the list
// alone 1639px of a 3343px sidebar. The functional grouping is genuinely useful
// ("who abducts?"), so it survives as a FILTER instead of as duplication: the
// chip row narrows the list to one group and highlights that whole group in 3D,
// which answers the same question in 18 rows instead of 37.
//
// Clicking a muscle:
//   - selects it (selectedMuscleId) -> highlighted in 3D, clinical panel shows
//   - requests the camera to focus on its meshes

import { useMemo, useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { musclesForRegion } from '../data/musclesByRegion';
import { FUNCTIONAL_GROUP_LABEL, type FunctionalGroup } from '../types/muscle';
import type { Muscle } from '../types/muscle';
import type { MuscleResolution } from '../lib/muscleResolver';

interface MuscleListProps {
  resolution: MuscleResolution;
}

// Display order of the group chips.
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
  'erector-spinae',
  'transversospinalis',
  'spinal-flexor',
  'lateral-flexor',
  'suboccipital',
  'craniocervical',
];

// The Unicode combining-diacritics block (U+0300..U+036F). Built from code
// points rather than typed as a literal character class so this source file
// stays ASCII -- see the encoding rule in RomPanel.tsx.
const DIACRITICS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g',
);

/** Accent-insensitive, case-insensitive comparison key for the text filter. */
function foldKey(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
}

export function MuscleList({ resolution }: MuscleListProps) {
  const region = useAnatomyStore((s) => s.region);
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const selectMuscle = useAnatomyStore((s) => s.selectMuscle);
  const selectMesh = useAnatomyStore((s) => s.selectMesh);
  const requestFocus = useAnatomyStore((s) => s.requestFocus);

  const muscles = musclesForRegion(region);
  const [group, setGroup] = useState<FunctionalGroup | 'all'>('all');
  const [query, setQuery] = useState('');

  // Which group chips this region actually has muscles for.
  const groups = useMemo(() => {
    const present = new Set<FunctionalGroup>();
    for (const m of muscles) for (const g of m.groups) present.add(g);
    return GROUP_ORDER.filter((g) => present.has(g));
  }, [muscles]);

  // One entry per muscle, alphabetical, narrowed by the active group + text.
  const visible = useMemo(() => {
    const q = foldKey(query.trim());
    return muscles
      .filter((m) => (group === 'all' ? true : m.groups.includes(group)))
      .filter((m) =>
        q === ''
          ? true
          : foldKey(m.name).includes(q) || foldKey(m.latin ?? '').includes(q),
      )
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [muscles, group, query]);

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

  /** Selecting a group also highlights the whole group in 3D, which is what the
   *  old group headers did -- the behaviour survives the flattening. */
  const handleGroupClick = (g: FunctionalGroup | 'all') => {
    setGroup(g);
    if (g === 'all') return;
    focusMuscleIds(muscles.filter((m) => m.groups.includes(g)).map((m) => m.id));
  };

  return (
    <div>
      {/* Text filter. The list can run past 30 entries in the knee and the spine,
          and the global palette (Ctrl K) searches the whole atlas, not this rail. */}
      <label className="sr-only" htmlFor="muscle-filter">
        Filtrar músculos
      </label>
      <input
        id="muscle-filter"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrar músculos…"
        className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-accent focus:outline-none"
      />

      {/* Functional-group chips. */}
      <div className="mt-2 flex flex-wrap gap-1">
        <GroupChip
          label="Todos"
          count={muscles.length}
          active={group === 'all'}
          onClick={() => handleGroupClick('all')}
        />
        {groups.map((g) => (
          <GroupChip
            key={g}
            label={FUNCTIONAL_GROUP_LABEL[g]}
            count={muscles.filter((m) => m.groups.includes(g)).length}
            active={group === g}
            onClick={() => handleGroupClick(g)}
          />
        ))}
      </div>

      <ul className="mt-2 flex flex-col gap-0.5">
        {visible.map((muscle) => {
          const active = muscle.id === selectedMuscleId;
          return (
            <li key={muscle.id}>
              <button
                type="button"
                onClick={() => handleMuscleClick(muscle)}
                aria-current={active ? 'true' : undefined}
                title={muscle.latin}
                className={[
                  'flex min-h-[2rem] w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
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

      {visible.length === 0 && (
        <p className="mt-3 px-1 text-xs text-slate-600">
          Ningún músculo coincide con «{query}».
        </p>
      )}
    </div>
  );
}

function GroupChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-full px-2 py-1 text-[11px] font-medium transition-colors',
        active
          ? 'bg-accent/20 text-accent'
          : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
      ].join(' ')}
    >
      {label}
      <span className={`ml-1 font-mono ${active ? 'text-accent/70' : 'text-slate-600'}`}>
        {count}
      </span>
    </button>
  );
}
