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
// LAMINA: ES EL MARGEN IZQUIERDO DE LA LAMINA (docs/sistema-lamina.md).
// Acoplado al borde de la ventana, separado del escenario por un filo y sin una
// sola caja dentro. Cada seccion plegable se anuncia con rotulo + filo + cuenta
// ("MUSCULOS ---- 18"), no con una banda tenida; la cuenta deja ver ANTES de
// abrir si la region tiene huesos o nervios que listar. El lado se elige con
// pestanas subrayadas en vez de con un control segmentado relleno.
//
// RESPONSIVE: on desktop a fixed left column; on compact screens inside a
// slide-in drawer (see App.tsx). The optional onNavigate callback lets the
// drawer close itself when the user picks something.

import { useMemo, useState } from 'react';
import { useAnatomyStore, type SideFilter } from '../store/anatomyStore';
import {
  LAYER_META,
  ANATOMICAL_LAYERS,
  SECONDARY_LAYERS,
} from '../lib/anatomyMeta';
import { MuscleList } from './MuscleList';
import { BoneList } from './BoneList';
import { listRegionStructures } from '../lib/regionStructures';
import { DepthPeeler } from './DepthPeeler';
import { RomPanel } from './RomPanel';
import { trackForRegion } from '../data/trackByRegion';
import { musclesForRegion } from '../data/musclesByRegion';
import type { AnatomyLayer, AnatomyIndex } from '../types/anatomy';
import type { MuscleResolution } from '../lib/muscleResolver';

/** The collapsible sections of the rail. */
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
  const region = useAnatomyStore((s) => s.region);

  // The count each header prints. Same builders the lists use, so the number
  // over a section is the number of rows inside it.
  const muscleCount = musclesForRegion(region).length;
  const boneCount = useMemo(
    () => (index ? listRegionStructures(index.entries, region, 'bones').length : null),
    [index, region],
  );
  const nerveCount = useMemo(
    () => (index ? listRegionStructures(index.entries, region, 'nerves').length : null),
    [index, region],
  );

  return (
    <nav
      aria-label="Controles de la región"
      className="margin margin-l h-full w-[260px] shrink-0"
    >
      <ModuleHeader />

      <div className="flex min-h-0 flex-1 flex-col">
        <Section
          id="muscles"
          title="Músculos"
          count={muscleCount}
          open={open}
          setOpen={setOpen}
        >
          <MuscleList resolution={resolution} />
        </Section>

        {/* Bones. The rail listed only muscles, so a clavicle -- a structure you
            cannot reach by clicking, which is exactly what a list is for -- had
            nowhere to be found. */}
        <Section id="bones" title="Huesos" count={boneCount} open={open} setOpen={setOpen}>
          {index ? (
            <BoneList index={index} />
          ) : (
            <p className="py-1 text-xs text-fg3">Cargando el modelo…</p>
          )}
        </Section>

        {/* Nerves. The whole brachial plexus ships in the model and none of it
            was reachable: the layer is off by default and the region's keywords
            let through only the nerves whose names contain "scapular". */}
        <Section id="nerves" title="Nervios" count={nerveCount} open={open} setOpen={setOpen}>
          {index ? (
            <BoneList index={index} kind="nerves" />
          ) : (
            <p className="py-1 text-xs text-fg3">Cargando el modelo…</p>
          )}
        </Section>

        <Section id="view" title="Capas y disección" open={open} setOpen={setOpen}>
          <DepthPeeler />
          <LayerControls index={index} />
          <SideControls />
          <DisplayControls />
        </Section>

        <Section id="rom" title="Rango de movimiento" open={open} setOpen={setOpen}>
          <RomPanel resolution={resolution} />
        </Section>
      </div>

      <div className="rule" />
      <footer className="shrink-0 px-4 py-3">
        <a
          href="mailto:soporte@anatris.app?subject=Anatris%20%E2%80%94%20reportar%20un%20problema"
          onClick={onNavigate}
          className="text-xs text-fg3 transition-colors hover:text-fg2"
        >
          Reportar un problema
        </a>
      </footer>
    </nav>
  );
}

