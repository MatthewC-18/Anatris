// src/components/Sidebar.tsx
//
// Left navigation rail for "Explorar". Region-aware: the active module name and
// the muscle list follow the active region (store.region). The region SWITCH
// lives in the TopBar.
//
// ACCORDION, NOT A STACK.
// This rail used to render eight sections open at once -- Módulo, Fases,
// Profundidad, Rango de movimiento, Capas, Lado, Visualización, Músculos --
// which measured 3343px of content against 750px of viewport: 4.5 screens of
// scrolling with no hierarchy, where "Lado" (65px, touched once a session) had
// the same visual weight as "Músculos" (1639px, touched constantly). Three
// changes fix it:
//
//   1. ONE SECTION OPEN AT A TIME. The open body scrolls inside itself, so the
//      section headers never scroll out of reach.
//   2. MERGED VIEW CONTROLS. "Profundidad" and "Capas" were the same truth
//      twice (the slider is DERIVED from the active layers -- see DepthPeeler),
//      and "Lado" / "Visualización" are the same kind of setting. They are now
//      one "Vista" section.
//   3. FASES REMOVED. Those seven items navigate the *Aprender* mode; clicking
//      one threw the user out of Explorar. A mode switch disguised as a list
//      belongs in the mode switcher, not here.
//
// RESPONSIVE: on desktop a fixed left column; on compact screens inside a
// slide-in drawer (see App.tsx). The optional onNavigate callback lets the
// drawer close itself when the user picks something.

import { useState } from 'react';
import { useAnatomyStore, type SideFilter } from '../store/anatomyStore';
import {
  LAYER_META,
  ANATOMICAL_LAYERS,
  SECONDARY_LAYERS,
} from '../lib/anatomyMeta';
import { MuscleList } from './MuscleList';
import { BoneList } from './BoneList';
import { DepthPeeler } from './DepthPeeler';
import { RomPanel } from './RomPanel';
import { trackForRegion } from '../data/trackByRegion';
import type { AnatomyLayer, AnatomyIndex } from '../types/anatomy';
import type { MuscleResolution } from '../lib/muscleResolver';

/** The three collapsible sections of the rail. */
type SectionId = 'muscles' | 'bones' | 'nerves' | 'view' | 'rom';

interface SidebarProps {
  index: AnatomyIndex | null;
  resolution: MuscleResolution;
  /** Called when the user activates a navigation item; used to close the
   *  mobile drawer. Optional: omitted on desktop where there is no drawer. */
  onNavigate?: () => void;
  /** Kept for call-site compatibility; the phase navigator moved to the mode
   *  switcher (see the file header). */
  onOpenPhase?: () => void;
}

export function Sidebar({ index, resolution, onNavigate }: SidebarProps) {
  // Muscles first: it is the reason this rail exists.
  const [open, setOpen] = useState<SectionId>('muscles');

  return (
    <nav
      aria-label="Controles de la región"
      className="flex h-full w-[260px] shrink-0 flex-col border-r border-slate-800/60 bg-ink-950/80"
    >
      <div className="shrink-0 px-4 pb-3 pt-5">
        <ModuleHeader />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <Section
          id="muscles"
          title="Músculos"
          open={open}
          setOpen={setOpen}
        >
          <MuscleList resolution={resolution} />
        </Section>

        {/* Bones. The rail listed only muscles, so a clavicle -- a structure you
            cannot reach by clicking, which is exactly what a list is for -- had
            nowhere to be found. */}
        <Section id="bones" title="Huesos" open={open} setOpen={setOpen}>
          {index ? (
            <BoneList index={index} />
          ) : (
            <p className="px-1 py-2 text-xs text-slate-500">Cargando el modelo…</p>
          )}
        </Section>

        {/* Nerves. The whole brachial plexus ships in the model and none of it
            was reachable: the layer is off by default and the region's keywords
            let through only the nerves whose names contain "scapular". */}
        <Section id="nerves" title="Nervios" open={open} setOpen={setOpen}>
          {index ? (
            <BoneList index={index} kind="nerves" />
          ) : (
            <p className="px-1 py-2 text-xs text-slate-500">Cargando el modelo…</p>
          )}
        </Section>

        <Section id="view" title="Capas y disección" open={open} setOpen={setOpen}>
          <DepthPeeler />
          <div className="my-4 h-px bg-slate-800/60" />
          <LayerControls index={index} />
          <div className="my-4 h-px bg-slate-800/60" />
          <SideControls />
          <div className="my-4 h-px bg-slate-800/60" />
          <DisplayControls />
        </Section>

        <Section id="rom" title="Rango de movimiento" open={open} setOpen={setOpen}>
          <RomPanel resolution={resolution} />
        </Section>
      </div>

      <footer className="shrink-0 border-t border-slate-800/60 px-4 py-3">
        <a
          href="mailto:soporte@anatris.app?subject=Anatris%20%E2%80%94%20reportar%20un%20problema"
          onClick={onNavigate}
          className="text-xs text-slate-600 transition-colors hover:text-slate-400"
        >
          Reportar un problema
        </a>
      </footer>
    </nav>
  );
}

