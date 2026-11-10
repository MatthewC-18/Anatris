// src/components/movement/RigLoadingScreen.tsx
//
// LA PANTALLA DE CARGA DEL LABORATORIO, Y POR QUE NO PODIA SER UNA BARRA SOLA.
//
// La anterior MENTIA, y el engaño estaba medido. Reloj de arranque de la propia
// aplicacion (`?perf=1`, src/lib/bootClock.ts) sobre el build de produccion
// servido con `vite preview`, con el modelo ya en la cache del service worker:
//
//   bytes leidos (red/cache + inflado)   1.345 ms   (acumulado  1.757)
//   GLB parseado (meshopt)                 911 ms   (acumulado  2.667)
//   R3F monta la escena                     72 ms   (acumulado  2.739)
//   PASES DE PREPARACION                 5.317 ms   (acumulado  8.056)
//   capas + onReady                         12 ms   (acumulado  8.068)
//   primer fotograma en pantalla         3.714 ms   (acumulado 11.782)
//
// La barra se llenaba al terminar la LECTURA DE BYTES, o sea en el segundo
// 2,7 de una espera de 11,8. Los 9,1 s restantes el usuario miraba una barra al
// 100% bajo un cartel que decia "Se descarga una sola vez y queda guardado para
// las siguientes visitas". Las dos mitades eran falsas: ahi ya no se descargaba
// nada, y la proxima visita tarda lo mismo porque lo que pesa --parsear, montar
// y preparar-- se rehace entera cada vez. La descarga eran 1,3 s de los 11,8.
//
// Asi que la espera se cuenta por FASES REALES, leidas de los sellos que el
// reloj de arranque ya emite (`bytes`, `parse`), no de un temporizador:
//
//   1. Descargando el cuerpo        hasta agotarse el flujo (o el sello `bytes`)
//   2. Montando el modelo           hasta el sello `parse`
//   3. Preparando musculo y piel    hasta que hay fotograma en pantalla
//
// MEDIDO fotograma a fotograma con lo de arriba ya puesto (servidor de
// desarrollo, laboratorio del hombro): 750 ms aparece el cartel, de 1.103 a
// 7.659 ms sube el porcentaje de 7 a 99, a los 8.660 ms pinta "Montando el
// modelo" y ahi aguanta los 6,5 s del bloque de preparacion, a los 15.156
// "Preparando musculo y piel" durante 4,4 s, y a los 19.797 el laboratorio.
// Cada rotulo es verdad mientras esta en pantalla; el unico desfase que queda
// es el segundo del parseo, en el que no hay ningun fotograma que pintar.
//
// EL MOVIMIENTO TIENE QUE SOBREVIVIR AL HILO BLOQUEADO. Desde `parse` hasta el
// primer fotograma no se suelta el hilo principal: la preparacion entera corre
// dentro de UN `useLayoutEffect` de RigModel (por eso el tramo "el navegador
// pinta el rig CRUDO" mide 0 ms en esa misma tabla). Ninguna animacion de
// JavaScript, ni un contador, ni una barra que crece por estado, puede moverse
// en esos segundos. Lo unico que sigue andando es lo que el compositor sabe
// correr solo: `transform` y `opacity`. Por eso el barrido es un `<div>` con una
// sola animacion de `translateY`, y el relleno de la barra se escala con
// `scaleX` en vez de cambiar de `width`. Si algo de esto se vuelve a escribir
// animando `width`, `top` o `stroke-dashoffset`, la pantalla se congelara justo
// en el tramo que existe para cubrir.
//
// LAS CIFRAS SON MEDIDAS, NO DECORATIVAS. Cada fase terminada enseña lo que
// tardo, cronometrado por esta misma pantalla entre un sello y el siguiente. La
// fase en curso no enseña ninguna cifra, salvo la descarga, que es la unica con
// un porcentaje real detras (los bytes del flujo). Cuando ese porcentaje llega
// a 100 y el sello `bytes` todavia no ha caido, el numero DESAPARECE en vez de
// quedarse clavado: `content-length` cuenta los bytes comprimidos y el navegador
// nos entrega los inflados, asi que el 100% llega con el 56,8% del flujo leido
// (9.323.344 / 16.410.748 B, medido en `vite preview`).
//
// Los colores de los tejidos son los MISMOS que los del panel de capas
// (LayerControls): piel #d7a88f, musculo #c23b3b, hueso #eae3d2. El esquema que
// se dibuja aqui es el indice visual del panel que el usuario encuentra dos
// segundos despues.

