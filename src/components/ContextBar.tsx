// src/components/ContextBar.tsx
//
// THE TRAIL. A single hairline strip under the header that answers the two
// questions a user of a 36-place app asks constantly: "where am I?" and "where
// do I go now?".
//
// -----------------------------------------------------------------------------
// WHY IT EXISTS
// -----------------------------------------------------------------------------
// The header already contains a region control and a mode control, but a
// SWITCH is not a POSITION: both are things you operate, and neither tells you
// that you are three clicks deep in one of nine modules with a structure
// selected. On a phone it is worse -- the selected structure only exists inside
// a drawer the user has to open to remember what they clicked.
//
// So this strip carries three things and nothing else:
//
//   1. THE CRUMBS -- Región > Modo > Estructura. Ordinary breadcrumb semantics:
//      clicking a crumb resets everything to its right. The region crumb returns
//      to the module's first step and drops the selection; the mode crumb drops
//      the selection; the structure crumb reveals it (camera on desktop, the
//      detail drawer on a phone).
//
//   2. THE LINE -- the module's route drawn as one segment per step, with the
//      current one lit. This is the "where do I go now" answer in its cheapest
//      form: four dashes that say the product is a sequence, not a pile of tabs.
//      Segments are clickable, so the line is also a shortcut back to any step.
//
//   3. THE NEXT STEP -- one button that takes it. Bound to N, and marked with a
//      lock when the next step crosses into a premium module, so the paywall
//      arrives as the natural continuation of the route rather than as a wall.
//
// -----------------------------------------------------------------------------
// WHAT IT COSTS, AND WHY THAT IS THE RIGHT TRADE
// -----------------------------------------------------------------------------
// It is a second fixed strip (28px) on top of the header and the legal banner.
// The audit was right to fight for that space on phones, so below `sm` the
// region and mode crumbs are HIDDEN -- the header's two labelled dropdowns
// already show both, and repeating them would be pure chrome. What survives on a
// phone is exactly the information that exists nowhere else on screen: the
// selected structure, and the next step.

import { useAnatomyStore } from '../store/anatomyStore';
import { useEntitlement } from '../auth/AuthContext';
import { LockGlyph } from './account/PremiumGate';
import { formatShortName } from '../lib/formatName';
import {
  REGION_NAV,
  modeLabel,
  nextStep,
  regionLabel,
  routeForRegion,
  routeStep,
} from '../lib/navigation';
import { DEFAULT_REGION } from '../lib/routing';
import type { AnatomyEntry } from '../types/anatomy';
import type { AppMode } from './TopBar';

interface ContextBarProps {
  regionId: string;
  mode: AppMode;
  /** Conceptual module (Fundamentos): a shorter, two-step route. */
  isConcept: boolean;
  byMesh: Map<string, AnatomyEntry>;
  /** Navigate to a place on the route. */
  onGo: (region: string, mode: AppMode) => void;
  /**
   * Reveal the current selection: App focuses the camera on it on desktop and
   * opens the detail drawer on a phone, because "show me what I picked" means
   * different things on the two layouts.
   */
  onShowSelection: () => void;
}

