// src/components/movement/OrthopedicTestsPanel.tsx
//
// Biomechanics-lab panel: ORTHOPEDIC SPECIAL TESTS for the active region. Beyond
// listing maneuver + metrics + study, it adds three functions the usual
// test-list apps do not have:
//
//   1. DEMOSTRAR EN EL MODELO: a test drives the 3D rig THROUGH its provocative
//      maneuver (animated sweep) and glows the stressed structure.
//   2. RAZONAMIENTO (FAGAN): a pretest-probability slider + the test's LR update
//      the POST-test probability for a positive/negative result (Bayes).
//   3. CLUSTER: select several tests and see the combined post-test probability
//      if all are positive.
//
// -----------------------------------------------------------------------------
// DESIGN RULES. Read before adding anything here.
// -----------------------------------------------------------------------------
// This panel is the reason a physio pays, and it had drifted into the look of a
// generated dashboard: seven saturated colours competing at once, seven type
// sizes (down to 8px), and every block wrapped in its own tinted rounded box
// with a gradient on the help card. Dense is fine, this is an instrument. Noisy
// is not. So:
//
// 1. COLOUR IS A TWO-AXIS CODE, and nothing else. Sky is SENSIBILIDAD and
//    everything that follows from it (SnNout, "descarta", the negative branch).
//    Emerald is ESPECIFICIDAD and its consequences (SpPin, "confirma", the
//    positive branch). Amber marks things needing attention: a balanced profile,
//    a resisted maneuver, an unverified figure. Slate is "no aislado". The cyan
//    accent means INTERACTIVE STATE only -- selected, active, focused -- and is
//    never allowed to carry data. That is the whole palette; the loose #ffb877
//    and the rose stop-button are gone.
//
// 2. FOUR TYPE SIZES: 18px for the figure that answers (the post-test, the
//    pre-test), 14px for a test name, 13px for prose, 11px for metadata and
//    every small number (mono, tabular). Nothing smaller ships -- an 8px legend
//    on a clinical figure is decoration pretending to be information. Por eso
//    las piezas de LAMINA que vienen a 10 px (`.kicker`, `.tag`) se usan aqui
//    con `text-[11px]`: la voz es la del sistema y el suelo es el del panel.
//
// 3. NO HAY CAJAS (sistema LAMINA, docs/sistema-lamina.md). El panel ya no es
//    una superficie flotante: vive en la pestana "Tests" del margen derecho, sin
//    fondo propio. Una seccion empieza con rotulo + filo; un aviso es una regla
//    a la izquierda (`.note`); una cifra se destaca por tamano (`.readout`); una
//    barra es un `.meter` de 2 px; un interruptor es texto que se enciende en el
//    color de estado (`btn-quiet` + `aria-pressed`), no una pastilla con borde.
//
// 4. SAY IT ONCE. Utility used to be encoded three times per row (edge bar,
//    dot, word). The edge bar and the word remain; the dot is gone.
//
// 5. THE 3D MANEUVER IS THE HEADLINE FEATURE, so it is reachable from the
//    COLLAPSED row. It used to be a small button buried under the metrics of an
//    expanded card, which is the last place a new user looks.
//
// LAYOUT: en `bare` (como se monta hoy, en el margen derecho de escritorio y en
// la hoja movil) el panel no tiene scroll propio: lo hace la pestana que lo
// contiene, y lo que tiene que verse mientras se recorre la lista (el resultado
// del conjunto) va pegado al pie con `sticky`. El margen mide 19rem (304 px)
// entre 1024 y 1279 px de ventana: todo lo de aqui se ha cuadrado a ese ancho.
// Data: src/data/orthopedicTests. Type: OrthopedicTest. UI Spanish LATAM; code
// ASCII.

import { useEffect, useId, useMemo, useState } from 'react';
import { testsForRegion } from '../../data/orthopedicTests';
import {
  clusterLrPositive,
  measuredCluster,
  partialCluster,
} from '../../data/testClusters';
import type {
  OrthopedicTest,
  TestUtility,
  DiagnosticMetrics,
} from '../../types/orthopedicTest';
import { getReference, formatReference, type ReferenceId } from '../../data/references';
import { rigChannel } from './RigModel';
import { demoChannel, useActiveDemo } from './demoChannel';
import { readPose } from './consolePoseStore';
import { startDemoLoop } from '../../lib/demoTimeline';
import { getBoneControl } from '../../lib/boneMap';
import { EVENTS, track } from '../../lib/analytics';
import { structureLabel } from '../../lib/clinicalStructures';
import { examinerHandDrawn } from '../../lib/examinerHand';
import { SaveButton } from '../SaveButton';
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  PlayIcon,
  StopIcon,
} from '../ui/Icons';

/** Namespace for this panel's demo ids on the shared demoChannel. */
const DEMO_NS = 'test:';

/**
 * Utility, as an edge rule + one word. See design rule 1: sky descarta, emerald
 * confirma, amber balanced, slate weak. The tooltip carries the teaching rule.
 */
const UTILITY: Record<
  TestUtility,
  { word: string; text: string; bar: string; tip: string }
> = {
  'rule-in': {
    word: 'Confirma',
    text: 'text-emerald-300',
    bar: 'border-emerald-400/70',
    tip: 'Alta especificidad (SpPin): un positivo confirma.',
  },
  'rule-out': {
    word: 'Descarta',
    text: 'text-sky-300',
    bar: 'border-sky-400/70',
    tip: 'Alta sensibilidad (SnNout): un negativo descarta.',
  },
  balanced: {
    word: 'Equilibrado',
    text: 'text-amber-300',
    bar: 'border-amber-400/70',
    tip: 'Sensibilidad y especificidad parecidas.',
  },
  weak: {
    word: 'En conjunto',
    text: 'text-fg2',
    bar: 'border-fg3/70',
    tip: 'Poca precisión aislado: úsalo dentro de un grupo de tests.',
  },
};

// ---------------------------------------------------------------------------
// Bayes / likelihood-ratio math.
// ---------------------------------------------------------------------------
export function lrPosNum(m: DiagnosticMetrics): number | null {
  if (m.lrPositive != null) return m.lrPositive;
  if (m.sensitivity == null || m.specificity == null) return null;
  if (m.specificity >= 100) return Infinity;
  return (m.sensitivity / 100) / (1 - m.specificity / 100);
}
export function lrNegNum(m: DiagnosticMetrics): number | null {
  if (m.lrNegative != null) return m.lrNegative;
  if (m.sensitivity == null || m.specificity == null || m.specificity === 0) return null;
  return (1 - m.sensitivity / 100) / (m.specificity / 100);
}
/**
 * LA RAZON DE VEROSIMILITUD CONSERVADORA, cuando la especificidad es del 100%.
 *
 * Una especificidad del 100% no dice que la prueba sea infalible: dice que en
 * ESA muestra, finita, no hubo ni un falso positivo. Si la fuente publica el
 * intervalo de confianza, su extremo inferior da una LR+ acotada y honesta:
 * Suri 2011 da 100% (IC 88-100) para el signo femoral, y con el 88% la LR+
 * pasa de infinita a 4,2.
 *
 * Devuelve null cuando no hay intervalo publicado: entonces no se puede poner
 * ninguna cifra sin inventarsela, y el panel lo dice en palabras.
 */
function lrPosConservative(m: DiagnosticMetrics): number | null {
  if (m.sensitivity == null || m.specificityCiLow == null) return null;
  if (m.specificityCiLow >= 100) return null;
  return (m.sensitivity / 100) / (1 - m.specificityCiLow / 100);
}

/**
 * Probabilidad post-test. NULL cuando la razon de verosimilitud no es finita
 * NI ES CERO: los dos extremos son el mismo error, uno en cada direccion.
 *
 * Esto devolvia 100. Tres pruebas del catalogo traen especificidad 100%
 * --Maudsley (Saroja 2014, 30 sujetos), signo femoral (Suri 2011, 57 pacientes)
 * y lift-off (Barth 2006, 68 pacientes)-- y con ellas el panel publicaba
 * "1% -> 100%": que una sospecha previa del 1% se convierte en certeza
 * absoluta. Ninguna prueba fisica hace eso, y menos una validada en decenas de
 * pacientes. Ahora el bloque de Fagan lo explica en vez de imprimir un numero
 * que no existe, y ensena la estimacion conservadora cuando la fuente publica
 * el intervalo.
 *
 * Y EL ESPEJO SE QUEDO SIN GUARDAR, que es peor porque nadie lo busca. Una
 * sensibilidad del 100% da LR- = (1-1)/espec = 0, cero es finito, y
 * `odds * 0 / (1 + odds * 0)` es 0: el panel publicaba "Si sale negativo:
 * 30% -> 0%" y "LR- 0.00". Medido sobre el payload que se SIRVE
 * (supabase/functions/content/payloads/elbow.json) para el unico test del
 * catalogo con sensibilidad 100 --moving valgus stress, O'Driscoll 2005, 17 de
 * 17-- daba 0,0% desde CUALQUIER pre-test: 10, 30, 70 y 90 por ciento. Es
 * decir, un negativo descartaba la lesion del ligamento colateral cubital con
 * certeza absoluta a partir de 17 sujetos. Cero y infinito se tratan igual:
 * no se cifra, se explica (ver FaganBlock).
 */
export function postProb(prePct: number, lr: number): number | null {
  if (!isFinite(lr) || lr <= 0) return null;
  const pre = Math.min(99.9, Math.max(0.1, prePct)) / 100;
  const odds = pre / (1 - pre);
  const post = odds * lr;
  return (post / (1 + post)) * 100;
}
function lrLabel(lr: number | null, dp = 1): string {
  if (lr == null) return 's/d';
  if (!isFinite(lr)) return '∞';
  return lr.toFixed(dp);
}

// ---------------------------------------------------------------------------
// EXAM MODE: hide the metrics, the user predicts, then reveals. Turns the panel
// from a lookup table into a reasoning drill (SnNout / SpPin). A value >= 70% is
// treated as "alta" for grading the prediction (a common teaching cutoff; the
// real number is always shown on reveal so the nuance isn't lost).
// ---------------------------------------------------------------------------
const ALTA_THRESHOLD = 70;
type Level = 'alta' | 'baja';
/** A user's guess for one test before revealing (per axis + reveal flag). */
interface Prediction {
  sens: Level | null;
  espec: Level | null;
  revealed: boolean;
}
const EMPTY_PREDICTION: Prediction = { sens: null, espec: null, revealed: false };
/** Bucket a percentage into alta/baja (undefined stays undefined = "sin dato"). */
function levelOf(value: number | undefined): Level | undefined {
  if (value == null) return undefined;
  return value >= ALTA_THRESHOLD ? 'alta' : 'baja';
}

/**
 * ¿HAY ALGUNA CIFRA DETRAS DE LA ETIQUETA DE USO?
 *
 * La insignia de la fila afirma algo sobre una de las dos cifras: "Confirma" es
 * alta especificidad y "Descarta" es alta sensibilidad. Se pintaba SIEMPRE,
 * tambien cuando la prueba no publica esa cifra. Medido sobre el catalogo
 * completo (las 80 pruebas de `fullContent`), doce la llevaban sin respaldo, y
 * cuatro con la insignia fuerte y sin ningun numero: shoulder/relocation,
 * thoracic/adams-forward-bend, hip/hip-log-roll y knee/posterior-sag decian
 * "Confirma" con el titulo "Alta especificidad (SpPin)" y con `metrics` sin
 * sensibilidad y sin especificidad. La nota de relocation lo dice ella misma:
 * Lo 2004 "no publico sensibilidad ni especificidad de la recolocacion
 * aislada".
 *
 * `weak` no entra: "poca precision aislado" es justamente lo que significa no
 * tener cifras, asi que ahi la etiqueta no promete nada que falte.
 */
