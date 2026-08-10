// src/components/movement/LabViewBar.tsx
//
// Camera controls for the movement lab: four named stations, the region/body
// framing switch, and a re-centre.
//
// WHY IT DID NOT EXIST AND WHY IT HAD TO
//
// Explorar has ViewToolbar — six camera views on keys 1..6 — but App only mounts
// it in the `explore` branch. So in the lab you could orbit freely, dolly with
// the wheel and double-click to fly into a structure, with NO WAY BACK. Orbit
// under the floor and the only recovery was reloading or switching region.
//
// It also gives the new region framing an off switch. The lab now opens zoomed
// on the joint the movement drives (labFraming.ts); "Cuerpo" returns to the old
// whole-figure view, which is still the right frame for a trunk movement or for
// showing a patient where a joint sits.
//
// PLACEMENT: the right end of the bottom strip, sharing that row with the
// recruitment band. Deliberately the same corner Explorar puts ViewToolbar in,
// so "camera controls live at the bottom of the viewer" holds across both
// workspaces instead of the lab inventing its own convention. Hidden entirely in
// patient mode, which carries no clinician chrome at all.
//
// UI strings Spanish LATAM; ASCII-only identifiers.

import { useEffect, useSyncExternalStore } from 'react';
import { cameraChannel, type LabView } from './cameraChannel';
import { useAnatomyStore } from '../../store/anatomyStore';

interface ViewDef {
  id: LabView;
  label: string;
  /** Keyboard shortcut, shown in the tooltip and handled below. */
  key: string;
  icon: React.ReactNode;
}

const STROKE = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const VIEWS: ViewDef[] = [
  {
    id: 'anterior',
    label: 'Vista anterior',
    key: '1',
    icon: (
      <svg {...STROKE}>
        <circle cx="12" cy="7" r="3" />
        <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
      </svg>
    ),
  },
  {
    id: 'posterior',
    label: 'Vista posterior',
    key: '2',
    icon: (
      <svg {...STROKE}>
        <circle cx="12" cy="7" r="3" />
        <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
        <path d="M9 13h6" />
      </svg>
    ),
  },
  {
    id: 'lateral',
    label: 'Vista lateral',
    key: '3',
    icon: (
      <svg {...STROKE}>
        <path d="M9 4c0 4 3 5 3 8s-3 4-3 8" />
        <circle cx="9" cy="4.5" r="2" />
      </svg>
    ),
  },
  {
    id: 'superior',
    label: 'Vista superior',
    key: '4',
    icon: (
      <svg {...STROKE}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    ),
  },
];

function RecenterIcon() {
  return (
    <svg {...STROKE}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="8.5" strokeDasharray="2 3" />
    </svg>
  );
}

export function LabViewBar() {
  // The command palette owns the number keys while it is open.
  const paletteOpen = useAnatomyStore((s) => s.paletteOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paletteOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      ) {
        return;
      }
      const hit = VIEWS.find((v) => v.key === e.key);
      if (hit) {
        e.preventDefault();
        cameraChannel.requestView(hit.id);
        return;
      }
      // 0 re-centres, matching the "0 = home" convention the angle readout
      // already uses for the neutral position.
      if (e.key === '0') {
        e.preventDefault();
        cameraChannel.recenter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen]);

  // Subscribed rather than read once: the channel is also reset on region
  // change (MovementView), so the toggle has to follow state it did not write.
  // Selecting just the framing field keeps recenter()/requestView() — which fire
  // on every keypress and every rig command — from re-rendering the bar.
  const framing = useSyncExternalStore(
    cameraChannel.subscribe,
    () => cameraChannel.get().framing,
    () => cameraChannel.get().framing,
  );

  return (
    <div className="instrument pointer-events-auto flex items-center gap-0.5 px-1.5 py-1">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => cameraChannel.requestView(v.id)}
          aria-label={`${v.label} (tecla ${v.key})`}
          title={`${v.label}  ·  tecla ${v.key}`}
          className="tap-target flex w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-accent/10 hover:text-accent"
        >
          {v.icon}
        </button>
      ))}

      <span className="mx-1 h-5 w-px shrink-0 bg-slate-100/10" aria-hidden="true" />

      {/* Not a `Segmented`: this is a two-state toggle whose OFF state is the
          app's default, so it reads better as one button that says what it will
          do next than as a radio pair the user has to parse. */}
      <button
        type="button"
        onClick={() =>
          cameraChannel.setFraming(framing === 'region' ? 'body' : 'region')
        }
        aria-pressed={framing === 'body'}
        title={
          framing === 'region'
            ? 'Ver el cuerpo entero'
            : 'Volver al encuadre de la articulación'
        }
        className={`tap-target rounded-lg px-2.5 text-[11px] font-medium transition-colors ${
          framing === 'body'
            ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/40'
            : 'text-slate-400 hover:bg-slate-100/[0.06] hover:text-slate-200'
        }`}
      >
        Cuerpo entero
      </button>

      <button
        type="button"
        onClick={() => cameraChannel.recenter()}
        aria-label="Recentrar la cámara (tecla 0)"
        title="Recentrar la cámara  ·  tecla 0"
        className="tap-target flex w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-accent/10 hover:text-accent"
      >
        <RecenterIcon />
      </button>
    </div>
  );
}