import { useCallback, useEffect, useRef, useState } from 'react';
import { onStamp, stampedAt, type BootStamp } from '../../lib/bootClock';
import { RIG_URL } from '../../lib/modelWarm';

type FaseId = 'descarga' | 'montaje' | 'preparacion';

/**
 * Las tres fases, en orden, con el sello que CIERRA cada una. La ultima no
 * cierra: termina cuando el laboratorio aparece y esta pantalla se va.
 */
const PASOS: { id: FaseId; titulo: string; cierra?: BootStamp }[] = [
  { id: 'descarga', titulo: 'Descargando el cuerpo', cierra: 'bytes' },
  { id: 'montaje', titulo: 'Montando el modelo', cierra: 'parse' },
  { id: 'preparacion', titulo: 'Preparando músculo y piel' },
];

/** "1.345 ms" -> "1,3 s". Coma decimal, que es como se escribe en español. */
function enSegundos(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}

/* ---------------------------------------------------------------------------
 * EL ESQUEMA ANATOMICO
 * ---------------------------------------------------------------------------
 * Un maniqui esquematico de frente, en cuatro capas que se encienden al ritmo
 * de la carga: silueta, hueso, musculo y piel. Dibujado a mano con primitivas
 * (no es una silueta organica) porque lo que se promete es un ESQUEMA, y un
 * dibujo que finge ser el modelo que todavia no esta cargado seria otra mentira
 * pequeña.
 *
 * Solo se escribe LA MITAD IZQUIERDA. La derecha es la misma lista reflejada
 * con `translate(120 0) scale(-1 1)`, que ademas garantiza la simetria: el
 * cuerpo humano es simetrico y un esquema torcido se nota aunque no se sepa por
 * que. Lo que vive en la linea media (cabeza, tronco, columna, pelvis) se
 * dibuja una sola vez.
 * ------------------------------------------------------------------------ */

/** Dibuja sus hijos y su reflejo especular. */
function Espejo({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <g transform="translate(120 0) scale(-1 1)">{children}</g>
    </>
  );
}

/** Silueta y piel comparten geometria: el cuerpo, en primitivas. */
const CUERPO_MEDIO = (
  <>
    <ellipse cx="60" cy="19" rx="10.5" ry="12.5" />
    <rect x="55" y="28" width="10" height="10" rx="4.5" />
    <path d="M40 72 C40 56 41 48 44 44 C48 39 53 37 60 37 C67 37 72 39 76 44 C79 48 80 56 80 72 C80 84 77 90 76 100 L75 112 C70 116 50 116 45 112 L44 100 C43 90 40 84 40 72 Z" />
  </>
);

const CUERPO_LADO = (
  <>
    {/* brazo */}
    <rect x="29" y="45" width="11" height="38" rx="5.5" />
    <rect x="28" y="80" width="10" height="36" rx="5" />
    <ellipse cx="33" cy="121" rx="5" ry="6.5" />
    {/* pierna */}
    <rect x="46" y="106" width="13" height="48" rx="6.5" />
    <rect x="47" y="150" width="11" height="46" rx="5.5" />
    <ellipse cx="52.5" cy="199" rx="7" ry="5.5" />
  </>
);

const HUESO_MEDIO = (
  <>
    <ellipse cx="60" cy="18" rx="6.8" ry="8.5" />
    {/* columna: una vertebra cada 7,4 unidades, del atlas al sacro */}
    {Array.from({ length: 10 }, (_, i) => (
      <rect key={i} className="rg-v" x="57.6" y={30 + i * 7.4} width="4.8" height="3.4" rx="1.2" />
    ))}
    <path d="M46 100 C47 108 52 113 60 113 C68 113 73 108 74 100" />
  </>
);

