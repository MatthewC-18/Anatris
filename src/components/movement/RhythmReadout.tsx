// src/components/movement/RhythmReadout.tsx
//
// EL CENTRO DEL MARGEN IZQUIERDO DEL LABORATORIO: lo que el escenario no dice.
//
// El escenario ya lee el gesto (StageReadout: el angulo en grande, la fase y su
// tramo, la regla del arco; LabCallouts: los musculos con su porcentaje). Esto
// cuenta el PORQUE, una idea cada vez (rediseño de noviembre de 2026; antes era
// un goniometro, un protagonista, un parrafo de ocho lineas y una lista de diez
// musculos, y el usuario lo veia "aglomerado"):
//
//   - la postura de exploracion, plegada en una linea, cuando el gesto no sale
//     del cero anatomico;
//   - el paginador de fases y la FRASE de la fase (LabMarginParts);
//   - el aviso del cuadro clinico activo;
//   - el ritmo escapulohumeral en una barra, o su equivalente en la rodilla, el
//     cuello y el tronco, con el detalle detras de un toque;
//   - QUIEN LO HACE: tres musculos con la curva de todo el arco (LabTrio).
//
// Durante un demo (test o miotoma) el angulo barre y todo lo de por grado
// parpadearia: el centro pasa a la ficha FIJA de la maniobra.
//
// SOLO LEE: se suscribe al mismo rigChannel que mueve la consola y recalcula con
// las mismas funciones puras (shoulderChain, romActivation, romPhaseAtAngle),
// asi que no inventa nada ni se separa del brillo del modelo.
//
// Sistema LAMINA (docs/sistema-lamina.md): ni una caja. UI en espanol; codigo e
// ids en ASCII; sin `any`.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { rigChannel, type RigCommand, type RigDemoInfo } from './RigModel';
import { movementById } from '../../data/romByRegion';
import { getBoneControl, rigSideFor } from '../../lib/boneMap';
import { shoulderChain } from '../../lib/biomech/shoulderChain';
import { kneeScrewHome, type ScrewHomeZone } from '../../lib/biomech/kneeCoupling';
import { cervicalRotationSplit } from '../../lib/biomech/cervicalCoupling';
import { lumbopelvicRhythm, LUMBOPELVIC_PELVIS_POSED } from '../../lib/biomech/lumbarCoupling';
import { buildLabArc, phaseAtAngleIn, muscleNameById } from '../../lib/romPhaseAtAngle';
import { getReference } from '../../data/references';
import type { Citation } from '../../types/muscleContent';
import { pathologyById } from '../../data/pathologies';
import { musclesForRomLookup } from '../../data/musclesByRegion';
import { dissectChannel, type DissectState } from './dissectChannel';
import { ChevronDownIcon } from '../ui/Icons';
import { LabTrio, PhasePager, PhaseStack } from './LabMarginParts';
import { effectiveArc } from '../../lib/labArc';

/**
 * QUE ROTULA LA TARJETA DE UN DEMO: UNA POSICION O UN RECORRIDO.
 *
 * Casi todas las maniobras salen del reposo, llegan a una posicion y la
 * sostienen: lo que hay que leer es ESA posicion ("Posicion de prueba 90°").
 *
 * En un arco compartido no. En el codo y en la rodilla la flexion y la
 * extension recorren un solo arco (`arcFrom: 'max'` en boneMap): 0° es la
 * articulacion estirada, la extension ABRE doblada y vuelve hacia 0. La tarjeta
 * rotulaba un solo numero, y era cualquiera de los dos extremos segun quien la
 * rellenara: el panel de tests manda la posicion que se sostiene (0) y el
 * neurologico el extremo doblado (120 en el miotoma C7, 90 en L3). O sea
 * "Posicion de prueba 0°" sobre un codo que se ve doblarse 10 grados, o
 * "Posicion de prueba 120°" sobre uno que se para a proposito en 0. Lo que
 * pasa es un RECORRIDO, y se rotula como tal: "120° → 0°".
 *
 * `peakDeg` es el angulo mas alto que el demo ha mandado al rig, que es su
 * extremo doblado; `targetDeg` cubre el primer fotograma del panel neurologico,
 * que abre en 0 y salta al extremo en el siguiente. Con animacion reducida el
 * panel de tests no recorre nada (pone el 0 y lo deja): ahi sigue siendo una
 * posicion.
 */
