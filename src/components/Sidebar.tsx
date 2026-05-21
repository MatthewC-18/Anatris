// src/components/Sidebar.tsx
//
// Left navigation rail. Shows the active module with a progress placeholder,
// the seven pedagogical phases (display-only until the content phase wires
// them up), the layer toggles with live visible-count badges, the side
// filter, and the per-muscle list (grouped by function) for reaching deep
// muscles that can't be clicked directly in the 3D view.

import { useAnatomyStore, type SideFilter } from '../store/anatomyStore';
import {
  LAYER_META,
  ANATOMICAL_LAYERS,
  SECONDARY_LAYERS,
} from '../lib/anatomyMeta';
import { MuscleList } from './MuscleList';
import type { AnatomyLayer, AnatomyIndex } from '../types/anatomy';
import type { MuscleResolution } from '../lib/muscleResolver';

interface SidebarProps {
  index: AnatomyIndex | null;
  resolution: MuscleResolution;
}

// Placeholder phases for the shoulder module. Wired up in a later phase.
const PHASES = [
  'Terminología y orientación',
  'Anatomía descriptiva',
  'Biomecánica y cinemática',
  'Palpación de superficie',
  'Evaluación y pruebas',
  'Patología frecuente',
  'Razonamiento y tratamiento',
];

export function Sidebar({ index, resolution }: SidebarProps) {
  return (
    <nav className="flex h-full w-[260px] shrink-0 flex-col border-r border-slate-800/60 bg-ink-950/80">
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <ModuleHeader />
        <PhaseList />
        <div className="my-5 h-px bg-slate-800/60" />
        <LayerControls index={index} />
        <div className="my-5 h-px bg-slate-800/60" />
        <SideControls />
        <div className="my-5 h-px bg-slate-800/60" />
        <MuscleList resolution={resolution} />
      </div>

      <footer className="border-t border-slate-800/60 px-4 py-3">
        <button className="text-xs text-slate-600 transition-colors hover:text-slate-400">
          Reportar un problema
        </button>
      </footer>
    </nav>
  );
}

function ModuleHeader() {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
        Módulo
      </p>
      <h2 className="mt-1 font-display text-lg font-semibold text-slate-100">
        Hombro
      </h2>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-[28%] rounded-full bg-accent" />
        </div>
        <span className="font-mono text-[11px] text-slate-500">28%</span>
      </div>
    </div>
  );
}

function PhaseList() {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
        Fases
      </p>
      <ul className="flex flex-col gap-0.5">
        {PHASES.map((phase, i) => {
          const state = i < 2 ? 'done' : i === 2 ? 'active' : 'locked';
          return (
            <li key={phase}>
              <button
                disabled={state === 'locked'}
                className={[
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                  state === 'active'
                    ? 'bg-accent/10 text-accent'
                    : state === 'done'
                      ? 'text-slate-300 hover:bg-slate-800/40'
                      : 'cursor-not-allowed text-slate-600',
                ].join(' ')}
              >
                <PhaseDot state={state} index={i + 1} />
                <span className="truncate">{phase}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PhaseDot({
  state,
  index,
}: {
  state: 'done' | 'active' | 'locked';
  index: number;
}) {
  if (state === 'done') {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={[
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]',
        state === 'active'
          ? 'bg-accent text-ink-950'
          : 'bg-slate-800 text-slate-500',
      ].join(' ')}
    >
      {index}
    </span>
  );
}

function LayerControls({ index }: { index: AnatomyIndex | null }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
        Capas
      </p>
      <div className="flex flex-col gap-0.5">
        {ANATOMICAL_LAYERS.map((layer) => (
          <LayerRow key={layer} layer={layer} index={index} />
        ))}
        <div className="my-1.5 h-px bg-slate-800/40" />
        {SECONDARY_LAYERS.map((layer) => (
          <LayerRow key={layer} layer={layer} index={index} />
        ))}
      </div>
    </div>
  );
}

function LayerRow({
  layer,
  index,
}: {
  layer: AnatomyLayer;
  index: AnatomyIndex | null;
}) {
  const activeLayers = useAnatomyStore((s) => s.activeLayers);
  const toggleLayer = useAnatomyStore((s) => s.toggleLayer);
  const on = activeLayers.has(layer);
  const meta = LAYER_META[layer];
  const count = index?.entriesByLayer[layer] ?? 0;

  return (
    <button
      type="button"
      onClick={() => toggleLayer(layer)}
      className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-800/40"
    >
      <span
        className={[
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
          on
            ? 'border-accent bg-accent'
            : 'border-slate-600 bg-transparent group-hover:border-slate-500',
        ].join(' ')}
      >
        {on && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#070b14" strokeWidth="4">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
      <span className={`flex-1 text-sm ${on ? 'text-slate-200' : 'text-slate-500'}`}>
        {meta.label}
      </span>
      <span className="font-mono text-[11px] text-slate-600">{count}</span>
    </button>
  );
}

function SideControls() {
  const sideFilter = useAnatomyStore((s) => s.sideFilter);
  const setSideFilter = useAnatomyStore((s) => s.setSideFilter);

  const options: Array<{ value: SideFilter; label: string }> = [
    { value: 'both', label: 'Ambos' },
    { value: 'right', label: 'Der.' },
    { value: 'left', label: 'Izq.' },
  ];

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
        Lado
      </p>
      <div className="flex gap-1 rounded-xl bg-slate-900/60 p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSideFilter(opt.value)}
            className={[
              'flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-all',
              sideFilter === opt.value
                ? 'bg-accent text-ink-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
