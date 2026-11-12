// src/components/movement/NeuroPanel.tsx
//
// NEURO panel for the movement lab: the SEGMENTAL screen -- dermatome, myotome
// and deep tendon reflex per spinal nerve root -- for the region's limb (C5-T1
// upper, L2-S1 lower), with the myotome demonstrable as a real resisted movement
// on the 3D rig and the dermatome painted on an anatomical plate.
//
// -----------------------------------------------------------------------------
// DESIGN RULES. Read before adding anything here.
// -----------------------------------------------------------------------------
// This panel is the twin of OrthopedicTestsPanel and inherits its doctrine, which
// it had drifted out of: five type sizes down to 9px, three identical prose
// blocks for three clinically different things, a reflex whose NAME lived in a
// title attribute, and the rig demo -- the reason the panel is premium -- buried
// inside an expanded card. So:
//
// 1. THREE TYPE SIZES: 14px for a root's key movement, 13px for prose, 11px for
//    every label, caption and number (mono + tabular for the numbers). Nothing
//    smaller ships, on the panel or inside the plate's SVG. Por eso las piezas de
//    LAMINA que vienen a 10 o 12 px (`.kicker`, `.btn-sm`) se usan aqui con
//    `text-[11px]`.
//
// 2. COLOUR IS THE SEGMENTAL RAMP, AND NOTHING ELSE. A root's pigment (see
//    SEGMENT_PIGMENTS) identifies it on the plate, on its row's edge rule and on
//    its chip -- one colour, three places, so the plate and the list are visibly
//    the same object. Cyan is INTERACTIVE STATE only and never fills a
//    territory. Amber is reserved for what needs attention, which here means the
//    red flags and an unverified figure. There is no other colour.
//
// 3. NO HAY CAJAS (sistema LAMINA, docs/sistema-lamina.md). El panel ya no es
//    una superficie flotante: vive en la pestana "Neuro" del margen derecho, sin
//    fondo propio. Secciones con rotulo + filo (`.sec-head`), avisos con regla a
//    la izquierda (`.note`), barras de 2 px (`.meter`) y los interruptores como
//    texto que se enciende (`btn-quiet` + `aria-pressed`), no pastillas.
//
// 4. THE THREE LANES ARE TOLD APART BY FORM, NOT HUE. Sensibilidad, fuerza and
//    reflejo each carry a glyph and a kicker; adding a third and fourth hue would
//    have collided with the muscle-role code (amber/sky/violet) and with the
//    tests panel's two-axis code (sky/emerald), and a dermatome would have ended
//    up looking like a prime mover.
//
// 5. THE RIG DEMO IS REACHABLE FROM THE COLLAPSED ROW, as the square icon button
//    the tests panel uses. Same control, same place, same vocabulary.
//
// 6. ABSENCE IS INFORMATION. C8, T1 and L5 have no deep tendon reflex of their
//    own, and that is precisely why L5 is missed. The panel SAYS so instead of
//    omitting the lane.
//
// 7. RED FLAGS SIT ABOVE THE ROOTS, where they cannot be scrolled past. A
//    segmental screen exists partly to catch what must not be treated.
//
// 8. THE SCREEN IS THE LIST, NOT A SECOND TABLE. Grading controls live inside the
//    lane they grade, and each row carries three state dots, so the five rows ARE
//    the root-by-axis grid at a glance. A separate matrix would have printed every
//    root twice on one surface, which breaks rule 3 and rule "say it once".
//
// 9. AMBER MEANS ABNORMAL, on the dots as everywhere else on this panel: it is
//    already the attention colour (red flags, unverified figures), and a row that
//    turns amber across all three axes is precisely the thing needing attention.
//    Recorded-and-normal is a quiet slate dot; not examined is a hollow ring,
//    because blank and normal are different clinical statements.
//
// 10. LA LISTA DE RAICES ES LA PROTAGONISTA; EL ESQUEMA PLANO, SECUNDARIO. La
//    carta de dermatomas esta ahora sobre el CUERPO (NeuroSkinLayer, que pinta
//    todas las raices sin nada elegido y rotula cada territorio), y la raiz
//    elegida la ensena el escenario en grande (StageReadout). El esquema 2D
//    conserva lo que el modelo no tiene --el detalle por dedos-- y por eso se
//    queda, pero plegado bajo su rotulo al final, no encima de la lista.
//
// LAYOUT: se monta en `bare` (la pestana "Neuro" del margen derecho de
// escritorio, 19rem = 304 px entre 1024 y 1279 px de ventana, y la hoja movil);
// la variante flotante sigue existiendo. Data: src/data/neuro. UI Spanish
// LATAM; code and comments ASCII/English.

