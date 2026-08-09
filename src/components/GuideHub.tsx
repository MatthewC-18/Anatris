// src/components/GuideHub.tsx
//
// GUÍA RÁPIDA: an always-available "where is everything?" hub, opened from the
// permanent "?" button in the TopBar. Unlike the one-time OnboardingTour, this
// is a persistent map the user can reopen anytime they feel lost among the many
// regions / modes / panels.
//
// It is CONTEXTUAL: it shows "estás aquí" (current region + mode), lets the user
// JUMP to any of the four modes, explains how to change region and search, and
// surfaces the actions available in the CURRENT mode (so they stop clicking
// around to find things). It can also reopen the guided tour.
//
// UI strings Spanish LATAM; code/ids ASCII.

import { useAnatomyStore } from '../store/anatomyStore';
import { shortcutLabel, type AppMode } from './TopBar';
import { MODE_NAV, modeLabel, regionLabel, routeForRegion } from '../lib/navigation';

interface ModeInfo {
  id: AppMode;
  label: string;
  tagline: string;
  /** One-liner shown on the card. */
  desc: string;
  /** Longer "what you can do here" list, shown when this is the active mode. */
  actions: string[];
  icon: React.ReactNode;
}

/** Per-mode copy and icon, keyed by mode id. Order comes from MODE_NAV. */
const MODE_DETAIL: Record<
  AppMode,
  { desc: string; actions: string[]; icon: React.ReactNode }
> = {
  explore: {
    desc: 'Haz clic en cualquier estructura para ver su ficha clínica.',
    actions: [
      'Clic en un músculo/hueso → ficha en el panel derecho (Detalle): origen, inserción, inervación, acciones.',
      'Panel izquierdo: lista de estructuras de la región para navegarlas por nombre.',
      'Barra flotante del visor: girar, capas y encuadre del modelo. Teclas 1 a 6 para las seis vistas.',
    ],
    icon: <IconExplore />,
  },
  learn: {
    desc: 'Recorrido clínico guiado, fase por fase, de cada región.',
    actions: [
      'Sigue las 7 fases: Anatomía → Biomecánica → Palpación → Tests → Patología → Tratamiento → Caso clínico.',
      'En Fundamentos, el modelo muestra planos y ejes junto al texto.',
      'Cada fase enlaza con las estructuras del modelo 3D.',
    ],
    icon: <IconLearn />,
  },
  movement: {
    desc: 'Anima el rango, los músculos y los tests ortopédicos.',
    actions: [
      'Elige un movimiento y pulsa reproducir: los músculos se activan en tiempo real.',
      'Panel "Capas": pela piel → músculo → hueso → tendones.',
      'Botón "Tests ortopédicos": pruebas con sensibilidad/especificidad, demo 3D, calculadora de Fagan y clúster.',
    ],
    icon: <IconMovement />,
  },
  study: {
    desc: 'Quizzes y flashcards automáticos para memorizar.',
    actions: [
      'Genera preguntas y tarjetas a partir del contenido de la región.',
      'Ideal para preparar exámenes: repite hasta afianzar.',
    ],
    icon: <IconStudy />,
  },
};

// Built from the shared map so the guide lists the modes in the same order the
// header and the trail do, and can never fall out of sync with them.
const MODES: ModeInfo[] = MODE_NAV.map((m) => ({
  id: m.id,
  label: m.label,
  tagline: m.tagline,
  ...MODE_DETAIL[m.id],
}));

interface GuideHubProps {
  mode: AppMode;
  regionId: string;
  /** Conceptual module (Fundamentos): its route has two steps, not four. */
  isConcept: boolean;
  /** Jump to a mode and close the guide. */
  onGo: (m: AppMode) => void;
  /** Reopen the step-by-step onboarding tour. */
  onReopenTour: () => void;
  /** Open the pricing overlay. */
  onOpenPricing: () => void;
  /** Open the region's "Evidencia" page (all sources + PubMed links). */
  onOpenEvidence: () => void;
  /** Open the credits / legal / shortcut overlays (not in the header bar). */
  onOpenOverlay?: (overlay: 'about' | 'legal' | 'shortcuts') => void;
  /** Close the guide. */
  onClose: () => void;
}

