// src/components/ConceptStage.tsx
//
// The 3D STAGE of a conceptual module (Fundamentos). Before this, the left half
// of Fundamentos was a bare viewer: a static body with no controls, no title and
// nothing to do, while three of the seven sections had no 3D content at all and
// left the whole pane idle. This turns that space into the teaching surface:
//
//   - it TITLES what is on screen (section kicker + caption), so the model is
//     never an unexplained body;
//   - it DRIVES itself from the active section: camera view + planes/axes
//     overlay apply on section change, no "Ver en 3D" button to hunt for;
//   - it carries the LAYER and VIEW controls, which live in the Sidebar and the
//     ViewToolbar everywhere else and were simply unreachable here (that is why
//     the module could get stuck showing a bare skeleton with no way back);
//   - it SWAPS to the section's schematic (contraction / levers / chains) at
//     full size, so the reading-only sections fill the pane instead of idling.
//
// Layout follows the lab's instrument language (see index.css): ONE .instrument
// surface per corner, sections split by hairlines and typographic rank, never a
// stack of nested cards.
//
// The 3D itself is passed as `children` so this component stays presentational
// and never imports the viewer (which is lazy-loaded by App).

import { useEffect, useState, type ReactNode } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { ANATOMICAL_LAYERS, LAYER_META, VIEW_META, VIEW_ORDER } from '../lib/anatomyMeta';
import { ConceptDiagramView, hasDiagram } from './ConceptDiagrams';
import { Sourced } from './MuscleContentSections';
import type { AnatomyLayer, CameraView } from '../types/anatomy';
import type { ConceptOverlay, ConceptSection } from '../types/concept';

/** Layers offered on the concept stage. Organs/vessels stay out: they add noise
 *  to a lesson about planes and axes without teaching anything here. */
const STAGE_LAYERS: AnatomyLayer[] = ANATOMICAL_LAYERS.filter(
  (l) => l !== 'organs' && l !== 'vessels',
).concat('skin');

/** Overlay choices, in teaching order. */
const OVERLAY_CHOICES: { id: ConceptOverlay; label: string }[] = [
  { id: 'none', label: 'Ninguna' },
  { id: 'planes', label: 'Planos' },
  { id: 'axes', label: 'Ejes' },
  { id: 'planes-and-axes', label: 'Ambos' },
];

/** What the stage is currently showing. */
type StageMode = 'model' | 'diagram';

interface ConceptStageProps {
  /** The section being read in the column beside the stage. */
  section: ConceptSection | undefined;
  /** 1-based index of that section, for the kicker. */
  index: number;
  /** How many sections the module has. */
  total: number;
  /** The live 3D viewer. */
  children: ReactNode;
}