import { useEffect, useMemo, useRef, useState } from 'react';
import { neuroForRegion } from '../../data/neuro';
import { pigmentFor } from '../../data/neuro/plate';
import type { NerveRoot } from '../../types/neuro';
import { DermatomeMap } from './DermatomeMap';
import { NeuroScreenReadout } from './NeuroScreenReadout';
import { rigChannel } from './RigModel';
import { getBoneControl } from '../../lib/boneMap';
import { demoChannel, useActiveDemo } from './demoChannel';
import { EVENTS, track, trackChange } from '../../lib/analytics';
import {
  EMPTY_FINDING,
  isScreenEmpty,
  localizeRoot,
  screenSummary,
  type NeuroScreenState,
  type RootFinding,
} from '../../lib/neuroScreen';
import { neuroPickBus, neuroSkinChannel } from './neuroSkinChannel';
import { layerChannel, type LayerState } from './RigModel';
import { useAllMuscles } from '../../hooks/useMuscleResolution';
import { readPose } from './consolePoseStore';
import { startDemoLoop } from '../../lib/demoTimeline';
import { clearScreen, readScreen, writeScreen } from './neuroScreenStore';
import { HowToUse, Kicker, NeuroRootRow, shortReflex } from './NeuroRootRow';
import { ChevronDownIcon, CloseIcon } from '../ui/Icons';

/** Namespace for this panel's demo ids on the shared demoChannel. */
const DEMO_NS = 'neuro:';

// ---------------------------------------------------------------------------
// "How to use" guide: shown once, remembered, re-openable from the header. Same
// contract and the same shape of helper as the tests panel's guide, so the two
// panels behave identically -- a user who dismissed one knows how to get it back
// in the other. Versioned key, so rewriting the guide can show it again on purpose.
// ---------------------------------------------------------------------------
const HELP_KEY = 'anatris.neuroHelp.v1';
function readHelpSeen(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(HELP_KEY) === '1';
  } catch {
    return false;
  }
}
function writeHelpSeen(): void {
  try {
    window.localStorage.setItem(HELP_KEY, '1');
  } catch {
    /* storage unavailable: guide reappears next session */
  }
}

/** At most two roots can be held side by side; a third would stop comparing. */
const MAX_PICKED = 2;

// ---------------------------------------------------------------------------
// Glyphs kept HERE: only the ones this file still uses. The three lane glyphs moved
// to NeuroRootRow with the lanes they label.
// ---------------------------------------------------------------------------

function AlertGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 1.4 11 10.6H1L6 1.4Z" />
      <path d="M6 4.8v2.4" />
      <path d="M6 9h.01" />
    </svg>
  );
}

function NerveIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 3v6a4 4 0 0 0 4 4h1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 21v-6a4 4 0 0 1 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="7" r="2" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="19" cy="11" r="2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Red flags (design rule 7).
// ---------------------------------------------------------------------------