export function utilityBacked(test: OrthopedicTest): boolean {
  const m = test.metrics;
  switch (test.utility) {
    case 'rule-in':
      return m.specificity != null;
    case 'rule-out':
      return m.sensitivity != null;
    case 'balanced':
      return m.sensitivity != null && m.specificity != null;
    default:
      return true;
  }
}

/**
 * Lo que se lee al pasar por encima de una etiqueta sin cifra que la respalde.
 *
 * DICE QUE CIFRA FALTA, NO "NINGUNA". Decia siempre "sin sensibilidad ni
 * especificidad publicadas", y de las 13 pruebas del catalogo cuya etiqueta no
 * tiene respaldo, dos SI publican una de las dos: elbow/tinel-cubital
 * (sensibilidad 70) y hip/hip-faber (sensibilidad 82), las dos "Equilibrado",
 * que es la etiqueta que necesita las dos cifras. El titulo negaba un dato que
 * la misma fila ensenaba al lado ("Se 82").
 */
export function unbackedTip(test: OrthopedicTest): string {
  const { sensitivity: se, specificity: es } = test.metrics;
  const falta =
    se == null && es == null
      ? 'sin sensibilidad ni especificidad publicadas que lo respalden'
      : se == null
        ? 'sin la sensibilidad publicada que lo respaldaría'
        : 'sin la especificidad publicada que lo respaldaría';
  return `Uso propuesto por la fuente; ${falta}. ${test.utilityBasis ?? ''}`.trim();
}

/**
 * ¿SE LE PUEDE PREGUNTAR ALGO AL USUARIO SOBRE ESTA PRUEBA?
 *
 * El modo examen pide predecir sensibilidad y especificidad. Veintiuna de las
 * ochenta pruebas no traen ninguna de las dos, y con los dos ejes a `undefined`
 * la correccion daba por buena cualquier respuesta: bastaba pulsar Revelar para
 * leer "Bien razonado".
 */
function isPredictable(test: OrthopedicTest): boolean {
  return test.metrics.sensitivity != null || test.metrics.specificity != null;
}

/** Sin tildes y en minusculas (la misma normalizacion que `fold` de movementFunctions). */
function foldText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * ¿ENCUENTRA EL BUSCADOR ESTA PRUEBA? Por nombre, alias, estructura o grupo, y
 * CON O SIN TILDE.
 *
 * Comparaba en minusculas pero con las tildes puestas, asi que quien escribe
 * como se escribe en un buscador ("aprehension", "valgo de codo", "cubital")
 * no encontraba "Prueba de aprehensión" ni "Neuropatía del cubital": la lista
 * quedaba vacia con la prueba delante. MEDIDO sobre el catalogo entero (las 80
 * pruebas de los ocho ficheros de src/data/orthopedicTests): 66 llevan alguna
 * tilde en el nombre, el alias, la estructura o el grupo, y 41 en el propio
 * nombre. Lo vigila src/components/movement/__tests__/testSearch.test.ts.
 */
export function testMatchesQuery(t: OrthopedicTest, query: string): boolean {
  const q = foldText(query.trim());
  if (!q) return true;
  return [t.name, t.target, t.category, ...(t.aka ?? [])].some((s) => foldText(s).includes(q));
}

// ---------------------------------------------------------------------------
// Small presentational pieces.
// ---------------------------------------------------------------------------

/**
 * A micro caption: el rotulo de LAMINA (`.kicker`, mono y versalitas) subido a
 * 11 px por la regla 2 del panel. Un solo componente, para que el tamano y el
 * color no se separen.
 */
function Kicker({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`kicker text-[11px] ${className}`}>{children}</span>;
}

/**
 * Rotulo + filo: empieza un bloque dentro de la ficha abierta (la post-test,
 * el examen). Es la `.sec-head` del sistema sin su margen inferior, porque
 * dentro de una fila el aire lo pone la fila. Lo que va a la derecha (un
 * veredicto) se pone DESPUES del filo.
 */
function SubHead({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <Kicker>{label}</Kicker>
      <span className="sec-rule" />
      {children}
    </div>
  );
}

/** El valor de un `.meter` (0..100) va en la variable `--v`. */
function meterStyle(value: number | null | undefined): React.CSSProperties {
  const v = value != null && isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return { '--v': v } as React.CSSProperties;
}

/** One slim labelled 0..100 metric bar (sensibilidad / especificidad). */
function MetricBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number | undefined;
  /** Clase de COLOR DE TEXTO: el `.meter` pinta su relleno con `currentColor`. */
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[5.5rem] shrink-0 text-[11px] text-fg2">{label}</span>
      <span className={`meter flex-1 ${color}`} style={meterStyle(value)} aria-hidden="true" />
      <span className="num w-10 shrink-0 text-right text-[11px] text-fg">
        {value != null ? `${value}%` : 's/d'}
      </span>
    </div>
  );
}

/** A labelled block of prose in the expanded detail (no card chrome). */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Kicker>{label}</Kicker>
      <p className="mt-1 text-[13px] leading-relaxed text-fg2">{children}</p>
    </div>
  );
}

/**
 * Fagan reasoning: pretest -> posttest for a positive / negative result.
 * Drawn as two labelled readings on a hairline-separated block rather than a
 * tinted card, and the arrow states the actual transition (30% -> 68%) because
 * that difference IS the clinical point of the test.
 */
function FaganBlock({
  metrics,
  pretest,
  unverified,
}: {
  metrics: DiagnosticMetrics;
  pretest: number;
  /**
   * True cuando ALGUNA de las fuentes de este test esta sin comprobar.
   *
   * Antes la condicion era "ninguna comprobada", y eso dejaba un hueco: una
   * prueba cuya SENSIBILIDAD sale de un metanalisis comprobado y cuya
   * ESPECIFICIDAD sigue saliendo de un manual tenia una cita verificada, asi
   * que el aviso desaparecia... y el numero que calcula este bloque sale de las
   * dos cifras. Basta una sin comprobar para que la probabilidad posterior
   * herede la duda.
   */
  unverified: boolean;
}) {
  const lrPos = lrPosNum(metrics);
  const lrNeg = lrNegNum(metrics);
  const postPos = lrPos != null ? postProb(pretest, lrPos) : null;
  const postNeg = lrNeg != null ? postProb(pretest, lrNeg) : null;
  const lrCons = lrPosConservative(metrics);
  const conservative = postPos == null && lrCons != null ? postProb(pretest, lrCons) : null;
  // UN POSITIVO QUE NO SUBE LA SOSPECHA NO SE PINTA COMO SI CONFIRMARA.
  // Cozen (84/0) y Maudsley (88/0) dan LR+ 0,84 y 0,88: medido, un pre-test del
  // 30% BAJA a 26,5% y a 27,4% cuando la prueba sale positiva. La cifra se
  // imprimia en verde esmeralda, el color que en este panel significa
  // "confirma", con el mismo formato que las pruebas donde sube.
  const posLowersSuspicion = lrPos != null && isFinite(lrPos) && lrPos < 1;
  // Los dos negativos que NO se pueden cifrar, cada uno por su extremo:
  // sensibilidad 100% (LR- = 0) y especificidad 0% (LR- se iria a infinito).
  const sensIsPerfect = lrNeg === 0;
  const especIsZero = lrNeg == null && metrics.specificity === 0 && metrics.sensitivity != null;
  return (
    <div className="pt-1">
      <SubHead label="Probabilidad post-test" />
      {/* EL AVISO VA AQUI, no solo abajo junto a la cita.
          Este bloque es el que mas autoridad aparenta de todo el panel: coge
          una probabilidad previa y devuelve una posterior con un decimal. Si la
          sensibilidad de la que sale no la ha comprobado nadie contra la fuente,
          el numero de salida hereda esa duda, y decirlo en gris de 11 px al
          final de la ficha -- despues de haber ensenado la cifra grande -- es
          decirlo donde ya no cambia nada. Una linea, sin alarmismo: el dato
          sigue siendo util, pero el usuario sabe de que pie cojea. */}
      {unverified && (
        <p className="mt-1.5 text-[11px] leading-snug text-amber-500/90">
          Calculado con cifras aún no comprobadas contra la fuente primaria.
        </p>
      )}
      {/* Dos columnas partidas por un filo vertical, no dos fichas: la receta
          de "una ficha de estadistica -> cifra y rotulo" de LAMINA. */}
      <div className="mt-2 grid grid-cols-2 divide-x divide-line/75">
        <FaganResult
          title="Si sale positivo"
          pretest={pretest}
          value={postPos}
          lr={`LR+ ${lrLabel(lrPos)}`}
          tone={posLowersSuspicion ? 'slate' : 'emerald'}
        />
        <FaganResult
          title="Si sale negativo"
          pretest={pretest}
          value={postNeg}
          lr={`LR− ${lrLabel(lrNeg, 2)}`}
          tone="sky"
        />
      </div>
      {/* LA ESPECIFICIDAD DEL 100% NO ES CERTEZA. Aqui la cifra no se puede
          calcular, asi que se explica por que en vez de imprimir un 100%. */}
      {postPos == null && lrPos != null && (
        <p className="mt-2 text-[11px] leading-snug text-fg2">
          Con especificidad del 100% la razón de verosimilitud es infinita y la
          probabilidad post-test no se puede calcular: el estudio no tuvo ni un
          falso positivo, pero en una muestra finita eso no significa certeza.
          {conservative != null && (
            <>
              {' '}
              Con el extremo bajo del intervalo publicado, un positivo lleva{' '}
              <span className="num text-fg">
                {Math.round(pretest)}%
              </span>{' '}
              a{' '}
              <span className="num text-emerald-300">
                {Math.round(conservative)}%
              </span>
              .
            </>
          )}
        </p>
      )}
      {/* Y LA SENSIBILIDAD DEL 100% TAMPOCO ES CERTEZA, que es el mismo error
          visto desde el otro lado y el que estaba sin guardar: aqui el panel
          imprimia "30% -> 0%" y "LR- 0.00", o sea un negativo que descarta la
          lesion con certeza absoluta. Ver postProb. */}
      {sensIsPerfect && (
        <p className="mt-2 text-[11px] leading-snug text-fg2">
          Con sensibilidad del 100% la razón de verosimilitud negativa sale 0 y la
          probabilidad post-test de un negativo no se puede calcular: en esa muestra
          no hubo ni un falso negativo, pero una muestra sin falsos negativos no es
          una prueba sin falsos negativos. Mira el tamaño de la serie en la fuente,
          abajo: un solo caso distinto cambiaría la cifra. Un negativo aquí hace la
          lesión poco probable; no la descarta.
        </p>
      )}
      {/* LA ESPECIFICIDAD DEL 0%: el otro divisor imposible. Son dos pruebas
          reales (Cozen y Maudsley, Saroja 2014) y no un error de lectura: en esa
          serie TODOS los sujetos con ecografia negativa dieron positivo. El
          panel imprimia "s/d" en la mitad negativa y no decia por que. */}
      {especIsZero && (
        <p className="mt-2 text-[11px] leading-snug text-fg2">
          Con especificidad del 0% ninguna de las dos mitades se sostiene. En esa
          serie todos los sujetos sanos dieron positivo, así que la razón de
          verosimilitud negativa se iría a infinito (un negativo sólo aparecía en
          enfermos), y eso es un artefacto de los pocos negativos de la muestra, no
          un hallazgo: por eso no se cifra. Y por lo mismo un positivo{' '}
          <span className="text-fg">no sube la sospecha</span>: la prueba no
          separa a quien tiene la lesión de quien no.
        </p>
      )}
      {/* Y si la LR+ baja de 1 por cualquier otra combinacion, se dice igual. */}
      {posLowersSuspicion && !especIsZero && (
        <p className="mt-2 text-[11px] leading-snug text-fg2">
          La razón de verosimilitud positiva es menor que 1, así que un positivo{' '}
          <span className="text-fg">no sube la sospecha</span>: la deja por
          debajo de tu probabilidad pre-test. El valor de esta prueba está en el
          negativo.
        </p>
      )}
    </div>
  );
}

