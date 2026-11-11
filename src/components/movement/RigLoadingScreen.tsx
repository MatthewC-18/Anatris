// src/components/movement/RigLoadingScreen.tsx
//
// LA PANTALLA DE CARGA DEL LABORATORIO.
//
// Un cuerpo esquematico que se arma por capas --contorno, hueso, musculo,
// piel-- al ritmo de lo que de verdad esta pasando, mientras su brazo recorre
// una abduccion contra un goniometro. No es un adorno: la abduccion del hombro
// es el primer movimiento que el laboratorio ensena al abrirse, y el goniometro
// es su instrumento. La espera cuenta lo que viene.
//
// Ocupa el ESCENARIO entero, sin tarjeta (sistema LAMINA, docs/sistema-lamina.md).
//
// -----------------------------------------------------------------------------
// POR QUE ESTA HECHA ASI: EL HILO PRINCIPAL ESTA BLOQUEADO CASI TODA LA ESPERA
// -----------------------------------------------------------------------------
// Reloj de arranque de la propia aplicacion (`?perf=1`, src/lib/bootClock.ts)
// sobre el build de produccion, con el modelo ya en la cache:
//
//   bytes leidos (red/cache + inflado)   1.345 ms
//   GLB parseado (meshopt)                 911 ms
//   R3F monta la escena                     72 ms
//   PASES DE PREPARACION                 5.317 ms
//   capas + onReady                         12 ms
//   primer fotograma en pantalla         3.714 ms     total 11,8 s
//
// La descarga son 1,3 s de 11,8. Los otros 10 el hilo principal NO SUELTA: el
// parseo, el montaje, la preparacion y la subida a la GPU van seguidos, y entre
// medias el navegador no pinta un solo fotograma de React. Medido fotograma a
// fotograma, la pantalla anterior solo conseguia pintar TRES veces en todo ese
// tramo, asi que su rotulo se quedaba clavado en la fase que ya habia pasado y
// su dibujo, congelado.
//
// Lo unico que sigue moviendose con el hilo bloqueado es lo que el COMPOSITOR
// sabe animar solo: `transform` y `opacity` de un elemento HTML con su propia
// capa. Asi que toda la coreografia --el brazo, las capas que se descubren, los
// rotulos que se relevan, la barra-- son animaciones CSS de esas dos
// propiedades y nada mas, programadas de una vez con sus retardos y entregadas
// al compositor ANTES de que empiece el bloqueo. Por eso:
//
//   - Lo que se anima son `<div>` que envuelven un SVG quieto, nunca un `<g>` o
//     un `<path>`: en Chrome las animaciones de elementos SVG no se componen.
//   - Las capas se descubren con DOS traslaciones opuestas (el marco baja y su
//     contenido sube lo mismo), no con `clip-path` ni `height`.
//   - Los rotulos de fase estan los cuatro apilados y se relevan por `opacity`.
//   - El relevo NO lo da React. Lo da un atributo puesto a mano en el DOM en el
//     instante en que el cargador avisa de que la descarga termino, y el
//     cargador cede dos fotogramas justo despues (ver `nextPaint`) para que ese
//     cambio llegue a pintarse. Un `setState` no llegaba: React lo agrupaba con
//     el despertar de Suspense y el commit caia dentro del bloqueo.
//
// `src/components/movement/__tests__/rigLoadingScreen.test.ts` comprueba que
// ningun `@keyframes` de este fichero toca otra propiedad.
//
// -----------------------------------------------------------------------------
// LOS TIEMPOS SON LOS DE ESTA MAQUINA, NO UNOS INVENTADOS
// -----------------------------------------------------------------------------
// Con el hilo bloqueado no se puede PREGUNTAR en que fase se esta: hay que
// haberlo previsto. La primera vez se usan los tiempos medidos arriba. Al
// terminar cada carga se guardan los que ha tardado ESTE equipo (parseo,
// preparacion, primer fotograma) y la siguiente visita se coreografia con
// ellos. Si la carga va mas lenta de lo previsto, el ultimo rotulo se queda y el
// brazo sigue; si va mas rapida, la pantalla se retira antes. Lo que no hace
// nunca es ensenar una fase terminada que no ha terminado: la ultima barra no
// llega al final hasta que el laboratorio aparece.
//
// LA DESCARGA SI SE MIDE EN VIVO, porque ahi el hilo esta libre: el porcentaje
// es el de los bytes del flujo, y el esqueleto se descubre con el.

