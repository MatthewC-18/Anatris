// src/components/study/StudyDashboard.tsx
//
// LA LECTURA DEL MODO REPASAR: racha, meta de hoy, dominio y lo que queda por
// repasar. Va encima de las pestanas porque responde, antes de tocar nada, a lo
// unico que quien abre este modo quiere saber: "cuanto me queda hoy".
//
// ERAN CUATRO TARJETAS EN FILA, cada una con su borde redondeado y su fondo, y
// la cuarta ademas tenida de acento: el patron de panel de control que el
// sistema LAMINA retira (docs/sistema-lamina.md, receta "una ficha de
// estadistica -> cifra y rotulo"). Ahora es UNA fila partida por filos: la cifra
// grande (`.readout`), su rotulo (`.kicker`) y una linea de detalle que dice lo
// que la cifra sola no decia (el record de la racha, cuantas faltan para la
// meta, que significa "dominio").
//
// El anillo de progreso y la llama se han ido con las tarjetas: el anillo
// repetia el "8/20" que tenia al lado y ahora es la barra de 2 px del sistema
// (`.meter`); la llama era un icono ambar, y el ambar en LAMINA queda para
// candados y avisos.
//
// Es una lectura pura de localStorage (racha + agenda de repaso); el padre sube
// `refreshKey` tras cada tarjeta calificada para que las cifras se muevan en
// vivo.

import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { getStreak, DAILY_GOAL } from '../../lib/streak';
import { getDeckStats } from '../../lib/srsStore';

interface StudyDashboardProps {
  region: string;
  /** Todos los ids de tarjeta de la region (una por dato de cada musculo). */
  cardIds: string[];
  /** Lo sube el padre para forzar una relectura tras cada repaso. */
  refreshKey: number;
}

export function StudyDashboard({ region, cardIds, refreshKey }: StudyDashboardProps) {
  const now = Date.now();
  const streak = useMemo(
    () => getStreak(now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey],
  );
  const stats = useMemo(
    () => getDeckStats(region, cardIds, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [region, cardIds, refreshKey],
  );

  const goalPct = Math.min(100, Math.round((streak.reviewedToday / DAILY_GOAL) * 100));
  const goalLeft = Math.max(0, DAILY_GOAL - streak.reviewedToday);
  // La racha sigue viva pero hoy todavia no se ha repasado nada: es el unico
  // momento en que la cifra puede perderse, asi que se dice.
  const streakAtRisk = streak.current > 0 && streak.reviewedToday === 0;

  return (
    <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-4">
      <Cell
        index={0}
        label="Racha"
        detail={
          streakAtRisk
            ? 'Repasa hoy para mantenerla'
            : streak.longest > streak.current
              ? `Récord: ${streak.longest} ${streak.longest === 1 ? 'día' : 'días'}`
              : streak.current > 0
                ? 'Es tu mejor racha'
                : 'Empieza hoy con una tarjeta'
        }
      >
        {streak.current}
        <Unit>{streak.current === 1 ? 'día' : 'días'}</Unit>
      </Cell>

      <Cell
        index={1}
        label="Meta de hoy"
        detail={
          <>
            <span
              className="meter mb-1.5 block text-brand"
              style={{ '--v': goalPct } as CSSProperties}
              aria-hidden="true"
            />
            {goalLeft === 0
              ? 'Meta cumplida'
              : `${goalLeft === 1 ? 'Falta 1 repaso' : `Faltan ${goalLeft} repasos`}`}
          </>
        }
      >
        {streak.reviewedToday}
        <Unit>/{DAILY_GOAL}</Unit>
      </Cell>

      <Cell
        index={2}
        label="Dominio"
        detail={`${stats.mature} de ${stats.total} afianzadas`}
        title="Una tarjeta está afianzada cuando su próximo repaso queda a 21 días o más."
      >
        {stats.masteryPct}
        <Unit>%</Unit>
      </Cell>

      <Cell
        index={3}
        label="Para repasar"
        tone={stats.toReview > 0 ? 'text-brand' : undefined}
        detail={stats.toReview > 0 ? 'Pendientes ahora' : 'Estás al día'}
      >
        {stats.toReview}
      </Cell>
    </dl>
  );
}

/**
 * Una cifra de la fila. El filo vertical que la separa de la anterior depende
 * del ancho: por debajo de `sm` la fila son DOS columnas (a 390 px las cuatro
 * cifras con su rotulo no caben: 4 x ~90 px de rotulo mas el aire pasan de los
 * 358 px utiles), asi que el filo va en las columnas pares; desde `sm` son
 * cuatro y lo llevan todas menos la primera.
 *
 * En el DOM el rotulo (`dt`) va antes que la cifra (`dd`), que es lo que exige
 * un `dl`; `order` los pinta al reves, cifra arriba y rotulo debajo.
 */
function Cell({
  index,
  label,
  detail,
  tone,
  title,
  children,
}: {
  index: number;
  label: string;
  detail: ReactNode;
  /** Color de la cifra cuando no es el neutro (solo el acento, para "hay algo que hacer"). */
  tone?: string;
  title?: string;
  children: ReactNode;
}) {
  const edge = [
    index % 2 === 1 ? 'border-l border-line/75 pl-4' : 'pr-4',
    index > 0 ? 'sm:border-l sm:border-line/75 sm:pl-4' : '',
    index < 3 ? 'sm:pr-4' : 'sm:pr-0',
  ].join(' ');
  return (
    <div className={`flex min-w-0 flex-col ${edge}`} title={title}>
      <dt className="kicker order-2 mt-2">{label}</dt>
      <dd className={`readout order-1 text-2xl ${tone ?? ''}`}>{children}</dd>
      <dd className="order-3 mt-1.5 text-[11px] leading-snug text-fg3">{detail}</dd>
    </div>
  );
}

/** La unidad pegada a la cifra: pequena y en la voz mono, para que no compita. */
function Unit({ children }: { children: ReactNode }) {
  return <span className="num ml-1 text-xs font-medium text-fg3">{children}</span>;
}