function FaganResult({
  title,
  pretest,
  value,
  lr,
  tone,
}: {
  title: string;
  pretest: number;
  value: number | null;
  lr: string;
  /**
   * Emerald es el positivo y sky el negativo (regla 1 del panel). `slate` es la
   * tercera: el positivo de una prueba cuya LR+ es menor que 1, que BAJA la
   * probabilidad. Pintarlo de verde decia "confirma" sobre un numero que cae.
   */
  tone: 'emerald' | 'sky' | 'slate';
}) {
  const text =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'sky'
        ? 'text-sky-300'
        : 'text-fg2';
  // El `.meter` pinta su relleno con el color del texto del elemento.
  const bar =
    tone === 'emerald' ? 'text-emerald-400' : tone === 'sky' ? 'text-sky-400' : 'text-fg3';
  return (
    // Media columna de una fila partida por un filo: aire a cada lado del filo
    // y nada en el borde exterior.
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <span className="block text-[11px] text-fg2">{title}</span>
      <span className="mt-1 flex items-baseline gap-1.5">
        <span className="num text-[11px] text-fg3">{Math.round(pretest)}%</span>
        <span className="num text-[11px] text-fg3">→</span>
        <span className={`readout text-lg ${text}`}>
          {value != null ? `${Math.round(value)}%` : 's/d'}
        </span>
      </span>
      <span className={`meter mt-1.5 block ${bar}`} style={meterStyle(value)} aria-hidden="true" />
      <span className="num mt-1 block text-[11px] text-fg3">{lr}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exam-mode prediction block: two alta/baja choices (sensibilidad, especificidad)
// and a Revelar button; after revealing, per-axis feedback. Shown INSTEAD of the
// metric bars while unrevealed, so the user commits before seeing the numbers.
// ---------------------------------------------------------------------------
function LevelChoice({
  label,
  picked,
  onPick,
}: {
  label: string;
  picked: Level | null;
  onPick: (l: Level) => void;
}) {
  const labelId = useId();
  // ELEGIR UNA DE DOS ES UNA OPCION (`.opt`), NO DOS PASTILLAS. Y se dice con
  // `role="radio"`: la eleccion solo se distinguia por el color del borde, asi
  // que un lector de pantalla oia dos botones iguales y nunca cual estaba
  // marcado.
  const btn = (l: Level, text: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={picked === l}
      onClick={() => onPick(l)}
      className="opt w-auto flex-1 text-[13px]"
    >
      {text}
    </button>
  );
  return (
    <div className="flex items-center gap-2.5">
      <span id={labelId} className="w-[5.5rem] shrink-0 text-[11px] text-fg2">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-1 gap-3">
        {btn('alta', 'Alta')}
        {btn('baja', 'Baja')}
      </div>
    </div>
  );
}

/** Per-axis reveal feedback: your guess vs. the real bucket + the number. */
/**
 * What a sensitivity / specificity figure MEANS for the patient in front of you.
 *
 * The panel showed the two numbers and the SpPin / SnNout mnemonics and assumed
 * the rest. A physio reviewing it wrote "no está muy entendible lo de
 * especificidad y sensibilidad" -- fair: a percentage with a Latin mnemonic next
 * to it explains nothing about what the test just told you. These sentences use
 * THIS test's own figure and count the people it gets wrong, which is the half
 * that decides whether you can act on the result.
 */
export function metricMeaning(axis: 'sens' | 'espec', value: number | undefined): string | null {
  if (value == null || !isFinite(value)) return null;
  const hit = Math.round(value);
  const miss = 100 - hit;
  return axis === 'sens'
    ? `De cada 100 personas que SÍ tienen la lesión, da positivo en ${hit}. ` +
      `A ${miss} se le escapan.`
    : `De cada 100 personas que NO la tienen, da negativo en ${hit}. ` +
      `${miss} dan un falso positivo.`;
}

function AxisResult({
  label,
  axis,
  guess,
  actual,
  value,
}: {
  label: string;
  axis: 'sens' | 'espec';
  guess: Level | null;
  actual: Level | undefined;
  value: number | undefined;
}) {
  if (actual === undefined) {
    return (
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-fg2">{label}</span>
        <span className="text-fg3">sin dato reportado</span>
      </div>
    );
  }
  const ok = guess === actual;
  const meaning = metricMeaning(axis, value);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-fg2">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className={ok ? 'text-emerald-300' : 'text-amber-300'}>
            {ok ? <CheckIcon size={12} /> : <CloseIcon size={12} />}
          </span>
          <span className="num text-fg">
            {value}% ({actual})
          </span>
        </span>
      </div>
      {meaning && (
        <p className="mt-0.5 text-[11px] leading-snug text-fg3">{meaning}</p>
      )}
    </div>
  );
}

function ExamBlock({
  test,
  prediction,
  onPredict,
  onReveal,
}: {
  test: OrthopedicTest;
  prediction: Prediction;
  onPredict: (axis: 'sens' | 'espec', level: Level) => void;
  onReveal: () => void;
}) {
  const sensActual = levelOf(test.metrics.sensitivity);
  const especActual = levelOf(test.metrics.specificity);
  const hasSens = sensActual !== undefined;
  const hasEspec = especActual !== undefined;
  const u = UTILITY[test.utility];
  const wordClass = utilityBacked(test) ? u.text : 'text-fg2';

  // SIN CIFRA NO HAY PREGUNTA, y hasta ahora habia pregunta y premio.
  //
  // `sensOk` sale true cuando no hay sensibilidad publicada, y `especOk` igual:
  // con los dos ejes vacios, `bothOk` era true y el examen respondia "Bien
  // razonado" a quien solo pulsaba Revelar. Medido sobre las 80 pruebas del
  // catalogo, 21 no traen ni sensibilidad ni especificidad (shoulder/
  // relocation, tres cervicales de ligamento, cinco toracicas, lumbar/
  // prone-instability-test, cuatro de cadera, tres de rodilla, tres de codo y
  // dos de tobillo). Asi que a esas no se les pregunta: se les ensena lo unico
  // que SI declaran, que es el uso y su motivo.
  if (!hasSens && !hasEspec) {
    return (
      <div className="pt-1">
        <SubHead label="Aquí no hay perfil que predecir" />
        <p className="mt-1.5 text-[13px] leading-relaxed text-fg2">
          Esta prueba no publica sensibilidad ni especificidad, así que no se puede
          acertar ni fallar su perfil. Lo que sí declara es cómo se usa, y por qué:
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-fg2">
          <span className={wordClass}>Uso: {u.word}.</span>{' '}
          {test.utilityBasis ?? u.tip}
        </p>
      </div>
    );
  }

  if (prediction.revealed) {
    const sensOk = !hasSens || prediction.sens === sensActual;
    const especOk = !hasEspec || prediction.espec === especActual;
    const bothOk = sensOk && especOk;
    // UN SOLO EJE MEDIDO NO ES "BIEN RAZONADO". Cinco pruebas traen una sola de
    // las dos cifras (shoulder/cross-body-adduction, hip/hip-faber,
    // hip/hip-resisted-flexion, elbow/tinel-cubital y elbow/
    // elbow-flexion-pressure): acertar la que hay es acertar la mitad del
    // perfil, y el veredicto lo dice.
    const bothAxes = hasSens && hasEspec;
    const verdict = bothOk
      ? bothAxes
        ? 'Bien razonado'
        : 'Acertaste el único eje medido'
      : bothAxes
        ? 'Revisa el perfil'
        : 'Revisa ese eje';
    return (
      <div className="pt-1">
        <SubHead label="Tu predicción">
          <span
            className={`shrink-0 text-[11px] font-medium ${
              bothOk ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {verdict}
          </span>
        </SubHead>
        <div className="mt-1.5 space-y-1">
          <AxisResult
            label="Sensibilidad"
            axis="sens"
            guess={prediction.sens}
            actual={sensActual}
            value={test.metrics.sensitivity}
          />
          <AxisResult
            label="Especificidad"
            axis="espec"
            guess={prediction.espec}
            actual={especActual}
            value={test.metrics.specificity}
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-fg2">
          <span className={wordClass}>Uso: {u.word}.</span>{' '}
          {utilityBacked(test) ? u.tip : unbackedTip(test)}
        </p>
      </div>
    );
  }

  const canReveal =
    (!hasSens || prediction.sens != null) && (!hasEspec || prediction.espec != null);
  return (
    <div className="pt-1">
      <SubHead label="Predice antes de ver los números" />
      <div className="mt-1.5 space-y-0.5">
        {hasSens ? (
          <LevelChoice
            label="Sensibilidad"
            picked={prediction.sens}
            onPick={(l) => onPredict('sens', l)}
          />
        ) : (
          <p className="py-1 text-[11px] text-fg3">Esta prueba no reporta sensibilidad.</p>
        )}
        {hasEspec ? (
          <LevelChoice
            label="Especificidad"
            picked={prediction.espec}
            onPick={(l) => onPredict('espec', l)}
          />
        ) : (
          <p className="py-1 text-[11px] text-fg3">Esta prueba no reporta especificidad.</p>
        )}
      </div>
      <button
        type="button"
        onClick={onReveal}
        disabled={!canReveal}
        // La accion que cierra la pregunta: un boton que se ve como boton
        // (`btn-line`), no una pastilla de acento. Apagado hasta que estan
        // contestados los ejes que la prueba publica.
        className="btn btn-line btn-sm mt-2.5 text-[11px] w-full text-brand disabled:cursor-not-allowed"
      >
        Revelar
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "How to use" guide (probabilities + Fagan). Shown once, re-openable.
// ---------------------------------------------------------------------------
const HELP_KEY = 'anatris.testsHelp.v1';
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

function HelpStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="num w-4 shrink-0 text-[11px] text-fg3">{n}</span>
      <span className="text-[13px] leading-relaxed text-fg2">{children}</span>
    </li>
  );
}

function HelpCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    // Una seccion del margen con su rotulo y su filo, no una tarjeta: la guia
    // se lee en el mismo plano que la lista que explica.
    <section className="sec">
      <div className="sec-head">
        <Kicker>Cómo leer estos tests</Kicker>
        <span className="sec-rule" />
        <button type="button" onClick={onDismiss} className="btn btn-quiet btn-sm text-[11px]">
          Entendido
        </button>
      </div>
      <ol className="space-y-2">
        <HelpStep n={1}>
          Ajusta la <span className="text-fg">probabilidad pre-test</span>: que
          tan probable crees la lesión antes de explorar.
        </HelpStep>
        {/* Y LO QUE NO TRAE CIFRAS SE DICE AQUI TAMBIEN. De las 80 pruebas, 21
            no publican ninguna de las dos: la ayuda decia "cada prueba trae
            sensibilidad y especificidad" y luego la fila ensenaba "s/d", que
            parece un hueco por rellenar y no una propiedad de la literatura. */}
        <HelpStep n={2}>
          Cada prueba trae <span className="text-sky-300">sensibilidad</span> y{' '}
          <span className="text-emerald-300">especificidad</span> cuando su fuente las
          publica. Un negativo descarta cuando la sensibilidad es alta; un positivo
          confirma cuando la especificidad lo es. Donde la fuente no da la cifra verás{' '}
          <span className="num text-fg2">s/d</span>, y la palabra de uso en
          gris: es un uso propuesto, no un perfil medido.
        </HelpStep>
        <HelpStep n={3}>
          Cada fila muestra a dónde lleva tu sospecha esa prueba si sale positiva. Al
          abrirla verás también el caso negativo.
        </HelpStep>
        <HelpStep n={4}>
          <span className="text-fg">Combinar</span> suma varias pruebas y calcula
          la certeza si todas resultan positivas.
        </HelpStep>
        {/* LA PROMESA, AJUSTADA A LO QUE EL MODELO PUEDE HACER. Decia "resalta
            la estructura evaluada" sin matiz, y medido eran 23 de 65 demos los
            que encendian algo. Ahora se encienden los ligamentos, los meniscos,
            la capsula y el labrum; los nervios y las arterias no estan en el
            sistema de capas de este modelo y cada prueba lo dice en su ficha en
            vez de dejar que el usuario crea que no se enciende por un fallo. */}
        <HelpStep n={5}>
          <span className="text-brand">Demostrar</span> (el botón de play de cada
          fila) reproduce la maniobra sobre el modelo 3D: la posición, la rotación y la
          resistencia que la definen. Resalta además la estructura evaluada cuando el
          modelo la tiene (músculo, ligamento, menisco, cápsula, bolsa serosa); cuando
          no (nervios y arterias no están en sus capas), la ficha lo dice en lugar de
          encender algo parecido.
        </HelpStep>
        <HelpStep n={6}>
          <span className="text-fg">Examen</span> oculta los números y te pide
          predecir si cada prueba es sensible o específica antes de enseñártelos. Sirve
          para comprobar si sabrías <em>elegir</em> la prueba adecuada, no solo leerla.
          Las pruebas sin cifras publicadas no entran: ahí no hay perfil que acertar.
        </HelpStep>
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// One test: a COMPACT row that expands to the full detail.
// ---------------------------------------------------------------------------
function TestRow({
  test,
  expanded,
  onToggle,
  pretest,
  clusterMode,
  selected,
  onToggleSelect,
  demoing,
  onDemo,
  examMode,
  prediction,
  onPredict,
  onReveal,
}: {
  test: OrthopedicTest;
  expanded: boolean;
  onToggle: () => void;
  pretest: number;
  clusterMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  demoing: boolean;
  onDemo: () => void;
  examMode: boolean;
  prediction: Prediction;
  onPredict: (axis: 'sens' | 'espec', level: Level) => void;
  onReveal: () => void;
}) {
  const u = UTILITY[test.utility];
  const lrPos = lrPosNum(test.metrics);
  const lrNeg = lrNegNum(test.metrics);
  const derived = test.metrics.lrPositive == null;
  const sens = test.metrics.sensitivity;
  const espec = test.metrics.specificity;
  // In exam mode the numbers stay hidden until the user reveals their prediction.
  // UNA PRUEBA SIN CIFRAS NO ENTRA EN ESA ESPERA: no hay nada que ocultar, y
  // `revealed` no llega nunca porque ya no se le hace la pregunta, asi que el
  // modo examen le escondia para siempre la interpretacion, la perla y la
  // fuente. Son 21 de las 80.
  const hideMetrics = examMode && isPredictable(test) && !prediction.revealed;
  // The headline number of the whole panel: where this test leaves you if it is
  // positive, from the pretest currently on the slider.
  const postPos = lrPos != null ? postProb(pretest, lrPos) : null;
  // UN POSITIVO QUE BAJA LA SOSPECHA NO SE PINTA DE VERDE. Cozen y Maudsley
  // (especificidad 0% en Saroja 2014) dan LR+ 0,84 y 0,88: medido, la fila
  // imprimia "30 -> 27% si +" en esmeralda, el color de "confirma", con el
  // mismo formato que las pruebas donde la cifra sube.
  const postPosRaises = lrPos != null && lrPos >= 1;
  // La insignia de uso solo se pinta con su color cuando hay una cifra detras.
  const backed = utilityBacked(test);

  return (
    <div
      // Lo usa el enlace profundo de un caso clinico para traer la fila a la vista.
      id={testRowDomId(test.id)}
      // EL FILO DE COLOR NO PUEDE DAR LA RESPUESTA. Es verde en las pruebas que
      // confirman y azul en las que descartan, que es exactamente lo que el modo
      // examen pide predecir: se veia el color antes de contestar, asi que la
      // pregunta no medía nada. Mientras la cifra esta oculta, el filo es gris.
      // Sin fondo al abrirla ni al marcarla: la fila abierta se lee por su
      // regla de color a la izquierda, que baja hasta el final de la ficha, y
      // la marcada por su casilla. Un tinte alrededor de la ficha entera era
      // un recuadro sin borde, que es lo que LAMINA quita. El velo al pasar si
      // queda: es la respuesta de algo que se pulsa.
      className={`border-l-2 transition-colors ${
        hideMetrics || !backed ? 'border-line' : u.bar
      } ${expanded ? '' : 'hover:bg-fg/[0.03]'}`}
    >
      {/* LOS ICONOS VAN SOLO EN LA LINEA DEL NOMBRE. Antes las cuatro lineas
          de la fila vivian en una columna que compartia ancho con guardar, play
          y desplegar (26 + 32 + 21 px y tres huecos de 8), y a 19rem de margen
          quedaban unos 145 px para el texto: el nombre se cortaba con puntos
          suspensivos y la linea de cifras "30 → 44% si +  Se 72  Es 88" (unos
          170 px en mono de 11 px, mas con "(no sube)") se salia por encima de
          los botones. Cuentas hechas con las medidas de las clases, no en
          pantalla. Ahora el nombre parte en dos lineas si hace falta y el
          resto ocupa el ancho entero de la fila. */}
      <div className="flex items-start gap-2 pl-3 pr-1 pt-2">
        {clusterMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Añadir ${test.name} al conjunto`}
            className="mt-2 accent-brand"
          />
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-0 flex-1 py-1 text-left"
        >
          <span
            className={`text-sm leading-snug text-fg ${
              selected ? 'font-semibold' : 'font-medium'
            }`}
          >
            {test.name}
          </span>
        </button>

        {/* Save to "Mi colección" — reachable without expanding, because the
            moment you decide a test matters to you is while scanning the list,
            not after reading the whole card. */}
        <SaveButton kind="test" region={test.region} id={test.id} label={test.name} size="sm" />

        {/* Star action, reachable without expanding. */}
        {test.demo && (
          <button
            type="button"
            onClick={onDemo}
            aria-label={demoing ? `Detener ${test.name}` : `Demostrar ${test.name} en el modelo`}
            /* EL BOTON NO PROMETE MAS DE LO QUE HACE.
               Decia "Reproducir la maniobra" en los 56 demos, y en los que
               llevan `examinerForce` la maniobra ES la fuerza del explorador:
               el cajon anterior, el estres en valgo, McMurray. El rig posa la
               posicion y dibuja la mano, pero no traslada ni empuja, asi que
               ahi lo que se reproduce es la POSICION. */
            title={
              demoing
                ? 'Detener la demostración'
                : test.demo?.examinerForce
                  ? examinerHandDrawn(test.demo)
                    ? 'Colocar la posición en el modelo 3D (la fuerza del explorador se dibuja, no se simula)'
                    : 'Colocar la posición en el modelo 3D (la fuerza del explorador no se simula)'
                  : 'Reproducir la maniobra en el modelo 3D'
            }
            // Un boton cuadrado de 4 px de radio, no un circulo con borde. En
            // reposo se ve como boton (`btn-line`) porque es la funcion estrella
            // y tiene que encontrarse sin abrir nada; mientras el demo corre se
            // rellena (`btn-primary`): solo puede correr uno a la vez, asi que
            // nunca hay dos rellenos en la lista.
            className={`btn btn-icon shrink-0 ${
              demoing ? 'btn-primary' : 'btn-line hover:text-brand'
            }`}
          >
            {demoing ? <StopIcon size={12} /> : <PlayIcon size={12} />}
          </button>
        )}

        {/* LA AUSENCIA DEL PLAY, EXPLICADA.
            24 de las 80 pruebas no tienen demostracion en 3D, y hasta ahora el
            hueco se veia exactamente igual que un error: la fila venia sin
            boton y nadie decia por que, asi que la lectura natural era "esto
            esta sin terminar". Las razones son reales y medidas (el rig gira
            articulaciones y no traslada; los seis movimientos de cadera mueven
            un solo hueso; un reflejo o un pulso no son una postura), y van en
            `noDemo`. Aqui ocupa el sitio del play, en gris y sin pulsar: "3D"
            tachado, sin el circulo de trazos (que era una pastilla vacia) y a
            11 px, el suelo del panel (antes iba a 9). */}
        {!test.demo && test.noDemo && (
          <span
            title={test.noDemo}
            aria-label={`Sin demostración en 3D: ${test.noDemo}`}
            className="num flex h-8 w-8 shrink-0 cursor-help items-center justify-center text-[11px] text-fg3/70 line-through"
          >
            3D
          </span>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? `Cerrar ${test.name}` : `Abrir ${test.name}`}
          className="btn btn-quiet btn-sm btn-icon mt-[3px] shrink-0 text-fg3"
        >
          <ChevronDownIcon
            size={13}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* EL RESTO DE LA FILA, A TODO EL ANCHO. Pulsarlo abre la ficha igual que
          el nombre; el teclado y el lector de pantalla ya tienen el nombre y el
          chevron (los dos con `aria-expanded`), asi que esto no es un tercer
          boton sino un blanco mas grande para el raton y el dedo; el texto se
          sigue leyendo en orden, debajo del nombre. */}
      <div onClick={onToggle} className="cursor-pointer pb-2 pl-3 pr-2">
        {/* WHAT THE TEST IS FOR, on the closed row. The list used to show a
            name, a structure and a pile of numbers, so you had to open a card
            to find out what the maneuver even looks for -- and in exam mode you
            were asked to judge it without that. `purpose` is one line and
            exists for exactly this; a 19rem le caben dos. Con la ficha abierta
            se calla: "Objetivo" la repite entera justo debajo (regla 4: decirlo
            una vez). */}
        {!expanded && (
          // Recorte a dos lineas con el estilo en linea, como en NeuroRootRow:
          // alli se anoto que la utilidad `line-clamp` de Tailwind no tomaba.
          <span
            className="mt-0.5 block overflow-hidden text-[11px] leading-snug text-fg2"
            style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
          >
            {test.purpose}
          </span>
        )}

        <span className="mt-1 flex items-center gap-2 text-[11px] text-fg3">
          <span className="truncate">{test.target}</span>
          {test.demo?.examinerForce === 'resists' && (
            <span className="shrink-0 text-amber-400/90">Resistido</span>
          )}
          {test.demo?.examinerForce === 'applies' && (
            <span className="shrink-0 text-sky-400/90">Pasivo</span>
          )}
        </span>

        {/* LA INSIGNIA DE USO VA CON LAS CIFRAS QUE LA SOSTIENEN. Iba en la
            linea del nombre, a la derecha, quitandole ancho; aqui abre la
            linea de las cifras, que es lo que afirma ("Confirma" es alta
            especificidad, "Descarta" alta sensibilidad), y la frase se lee de
            un tiron: "Confirma · 30 → 72% si + · Se 64 · Es 95".
            En gris, subrayada de puntos y con el motivo en el titulo cuando
            ninguna cifra la respalda: "Confirma" con el titulo "Alta
            especificidad (SpPin): un positivo confirma" se pintaba igual en
            una prueba con especificidad del 99% que en cuatro que no publican
            ninguna cifra. La fila dice lo que es: un uso propuesto por la
            fuente, no un perfil medido. */}
        <span className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px]">
          <span
            className={
              hideMetrics
                ? 'text-fg3'
                : backed
                  ? u.text
                  : 'cursor-help border-b border-dotted border-fg3 text-fg2'
            }
            title={
              hideMetrics
                ? 'Predice el uso antes de revelar'
                : backed
                  ? u.tip
                  : unbackedTip(test)
            }
          >
            {hideMetrics ? 'Uso ?' : u.word}
          </span>
          {/* The pretest -> posttest transition, on every row. This is what
              turns the list from a reference table into a decision aid: the
              slider at the top visibly moves every test at once. */}
          {!hideMetrics &&
            (postPos != null ? (
              <span
                className="num flex items-baseline gap-1"
                title={
                  postPosRaises
                    ? 'A dónde llega tu sospecha si la prueba sale positiva.'
                    : 'Su razón de verosimilitud positiva es menor que 1: un positivo no sube la sospecha, la deja por debajo de la probabilidad pre-test.'
                }
              >
                <span className="text-fg3">{Math.round(pretest)}</span>
                <span className="text-fg3">→</span>
                <span
                  className={`font-semibold ${
                    postPosRaises ? 'text-emerald-300' : 'text-fg2'
                  }`}
                >
                  {Math.round(postPos)}%
                </span>
                <span className="ml-0.5 text-fg3">
                  {postPosRaises ? 'si +' : 'si + (no sube)'}
                </span>
              </span>
            ) : (
              <span className="num text-fg3">sin LR</span>
            ))}
          {!hideMetrics && (
            <>
              <span className="num text-sky-300/80">Se {sens ?? 's/d'}</span>
              <span className="num text-emerald-300/80">Es {espec ?? 's/d'}</span>
            </>
          )}
        </span>
      </div>

      {expanded && (
        <div className="space-y-3 pb-4 pl-3 pr-2 pt-1">
          {!hideMetrics && (
            <div className="space-y-2">
              <MetricBar label="Sensibilidad" value={sens} color="text-sky-400" />
              <MetricBar label="Especificidad" value={espec} color="text-emerald-400" />
              <p className="num pl-[6.125rem] text-[11px] text-fg3">
                LR+ {lrLabel(lrPos)} · LR− {lrLabel(lrNeg, 2)}
                {derived && <span className="ml-1.5 text-fg3">aprox.</span>}
              </p>
            </div>
          )}
          {hideMetrics && <p className="num text-[11px] text-fg3">Métricas ocultas</p>}

          {test.aka && test.aka.length > 0 && (
            <p className="text-[11px] text-fg3">También: {test.aka.join(', ')}</p>
          )}
          <Detail label="Objetivo">{test.purpose}</Detail>
          <Detail label="Maniobra">{test.maneuver}</Detail>
          <Detail label="Positivo">{test.positive}</Detail>

          {/* The prediction comes AFTER the test has been explained. It used to
              render above these three, so exam mode asked you to predict a test's
              accuracy profile before the text saying what the test is and how it
              is performed -- which is guessing, not studying. `Interpretación`
              stays hidden below: that one IS the answer. */}
          {examMode && (
            <ExamBlock
              test={test}
              prediction={prediction}
              onPredict={onPredict}
              onReveal={onReveal}
            />
          )}

          {/* RESISTED TESTS. The manual resistance lives here, in the maneuver
              that actually calls for it, rather than as a switch on the free
              movement. Pressing Demostrar shows the same thing on the model:
              the physio's hand opposing the gesture. */}
          {test.demo?.examinerForce === 'resists' && (
            <div className="border-l-2 border-amber-400/60 pl-3">
              <Kicker>Prueba resistida</Kicker>
              <ol className="mt-1 space-y-1 text-[13px] leading-relaxed text-fg2">
                <li>1. El paciente sostiene la posición y empuja.</li>
                <li>2. Aplica resistencia en el segmento distal, oponiéndote al movimiento.</li>
              </ol>
              {/* Solo se promete la mano donde el rig la dibuja (examinerHand). */}
              {examinerHandDrawn(test.demo) && (
                <p className="mt-1 text-[11px] text-fg3">
                  En Demostrar verás la mano del fisio resistiendo sobre el modelo.
                </p>
              )}
            </div>
          )}

          {/* PRUEBA PASIVA. Lo contrario de la anterior, y hasta ahora imprimia
              el mismo texto: siete pruebas de rodilla pedian al paciente que
              empujara cuando la contraccion es justo lo que invalida un cajon
              anterior o un estres en valgo. La mano sigue en escena --el
              explorador SI apoya en el segmento distal-- pero la fuerza es
              suya. */}
          {test.demo?.examinerForce === 'applies' && (
            <div className="border-l-2 border-sky-400/60 pl-3">
              <Kicker>Prueba pasiva</Kicker>
              <ol className="mt-1 space-y-1 text-[13px] leading-relaxed text-fg2">
                <li>1. El paciente permanece relajado: no empuja.</li>
                <li>2. La fuerza la aplicas tú sobre el segmento distal.</li>
              </ol>
              <p className="mt-1 text-[11px] text-fg3">
                Una contracción del paciente enmascara el hallazgo.
                {examinerHandDrawn(test.demo) && ' En Demostrar verás dónde se apoya la mano del fisio.'}
              </p>
            </div>
          )}

          {/* POR QUE la etiqueta dice lo que dice, cuando la cifra de arriba no
              lo respalda por si sola. Solo lo llevan las dos pruebas en las que
              eso pasa, y es justo la pregunta que hace un alumno despierto:
              "si la sensibilidad es 77%, por que lo llamais SnNout?". */}
          {!hideMetrics && test.utilityBasis && (
            <Detail label="Por qué ese uso">{test.utilityBasis}</Detail>
          )}
          {/* Interpretacion reveals the intended use (the exam answer); hold it
              until the prediction is revealed. */}
          {!hideMetrics && <Detail label="Interpretación">{test.interpretation}</Detail>}
          {!hideMetrics && (
            <FaganBlock
              metrics={test.metrics}
              pretest={pretest}
              unverified={test.cite.some((c) => !c.verified)}
            />
          )}

          {test.demo?.note && (
            <p className="text-[11px] leading-snug text-fg3">En el modelo: {test.demo.note}</p>
          )}
          {/* LA PROMESA, Y SU LIMITE. La ayuda dice que Demostrar resalta la
              estructura evaluada, y durante anos 42 de los 64 demos no
              encendian nada: el unico resalte que habia resolvia MUSCULOS y
              estas pruebas valoran ligamentos, meniscos, capsulas y nervios.
              Ahora lo que se puede encender se nombra, y lo que no se puede
              se dice -- medido contra el rig, no contra el modelo de Explorar
              (`npm run audit-structures`). Decirlo aqui, y no solo al pulsar
              play, es lo que evita que el alumno crea que vio una estructura
              que el modelo no tiene. */}
          {(test.demo?.highlightStructureIds ?? []).length > 0 && (
            <p className="text-[11px] leading-snug text-fg3">
              Se resalta:{' '}
              <span className="text-fg2">
                {(test.demo?.highlightStructureIds ?? [])
                  .map((id) => structureLabel(id))
                  .filter((l): l is string => l != null)
                  .join(' · ')}
              </span>
            </p>
          )}
          {/* El limite del modelo es un aviso: regla ambar a la izquierda
              (`.note-warn`), no texto ambar suelto. */}
          {test.demo?.cannotShow && (
            <p className="note note-warn text-[11px]">{test.demo.cannotShow}</p>
          )}
          {!test.demo && test.noDemo && (
            <p className="note note-warn text-[11px]">Sin demostración en 3D: {test.noDemo}</p>
          )}
          {!hideMetrics && test.metrics.note && (
            <p className="text-[11px] leading-relaxed text-fg2">{test.metrics.note}</p>
          )}
          {/* La perla se guarda hasta revelar: varias dicen literalmente "muy
              especifico" o "poco sensible", que es la respuesta. */}
          {!hideMetrics && test.pearl && (
            <p className="note text-[13px] leading-relaxed">{test.pearl}</p>
          )}
          {/* LA FICHA DE LA FUENTE, no solo su nombre.
              Una sensibilidad del 94% no significa lo mismo medida sobre 24
              mujeres de una consulta que en un metanalisis de nueve estudios,
              ni comparada contra una resonancia que contra un bloqueo
              anestesico. Eso es justo lo que un fisio necesita para decidir si
              la cifra le sirve, y hasta ahora no estaba: la cita era una linea
              gris con el titulo. Ahora cada fuente dice QUE cifra respalda
              (`locator`), SOBRE QUIEN se midio (`sample`) y CONTRA QUE
              (`standard`). Los tres campos son opcionales: una fuente que no
              los traiga se dibuja exactamente como antes. */}
          <div className="space-y-1.5 pt-0.5">
            {test.cite.length > 0 && (
              <SubHead label={test.cite.length > 1 ? 'Fuentes' : 'Fuente'} />
            )}
            {test.cite.map((c) => {
              const ref = getReference(c.ref as ReferenceId);
              if (!ref) return null;
              return (
                <div key={c.ref} className="text-[11px] leading-snug text-fg3">
                  <p>
                    {formatReference(ref)}
                    {!c.verified && (
                      <span
                        className="ml-1.5 text-amber-500/80"
                        title="Valores por verificar contra la fuente primaria"
                      >
                        por verificar
                      </span>
                    )}
                  </p>
                  {/* El localizador es literalmente la cifra: "Cozen:
                      sensibilidad 84%, especificidad 0%". Con las metricas
                      ocultas, imprimirlo era regalar la respuesta dos lineas
                      mas abajo de la pregunta. La cita --autor y ano-- se queda:
                      saber de donde sale el dato no lo adelanta. */}
                  {!hideMetrics && c.locator && <p className="text-fg2">{c.locator}</p>}
                  {(ref.sample || ref.standard) && (
                    <p className="text-fg3">
                      {ref.sample}
                      {ref.sample && ref.standard ? ' · ' : ''}
                      {ref.standard}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Id de DOM de la fila de una prueba, para traerla a la vista desde fuera. */
export const testRowDomId = (testId: string) => `prueba-${testId}`;

export function OrthopedicTestsPanel({
  region,
  open,
  onOpenChange,
  onOpenEvidence,
  bare = false,
  focusTestId = null,
}: {
  region: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open the region's full "Evidencia" page (all sources + PubMed links). */
  onOpenEvidence?: () => void;
  /**
   * Render for the compact bottom sheet: no frosted panel, no fixed width, no
   * close button. The sheet's tab bar already frames and dismisses this, so the
   * floating chrome would be a second card inside the first -- and `w-[24rem]`
   * is wider than the phone it is sitting on.
   */
  bare?: boolean;
  /**
   * Prueba que hay que abrir nada mas montar, porque alguien llego aqui desde
   * un caso clinico (/<region>/movimiento?prueba=<id>). Se despliega su ficha
   * y se la trae a la vista; si la region no la tiene, no pasa nada.
   */
  focusTestId?: string | null;
}) {
  const tests = useMemo(() => testsForRegion(region), [region]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pretest, setPretest] = useState(30);
  const [clusterMode, setClusterMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Filters. A region can carry a couple of dozen maneuvers, and until now the
  // only way to reach one was to scroll and read every name.
  const [query, setQuery] = useState('');
  const [only3d, setOnly3d] = useState(false);
  // The demoChannel arbiter owns which demo (if any) animates the rig. Deriving
  // demoId from it (instead of local state) means a demo started here stops
  // cleanly the moment the console or the neuro panel reclaims the rig.
  const activeDemo = useActiveDemo();
  const demoId = activeDemo?.startsWith(DEMO_NS) ? activeDemo.slice(DEMO_NS.length) : null;
  const [showHelp, setShowHelp] = useState(() => !readHelpSeen());
  // Exam mode: hide metrics, let the user predict per test, then reveal.
  const [examMode, setExamMode] = useState(false);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});

  // LLEGADA DESDE UN CASO CLINICO. El caso enlaza la prueba que acaba de
  // explicar; aqui se despliega su ficha y se la trae a la vista, para que el
  // usuario aterrice EN la prueba y no en una lista de veinte donde tiene que
  // buscarla. Se limpia el filtro de texto por si venia escrito de antes y la
  // dejaria fuera de la lista.
  useEffect(() => {
    if (!focusTestId || !tests.some((t) => t.id === focusTestId)) return;
    setQuery('');
    setOnly3d(false);
    setExpandedId(focusTestId);
    // Tras el repintado que despliega la ficha, no antes.
    const raf = requestAnimationFrame(() => {
      document
        .getElementById(testRowDomId(focusTestId))
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [focusTestId, tests]);

  const dismissHelp = () => {
    setShowHelp(false);
    writeHelpSeen();
  };

  const toggleExam = () => {
    setExamMode((on) => {
      const next = !on;
      // Exam and cluster are mutually exclusive (cluster leaks combined numbers).
      if (next) {
        setClusterMode(false);
        setSelected(new Set());
        track(EVENTS.examModeStarted, { region });
      }
      return next;
    });
  };

  /** Expand/collapse a test card, reporting which test was opened. */
  const toggleTest = (id: string) => {
    setExpandedId((cur) => {
      const next = cur === id ? null : id;
      if (next) track(EVENTS.testOpened, { region, test: next });
      return next;
    });
  };
  const predict = (testId: string, axis: 'sens' | 'espec', level: Level) =>
    setPredictions((cur) => {
      const p = cur[testId] ?? EMPTY_PREDICTION;
      if (p.revealed) return cur;
      return { ...cur, [testId]: { ...p, [axis]: level } };
    });
  const reveal = (testId: string) =>
    setPredictions((cur) => {
      const p = cur[testId] ?? EMPTY_PREDICTION;
      return { ...cur, [testId]: { ...p, revealed: true } };
    });
  /**
   * BORRAR LO CONTESTADO, para poder repasar.
   *
   * Una prediccion revelada no se podia deshacer: la unica forma de volver a
   * intentarlo era recargar la pagina, y eso en una region premium vuelve a
   * descargar el contenido. Un modo examen que solo se puede hacer una vez por
   * sesion no sirve para estudiar, que es para lo que esta.
   */
  const resetPredictions = () => setPredictions({});

  /**
   * EL MARCADOR DEL EXAMEN: cuantas ha contestado y cuantas acerto.
   *
   * El modo examen corregia prueba por prueba y no decia nada del conjunto, que
   * es justo lo que se quiere saber al repasar ("de las doce de rodilla, cuantas
   * tengo claras"). Se puntua con la misma regla que la ficha (ALTA_THRESHOLD, y
   * un eje sin dato publicado no cuenta ni a favor ni en contra).
   */
  const { answered, correct } = useMemo(() => {
    let a = 0;
    let c = 0;
    for (const t of tests) {
      const pr = predictions[t.id];
      if (!pr?.revealed) continue;
      // Y una prueba sin cifras no cuenta: no se le hace pregunta, asi que
      // tampoco puede sumar una acertada (21 de las 80 sumaban una gratis).
      if (!isPredictable(t)) continue;
      a += 1;
      const sensActual = levelOf(t.metrics.sensitivity);
      const especActual = levelOf(t.metrics.specificity);
      const sensOk = sensActual === undefined || pr.sens === sensActual;
      const especOk = especActual === undefined || pr.espec === especActual;
      if (sensOk && especOk) c += 1;
    }
    return { answered: a, correct: c };
  }, [tests, predictions]);

  // Name, alias and target all match, because a physio looking for "Neer" and a
  // student looking for "supraespinoso" are both looking for the same row.
  const visible = useMemo(
    () => tests.filter((t) => (!only3d || t.demo != null) && testMatchesQuery(t, query)),
    [tests, query, only3d],
  );

  const demoCount = useMemo(() => tests.filter((t) => t.demo).length, [tests]);

  const groups = useMemo(() => {
    const map = new Map<string, OrthopedicTest[]>();
    for (const t of visible) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return [...map.entries()];
  }, [visible]);

  const byId = useMemo(() => new Map(tests.map((t) => [t.id, t])), [tests]);

  // Combined post-test if every selected test is positive (product of LR+,
  // assuming conditional independence -- flagged in the UI).
  const cluster = useMemo((): {
    count: number;
    /** null: ninguna de las marcadas trae razon de verosimilitud. */
    lr: number | null;
    post: number | null;
    /** Las marcadas que NO entran en el producto, por nombre. */
    skipped: string[];
  } | null => {
    if (selected.size === 0) return null;
    let lr = 1;
    let known = 0;
    const skipped: string[] = [];
    for (const id of selected) {
      const t = byId.get(id);
      if (!t) continue;
      const l = lrPosNum(t.metrics);
      if (l == null) {
        skipped.push(t.name);
        continue;
      }
      // Una LR+ infinita (especificidad 100% en una muestra finita) arrastraba
      // el producto a 1e6, es decir al 100%, con el mismo error que la ficha
      // individual. Si una de las pruebas elegidas la trae, el conjunto no se
      // puede cifrar y se dice.
      if (!isFinite(l)) return { count: selected.size, lr: Infinity, post: null, skipped: [] };
      lr *= l;
      known += 1;
    }
    // Antes devolvia null y el bloque entero desaparecia (ver el render).
    if (known === 0) return { count: selected.size, lr: null, post: null, skipped };
    return { count: selected.size, lr, post: postProb(pretest, lr), skipped };
  }, [selected, byId, pretest]);

  // CUANDO EL CONJUNTO SE HA MEDIDO, se usa la cifra del estudio y no el
  // producto de razones de verosimilitud. Multiplicarlas supone que las pruebas
  // son independientes, y en la sacroiliaca las cinco provocan la MISMA
  // articulacion: el producto disparia la probabilidad hasta un numero que
  // ningun estudio respalda. Ver src/data/testClusters.ts.
  const measured = useMemo(() => {
    if (!region) return null;
    const c = measuredCluster(region, selected);
    if (!c) return null;
    // LA RAZON PUBLICADA MANDA SOBRE LA DERIVADA (ver clusterLrPositive).
    const lr = clusterLrPositive(c);
    if (lr == null) return null;
    return { cluster: c, lr, post: postProb(pretest, lr) };
  }, [region, selected, pretest]);

  // Y MIENTRAS AUN FALTAN POSITIVAS, la referencia del estudio tambien se
  // enseña. Por debajo del umbral el panel vuelve a multiplicar razones de
  // verosimilitud, que es la estimacion MAS OPTIMISTA, y la advertencia que lo
  // explica vivia dentro del bloque del conjunto medido: solo aparecia cuando
  // el conjunto ya se aplicaba, es decir cuando la cifra ya era la buena.
  // Medido con las razones del propio catalogo: dos pruebas sacroiliacas
  // marcadas dan 30% -> 79,3% (producto 8,96), y la cifra medida de Laslett
  // para tres o mas positivas es LR+ 4,27, o sea 30% -> 64,7%.
  const partial = useMemo(() => {
    if (!region) return null;
    const c = partialCluster(region, selected);
    if (!c) return null;
    const lr = clusterLrPositive(c);
    if (lr == null) return null;
    return { cluster: c, lr, post: postProb(pretest, lr), missing: c.minPositive - selected.size };
  }, [region, selected, pretest]);

  const startDemo = (t: OrthopedicTest) => {
    if (t.demo) demoChannel.start(DEMO_NS + t.id);
  };
  const stopDemo = () => demoChannel.stop();

  // ANIMATE the active demo: sweep 0 -> target -> 0 (with holds) so the maneuver
  // is shown MOVING, not snapped. Loops while active; releases on stop/unmount.
  // Honors prefers-reduced-motion (snap to the provocative position).
  useEffect(() => {
    if (!demoId) return;
    // CON EL PANEL CERRADO, NO. Cerrar con la X solo pone `rightPanel = 'none'`
    // y el panel sigue MONTADO, asi que este bucle seguia conduciendo el rig:
    // la maniobra se repetia en bucle, con la piel de cristal y la mano que
    // resiste puestas, y ya no quedaba ningun boton para pararla (el play de la
    // consola no responde mientras el demo posee el canal). En movil no pasa
    // porque el panel va en modo `bare` y cambiar de pestana lo desmonta.
    if (!open && !bare) {
      demoChannel.stop(DEMO_NS + demoId);
      return;
    }
    const test = byId.get(demoId);
    const d = test?.demo;
    if (!test || !d) return;
    const side = d.side ?? 'R';
    const target = d.angleDeg;
    // EL ARCO COMPARTIDO: 0 GRADOS ES EL FINAL DEL MOVIMIENTO, NO SU INICIO.
    //
    // En el codo y en la rodilla, flexion y extension recorren UN SOLO arco: 0
    // es la articulacion estirada y el maximo es la flexion completa, asi que
    // la extension es el regreso hacia 0 (`arcFrom: 'max'` en boneMap). Este
    // bucle no lo miraba: barria 0 -> objetivo y hacia la espera LARGA en el
    // objetivo, que en una extension es el extremo DOBLADO. Medido sobre el
    // catalogo cuando se escribio, eran tres pruebas del codo --cozen, mill y
    // maudsley, con `elbow-extension` a 10 grados-- y las tres dicen en su
    // maniobra "codo en extension": el modelo sostenia los 10 grados de flexion
    // y pasaba de largo por la postura que la prueba nombra. Desde la revision
    // del 15 nov Mill parte de 90 y la epicondilalgia medial tambien usa
    // `elbow-extension`; la regla es la misma (y los bancos la toman de
    // `boneMap.demoHeldAngle`). El NeuroPanel ya lo resolvio asi para los
    // miotomas de C7 y L3.
    const ctrl = getBoneControl(d.movementId);
    const fromMax = ctrl?.kind === 'joint' && ctrl.arcFrom === 'max';
    // Y LA TARJETA ANUNCIA LA POSICION QUE SE SOSTIENE, no el extremo del arco:
    // con `targetDeg: target` a secas, el readout imprimia "Posicion de prueba
    // 10" mientras el modelo se para a proposito en 0.
    const heldDeg = fromMax ? 0 : target;
    const highlight = d.highlightMuscleId
      ? [{ muscleId: d.highlightMuscleId, role: 'prime-mover' as const, level: 1 }]
      : [];
    // Built ONCE per demo, not per frame: the readout compares it by identity to
    // decide whether anything changed, so a fresh object every frame would defeat
    // the very re-render it is meant to stop.
    const demoInfo = {
      label: test.name,
      targetDeg: heldDeg,
      structure: test.target,
      examinerForce: d.examinerForce,
      handDrawn: examinerHandDrawn(d),
      // Lo que se enciende, y lo que no se puede encender: el readout tiene que
      // poder decir las dos cosas mientras el demo corre.
      structureLabels: (d.highlightStructureIds ?? [])
        .map((id) => structureLabel(id))
        .filter((x): x is string => x != null),
      cannotShow: d.cannotShow,
      note: d.note,
    };
    // ghostSkin: true forces the translucent glass skin for the WHOLE demo, even
    // for tests that glow no muscle, so the body never shows as opaque skin that
    // clips/"se sale" while the joint moves.
    const push = (deg: number, components: typeof d.components) =>
      rigChannel.set({
        movementId: d.movementId,
        side,
        angleDeg: deg,
        highlight,
        showMarkers: false,
        ghostSkin: true,
        // La mano del explorador se dibuja en las dos clases de maniobra con
        // contacto: la resistida (Jobe, Speed, O'Brien) y la pasiva (estres en
        // valgo). Quien hace la fuerza lo dice `examinerForce`, y de eso depende
        // el TEXTO; la mano, ademas, se puede quitar (`examinerHand: false`)
        // donde la mano generica empujaria en otra direccion que la prueba.
        resistance: examinerHandDrawn(d),
        // La estructura que la prueba VALORA (ligamento, menisco, capsula,
        // labrum). RigOverlays la fuerza visible: la capa conectiva esta
        // apagada por defecto, asi que sin eso el resalte caia en mallas
        // invisibles y el boton seguia sin encender nada.
        structures: d.highlightStructureIds,
        // The joints that make this maneuver itself, YA ESCALADOS por la linea
        // de tiempo (src/lib/demoTimeline.ts): entran despues de la base, no
        // fijos desde el principio. Ver `startDemoLoop`.
        components,
        // Fixed for the whole demo, so the readout can describe the maneuver
        // instead of recomputing (and flickering) its analysis every frame.
        demo: demoInfo,
      });
    // On stop, RELEASE the channel (only if this demo still owns it): the
    // console reacts by re-pushing its own live state, which restores the pose
    // and clears the demo-only flags (ghostSkin, resistance).
    //
    // PERO LA CONSOLA PUEDE NO ESTAR MONTADA, y entonces no reacciona nadie.
    // En tableta y movil el laboratorio es una hoja con pestañas: parar el demo
    // desde la pestaña de Tests dejaba el rig tal cual --piel de cristal, la
    // articulacion posada, los musculos encendidos y la mano del explorador--
    // porque el unico sitio que devuelve el rig a reposo es la consola, que
    // vive en OTRA pestaña y esta desmontada. Asi que al soltar se empuja
    // tambien la pose guardada de la consola (consolePoseStore, lo que el
    // usuario tenia puesto en esta region) o el reposo si no hay ninguna.
    // Tiene que ser `setFromConsole` y no `set`: `set` es un PARCHE y dejaria
    // puestos justo los campos que solo pone un demo; `setFromConsole` limpia
    // components/ghostSkin/resistance/demo/structures de una pieza.
    //
    // Y LOS MARCADORES VUELVEN. El demo empuja `showMarkers: false` y
    // `setFromConsole` no lo toca (no es un campo de demo, ver DEMO_ONLY_RESET
    // en RigModel): con la consola desmontada --la hoja movil, pestana Tests--
    // parar el demo dejaba el modelo sin marcadores hasta volver a la pestana
    // Movimiento. El panel Neuro ya los devolvia; este no. Con la consola
    // montada da igual: ella vuelve a empujar su propio valor justo despues.
    const release = () => {
      demoChannel.stop(DEMO_NS + demoId);
      const pose = readPose(region);
      rigChannel.setFromConsole(
        pose
          ? {
              movementId: pose.movementId,
              side: pose.side,
              angleDeg: pose.angleDeg,
              highlight: [],
              showMarkers: true,
            }
          : { movementId: null, angleDeg: 0, highlight: [], implicated: [], showMarkers: true },
      );
    };

    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // EL BUCLE ES EL COMPARTIDO (src/lib/demoTimeline.ts). Este panel llevaba
    // el suyo, con los componentes FIJOS durante todo el barrido: en
    // Hawkins-Kennedy el codo a 90 y la rotacion interna a 70 se aplicaban ya
    // con el brazo abajo, y el antebrazo --y la mano del examinador, que va
    // colocada sobre el-- quedaba DENTRO del torax. MEDIDO con
    // `npm run audit-demo-path`: el 19,4% del antebrazo y la mano dentro del
    // tronco, con un punto en el centro mismo del torax; con la base primero y
    // la maniobra despues, el 0,2% (el roce del brazo en reposo).
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
  }, [demoId, byId, open, bare, region]);

  if (tests.length === 0) return null;

  if (!open && !bare) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="instrument pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-fg2 transition-colors hover:text-fg"
      >
        <TestTubeIcon />
        Tests ortopédicos
        <span className="num text-[11px] text-fg3">
          {tests.length}
        </span>
      </button>
    );
  }

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
      {/* LA CABECERA NO REPITE LA PESTANA. Montado en `bare`, el panel vive
          bajo una pestana que ya dice "Tests": el titulo "Tests ortopedicos"
          con su icono era la misma palabra dos veces, una encima de la otra, y
          costaba una linea entera del margen. Solo la variante flotante, que no
          tiene pestana, conserva titulo y boton de cerrar. */}
      {!bare && (
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold text-fg">
            <TestTubeIcon />
            Tests ortopédicos
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar tests"
            className="btn btn-quiet btn-sm btn-icon -mr-1 text-fg3"
          >
            <CloseIcon size={15} />
          </button>
        </div>
      )}

      {/* Pretest slider: the control every number in the list answers to. La
          cifra va grande (`.readout`) porque es la que mueve todas las demas. */}
      <section className="sec">
        <div className="sec-head">
          <Kicker>Probabilidad pre-test</Kicker>
          <span className="sec-rule" />
          <span className="readout text-lg">{Math.round(pretest)}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={99}
          step={1}
          value={pretest}
          onChange={(e) => setPretest(Number(e.target.value))}
          aria-label="Probabilidad pre-test"
          className="w-full accent-brand"
        />
        <p className="mt-1 text-[11px] text-fg3">Tu sospecha antes de explorar.</p>

        {/* LOS TRES MODOS, A LA VISTA Y JUNTOS. Examen y Guia eran dos
            pastillas en la esquina de la cabecera y Combinar otra mas al lado
            del deslizador: tres sitios para tres interruptores de lo mismo (que
            ensena el panel). Ahora son una fila de texto que se enciende en el
            color de estado, con `aria-pressed`. Combinar no aparece en examen
            porque los dos se excluyen: las cifras combinadas daban la
            respuesta. */}
        <div className="-mx-2 mt-2 flex items-center gap-0.5">
          {!examMode && (
            <ModeToggle
              active={clusterMode}
              onClick={() => {
                setClusterMode((c) => !c);
                setSelected(new Set());
              }}
              label="Combinar"
              title="Combinar: marca varias pruebas positivas y calcula la probabilidad conjunta"
            >
              <ClusterIcon />
            </ModeToggle>
          )}
          <ModeToggle
            active={examMode}
            onClick={toggleExam}
            label="Examen"
            title="Modo examen: oculta las cifras y te pide predecir el perfil de cada prueba antes de verlas"
          >
            <ExamIcon />
          </ModeToggle>
          <span className="flex-1" />
          <ModeToggle
            active={showHelp}
            onClick={() => setShowHelp((s) => !s)}
            label="Guía"
            title="Cómo se usa este panel: pre-test, sensibilidad y especificidad, combinar pruebas, demostrar la maniobra"
          >
            <InfoIcon />
          </ModeToggle>
        </div>

        {/* A mode that changes what the panel shows has to say so where it can
            be READ. Both buttons carried their explanation in a `title`, which
            never appears on a touch screen and never appears at a glance --
            "Examen y guía no sé para qué es". Una nota con la regla del color
            de estado, no un recuadro. Y "sensible" va en el azul de la
            sensibilidad y "especifica" en el verde de la especificidad (regla
            1): las dos palabras iban en azul. */}
        {examMode && (
          <div className="note note-brand mt-2.5 text-[11px] leading-snug">
            <p>
              Los números están ocultos a propósito. Lee qué hace cada prueba, predice
              si es <span className="text-sky-300">sensible</span> (un negativo
              descarta) o <span className="text-emerald-300">específica</span> (un
              positivo confirma), y compáralo con la cifra real.
            </p>
            {answered > 0 && (
              <p className="mt-1 flex items-center gap-2">
                <span className="text-fg">
                  <span className="num">
                    {correct}/{answered}
                  </span>{' '}
                  acertadas
                </span>
                <button
                  type="button"
                  onClick={resetPredictions}
                  className="btn btn-quiet btn-sm text-[11px] text-brand"
                >
                  Empezar de nuevo
                </button>
              </p>
            )}
          </div>
        )}
      </section>

      <div className="rule" />

      {/* Filters. Rotulo con la cuenta de lo que se ve, el filtro de 3D
          despues del filo y el buscador como una linea (`.field`), no como una
          caja. */}
      <section className="sec">
        <div className="sec-head">
          <Kicker>
            {visible.length === tests.length
              ? `${tests.length} pruebas`
              : `${visible.length} de ${tests.length}`}
          </Kicker>
          <span className="sec-rule" />
          <button
            type="button"
            onClick={() => setOnly3d((v) => !v)}
            aria-pressed={only3d}
            title="Mostrar solo las pruebas con maniobra en el modelo 3D"
            className={`btn btn-quiet btn-sm -mr-2 shrink-0 text-[11px] ${only3d ? 'text-brand' : ''}`}
          >
            <PlayIcon size={10} />
            Solo 3D
            <span className="num text-[11px] text-fg3">{demoCount}</span>
          </button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar prueba, estructura o grupo"
          aria-label="Buscar prueba"
          className="field"
        />
      </section>

      {/* Scrollable body */}
      <div className={bare ? '' : 'min-h-0 flex-1 overflow-y-auto'}>
        {showHelp && <HelpCard onDismiss={dismissHelp} />}

        {/* UN FILTRO SIN RESULTADOS NO ES UN CALLEJON: se puede deshacer desde
            aqui, sin volver arriba a vaciar el campo y apagar el 3D. */}
        {groups.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-[13px] text-fg3">Ninguna prueba coincide con el filtro.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setOnly3d(false);
              }}
              className="btn btn-quiet btn-sm mt-2 text-[11px] text-brand"
            >
              Quitar el filtro
            </button>
          </div>
        )}

        {groups.map(([category, list]) => (
          <section key={category} className="pt-3">
            {/* Rotulo + filo + cuenta. El nombre del grupo puede partir en dos
                lineas: "Epicondilalgia medial (codo de golfista)" son 41
                caracteres y en versalitas de 11 px no caben en 19rem. */}
            <div className="mb-1.5 flex items-center gap-2.5 px-4">
              <h3 className="kicker min-w-0 text-[11px] leading-snug">{category}</h3>
              <span className="sec-rule" />
              <span className="num text-[11px] text-fg3">{list.length}</span>
            </div>
            <div className="pl-4 pr-2">
              {list.map((t) => (
                <TestRow
                  key={t.id}
                  test={t}
                  expanded={expandedId === t.id}
                  onToggle={() => toggleTest(t.id)}
                  pretest={pretest}
                  clusterMode={clusterMode}
                  selected={selected.has(t.id)}
                  onToggleSelect={() =>
                    setSelected((cur) => {
                      const next = new Set(cur);
                      if (next.has(t.id)) next.delete(t.id);
                      else next.add(t.id);
                      return next;
                    })
                  }
                  demoing={demoId === t.id}
                  onDemo={() => (demoId === t.id ? stopDemo() : startDemo(t))}
                  examMode={examMode}
                  prediction={predictions[t.id] ?? EMPTY_PREDICTION}
                  onPredict={(axis, level) => predict(t.id, axis, level)}
                  onReveal={() => reveal(t.id)}
                />
              ))}
            </div>
          </section>
        ))}

        <div className="px-4 py-4">
          {onOpenEvidence && (
            <button
              type="button"
              onClick={onOpenEvidence}
              className="btn btn-quiet btn-sm -ml-2 mb-2 text-[11px] text-brand"
            >
              <BookIcon />
              Ver toda la evidencia
            </button>
          )}
          <p className="text-[11px] leading-relaxed text-fg3">
            Valores orientativos de la literatura, por verificar contra la fuente
            primaria. Interpreta cada prueba dentro del cuadro clínico y en conjunto,
            no de forma aislada.
          </p>
        </div>
      </div>

      {/* EL RESULTADO DEL CONJUNTO, PEGADO AL PIE.
          En la variante flotante este bloque vivia debajo de una lista con
          scroll propio, asi que siempre se veia. En `bare` el scroll es el de
          la pestana que contiene el panel (MovementView y MobileLabSheet), y
          el bloque quedaba DESPUES de toda la lista y del aviso final: se
          marcaba la casilla de una prueba de arriba y la probabilidad
          conjunta aparecia fuera de la vista, varias pantallas mas abajo, sin
          que nada lo dijera. Ahora se pega al pie del scroll (`sticky`), con
          fondo de pagina y un filo encima, como el pie de una lamina; y en
          modo Combinar sin nada marcado dice que hay que marcar, en vez de
          no estar. Acotado a 45vh en escritorio: con el conjunto medido y sus
          tres avisos no puede tapar la lista que se esta marcando.
          EN LA HOJA MOVIL SOLO SE PEGA EL TITULAR. El bloque entero pegado
          podia medir mas que el area visible de la hoja plegada (MEDIDO en la
          revision de la tanda 2a, a 375 x 812: unos 164 px utiles frente a un
          pie de 186 px con dos sacroiliacas y 318 con el conjunto de Laslett)
          y la tapaba entera: la lista, el pre-test y el interruptor Combinar
          quedaban debajo, y salir obligaba a cambiar de pestana, que desmonta
          el panel y borra la seleccion. Por debajo de `lg` el bloque va en
          flujo tras la lista y lo que se pega es UNA linea, el rotulo y la
          cifra (unos 40 px); en escritorio el bloque entero, como antes.
          La SOMBRA de abajo, del color de la pagina, tapa el relleno inferior
          de la hoja movil (`pb-safe`, 1 rem como minimo): lo pegado queda por
          encima de ese relleno y por la franja asomaba la lista (visto a
          375 px). */}
      {clusterMode && (measured || cluster) && (
        <div className="sticky bottom-0 z-10 flex items-baseline justify-between gap-3 border-t border-line/75 bg-page px-4 py-2.5 shadow-[0_max(1rem,env(safe-area-inset-bottom))_0_0_rgb(var(--c-page))] lg:hidden">
          <Kicker className="min-w-0 truncate leading-snug">
            {measured
              ? measured.cluster.name
              : `${cluster!.count} prueba${cluster!.count > 1 ? 's' : ''} positiva${cluster!.count > 1 ? 's' : ''} a la vez`}
          </Kicker>
          <span className="flex shrink-0 items-baseline gap-1.5">
            <span className="num text-[11px] text-fg3">{Math.round(pretest)}%</span>
            <span className="num text-[11px] text-fg3">→</span>
            <span className="readout text-lg text-emerald-300">
              {(measured ? measured.post : cluster!.post) != null
                ? `${Math.round((measured ? measured.post : cluster!.post) as number)}%`
                : 's/d'}
            </span>
          </span>
        </div>
      )}
      {clusterMode && (
        <div className="border-t border-line/75 bg-page px-4 py-3 lg:sticky lg:bottom-0 lg:z-10 lg:max-h-[45vh] lg:overflow-y-auto">
          {!measured && !cluster && (
            <p className="text-[11px] leading-snug text-fg2">
              Marca con la casilla las pruebas que salieron positivas: aquí verás la
              probabilidad de que la lesión esté presente si lo son todas a la vez.
            </p>
          )}

          {/* Conjunto MEDIDO: gana al estimado siempre que exista. */}
          {measured && (
            <div>
              {/* En movil este titular va en la linea pegada de arriba. */}
              <div className="hidden items-baseline justify-between gap-3 lg:flex">
                <Kicker className="min-w-0 leading-snug">{measured.cluster.name}</Kicker>
                <span className="flex shrink-0 items-baseline gap-1.5">
                  <span className="num text-[11px] text-fg3">{Math.round(pretest)}%</span>
                  <span className="num text-[11px] text-fg3">→</span>
                  <span className="readout text-lg text-emerald-300">
                    {measured.post != null ? `${Math.round(measured.post)}%` : 's/d'}
                  </span>
                </span>
              </div>
              <span
                className="meter mt-2 block text-emerald-400"
                style={meterStyle(measured.post)}
                aria-hidden="true"
              />
              {/* LO QUE LA FUENTE PUBLICA, y solo eso. El conjunto de Laslett trae
                  sensibilidad y especificidad; el de Wainner trae unicamente la
                  razon de verosimilitud, porque su resumen no publica las otras dos.
                  Imprimir "Sensibilidad undefined%" era el resultado de suponer que
                  todo conjunto medido las trae. */}
              {measured.cluster.sensitivity != null && measured.cluster.specificity != null ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-fg2">
                  Sensibilidad {measured.cluster.sensitivity}% y especificidad{' '}
                  {measured.cluster.specificity}% con {measured.cluster.minPositive} o más
                  positivas. Cifra de estudio, no estimada.
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] leading-relaxed text-fg2">
                  LR+ {lrLabel(measured.lr)} con {measured.cluster.minPositive} o más
                  positivas. Cifra de estudio, no estimada; la fuente no publica
                  sensibilidad ni especificidad del conjunto.
                </p>
              )}
              {/* POR QUE LA CIFRA BAJA AL MARCAR UNA PRUEBA MAS.
                  Por debajo del minimo del conjunto, el panel ESTIMA multiplicando
                  razones de verosimilitud; al alcanzarlo, pasa a la cifra MEDIDA
                  del estudio, que es menor porque las pruebas del conjunto provocan
                  la misma articulacion y no son independientes. Sin esta linea, el
                  fisio marca la tercera positiva, ve caer la probabilidad de 79% a
                  65% y da por hecho que la aplicacion se equivoca. */}
              {cluster?.post != null && measured.post != null && cluster.post > measured.post && (
                <p className="mt-1.5 text-[11px] leading-snug text-amber-500/90">
                  Con menos positivas el panel ESTIMABA {Math.round(cluster.post)}%
                  multiplicando razones de verosimilitud. Esa estimación era optimista:
                  estas pruebas provocan la misma articulación y no son independientes.
                  Manda la cifra medida.
                </p>
              )}
              <p className="mt-1 text-[11px] leading-relaxed text-fg3">
                {measured.cluster.note}
              </p>
            </div>
          )}

          {/* Combined result (only when combining with a selection). */}
          {!measured && cluster && (
            <div>
              <div className="hidden items-baseline justify-between gap-3 lg:flex">
                <Kicker className="min-w-0 leading-snug">
                  {cluster.count} prueba{cluster.count > 1 ? 's' : ''} positiva
                  {cluster.count > 1 ? 's' : ''} a la vez
                </Kicker>
                <span className="flex shrink-0 items-baseline gap-1.5">
                  <span className="num text-[11px] text-fg3">{Math.round(pretest)}%</span>
                  <span className="num text-[11px] text-fg3">→</span>
                  <span className="readout text-lg text-emerald-300">
                    {cluster.post != null ? `${Math.round(cluster.post)}%` : 's/d'}
                  </span>
                </span>
              </div>
              <span
                className="meter mt-2 block text-emerald-400"
                style={meterStyle(cluster.post)}
                aria-hidden="true"
              />
              {/* NINGUNA DE LAS MARCADAS TRAE CON QUE CALCULAR. Antes el bloque
                  entero desaparecia: se marcaba una prueba sin cifras (21 de las
                  80 del catalogo no publican ni sensibilidad ni especificidad) y
                  no pasaba nada, que se lee como un fallo del boton. */}
              {cluster.lr == null && (
                <p className="mt-1.5 text-[11px] leading-snug text-fg2">
                  Ninguna de las pruebas marcadas publica razón de verosimilitud (ni
                  sensibilidad y especificidad para calcularla), así que no hay nada que
                  combinar.
                </p>
              )}
              {cluster.lr != null && cluster.post == null && (
                <p className="mt-1.5 text-[11px] leading-snug text-fg2">
                  Una de las pruebas elegidas tiene especificidad del 100% en su
                  estudio, así que el producto de razones de verosimilitud no se
                  puede cifrar: no hubo falsos positivos en esa muestra, pero eso no
                  es certeza.
                </p>
              )}
              {/* Y LA CUENTA NO MIENTE SOBRE CUANTAS ENTRAN. El rotulo decia "3
                  pruebas positivas a la vez" y el producto se hacia con las que
                  traen razon de verosimilitud, saltandose en silencio las demas:
                  el fisio creia ver la suma de tres y era la de dos. */}
              {cluster.lr != null && cluster.skipped.length > 0 && (
                <p className="mt-1.5 text-[11px] leading-snug text-fg2">
                  Sin razón de verosimilitud, no entra{cluster.skipped.length > 1 ? 'n' : ''}{' '}
                  en el cálculo: {cluster.skipped.join(', ')}.
                </p>
              )}
              {/* LA CIFRA MEDIDA, ANTES DE ALCANZAR EL UMBRAL. Esta estimación es la
                  más optimista de las dos y hasta ahora se publicaba sola: el aviso
                  que explica por qué baja al marcar una positiva más vivía dentro
                  del bloque del conjunto ya aplicado. Ahora la referencia del
                  estudio acompaña a la estimación desde la primera prueba marcada
                  del conjunto. */}
              {partial && partial.post != null && (
                <p className="mt-1.5 text-[11px] leading-snug text-amber-500/90">
                  Estas pruebas forman {partial.cluster.name}, y ese conjunto SÍ está
                  medido: con {partial.cluster.minPositive} o más positivas el estudio
                  lleva tu {Math.round(pretest)}% a{' '}
                  <span className="num">{Math.round(partial.post)}%</span>{' '}
                  (LR+ {lrLabel(partial.lr, 2)}). Te{' '}
                  {partial.missing === 1 ? 'falta 1 positiva' : `faltan ${partial.missing} positivas`}
                  , así que lo de arriba es una estimación: multiplica razones de
                  verosimilitud como si las pruebas fueran independientes, y estas
                  provocan la misma articulación.
                </p>
              )}
              {cluster.lr != null && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-fg3">
                  LR+ combinado {lrLabel(cluster.lr)}. Asume independencia entre pruebas: es
                  una aproximación docente, no un valor de estudio.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Interruptor de modo (Combinar, Examen, Guia). Un solo componente para que
 * los tres no se separen. LAMINA: texto que responde (`btn-quiet`), encendido
 * en el color de estado y con `aria-pressed`; no una pastilla con borde.
 */
function ModeToggle({
  active,
  onClick,
  label,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={title}
      className={`btn btn-quiet btn-sm gap-1.5 text-[11px] ${active ? 'text-brand' : ''}`}
    >
      {children}
      {label}
    </button>
  );
}

function TestTubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 3h6M10 3v13a2.5 2.5 0 0 0 5 0V3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 10h5" strokeLinecap="round" />
    </svg>
  );
}

/** Tres pruebas que se juntan: el icono de Combinar. */
function ClusterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="7" cy="8" r="3" />
      <circle cx="17" cy="8" r="3" />
      <circle cx="12" cy="16.5" r="3" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 3v14" strokeLinecap="round" />
    </svg>
  );
}

function ExamIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 5.5a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3.5V9h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 14.5l2 2 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