/**
 * One accordion section. The header stays put; only the open body scrolls, so
 * the user can always reach the other two sections without scrolling back up.
 */
function Section({
  id,
  title,
  open,
  setOpen,
  children,
}: {
  id: SectionId;
  title: string;
  open: SectionId;
  setOpen: (s: SectionId) => void;
  children: React.ReactNode;
}) {
  const isOpen = open === id;
  return (
    <div className={`flex min-h-0 flex-col ${isOpen ? 'flex-1' : 'shrink-0'}`}>
      <button
        type="button"
        onClick={() => setOpen(id)}
        aria-expanded={isOpen}
        aria-controls={`section-${id}`}
        className={`flex w-full shrink-0 items-center gap-2 border-t border-slate-800/60 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
          isOpen
            ? 'bg-slate-900/40 text-slate-300'
            : 'text-slate-600 hover:bg-slate-900/30 hover:text-slate-400'
        }`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden="true"
          className={`shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        >
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {title}
      </button>
      {isOpen && (
        <div id={`section-${id}`} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
      )}
    </div>
  );
}

function ModuleHeader() {
  const region = useAnatomyStore((s) => s.region);
  const track = trackForRegion(region);

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
        Módulo
      </p>
      <h2 className="mt-1 font-display text-lg font-semibold text-slate-100">
        {track.regionName}
      </h2>
    </div>
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

  // A real <input type="checkbox">, not a button with a drawn box: assistive
  // tech needs to hear "checkbox, checked", and the drawn version announced
  // nothing at all.
  return (
    <label className="group flex min-h-[2rem] w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-800/40">
      <input
        type="checkbox"
        checked={on}
        onChange={() => toggleLayer(layer)}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-600 bg-transparent accent-accent"
      />
      <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
      <span className={`flex-1 text-sm ${on ? 'text-slate-200' : 'text-slate-500'}`}>
        {meta.label}
      </span>
      <span className="font-mono text-[11px] text-slate-600">{count}</span>
    </label>
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
            aria-pressed={sideFilter === opt.value}
            className={[
              'min-h-[2rem] flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-all',
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

// Extra display options: the two "reveal the clutter" switches. Both hide
// structures that are anatomically real but bury the region when shown by
// default -- the small .o/.e attachment markers, and the accessory connective
// tissue (bursae, fascial sheets, tendon sheaths). Each is opt-in for the moment
// you actually teach it: a muscle's attachments, or a trochanteric bursitis.
function DisplayControls() {
  const showOriginInsertion = useAnatomyStore((s) => s.showOriginInsertion);
  const toggleOriginInsertion = useAnatomyStore((s) => s.toggleOriginInsertion);
  const showAccessoryTissue = useAnatomyStore((s) => s.showAccessoryTissue);
  const toggleAccessoryTissue = useAnatomyStore((s) => s.toggleAccessoryTissue);
  const showAtlasLabels = useAnatomyStore((s) => s.showAtlasLabels);
  const toggleAtlasLabels = useAnatomyStore((s) => s.toggleAtlasLabels);

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
        Visualización
      </p>
      <DisplayToggle
        checked={showAtlasLabels}
        onChange={toggleAtlasLabels}
        label="Nombres en el margen"
      />
      <DisplayToggle
        checked={showOriginInsertion}
        onChange={toggleOriginInsertion}
        label="Orígenes e inserciones"
      />
      <DisplayToggle
        checked={showAccessoryTissue}
        onChange={toggleAccessoryTissue}
        label="Bolsas y fascias"
      />
    </div>
  );
}

function DisplayToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="group flex min-h-[2rem] w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-800/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-600 bg-transparent accent-accent"
      />
      <span className={`flex-1 text-sm ${checked ? 'text-slate-200' : 'text-slate-500'}`}>
        {label}
      </span>
    </label>
  );
}