const HUESO_LADO = (
  <>
    <path d="M58 42 C54 40 50 40 46 42" />
    {Array.from({ length: 4 }, (_, i) => (
      <path
        key={i}
        d={`M57.5 ${48 + i * 7.5} C51 ${49 + i * 7.5} 46.5 ${52 + i * 7.5} 46 ${57 + i * 7.5}`}
      />
    ))}
    <path d="M35 49 L34 81" />
    <path d="M31.5 84 L31 113" />
    <path d="M35 84 L34.5 113" />
    <path d="M52 110 L52 151" />
    <path d="M51 155 L51 192" />
    <path d="M55 155 L55 190" />
    <circle className="rg-v" cx="35" cy="48" r="1.8" />
    <circle className="rg-v" cx="34" cy="82" r="1.8" />
    <circle className="rg-v" cx="52" cy="110" r="1.8" />
    <circle className="rg-v" cx="52" cy="152" r="1.8" />
  </>
);

const MUSCULO_LADO = (
  <>
    {/* deltoides */}
    <path d="M40 44 C34 45 30 50 30 57 C34 60 39 58 41 53 Z" />
    {/* pectoral */}
    <path d="M44 48 C50 45 56 44 59 45 L59 61 C52 62 46 58 44 52 Z" />
    {/* biceps */}
    <ellipse cx="34.5" cy="64" rx="4.2" ry="11" />
    {/* vientre del antebrazo */}
    <ellipse cx="33" cy="92" rx="4" ry="10" />
    {/* cuadriceps */}
    <ellipse cx="52.5" cy="128" rx="5.5" ry="17" />
    {/* gemelo */}
    <ellipse cx="52.5" cy="167" rx="4.5" ry="12" />
  </>
);