/**
 * One accordion section. The header stays put; only the open body scrolls, so
 * the user can always reach the other sections without scrolling back up.
 *
 * The header is the LAMINA section head made clickable: chevron, kicker, a rule
 * that runs to the edge and, after the rule, the count.
 */
function Section({
  id,
  title,
  count,
  open,
  setOpen,
  children,
}: {
  id: SectionId;
  title: string;
  /** Rows inside, printed after the rule. null/undefined = nothing to count. */
  count?: number | null;
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
        // 44 px en el cajon tactil; 36 px en el margen de escritorio.
        className="group flex min-h-[44px] w-full shrink-0 items-center gap-2.5 px-4 text-left lg:min-h-[2.25rem]"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden="true"
          className={`shrink-0 transition-transform ${
            isOpen ? 'rotate-90 text-brand' : 'text-fg3 group-hover:text-fg2'
          }`}
        >
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span
          className={`kicker transition-colors ${
            isOpen ? 'text-fg' : 'group-hover:text-fg2'
          }`}
        >
          {title}
        </span>
        <span className="sec-rule" />
        {count != null && (
          <span className={`num text-[11px] ${isOpen ? 'text-fg2' : 'text-fg3'}`}>{count}</span>
        )}
      </button>
      {isOpen && (
        <div id={`section-${id}`} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1">
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
    <header className="shrink-0 px-4 pb-3 pt-4">
      <p className="kicker">Módulo</p>
      <h2 className="mt-2 font-display text-lg font-semibold leading-tight text-fg">
        {track.regionName}
      </h2>
    </header>
  );
}

/** Sub-heading inside the "Capas y disección" section: a kicker and air, no
 *  rule -- the rule is what announces an accordion section one level up. */
function SubHead({ children }: { children: React.ReactNode }) {
  return <p className="kicker mb-2 mt-5">{children}</p>;
}

function LayerControls({ index }: { index: AnatomyIndex | null }) {
  return (
    <div>
      <SubHead>Capas</SubHead>
      <div className="flex flex-col">
        {ANATOMICAL_LAYERS.map((layer) => (
          <LayerRow key={layer} layer={layer} index={index} />
        ))}
        <div className="rule my-1.5" />
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
    <label className="group flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 lg:min-h-[2rem]">
      <input
        type="checkbox"
        checked={on}
        onChange={() => toggleLayer(layer)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-brand"
      />
      <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
      <span
        className={`flex-1 text-[13px] transition-colors ${
          on ? 'text-fg' : 'text-fg3 group-hover:text-fg2'
        }`}
      >
        {meta.label}
      </span>
      <span className="num text-[11px] text-fg3">{count}</span>
    </label>
  );
}

function SideControls() {
  const sideFilter = useAnatomyStore((s) => s.sideFilter);
  const setSideFilter = useAnatomyStore((s) => s.setSideFilter);

  // Palabras enteras: "Der." e "Izq." eran abreviaturas forzadas por el ancho
  // del control segmentado. Como pestanas de texto las tres caben en los 228 px
  // utiles del margen.
  const options: Array<{ value: SideFilter; label: string }> = [
    { value: 'both', label: 'Ambos' },
    { value: 'right', label: 'Derecho' },
    { value: 'left', label: 'Izquierdo' },
  ];

  return (
    <div>
      <SubHead>Lado</SubHead>
      <div role="group" aria-label="Lado que se muestra" className="tabs">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSideFilter(opt.value)}
            aria-pressed={sideFilter === opt.value}
            className={`tab min-h-[44px] lg:min-h-0 ${sideFilter === opt.value ? 'is-active' : ''}`}
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
      <SubHead>Visualización</SubHead>
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
    <label className="group flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 lg:min-h-[2rem]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 cursor-pointer accent-brand"
      />
      <span
        className={`flex-1 text-[13px] transition-colors ${
          checked ? 'text-fg' : 'text-fg3 group-hover:text-fg2'
        }`}
      >
        {label}
      </span>
    </label>
  );
}