import { useEffect, useRef, useState } from 'react';
import { modelPhase, onModelPhase } from '../../lib/modelPhase';
import { RIG_URL } from '../../lib/modelWarm';

/* ---------------------------------------------------------------------------
 * LOS TIEMPOS DE LA COREOGRAFIA
 * ------------------------------------------------------------------------ */

/** Lo que dura cada tramo bloqueado, en ms. */
export interface LoadTimings {
  /** De los bytes al GLB parseado. */
  parse: number;
  /** Del parseo a `onReady`: montaje y pases de preparacion. */
  prep: number;
  /** De `onReady` al primer fotograma: shaders y subida a la GPU. */
  paint: number;
}

/** Medidos en el build de produccion (ver la tabla de la cabecera). */
export const DEFAULT_TIMINGS: LoadTimings = { parse: 911, prep: 5401, paint: 3714 };

const TIMINGS_KEY = 'anatris.carga.v1';

/** Un tramo vale si es un numero cuerdo: ni cero ni dos minutos. */
const sane = (ms: unknown): ms is number =>
  typeof ms === 'number' && Number.isFinite(ms) && ms >= 30 && ms <= 120_000;

/** Los tiempos de la ultima carga en este equipo, o los medidos por defecto. */
export function readTimings(): LoadTimings {
  try {
    const raw = window.localStorage.getItem(TIMINGS_KEY);
    if (!raw) return DEFAULT_TIMINGS;
    const t = JSON.parse(raw) as Partial<LoadTimings>;
    if (sane(t.parse) && sane(t.prep) && sane(t.paint)) {
      return { parse: t.parse, prep: t.prep, paint: t.paint };
    }
  } catch {
    /* almacenamiento no disponible o dato roto: los de por defecto */
  }
  return DEFAULT_TIMINGS;
}

// El cronometro de ESTA carga. Vive en el modulo y no en el componente porque
// los dos ultimos instantes los da RigViewer (el rig preparado, el primer
// fotograma) y pueden caer cuando la pantalla ya se esta retirando.
const marks: { bytes?: number; parsed?: number; ready?: number } = {};

onModelPhase((url, state) => {
  if (url !== RIG_URL) return;
  if (state.phase === 'fetching') {
    marks.bytes = undefined;
    marks.parsed = undefined;
    marks.ready = undefined;
  } else if (state.phase === 'parsing') {
    marks.bytes = state.at.parsing;
  } else if (state.phase === 'done') {
    marks.parsed = state.at.done;
  }
});

/** El rig esta cargado y vestido (`onReady`). Lo llama RigViewer. */
export function noteRigReady(): void {
  if (marks.ready === undefined) marks.ready = performance.now();
}

/**
 * El primer fotograma esta en pantalla. Lo llama RigViewer. Si esta carga se
 * vio entera --de los bytes al fotograma--, se guarda lo que tardo cada tramo
 * para coreografiar la siguiente.
 */
export function noteRigPainted(): void {
  const { bytes, parsed, ready } = marks;
  if (bytes === undefined || parsed === undefined || ready === undefined) return;
  const t: LoadTimings = {
    parse: parsed - bytes,
    prep: ready - parsed,
    paint: performance.now() - ready,
  };
  // Se consume: un remontaje sobre la escena ya cacheada no es una carga.
  marks.bytes = undefined;
  if (!sane(t.parse) || !sane(t.prep) || !sane(t.paint)) return;
  try {
    window.localStorage.setItem(TIMINGS_KEY, JSON.stringify(t));
  } catch {
    /* sin almacenamiento: la proxima vez se usan los de por defecto */
  }
}

/* ---------------------------------------------------------------------------
 * EL CUERPO
 * ---------------------------------------------------------------------------
 * Un maniqui de frente en posicion anatomica, dibujado a mano en un lienzo de
 * 200 x 420 con el eje en x = 100. Solo se escribe la MITAD que cae a la
 * izquierda del que mira; la otra es la misma lista reflejada, que ademas
 * garantiza la simetria (un esquema torcido se nota aunque no se sepa por que).
 *
 * El BRAZO de ese lado va aparte, porque es el que se mueve: gira entero
 * alrededor de la articulacion glenohumeral, en (62, 88).
 *
 * Es un ESQUEMA y se ve que lo es. Un dibujo que fingiera ser el modelo que
 * todavia no ha cargado seria una mentira pequena.
 * ------------------------------------------------------------------------ */