function RedFlags({ flags }: { flags: { label: string; detail: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    // Una linea de aviso plegable, con la regla ambar a la izquierda (`.note`):
    // no un recuadro. Cerrada ocupa una linea y no se puede pasar de largo.
    <div className="px-4 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="note note-warn flex w-full items-center gap-2 py-1 text-left"
      >
        <span className="shrink-0 text-amber-400/90">
          <AlertGlyph />
        </span>
        <span className="kicker flex-1 text-[11px] leading-snug text-amber-300/90">
          Antes de tratar · banderas rojas
        </span>
        <span className="num text-[11px] text-amber-400/70">{flags.length}</span>
        <ChevronDownIcon
          size={12}
          className={`shrink-0 text-fg3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul className="mt-2 space-y-2 pb-1">
          {flags.map((f) => (
            <li key={f.label} className="note note-warn text-[13px] leading-relaxed">
              <span className="block font-semibold text-amber-200/90">{f.label}</span>
              <span className="block">{f.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare readout: what actually separates two neighbouring roots.
//
// This is the panel's counterpart to the tests panel's Fagan block -- the piece
// that reasons instead of listing. C6 and C7 overlap in the hand and share a limb;
// what tells them apart is three lines (key point, key movement, reflex), and
// putting those three side by side is the whole bedside decision.
// ---------------------------------------------------------------------------

function CompareBlock({
  figure,
  a,
  b,
}: {
  figure: 'upper-limb' | 'lower-limb';
  a: NerveRoot;
  b: NerveRoot;
}) {
  const rows: [string, string, string][] = [
    [
      'Punto clave',
      a.dermatome.keyPointShort ?? a.dermatome.keyPoint,
      b.dermatome.keyPointShort ?? b.dermatome.keyPoint,
    ],
    ['Movimiento', a.myotome.action, b.myotome.action],
    [
      'Reflejo',
      a.reflex ? shortReflex(a.reflex.name) : 'Sin reflejo propio',
      b.reflex ? shortReflex(b.reflex.name) : 'Sin reflejo propio',
    ],
  ];
  return (
    <section className="sec">
      <div className="sec-head">
        <Kicker>Qué las separa</Kicker>
        <span className="sec-rule" />
      </div>
      {/* A 19rem las dos columnas de valores se quedan en unos 90 px cada una
          (272 menos 64 del rotulo y los huecos): el texto parte linea, que es
          mejor que recortar el punto clave. El rotulo de fila baja a 4rem. */}
      <div className="grid grid-cols-[4rem_1fr_1fr] gap-x-2.5 gap-y-2">
        <span />
        {[a, b].map((r) => (
          <span key={r.id} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: pigmentFor(figure, r.id) }}
              aria-hidden="true"
            />
            <span className="num text-[11px] font-bold text-fg">{r.label}</span>
          </span>
        ))}
        {rows.map(([label, va, vb]) => (
          <div key={label} className="contents">
            <span className="text-[11px] leading-snug text-fg3">{label}</span>
            <span className="min-w-0 text-[13px] leading-snug text-fg2">{va}</span>
            <span className="min-w-0 text-[13px] leading-snug text-fg2">{vb}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Put text on the clipboard, or report that it could not be done.
 *
 * Two paths on purpose: the modern API, then the old selection trick for the
 * contexts it refuses to run in (plain http, denied permission). Returns a boolean
 * rather than throwing, because the caller's job is to tell the user whether their
 * record made it out -- not to swallow the failure, which looks exactly like a
 * broken button.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    // Off-screen but still selectable, and readOnly so no keyboard opens on a phone
    // while it is briefly in the document.
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------

export function NeuroPanel({
  region,
  open,
  onOpenChange,
  bare = false,
}: {
  region: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Render inside the compact bottom sheet: no frosted panel, no fixed width,
   *  no close button. See the same flag on OrthopedicTestsPanel. */
  bare?: boolean;
}) {
  const set = useMemo(() => neuroForRegion(region), [region]);
  /**
   * Selected roots, 0..2. One entry expands that root's detail; two put them
   * side by side in the compare block instead. Keeping ONE piece of state for
   * both means the plate, the rows and the readout can never disagree about
   * what is selected.
   */
  const [picked, setPicked] = useState<string[]>([]);
  const [compare, setCompare] = useState(false);
  /**
   * What has been recorded, root by root.
   *
   * Mirrored into neuroScreenStore rather than living here alone: the mobile sheet
   * renders one tab at a time, so this panel unmounts when the user goes to look
   * at the model and a half-finished exam used to vanish. See that module for why
   * it is in memory and not on disk.
   */
  const [screen, setScreen] = useState<NeuroScreenState>(() =>
    set ? readScreen(set.id) : {},
  );
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [showHelp, setShowHelp] = useState(() => !readHelpSeen());
  /** El esquema plano, plegado por defecto: la carta esta sobre el cuerpo. */
  const [plateOpen, setPlateOpen] = useState(false);

  const dismissHelp = () => {
    setShowHelp(false);
    writeHelpSeen();
  };

  // The demoChannel arbiter owns which demo (if any) animates the rig. Deriving
  // demoId from it (instead of local state) means a demo started here stops
  // cleanly the moment the console or the tests panel reclaims the rig.
  const activeDemo = useActiveDemo();
  const demoId = activeDemo?.startsWith(DEMO_NS) ? activeDemo.slice(DEMO_NS.length) : null;

  // Is the neuro panel used at all, and in which regions? It is premium, so the
  // answer decides whether it earns its place in the pitch.
  useEffect(() => {
    if (open) trackChange(EVENTS.neuroOpened, { region });
  }, [open, region]);

  /**
   * Publish the selection to the 3D body, so the same root that is highlighted on
   * the plate is painted on the rig's own skin (see NeuroSkinLayer).
   *
   * Only while the panel is OPEN: a dermatome left glowing on the model behind a
   * closed panel is paint nobody asked for. Cleared on unmount for the same reason.
   */
  // LA CARTA ENTERA CUANDO NO HAY NINGUNA RAIZ ELEGIDA.
  //
  // "La parte de neuro esta fea, solo con que aparezca el cuerpo asi." Al abrir
  // la pestana el cuerpo no ensenaba nada: un modelo de cristal y, a la derecha,
  // un esquema plano de 120 px. Ahora el CUERPO es el esquema: sin nada elegido
  // se pintan todas las raices de la figura, cada una en su pigmento, y al
  // elegir una se queda sola. Ver NeuroSkinLayer, que ademas las rotula.
  //
  // Y DURANTE UN MIOTOMA, SOLO SU RAIZ. Con la carta entera puesta, al lanzar el
  // demo de C6 el cuerpo seguia rotulando las seis raices y la etiqueta del
  // musculo que se enciende (el braquiorradial, en el antebrazo) caia encima de
  // la de C8, en la misma columna: dos cartas de rotulos que no se conocen. El
  // demo es UNA raiz --su territorio y su musculo--, y es lo que se pinta;
  // al parar vuelve la carta como estaba.
  useEffect(() => {
    if (!open || !set) {
      neuroSkinChannel.clear();
      return;
    }
    // Solo si no hay nada ELEGIDO: lo que el fisio elige a mano (la lista,
    // "Ver en el cuerpo", Comparar) se pinta tambien con el demo en marcha.
    const focus =
      picked.length === 0 && demoId && set.roots.some((r) => r.id === demoId) ? [demoId] : null;
    neuroSkinChannel.set({
      figure: set.figure,
      roots: focus ?? (picked.length > 0 ? picked : set.roots.map((r) => r.id)),
      picked: focus ?? picked,
    });
  }, [open, set, picked, demoId]);

  // Y LOS ROTULOS DEL CUERPO ELIGEN RAIZ IGUAL QUE LA LISTA.
  useEffect(() => neuroPickBus.subscribe((id) => pick(id)));

  // SOLO PIEL MIENTRAS SE LEE LA CARTA; EL MUSCULO VUELVE CON EL MIOTOMA.
  //
  // Un dermatoma es piel. Con el musculo y el hueso encendidos la piel se
  // vuelve cristal (ver `ghostForLayers` en RigModel) y los territorios
  // pintados flotaban sobre un cuerpo desollado: era lo "feo". Mientras la
  // pestana esta abierta y no corre ningun demo, el cuerpo es solo piel solida;
  // al lanzar un miotoma vuelven las capas que el fisio tenia (el musculo que
  // se enciende tiene que verse), y al salir de Neuro todo queda como estaba.
  const savedLayersRef = useRef<LayerState | null>(null);
  useEffect(() => {
    if (!open || !set) return;
    if (!savedLayersRef.current) savedLayersRef.current = { ...layerChannel.get() };
    if (activeDemo) {
      layerChannel.set(savedLayersRef.current);
    } else {
      layerChannel.set({
        skin: true,
        muscle: false,
        bone: false,
        connective: false,
        cartilage: false,
        bursa: false,
      });
    }
  }, [open, set, activeDemo]);
  useEffect(
    () => () => {
      if (savedLayersRef.current) layerChannel.set(savedLayersRef.current);
      savedLayersRef.current = null;
    },
    [],
  );

  useEffect(() => () => neuroSkinChannel.clear(), []);

  const byId = useMemo(() => new Map((set?.roots ?? []).map((r) => [r.id, r])), [set]);

  // ---------------------------------------------------------------------------
  // EL PLAY QUE NO ENCENDIA NADA, Y NO LO DECIA.
  // ---------------------------------------------------------------------------
  // El brillo de un demo sale solo de `highlightMuscleIds`, y RigOverlays
  // resuelve cada id contra las FICHAS que la sesion tiene cargadas: el hombro
  // gratuito mas el payload de LA REGION ABIERTA (`useAllMuscles`). Una ficha
  // que vive en otra region simplemente no esta, y `forMuscleMeshes` hace
  // `if (!names) return;` sin aviso ninguno.
  //
  // MEDIDO el 2026-11-10, reconstruyendo ese universo region por region y
  // resolviendolo contra las mallas VISIBLES del rig preparado (el banco que lo
  // vigila a mano usaba la UNION de los seis catalogos, que es una union que la
  // aplicacion no tiene nunca, y por eso salia en verde):
  //
  //   [lumbar] las cuatro cabezas del cuadriceps 0 mallas y los isquiotibiales
  //            0: los dos demos de la region, mudos.
  //   [tobillo] lo mismo, los dos demos mudos.
  //   [cadera] recto femoral 3 mallas y los tres vastos 0: medio encendido.
  //   [cervical/hombro] el braquiorradial de C6, 0 mallas.
  //
  // El usuario pulsaba el play, el cuerpo se volvia de cristal, la articulacion
  // se movia y no se iluminaba ningun musculo.
  //
  // La plomeria (que fichas viajan en que payload) no se arregla desde aqui, y
  // de hecho se esta cerrando por el otro lado con un suelo de fichas que
  // `useAllMuscles` suma siempre. Lo que se arregla aqui es el SILENCIO, que es
  // un defecto por su cuenta: lo que se enciende se NOMBRA, y lo que no puede
  // encenderse se dice con palabras, en vez de dejar al fisio delante de un
  // modelo de cristal preguntandose cual era el musculo.
  const allMuscles = useAllMuscles();
  /** id -> nombre clinico, SOLO de los musculos que esta region puede resolver. */
  const nameByMuscleId = useMemo(
    () =>
      new Map(
        allMuscles.filter((m) => m.meshBases.length > 0).map((m) => [m.id, m.name] as const),
      ),
    [allMuscles],
  );
  /** Separa los musculos de un demo en los que se encienden y los que no. */
  const splitHighlight = (ids: string[]) => {
    const lit: string[] = [];
    const mute: string[] = [];
    for (const id of ids) {
      const name = nameByMuscleId.get(id);
      if (name) lit.push(name);
      else mute.push(id);
    }
    return { lit, mute };
  };

  const pick = (id: string) => {
    setPicked((cur) => {
      if (!compare) return cur.length === 1 && cur[0] === id ? [] : [id];
      if (cur.includes(id)) return cur.filter((r) => r !== id);
      // FIFO once full, so a third pick means "compare with this one instead".
      return [...cur, id].slice(-MAX_PICKED);
    });
  };

  /** Single door to the screen state, so the store can never fall out of step. */
  const updateScreen = (next: (cur: NeuroScreenState) => NeuroScreenState) => {
    setScreen((cur) => {
      const value = next(cur);
      if (set) writeScreen(set.id, value);
      return value;
    });
  };

  const grade = (id: string, patch: Partial<RootFinding>) => {
    // Counts screens STARTED, not taps: fired on the transition out of an empty
    // screen. Read and fired OUTSIDE the updater -- React is free to call an
    // updater more than once (StrictMode does, in development), so a side effect
    // in there is a double-counted event waiting to happen. `screen` is current
    // here because this only runs from an event handler.
    if (isScreenEmpty(screen)) track(EVENTS.neuroScreenGraded, { region });
    updateScreen((cur) => ({ ...cur, [id]: { ...(cur[id] ?? EMPTY_FINDING), ...patch } }));
  };

  const copySummary = async () => {
    if (!set) return;
    const text = screenSummary(set.roots, screen, set.title);
    if (!text) return;
    // The async Clipboard API needs a secure context and a granted permission,
    // and a clinic laptop on plain http has neither. The legacy execCommand path
    // is the fallback because a screen you cannot get out of the app is a screen
    // nobody will use. A prompt() was the first fallback and is not one: it
    // collapses a multi-line record into a single input and some browsers block it.
    const ok = await writeToClipboard(text);
    if (!ok) {
      setCopyFailed(true);
      window.setTimeout(() => setCopyFailed(false), 4000);
      return;
    }
    setCopied(true);
    track(EVENTS.neuroScreenCopied, { region, roots: set.roots.length });
    window.setTimeout(() => setCopied(false), 1800);
  };

  const startDemo = (r: NerveRoot) => {
    if (r.demo) demoChannel.start(DEMO_NS + r.id);
  };
  const stopDemo = () => demoChannel.stop();

  // ANIMATE the active myotome demo on the rig: sweep 0 -> target -> 0 with holds
  // (same pattern as OrthopedicTestsPanel). Honors prefers-reduced-motion.
  useEffect(() => {
    if (!demoId) return;
    // Y SI EL PANEL ESTA CERRADO, NO. Cerrar con la X solo pone
    // `rightPanel = 'none'`, y la condicion de montaje de MovementView deja el
    // panel MONTADO, asi que este bucle seguia conduciendo el rig: el modelo
    // barria la abduccion en bucle, con la piel de cristal y la tarjeta del
    // miotoma puesta, y ya no habia ningun boton para pararlo (el play de la
    // consola tampoco responde mientras el demo posee el canal). En movil no
    // pasaba porque el panel va en modo `bare` y cambiar de pestana lo
    // desmonta, de ahi la excepcion.
    if (!open && !bare) {
      demoChannel.stop(DEMO_NS + demoId);
      return;
    }
    const root = byId.get(demoId);
    const d = root?.demo;
    if (!root || !d) return;
    const side = d.side ?? 'R';
    const target = d.angleDeg;
    // Movements that share one arc with their opposite (elbow/knee extension)
    // START bent and straighten: 0 deg IS the extended joint. Sweeping 0 -> target
    // and holding there showed a joint bent to the target under the label
    // "extensión de codo" -- the opposite of the movement named.
    const ctrl = getBoneControl(d.movementId);
    const fromMax = ctrl?.kind === 'joint' && ctrl.arcFrom === 'max';
    const highlight = (d.highlightMuscleIds ?? []).map((muscleId) => ({
      muscleId,
      role: 'prime-mover' as const,
      level: 1,
    }));
    // Lo que de verdad se va a encender, y lo que no. Ver la nota de
    // `nameByMuscleId`: el id que no tiene ficha en esta region no ilumina
    // nada, y hasta ahora eso ocurria en silencio.
    const { lit, mute } = splitHighlight(d.highlightMuscleIds ?? []);
    // Built ONCE per demo, not per frame: the readout compares it by identity to
    // decide whether anything changed.
    const demoInfo = {
      label: `Miotoma ${root.label}`,
      targetDeg: target,
      structure: root.myotome.action,
      // EL NOMBRE DE LO QUE SE ENCIENDE. El lector tenia la linea
      // "Resaltado: ..." preparada y el panel de tests si le mandaba el campo;
      // este no, asi que un musculo se ponia rojo y en ningun sitio aparecia su
      // nombre --y encima el lector retira la tarjeta "Musculo protagonista"
      // mientras corre un demo--.
      structureLabels: lit,
      cannotShow:
        mute.length === 0
          ? undefined
          : lit.length === 0
            ? 'En esta región el modelo no ilumina el músculo del miotoma: su ficha pertenece a otra región del atlas. El movimiento que ves sí es el del miotoma.'
            : `Del miotoma ${mute.length === 1 ? 'queda 1 músculo' : `quedan ${mute.length} músculos`} sin iluminar: su ficha pertenece a otra región del atlas.`,
      note: d.note,
    };
    const push = (deg: number, components: typeof d.components) =>
      rigChannel.set({
        movementId: d.movementId,
        side,
        angleDeg: deg,
        // The joints that complete this myotome (C5 is abduction AND elbow
        // flexion), ya escalados por la linea de tiempo compartida.
        components,
        highlight,
        showMarkers: false,
        ghostSkin: true,
        // Fixed for the whole demo, so the readout describes the myotome
        // instead of recomputing (and flickering) its analysis every frame.
        demo: demoInfo,
      });
    // PARAR TIENE QUE DEVOLVER EL RIG, NO SOLO SOLTAR EL CANAL.
    //
    // Esto soltaba el canal y nada mas, contando con que la CONSOLA reaccionara
    // volviendo a empujar su estado con `setFromConsole`, que limpia de una
    // pieza lo que solo un demo pone (piel de cristal, componentes, tarjeta,
    // mano que resiste). Por debajo de 1024 px (useIsCompact) eso no pasa: la
    // hoja movil dibuja UNA pestana a la vez, asi que estando en Neuro la
    // consola esta DESMONTADA y no hay quien reaccione. Y `rigChannel.set` es
    // un parche, de modo que el ultimo fotograma del demo se quedaba puesto:
    // ghostSkin, los musculos encendidos, los marcadores apagados y los
    // componentes aplicados (el miotoma C5 lleva elbow-flexion a 90 grados).
    //
    // En un iPad en vertical (820 px) el boton de parar parecia no responder:
    // el cuerpo se quedaba translucido, con el brazo en abduccion y el codo
    // doblado, y solo se arreglaba saliendo a la pestana Movimiento.
    //
    // Asi que el panel empuja el mismo estado que empujaria la consola: la pose
    // que el fisio dejo puesta en esta region --`consolePoseStore`, que es de
    // donde la consola se restaura al volver a montarse-- o el reposo si no hay
    // ninguna. Con la consola montada ese empuje es identico al que ella hara
    // un instante despues, asi que no hay parpadeo ni pelea por el canal.
    const release = () => {
      demoChannel.stop(DEMO_NS + demoId);
      const pose = readPose(region);
      rigChannel.setFromConsole({
        movementId: pose?.movementId ?? null,
        side: pose?.side ?? 'R',
        angleDeg: pose?.angleDeg ?? 0,
        // El brillo y los marcadores son de la consola. `setFromConsole` no los
        // toca --no son campos de demo-- asi que hay que devolverlos a mano, o
        // los musculos del miotoma se quedan encendidos sobre un modelo parado.
        highlight: [],
        implicated: [],
        showMarkers: true,
      });
    };

    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // EL MISMO BUCLE QUE LOS TESTS (src/lib/demoTimeline.ts), que ya respeta el
    // arco compartido (`fromMax`: en C7 y L3 la posicion que se nombra es el 0)
    // y mete los componentes DESPUES de la base, no fijos desde el principio.
    const stop = startDemoLoop({
      target,
      fromMax,
      components: d.components,
      order: d.order,
      reduceMotion: reduce,
      push,
    });
    return () => {
      stop();
      release();
    };
    // `nameByMuscleId` y `region` entran porque el demo los lee: el primero
    // decide que musculos se nombran, el segundo de que pose se vuelve al
    // parar. Los dos cambian como mucho una vez por region, al instalarse su
    // contenido, que es antes de que nadie pueda pulsar un play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoId, byId, open, bare, nameByMuscleId, region]);

  if (!set) return null;

  if (!open && !bare) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="instrument pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-fg2 transition-colors hover:text-fg"
      >
        <NerveIcon />
        Neuro: dermatomas y miotomas
        {/* La cuenta en mono, sin pastilla (y a 11 px, no a 10). */}
        <span className="num text-[11px] font-bold text-brand">{set.roots.length}</span>
      </button>
    );
  }

  const pickedRoots = picked
    .map((id) => byId.get(id))
    .filter((r): r is NerveRoot => Boolean(r));
  const comparing = pickedRoots.length === MAX_PICKED;
  const screenStarted = !isScreenEmpty(screen);
  // Every root pending against its primary source -- which is how the set ships.
  // Stated once below instead of stamped on all ten rows.
  const allPending = set.roots.every((r) => r.cite.every((c) => !c.verified));
  const localization = localizeRoot(set.roots, screen);
  // Que se esta encendiendo AHORA, para la franja de abajo. El lector
  // (RhythmReadout) ya recibe lo mismo, pero no se monta por debajo de `lg`:
  // en tableta y movil esta franja es el UNICO sitio donde el musculo que se
  // pone rojo lleva su nombre.
  const demoRoot = demoId ? byId.get(demoId) : undefined;
  const demoSplit = demoRoot?.demo
    ? splitHighlight(demoRoot.demo.highlightMuscleIds ?? [])
    : null;

  return (
    <div
      className={
        // EN `bare` EL PANEL NO SE ESTIRA NI TIENE SCROLL PROPIO: lo hace quien lo
        // contiene (la pestana del margen de escritorio, la hoja movil). Con
        // `flex-1 min-h-0` aqui y otro scroll interno abajo, el panel se
        // ajustaba al alto del margen y la lista quedaba en lo que sobraba:
        // MEDIDO en escritorio a 1440x900, la lista de raices de Neuro media
        // 47 px de alto con 534 px de contenido, debajo del esquema, sin que
        // nada dijera que habia que hacer scroll ahi dentro.
        bare
          ? 'flex w-full flex-col'
          : 'instrument pointer-events-auto flex min-h-0 w-[24rem] max-w-[calc(100vw-2rem)] flex-1 flex-col overflow-hidden'
      }
    >
      {/* CABECERA: que raices son y los dos interruptores.
          En `bare` la pestana ya dice "Neuro", asi que la cabecera dice lo que
          la pestana no: de que miembro y de que niveles son las raices. Va como
          rotulo, sin icono, y los botones bajan a su propia linea: a 19rem
          "RAICES DEL MIEMBRO SUPERIOR" en versalitas de 11 px son unos 220 px y
          no cabia junto a dos botones con borde. La variante flotante, que no
          tiene pestana, conserva icono y boton de cerrar. */}
      <section className="sec">
        <div className="sec-head">
          {!bare && (
            <span className="shrink-0 text-fg3">
              <NerveIcon />
            </span>
          )}
          <Kicker className="min-w-0 leading-snug">{set.title}</Kicker>
          <span className="sec-rule" />
          {!bare && (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar neuro"
              className="btn btn-quiet btn-sm btn-icon -mr-1 shrink-0 text-fg3"
            >
              <CloseIcon size={15} />
            </button>
          )}
        </div>
        <p className="text-[11px] leading-snug text-fg3">{set.subtitle}</p>

        {/* Comparar estaba encima del esquema, como si fuera cosa del dibujo,
            y es cosa de la lista: elige dos raices y las pone lado a lado. Con
            el esquema plegado al final tenia que subir aqui. */}
        <div className="-mx-2 mt-2 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setCompare((v) => !v);
              // Leaving compare mode keeps the first pick, so the plate does not
              // blank out and the panel lands on a single root's detail.
              setPicked((cur) => (compare ? cur.slice(0, 1) : cur));
            }}
            aria-pressed={compare}
            title="Comparar dos raíces vecinas a la vez: los dermatomas se solapan, así que ver el borde común es lo que dice qué es propio de cada nivel"
            className={`btn btn-quiet btn-sm text-[11px] ${compare ? 'text-brand' : ''}`}
          >
            Comparar
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-pressed={showHelp}
            aria-label="Guía"
            title="Cómo se usa este panel"
            className={`btn btn-quiet btn-sm text-[11px] ${showHelp ? 'text-brand' : ''}`}
          >
            Guía
          </button>
        </div>
        {/* WHAT COMPARING IS FOR. The button carried its explanation in a
            `title`, which never shows on a touch screen and never shows at a
            glance -- "Comparar no sé para qué es". And the tooltip said what the
            button DID without saying why anyone would want it. */}
        {compare && (
          <p className="note note-brand mt-2 text-[11px] leading-snug">
            Elige <span className="text-fg">dos raíces vecinas</span>: los dermatomas se
            solapan, así que un déficit sensitivo casi nunca cae en un solo nivel. Ver
            las dos juntas, en el cuerpo y en la comparación de abajo, muestra el
            territorio compartido y el que es propio de cada una, que es el que orienta
            el diagnóstico.
          </p>
        )}
      </section>

      {showHelp && <HowToUse onDismiss={dismissHelp} />}

      {set.redFlags && set.redFlags.length > 0 && <RedFlags flags={set.redFlags} />}

      {/* QUE SE ESTA ENCENDIENDO, MIENTRAS CORRE EL DEMO.
          Una seccion con rotulo y filo, no una caja. Aparece solo durante el
          demo y dice lo que faltaba -- el nombre del musculo que se pone rojo,
          cuando NO hay ninguno, y la nota de lo que el modelo ensena.
          SOLO POR DEBAJO DE `lg`, que es donde el lector del margen izquierdo
          (RhythmReadout) no se monta. En escritorio ese lector ya dice lo
          mismo, tambien cuando el gesto del demo no esta en el ROM cargado:
          antes se callaba entero en 7 de los 8 demos de miotoma (solo C5 mueve
          un gesto del hombro) y por eso esta franja salia en los dos anchos;
          con los dos, el panel y el margen repetian el musculo. */}
      {demoSplit && (
        <section className="sec lg:hidden">
          <div className="sec-head">
            <Kicker>En el modelo ahora</Kicker>
            <span className="sec-rule" />
          </div>
          {demoSplit.lit.length > 0 ? (
            <p className="text-[13px] leading-snug text-fg2">
              Se ilumina <span className="font-semibold text-fg">{demoSplit.lit.join(' · ')}</span>
              .
            </p>
          ) : (
            <p className="text-[13px] leading-snug text-fg2">
              El movimiento es el del miotoma, pero aquí{' '}
              <span className="font-semibold text-fg">no se ilumina ningún músculo</span>: su
              ficha pertenece a otra región del atlas.
            </p>
          )}
          {demoSplit.lit.length > 0 && demoSplit.mute.length > 0 && (
            <p className="mt-1 text-[11px] leading-snug text-fg3">
              {demoSplit.mute.length === 1
                ? 'Queda 1 músculo del miotoma sin iluminar'
                : `Quedan ${demoSplit.mute.length} músculos del miotoma sin iluminar`}
              : su ficha pertenece a otra región del atlas.
            </p>
          )}
          {/* La nota del demo, una vez: la fila abierta la calla mientras su
              demo corre (ver NeuroRootRow). */}
          {demoRoot?.demo?.note && (
            <p className="mt-1 text-[11px] leading-snug text-fg3">{demoRoot.demo.note}</p>
          )}
        </section>
      )}

      {comparing && (
        <CompareBlock figure={set.figure} a={pickedRoots[0]} b={pickedRoots[1]} />
      )}

      {/* Roots, and above them the conclusion they feed.
          The readout sits at the TOP of the scroll region rather than after the
          rows: it is the panel's answer, and an answer found only after
          scrolling past everything reads as a footnote. */}
      <div className={bare ? 'pb-1' : 'min-h-0 flex-1 overflow-y-auto pb-1'}>
        {screenStarted && (
          <NeuroScreenReadout
            figure={set.figure}
            localization={localization}
            onShowLevel={(ids) => {
              // A tie proposes two levels, so showing it means turning compare on:
              // the plate can hold two territories and this is exactly the case
              // that needs it.
              setPicked(ids.slice(0, MAX_PICKED));
              setCompare(ids.length > 1);
            }}
            onClear={() => {
              if (set) clearScreen(set.id);
              setScreen({});
            }}
            onCopy={copySummary}
            copied={copied}
            copyFailed={copyFailed}
          />
        )}

        {/* LA LISTA DE RAICES, PROTAGONISTA DEL PANEL (regla 10). Rotulo + filo
            + cuenta, y las filas alineadas con el rotulo: su regla de pigmento
            cae bajo la primera letra. */}
        <section className="pt-3">
          <div className="mb-1.5 flex items-center gap-2.5 px-4">
            <Kicker>Raíces</Kicker>
            <span className="sec-rule" />
            <span className="num text-[11px] text-fg3">{set.roots.length}</span>
          </div>
          <div className="pl-4 pr-2">
            {set.roots.map((r) => (
              <NeuroRootRow
                key={r.id}
                root={r}
                pigment={pigmentFor(set.figure, r.id)}
                picked={picked.includes(r.id)}
                expanded={!comparing && picked.includes(r.id)}
                onPick={() => pick(r.id)}
                demoing={demoId === r.id}
                onDemo={() => (demoId === r.id ? stopDemo() : startDemo(r))}
                finding={screen[r.id] ?? EMPTY_FINDING}
                onGrade={(patch) => grade(r.id, patch)}
                showVerifyMark={!allPending}
              />
            ))}
          </div>
        </section>

        {/* EL ESQUEMA PLANO, PLEGADO BAJO SU ROTULO (regla 10).
            Estaba arriba, antes de la lista, ocupando hasta 26vh: con la carta
            ya pintada sobre el cuerpo, era la misma informacion dos veces y la
            lista --lo que se usa-- empezaba a media columna. Se queda porque
            tiene lo que el cuerpo no: el rig no tiene geometria por dermatoma y
            se pinta por regiones de piel con nombre, asi que el detalle por
            dedos solo esta aqui. Sigue siendo una entrada: tocar un territorio
            elige su raiz. */}
        <section className="px-4 pt-4">
          <button
            type="button"
            onClick={() => setPlateOpen((v) => !v)}
            aria-expanded={plateOpen}
            className="flex w-full items-center gap-2.5 py-1 text-left"
          >
            <Kicker>Esquema de dermatomas</Kicker>
            <span className="sec-rule" />
            <ChevronDownIcon
              size={12}
              className={`shrink-0 text-fg3 transition-transform ${plateOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <p className="mt-1 text-[11px] leading-snug text-fg3">
            Plano y orientativo. Conserva el detalle de los dedos, que el modelo 3D pinta
            por regiones.
          </p>
          {plateOpen && (
            <div className="mt-2">
              <DermatomeMap
                figure={set.figure}
                activeRoots={picked}
                onSelectRoot={pick}
                keyPointFor={(id) => byId.get(id)?.dermatome.keyPointShort}
              />
            </div>
          )}
        </section>

        {allPending && (
          <p className="px-4 pt-4 text-[11px] leading-snug text-fg3">
            Los valores de esta pantalla siguen pendientes de cotejo contra la fuente
            primaria (ASIA/ISNCSCI y Magee).
          </p>
        )}
        {/* QUE ESTA COTEJADO Y QUE NO, EN UNA LINEA.
            Antes esto decia que la pantalla entera estaba sin cotejar, lo cual
            dejaba al lector sin saber de que fiarse. Ahora los puntos clave y
            los musculos clave vienen leidos de la hoja ISNCSCI, y lo que sigue
            sin cotejar (los miotomas ampliados y los niveles de los reflejos,
            que son de Magee) se dice con ese nombre. */}
        {!allPending && (
          <p className="px-4 pt-4 text-[11px] leading-snug text-fg3">
            <span className="text-fg2">Puntos clave sensitivos y músculos clave</span>{' '}
            cotejados contra la hoja de trabajo oficial ISNCSCI. Los miotomas ampliados
            y los niveles de los reflejos siguen a Magee y están pendientes de cotejo.
          </p>
        )}
        <p className="px-4 py-3 text-[11px] leading-snug text-fg3">
          Los mapas dermatómicos y las raíces de los reflejos varían entre autores
          (ASIA, Keegan). Úsalo como guía de razonamiento segmentario, no como
          límite exacto. Contenido educativo.
        </p>
      </div>
    </div>
  );
}
