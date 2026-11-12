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
// ("who abducts?"), so it survives as a FILTER instead of as duplication: it
// narrows the list to one group and frames that whole group in 3D, which
// answers the same question in 18 rows instead of 37.
//
// EL FILTRO OCUPABA MAS QUE LA LISTA QUE FILTRA.
// Ese filtro era una fila de fichas redondeadas tenidas: en el hombro, 12
// fichas ("Todos 18", "Manguito rotador 4", "Protractores (abduccion
// escapular) 2"...) para 18 musculos. En un margen de 228 px utiles caben una o
// dos por renglon, asi que se apilaban en seis o mas filas y empujaban el
// primer musculo por debajo de la mitad de la seccion. Ahora es UNA linea en
// reposo ("Funcion: Todas 18") que se despliega en una lista de opciones con su
// cuenta y se recoge al elegir. El grupo activo queda escrito en esa linea, con
// "Quitar" al lado, de modo que nunca hay un filtro puesto que no se vea.
//
// Clicking a muscle:
//   - selects it (selectedMuscleId) -> highlighted in 3D, clinical panel shows
//   - requests the camera to focus on its meshes

import { useEffect, useMemo, useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { musclesForRegion } from '../data/musclesByRegion';
import { FUNCTIONAL_GROUP_LABEL, type FunctionalGroup } from '../types/muscle';
import type { Muscle } from '../types/muscle';
import type { MuscleResolution } from '../lib/muscleResolver';

interface MuscleListProps {
  resolution: MuscleResolution;
}

// Display order of the function filter.
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
  const [filterOpen, setFilterOpen] = useState(false);

  // Which function groups this region actually has muscles for, with the count
  // each one lists. Computed ONCE from the same predicate the list uses below,
  // so the number printed next to a group is by construction the number of rows
  // it leaves.
  const groups = useMemo(() => {
    const count = new Map<FunctionalGroup, number>();
    for (const m of muscles) {
      for (const g of new Set(m.groups)) count.set(g, (count.get(g) ?? 0) + 1);
    }
    return GROUP_ORDER.filter((g) => count.has(g)).map((g) => ({
      id: g,
      count: count.get(g) ?? 0,
    }));
  }, [muscles]);

  // EL FILTRO SOBREVIVIA AL CAMBIO DE REGION. El grupo elegido es estado de
  // este componente y el componente no se desmonta al cambiar de region: con
  // "Manguito rotador" puesto en el hombro, al pasar a la rodilla (que no tiene
  // ese grupo) la lista salia VACIA y sin ningun control marcado que lo
  // explicara, porque la ficha del grupo activo ya no existia para quitarla.
  // Un grupo que la region no tiene se suelta.
  useEffect(() => {
    if (group !== 'all' && !groups.some((g) => g.id === group)) setGroup('all');
  }, [group, groups]);

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

  /** Selecting a group also frames the whole group in 3D, which is what the old
   *  group headers did -- the behaviour survives the flattening. */
  const handleGroupClick = (g: FunctionalGroup | 'all') => {
    setGroup(g);
    setFilterOpen(false);
    if (g === 'all') return;
    focusMuscleIds(muscles.filter((m) => m.groups.includes(g)).map((m) => m.id));
  };

  const groupLabel = group === 'all' ? 'Todas' : FUNCTIONAL_GROUP_LABEL[group];
  const groupCount =
    group === 'all' ? muscles.length : (groups.find((g) => g.id === group)?.count ?? 0);

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
        placeholder="Filtrar por nombre o latín…"
        className="field"
      />

      {/* Function filter: one line at rest. */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
          aria-controls="muscle-function-filter"
          title="Filtrar la lista por función"
          className="group flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left lg:min-h-[2.25rem]"
        >
          <span className="kicker shrink-0">Función</span>
          <span
            className={`min-w-0 flex-1 truncate text-[13px] ${
              group === 'all' ? 'text-fg2 group-hover:text-fg' : 'font-semibold text-fg'
            }`}
          >
            {groupLabel}
          </span>
          <span className="num shrink-0 text-[11px] text-fg3">{groupCount}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
            className={`shrink-0 text-fg3 transition-transform ${filterOpen ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {group !== 'all' && (
          <button
            type="button"
            onClick={() => handleGroupClick('all')}
            className="btn btn-quiet btn-sm shrink-0"
          >
            Quitar
          </button>
        )}
      </div>

      {filterOpen && (
        <div
          id="muscle-function-filter"
          role="radiogroup"
          aria-label="Filtrar músculos por función"
          className="mb-2 border-l border-line pl-3"
        >
          <FunctionOption
            label="Todas"
            count={muscles.length}
            active={group === 'all'}
            onClick={() => handleGroupClick('all')}
          />
          {groups.map((g) => (
            <FunctionOption
              key={g.id}
              label={FUNCTIONAL_GROUP_LABEL[g.id]}
              count={g.count}
              active={group === g.id}
              onClick={() => handleGroupClick(g.id)}
            />
          ))}
        </div>
      )}

      <div className="rule" />

      <ul className="mt-1.5 flex flex-col">
        {visible.map((muscle) => {
          const active = muscle.id === selectedMuscleId;
          return (
            <li key={muscle.id}>
              <button
                type="button"
                onClick={() => handleMuscleClick(muscle)}
                aria-current={active ? 'true' : undefined}
                title={muscle.latin}
                // 44 px en el cajon tactil (por debajo de lg), la fila normal
                // de 30 px en el margen de escritorio.
                className={`opt min-h-[44px] lg:min-h-[1.875rem] ${active ? 'is-active' : ''}`}
              >
                <span className="min-w-0 flex-1 truncate">{muscle.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && (
        <div className="mt-3">
          <p className="text-xs leading-relaxed text-fg3">
            {group === 'all'
              ? `Ningún músculo coincide con «${query}».`
              : `Ningún músculo de «${groupLabel}» coincide con «${query}».`}
          </p>
          {/* Con un grupo puesto, el musculo buscado puede existir fuera de el:
              la salida se ofrece aqui en vez de dejar al usuario adivinando que
              el filtro de funcion seguia activo. */}
          {group !== 'all' && (
            <button
              type="button"
              onClick={() => handleGroupClick('all')}
              className="btn btn-line btn-sm mt-2"
            >
              Buscar en todos los músculos
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** One row of the function filter: a radio with the count it leaves. */
function FunctionOption({
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
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className="opt min-h-[44px] lg:min-h-[1.875rem]"
    >
      <span className="min-w-0 flex-1">{label}</span>
      <span className="num shrink-0 text-[11px] font-normal text-fg3">{count}</span>
    </button>
  );
}