export function ConceptStage({ section, index, total, children }: ConceptStageProps) {
  const requestView = useAnatomyStore((s) => s.requestView);
  const requestConceptOverlay = useAnatomyStore((s) => s.requestConceptOverlay);
  const overlay = useAnatomyStore((s) => s.conceptOverlay);

  const diagram = hasDiagram(section?.diagram);
  const sectionId = section?.id ?? '';

  // A section that carries a schematic opens on the schematic (that IS its
  // visual); a section with a 3D overlay opens on the model. Keyed by section id
  // so switching sections re-decides instead of stranding the user on a stale
  // mode -- but only on a real section CHANGE, so a manual toggle sticks while
  // the reader stays put.
  const [mode, setMode] = useState<StageMode>(diagram ? 'diagram' : 'model');
  useEffect(() => {
    setMode(hasDiagram(section?.diagram) ? 'diagram' : 'model');
  }, [sectionId, section?.diagram]);

  // The stage follows the section: apply its overlay + camera framing. Sections
  // without a `view` fall back to no overlay and a neutral anterior framing, so
  // the model never keeps the previous section's planes drawn over it.
  useEffect(() => {
    if (!section) return;
    requestConceptOverlay(section.view?.overlay ?? 'none');
    requestView(section.view?.view ?? 'anterior');
  }, [sectionId, section, requestConceptOverlay, requestView]);

  return (
    <div className="relative h-full w-full">
      {/* The live model. Kept MOUNTED while the schematic shows (unmounting the
          canvas would re-download and re-frame the GLB on every toggle); it is
          just hidden, so coming back is instant.
          The swap is DESKTOP ONLY (lg:): on compact the stage is a 45vh strip
          above the text, and there the schematic travels with the prose as the
          inline figure instead, so the model keeps the strip. */}
      <div className={`h-full w-full ${mode === 'diagram' ? 'lg:invisible' : ''}`}>
        {children}
      </div>

      {mode === 'diagram' && section?.diagram && (
        <div className="absolute inset-0 hidden items-center justify-center px-6 py-20 lg:flex">
          <div className="w-full max-w-2xl">
            <ConceptDiagramView kind={section.diagram} size="stage" />
          </div>
        </div>
      )}

      {/* ---- TOP LEFT: what you are looking at ---- */}
      {section && (
        <div className="instrument pointer-events-none absolute left-4 top-4 z-20 max-w-[19rem] px-4 py-3">
          <p className="kicker">
            Fundamentos · {index} de {total}
          </p>
          <h2 className="mt-1 font-display text-[15px] font-semibold leading-snug text-slate-50">
            {section.title}
          </h2>
          {/* A caption when the section wrote one for its 3D view, otherwise the
              section summary: the stage always says what is on screen. */}
          <div className="hairline my-2.5" />
          {section.view?.caption ? (
            <div className="text-[12px] leading-relaxed text-slate-400">
              <Sourced item={section.view.caption} />
            </div>
          ) : (
            <p className="text-[12px] leading-relaxed text-slate-400">
              {section.summary}
            </p>
          )}
        </div>
      )}

      {/* ---- TOP RIGHT: model vs schematic (only when there is a schematic,
              and only where the swap happens: desktop) ---- */}
      {diagram && (
        <div className="instrument absolute right-4 top-4 z-20 hidden items-center gap-1 p-1 lg:flex">
          <StageTab active={mode === 'model'} onClick={() => setMode('model')}>
            Modelo
          </StageTab>
          <StageTab active={mode === 'diagram'} onClick={() => setMode('diagram')}>
            Esquema
          </StageTab>
        </div>
      )}

      {/* ---- BOTTOM LEFT: layers. Hidden on compact, where the stage is a
              45vh strip and the corners would cover the body. ---- */}
      <div className="instrument absolute bottom-4 left-4 z-20 hidden max-w-[17rem] px-3 py-2.5 lg:block">
        <p className="kicker">Capas</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STAGE_LAYERS.map((layer) => (
            <LayerChip key={layer} layer={layer} />
          ))}
        </div>
      </div>

      {/* ---- BOTTOM RIGHT: camera views + overlay ---- */}
      <div className="instrument absolute bottom-4 right-4 z-20 hidden px-3 py-2.5 lg:block">
        <p className="kicker">Vista</p>
        <div className="mt-1.5 flex items-center gap-0.5">
          {VIEW_ORDER.map((view) => (
            <ViewButton key={view} view={view} onClick={() => requestView(view)} />
          ))}
        </div>
        <div className="hairline my-2.5" />
        <p className="kicker">Superposición</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {OVERLAY_CHOICES.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => requestConceptOverlay(o.id)}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
                overlay === o.id
                  ? 'bg-accent/20 text-accent'
                  : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===========================================================================
 * PIECES
 * ======================================================================== */

function StageTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-accent/20 text-accent'
          : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

/** One layer toggle, showing its palette dot so the chip names the color the
 *  student sees in the scene. */
function LayerChip({ layer }: { layer: AnatomyLayer }) {
  const active = useAnatomyStore((s) => s.activeLayers.has(layer));
  const toggleLayer = useAnatomyStore((s) => s.toggleLayer);
  const meta = LAYER_META[layer];
  return (
    <button
      type="button"
      onClick={() => toggleLayer(layer)}
      aria-pressed={active}
      title={meta.description}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
        active
          ? 'bg-slate-700/50 text-slate-100'
          : 'text-slate-500 hover:bg-slate-700/30 hover:text-slate-300'
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${meta.dot} ${
          active ? '' : 'opacity-30'
        }`}
      />
      {meta.label}
    </button>
  );
}

/** Camera-view button. Own inline SVG, matching the ViewToolbar's icon set. */
function ViewButton({ view, onClick }: { view: CameraView; onClick: () => void }) {
  const meta = VIEW_META[view];
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${meta.label} · tecla ${meta.key}`}
      aria-label={meta.label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-accent/10 hover:text-accent active:scale-95"
    >
      <ViewIcon view={view} />
    </button>
  );
}

function ViewIcon({ view }: { view: CameraView }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (view) {
    case 'anterior':
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="3" />
          <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
        </svg>
      );
    case 'posterior':
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="3" />
          <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
          <path d="M9 12h6" />
        </svg>
      );
    case 'lateral-right':
      return (
        <svg {...common}>
          <path d="M9 4c0 4 3 5 3 8s-3 4-3 8" />
          <circle cx="9" cy="4.5" r="2" />
        </svg>
      );
    case 'lateral-left':
      return (
        <svg {...common} style={{ transform: 'scaleX(-1)' }}>
          <path d="M9 4c0 4 3 5 3 8s-3 4-3 8" />
          <circle cx="9" cy="4.5" r="2" />
        </svg>
      );
    case 'superior':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      );
    case 'three-quarter':
      return (
        <svg {...common}>
          <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
          <path d="M3 8l9 5 9-5M12 13v8" />
        </svg>
      );
  }
}
