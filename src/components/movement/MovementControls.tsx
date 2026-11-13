// src/components/movement/MovementControls.tsx
//
// The movement lab's CONSOLE (the bottom half of the left margin). It drives
// the skinned rig (RigModel, via rigChannel) by clinical movementId + side +
// SIGNED angle and owns playback; the live clinical READOUT (goniometer
// sectors, humero-escapulo-raquideo rhythm, protagonist muscle) lives in
// RhythmReadout (top half), a read-only twin fed by the SAME rigChannel.
//
// This panel still computes the live per-muscle recruitment (activeMusclesAt) and
// pushes it as the scene highlight so the real rig meshes glow as the arc sweeps;
// it just no longer renders the muscle list itself.
//
// -----------------------------------------------------------------------------
// FORMA: SISTEMA LAMINA (docs/sistema-lamina.md). NI UNA CAJA.
// -----------------------------------------------------------------------------
// La consola es una pila de secciones de margen (`.sec` con su rotulo y su
// filo), y en ese orden se usa: QUE se mueve, CUANTO, y con que cuadro clinico.
//
//   MOVIMIENTO      todos los arcos de la region, A LA VISTA, en una rejilla de
//                   dos columnas de opciones (`.opt`), y el lado en la cabecera.
//   ARCO            reproducir + deslizador en una fila; debajo, volver a 0,
//                   bucle y velocidad.
//   ESTADO CLINICO  los cuadros patologicos del movimiento, con lo que cada uno
//                   altera escrito debajo de su nombre.
//   pie             la ficha para el paciente y el arco 3D.
//
// LO QUE HABIA Y POR QUE SE FUE:
//
//   - Los movimientos eran una fila de fichas con borde que se desbordaba. En
//     la cadera, MEDIDO: el carril tenia clientWidth 310 y scrollWidth 508, de
//     modo que "Rotacion interna" salia cortada y "Rotacion externa" quedaba
//     fuera, sin barra de scroll (index.css la esconde) y con un degradado como
//     unica pista. Dos de seis movimientos no existian para quien no arrastrara.
//     La rejilla no tiene scroll horizontal: 4 movimientos son 2 filas y los 6
//     de la cadera son 3, en cualquier ancho de margen.
//   - Las dos columnas no son solo ahorro de alto: en 7 de las 8 regiones el
//     dato viene en pares antagonistas (flexion/extension, abduccion/aduccion,
//     rotacion interna/externa, pronacion/supinacion, inversion/eversion), asi
//     que cada fila de la rejilla es un par.
//   - "Ajustes" era un cajon con nombre generico que escondia dos cosas sin
//     relacion: un interruptor y los cuadros patologicos, que son el
//     diferenciador del producto. Ahora el interruptor esta a la vista en el
//     pie y los cuadros tienen su propia seccion, que dice el estado actual
//     ("Normal", "Discinesia") tambien plegada.
//   - El lado y la velocidad eran pistas redondeadas con una ficha blanca
//     dentro; ahora son pestanas subrayadas (ver ui/Controls).
//
// BIDIRECTIONAL: when a movement carries a labReverse arc (shoulder), the slider
// spans a SIGNED range through 0 (neutral marked) and STARTS at the opposite
// anatomical extreme. Playback (rAF) sweeps min<->max with speed / loop, honors
// prefers-reduced-motion.
//
// Mounted with key={region} by MovementView, so its initial state is derived
// straight from the active region with no cross-region staleness.
//
// UI strings Spanish LATAM; code/ids ASCII; no `any`.

import { createPortal } from 'react-dom';
import { REFERENCES } from '../../data/references';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { rigChannel, type RigHighlight } from './RigModel';
import { demoChannel, useActiveDemo } from './demoChannel';
import { labMotionChannel } from './labMotionChannel';
import { arcFraction, axisLeft } from '../../lib/labArc';
import { grados } from '../../lib/phaseLabel';
import { readPose, writePose } from './consolePoseStore';
import { romForRegion } from '../../data/romByRegion';
import { useIsCompact } from '../../hooks/useIsCompact';
import { getBoneControl, isDrivable, type Side } from '../../lib/boneMap';
import type { RomMovement } from '../../types/rom';
import { buildLabArc, phaseAtAngleIn } from '../../lib/romPhaseAtAngle';
import { activeMusclesAt, type ActiveMuscle } from '../../lib/romActivation';
import {
  pathologiesForMovement,
  pathologyById,
  type MovementPathology,
} from '../../data/pathologies';
import { musclesForRomLookup } from '../../data/musclesByRegion';
import { REGIONS } from '../../data/regiones';
import { exportPatientCard, type PatientCardInfo } from '../../lib/patientExport';
import { patientInstruction } from '../../lib/patientPhrase';
import { LockGlyph, useFeatureGate } from '../account/PremiumGate';
import { FREE_MOVEMENT_QUOTA } from '../../auth/entitlements';
import { EVENTS, track, trackChange } from '../../lib/analytics';
import { IconButton, Segmented, Switch } from '../ui/Controls';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  LoopIcon,
  NeutralIcon,
  PauseIcon,
  PlayIcon,
} from '../ui/Icons';

const SIDE_LABEL: Record<Side, string> = { R: 'Derecho', L: 'Izquierdo' };

/** Playback speeds in degrees/second (clinical, unhurried pace). */
const SPEEDS = [
  { id: 'slow', label: 'Lento', dps: 12 },
  { id: 'normal', label: 'Normal', dps: 25 },
  { id: 'fast', label: 'Rápido', dps: 50 },
] as const;

/**
 * LO QUE UN CUADRO PATOLOGICO CAMBIA EN EL MOVIMIENTO, EN TRES PALABRAS.
 *
 * El panel explicaba los cuadros con una frase fija: "cambia el ritmo entre
 * humero y escapula, se limita el rango". Era verdad para el hombro, que es
 * donde se escribio, y se imprimia igual en las ocho regiones. MEDIDO sobre los
 * 21 cuadros de src/data/pathology/*: solo 3 traen `shoulderMod` (los tres del
 * hombro), 15 recortan el arco (13 con `rangeCapDeg`, 2 con `rangeFloorDeg`) y
 * 4 no alteran el movimiento en nada, solo marcan la estructura implicada y
 * cuentan por que duele: inestabilidad lateral del tobillo, epicondilalgia
 * lateral, maltracking rotuliano e inestabilidad lumbar. O sea que en la
 * rodilla el panel prometia un "ritmo entre humero y escapula", y en esos
 * cuatro cuadros prometia un movimiento alterado que el modelo no hace.
 *
 * Asi que no se promete: se LEE del propio dato lo que el cuadro toca y se
 * escribe debajo de su nombre. El tope solo se nombra si de verdad recorta el
 * arco de ESTE movimiento (un tope por encima del maximo no limita nada).
 */