export function demoArcReading(
  sharedArc: boolean,
  peakDeg: number,
  targetDeg: number,
): { kicker: string; value: string } {
  if (sharedArc) {
    const from = Math.round(Math.max(peakDeg, targetDeg));
    if (from > 0) return { kicker: 'Recorrido de prueba', value: `${from}° → 0°` };
    return { kicker: 'Posición de prueba', value: '0°' };
  }
  return { kicker: 'Posición de prueba', value: `${grados(targetDeg)}°` };
}

/** "-30" con el signo menos tipografico, como en la lectura del escenario. */
function grados(n: number): string {
  const r = Math.round(n);
  return r < 0 ? `−${Math.abs(r)}` : String(r);
}

// Knee screw-home zones: label + clinical note. The zone is a WORD; the bar
// carries the degrees.
const SCREW_ZONE: Record<ScrewHomeZone, { label: string; note: string }> = {
  locked: {
    label: 'Bloqueada',
    note: 'Rotación externa tibial máxima: los cruzados se tensan y bloquean la rodilla (bipedestación casi sin esfuerzo muscular).',
  },
  unlocking: {
    label: 'Desbloqueando',
    note: 'El poplíteo rota la tibia internamente y deshace el tornillo para que arranque la flexión.',
  },
  free: {
    label: 'Libre',
    note: 'Pasados los ~30°, el tornillo ya está deshecho: la rotación acoplada es mínima y la rotación tibial pasa a ser voluntaria.',
  },
};

/** Short source label from a phase's citations, e.g. "Kapandji, Oatis". Dedups
 *  and takes the lead surname so the section can name its source honestly
 *  without a full Vancouver string. */
function citeLabel(cites: Citation[]): string {
  const names: string[] = [];
  for (const c of cites) {
    const ref = getReference(c.ref);
    const name = ref ? ref.authors.split(/[ ,]/)[0] : c.ref;
    if (!names.includes(name)) names.push(name);
  }
  return names.join(', ');
}

// LOS TONOS DE UN REPARTO. Una barra partida necesita distinguir sus tramos, no
// decir nada con el color: el acento para el primero y dos grises para los
// demas. Eran cian, ambar y esmeralda, y el ambar es justo el tono del MOTOR
// PRINCIPAL en la lista de reclutamiento que va debajo: la escapula y el
// deltoides compartian color sin tener nada que ver.
const SPLIT_TONE = [
  'rgb(var(--c-brand))',
  'rgb(var(--c-fg) / 0.82)',
  'rgb(var(--c-fg3))',
] as const;

interface RhythmReadoutProps {
  region: string | null;
  /**
   * True when this readout is the middle of the left margin (the console is the
   * bottom section): it fills the height the console leaves.
   */
  embedded?: boolean;
}