/** El lienzo: el cuerpo (0..200 x 0..420) mas el sitio que barre el brazo. */
const VB = { x: -112, y: -14, w: 424, h: 436 };
/** La articulacion glenohumeral del brazo que se mueve. */
const HOMBRO = { x: 62, y: 88 };
/** Del hombro a la punta de la mano, y cuanto cuelga abierto en reposo. */
const RADIO = 179;
const REPOSO_DEG = 7;
/** Hasta donde sube la abduccion de la pantalla de carga. */
const ARCO_DEG = 120;

const pct = (v: number, min: number, size: number) => `${(((v - min) / size) * 100).toFixed(3)}%`;
const PIVOTE = `${pct(HOMBRO.x, VB.x, VB.w)} ${pct(HOMBRO.y, VB.y, VB.h)}`;

/** Un punto del goniometro: `deg` de abduccion medidos desde el reposo. */
function enArco(deg: number, r: number): [number, number] {
  const a = ((deg + REPOSO_DEG) * Math.PI) / 180;
  return [HOMBRO.x - r * Math.sin(a), HOMBRO.y + r * Math.cos(a)];
}

function Lienzo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      className={`absolute inset-0 h-full w-full ${className ?? ''}`}
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Dibuja sus hijos y su reflejo respecto al eje del cuerpo. */
function Espejo({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <g transform="translate(200 0) scale(-1 1)">{children}</g>
    </>
  );
}

/** Solo el reflejo: el brazo del otro lado, que no se mueve. */
function Reflejo({ children }: { children: React.ReactNode }) {
  return <g transform="translate(200 0) scale(-1 1)">{children}</g>;
}

// --- contorno (lo comparten la silueta y la piel) ---------------------------

const CABEZA = <ellipse cx="100" cy="36" rx="18.5" ry="24" />;

/** Medio tronco y la pierna de ese lado, del cuello a la planta. */
const TRONCO_D =
  'M92 57 L91 68 C86 74 74 76 64 80 C59 82 57 90 59 100 L66 114 ' +
  'C66 135 70 155 73 170 C71 182 65 192 64 204 ' +
  'C62 232 63 262 69 300 C67 318 64 338 68 356 C71 370 74 380 74 388 ' +
  'L70 400 C70 404 88 404 89 400 L87 388 ' +
  'C88 370 92 345 90 322 C89 312 89 304 90 298 C93 270 97 240 100 220';

const BRAZO_D =
  'M58 82 C51 88 49 100 50 114 C49 135 46 150 45 166 C42 185 40 210 39 232 ' +
  'C36 240 33 252 35 264 C37 270 44 270 46 262 C48 250 49 240 49 232 ' +
  'C53 210 56 185 58 168 C61 150 65 130 66 114 C67 100 64 88 58 82 Z';

// --- hueso -------------------------------------------------------------------

const HUESO_EJE = (
  <>
    {/* EL CRANEO ES UN CONTORNO, NO UNA CARA. La primera version llevaba dos
        puntos por ojos y un arco por mandibula, y en pantalla eso no era un
        craneo: era una carita sonriente. Lo simpatico de esta pantalla es el
        gesto del brazo; el esqueleto tiene que seguir siendo anatomia. Asi que
        boveda y mandibula van en UN trazo cerrado, las orbitas son huecas y
        los dientes, una linea recta. */}
    <path d="M100 15.5 C89 15.5 86 25 86 33 C86 41 88 46 90.5 50.5 C93 56 96.5 59 100 59 C103.5 59 107 56 109.5 50.5 C112 46 114 41 114 33 C114 25 111 15.5 100 15.5 Z" />
    <ellipse cx="94.3" cy="34" rx="3.1" ry="2.7" />
    <ellipse cx="105.7" cy="34" rx="3.1" ry="2.7" />
    <path d="M100 39.5 L98.5 44.5 L101.5 44.5 Z" />
    <path d="M95.5 51 L104.5 51" />
    {/* columna: del atlas al sacro */}
    {Array.from({ length: 18 }, (_, i) => (
      <rect key={i} className="cg-solido" x="97" y={62 + i * 7.7} width="6" height="4.6" rx="1.4" />
    ))}
    <rect x="98" y="84" width="4" height="38" rx="2" />
  </>
);