export function ContextBar({
  regionId,
  mode,
  isConcept,
  byMesh,
  onGo,
  onShowSelection,
}: ContextBarProps) {
  const selectedMeshName = useAnatomyStore((s) => s.selectedMeshName);
  const clearSelection = useAnatomyStore((s) => s.clearSelection);
  const entitlement = useEntitlement();

  const route = routeForRegion(isConcept);
  const step = routeStep(route, mode);

  // STANDING ON A PAYWALL is the one place the route makes no sense: the body
  // is the upgrade funnel, so every step of this module leads back to the same
  // screen and a "Siguiente" button would be a control that visibly does
  // nothing. The trail turns into the way OUT instead -- one button back to a
  // module this user can actually open. The paywall keeps the sales pitch; the
  // trail's job here is to make sure nobody is stuck on it.
  const onPaywall = !entitlement.canAccessRegion(regionId);
  const escapeRegion = entitlement.canAccessRegion(DEFAULT_REGION)
    ? DEFAULT_REGION
    : (REGION_NAV.find((r) => entitlement.canAccessRegion(r.id))?.id ?? null);

  const next = onPaywall ? null : nextStep(regionId, mode, isConcept);
  const nextLocked = next ? !entitlement.canAccessRegion(next.region) : false;

  const entry = selectedMeshName ? byMesh.get(selectedMeshName) : undefined;
  const selectionLabel = entry ? formatShortName(entry.canonicalName) : null;

  return (
    <div className="flex h-7 shrink-0 items-center gap-2 px-3 sm:px-4">
      <nav
        aria-label="Dónde estás"
        className="flex min-w-0 flex-1 items-center gap-1 text-xs"
      >
        {/* Region and mode repeat the header's two dropdowns, so they only earn
            their place where there is room for them. */}
        <Crumb
          hideOnPhone
          onClick={() => {
            clearSelection();
            onGo(regionId, route[0]);
          }}
          title={`Volver al inicio de ${regionLabel(regionId)}`}
        >
          {regionLabel(regionId)}
        </Crumb>
        <Separator hideOnPhone />
        <Crumb
          hideOnPhone
          current={!selectionLabel}
          onClick={clearSelection}
          title={`Modo ${modeLabel(mode)}`}
        >
          {modeLabel(mode)}
        </Crumb>

        {selectionLabel && (
          <>
            <Separator hideOnPhone />
            <Crumb
              current
              onClick={mode === 'explore' ? onShowSelection : undefined}
              title={
                mode === 'explore'
                  ? `Ver ${selectionLabel} en el modelo`
                  : selectionLabel
              }
            >
              <span className="truncate">{selectionLabel}</span>
            </Crumb>
            <button
              type="button"
              onClick={clearSelection}
              aria-label={`Soltar la selección: ${selectionLabel}`}
              className="shrink-0 rounded p-0.5 text-slate-600 transition-colors hover:bg-slate-800/60 hover:text-slate-300"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </>
        )}
      </nav>

      {/* THE LINE. The counter survives on a phone -- on that layout the crumbs
          are hidden, so without it the strip would carry a lone button and say
          nothing about position. The segments themselves need width the phone
          does not have, so they start at md. */}
      {step > 0 && !onPaywall && (
        <div className="flex shrink-0 items-center gap-2">
          <span className="kicker whitespace-nowrap">
            Paso {step} de {route.length}
          </span>
          <div
            className="hidden items-center gap-1 md:flex"
            role="group"
            aria-label={`Ruta de ${regionLabel(regionId)}`}
          >
            {route.map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => onGo(regionId, m)}
                aria-label={`Paso ${i + 1}: ${modeLabel(m)}`}
                aria-current={m === mode ? 'step' : undefined}
                title={modeLabel(m)}
                className="group flex h-4 w-7 items-center"
              >
                {/* Same vocabulary as the onboarding tour's position rule: the
                    current segment is thicker AND accented, because at 1px a
                    colour change alone is not a reliable position cue. */}
                <span
                  className={[
                    'w-full rounded-full transition-all',
                    m === mode
                      ? 'h-0.5 bg-accent'
                      : i < step - 1
                        ? 'h-px bg-slate-600 group-hover:bg-slate-400'
                        : 'h-px bg-slate-800 group-hover:bg-slate-600',
                  ].join(' ')}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {onPaywall && escapeRegion && (
        <button
          type="button"
          onClick={() => onGo(escapeRegion, routeForRegion(escapeRegion === 'fundamentos')[0])}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/60 py-1 pl-2 pr-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-accent/40 hover:text-accent"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M19 12H6M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver a {regionLabel(escapeRegion)}
        </button>
      )}

      {next && (
        <button
          type="button"
          onClick={() => onGo(next.region, next.mode)}
          title={`${next.promise}${nextLocked ? ' (requiere Premium)' : ''}`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/60 py-1 pl-2.5 pr-2 text-xs font-medium text-slate-300 transition-colors hover:border-accent/40 hover:text-accent"
        >
          <span className="hidden text-slate-500 sm:inline">Siguiente:</span>
          <span className="max-w-[8rem] truncate">{next.label}</span>
          {nextLocked && <LockGlyph className="text-amber-300" />}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M5 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="kbd ml-0.5 hidden lg:inline-flex">N</span>
        </button>
      )}
    </div>
  );
}

/**
 * One crumb. Renders as a button when it leads somewhere and as plain type when
 * it does not, so nothing on the trail looks pressable without being pressable.
 */
function Crumb({
  children,
  onClick,
  current,
  title,
  hideOnPhone = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  current?: boolean;
  title?: string;
  /** Header already shows this below `sm`; see the note at the top of the file. */
  hideOnPhone?: boolean;
}) {
  // The display utility is composed here rather than passed in: `hidden` and
  // `inline-flex` are the same Tailwind group, so a caller appending one to a
  // base class that already sets the other would win or lose by stylesheet
  // order rather than by intent.
  const base = [
    hideOnPhone ? 'hidden sm:inline-flex' : 'inline-flex',
    'min-w-0 max-w-[12rem] items-center rounded px-1.5 py-0.5 font-medium',
    current ? 'text-slate-200' : 'text-slate-500',
  ].join(' ');

  if (!onClick) {
    return (
      <span title={title} aria-current={current ? 'page' : undefined} className={base}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-current={current ? 'page' : undefined}
      className={`${base} transition-colors hover:bg-slate-800/60 hover:text-slate-200`}
    >
      {children}
    </button>
  );
}

function Separator({ hideOnPhone = false }: { hideOnPhone?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`${hideOnPhone ? 'hidden sm:block' : 'block'} shrink-0 text-slate-700`}
    >
      /
    </span>
  );
}