export function GuideHub({
  mode,
  regionId,
  isConcept,
  onGo,
  onReopenTour,
  onOpenPricing,
  onOpenEvidence,
  onOpenOverlay,
  onClose,
}: GuideHubProps) {
  const setPaletteOpen = useAnatomyStore((s) => s.setPaletteOpen);
  const label = regionLabel(regionId);
  const active = MODES.find((m) => m.id === mode) ?? MODES[0];
  const route = routeForRegion(isConcept);

  const openSearch = () => {
    onClose();
    setPaletteOpen(true);
  };

  return (
    <div className="px-5 py-5">
      {/* Estás aquí */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/40 px-3.5 py-2.5">
        <span className="text-[11px] uppercase tracking-wide text-slate-500">Estás en</span>
        <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
          {label}
        </span>
        <span className="text-slate-600">·</span>
        <span className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-xs font-semibold text-slate-200">
          {active.icon}
          {active.label}
        </span>
        <span className="ml-auto text-[11px] text-slate-500">{active.tagline}</span>
      </div>

      {/* EL CAMINO. The same route the ContextBar draws as a line, written out
          here in full: the guide is where a lost user goes, and "do these four
          things in this order" is the answer they came for. */}
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        El camino recomendado en {label}
      </h3>
      <ol className="mb-5 flex flex-wrap items-center gap-1">
        {route.map((m, i) => (
          <li key={m} className="flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden="true" className="text-slate-700">
                →
              </span>
            )}
            <button
              type="button"
              onClick={() => onGo(m)}
              aria-current={m === mode ? 'step' : undefined}
              className={[
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                m === mode
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-slate-800/70 text-slate-400 hover:border-slate-700 hover:text-slate-200',
              ].join(' ')}
            >
              <span className="tnum font-mono text-[10px] text-slate-600">{i + 1}</span>
              {modeLabel(m)}
            </button>
          </li>
        ))}
      </ol>

      {/* Los modos, en detalle */}
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Qué hace cada modo · toca uno para ir
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MODES.map((m) => {
          const isActive = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onGo(m.id)}
              className={[
                'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                isActive
                  ? 'border-accent/50 bg-accent/10'
                  : 'border-slate-800/70 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/40',
              ].join(' ')}
            >
              <span
                className={[
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  isActive ? 'bg-accent/20 text-accent' : 'bg-slate-800/70 text-slate-300',
                ].join(' ')}
              >
                {m.icon}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-100">{m.label}</span>
                  {isActive && (
                    <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                      aquí
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">
                  {m.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* En este modo */}
      <div className="mt-5 rounded-xl border border-slate-800/70 bg-slate-900/40 p-3.5">
        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
          {active.icon}
          En «{active.label}» puedes
        </h3>
        <ul className="space-y-1.5">
          {active.actions.map((a, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-300">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/70" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Cómo moverte */}
      <h3 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Cómo moverte
      </h3>
      <ul className="space-y-1.5">
        <GuideTip>
          <b className="text-slate-200">Saber dónde estás</b>: la tira bajo la barra superior
          muestra el rastro (región / modo / estructura) y el paso en el que vas. Cada parte
          del rastro te devuelve a ese nivel.
        </GuideTip>
        <GuideTip>
          <b className="text-slate-200">Cambiar de región</b>: barra superior (Fundamentos, Hombro,
          Codo, Columna ▾, Cadera, Rodilla, Tobillo). El candado marca el contenido Premium.
          Con el teclado, <span className="kbd">⇧</span> + <span className="kbd">←</span>{' '}
          <span className="kbd">→</span>.
        </GuideTip>
        <GuideTip>
          <b className="text-slate-200">Cambiar de modo</b>: los cuatro botones de arriba a la
          derecha, o <span className="kbd">⇧</span> + <span className="kbd">1</span>…
          <span className="kbd">4</span>.
        </GuideTip>
        <GuideTip>
          <b className="text-slate-200">Buscar cualquier cosa</b>: el botón «Buscar» o el
          atajo <span className="kbd">{shortcutLabel()}</span>. Busca regiones y modos, no
          solo estructuras.
        </GuideTip>
        <GuideTip>
          <b className="text-slate-200">Seguir avanzando</b>: el botón «Siguiente» del rastro, o
          la tecla <span className="kbd">N</span>.
        </GuideTip>
      </ul>

      {/* Acciones */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-4">
        <button
          type="button"
          onClick={openSearch}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-accent/40 hover:text-accent"
        >
          <IconSearch />
          Buscar ({shortcutLabel()})
        </button>
        {onOpenOverlay && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOverlay('shortcuts');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-accent/40 hover:text-accent"
          >
            <span className="kbd">?</span>
            Atajos de teclado
          </button>
        )}
        <button
          type="button"
          onClick={onReopenTour}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-accent/40 hover:text-accent"
        >
          <IconTour />
          Reabrir tour guiado
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenEvidence();
          }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-accent/40 hover:text-accent"
        >
          <IconEvidence />
          Evidencia clínica
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenPricing();
          }}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/25"
        >
          Ver planes
        </button>
      </div>

      {/* Acerca de / Legal live here (and in the account menu) rather than in the
          header bar: the bar needed that width for the mode switcher and the
          upgrade CTA, and this hub is reachable at every breakpoint, signed in
          or not — which the account menu is not. */}
      {onOpenOverlay && (
        <div className="mt-3 flex items-center gap-3 border-t border-slate-800/60 pt-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOverlay('about');
            }}
            className="text-[11px] text-slate-500 transition-colors hover:text-slate-300"
          >
            Acerca de y créditos
          </button>
          <span className="text-slate-700">·</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOverlay('legal');
            }}
            className="text-[11px] text-slate-500 transition-colors hover:text-slate-300"
          >
            Aviso legal y privacidad
          </button>
        </div>
      )}
    </div>
  );
}

function GuideTip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-xs leading-relaxed text-slate-400">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-600" />
      <span>{children}</span>
    </li>
  );
}

/* ---- icons ---- */
function IconExplore() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="7" r="3" />
      <path d="M12 10v7M8 13l4 1 4-1M9 21l3-4 3 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLearn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <line x1="12" y1="3" x2="12" y2="21" strokeLinecap="round" />
      <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}
function IconStudy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M8 11h6M8 14h4" strokeLinecap="round" />
    </svg>
  );
}
function IconMovement() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 6.5v6M12 9l-5 2M12 9l5 2M9 20l3-7 3 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function IconTour() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8l6 4-6 4z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconEvidence() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 3v14" strokeLinecap="round" />
    </svg>
  );
}