const HUESO_LADO = (
  <>
    {/* clavicula */}
    <path d="M98 79 C88 76 76 77 64 81" />
    {/* costillas */}
    {Array.from({ length: 7 }, (_, i) => {
      const y = 88 + i * 7.6;
      return (
        <path
          key={i}
          d={`M96.5 ${y} C86 ${y - 3} ${73 + i * 0.5} ${y + 1} ${70.5 + i * 0.7} ${y + 10 - i * 0.6}`}
        />
      );
    })}
    {/* coxal */}
    <path d="M100 196 C90 192 76 188 70 196 C68 204 74 212 84 214 C92 216 98 216 100 214" />
    {/* femur, rotula, tibia y perone */}
    <circle cx="80" cy="209" r="4" />
    <path d="M80 213 L77.5 297" />
    <circle cx="78" cy="303.5" r="3.3" />
    <path d="M79 310 L80 384" />
    <path d="M73 312 L74.5 384" />
    {/* pie */}
    <path d="M74 388 L86 388 L90 400 L72 400 Z" />
  </>
);

const HUESO_BRAZO = (
  <>
    <circle cx="62" cy="88" r="4.3" />
    <path d="M60 92 L52.5 162" />
    <circle cx="52" cy="166" r="2.9" />
    <path d="M49.5 170 L43 229" />
    <path d="M54.5 170 L47.5 229" />
    <path d="M42 234 L38.5 261" />
    <path d="M45.5 234 L43.5 265" />
  </>
);

// --- musculo -----------------------------------------------------------------

const MUSCULO_LADO = (
  <>
    {/* trapecio superior */}
    <path d="M92 62 C88 70 76 74 64 80 L78 84 C86 82 92 78 96 72 Z" />
    {/* pectoral mayor */}
    <path d="M98 84 C88 82 76 84 68 90 C66 98 68 108 72 114 C82 118 92 116 98 112 Z" />
    {/* recto del abdomen */}
    {Array.from({ length: 4 }, (_, i) => (
      <rect key={i} x="88.5" y={120 + i * 17} width="9.5" height={i === 3 ? 20 : 14} rx="4" />
    ))}
    {/* oblicuo externo */}
    <path d="M72 118 C70 140 72 160 75 172 L85.5 176 L85.5 122 Z" />
    {/* cuadriceps: vasto lateral, recto femoral, vasto medial */}
    <path d="M68 226 C64 250 66 280 71 298 C72.5 280 71.5 250 72.5 228 Z" />
    <path d="M77 222 C73 245 73 275 77 296 C81 296 85 275 85 245 C85 232 81 224 77 222 Z" />
    <path d="M89 262 C93 276 92 292 87 300 C85 290 86 274 89 262 Z" />
    {/* pierna: tibial anterior y gemelo medial */}
    <path d="M70.5 318 C66.5 335 67.5 355 71.5 372 C76.5 360 78.5 338 76.5 318 Z" />
    <path d="M86 320 C90 335 89 352 85 366 C83 350 83 334 86 320 Z" />
  </>
);

const MUSCULO_BRAZO = (
  <>
    {/* deltoides */}
    <path d="M58 82 C51 87 49 99 51 112 C56 108 62 100 66 90 C66 85 62 82 58 82 Z" />
    {/* biceps */}
    <path d="M58 116 C53 126 51 144 52 160 C57 152 61 134 62 118 Z" />
    {/* vientre del antebrazo */}
    <path d="M53 172 C47 184 44 204 44 222 C50 212 55 192 56 174 Z" />
  </>
);

/* ---------------------------------------------------------------------------
 * EL GONIOMETRO
 * ------------------------------------------------------------------------ */

function Goniometro() {
  const [x0, y0] = enArco(0, RADIO);
  const [x1, y1] = enArco(ARCO_DEG, RADIO);
  const marcas: React.ReactNode[] = [];
  for (let d = 0; d <= ARCO_DEG; d += 15) {
    const largo = d % 30 === 0 ? 7 : 3.5;
    const [ax, ay] = enArco(d, RADIO);
    const [bx, by] = enArco(d, RADIO + largo);
    marcas.push(<path key={`m${d}`} d={`M${ax.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}`} />);
    if (d % 30 === 0) {
      const [tx, ty] = enArco(d, RADIO + 17);
      marcas.push(
        <text key={`t${d}`} x={tx.toFixed(1)} y={(ty + 2.6).toFixed(1)} textAnchor="middle">
          {d}°
        </text>,
      );
    }
  }
  return (
    <Lienzo className="cg-gonio">
      <path d={`M${x0.toFixed(1)} ${y0.toFixed(1)} A${RADIO} ${RADIO} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`} />
      {marcas}
    </Lienzo>
  );
}

/* ---------------------------------------------------------------------------
 * LAS CAPAS
 * ---------------------------------------------------------------------------
 * Cada capa se pinta dos veces: el cuerpo quieto y el brazo que gira. `Capas`
 * recibe que dibujar en cada una y monta los cuatro pisos en el mismo orden.
 * ------------------------------------------------------------------------ */

