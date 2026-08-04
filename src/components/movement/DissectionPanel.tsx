// src/components/movement/DissectionPanel.tsx
//
// The click-to-dissect instrument for the movement lab. Click a muscle on the rig
// and it appears here with its clinical name, the plane it lies in, and the two
// things a clinician wants to do with it:
//
//   Diseccionar  take it off the model to see what runs underneath
//   Aislar       leave it alone on the skeleton, everything else steps back
//
// Both act on a SIDE. The switch defaults to the side you clicked, so peeling the
// left pectoral leaves the right one in place; widen it to "Ambos" when you want
// the structure gone whole. The glow on the model always previews exactly what the
// buttons will take.
//
// SHAPE: one .instrument surface, sectioned by hairlines (selection, side,
// actions, tray). Not a stack of bordered cards, no gradient hero button, no
// explainer text glued inside a control -- see the instrument design system.
//
// Pure DOM + pub/sub: no ref crosses the <Canvas>. UI strings Spanish LATAM.

import { useEffect, useState } from 'react';
import {
  dissectChannel,
  SCOPE_LABEL,
  type DissectScope,
  type DissectSelection,
  type DissectState,
  type HiddenEntry,
} from './dissectChannel';
import { Segmented } from '../ui/Controls';
import {
  CloseIcon,
  IsolateIcon,
  RestoreIcon,
  ScalpelIcon,
  UndoIcon,
} from '../ui/Icons';

/** Plane badge tint (superficial -> deep): dot + text, never a filled pill. */
const PLANE_STYLE: Record<string, { text: string; dot: string }> = {
  Superficial: { text: 'text-[#f2b0b0]', dot: 'bg-[#e06a6a]' },
  Intermedio: { text: 'text-amber-300', dot: 'bg-amber-400' },
  Profundo: { text: 'text-[#eba6a6]', dot: 'bg-[#9d3436]' },
};

const SCOPE_OPTIONS: ReadonlyArray<{ value: DissectScope; label: string }> = [
  { value: 'left', label: 'Izquierdo' },
  { value: 'right', label: 'Derecho' },
  { value: 'both', label: 'Ambos' },
] as const;

/** Is the structure already off the model at the scope the switch is on? */
function scopeAlreadyRemoved(sel: DissectSelection, hidden: HiddenEntry[]): boolean {
  return hidden.some((h) => h.id === sel.id && (h.scope === 'both' || h.scope === sel.scope));
}

/** Tray chip caption: "Pectoral mayor, izquierdo". */
function entryCaption(e: HiddenEntry): string {
  return e.scope === 'both' ? e.label : `${e.label}, ${SCOPE_LABEL[e.scope]}`;
}