export function RhythmReadout({ region, embedded = false }: RhythmReadoutProps) {
  const [cmd, setCmd] = useState<
    Pick<RigCommand, 'movementId' | 'side' | 'angleDeg' | 'pathologyId' | 'demo'>
  >(() => {
    const c = rigChannel.get();
    return {
      movementId: c.movementId,
      side: c.side,
      angleDeg: c.angleDeg,
      pathologyId: c.pathologyId ?? null,
      demo: c.demo ?? null,
    };
  });
  useEffect(() => {
    return rigChannel.subscribe((c) =>
      setCmd((prev) =>
        prev.movementId === c.movementId &&
        prev.side === c.side &&
        prev.angleDeg === c.angleDeg &&
        (prev.pathologyId ?? null) === (c.pathologyId ?? null) &&
        (prev.demo ?? null) === (c.demo ?? null)
          ? prev
          : {
              movementId: c.movementId,
              side: c.side,
              angleDeg: c.angleDeg,
              pathologyId: c.pathologyId ?? null,
              demo: c.demo ?? null,
            },
      ),
    );
  }, []);

  const [dissect, setDissect] = useState<DissectState>(() => dissectChannel.get());
  useEffect(() => dissectChannel.subscribe(setDissect), []);

  const movement = useMemo(() => movementById(cmd.movementId), [cmd.movementId]);
  const control = cmd.movementId ? getBoneControl(cmd.movementId) : undefined;
  const drivable = !!movement && !!control && control.kind !== 'unsupported';
  const isChain = control?.kind === 'chain';
  // Why the model is not standing at anatomical zero. Shoulder rotation opens
  // with the elbow at 90 because that is the position it is READ in, and a user
  // who is not told that just sees a bent elbow they did not ask for.
  //
  // ALL of them, not just the first. Pronosupination holds two -- the elbow at
  // 90 and the forearm in neutral -- and showing only the first left the more
  // surprising half unexplained: a hand opening on edge rather than palm up.
  const examPostures = control?.kind === 'joint' ? (control.posture ?? []) : [];
  const arc = useMemo(() => (movement ? buildLabArc(movement) : null), [movement]);
  const muscleRegion = movement?.region ?? region ?? 'shoulder';
  const angle = cmd.angleDeg;
  // P1: active pathological preset (null = Normal). Alters the rhythm below.
  const pathology = pathologyById(cmd.pathologyId);

  const at = arc ? phaseAtAngleIn(arc.phases, angle) : null;

  // Humero-escapulo-raquideo split (cumulative at the current angle). Only the
  // shoulder elevation chain decomposes this, and only above neutral.
  const rhythm = useMemo(() => {
    if (!isChain || angle <= 0) return null;
    // EL TRONCO SOLO PARTICIPA DONDE EL RIG LO MUEVE. La abduccion toma prestada
    // una inclinacion contralateral del raquis; la flexion no, y su control no
    // tiene objetivos en el raquis. Se lee del propio mapa en vez de nombrar el
    // movimiento, para que anadir una elevacion no vuelva a desincronizar el
    // reparto publicado de lo que el hueso hace.
    const opts = {
      trunkLean:
        (control as { targets?: { target: { armature: string } }[] } | null | undefined)
          ?.targets?.some((t) => t.target.armature === 'spine') ?? false,
    };
    const r = shoulderChain(angle, rigSideFor(cmd.side), pathology?.shoulderMod, opts).readout;
    const gh = Math.max(0, r.ghDeg);
    const sc = Math.max(0, r.scapulaDeg);
    const tr = Math.max(0, r.trunkDeg);
    const total = gh + sc + tr;
    if (total <= 0) return null;
    // When a pathology is active, keep the NORMAL ratio at this angle as a
    // reference so the alteration reads as "X:1 vs normal Y:1".
    const normalRatio = pathology
      ? shoulderChain(angle, rigSideFor(cmd.side), undefined, opts).readout.ratio
      : null;
    // WHERE THE SCAPULAR SHARE COMES FROM. The blade does not turn on the chest:
    // it turns because the clavicle elevates at the sternoclavicular joint AND the
    // blade turns on the clavicle at the acromioclavicular. Splitting the girdle
    // was what fixed the rig ("no se mueve en conjunto"), and the same two numbers
    // are the biomechanics a physio wants to read while the arm goes up.
    const chain = shoulderChain(angle, rigSideFor(cmd.side), pathology?.shoulderMod, opts);
    const R2D = 180 / Math.PI;
    const scTotal = chain.scapulothoracicUpwardRot * R2D;
    // The readout's scapular figure is rescaled once the trunk joins in (>150),
    // so carry that same scaling into the two joints or they would not add up to
    // the number printed right next to them.
    const scale = scTotal > 0.01 ? sc / scTotal : 0;
    const girdle = {
      sternoclavicularDeg: chain.clavicleElevation * R2D * scale,
      acromioclavicularDeg: chain.scapulaUpwardRot * R2D * scale,
    };
    return {
      gh,
      sc,
      // La rotacion ascendente de la paleta EN SU PROPIO PLANO, que es la cifra
      // de los libros (~60 grados a 180). `sc` es su proyeccion sobre el plano en
      // que se mide el brazo, y es siempre menor: sin decirlo, un alumno que ha
      // leido "60 grados" ve 51 y cree que el modelo esta mal.
      scPlane: Math.max(0, r.scapulaPlaneDeg),
      tr,
      girdle,
      ratio: r.ratio,
      normalRatio,
      ghPct: (gh / total) * 100,
      scPct: (sc / total) * 100,
      trPct: (tr / total) * 100,
    };
  }, [isChain, angle, cmd.side, pathology, control]);

  // Knee screw-home coupling (the knee's "rhythm equivalent"): the automatic tibial
  // rotation locked to sagittal flexion/extension. Only for the knee sagittal
  // gestures; the transverse tibial-rotation movements don't show it.
  const isKneeSagittal =
    cmd.movementId === 'knee-flexion' || cmd.movementId === 'knee-extension';
  const screwHome = useMemo(
    () => (isKneeSagittal ? kneeScrewHome(angle) : null),
    [isKneeSagittal, angle],
  );

  // Cervical rotation split (atlanto-axial vs subaxial) and lumbopelvic rhythm —
  // the "rhythm equivalents" for the neck and the trunk. Each only on its gesture.
  const cervicalSplit = useMemo(
    () => (cmd.movementId === 'cervical-rotation' ? cervicalRotationSplit(angle) : null),
    [cmd.movementId, angle],
  );
  const lumboPelvic = useMemo(
    () => (cmd.movementId === 'lumbar-flexion' ? lumbopelvicRhythm(angle) : null),
    [cmd.movementId, angle],
  );

  // La postura de exploracion se pliega: una linea a la vista, el resto al
  // pulsar.
  const [postureOpen, setPostureOpen] = useState(false);
  // MARGEN NUEVO: el detalle del ritmo, plegado.
  const [ritmoOpen, setRitmoOpen] = useState(false);
  // EL AVISO DEL CUADRO CLINICO, PLEGADO EN UNA LINEA salvo en una ventana alta.
  // Abierto (por que duele, la estructura clave y la fuente) el centro no cabia:
  // medido a 1440 x 800, 154 px de desplazamiento con la discinesia y 170 con el
  // hombro congelado. Plegado dice el cuadro y se abre con un toque; a partir de
  // 1000 px de alto (la grabacion) sale abierto.
  const [cuadroOpen, setCuadroOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-height: 1000px)').matches,
  );

  // A maneuver is being DEMONSTRATED (orthopedic test / myotome). While it runs
  // the angle sweeps, so every per-angle reading below — the sector, the rhythm,
  // the recruited muscles and their percentages — would recompute on every frame
  // and be unreadable. The panel switches to a FIXED description of the maneuver
  // instead; the dial keeps showing the live angle, because motion is what a dial
  // is for.
  const demo: RigDemoInfo | null = cmd.demo ?? null;

  // El angulo mas alto que ESTE demo ha puesto en el rig (ver demoArcReading).
  // Se compara por identidad: el objeto del demo se construye una vez por
  // maniobra, no por fotograma. Solo sube, asi que repetir el render no lo
  // cambia.
  const demoPeakRef = useRef<{ demo: RigDemoInfo | null; peak: number }>({ demo: null, peak: 0 });
  if (demoPeakRef.current.demo !== demo) demoPeakRef.current = { demo, peak: demo ? angle : 0 };
  else if (demo && angle > demoPeakRef.current.peak) demoPeakRef.current.peak = angle;

  const sharedArc = control?.kind === 'joint' && control.arcFrom === 'max';
  const demoReading = demo
    ? demoArcReading(sharedArc, demoPeakRef.current.peak, demo.targetDeg)
    : null;

  // DEMO. Fixed for the whole maneuver: what position is being held, on what
  // structure, and -- for a resisted test -- where the physio pushes. This is
  // what replaces the per-frame analysis while a demo runs.
  const demoSection =
    demo && demoReading ? (
      <section className="sec">
        <div className="sec-head">
          <span className="kicker">{demoReading.kicker}</span>
          <span className="sec-rule" />
          <span className="num shrink-0 text-[13px] font-medium text-brand">
            {demoReading.value}
          </span>
        </div>
        {demo.structure && (
          <p className="text-xs leading-snug text-fg2">
            Evalúa <span className="font-semibold text-fg">{demo.structure}</span>
          </p>
        )}

        {demo.examinerForce === 'resists' && (
          <div className="note note-brand mt-2">
            <span className="tag text-fg2">Prueba resistida</span>
            <ol className="mt-1 space-y-1">
              <li>1. El paciente sostiene la posición y empuja.</li>
              <li>
                2. Aplica resistencia en el segmento distal, donde se apoya la mano
                del fisio en el modelo.
              </li>
            </ol>
          </div>
        )}

        {demo.examinerForce === 'applies' && (
          <div className="note note-brand mt-2">
            <span className="tag text-fg2">Prueba pasiva</span>
            <ol className="mt-1 space-y-1">
              <li>1. El paciente permanece relajado: no empuja.</li>
              <li>
                2. La fuerza la aplicas tú donde se apoya la mano del fisio en el
                modelo.
              </li>
            </ol>
          </div>
        )}

        {/* LO QUE SE ESTA ENCENDIENDO, con su nombre clinico. Hasta ahora
            el readout decia que se evaluaba una estructura y en la escena no
            se encendia ninguna: 42 de los 65 demos resaltaban nada. */}
        {demo.structureLabels && demo.structureLabels.length > 0 && (
          <p className="mt-2 text-xs leading-snug text-fg2">
            Resaltado:{' '}
            <span className="font-semibold text-fg">{demo.structureLabels.join(' · ')}</span>
          </p>
        )}

        {/* Y LO QUE NO SE PUEDE ENSENAR. Los nervios y los vasos no estan en
            el sistema de capas de este modelo, asi que una prueba de raiz
            nerviosa no puede resaltar su estructura. Decirlo es mejor que
            encender algo parecido y que pase por lo que el libro nombra. */}
        {demo.cannotShow && (
          <p className="mt-2 text-[11px] leading-snug text-fg3">{demo.cannotShow}</p>
        )}

        {/* LA ADVERTENCIA DEL DEMO NO SE RECORTA NUNCA. `demo.note` no es
            prosa de apoyo: es lo que el modelo NO esta ensenando de la
            maniobra. En un portatil de 1366x768 la unica linea que
            explicaba la aproximacion desaparecia con la prosa, que es
            exactamente la pantalla donde mas se agradece. */}
        {demo.note && <p className="mt-2 text-[11px] leading-snug text-fg2">{demo.note}</p>}
      </section>
    ) : null;

  // EL DEMO SE LEE AUNQUE SU GESTO NO ESTE CARGADO. Un miotoma mueve el codo,
  // la cadera, la rodilla o el tobillo, y `movementById` solo encuentra los
  // movimientos del hombro (en el bundle) y los de las regiones ya visitadas: en
  // escritorio el margen se quedaba EN BLANCO durante 7 de los 8 demos de
  // miotoma (solo C5 mueve un gesto del hombro). Sin gesto no hay arco ni
  // reclutamiento que pintar, pero la maniobra, lo que se enciende y lo que el
  // modelo no ensena si se pueden leer: es lo que se pinta.
  if (!drivable || !arc || !movement) {
    if (!demoSection || !demo) return null;
    return (
      <div
        className={`flex max-h-full min-h-0 w-full flex-col ${
          embedded ? 'flex-1' : 'instrument pointer-events-auto animate-scale-in overflow-hidden'
        }`}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">{demoSection}</div>
      </div>
    );
  }

  const recordFor = (muscleId: string) =>
    musclesForRomLookup(muscleRegion).find((m) => m.id === muscleId);
  const isolateByName = (muscleId: string) => {
    const record = recordFor(muscleId);
    if (!record?.meshBases?.length) return;
    dissectChannel.isolateMuscle(muscleId, record.name, record.meshBases);
  };
  /** True when this muscle is the one currently shown alone. */
  const isIsolated = (muscleId: string) => dissect.isolated?.id === muscleId;
  /** A muscle can only be isolated if the catalogue knows which meshes are its. */
  const canIsolate = (muscleId: string) => !!recordFor(muscleId)?.meshBases?.length;

  // Lo que queda por debajo del pliegue se desvanece en vez de cortarse: una
  // linea partida se lee como un fallo, un degradado como "hay mas". El cuerpo
  // acaba en 12 px de aire, asi que al llegar al final el degradado cae sobre
  // nada.
  const fade: CSSProperties = {
    maskImage: 'linear-gradient(180deg, #000 calc(100% - 14px), transparent)',
    WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 14px), transparent)',
  };

  const nameOf = (muscleId: string) => muscleNameById(muscleRegion, muscleId);

  // ---------------------------------------------------------------------------
  // EL MARGEN DE ESCRITORIO (rediseño de noviembre de 2026)
  // ---------------------------------------------------------------------------
  // Una cosa grande cada vez: el paginador y la frase de la fase arriba; el
  // aviso del cuadro y la postura de exploracion si los hay; el ritmo en una
  // barra; y QUIEN LO HACE, tres musculos con la curva de todo el arco. Ver
  // LabMarginParts. El texto largo, la lista entera y los detalles van detras
  // de un toque. Durante un demo, la ficha fija de la maniobra.
  const eff = effectiveArc(arc, pathology);
  const ratioTxt =
    rhythm && /\d/.test(rhythm.ratio) ? rhythm.ratio.replace('.', ',').replace(':', ' : ') : '';
  const normalTxt =
    rhythm?.normalRatio && /\d/.test(rhythm.normalRatio)
      ? rhythm.normalRatio.replace('.', ',').replace(':', ' : ')
      : '';
  const rhythmSegs = rhythm
    ? [
        { label: 'Húmero', deg: rhythm.gh, pct: rhythm.ghPct, tone: 0 },
        { label: 'Escápula', deg: rhythm.sc, pct: rhythm.scPct, tone: 1 },
        { label: 'Tronco', deg: rhythm.tr, pct: rhythm.trPct, tone: 2 },
      ]
    : [];
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2" style={fade}>
        {demo ? (
          demoSection
        ) : (
          // Un envoltorio sin estilo: LabTrio lo observa para saber cuanto mide
          // el centro cuando entra o sale una seccion (un cuadro, una postura).
          <div data-lab-center="">
            {examPostures.length > 0 && (
              <section className="px-4 pt-2.5">
                <button
                  type="button"
                  onClick={() => setPostureOpen(!postureOpen)}
                  aria-expanded={!!postureOpen}
                  className="sec-head group mb-0 w-full text-left"
                >
                  <span className="kicker transition-colors group-hover:text-fg2">
                    Posición de exploración
                  </span>
                  <span className="sec-rule" />
                  <ChevronDownIcon
                    size={13}
                    className={`shrink-0 text-fg3 transition-transform ${postureOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {/* PLEGADA, UNA LINEA. Abierta de entrada (como en el panel
                    viejo, a partir de 860 px de ventana) empujaba el trio por
                    debajo del pliegue: medido en la rotacion externa a 1440 x
                    900, 132 px de desplazamiento. La primera linea ya dice por
                    que el codo esta doblado; el resto, al pulsar. */}
                {postureOpen
                  ? examPostures.map((p) => (
                      <p key={p.bone} className="note note-brand mt-1.5">
                        {p.reason}
                      </p>
                    ))
                  : (
                      <p className="mt-1 line-clamp-1 text-xs leading-snug text-fg2">
                        {examPostures[0].reason}
                      </p>
                    )}
              </section>
            )}

            {at && (
              <section className="px-4 pt-2.5">
                <PhasePager
                  phases={arc.phases}
                  index={at.index}
                  effMin={eff.min}
                  effMax={eff.max}
                />
                <PhaseStack phases={arc.phases} index={at.index} citeLabel={citeLabel} />
              </section>
            )}

            {pathology && (
              <section className="px-4 pt-3">
                <div className="note note-warn">
                  <button
                    type="button"
                    onClick={() => setCuadroOpen((o) => !o)}
                    aria-expanded={cuadroOpen}
                    className="group flex w-full items-baseline gap-2 text-left"
                  >
                    <span className="kicker shrink-0 text-amber-300/80">Patológico</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-amber-100">
                      {pathology.name}
                    </span>
                    <ChevronDownIcon
                      size={12}
                      className={`shrink-0 self-center text-amber-200/70 transition-transform ${
                        cuadroOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {cuadroOpen && (
                    <>
                      <p className="mt-1.5 text-amber-100/85">{pathology.whyItHurts}</p>
                      {pathology.implicated.length > 0 && (
                        <p className="mt-1.5 text-amber-200/70">
                          Estructura clave: {pathology.implicated.map((id) => nameOf(id)).join(', ')}
                        </p>
                      )}
                      <p className="num mt-1.5 text-[11px] text-fg3">
                        Fuente: {citeLabel(pathology.cite)}
                      </p>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* EL RITMO, en una barra. La razon nunca enseña la raya que
                devuelve el modelo cuando la escapula aun no ha girado; por
                debajo de 0° el hueco se conserva para que nada salte. */}
            {isChain && (
              <section className="px-4 pt-3">
                <button
                  type="button"
                  onClick={() => setRitmoOpen((o) => !o)}
                  aria-expanded={ritmoOpen}
                  disabled={!rhythm}
                  className="sec-head group mb-1.5 w-full text-left"
                >
                  {/* "Desde 0°": el reparto es ACUMULADO, no el de este grado. */}
                  <span className="kicker transition-colors group-hover:text-fg2">
                    Ritmo escapulohumeral desde 0°
                  </span>
                  <span className="sec-rule" />
                  {rhythm && (
                    <ChevronDownIcon
                      size={13}
                      className={`shrink-0 text-fg3 transition-transform ${ritmoOpen ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>
                {rhythm ? (
                  <div className="lab-legend">
                    {/* LA BARRA Y LA RAZON EN UNA FILA. La razon va en un hueco
                        fijo de 72 px, donde cabe "18,8 : 1": la barra no cambia
                        de largo cuando la cifra crece. */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-1 min-w-0 flex-1 gap-0.5" aria-hidden="true">
                        {rhythmSegs
                          .filter((sg) => sg.pct > 0.5)
                          .map((sg) => (
                            <span
                              key={sg.label}
                              className="h-full basis-0 transition-[flex-grow] duration-150"
                              style={{ flexGrow: sg.pct, backgroundColor: SPLIT_TONE[sg.tone] }}
                            />
                          ))}
                      </div>
                      <span className="num w-[4.5rem] shrink-0 text-right text-[13px] font-medium text-fg">
                        {ratioTxt}
                      </span>
                    </div>
                    <dl className="mt-2 flex items-baseline justify-between gap-2">
                      {rhythmSegs.map((sg) => {
                        // Un tramo a cero (el tronco por debajo de 150°) se
                        // queda en su sitio, pero apagado.
                        const cero = Math.round(sg.deg) === 0;
                        return (
                          <div key={sg.label} className="flex items-baseline gap-1.5">
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-1.5 shrink-0 -translate-y-px"
                              style={{ backgroundColor: SPLIT_TONE[sg.tone] }}
                            />
                            <dt className={`text-xs ${cero ? 'text-fg3' : 'text-fg2'}`}>{sg.label}</dt>
                            <dd className={`num text-xs font-medium ${cero ? 'text-fg2' : 'text-fg'}`}>
                              {Math.round(sg.deg)}°
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                ) : (
                  // EL MISMO ALTO QUE CON LA BARRA: la frase ocupa la fila de la
                  // barra y la leyenda guarda su hueco, asi que al cruzar 0° no
                  // salta nada (medido: 17 px de salto sin esto).
                  <div className="lab-legend">
                    <div className="flex min-h-[19px] items-center">
                      <p className="text-xs text-fg3">Solo en la elevación, por encima de 0°.</p>
                    </div>
                    <dl className="mt-2 min-h-[16px]" aria-hidden="true" />
                  </div>
                )}
                {rhythm && ritmoOpen && (
                  <div className="mt-2 space-y-1.5 text-xs leading-snug text-fg2">
                    {/* En una ventana baja la leyenda de la barra se esconde y
                        sus grados pasan aqui. */}
                    <p className="lab-short-only num">
                      Húmero {Math.round(rhythm.gh)}° · Escápula {Math.round(rhythm.sc)}° · Tronco{' '}
                      {Math.round(rhythm.tr)}°
                    </p>
                    {normalTxt && (
                      <p className="num text-amber-200/90">Ritmo normal en este ángulo: {normalTxt}</p>
                    )}
                    {rhythm.sc > 1 && (
                      <p>
                        De la escápula:{' '}
                        <span className="num text-fg">
                          {Math.round(rhythm.girdle.sternoclavicularDeg)}°
                        </span>{' '}
                        esternoclavicular (la clavícula se eleva) y{' '}
                        <span className="num text-fg">
                          {Math.round(rhythm.girdle.acromioclavicularDeg)}°
                        </span>{' '}
                        acromioclavicular (la escápula gira sobre ella).
                      </p>
                    )}
                    {rhythm.scPlane - rhythm.sc > 2 && (
                      <p>
                        Rotación ascendente de la escápula:{' '}
                        <span className="num text-fg">{Math.round(rhythm.scPlane)}°</span> en su
                        propio plano, inclinado ~34° por delante del frontal; de ahí los{' '}
                        <span className="num text-fg">{Math.round(rhythm.sc)}°</span> que aporta al
                        ángulo que se mide.
                      </p>
                    )}
                    <p className="num text-[11px] text-fg3">
                      Reparto acumulado desde 0°. Fuente: Inman, Ludewig, Kapandji
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* LOS EQUIVALENTES DEL RITMO en la rodilla, el cuello y el tronco,
                CON LA MISMA FORMA: una linea que se pulsa, la barra con su
                cifra y la leyenda; la nota y la fuente, al pulsar. Abiertos
                de entrada empujaban el trio fuera: medido en la flexion de
                rodilla a 1440 x 900, 96 px de desplazamiento. El aviso de
                que la pelvis no se mueve en el 3D NO se pliega: sin el, la
                cifra parece medida en el modelo. */}
            {screwHome && (
              <section className="px-4 pt-3">
                <button
                  type="button"
                  onClick={() => setRitmoOpen((o) => !o)}
                  aria-expanded={ritmoOpen}
                  className="sec-head group mb-1.5 w-full text-left"
                >
                  <span className="kicker transition-colors group-hover:text-fg2">
                    Mecanismo de tornillo
                  </span>
                  <span className="sec-rule" />
                  <ChevronDownIcon
                    size={13}
                    className={`shrink-0 text-fg3 transition-transform ${ritmoOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div className="flex items-center gap-3">
                  <span
                    className="meter min-w-0 flex-1 text-brand"
                    style={{ ['--v' as string]: (screwHome.tibialErDeg / 15) * 100 }}
                    aria-hidden="true"
                  />
                  <span className="num w-[4.5rem] shrink-0 text-right text-[13px] font-medium text-fg">
                    {screwHome.tibialErDeg.toFixed(1).replace('.', ',')}°
                  </span>
                </div>
                <p className="mt-2 flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-fg2">Rotación externa de la tibia</span>
                  <span className="font-medium text-fg">{SCREW_ZONE[screwHome.zone].label}</span>
                </p>
                {ritmoOpen && (
                  <div className="mt-2 space-y-1.5 text-xs leading-snug text-fg2">
                    <p>{SCREW_ZONE[screwHome.zone].note}</p>
                    <p className="num text-[11px] text-fg3">Fuente: Kapandji, Oatis</p>
                  </div>
                )}
              </section>
            )}
            {(cervicalSplit || lumboPelvic) &&
              (() => {
                const eq = cervicalSplit
                  ? {
                      title: 'Reparto de la rotación',
                      ratio: cervicalSplit.ratio,
                      segs: [
                        { label: 'C1-C2', deg: cervicalSplit.c1c2Deg, pct: cervicalSplit.c1c2Pct },
                        { label: 'C2-C7', deg: cervicalSplit.subaxialDeg, pct: cervicalSplit.subaxialPct },
                      ],
                      note: 'La articulación atlanto-axoidea (C1-C2) aporta ~la mitad de la rotación cervical y lidera el inicio; los segmentos C2-C7 completan el arco.',
                      notPosed: undefined as string | undefined,
                    }
                  : {
                      title: 'Ritmo lumbopélvico',
                      ratio: lumboPelvic!.ratio,
                      segs: [
                        { label: 'Lumbar', deg: lumboPelvic!.lumbarDeg, pct: lumboPelvic!.lumbarPct },
                        { label: 'Pelvis', deg: lumboPelvic!.pelvicDeg, pct: lumboPelvic!.pelvicPct },
                      ],
                      note:
                        lumboPelvic!.leader === 'lumbar'
                          ? 'El raquis lumbar lidera el inicio del gesto (invierte la lordosis); la pelvis aún apenas rota.'
                          : lumboPelvic!.leader === 'pelvis'
                            ? 'La pelvis (flexión de cadera) domina ya el gesto; el raquis lumbar aporta menos.'
                            : 'Lumbar y pelvis se reparten el gesto de forma pareja.',
                      notPosed: LUMBOPELVIC_PELVIS_POSED
                        ? undefined
                        : 'La pelvis no bascula en el 3D: en este modelo la cadera no es una articulación entre pelvis y fémur. Los grados de pelvis son del modelo; lo que ves moverse es el raquis lumbar.',
                    };
                const ratio = /\d/.test(eq.ratio ?? '') ? eq.ratio.replace('.', ',').replace(':', ' : ') : '';
                return (
                  <section className="px-4 pt-3">
                    <button
                      type="button"
                      onClick={() => setRitmoOpen((o) => !o)}
                      aria-expanded={ritmoOpen}
                      className="sec-head group mb-1.5 w-full text-left"
                    >
                      <span className="kicker transition-colors group-hover:text-fg2">{eq.title}</span>
                      <span className="sec-rule" />
                      <ChevronDownIcon
                        size={13}
                        className={`shrink-0 text-fg3 transition-transform ${ritmoOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div className="lab-legend">
                      <div className="flex items-center gap-3">
                        <div className="flex h-1 min-w-0 flex-1 gap-0.5" aria-hidden="true">
                          {eq.segs
                            .filter((sg) => sg.pct > 0.5)
                            .map((sg, i) => (
                              <span
                                key={sg.label}
                                className="h-full basis-0 transition-[flex-grow] duration-150"
                                style={{ flexGrow: sg.pct, backgroundColor: SPLIT_TONE[i] }}
                              />
                            ))}
                        </div>
                        <span className="num w-[4.5rem] shrink-0 text-right text-[13px] font-medium text-fg">
                          {ratio}
                        </span>
                      </div>
                      <dl className="mt-2 flex items-baseline gap-5">
                        {eq.segs.map((sg, i) => (
                          <div key={sg.label} className="flex items-baseline gap-1.5">
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-1.5 shrink-0 -translate-y-px"
                              style={{ backgroundColor: SPLIT_TONE[i] }}
                            />
                            <dt className="text-xs text-fg2">{sg.label}</dt>
                            <dd className="num text-xs font-medium text-fg">{Math.round(sg.deg)}°</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    {eq.notPosed && <p className="note note-warn mt-2">{eq.notPosed}</p>}
                    {ritmoOpen && (
                      <div className="mt-2 space-y-1.5 text-xs leading-snug text-fg2">
                        <p>{eq.note}</p>
                        <p className="num text-[11px] text-fg3">Fuente: Kapandji, Oatis</p>
                      </div>
                    )}
                  </section>
                );
              })()}

            {at && (
              <LabTrio
                movement={movement}
                phase={at.phase}
                arcMin={arc.min}
                arcMax={arc.max}
                effMin={eff.min}
                effMax={eff.max}
                angle={Math.max(eff.min, Math.min(angle, eff.max))}
                nameOf={nameOf}
                canIsolate={canIsolate}
                isIsolated={isIsolated}
                isolate={isolateByName}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
