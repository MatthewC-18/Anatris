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

import { useLabLive, type LabLive } from './useLabLive';

const SIDE_LABEL = { R: 'Derecho', L: 'Izquierdo' } as const;

/**
 * El nombre de la fase sin su coletilla de grados.
 *
 * Los datos la traen pegada --"Transicion a la elevacion (90-120°)"-- porque en
 * el panel de texto el nombre iba solo. Aqui la fase se escribe junto a su
 * rango y encima de una regla graduada: repetir las cifras dentro del nombre
 * lo alargaba hasta montarlo sobre el de la fase vecina. Solo se quita un
 * parentesis FINAL que lleve cifras; "(deltoides + manguito)" se queda.
 */
function sinRango(label: string): string {
  return label.replace(/\s*\([^()]*\d[^()]*\)\s*$/, '').trim() || label;
}

/** "-30" con el signo tipografico, no con un guion. */
function grados(n: number): string {
  const r = Math.round(n);
  return r < 0 ? `−${Math.abs(r)}` : String(r);
}

export function StageReadout({ compact = false }: { compact?: boolean }) {
  const live = useLabLive();
  if (!live) return null;
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
  const live = useLabLive();
  if (!live) return null;
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