function Esquema({ capa }: { capa: number }) {
  return (
    <svg viewBox="0 0 120 212" className="h-full w-full" aria-hidden focusable="false">
      <g className="rg-capa rg-sil" data-on="1">
        {CUERPO_MEDIO}
        <Espejo>{CUERPO_LADO}</Espejo>
      </g>
      <g className="rg-capa rg-hueso" data-on={capa >= 2 ? '1' : '0'}>
        {HUESO_MEDIO}
        <Espejo>{HUESO_LADO}</Espejo>
      </g>
      <g className="rg-capa rg-musculo" data-on={capa >= 3 ? '1' : '0'}>
        <Espejo>{MUSCULO_LADO}</Espejo>
      </g>
      <g className="rg-capa rg-piel" data-on={capa >= 3 ? '1' : '0'}>
        {CUERPO_MEDIO}
        <Espejo>{CUERPO_LADO}</Espejo>
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * GLIFOS DE ESTADO
 * ------------------------------------------------------------------------ */

function Glifo({ estado }: { estado: 'hecho' | 'curso' | 'espera' }) {
  if (estado === 'hecho') {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-brand" aria-hidden focusable="false">
        <path
          d="M2.5 6.4 L4.8 8.7 L9.5 3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (estado === 'curso') {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-brand" aria-hidden focusable="false">
        <circle className="rg-pulso" cx="6" cy="6" r="5" fill="currentColor" opacity="0.22" />
        <circle cx="6" cy="6" r="2.4" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-fg3" aria-hidden focusable="false">
      <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * LA PANTALLA
 * ------------------------------------------------------------------------ */

export function RigLoadingScreen({
  progress,
  loaded = 0,
  total = 0,
  item = '',
  compact = false,
}: {
  /** Porcentaje de bytes leidos que publica el gestor de carga de three. */
  progress: number;
  /** Bytes leidos y bytes declarados, del mismo gestor. Ver `flujoExacto`. */
  loaded?: number;
  total?: number;
  /** A que recurso se refieren las tres cifras de arriba. Ver `delRig`. */
  item?: string;
  compact?: boolean;
}) {
  // SELLOS HEREDADOS DE OTRA CARGA. El reloj de arranque guarda la PRIMERA marca
  // de cada nombre, y el atlas de Explorar pasa por el mismo cargador que el
  // rig. Quien abre Explorar y despues el laboratorio llega aqui con `bytes`,
  // `parse` y `listo` ya puestos por el atlas: contarlos como fases de ESTA
  // carga enseñaria las tres terminadas mientras el cuerpo todavia viene. Si al
  // montar ya existe `listo` --que solo lo emite un modelo entero ya preparado--
  // se renuncia a las fases y se dice lo poco que se sabe, que es justo lo que
  // pide la casa: sin dato defendible, no se inventa.
  const heredado = useRef<boolean | null>(null);
  if (heredado.current === null) heredado.current = stampedAt('listo') !== undefined;
  const porFases = !heredado.current;

  /** Fases terminadas: ms cronometrados por esta pantalla, o null si no vimos su principio. */
  const [hechas, setHechas] = useState<Partial<Record<FaseId, number | null>>>({});
  const desde = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);

  const cerrar = useCallback(
    (id: FaseId, ms: number | null) =>
      setHechas((prev) => (id in prev ? prev : { ...prev, [id]: ms })),
    [],
  );

  useEffect(() => {
    if (!porFases) return;
    // Un sello puede haber caido entre el primer render y este efecto.
    for (const p of PASOS) {
      if (p.cierra && stampedAt(p.cierra) !== undefined) cerrar(p.id, null);
    }
    return onStamp((nombre, t) => {
      const p = PASOS.find((x) => x.cierra === nombre);
      if (!p) return;
      cerrar(p.id, t - desde.current);
      desde.current = t;
    });
  }, [porFases, cerrar]);

  // EL ULTIMO FOTOGRAMA LIBRE, Y POR QUE LA DESCARGA SE CIERRA AQUI Y NO EN SU
  // SELLO.
  //
  // MEDIDO fotograma a fotograma (`requestAnimationFrame` sobre el laboratorio
  // del hombro, servidor de desarrollo): el cartel pinta el porcentaje hasta el
  // 99% a los 4.583 ms y despues solo pinta TRES veces mas, a los 4.629, los
  // 11.805 y los 16.673. Entre medias hay un hueco de 1,0 s (parseo) y otro de
  // 6,2 s (pases de preparacion). El sello `bytes` cae dentro del primer hueco,
  // y la actualizacion que provoca NO llega a pintarse sola: React la agrupa con
  // el despertar de Suspense, y ese mismo commit arrastra el efecto de
  // preparacion, que bloquea 6,2 s antes de soltar un fotograma. O sea que si la
  // fase solo cambiara con el sello, el cartel se quedaria 7,2 s diciendo
  // "Descargando el cuerpo" con la descarga ya terminada: el mismo defecto que
  // esta pantalla viene a arreglar, con otro texto.
  //
  // El fotograma de los 4.629 ms SI se pinta, y es el que ocurre cuando el flujo
  // de bytes se agota. Se usa ese.
  //
  // `loaded === total` EXACTO, no `>=`: `content-length` cuenta los bytes
  // COMPRIMIDOS cuando el servidor declara `Content-Encoding: gzip` (lo hace
  // `vite preview`, medido: 9.323.344 declarados contra 16.410.748 entregados),
  // y entonces el contador se pasa de largo --en una lectura real cruzo el
  // limite en 10.016.233 bytes, el 61% del flujo-- sin que la descarga haya
  // terminado. Pasarse del total es la firma de ese caso, asi que solo se cierra
  // la fase cuando el flujo mide EXACTAMENTE lo que dijo que medía. Si no, la
  // descarga sigue abierta hasta su sello, que nunca miente.
  //
  // Y SOLO SI LAS CIFRAS SON DEL RIG. El gestor de carga de three es UNO para
  // toda la aplicacion y mezcla en el mismo canal dos cosas distintas: los BYTES
  // que publica el lector del modelo y las CUENTAS DE ITEMS de `itemEnd` (1 de
  // 1, 2 de 2...). Medido fotograma a fotograma: sin este filtro la fase de
  // descarga se cerraba a los 1.000 ms --con la mano del fisioterapeuta, que
  // son 336 KB-- mientras el cuerpo seguia bajando hasta los 5.300 ms. Por eso
  // se exige la URL del rig y un total que solo puede ser bytes.
  //
  // Y SE DECIDE EN EL RENDER, NO EN UN EFECTO. Un `useEffect` corre DESPUES de
  // pintar, y el fotograma siguiente ya no existe: medido, el unico fotograma
  // libre tras agotarse el flujo es el que React pinta inmediatamente, y el
  // commit que viene detras arrastra el efecto de preparacion y bloquea seis
  // segundos. Un efecto llegaria tarde SIEMPRE. El efecto de abajo solo anota lo
  // que tardo; quien cambia de fase es esta linea.
  const delRig = item === RIG_URL;
  const flujoExacto = delRig && total > 1024 && loaded === total;
  const flujoAgotado = useRef(false);
  if (porFases && flujoExacto) flujoAgotado.current = true;

  useEffect(() => {
    if (!porFases || !flujoExacto) return;
    cerrar('descarga', performance.now() - desde.current);
    desde.current = performance.now();
  }, [porFases, flujoExacto, cerrar]);

  // La fase en curso es la primera sin cerrar.
  const cerradas = new Set<string>(Object.keys(hechas));
  if (flujoAgotado.current) cerradas.add('descarga');
  const activa = PASOS.findIndex((p) => !cerradas.has(p.id));
  const indice = activa < 0 ? PASOS.length - 1 : activa;

  // El porcentaje solo se enseña mientras significa algo: en la fase de
  // descarga, por debajo de 100 y con el sello sin caer (ver la cabecera: el
  // 100% llega con el 56,8% del flujo cuando el servidor declara el gzip).
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const descargando = porFases && indice === 0;
  const conCifra = descargando && delRig && pct > 0 && pct < 100;

  const altoFigura = compact ? 'h-32' : 'h-44';

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-page/85 px-4 backdrop-blur-sm">
      <style>{CSS}</style>
      <div
        className={`instrument flex flex-col ${compact ? 'gap-3 px-4 py-4' : 'gap-4 px-5 py-5'}`}
        style={{ width: compact ? '16.5rem' : '19rem' }}
      >
        <p className="kicker">Laboratorio de movimiento</p>

        {/* El marco lleva la PROPORCION del esquema (120 x 212), no el ancho de
            la tarjeta: el barrido se mide contra el cuerpo, y abarcando la
            tarjeta entera parecia un separador y no un escaner. */}
        <div className={`relative mx-auto ${altoFigura}`} style={{ aspectRatio: '120 / 212' }}>
          <Esquema capa={porFases ? indice + 1 : 2} />
          {/* El barrido: la unica pieza que tiene que seguir moviendose con el
              hilo principal bloqueado, de ahi el `transform` y nada mas. */}
          <div className="rg-escaner" aria-hidden />
        </div>

        <div className="hairline" />

        {porFases ? (
          <ul className="flex flex-col gap-2" role="status" aria-live="polite">
            {PASOS.map((p, i) => {
              const hecha = cerradas.has(p.id);
              const estado = hecha ? 'hecho' : i === indice ? 'curso' : 'espera';
              const ms = hechas[p.id];
              return (
                <li key={p.id} className="flex items-center gap-2.5">
                  <Glifo estado={estado} />
                  <span
                    className={`flex-1 text-[11px] leading-tight ${
                      estado === 'curso' ? 'text-fg' : estado === 'hecho' ? 'text-fg3' : 'text-fg3/70'
                    }`}
                  >
                    {p.titulo}
                  </span>
                  <span className="tnum font-mono text-[10px] text-fg3">
                    {typeof ms === 'number' ? enSegundos(ms) : conCifra && i === indice ? `${pct}%` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          // Sin fases fiables se dice una sola cosa, y verdadera.
          <div className="flex items-center gap-2.5" role="status" aria-live="polite">
            <Glifo estado="curso" />
            <span className="flex-1 text-[11px] leading-tight text-fg">Cargando el cuerpo completo</span>
            <span className="tnum font-mono text-[10px] text-fg3">
              {pct > 0 && pct < 100 ? `${pct}%` : ''}
            </span>
          </div>
        )}

        <div className="rg-pista">
          {conCifra ? (
            <div className="rg-relleno" style={{ transform: `scaleX(${pct / 100})` }} />
          ) : (
            <div className="rg-lanzadera" />
          )}
        </div>

        <div className="hairline" />
        {/* LA FRASE QUE SUSTITUYE A LA MENTIRA. La anterior prometia que la
            espera no se repetiria. Se repite: lo unico que queda guardado son
            los bytes, y esos eran 1,3 s de los 11,8 medidos.
            SIN TEMPORIZADOR, y antes lo tenia (1.200 ms, heredados del cartel
            viejo). MEDIDO en el movil con el modelo ya en cache: la descarga
            termina antes de ese plazo y el hilo se bloquea despues, asi que el
            aviso no llegaba a pintarse NUNCA en la segunda visita, que es
            justamente a quien va dirigido. */}
        <p className="text-[10.5px] leading-relaxed text-fg3">
          El cuerpo son 9 MB y se descargan una sola vez: quedan guardados en
          este navegador. El montaje, en cambio, se rehace en cada visita.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * CSS
 * ---------------------------------------------------------------------------
 * Va en el componente y no en index.css porque index.css lo comparten seis
 * pantallas y esto solo vive once segundos al entrar al laboratorio.
 *
 * Todo lo que se mueve lo hace con `transform` u `opacity`. Ver la cabecera:
 * entre `parse` y el primer fotograma el hilo principal no suelta, y esas dos
 * son las unicas propiedades que el compositor anima sin el.
 *
 * `prefers-reduced-motion` no apaga la informacion, solo el movimiento: el
 * barrido se queda quieto a media altura como una linea de referencia, la
 * lanzadera pasa a ser una barra tenue completa y las capas aparecen sin
 * transicion. Un instrumento clinico tiene que seguir siendo legible para quien
 * no puede con las animaciones.
 * ------------------------------------------------------------------------ */
const CSS = `
.rg-capa { opacity: 0; transition: opacity .5s ease-out; }
.rg-capa[data-on='1'] { opacity: 1; }
.rg-sil { fill: none; stroke: rgb(var(--c-fg3) / .55); stroke-width: 1.1; }
.rg-hueso { fill: none; stroke: #eae3d2; stroke-width: 1.2; stroke-linecap: round; }
.rg-hueso .rg-v { fill: #eae3d2; stroke: none; }
.rg-musculo { fill: #c23b3b; fill-opacity: .78; stroke: none; }
/* La piel entra medio segundo despues que el musculo: la fase se llama
   "musculo y piel" y asi se leen los dos tiempos en vez de uno. */
.rg-piel { fill: #d7a88f; fill-opacity: .12; stroke: #d7a88f; stroke-opacity: .45; stroke-width: 1.1; transition-delay: .45s; }
.rg-escaner {
  position: absolute; left: -22%; right: -22%; top: 0; height: 11%;
  pointer-events: none; will-change: transform;
  background: linear-gradient(180deg,
    rgb(var(--c-brand) / 0) 0%,
    rgb(var(--c-brand) / .08) 40%,
    rgb(var(--c-brand) / .42) 50%,
    rgb(var(--c-brand) / .08) 60%,
    rgb(var(--c-brand) / 0) 100%);
  animation: rg-barrido 2.8s cubic-bezier(.45,.05,.55,.95) infinite;
}
@keyframes rg-barrido {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(810%); }
  100% { transform: translateY(0); }
}
.rg-pista { position: relative; height: 2px; overflow: hidden; border-radius: 999px; background: rgb(var(--c-line)); }
.rg-relleno { height: 100%; border-radius: 999px; background: rgb(var(--c-brand)); transform-origin: left center; transition: transform .25s linear; }
.rg-lanzadera {
  position: absolute; inset: 0 auto 0 0; width: 34%; border-radius: 999px; will-change: transform;
  background: linear-gradient(90deg, rgb(var(--c-brand) / 0), rgb(var(--c-brand) / .9), rgb(var(--c-brand) / 0));
  animation: rg-lanzar 1.6s ease-in-out infinite;
}
@keyframes rg-lanzar {
  0%   { transform: translateX(-105%); }
  100% { transform: translateX(400%); }
}
.rg-pulso { animation: rg-latir 1.8s ease-in-out infinite; }
@keyframes rg-latir {
  0%, 100% { opacity: .12; }
  50%      { opacity: .42; }
}
@media (prefers-reduced-motion: reduce) {
  .rg-capa { transition: none; }
  .rg-escaner { animation: none; transform: translateY(400%); opacity: .5; }
  .rg-lanzadera { animation: none; width: 100%; opacity: .32; }
  .rg-relleno { transition: none; }
  .rg-pulso { animation: none; opacity: .3; }
}
`;
