// src/components/movement/StageReadout.tsx
//
// LA LECTURA DEL MOVIMIENTO, SOBRE EL ESCENARIO.
//
// Dos piezas tipograficas, sin caja, encima del cuerpo:
//
//   <StageReadout>   arriba a la izquierda: que gesto, en que plano, de que
//                    lado; el ANGULO en grande; y la fase en la que se esta.
//   <StageArcTrack>  al pie: el arco entero como una regla, partido en sus
//                    fases, con un cursor que lo recorre.
//
// POR QUE AQUI Y NO EN EL MARGEN. Mientras el gesto corre se mira el cuerpo. El
// angulo era un dial de 90 px en la esquina de una columna de texto, y la fase
// --"Rango medio", "Arco doloroso"-- cambiaba en una linea de 11 px dos parrafos
// mas abajo: lo que cambia pasaba fuera de la vista. "Que se aprecie mejor lo
// que esta pasando con la info que va cambiando." Ahora el numero grande esta
// junto al cuerpo y la regla dice de un vistazo en que parte del arco se esta,
// cuanto queda y que fase viene.
//
// SOLO LECTURA: `useLabLive` se suscribe al mismo rigChannel que mueve el rig.
// Son anotaciones de lamina (`pointer-events: none`): el modelo se sigue
// pudiendo girar por debajo.

import { useLabDemo, useLabLive, type LabDemo, type LabLive } from './useLabLive';
import { grados, sinRango } from '../../lib/phaseLabel';
import { useNeuroSkin } from './neuroSkinChannel';
import { useActiveDemo } from './demoChannel';
import { NEURO_BY_REGION } from '../../data/neuro';
import { pigmentFor, type PlateFigure } from '../../data/neuro/plate';
import type { NerveRoot } from '../../types/neuro';

const SIDE_LABEL = { R: 'Derecho', L: 'Izquierdo' } as const;

// El nombre de la fase sin su coletilla de grados (`sinRango`) y los grados con
// el signo tipografico (`grados`) viven en src/lib/phaseLabel.ts: los usa
// tambien el paginador del margen.
//
// Los datos traen el tramo pegado --"Transicion a la elevacion (90-120°)"--
// porque en el panel de texto el nombre iba solo. Aqui la fase se escribe junto
// a su rango y encima de una regla graduada: repetir las cifras dentro del
// nombre lo alargaba hasta montarlo sobre el de la fase vecina. Solo se quita un
// parentesis FINAL que lleve cifras; "(deltoides + manguito)" se queda.

/**
 * True mientras la pestana Neuro ensena la CARTA de dermatomas: hay figura
 * publicada y no corre ningun demo (con un miotoma en marcha vuelve la lectura
 * del gesto, porque lo que se mira es el movimiento).
 */
function useNeuroChart(): PlateFigure | null {
  const skin = useNeuroSkin();
  const demo = useActiveDemo();
  return skin.figure && !demo ? skin.figure : null;
}

const FIGURE_LABEL: Record<PlateFigure, string> = {
  'upper-limb': 'Miembro superior',
  'lower-limb': 'Miembro inferior',
};

function rootById(figure: PlateFigure, id: string): NerveRoot | undefined {
  for (const set of Object.values(NEURO_BY_REGION)) {
    if (set.figure !== figure) continue;
    const r = set.roots.find((x) => x.id === id);
    if (r) return r;
  }
  return undefined;
}

/**
 * LA LECTURA DE LA CARTA DE DERMATOMAS.
 *
 * Con la pestana Neuro abierta el escenario ya no habla del gesto de la consola
 * (que sigue puesto, pero no es lo que se esta mirando): dice que carta es y,
 * con una raiz elegida, la raiz en grande con su territorio, su punto clave, su
 * miotoma y su reflejo. Es la ficha de la raiz, escrita junto a su territorio.
 */