/** Un piso que se descubre de arriba abajo. Ver la cabecera: dos traslaciones. */
function Descubre({ clase, children }: { clase: string; children: React.ReactNode }) {
  return (
    <div className={`cg-marco ${clase}`}>
      <div className="cg-fondo">{children}</div>
    </div>
  );
}

function Capas({ parte }: { parte: 'cuerpo' | 'brazo' }) {
  const cuerpo = parte === 'cuerpo';
  return (
    <>
      <Lienzo className="cg-sil">
        {cuerpo ? (
          <>
            {CABEZA}
            <Espejo>
              <path d={TRONCO_D} />
            </Espejo>
            <Reflejo>
              <path d={BRAZO_D} />
            </Reflejo>
          </>
        ) : (
          <path d={BRAZO_D} />
        )}
      </Lienzo>
      <Descubre clase="cg-hueso">
        <Lienzo className="cg-hueso-art">
          {cuerpo ? (
            <>
              {HUESO_EJE}
              <Espejo>{HUESO_LADO}</Espejo>
              <Reflejo>{HUESO_BRAZO}</Reflejo>
            </>
          ) : (
            HUESO_BRAZO
          )}
        </Lienzo>
      </Descubre>
      <Descubre clase="cg-musculo">
        <Lienzo className="cg-musculo-art">
          {cuerpo ? (
            <>
              <Espejo>{MUSCULO_LADO}</Espejo>
              <Reflejo>{MUSCULO_BRAZO}</Reflejo>
            </>
          ) : (
            MUSCULO_BRAZO
          )}
        </Lienzo>
      </Descubre>
      <div className="cg-piel">
        <Lienzo className="cg-piel-art">
          {cuerpo ? (
            <>
              {CABEZA}
              <Espejo>
                <path d={`${TRONCO_D} L100 57 Z`} />
              </Espejo>
              <Reflejo>
                <path d={BRAZO_D} />
              </Reflejo>
            </>
          ) : (
            <path d={BRAZO_D} />
          )}
        </Lienzo>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * LA PANTALLA
 * ------------------------------------------------------------------------ */

/** Las cuatro fases, en orden. La primera se mide en vivo; las otras tres van
 *  coreografiadas (ver la cabecera). */
export const FASES = [
  'Descargando el cuerpo',
  'Montando el modelo',
  'Preparando músculo y piel',
  'Encendiendo el escenario',
] as const;

export function RigLoadingScreen({
  progress,
  loaded = 0,
  total = 0,
  item = '',
  compact = false,
  leaving = false,
}: {
  /** Porcentaje de bytes leidos que publica el gestor de carga de three. */
  progress: number;
  /** Bytes leidos y declarados, del mismo gestor. */
  loaded?: number;
  total?: number;
  /** A que recurso se refieren las tres cifras de arriba. */
  item?: string;
  compact?: boolean;
  /** El laboratorio ya esta pintado debajo: la pantalla se desvanece. */
  leaving?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  // Los tiempos se leen UNA vez, al montar: son los de la carga anterior.
  const [t] = useState<LoadTimings>(() =>
    typeof window === 'undefined' ? DEFAULT_TIMINGS : readTimings(),
  );
  // Solo para el lector de pantalla: en que fase se esta. El dibujo no depende
  // de este estado (ver la cabecera), asi que da igual que llegue tarde.
  const [dicho, setDicho] = useState<string>(FASES[0]);

  // EL RELEVO. Cuando el cargador avisa de que los bytes del rig ya estan, se
  // pone el atributo A MANO y la coreografia entera arranca en el compositor.
  // React no pinta este atributo (no esta en el JSX), asi que ningun render
  // posterior puede quitarlo y reiniciar las animaciones.
  useEffect(() => {
    const arrancar = () => {
      const el = root.current;
      if (!el || el.dataset.run === '1') return;
      el.dataset.run = '1';
      setDicho('Montando y preparando el modelo');
    };
    // El modelo puede ir ya por delante al montar la pantalla: bytes leidos, o
    // incluso parseado (se vuelve al laboratorio con la escena en memoria).
    const ya = modelPhase(RIG_URL);
    if (ya && (ya.phase === 'parsing' || ya.phase === 'done')) arrancar();
    return onModelPhase((url, state) => {
      if (url !== RIG_URL) return;
      if (state.phase === 'parsing' || state.phase === 'done') arrancar();
    });
  }, []);

  // LA DESCARGA, EN VIVO. El gestor de carga de three es UNO para toda la
  // aplicacion y mezcla en el mismo canal los BYTES del modelo con las CUENTAS
  // DE ITEMS (1 de 1, 2 de 2...). Medido: sin filtrar, la barra se llenaba con
  // la mano del fisioterapeuta, que son 336 KB, mientras el cuerpo seguia
  // bajando. Por eso se exige la URL del rig y un total que solo puede ser
  // bytes.
  const delRig = item === RIG_URL && total > 1024;
  // Y POR QUE SE CALLA AL 100. `content-length` cuenta los bytes COMPRIMIDOS
  // cuando el servidor declara el gzip, y el navegador entrega los inflados: el
  // contador cruza el 100% con el 57% del flujo leido (medido en `vite preview`:
  // 9.323.344 declarados contra 16.410.748 entregados). Pasado ese punto la
  // cifra no significa nada, asi que deja de ensenarse y la barra pasa a una
  // lanzadera hasta que el cargador da el relevo, que nunca miente.
  const medido = delRig && loaded < total;
  const porciento = medido ? Math.max(0, Math.min(99, Math.round(progress))) : 0;
  const p = medido ? Math.min(0.99, loaded / total) : delRig ? 1 : 0;

  return (
    <div
      ref={root}
      className={`cg ${compact ? 'cg-compacto' : ''}`}
      data-fuera={leaving ? '1' : undefined}
      style={
        {
          '--p': p.toFixed(3),
          '--t1': Math.round(t.parse),
          '--t2': Math.round(t.prep),
          '--t3': Math.round(t.paint),
        } as React.CSSProperties
      }
    >
      <style>{CSS}</style>

      <div className="cg-figura">
        <Goniometro />
        <Capas parte="cuerpo" />
        <div className="cg-brazo" style={{ transformOrigin: PIVOTE }}>
          <Capas parte="brazo" />
          <Lienzo className="cg-mano">
            <circle cx={enArco(0, RADIO)[0]} cy={enArco(0, RADIO)[1]} r="3.4" />
          </Lienzo>
        </div>
      </div>

      <div className="cg-texto">
        <p className="kicker">Laboratorio de movimiento</p>
        {/* Los cuatro rotulos, apilados. El primero lo releva el atributo; los
            otros tres se relevan solos. Ocultos al lector de pantalla, que lee
            la linea de estado de abajo. */}
        <div className="cg-titulos" aria-hidden>
          {FASES.map((f, i) => (
            <p key={f} className={`cg-titulo cg-titulo-${i + 1}`}>
              <span className="num cg-paso">{`0${i + 1}`}</span>
              {f}
              {i === 0 && medido && porciento > 0 && (
                <span className="num cg-cifra">{porciento}%</span>
              )}
            </p>
          ))}
        </div>
        <div className="cg-pista" aria-hidden>
          {FASES.map((f, i) => (
            <span key={f} className="cg-tramo">
              <span
                className={`cg-relleno cg-relleno-${i + 1} ${
                  i === 0 && delRig && !medido ? 'cg-lanzadera' : ''
                }`}
              />
            </span>
          ))}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {dicho}
        </p>
        {/* LA FRASE QUE SUSTITUYE A UNA MENTIRA. La pantalla de antes prometia
            que la espera no se repetiria. Se repite: lo unico que queda
            guardado son los bytes, y esos eran 1,3 s de los 11,8 medidos. */}
        <p className="cg-pie">
          El cuerpo son 9 MB y se descargan una sola vez. El montaje se rehace en
          cada visita.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * CSS
 * ---------------------------------------------------------------------------
 * Va en el componente y no en index.css porque esto solo vive diez segundos al
 * entrar al laboratorio.
 *
 * TODO `@keyframes` DE AQUI ANIMA `transform` U `opacity` Y NADA MAS. Ver la
 * cabecera: es lo unico que sigue moviendose con el hilo principal bloqueado.
 * Hay un test que lo comprueba.
 *
 * Los retardos salen de --t1, --t2 y --t3 (ms de parseo, preparacion y primer
 * fotograma en ESTE equipo), puestos en linea por el componente.
 *
 * `prefers-reduced-motion` no apaga la informacion, solo el movimiento: el
 * brazo se queda en reposo y las capas aparecen sin barrido, pero las fases se
 * siguen relevando a su hora.
 * ------------------------------------------------------------------------ */
export const CSS = `
.cg {
  position: absolute; inset: 0; z-index: 10;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1.5rem; padding: 1.25rem;
  background: rgb(var(--c-page));
  opacity: 1; transition: opacity .45s ease-out;
  overflow: hidden;
}
.cg[data-fuera='1'] { opacity: 0; pointer-events: none; }

.cg-figura {
  position: relative; flex: 0 1 auto;
  height: min(58%, 28.75rem); max-width: 94%;
  aspect-ratio: ${VB.w} / ${VB.h};
  transition: transform .45s ease-out;
}
.cg[data-fuera='1'] .cg-figura { transform: scale(1.05); }
.cg-compacto .cg-figura { height: min(52%, 17rem); }
.cg-compacto { gap: .875rem; }

/* --- el dibujo ---------------------------------------------------------- */
.cg-sil, .cg-hueso-art, .cg-piel-art, .cg-gonio { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.cg-sil { stroke: rgb(var(--c-fg3) / .5); stroke-width: 1.1; vector-effect: non-scaling-stroke; }
.cg-sil * , .cg-hueso-art *, .cg-piel-art *, .cg-gonio path { vector-effect: non-scaling-stroke; }
.cg-hueso-art { stroke: #eae3d2; stroke-width: 1.35; }
.cg-hueso-art .cg-solido { fill: #eae3d2; stroke: none; }
.cg-musculo-art { fill: #c23b3b; fill-opacity: .82; stroke: none; }
.cg-piel-art { fill: #d7a88f; fill-opacity: .13; stroke: #d7a88f; stroke-opacity: .6; stroke-width: 1.2; }
.cg-gonio { stroke: rgb(var(--c-fg3) / .55); stroke-width: 1; }
.cg-gonio text {
  fill: rgb(var(--c-fg3)); stroke: none;
  font: 500 7.5px 'IBM Plex Mono', ui-monospace, monospace; letter-spacing: .04em;
}
.cg-mano { fill: rgb(var(--c-brand)); }

/* --- los pisos ---------------------------------------------------------- */
.cg-marco, .cg-fondo, .cg-piel, .cg-brazo { position: absolute; inset: 0; will-change: transform, opacity; }
.cg-marco { overflow: hidden; }

/* HUESO: se descubre con la descarga, que se mide en vivo (--p de 0 a 1). */
.cg-hueso { transform: translateY(calc((var(--p) - 1) * 100%)); transition: transform .35s linear; }
.cg-hueso > .cg-fondo { transform: translateY(calc((1 - var(--p)) * 100%)); transition: transform .35s linear; }
.cg[data-run='1'] .cg-hueso, .cg[data-run='1'] .cg-hueso > .cg-fondo { transform: translateY(0); }

/* MUSCULO y PIEL: esperan al relevo y luego van solos. */
.cg-musculo { transform: translateY(-100%); }
.cg-musculo > .cg-fondo { transform: translateY(100%); }
.cg-piel { opacity: 0; }
.cg[data-run='1'] .cg-musculo {
  animation: cg-bajar calc(var(--t2) * .55ms) linear calc(var(--t1) * 1ms) both;
}
.cg[data-run='1'] .cg-musculo > .cg-fondo {
  animation: cg-subir calc(var(--t2) * .55ms) linear calc(var(--t1) * 1ms) both;
}
.cg[data-run='1'] .cg-piel {
  animation: cg-entrar calc(var(--t2) * .45ms) ease-out calc(var(--t1) * 1ms + var(--t2) * .55ms) both;
}
@keyframes cg-bajar { from { transform: translateY(-100%); } to { transform: translateY(0); } }
@keyframes cg-subir { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes cg-entrar { from { opacity: 0; } to { opacity: 1; } }

/* EL BRAZO: una abduccion de ida y vuelta, sin prisa. Gira alrededor de la
   glenohumeral (el origen lo pone el componente). */
.cg-brazo { animation: cg-abducir 5.6s cubic-bezier(.45, .05, .3, 1) infinite; }
@keyframes cg-abducir {
  0%, 8%    { transform: rotate(0deg); }
  46%, 58%  { transform: rotate(${ARCO_DEG}deg); }
  100%      { transform: rotate(0deg); }
}

/* --- el texto ----------------------------------------------------------- */
.cg-texto { display: flex; flex-direction: column; align-items: center; gap: .75rem; width: min(100%, 22rem); }
.cg-titulos { position: relative; width: 100%; height: 1.375rem; }
.cg-titulo {
  position: absolute; inset: 0; margin: 0;
  display: flex; align-items: center; justify-content: center; gap: .625rem;
  font-family: Sora, system-ui, sans-serif; font-size: .9375rem; font-weight: 600;
  color: rgb(var(--c-fg)); white-space: nowrap;
  opacity: 0; will-change: opacity;
}
.cg-paso { font-size: .6875rem; font-weight: 500; color: rgb(var(--c-fg3)); }
.cg-cifra { font-size: .75rem; font-weight: 500; color: rgb(var(--c-brand)); min-width: 2.25rem; text-align: right; }
.cg-titulo-1 { opacity: 1; }
.cg[data-run='1'] .cg-titulo-1 { animation: cg-salir .25s ease-out both; }
.cg[data-run='1'] .cg-titulo-2 { animation: cg-ventana calc(var(--t1) * 1ms) linear .2s both; }
.cg[data-run='1'] .cg-titulo-3 { animation: cg-ventana calc(var(--t2) * 1ms) linear calc(var(--t1) * 1ms + .2s) both; }
.cg[data-run='1'] .cg-titulo-4 { animation: cg-entrar .4s ease-out calc(var(--t1) * 1ms + var(--t2) * 1ms + .2s) both; }
@keyframes cg-salir { from { opacity: 1; } to { opacity: 0; } }
/* Visible durante SU tramo: entra, aguanta y cede al siguiente. Los
   porcentajes son de la duracion del tramo, asi que en un tramo de un segundo
   la entrada dura 120 ms y en uno de cinco, 600: nunca se come el rotulo. */
@keyframes cg-ventana {
  0%   { opacity: 0; }
  12%  { opacity: 1; }
  92%  { opacity: 1; }
  100% { opacity: 0; }
}

/* La barra: cuatro tramos, uno por fase. */
.cg-pista { display: flex; gap: 3px; width: 100%; }
.cg-tramo { position: relative; flex: 1 1 0%; height: 2px; overflow: hidden; background: rgb(var(--c-line)); }
.cg-tramo:nth-child(3) { flex-grow: 2.4; }
.cg-tramo:nth-child(4) { flex-grow: 1.7; }
.cg-relleno {
  position: absolute; inset: 0; background: rgb(var(--c-brand));
  transform-origin: left center; transform: scaleX(0); will-change: transform;
}
.cg-relleno-1 { transform: scaleX(var(--p)); transition: transform .35s linear; }
.cg-relleno-1.cg-lanzadera {
  transform: none; inset: 0 auto 0 0; width: 40%;
  background: linear-gradient(90deg, rgb(var(--c-brand) / 0), rgb(var(--c-brand)), rgb(var(--c-brand) / 0));
  animation: cg-lanzar 1.5s ease-in-out infinite;
}
.cg[data-run='1'] .cg-relleno-1 { transform: scaleX(1); animation: none; inset: 0; width: auto; background: rgb(var(--c-brand)); }
.cg[data-run='1'] .cg-relleno-2 { animation: cg-llenar calc(var(--t1) * 1ms) linear both; }
.cg[data-run='1'] .cg-relleno-3 { animation: cg-llenar calc(var(--t2) * 1ms) linear calc(var(--t1) * 1ms) both; }
/* La ultima no llega al final: lo que la completa es el laboratorio. */
.cg[data-run='1'] .cg-relleno-4 {
  animation: cg-casi calc(var(--t3) * 1ms) cubic-bezier(.2, .6, .3, 1) calc(var(--t1) * 1ms + var(--t2) * 1ms) both;
}
@keyframes cg-llenar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes cg-casi { from { transform: scaleX(0); } to { transform: scaleX(.9); } }
@keyframes cg-lanzar { from { transform: translateX(-110%); } to { transform: translateX(270%); } }

.cg-pie { margin: 0; max-width: 30ch; text-align: center; font-size: .6875rem; line-height: 1.5; color: rgb(var(--c-fg3)); }
.cg-compacto .cg-pie { display: none; }

@media (prefers-reduced-motion: reduce) {
  .cg, .cg-figura { transition: none; }
  .cg-brazo { animation: none; }
  .cg-hueso, .cg-hueso > .cg-fondo { transition: none; }
  /* Sin barrido: el musculo aparece de golpe a su hora. */
  .cg[data-run='1'] .cg-musculo, .cg[data-run='1'] .cg-musculo > .cg-fondo {
    animation-duration: 1ms;
    animation-delay: calc(var(--t1) * 1ms);
  }
  .cg[data-run='1'] .cg-piel { animation-duration: 1ms; }
  .cg-relleno-1 { transition: none; }
  .cg-relleno-1.cg-lanzadera { animation: none; width: 100%; opacity: .35; }
}
`;