export function pathologyEffect(
  p: Pick<MovementPathology, 'shoulderMod' | 'rangeCapDeg' | 'rangeFloorDeg'>,
  arc: { min: number; max: number },
): string {
  const parts: string[] = [];
  if (p.shoulderMod) parts.push('ritmo alterado');
  if (p.rangeCapDeg != null && p.rangeCapDeg < arc.max) parts.push(`arco hasta ${p.rangeCapDeg}°`);
  if (p.rangeFloorDeg != null && p.rangeFloorDeg > arc.min) {
    parts.push(`arco desde ${p.rangeFloorDeg}°`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'no cambia el arco';
}

/**
 * Donde cae la marca de 0° sobre el deslizador, como valor CSS de `left`.
 *
 * El pulgar no recorre el ancho entero de la pista: mide 15 px (ver
 * `.range-clinical` en index.css) y su CENTRO va de 7,5 px a ancho - 7,5 px. La
 * marca se colocaba en `left: pct%` a secas, o sea sobre el ancho entero, y se
 * separaba del pulgar justo donde tenia que coincidir con el. En la abduccion
 * del hombro (-30 a 180) el cero esta al 14,3% y la marca quedaba 5,4 px a la
 * izquierda del pulgar puesto en 0°; en la rotacion (-100 a 80), 0,8 px a la
 * derecha. La correccion es la del propio pulgar: (0,5 - pct) x 15 px.
 */
export function neutralMarkLeft(pct: number, thumbPx = 15): string {
  const shift = (0.5 - pct / 100) * thumbPx;
  return `calc(${pct}% + ${shift.toFixed(2)}px)`;
}

/** Live subscription to prefers-reduced-motion. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

interface MovementControlsProps {
  region: string | null;
  /** When true, render the big, simplified PATIENT bar instead of the clinician
   *  panel (same underlying state, so toggling preserves the current pose). */
  patientMode?: boolean;
  /**
   * True when this console is a SECTION of the left margin (MovementView stacks
   * the readout above it). Embedded, it drops its own panel chrome and, from
   * `sm` up, its header: the gesture, the plane and the angle are already the
   * readout's headline right above, and printing them twice was the main reason
   * the column read as cluttered. Below `sm` the readout is hidden, so the
   * header comes back to carry that identity.
   */
  embedded?: boolean;
  /**
   * True when this console is the body of the compact bottom sheet
   * (MobileLabSheet). The sheet's detent IS the collapse and the sheet owns the
   * scrolling, so the console must not do either: self-collapsing left the
   * expanded sheet showing a header and 400px of nothing, and its own height
   * cap would fight the sheet's height for the same pixels.
   */
  inSheet?: boolean;
  /**
   * Donde va la lista de movimientos, si no es dentro de la consola. En el
   * margen de escritorio va ARRIBA del todo --que se estudia-- y el arco abajo,
   * a la altura de la regla del escenario --cuanto se mueve--. La consola sigue
   * siendo una pieza con su estado (gesto, angulo, reproduccion); la lista solo
   * se pinta en otro sitio, con un portal.
   */
  movementSlot?: HTMLElement | null;
}

export function MovementControls({
  region,
  patientMode = false,
  embedded = false,
  inSheet = false,
  movementSlot = null,
}: MovementControlsProps) {
  const movements = useMemo(() => romForRegion(region), [region]);
  const reducedMotion = usePrefersReducedMotion();
  // Phones get a throttled playback commit rate -- see the loop below.
  const compact = useIsCompact();

  // CAPABILITY GATES. The free tier drives a DEMO of the lab (the first drivable
  // movement) so the rig proves itself, but the tools a physio uses in front of a
  // patient -- the full arc library, pathological presets -- are premium. Locked
  // entries stay listed with a lock, never hidden.
  const labGate = useFeatureGate('movement-full');
  const pathologyGate = useFeatureGate('pathologies');
  // LA FICHA PARA EL PACIENTE SE REGALABA. `entitlements.ts` define
  // `patient-mode` como "the full-screen patient view + 'export for patient'
  // card", y las dos pantallas que venden lo dicen con esas palabras: Pricing
  // ("Modo paciente a pantalla completa y tarjeta imprimible para llevarse a
  // casa") y Paywall ("Modo paciente y tarjeta imprimible para el paciente").
  // Pero aqui el boton abria el formulario y descargaba el PNG para cualquiera:
  // esta consola solo consultaba `movement-full` y `pathologies`. El modo
  // paciente si estaba cerrado (MovementView), asi que la mitad de la misma
  // capacidad se cobraba y la otra mitad no. Ahora la fila sigue A LA VISTA con
  // su candado, como el resto de lo bloqueado, y abre precios.
  const cardGate = useFeatureGate('patient-mode');

  /** Movement ids the current plan may drive. */
  const allowedIds = useMemo(() => {
    if (labGate.unlocked) return null; // null = no restriction
    const free = movements.filter((m) => isDrivable(m.id)).slice(0, FREE_MOVEMENT_QUOTA);
    return new Set(free.map((m) => m.id));
  }, [labGate.unlocked, movements]);

  const isLockedMovement = (id: string) => allowedIds != null && !allowedIds.has(id);

  /**
   * LA POSE QUE YA ESTABA PUESTA, si la consola se esta volviendo a montar.
   *
   * Esta consola se desmonta en tres situaciones corrientes --cambiar de
   * pestana en la hoja del movil, entrar o salir del modo paciente, cualquier
   * cambio de distribucion-- y en las tres el gesto volvia al primero de la
   * lista y el angulo a 0. Entrar en modo paciente para ensenarle SU posicion y
   * encontrar el brazo colgando es el caso que mas se nota, porque es
   * exactamente el momento en que esa pose importa. Ver consolePoseStore.
   */
  const saved = readPose(region);
  const [movementId, setMovementId] = useState<string>(() => {
    if (saved && movements.some((m) => m.id === saved.movementId)) return saved.movementId;
    const drivable = movements.find((m) => isDrivable(m.id));
    return (drivable ?? movements[0])?.id ?? '';
  });
  const [side, setSide] = useState<Side>(saved?.side ?? 'R');
  const [angle, setAngle] = useState<number>(saved?.angleDeg ?? 0);
  /**
   * Y el primer efecto de [movementId] NO puede pisarla.
   *
   * Ese efecto existe para devolver el angulo al inicio anatomico del gesto
   * cuando el usuario CAMBIA de gesto, pero en React tambien corre al montar:
   * restaurar el angulo en el useState y que el efecto lo mandara a startDeg
   * una decima de segundo despues deja la pose igual de perdida, solo mas
   * tarde. Asi que el primer disparo se salta cuando venimos de una pose
   * guardada.
   */
  const skipFirstResetRef = useRef(saved != null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [showMarkers, setShowMarkers] = useState(true);
  // A test/myotome demo animating the rig (demoChannel). While one runs, the
  // console pauses its playback and stops pushing rigChannel so the two rAF
  // loops never fight over the pose (play general -> play demo used to stutter).
  const activeDemo = useActiveDemo();
  useEffect(() => {
    if (activeDemo) setPlaying(false);
  }, [activeDemo]);
  /** Stop any running demo so the console owns the rig again. */
  const claimRig = () => demoChannel.stop();
  // Start collapsed on phones so the model is visible; expanded on desktop.
  const [selfCollapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 639px)').matches;
  });
  // Inside the sheet the detent already decides how much of this is on screen.
  const collapsed = inSheet ? false : selfCollapsed;
  // LOS CUADROS CLINICOS SE ABREN SOLOS SOLO DONDE CABEN. Abierta, la seccion
  // mide lo que su lista (Normal + hasta 3 cuadros a dos lineas, mas la frase
  // que explica que hacen): unos 180 px que salen del alto de la lectura de
  // arriba. A 1000 px de ventana la lectura los tiene; por debajo, la seccion
  // abre plegada y su cabecera ya dice el estado actual.
  const [clinicalOpen, setClinicalOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-height: 1000px)').matches;
  });
  // P1: active pathological preset (null = Normal). Only the elevation chain
  // supports it; reset to Normal whenever the movement changes.
  const [pathologyId, setPathologyId] = useState<string | null>(null);
  // EL PIE DEL MARGEN DE ESCRITORIO: un menu flotante abierto como mucho.
  const [footMenu, setFootMenu] = useState<null | 'clinico' | 'ficha'>(null);
  // En una ventana baja la lista de movimientos se queda en el elegido y
  // "Otros N" (ver `.lab-moves` en index.css); esto la despliega.
  const [movesOpen, setMovesOpen] = useState(false);
  const footRef = useRef<HTMLDivElement>(null);

  const movement: RomMovement | null =
    movements.find((m) => m.id === movementId) ?? null;
  const control = movementId ? getBoneControl(movementId) : undefined;
  const drivable = control != null && control.kind !== 'unsupported';
  const isSpine = control?.kind === 'spine';
  const regionName = (region && REGIONS[region]?.name) || movement?.joint || '';
  /** Cuantos arcos de la region puede conducir el rig (los que Premium abre). */
  const drivableCount = movements.filter((m) => isDrivable(m.id)).length;

  /**
   * Cycle to the previous / next movement of this region (patient-mode arrows).
   *
   * Solo entre los que se pueden poner: las flechas recorrian la lista entera,
   * y un arco no conducible (o bloqueado por el plan) dejaba la barra del
   * paciente con un nombre arriba y un modelo quieto debajo, sin deslizador.
   */
  const goToMovement = (dir: -1 | 1) => {
    const pool = movements.filter((m) => isDrivable(m.id) && !isLockedMovement(m.id));
    if (pool.length === 0) return;
    const idx = pool.findIndex((m) => m.id === movementId);
    const next = idx < 0 ? pool[0] : pool[(idx + dir + pool.length) % pool.length];
    if (next) setMovementId(next.id);
  };

  // The continuous signed arc this movement sweeps in the lab.
  const arc = useMemo(() => (movement ? buildLabArc(movement) : null), [movement]);

  // Pathology presets available for THIS movement (empty = none). A preset may cap
  // the reachable max (ROM loss) or raise the reachable min (extension lag), so the
  // slider + playback bound to [effMin, effMax] instead of the full arc.
  const pathologyOptions = useMemo(
    () => pathologiesForMovement(movementId),
    [movementId],
  );
  const supportsPathology = pathologyOptions.length > 0;
  const pathology = supportsPathology ? pathologyById(pathologyId) : null;
  const cap = pathology?.rangeCapDeg ?? null;
  const floor = pathology?.rangeFloorDeg ?? null;
  // Structures implicated by the active pathology, to emphasize in the scene.
  const implicated = useMemo(
    () => (supportsPathology ? pathologyById(pathologyId)?.implicated ?? [] : []),
    [supportsPathology, pathologyId],
  );
  const effMax = arc ? (cap != null ? Math.min(arc.max, cap) : arc.max) : 0;
  const effMin = arc ? (floor != null ? Math.max(arc.min, floor) : arc.min) : 0;

  // Live per-muscle recruitment at the current angle (premium activation model).
  // Falls back to the current phase's muscle list (level 1) for movements without
  // activation envelopes. Pushed to the rig as the scene highlight (auto glow).
  const liveMuscles: ActiveMuscle[] = useMemo(() => {
    if (!movement) return [];
    const active = activeMusclesAt(movement, angle);
    if (active.length > 0) return active;
    const phase = arc ? phaseAtAngleIn(arc.phases, angle) : null;
    return (phase?.phase.muscles ?? []).map((m) => ({
      muscleId: m.muscleId,
      role: m.role,
      level: 1,
      note: m.note,
    }));
  }, [movement, angle, arc]);

  // muscleId -> Spanish name, so the patient export can list the working muscles
  // (the glow shows WHERE; the card says WHO).
  const muscleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of musclesForRomLookup(region)) map.set(m.id, m.name);
    return map;
  }, [region]);

  // Prime movers at the current angle, by name (deduped; feeds the export card).
  const primeMoverNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const m of liveMuscles) {
      if (m.role !== 'prime-mover') continue;
      const name = muscleNameById.get(m.muscleId);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
    return names;
  }, [liveMuscles, muscleNameById]);

  // --- Patient export ("Exportar para paciente"): capture the current pose into a
  // clean, plain-language PNG handout the physio can print or send. Client-side.
  // Folded away behind one row until asked for, so the console's resting state is
  // the movement itself and not a form. ---
  const [note, setNote] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const onExport = async () => {
    if (!movement) return;
    // La puerta tambien aqui, no solo en el boton que abre el cajon: es la
    // accion la que vale dinero, y un cajon que ya estuviera abierto al caducar
    // la suscripcion no puede seguir descargando.
    if (!cardGate.unlocked) {
      cardGate.requestUpgrade();
      return;
    }
    const prime =
      primeMoverNames.length > 0
        ? primeMoverNames
        : [
            ...new Set(
              liveMuscles.map((m) => muscleNameById.get(m.muscleId) ?? m.muscleId),
            ),
          ];
    const rng = movement.totalRangeDeg;
    const facts: PatientCardInfo['facts'] = [
      { label: 'Zona', value: regionName },
      {
        label: 'Movimiento',
        value: movement.plane
          ? `${movement.name} (plano ${movement.plane.toLowerCase()})`
          : movement.name,
      },
      { label: 'Lado', value: SIDE_LABEL[side] },
      {
        label: 'Rango objetivo',
        value: `${Math.round(rng.min)} a ${Math.round(rng.max)}°`,
      },
    ];
    if (prime.length > 0) {
      facts.push({ label: 'Músculos', value: prime.slice(0, 4).join(', ') });
    }
    const info: PatientCardInfo = {
      title: `${movement.name} · ${regionName}`,
      instruction: patientInstruction(movement, regionName),
      note,
      facts,
      fileStem: `anatris-${region ?? 'lab'}-${movement.id}`,
    };
    setExporting(true);
    setExportMsg(null);
    try {
      await exportPatientCard(info);
      track(EVENTS.patientCardExported, { region, movement: movement.id });
      setExportMsg('Imagen descargada');
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : 'No se pudo exportar.');
    } finally {
      setExporting(false);
      window.setTimeout(() => setExportMsg(null), 4000);
    }
  };

  // Reset the angle to the gesture's anatomical START whenever the movement
  // changes, stop any playback (and any demo), and clear the pathology back to
  // Normal.
  useEffect(() => {
    if (skipFirstResetRef.current) {
      skipFirstResetRef.current = false;
      return;
    }
    claimRig();
    setPlaying(false);
    setAngle(arc ? arc.startDeg : 0);
    setPathologyId(null);
    // Which movements the lab is actually used for. Fired on SELECTION, never
    // per drag frame — dragging one arc for a minute is one event, not 3000.
    trackChange(EVENTS.movementDriven, { region, movement: movementId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementId]);

  // Which pathological presets get tried — the differentiator, so worth knowing
  // whether anyone finds it. Null (back to Normal) is not an event.
  useEffect(() => {
    if (!pathologyId) return;
    trackChange(EVENTS.pathologySelected, { movement: movementId, pathology: pathologyId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathologyId]);

  // Pathology range clamp: if the reachable window shrinks past the current angle
  // (selecting a preset that caps the max or floors the min), pull the pose into it.
  useEffect(() => {
    setAngle((a) => (a > effMax ? effMax : a < effMin ? effMin : a));
  }, [effMax, effMin]);

  // --- Push the live state to the rig (drive + scene highlight + markers).
  useEffect(() => {
    // A demo (orthopedic test / myotome) owns the rig right now; pushing here
    // would fight its rAF loop frame by frame. When it releases, activeDemo
    // flips to null and this effect re-pushes the console's state.
    if (activeDemo) return;
    if (!drivable || !arc) {
      rigChannel.setFromConsole({
        movementId: null,
        angleDeg: 0,
        highlight: [],
        showMarkers,
        implicated: [],
      });
      return;
    }
    const highlight: RigHighlight[] = liveMuscles.map((m) => ({
      muscleId: m.muscleId,
      role: m.role,
      level: Math.min(1, m.level ?? 1),
    }));
    // `setFromConsole` limpia de una pieza todo lo que solo un demo pone --la
    // piel de cristal, la mano que resiste, la tarjeta de la maniobra y los
    // COMPONENTES--, que es lo que cada empuje enumeraba a mano dejandose uno.
    const posed = Math.max(effMin, Math.min(angle, effMax));
    rigChannel.setFromConsole({
      movementId,
      side,
      angleDeg: posed,
      highlight,
      showMarkers,
      pathologyId: supportsPathology ? pathologyId : null,
      implicated,
    });
    // Y se guarda, para que un desmontaje (pestana del movil, modo paciente) la
    // devuelva tal cual. Ver consolePoseStore.
    writePose(region, { movementId, side, angleDeg: posed });
  }, [
    movementId,
    side,
    angle,
    drivable,
    arc,
    showMarkers,
    liveMuscles,
    supportsPathology,
    pathologyId,
    effMax,
    effMin,
    implicated,
    activeDemo,
  ]);

  // Return to rest when leaving the lab so re-entry starts clean, including the
  // demo-only flags (a demo running at unmount would otherwise leave the glass
  // skin and the resisting hand stuck on the model).
  useEffect(() => {
    return () =>
      rigChannel.setFromConsole({
        movementId: null,
        angleDeg: 0,
        highlight: [],
        implicated: [],
      });
  }, []);

  // --- Playback loop (requestAnimationFrame). Sweeps min<->max; loops or stops
  // after one bounce; honored only when reduced motion is OFF.
  //
  // ON A PHONE THIS LOOP IS THROTTLED. `setAngle` is React state, so every frame
  // it fires re-renders this console, the sheet that now wraps it, the readout,
  // the activation bars and the slider -- a full reconcile, 60 times a second,
  // on top of the CPU skinning of 1300+ meshes. That was the other half of the
  // stutter. A ROM sweep runs at 30-60 deg/s, so at 30 Hz the model advances
  // about one degree between updates: nobody can see the difference, and the
  // main thread gets half its budget back for the actual animation. Desktop is
  // left at full rate.
  const rafRef = useRef<number>(0);
  const dirRef = useRef<1 | -1>(1);
  const lastTsRef = useRef<number>(0);
  useEffect(() => {
    if (!playing || !arc || reducedMotion) return;
    const min = effMin; // pathology floor bounds the sweep (extension lag)
    const max = effMax; // pathology cap bounds the sweep (ROM loss)
    const dps = SPEEDS[speedIdx].dps;
    const minStepMs = compact ? 1000 / 30 : 0;
    lastTsRef.current = 0;
    let lastCommit = 0;
    const tick = (ts: number) => {
      if (lastTsRef.current === 0) lastTsRef.current = ts;
      // Skip the COMMIT, never the clock: dt keeps accumulating, so a throttled
      // sweep covers the same degrees in the same seconds as an unthrottled one.
      if (minStepMs && ts - lastCommit < minStepMs) {
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      lastCommit = ts;
      setAngle((prev) => {
        let next = prev + dirRef.current * dps * dt;
        if (next >= max) {
          next = max;
          dirRef.current = -1;
        } else if (next <= min) {
          next = min;
          if (loop) {
            dirRef.current = 1;
          } else {
            window.cancelAnimationFrame(rafRef.current);
            setPlaying(false);
            return min;
          }
        }
        return next;
      });
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, [playing, arc, speedIdx, loop, reducedMotion, effMax, effMin, compact]);

  // UN CAJON QUE SE ABRE TIENE QUE VERSE ABIERTO. La consola tiene el alto
  // acotado (ver el cuerpo, abajo) y los dos cajones --los cuadros clinicos y
  // la ficha para el paciente-- cuelgan de su parte baja: en una ventana de 768
  // la fila que los abre ya esta junto al borde, asi que el contenido aparecia
  // entero por debajo del pliegue y lo unico que cambiaba en pantalla era el
  // giro de la flecha. Al abrir, el cajon se trae a la vista.
  const clinicalRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (clinicalOpen) clinicalRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [clinicalOpen]);
  useEffect(() => {
    if (exportOpen) exportRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [exportOpen]);

  useEffect(() => {
    if (!footMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFootMenu(null);
    };
    const onDown = (e: PointerEvent) => {
      if (footRef.current && !footRef.current.contains(e.target as Node)) setFootMenu(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    // El foco entra en el menu: el primer control.
    const first = footRef.current?.querySelector<HTMLElement>(
      '.lab-menu button, .lab-menu textarea',
    );
    first?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [footMenu]);
  // Cambiar de movimiento cierra el menu (sus cuadros eran de otro gesto).
  useEffect(() => setFootMenu(null), [movementId]);

  const togglePlay = () => {
    if (!arc) return;
    claimRig();
    if (reducedMotion) {
      setAngle((prev) => (prev <= (effMin + effMax) / 2 ? effMax : effMin));
      return;
    }
    if (!playing) {
      dirRef.current = angle <= effMin + 0.5 ? 1 : angle >= effMax - 0.5 ? -1 : dirRef.current;
    }
    setPlaying((p) => !p);
  };

  const returnToNeutral = () => {
    claimRig();
    setPlaying(false);
    setAngle(0);
  };

  /** Arrastrar el deslizador: la consola toma el rig y la reproduccion se para. */
  const onScrub = (e: ChangeEvent<HTMLInputElement>) => {
    claimRig();
    setPlaying(false);
    setAngle(Number(e.target.value));
  };

  // EL MARGEN PIDE UN GRADO (el paginador de fases) Y LA CONSOLA LO PONE: es la
  // duena del angulo. Lo mismo que arrastrar el deslizador, recortado al arco
  // que permite el cuadro clinico. Ver labMotionChannel.
  const seekRef = useRef<(deg: number) => void>(() => {});
  seekRef.current = (deg: number) => {
    if (!drivable || !arc) return;
    claimRig();
    setPlaying(false);
    setAngle(Math.max(effMin, Math.min(deg, effMax)));
  };
  // Solo la consola del margen de escritorio escucha: la de la hoja del movil y
  // la del modo paciente no se montan a la vez que ese margen.
  const listens = embedded && !inSheet && !patientMode;
  useEffect(() => {
    if (!listens) return;
    return labMotionChannel.onSeek((deg) => seekRef.current(deg));
  }, [listens]);

  // Y PUBLICA SI EL CUERPO SE MUEVE (reproduccion o deslizador agarrado), para
  // que el margen no baile al cambiar de fase.
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!listens) return;
    labMotionChannel.setMoving(playing || dragging);
  }, [listens, playing, dragging]);
  useEffect(() => {
    if (!listens) return;
    return () => labMotionChannel.setMoving(false);
  }, [listens]);
  useEffect(() => {
    if (!dragging) return;
    const up = () => setDragging(false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging]);

  const displayAngle = Math.round(angle);
  const gestureName =
    arc && angle < 0 && movement?.labReverse ? movement.labReverse.name : movement?.name;

  const sliderVal = Math.round(Math.max(effMin, Math.min(angle, effMax)));
  const span = effMax - effMin;
  const fillPct = span > 0 ? ((sliderVal - effMin) / span) * 100 : 0;
  // Where 0° sits on a signed arc, so the neutral position is legible on the track.
  const neutralPct = span > 0 && effMin < 0 && effMax > 0 ? ((0 - effMin) / span) * 100 : null;
  // Some arcs are so short that dragging the slider from end to end barely
  // moves the model, and the honest reading of the screen is "this is broken".
  // Lumbar rotation is the case that prompted this: 5 deg in total, because the
  // lumbar facets are sagittal and block it. The fix is NOT to exaggerate the
  // angle, which would teach the wrong number, but to say out loud that the
  // stillness IS the finding. Derived from the arc, so a future short movement
  // gets the note without anyone remembering to add it.
  const tinyArc = span > 0 && span <= 10;
  // Measured population value for this movement, when a primary study gives one.
  const measured = movement?.normative?.[0] ?? null;
  const measuredSource = useMemo(() => {
    if (!measured) return '';
    const r = REFERENCES[measured.cite.ref];
    return r ? `${r.authors.split(',')[0]} ${r.year}` : measured.cite.ref;
  }, [measured]);
  /** Una cifra con la coma decimal del castellano. */
  const coma = (n: number) => String(n).replace('.', ',');
  // LA FRANJA DE LO MEDIDO, sobre la pista: la media ± una DE del estudio, en el
  // mismo eje que el pulgar. Se ve de un vistazo si el brazo esta dentro de lo
  // que mide la poblacion sin leer la cifra.
  const band = useMemo(() => {
    if (!measured || span <= 0) return null;
    const sd = measured.sdDeg ?? 0;
    const lo = Math.max(effMin, measured.meanDeg - sd);
    const hi = Math.min(effMax, measured.meanDeg + sd);
    const inArc = measured.meanDeg >= effMin && measured.meanDeg <= effMax;
    if (hi <= lo && !inArc) return null;
    const dt = arcFraction(hi, effMin, effMax) - arcFraction(lo, effMin, effMax);
    return {
      left: axisLeft(lo, effMin, effMax),
      width: `calc(${(dt * 100).toFixed(4)}% - ${(dt * 15).toFixed(2)}px)`,
      mean: inArc ? axisLeft(measured.meanDeg, effMin, effMax) : null,
    };
  }, [measured, span, effMin, effMax]);
  const [measuredOpen, setMeasuredOpen] = useState(false);

  const playLabel = reducedMotion
    ? 'Alternar entre los extremos'
    : playing
      ? 'Pausar'
      : 'Reproducir el movimiento';

  // ---- PATIENT MODE: one big, plain-language bar (same state as the clinician
  // panel, so entering/leaving keeps the current pose). Rendered by MovementView
  // centered at the bottom; the clinician overlays are hidden while it is on. ----
  if (patientMode) {
    return (
      // Esta SI flota: es la unica pieza sobre el escenario en el modo paciente,
      // asi que lleva superficie. Dentro, ninguna caja: nombre, frase, un boton
      // y la cifra. Las flechas y el boton miden 44 px porque esta barra se usa
      // con la pantalla girada hacia el paciente, muchas veces en una tableta.
      <div className="instrument pointer-events-auto w-[min(94vw,54rem)] px-5 py-4">
        <div className="flex items-center gap-3">
          <IconButton
            onClick={() => goToMovement(-1)}
            label="Ejercicio anterior"
            className="h-11 w-11"
          >
            <ChevronLeftIcon size={18} />
          </IconButton>
          <div className="min-w-0 flex-1 text-center">
            <div className="kicker">{regionName}</div>
            <div className="mt-1.5 truncate font-display text-lg font-semibold text-fg sm:text-2xl">
              {movement?.name}
            </div>
            {movement && (
              <p className="mt-1 text-sm leading-snug text-fg2 sm:text-lg">
                {patientInstruction(movement, regionName)}
              </p>
            )}
          </div>
          <IconButton
            onClick={() => goToMovement(1)}
            label="Siguiente ejercicio"
            className="h-11 w-11"
          >
            <ChevronRightIcon size={18} />
          </IconButton>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!drivable}
            className="btn btn-primary h-11 shrink-0 px-5 text-sm sm:text-base"
          >
            {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            {playing ? 'Pausar' : 'Ver movimiento'}
          </button>
          <input
            type="range"
            min={effMin}
            max={effMax}
            step={1}
            value={sliderVal}
            onChange={onScrub}
            aria-label="Ángulo del movimiento"
            className="range-clinical range-lg flex-1"
            style={{ ['--fill' as string]: fillPct }}
          />
          <span className="readout w-16 shrink-0 text-right text-[1.75rem]">
            {displayAngle}
            <span className="text-base font-medium text-fg3">°</span>
          </span>
        </div>
      </div>
    );
  }

  // EN LA HOJA DEL MOVIL TODO LO QUE SE TOCA MIDE 44 PX. La consola no lo
  // cumplia en ningun mando: las fichas de movimiento median 28 px, los botones
  // de icono 32 y el control segmentado 21. Los mandos son los mismos que en el
  // margen de escritorio; lo que cambia es su alto minimo.
  const touch = inSheet;
  const tap = touch ? 'min-h-[44px]' : '';
  const tabsTap = touch ? '[&_.tab]:min-h-[44px]' : '';

  // ---------------------------------------------------------------------------
  // MOVIMIENTO: todos los arcos de la region, a la vista.
  // ---------------------------------------------------------------------------
  // Premium arcs stay listed with a lock and open pricing when tapped, rather
  // than being hidden.
  const movementSection = (
    <section className={`sec pb-2.5 pt-2.5 ${embedded && !inSheet ? 'lab-moves-sec' : ''}`}>
      <div className="sec-head">
        <span className="kicker">Movimiento</span>
        <span className="sec-rule" />
        {/* El lado va con el movimiento, no con el arco: los dos dicen QUE se
            mueve ("abduccion, derecho"); el arco dice cuanto. El raquis no
            tiene lado y la fila se queda sin el. */}
        {drivable && !isSpine && (
          <div className={tabsTap}>
            <Segmented
              ariaLabel="Lado del cuerpo"
              size="xs"
              value={side}
              onChange={(s) => {
                claimRig();
                setSide(s);
              }}
              options={[
                { value: 'R' as Side, label: SIDE_LABEL.R },
                { value: 'L' as Side, label: SIDE_LABEL.L },
              ]}
            />
          </div>
        )}
      </div>
      {/* DOS COLUMNAS, SIN SCROLL HORIZONTAL. Ver la cabecera del fichero: la
          fila de fichas dejaba fuera 2 de los 6 movimientos de la cadera. Un
          nombre que no cabe en su columna ("Rotacion interna de la tibia")
          parte en dos lineas; no se recorta. */}
      <div
        role="radiogroup"
        aria-label="Movimiento"
        // En la version gratuita la lista NO se pliega: los candados son la
        // forma de ver que hay mas, y esconderlos haria parecer completa la
        // version gratuita.
        className={`grid grid-cols-2 gap-x-3 ${
          embedded && !inSheet && allowedIds == null ? `lab-moves ${movesOpen ? 'is-open' : ''}` : ''
        }`}
      >
        {movements.map((m) => {
          const unavailable = !isDrivable(m.id);
          const locked = isLockedMovement(m.id);
          const active = m.id === movementId;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={unavailable}
              onClick={() => {
                if (unavailable) return;
                if (locked) {
                  labGate.requestUpgrade();
                  return;
                }
                setMovementId(m.id);
              }}
              aria-label={
                unavailable
                  ? `${m.name}, todavía no disponible en el rig`
                  : locked
                    ? `${m.name}, disponible en Premium`
                    : m.name
              }
              className={`opt ${tap} ${locked ? 'text-amber-200/80 hover:text-amber-100' : ''}`}
            >
              <span className="min-w-0">{m.name}</span>
              {locked && <LockGlyph className="shrink-0" />}
            </button>
          );
        })}
        {embedded && !inSheet && allowedIds == null && movements.length > 1 && (
          <button
            type="button"
            onClick={() => setMovesOpen((o) => !o)}
            aria-expanded={movesOpen}
            className="lab-moves-more link-quiet min-h-[26px]"
          >
            {movesOpen ? 'Menos' : `Otros ${movements.length - 1}`}
            <ChevronDownIcon size={12} className={`transition-transform ${movesOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {allowedIds != null && (
        <button
          type="button"
          onClick={labGate.requestUpgrade}
          className={`note note-lock mt-2 block w-full text-left transition-colors hover:text-amber-100 ${tap}`}
        >
          <LockGlyph className="mr-1.5 inline-block align-[-1px]" />
          Versión gratuita con un movimiento de demostración. Premium abre los {drivableCount}{' '}
          arcos de esta región.
        </button>
      )}
    </section>
  );

  // ---------------------------------------------------------------------------
  // ARCO: reproducir + deslizador; debajo, volver a 0, bucle y velocidad.
  // ---------------------------------------------------------------------------
  const arcSection =
    drivable && arc ? (
      <section className="sec pb-2.5">
        <div className="sec-head">
          <span className="kicker">Arco</span>
          <span className="sec-rule" />
          <span className="num text-[11px] text-fg2">
            {Math.round(effMin)}° a {Math.round(effMax)}°
          </span>
        </div>
        {/* REPRODUCIR Y ARRASTRAR SON EL MISMO GESTO, Y VAN EN LA MISMA FILA.
            El boton de reproducir es la accion principal del margen (la unica
            con relleno) y va pegado a lo que mueve. Ademas es lo primero de la
            seccion: en la hoja del movil la franja de 34% deja unos 180 px de
            cuerpo, y con el boton al final de la seccion quedaba bajo el
            pliegue. */}
        <div className="flex items-start gap-2.5">
          <IconButton
            onClick={togglePlay}
            label={playLabel}
            variant="primary"
            className={touch ? 'h-11 w-11' : ''}
          >
            {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
          </IconButton>
          {/* El margen superior centra la pista (22 px de alto) con el boton:
              (32 - 22) / 2 en el margen, (44 - 22) / 2 en la hoja. */}
          <div className={`relative min-w-0 flex-1 pb-1.5 ${touch ? 'mt-[11px]' : 'mt-[5px]'}`}>
            <input
              id="mov-angle"
              type="range"
              min={effMin}
              max={effMax}
              step={1}
              value={sliderVal}
              onChange={onScrub}
              aria-label="Ángulo del movimiento"
              className="range-clinical block"
              style={{ ['--fill' as string]: fillPct }}
            />
            {neutralPct != null && (
              <span
                className="pointer-events-none absolute top-[8px] flex -translate-x-1/2 flex-col items-center"
                style={{ left: neutralMarkLeft(neutralPct) }}
                aria-hidden="true"
              >
                <span className="h-1.5 w-px bg-fg2" />
                <span className="num mt-0.5 text-[9px] leading-none text-fg3">0</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center gap-1">
          {/* "0°" escrito, no solo el icono: la aguja sobre la marca es un
              dibujo propio de esta aplicacion y nadie lo trae aprendido. */}
          <button
            type="button"
            onClick={returnToNeutral}
            aria-label="Volver a la posición neutra"
            title="Volver a la posición neutra"
            className={`btn btn-quiet btn-sm -ml-2 ${tap}`}
          >
            <NeutralIcon size={14} />
            <span className="num">0°</span>
          </button>
          {!reducedMotion && (
            <>
              <button
                type="button"
                onClick={() => setLoop((l) => !l)}
                aria-pressed={loop}
                aria-label={loop ? 'Bucle activado' : 'Bucle desactivado'}
                title={loop ? 'Bucle activado' : 'Bucle desactivado'}
                className={`btn btn-quiet btn-sm ${loop ? 'text-brand' : ''} ${tap}`}
              >
                <LoopIcon size={14} />
                Bucle
              </button>
              <div className={`ml-auto ${tabsTap}`}>
                <Segmented
                  ariaLabel="Velocidad de reproducción"
                  size="xs"
                  value={speedIdx}
                  onChange={setSpeedIdx}
                  options={SPEEDS.map((s, i) => ({ value: i, label: s.label }))}
                />
              </div>
            </>
          )}
        </div>

        {tinyArc && (
          <p className="note mt-2">
            Arco real de {Math.round(span)}°. Que el modelo apenas se mueva no es un fallo del
            visor: este movimiento casi no existe en el cuerpo.
          </p>
        )}

        {/* The arc above is a REFERENCE range, a textbook convention, and
            the conventions disagree. Showing the measured population value
            next to it is the same rule the orthopedic tests follow here:
            a number never appears without the study behind it. */}
        {measured && (
          <p className="num mt-2 text-[10px] leading-relaxed text-fg3">
            Medido {measured.meanDeg}°
            {measured.sdDeg != null ? ` ± ${measured.sdDeg}` : ''} ({measured.motion},{' '}
            {measured.sample})
            {measured.aaosDeg != null ? ` · AAOS ${measured.aaosDeg}°` : ''}
            {measuredSource ? ` · ${measuredSource}` : ''}
          </p>
        )}

        {reducedMotion && (
          <p className="mt-2 text-[11px] text-fg3">
            Animación reducida por preferencia del sistema.
          </p>
        )}
      </section>
    ) : null;

  // ---------------------------------------------------------------------------
  // EL ARCO EN EL MARGEN DE ESCRITORIO (rediseño de noviembre de 2026).
  // ---------------------------------------------------------------------------
  // Sin la cabecera "ARCO −30° a 180°": el arco ya lo dicen la regla del
  // escenario y la propia pista. La fila es la REJILLA DEL EJE (`.lab-axis`):
  // reproducir | pista | angulo, la misma que usan las tiras de los musculos del
  // margen, asi que la pista y las tiras miden lo mismo y el cursor de cada
  // tira cae encima del pulgar. Bajo la pista, la marca del 0 y la franja de lo
  // MEDIDO (media ± DE del estudio). La hoja del movil sigue con su arco de
  // siempre (`arcSection`).
  const arcMargin =
    drivable && arc ? (
      <section className="px-4 pb-1.5 pt-2.5">
        <div className="lab-axis">
          <IconButton onClick={togglePlay} label={playLabel} variant="primary">
            {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
          </IconButton>
          <div className="relative h-8">
            <input
              id="mov-angle"
              type="range"
              min={effMin}
              max={effMax}
              step={1}
              value={sliderVal}
              onChange={onScrub}
              onPointerDown={() => setDragging(true)}
              aria-label="Ángulo del movimiento"
              className="range-clinical absolute inset-x-0 top-[5px] block"
              style={{ ['--fill' as string]: fillPct }}
            />
            {band && (
              <>
                <span
                  className="pointer-events-none absolute top-[23px] h-[2px] bg-fg2/55"
                  style={{ left: band.left, width: band.width }}
                  aria-hidden="true"
                />
                {band.mean && (
                  <span
                    className="pointer-events-none absolute top-[21px] h-[6px] w-px -translate-x-1/2 bg-fg"
                    style={{ left: band.mean }}
                    aria-hidden="true"
                  />
                )}
              </>
            )}
            {neutralPct != null && (
              <span
                className="pointer-events-none absolute top-[21px] flex -translate-x-1/2 flex-col items-center"
                style={{ left: neutralMarkLeft(neutralPct) }}
                aria-hidden="true"
              >
                <span className="h-[5px] w-px bg-fg2" />
                <span className="num mt-px text-[11px] leading-none text-fg3">0</span>
              </span>
            )}
            {/* EL TOPE DEL CUADRO: con el hombro congelado la pista acaba en
                115°, y sin decirlo parece que el gesto llega a su final. */}
            {cap != null && arc && cap < arc.max && (
              <span
                className="pointer-events-none absolute top-[21px] flex -translate-x-1/2 flex-col items-center"
                style={{ left: axisLeft(effMax, effMin, effMax) }}
                aria-hidden="true"
              >
                <span className="h-[5px] w-px bg-amber-300" />
                <span className="num mt-px text-[11px] leading-none text-amber-200">{Math.round(effMax)}</span>
              </span>
            )}
          </div>
          <span className="num text-right text-[13px] font-medium text-fg">
            {grados(displayAngle)}°
          </span>
        </div>

        {/* LO MEDIDO: la cifra de la poblacion, siempre con su estudio. Una
            linea; la muestra y la AAOS, al pulsarla. */}
        {measured && (
          <>
            <button
              type="button"
              onClick={() => setMeasuredOpen((o) => !o)}
              aria-expanded={measuredOpen}
              className="group mt-2 flex w-full items-center gap-2 text-left text-xs leading-snug"
            >
              {band && <span aria-hidden="true" className="h-[2px] w-3.5 shrink-0 bg-fg2/55" />}
              <span className="min-w-0 flex-1 truncate">
                <span className="text-fg2 transition-colors group-hover:text-fg">Medido</span>{' '}
                <span className="num text-fg">
                  {coma(measured.meanDeg)}°
                  {measured.sdDeg != null ? ` ± ${coma(measured.sdDeg)}°` : ''}
                </span>
                {measuredSource ? <span className="text-fg3"> · {measuredSource}</span> : null}
              </span>
              <ChevronDownIcon
                size={12}
                className={`shrink-0 text-fg3 transition-transform ${measuredOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {measuredOpen && (
              <p className="mt-1 text-xs leading-snug text-fg2">
                Medición {measured.motion}, en {measured.sample}.
                {measured.aaosDeg != null ? ` La AAOS da ${measured.aaosDeg}°.` : ''}
                {measuredSource ? ` ${measuredSource}.` : ''}
              </p>
            )}
          </>
        )}

        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={returnToNeutral}
            aria-label="Volver a la posición neutra"
            title="Volver a la posición neutra"
            className="btn btn-quiet btn-sm -ml-2"
          >
            <NeutralIcon size={14} />
            <span className="num">0°</span>
          </button>
          {!reducedMotion && (
            <>
              <button
                type="button"
                onClick={() => setLoop((l) => !l)}
                aria-pressed={loop}
                aria-label={loop ? 'Bucle activado' : 'Bucle desactivado'}
                title={loop ? 'Bucle activado' : 'Bucle desactivado'}
                className={`btn btn-quiet btn-sm ${loop ? 'text-brand' : ''}`}
              >
                <LoopIcon size={14} />
                Bucle
              </button>
              <div className="ml-auto">
                <Segmented
                  ariaLabel="Velocidad de reproducción"
                  size="xs"
                  value={speedIdx}
                  onChange={setSpeedIdx}
                  options={SPEEDS.map((s, i) => ({ value: i, label: s.label }))}
                />
              </div>
            </>
          )}
        </div>

        {tinyArc && (
          <p className="note mt-2">
            Arco real de {Math.round(span)}°. Que el modelo apenas se mueva no es un fallo del
            visor: este movimiento casi no existe en el cuerpo.
          </p>
        )}
        {reducedMotion && (
          <p className="mt-2 text-[11px] text-fg3">Animación reducida por preferencia del sistema.</p>
        )}
      </section>
    ) : null;

  // ---------------------------------------------------------------------------
  // ESTADO CLINICO: los cuadros patologicos de ESTE movimiento.
  // ---------------------------------------------------------------------------
  // Plegada dice el estado actual; abierta, cada cuadro lleva escrito lo que
  // altera (ver `pathologyEffect`). Los bloqueados no se esconden: siguen en la
  // lista con su candado y abren precios.
  const clinicalSection =
    drivable && arc && supportsPathology ? (
      <section className="sec pb-2.5">
        <button
          type="button"
          onClick={() => setClinicalOpen((o) => !o)}
          aria-expanded={clinicalOpen}
          className={`sec-head group w-full text-left ${clinicalOpen ? '' : 'mb-0'} ${tap}`}
        >
          <span className="kicker transition-colors group-hover:text-fg2">Estado clínico</span>
          <span className="sec-rule" />
          <span
            className={`shrink-0 text-xs font-medium ${pathology ? 'text-amber-200' : 'text-fg2'}`}
          >
            {pathology ? pathology.chip : 'Normal'}
          </span>
          {!pathologyGate.unlocked && <LockGlyph className="shrink-0 text-amber-300" />}
          <ChevronDownIcon
            size={13}
            className={`shrink-0 text-fg3 transition-transform ${clinicalOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {clinicalOpen && (
          <div ref={clinicalRef}>
            {/* WHAT PICKING ONE DOES, at the point of picking. The row
                was a set of chips with no statement of consequence, and
                the explanation only appeared in the readout AFTER a
                pathology was already active -- "no entiendo las
                patologías en el modelo 3D". */}
            <p className="text-[11px] leading-snug text-fg3">
              Elige un cuadro y el modelo lo reproduce:{' '}
              <span className="text-fg2">
                lo que altera del movimiento va escrito bajo su nombre
              </span>
              , y las estructuras implicadas se marcan en la escena.
            </p>
            <div role="radiogroup" aria-label="Estado clínico" className="mt-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={pathologyId === null}
                onClick={() => {
                  claimRig();
                  setPathologyId(null);
                }}
                className={`opt ${tap}`}
              >
                Normal
              </button>
              {pathologyOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={pathologyGate.unlocked && pathologyId === p.id}
                  onClick={
                    pathologyGate.unlocked
                      ? () => {
                          claimRig();
                          setPathologyId(p.id);
                        }
                      : pathologyGate.requestUpgrade
                  }
                  className={`opt ${tap} ${
                    pathologyGate.unlocked ? '' : 'text-amber-200/80 hover:text-amber-100'
                  }`}
                >
                  <span className="min-w-0 flex-1 py-0.5">
                    <span className="block">{p.name}</span>
                    <span className="tag mt-0.5 block font-normal">{pathologyEffect(p, arc)}</span>
                  </span>
                  {!pathologyGate.unlocked && <LockGlyph className="shrink-0" />}
                </button>
              ))}
            </div>
            {pathology && <p className="note note-warn mt-2">{pathology.summary}</p>}
          </div>
        )}
      </section>
    ) : null;

  // ---------------------------------------------------------------------------
  // EL PIE DEL MARGEN DE ESCRITORIO: tres ajustes de sesion en tres columnas,
  // el rotulo encima del valor. Estado clinico y ficha abren un menu FLOTANTE
  // hacia arriba (`.instrument`, la unica superficie que LAMINA permite): los
  // cajones en el flujo empujaban la lectura de arriba y, en una ventana de 768,
  // se abrian por debajo del pliegue. Uno abierto como mucho; Esc o un clic
  // fuera lo cierran. La hoja del movil conserva sus cajones.
  // ---------------------------------------------------------------------------
  const footMargin = drivable ? (
    <>
      <div className="rule" />
      <div ref={footRef} className="relative flex items-stretch px-4 pb-2.5 pt-2">
        {/* La columna esta SIEMPRE, aunque el gesto no tenga cuadros: asi los
            filos no se mueven al cambiar de movimiento. */}
        {!(supportsPathology && arc) && (
          <>
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              <span className="kicker">Estado clínico</span>
              <span className="text-[13px] font-medium text-fg3">Sin cuadros</span>
            </div>
            <span className="mx-auto w-px shrink-0 bg-line" aria-hidden="true" />
          </>
        )}
        {supportsPathology && arc && (
          <>
            <button
              type="button"
              onClick={() => setFootMenu((m) => (m === 'clinico' ? null : 'clinico'))}
              aria-expanded={footMenu === 'clinico'}
              aria-haspopup="true"
              className="group flex min-w-0 flex-col items-start gap-1.5 text-left"
            >
              <span className="kicker transition-colors group-hover:text-fg2">Estado clínico</span>
              <span
                className={`inline-flex min-w-0 items-center gap-1.5 text-[13px] font-medium ${
                  pathology ? 'text-amber-200' : 'text-fg'
                }`}
              >
                <span className="truncate">{pathology ? pathology.chip : 'Normal'}</span>
                {!pathologyGate.unlocked && <LockGlyph className="shrink-0 text-amber-300" />}
                <ChevronDownIcon
                  size={12}
                  className={`shrink-0 text-fg3 transition-transform ${footMenu === 'clinico' ? '' : 'rotate-180'}`}
                />
              </span>
            </button>
            <span className="mx-auto w-px shrink-0 bg-line" aria-hidden="true" />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            if (!cardGate.unlocked) {
              cardGate.requestUpgrade();
              return;
            }
            setFootMenu((m) => (m === 'ficha' ? null : 'ficha'));
          }}
          aria-expanded={cardGate.unlocked ? footMenu === 'ficha' : undefined}
          aria-haspopup={cardGate.unlocked ? 'true' : undefined}
          title={cardGate.unlocked ? undefined : 'Ficha en PNG para el paciente: disponible en Premium'}
          className="group flex min-w-0 flex-col items-start gap-1.5 text-left"
        >
          <span className="kicker transition-colors group-hover:text-fg2">Paciente</span>
          <span
            className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${
              cardGate.unlocked ? 'text-fg' : 'text-amber-200/85'
            }`}
          >
            <DownloadIcon size={13} className="shrink-0" />
            Ficha
            {cardGate.unlocked ? (
              <ChevronDownIcon
                size={12}
                className={`shrink-0 text-fg3 transition-transform ${footMenu === 'ficha' ? '' : 'rotate-180'}`}
              />
            ) : (
              <LockGlyph className="shrink-0" />
            )}
          </span>
        </button>
        <span className="mx-auto w-px shrink-0 bg-line" aria-hidden="true" />
        <div className="flex flex-col items-start gap-1.5">
          <span className="kicker">Arco 3D</span>
          <button
            type="button"
            role="switch"
            aria-checked={showMarkers}
            aria-label="Arco 3D: el recorrido y los marcadores dibujados sobre el modelo"
            title="Dibuja el recorrido y los marcadores sobre el modelo"
            onClick={() => setShowMarkers((v) => !v)}
            className="lab-switch"
          />
        </div>

        {footMenu === 'clinico' && arc && (
          <div role="dialog" aria-label="Estado clínico" className="instrument lab-menu">
            <p className="mb-1.5 text-xs leading-snug text-fg3">
              Elige un cuadro y el modelo lo reproduce:{' '}
              <span className="text-fg2">lo que altera del movimiento va escrito bajo su nombre</span>, y las
              estructuras implicadas se marcan en la escena.
            </p>
            <div role="radiogroup" aria-label="Estado clínico">
              <button
                type="button"
                role="radio"
                aria-checked={pathologyId === null}
                onClick={() => {
                  claimRig();
                  setPathologyId(null);
                  setFootMenu(null);
                }}
                className="opt"
              >
                Normal
              </button>
              {pathologyOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={pathologyGate.unlocked && pathologyId === p.id}
                  onClick={
                    pathologyGate.unlocked
                      ? () => {
                          claimRig();
                          setPathologyId(p.id);
                          setFootMenu(null);
                        }
                      : pathologyGate.requestUpgrade
                  }
                  className={`opt ${pathologyGate.unlocked ? '' : 'text-amber-200/80 hover:text-amber-100'}`}
                >
                  <span className="min-w-0 flex-1 py-0.5">
                    <span className="block">{p.name}</span>
                    <span className="tag mt-0.5 block font-normal">{pathologyEffect(p, arc)}</span>
                  </span>
                  {!pathologyGate.unlocked && <LockGlyph className="shrink-0" />}
                </button>
              ))}
            </div>
            {pathology && <p className="note note-warn mt-2">{pathology.summary}</p>}
          </div>
        )}

        {footMenu === 'ficha' && cardGate.unlocked && (
          <div role="dialog" aria-label="Ficha para el paciente" className="instrument lab-menu">
            <p className="text-xs leading-snug text-fg2">
              Genera una <span className="text-fg">ficha en PNG para el paciente</span>: una foto de la
              postura actual del modelo, el movimiento y su rango, los músculos que trabajan y tu nota,
              en lenguaje llano. Para imprimir o mandar. Se crea en tu equipo y no sale nada a internet.
            </p>
            <textarea
              id="patient-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              aria-label="Nota para el paciente"
              placeholder="Nota opcional. Por ejemplo: 3 series de 10, dos veces al día, sin dolor."
              className="field mt-2 block h-auto resize-none py-1.5 text-xs leading-snug"
            />
            <button
              type="button"
              onClick={onExport}
              disabled={exporting || !movement}
              className="btn btn-line mt-2.5 w-full"
            >
              <DownloadIcon size={13} />
              {exporting ? 'Generando la imagen' : 'Descargar la ficha en PNG'}
            </button>
            {exportMsg && (
              <p role="status" className="mt-1.5 text-center text-[11px] text-fg2">
                {exportMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  ) : null;

  return (
    <div className={`pointer-events-auto w-full ${embedded ? '' : 'instrument overflow-hidden'}`}>
      {/* HEADER. Doubles as the collapse handle on phones. Embedded, it only
          exists below `sm`, where the readout above is hidden and this line is
          the panel's only identity. */}
      <div
        className={`flex items-start gap-3 px-4 pt-3.5 pb-1 ${
          embedded && !inSheet ? 'sm:hidden' : ''
        }`}
      >
        {inSheet ? (
          // En la hoja no hay nada que plegar (el plegado es el de la hoja), asi
          // que el titulo no es un boton: lo era, y no hacia nada al pulsarlo.
          <div className="min-w-0 flex-1">
            <span className="kicker block truncate">
              {regionName || 'Laboratorio'}
              {movement?.plane ? `, plano ${movement.plane.toLowerCase()}` : ''}
            </span>
            <h2 className="mt-1.5 truncate font-display text-[15px] font-semibold leading-tight text-fg">
              {gestureName ?? 'Selecciona un movimiento'}
            </h2>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="min-w-0 flex-1 text-left lg:pointer-events-none"
          >
            <span className="kicker block truncate">
              {regionName || 'Laboratorio'}
              {movement?.plane ? `, plano ${movement.plane.toLowerCase()}` : ''}
            </span>
            <h2 className="mt-1.5 truncate font-display text-[15px] font-semibold leading-tight text-fg">
              {gestureName ?? 'Selecciona un movimiento'}
            </h2>
          </button>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {drivable && (
            <span className="readout text-[26px]">
              {displayAngle}
              <span className="text-base font-medium text-fg3">°</span>
            </span>
          )}
          {!inSheet && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expandir panel' : 'Colapsar panel'}
              aria-expanded={!collapsed}
              className="btn btn-quiet btn-icon btn-sm -mr-1 ml-1 lg:hidden"
            >
              <ChevronDownIcon size={14} className={collapsed ? '-rotate-90' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Transport stays reachable while collapsed on phones, so the movement can
          run with the model in full view. */}
      {collapsed && drivable && (
        <div className="flex items-center gap-2 px-4 pb-3 lg:hidden">
          <IconButton onClick={togglePlay} label={playLabel} variant="primary">
            {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
          </IconButton>
          <input
            type="range"
            min={effMin}
            max={effMax}
            step={1}
            value={sliderVal}
            onChange={onScrub}
            aria-label="Ángulo del movimiento"
            className="range-clinical flex-1"
            style={{ ['--fill' as string]: fillPct }}
          />
        </div>
      )}

      <div
        // EL ALTO DE LA CONSOLA, POR ARITMETICA.
        //
        // La consola comparte columna con la lectura de arriba y es ella la que
        // no encoge (MovementView), asi que su tope decide cuanto le queda a la
        // lectura. El tope eran 34/36vh: a 768 px, 276 px. Con los movimientos
        // en lista ya no cabe ahi (la consola en reposo mide unos 330 px con
        // cuatro arcos y 360 con los seis de la cadera), y cortarla habria
        // escondido el pie.
        //
        // Lo que NO puede perderse de la lectura es su parte fija --cabecera,
        // goniometro, fase y musculo protagonista, mas el aviso de que es un
        // modelo--, que mide 226 px en una ventana baja (el desglose esta en
        // RhythmReadout). Encima de la columna hay 66 px de aplicacion: la
        // barra (44) y la linea del aviso educativo (22). Asi que el tope es
        //
        //     100vh - 66 - 1 (el filo) - 226 - 3 de holgura = 100vh - 18.5rem
        //
        // A 1366x768 y a 1024x768 son 472 px: la consola entera cabe sin
        // scroll en las ocho regiones, y a la lectura le quedan entre 310 y
        // 370 px. En un portatil de 768 con las barras del navegador (unos 650
        // de ventana) el tope son 354: la consola de cuatro arcos (330) sigue
        // entera y la lectura conserva justo su parte fija. Por debajo de eso
        // la consola se desplaza por dentro, y lo primero que deja de verse es
        // el pie, nunca el boton de reproducir, que es lo primero del arco.
        // El suelo de 12rem es para que una ventana absurda no la deje en cero.
        className={
          inSheet
            ? 'block'
            : embedded
              ? // Sin desplazamiento propio: un menu flotante del pie quedaria
                // recortado por el. La consola del margen mide lo que mide.
                `${collapsed ? 'hidden' : 'block'} sm:block`
              : `${collapsed ? 'hidden' : 'block'} overflow-y-auto overscroll-contain max-h-[34vh] sm:max-h-[36vh] lg:block`
        }
      >
        {/* EN LA HOJA, EL ARCO VA PRIMERO. La franja de la hoja (34% del alto)
            deja ver unos 180 px bajo las pestanas: lo justo para la cabecera y
            una seccion. Con los movimientos delante, lo que se veia era la
            lista y el boton de reproducir quedaba bajo el pliegue; con el arco
            delante se puede mover la articulacion sin ampliar la hoja, y la
            lista asoma debajo. En el margen de escritorio todo cabe y el orden
            es el de uso: que se mueve, y luego cuanto. */}
        {inSheet ? (
          <>
            {arcSection}
            {movementSection}
          </>
        ) : (
          <>
            {movementSlot ? createPortal(movementSection, movementSlot) : movementSection}
            {/* Unsupported movement notice */}
            {control?.kind === 'unsupported' && (
              <section className="sec pb-2.5">
                <p className="note note-warn">{control.reason}</p>
              </section>
            )}
            {embedded ? arcMargin : arcSection}
          </>
        )}
        {inSheet && control?.kind === 'unsupported' && (
          <section className="sec pb-2.5">
            <p className="note note-warn">{control.reason}</p>
          </section>
        )}

        {embedded && !inSheet ? footMargin : clinicalSection}

        {/* PIE. Lo que se pone una vez por sesion: la ficha que se lleva el
            paciente y el arco dibujado sobre el modelo. El interruptor estaba
            dentro de un cajon "Ajustes"; cabe a la vista, asi que esta a la
            vista. (En el margen de escritorio, `footMargin`, arriba.) */}
        {drivable && !(embedded && !inSheet) && (
          <>
            <div className="rule" />
            <div className="px-4 py-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!cardGate.unlocked) {
                      cardGate.requestUpgrade();
                      return;
                    }
                    setExportOpen((o) => !o);
                  }}
                  aria-expanded={cardGate.unlocked ? exportOpen : undefined}
                  title={
                    cardGate.unlocked
                      ? undefined
                      : 'Ficha en PNG para el paciente: disponible en Premium'
                  }
                  className={`flex min-h-[28px] min-w-0 flex-1 items-center gap-2 text-left text-xs font-medium transition-colors ${
                    cardGate.unlocked
                      ? 'text-fg2 hover:text-fg'
                      : 'text-amber-200/85 hover:text-amber-100'
                  } ${tap}`}
                >
                  <DownloadIcon size={13} className="hidden shrink-0 xl:block" />
                  <span className="truncate">Ficha para el paciente</span>
                  {cardGate.unlocked ? (
                    <ChevronDownIcon
                      size={13}
                      className={`shrink-0 text-fg3 transition-transform ${exportOpen ? 'rotate-180' : ''}`}
                    />
                  ) : (
                    <LockGlyph className="shrink-0" />
                  )}
                </button>
                <span className="h-4 w-px shrink-0 bg-line" aria-hidden="true" />
                <div
                  className={`w-[5.5rem] shrink-0 ${touch ? '[&>button]:min-h-[44px]' : ''}`}
                  title="Dibuja el recorrido y los marcadores sobre el modelo"
                >
                  <Switch
                    checked={showMarkers}
                    onChange={() => setShowMarkers((v) => !v)}
                    label="Arco 3D"
                  />
                </div>
              </div>

              {exportOpen && cardGate.unlocked && (
                <div ref={exportRef} className="pb-2">
                  {/* WHAT THIS PRODUCES, before you produce it. The row said only
                      "Exportar" and the panel jumped straight to a note field and
                      a download button, so what the feature was for had to be
                      inferred from a placeholder -- "no entiendo el modo
                      paciente". */}
                  <p className="note mt-1">
                    Genera una <span className="text-fg">ficha en PNG para el paciente</span>: una
                    foto de la postura actual del modelo, el movimiento y su rango, los músculos
                    que trabajan y tu nota, en lenguaje llano. Para imprimir o mandar. Se crea en
                    tu equipo y no sale nada a internet.
                  </p>
                  <textarea
                    id="patient-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    aria-label="Nota para el paciente"
                    placeholder="Nota opcional. Por ejemplo: 3 series de 10, dos veces al día, sin dolor."
                    className="field mt-2 block h-auto resize-none py-1.5 text-xs leading-snug"
                  />
                  <button
                    type="button"
                    onClick={onExport}
                    disabled={exporting || !movement}
                    className={`btn btn-line mt-2.5 w-full ${tap}`}
                  >
                    <DownloadIcon size={13} />
                    {exporting ? 'Generando la imagen' : 'Descargar la ficha en PNG'}
                  </button>
                  {exportMsg && (
                    <p role="status" className="mt-1.5 text-center text-[11px] text-fg2">
                      {exportMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