function NeuroStageReadout({ figure, compact }: { figure: PlateFigure; compact: boolean }) {
  const skin = useNeuroSkin();
  const roots = skin.picked.map((id) => rootById(figure, id)).filter((r): r is NerveRoot => !!r);
  return (
    <div
      className={`stage-veil-top pointer-events-none absolute left-0 top-0 z-10 ${
        compact ? 'pb-10 pl-3 pr-16 pt-2.5' : 'pb-14 pl-5 pr-24 pt-4'
      }`}
    >
      <p className="stage-note">
        <span className="text-fg2">Dermatomas</span>
        {` · ${FIGURE_LABEL[figure]}`}
      </p>
      {roots.length === 0 ? (
        <p className={`mt-2 max-w-[22rem] text-fg2 ${compact ? 'text-[12px]' : 'text-[13px]'} leading-snug`}>
          Cada color es el territorio de una raíz. Toca un nombre sobre el cuerpo
          o una raíz de la lista para verla sola.
        </p>
      ) : (
        <div className={`flex items-start gap-6 ${compact ? 'mt-1' : 'mt-2'}`}>
          {roots.map((r) => (
            <div key={r.id} className="animate-slide-up">
              <p className="flex items-baseline gap-3">
                <span
                  className={`readout stage-angle ${compact ? 'text-[2.25rem]' : 'text-[3.5rem]'}`}
                  style={{ color: pigmentFor(figure, r.id) }}
                >
                  {r.label}
                </span>
                <span
                  className={`font-display font-semibold text-fg ${
                    compact ? 'text-[13px] leading-snug' : 'text-[15px]'
                  }`}
                >
                  {r.dermatome.area}
                </span>
              </p>
              {/* EN EL MOVIL, SOLO LA RAIZ Y SU TERRITORIO. A 375 px el punto
                  clave, el miotoma y el reflejo caian encima de la cara del
                  modelo (visto en el navegador), y los tres ya estan en la fila
                  de la raiz, en la hoja de abajo. */}
              {!compact && (
              <dl className="mt-1.5 grid max-w-[24rem] grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px] leading-snug">
                <dt className="kicker self-center">Punto clave</dt>
                <dd className="text-fg2">{r.dermatome.keyPointShort ?? r.dermatome.keyPoint}</dd>
                <dt className="kicker self-center">Miotoma</dt>
                <dd className="text-fg2">{r.myotome.action}</dd>
                {/* LA FALTA DE REFLEJO TAMBIEN ES UN DATO. C8, T1 y L5 no tienen
                    reflejo propio en la exploracion de rutina, y esa ausencia es
                    lo que se apunta (la comparacion de NeuroPanel lo dice igual).
                    Omitir la fila hacia que pareciera un dato que faltaba. */}
                <dt className="kicker self-center">Reflejo</dt>
                <dd className={r.reflex ? 'text-fg2' : 'text-fg3'}>
                  {r.reflex ? r.reflex.name : 'Sin reflejo propio'}
                </dd>
              </dl>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * LA LECTURA DE UN DEMO CUYO GESTO NO ESTA CARGADO (ver `useLabDemo`): el
 * nombre de la maniobra, el lado, el angulo en grande y lo que evalua. Sin arco
 * no hay fase ni regla, pero el rig se esta moviendo y lo que se mueve se dice.
 */
function DemoStageReadout({ live, compact }: { live: LabDemo; compact: boolean }) {
  const { demo, angle, side } = live;
  return (
    <div
      className={`stage-veil-top pointer-events-none absolute left-0 top-0 z-10 ${
        compact ? 'pb-10 pl-3 pr-16 pt-2.5' : 'pb-14 pl-5 pr-24 pt-4'
      }`}
    >
      <p className="stage-note">
        <span className="text-fg2">{demo.label}</span>
        <span>{` · ${SIDE_LABEL[side]}`}</span>
      </p>
      <div className={`flex items-end gap-3 ${compact ? 'mt-1' : 'mt-2'}`}>
        <p className="flex items-start" aria-label={`${Math.round(angle)} grados`}>
          <span className={`readout stage-angle ${compact ? 'text-[2.25rem]' : 'text-[3.5rem]'}`}>
            {grados(angle)}
          </span>
          <span className={`readout text-fg3 ${compact ? 'text-lg' : 'mt-1 text-2xl'}`}>°</span>
        </p>
        {demo.structure && (
          <p
            className={`max-w-[18rem] font-display font-semibold leading-snug text-fg ${
              compact ? 'pb-0.5 text-[13px]' : 'pb-1.5 text-[15px]'
            }`}
          >
            {demo.structure}
          </p>
        )}
      </div>
    </div>
  );
}

export function StageReadout({ compact = false }: { compact?: boolean }) {
  const neuro = useNeuroChart();
  const live = useLabLive();
  const demoOnly = useLabDemo();
  if (neuro) return <NeuroStageReadout figure={neuro} compact={compact} />;
  if (!live) return demoOnly ? <DemoStageReadout live={demoOnly} compact={compact} /> : null;
  const { movement, at, angle, gestureName, isSpine, side, demo } = live;

  // Durante un demo lo que se ensena tiene nombre propio (la prueba, el
  // miotoma); el gesto pasa a ser el dato de al lado.
  const titulo = demo ? demo.label : gestureName;
  const datos = [demo ? gestureName : null, movement.plane ?? null, isSpine ? null : SIDE_LABEL[side]]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={`stage-veil-top pointer-events-none absolute left-0 top-0 z-10 ${
        compact ? 'pb-10 pl-3 pr-16 pt-2.5' : 'pb-14 pl-5 pr-24 pt-4'
      }`}
    >
      <p className="stage-note">
        <span className="text-fg2">{titulo}</span>
        {datos && <span>{` · ${datos}`}</span>}
      </p>
      <div className={`flex items-end gap-3 ${compact ? 'mt-1' : 'mt-2'}`}>
        <p className="flex items-start" aria-label={`${Math.round(angle)} grados`}>
          <span className={`readout stage-angle ${compact ? 'text-[2.25rem]' : 'text-[3.5rem]'}`}>
            {grados(angle)}
          </span>
          <span className={`readout text-fg3 ${compact ? 'text-lg' : 'mt-1 text-2xl'}`}>°</span>
        </p>
        {at && (
          // `key` por indice de fase: al cambiar de fase el bloque se vuelve a
          // montar y entra con un gesto corto. Es la unica animacion de esta
          // lectura, y existe para que el cambio de fase se VEA sin leerlo.
          <div key={at.index} className={`animate-slide-up ${compact ? 'pb-0.5' : 'pb-1.5'}`}>
            <p className={`font-display font-semibold text-fg ${compact ? 'text-[13px]' : 'text-[15px]'}`}>
              {sinRango(at.phase.label)}
            </p>
            <p className="num mt-0.5 text-[11px] text-fg3">
              {grados(at.phase.startDeg)}° a {grados(at.phase.endDeg)}°
              {at.total > 1 && <span>{` · fase ${at.index + 1} de ${at.total}`}</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Una fase cuyo tramo es tan corto que su nombre no cabe dentro. */
function estrecha(live: LabLive, index: number): boolean {
  const p = live.arc.phases[index];
  if (!p) return false;
  return enRegla(live, p.endDeg) - enRegla(live, p.startDeg) < 26;
}

/** El centro de un rotulo, corrido lo justo para que no se salga de la regla. */
function centroVisible(centro: number, ancho: number): number {
  const medio = Math.min(ancho, 100) / 2;
  return Math.max(medio, Math.min(100 - medio, centro));
}

/** Donde cae un angulo en la regla, de 0 a 100. */
function enRegla(live: LabLive, deg: number): number {
  const { min, max } = live.arc;
  if (max <= min) return 0;
  return Math.max(0, Math.min(100, ((deg - min) / (max - min)) * 100));
}

export function StageArcTrack({ compact = false }: { compact?: boolean }) {
  const neuro = useNeuroChart();
  const live = useLabLive();
  // En la carta de dermatomas no hay arco que leer.
  if (neuro || !live) return null;
  const { arc, at, angle } = live;
  if (arc.max <= arc.min) return null;

  const cursor = enRegla(live, angle);
  // Las marcas con cifra: los extremos, el cero si el arco lo cruza y cada
  // frontera de fase. Se descartan las que caerian a menos del 7% de la
  // anterior: dos cifras montadas no se leen ninguna.
  const candidatas = [arc.min, ...arc.phases.map((p) => p.endDeg), arc.max];
  if (arc.bidirectional) candidatas.push(0);
  const cifras: number[] = [];
  for (const d of [...new Set(candidatas)].sort((a, b) => a - b)) {
    const ultima = cifras[cifras.length - 1];
    if (ultima === undefined || enRegla(live, d) - enRegla(live, ultima) >= 7) cifras.push(d);
  }
  // El extremo final manda sobre la ultima frontera si se pisan.
  if (cifras[cifras.length - 1] !== arc.max) {
    cifras.pop();
    cifras.push(arc.max);
  }
  // Y el tope del cuadro, si recorta el arco, lleva su cifra (en ambar): se
  // quitan las que caerian encima.
  const topes = [live.reach.max < arc.max ? live.reach.max : null, live.reach.min > arc.min ? live.reach.min : null].filter(
    (d): d is number => d !== null,
  );
  for (const t of topes) {
    for (let i = cifras.length - 1; i >= 0; i--) {
      if (Math.abs(enRegla(live, cifras[i]) - enRegla(live, t)) < 7) cifras.splice(i, 1);
    }
  }

  return (
    <div
      className={`stage-veil-bottom pointer-events-none absolute inset-x-0 bottom-0 z-10 ${
        compact ? 'px-3 pb-9 pt-8' : 'px-7 pb-11 pt-10'
      }`}
      aria-hidden
    >
      <div className="relative h-11">
        {/* Los nombres de las fases, cada uno centrado en su tramo. */}
        {arc.phases.map((p, i) => {
          const a = enRegla(live, p.startDeg);
          const b = enRegla(live, p.endDeg);
          const ancho = b - a;
          const activa = at?.index === i;
          // En un tramo estrecho el nombre no cabe: solo se escribe el de la
          // fase activa, que es el que importa.
          if (ancho < (compact ? 22 : 13) && !activa) return null;
          // Y si la activa es estrecha, su nombre se sale del tramo: las dos
          // vecinas le ceden el sitio en vez de montarse con el.
          const vecinaDeEstrecha =
            !activa && at !== null && Math.abs(at.index - i) === 1 && estrecha(live, at.index);
          if (vecinaDeEstrecha) return null;
          return (
            <p
              key={`${p.label}-${i}`}
              className={`absolute top-0 -translate-x-1/2 truncate text-center text-[11px] transition-colors duration-200 ${
                activa ? 'stage-angle font-semibold text-fg' : 'text-fg3'
              }`}
              style={{
                left: `${centroVisible((a + b) / 2, activa ? Math.max(ancho, 34) : ancho)}%`,
                maxWidth: `${activa ? Math.max(ancho, 34) : ancho}%`,
              }}
            >
              {sinRango(p.label)}
            </p>
          );
        })}

        {/* La regla. */}
        <div className="absolute inset-x-0 top-[22px] h-px bg-fg3/40" />
        {/* LO QUE EL CUADRO NO DEJA ALCANZAR, en ambar. La regla sigue mostrando
            el arco entero (la referencia), pero con el hombro congelado el brazo
            se para en 115° y sin marcarlo parecia que el gesto llegaba a 180°. */}
        {live.reach.max < arc.max && (
          <>
            <div
              className="absolute top-[21px] h-[3px] bg-amber-300/25"
              style={{
                left: `${enRegla(live, live.reach.max)}%`,
                width: `${100 - enRegla(live, live.reach.max)}%`,
              }}
            />
            <span
              className="absolute top-[16px] h-[11px] w-px bg-amber-300"
              style={{ left: `${enRegla(live, live.reach.max)}%` }}
            />
          </>
        )}
        {live.reach.min > arc.min && (
          <>
            <div
              className="absolute top-[21px] h-[3px] bg-amber-300/25"
              style={{ left: 0, width: `${enRegla(live, live.reach.min)}%` }}
            />
            <span
              className="absolute top-[16px] h-[11px] w-px bg-amber-300"
              style={{ left: `${enRegla(live, live.reach.min)}%` }}
            />
          </>
        )}
        {/* El tramo de la fase activa, en el acento. */}
        {at && (
          <div
            className="absolute top-[21px] h-[3px] bg-brand transition-[left,width] duration-200"
            style={{
              left: `${enRegla(live, at.phase.startDeg)}%`,
              width: `${enRegla(live, at.phase.endDeg) - enRegla(live, at.phase.startDeg)}%`,
            }}
          />
        )}
        {/* Fronteras de fase: una muesca. */}
        {[arc.min, ...arc.phases.map((p) => p.endDeg)].map((d, i) => (
          <span
            key={`m-${i}-${d}`}
            className="absolute top-[18px] h-[9px] w-px bg-fg3/70"
            style={{ left: `${enRegla(live, d)}%` }}
          />
        ))}
        {/* Las cifras. */}
        {cifras.map((d) => (
          <span
            key={`c-${d}`}
            className="num absolute top-[30px] -translate-x-1/2 text-[10px] text-fg3"
            style={{ left: `${enRegla(live, d)}%` }}
          >
            {grados(d)}°
          </span>
        ))}
        {topes.map((d) => (
          <span
            key={`t-${d}`}
            className="num absolute top-[30px] -translate-x-1/2 text-[10px] text-amber-200"
            style={{ left: `${enRegla(live, d)}%` }}
          >
            {grados(d)}°
          </span>
        ))}
        {/* El cursor: donde esta el gesto ahora. */}
        <span
          className="stage-cursor absolute top-[13px] h-[19px] w-[2px] -translate-x-1/2 bg-fg"
          style={{ left: `${cursor}%` }}
        >
          <span className="absolute -top-[5px] left-1/2 h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-fg" />
        </span>
      </div>
    </div>
  );
}
