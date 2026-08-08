// src/components/movement/MobileLabSheet.tsx
//
// The movement lab's console ON PHONES AND TABLETS.
//
// -----------------------------------------------------------------------------
// WHY THIS EXISTS
// -----------------------------------------------------------------------------
// The lab was built as a full-bleed canvas with instruments floated over it in
// absolute position: a 21.5rem column on the left, a stack on the right, a pill
// on top. On a 1440px screen those sit in the margins around the body. On a
// 390px phone the left column alone is 344px of the 390, the right stack lands
// on the same pixels, and the model never gets a rectangle of its own -- it ends
// up in whatever band is left between three padlocked pills and the console,
// with the arm leaving the frame as soon as the joint moves.
//
// So on compact viewports the lab stops being an overlay and becomes two rows:
// the scene, and this sheet. Everything that used to float is in here, behind
// four tabs, on ONE surface the thumb can reach.
//
// -----------------------------------------------------------------------------
// TWO DETENTS, NOT THREE
// -----------------------------------------------------------------------------
// `peek` keeps the tab bar and the movement row visible -- enough to drive the
// joint and read the angle while watching the body. `full` gives the active tab
// room to be used. Two positions can be driven by one drag and one tap; three
// would need a gesture vocabulary nobody will learn on a clinical tool.
//
// The scene above is a real sibling, so changing detent changes the canvas box.
// `onDetentChange` lets the viewer refit the camera instead of letting the model
// slide out of view -- see the refit note in RigViewer.

import { useRef, useState } from 'react';
import { ChevronDownIcon } from '../ui/Icons';
import { LockGlyph } from '../account/PremiumGate';

export type LabTab = 'movimiento' | 'capas' | 'tests' | 'neuro';
export type SheetDetent = 'peek' | 'full';

export interface LabTabDef {
  id: LabTab;
  label: string;
  /** Renders the tab's body. Called only while the tab is active. */
  render: () => React.ReactNode;
  /** Locked tabs stay visible with a padlock; tapping runs `onLocked`. */
  locked?: boolean;
  onLocked?: () => void;
}

/** Height of each detent, as a fraction of the lab's own height. */
const DETENT_FRACTION: Record<SheetDetent, number> = {
  peek: 0.34,
  full: 0.62,
};

/** Drag distance, in px, that commits a detent change. */
const DRAG_THRESHOLD = 44;

export function MobileLabSheet({
  tabs,
  active,
  onActiveChange,
  detent,
  onDetentChange,
}: {
  tabs: LabTabDef[];
  active: LabTab;
  onActiveChange: (t: LabTab) => void;
  detent: SheetDetent;
  onDetentChange: (d: SheetDetent) => void;
}) {
  // Live finger offset while dragging, so the sheet tracks the thumb instead of
  // snapping only on release. Committed (or reverted) on pointer up.
  const [dragDy, setDragDy] = useState(0);
  const dragStart = useRef<number | null>(null);

  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragStart.current === null) return;
    setDragDy(e.clientY - dragStart.current);
  }
  function onPointerUp() {
    const dy = dragDy;
    dragStart.current = null;
    setDragDy(0);
    if (dy <= -DRAG_THRESHOLD) onDetentChange('full');
    else if (dy >= DRAG_THRESHOLD) onDetentChange('peek');
  }

  // While dragging, bias the height by the finger travel (up = taller). Clamped
  // to the two detents so the sheet can never be dragged off the screen.
  const base = DETENT_FRACTION[detent];
  const dragging = dragStart.current !== null;
  const height = dragging
    ? `clamp(${DETENT_FRACTION.peek * 100}%, calc(${base * 100}% - ${dragDy}px), ${
        DETENT_FRACTION.full * 100
      }%)`
    : `${base * 100}%`;

  return (
    <div
      className="pointer-events-auto flex shrink-0 flex-col border-t border-slate-800/70 bg-ink-950/95 backdrop-blur"
      style={{ height, transition: dragging ? 'none' : 'height 220ms cubic-bezier(0.16,1,0.3,1)' }}
    >
      {/* Grab handle. Also a button, because a drag affordance that only responds
          to dragging is invisible to anyone who taps it first. */}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => onDetentChange(detent === 'full' ? 'peek' : 'full')}
        aria-label={detent === 'full' ? 'Reducir el panel' : 'Ampliar el panel'}
        className="flex h-7 w-full shrink-0 touch-none items-center justify-center"
      >
        <span className="h-1 w-10 rounded-full bg-slate-700" />
      </button>

      {/* Tabs. 44px tall: the whole row is a touch target. */}
      <div
        role="tablist"
        aria-label="Paneles del laboratorio"
        className="rail shrink-0 border-b border-slate-800/70 px-2"
      >
        {tabs.map((t) => {
          const isActive = t.id === active && !t.locked;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => (t.locked ? t.onLocked?.() : onActiveChange(t.id))}
              className={[
                'flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13px] font-medium transition-colors',
                isActive
                  ? 'border-accent text-accent'
                  : t.locked
                    ? 'border-transparent text-amber-200/80'
                    : 'border-transparent text-slate-400',
              ].join(' ')}
            >
              {t.label}
              {t.locked && <LockGlyph />}
            </button>
          );
        })}
        <span className="ml-auto flex items-center pr-1">
          <ChevronDownIcon
            size={13}
            className={`text-slate-600 transition-transform ${detent === 'full' ? '' : 'rotate-180'}`}
            aria-hidden="true"
          />
        </span>
      </div>

      {/* Active panel. `overscroll-contain` keeps a scroll at the end of this
          list from chaining out to the page and dragging the whole lab. */}
      <div
        role="tabpanel"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-safe"
      >
        {activeTab?.render()}
      </div>
    </div>
  );
}