export function DissectionPanel() {
  const [state, setState] = useState<DissectState>(() => dissectChannel.get());
  useEffect(() => dissectChannel.subscribe(setState), []);

  // Keyboard, for the clinician working through a region with one hand on the
  // model: D dissects, A isolates, Z undoes, Esc drops the selection or leaves
  // isolation. Reads the channel directly so the listener never goes stale.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.altKey) return;
      const s = dissectChannel.get();
      const k = e.key.toLowerCase();
      if (k === 'd' && s.selection?.dissectable) {
        e.preventDefault();
        dissectChannel.dissectSelected();
      } else if (k === 'a' && s.selection?.dissectable) {
        e.preventDefault();
        dissectChannel.isolateSelected();
      } else if (k === 'z' && s.hidden.length > 0) {
        e.preventDefault();
        dissectChannel.restoreLast();
      } else if (e.key === 'Escape') {
        if (s.selection) dissectChannel.setSelection(null);
        else if (s.isolated) dissectChannel.clearIsolate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { selection, hidden, isolated } = state;
  if (!selection && hidden.length === 0 && !isolated) return null;

  const plane = selection?.planeLabel ? PLANE_STYLE[selection.planeLabel] : undefined;
  const removed = selection ? scopeAlreadyRemoved(selection, hidden) : false;

  return (
    <div className="instrument pointer-events-auto w-[min(94vw,30rem)] overflow-hidden animate-slide-up">
      {selection && (
        <>
          {/* Identity: kicker + plane on one line, the name below it. */}
          <div className="px-4 pt-3 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="kicker">
                {selection.layer === 'muscle' ? 'Músculo' : 'Tejido conectivo'}
              </span>
              {selection.planeLabel && plane && (
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${plane.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${plane.dot}`} aria-hidden="true" />
                  {selection.planeLabel}
                </span>
              )}
              <button
                type="button"
                onClick={() => dissectChannel.setSelection(null)}
                aria-label="Cerrar selección"
                className="-mr-1 ml-auto rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100/[0.06] hover:text-slate-200"
              >
                <CloseIcon size={13} />
              </button>
            </div>
            <h3 className="mt-1.5 font-display text-lg font-bold leading-tight text-slate-50">
              {selection.label}
            </h3>
            {selection.latin && (
              <p className="mt-0.5 text-xs italic text-slate-500">{selection.latin}</p>
            )}
            {selection.note && (
              <p className="mt-2.5 border-l-2 border-accent/40 pl-2.5 text-[11px] leading-snug text-slate-400">
                {selection.note}
              </p>
            )}
          </div>

          {/* Side: the whole point of the redesign. A structure that exists on
              one side only says so instead of offering a switch that does nothing. */}
          <div className="hairline" />
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="kicker">Lado</span>
            {selection.bilateral ? (
              <div className="ml-auto">
                <Segmented
                  value={selection.scope}
                  options={SCOPE_OPTIONS}
                  onChange={(v) => dissectChannel.setScope(v)}
                  ariaLabel="Lado sobre el que actuar"
                />
              </div>
            ) : (
              <span className="ml-auto text-[11px] text-slate-500">
                {selection.sideLabel ?? 'Estructura de la línea media'}
              </span>
            )}
          </div>

          {/* Actions. */}
          <div className="hairline" />
          <div className="px-4 py-3">
            {selection.dissectable ? (
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => dissectChannel.dissectSelected()}
                  disabled={removed}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-accent-soft disabled:cursor-default disabled:bg-slate-100/[0.06] disabled:text-slate-500"
                >
                  <ScalpelIcon size={15} />
                  {removed ? 'Ya retirado' : 'Diseccionar'}
                  <span className="ml-0.5 hidden text-[10px] font-medium opacity-50 sm:inline">
                    D
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => dissectChannel.isolateSelected()}
                  className="flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 ring-1 ring-slate-100/[0.09] transition-colors hover:bg-slate-100/[0.06] hover:text-slate-100"
                >
                  <IsolateIcon size={15} />
                  Aislar
                  <span className="ml-0.5 hidden text-[10px] font-medium text-slate-500 sm:inline">
                    A
                  </span>
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-500">
                Estructura de soporte, no se disecciona
              </p>
            )}
          </div>
        </>
      )}

      {isolated && (
        <>
          {selection && <div className="hairline" />}
          <div className="flex items-center gap-3 border-l-2 border-accent px-4 py-2.5">
            <span className="min-w-0">
              <span className="kicker block">Aislado</span>
              <span className="mt-1 block truncate text-xs font-medium text-slate-200">
                {isolated.scope === 'both'
                  ? isolated.label
                  : `${isolated.label}, ${SCOPE_LABEL[isolated.scope]}`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => dissectChannel.clearIsolate()}
              className="ml-auto shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-100/[0.09] transition-colors hover:bg-slate-100/[0.06] hover:text-slate-100"
            >
              Ver todo
            </button>
          </div>
        </>
      )}

      {hidden.length > 0 && (
        <>
          {(selection || isolated) && <div className="hairline" />}
          <div className="px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="kicker">
                {hidden.length} {hidden.length === 1 ? 'retirada' : 'retiradas'}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => dissectChannel.restoreLast()}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-100/[0.06] hover:text-slate-100"
                >
                  <UndoIcon size={12} />
                  Deshacer
                </button>
                <button
                  type="button"
                  onClick={() => dissectChannel.restoreAll()}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/10"
                >
                  <RestoreIcon size={12} />
                  Restaurar
                </button>
              </div>
            </div>
            {/* Each removal is its own chip: tap it to put that one structure
                back, without undoing everything done since. */}
            <div className="mt-2 flex max-h-[4.5rem] flex-wrap gap-1.5 overflow-y-auto">
              {hidden.map((h) => (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => dissectChannel.restoreOne(h.key)}
                  title={`Devolver ${entryCaption(h)}`}
                  className="group flex max-w-full items-center gap-1.5 rounded-full bg-slate-100/[0.05] py-1 pl-2.5 pr-2 text-[11px] text-slate-400 transition-colors hover:bg-slate-100/[0.1] hover:text-slate-100"
                >
                  <span className="truncate">{entryCaption(h)}</span>
                  <CloseIcon size={10} className="text-slate-600 group-hover:text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
