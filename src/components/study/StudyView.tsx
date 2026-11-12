// src/components/study/StudyView.tsx
//
// El modo "Repasar". Abre en Repaso (repeticion espaciada), que es lo que hace
// volver cada dia, y ofrece otras cuatro formas de trabajar la misma region:
//   - Repaso: solo las tarjetas que tocan hoy mas un goteo diario de nuevas.
//   - Casos: casos clinicos paso a paso (CaseView, que lleva otro fichero).
//   - Cuestionario: preguntas de opcion multiple generadas sobre la region.
//   - Tarjetas: el mazo entero, sin agenda.
//   - Mi coleccion: lo que el usuario ha guardado, con sus notas.
//
// Los modulos conceptuales (Fundamentos) no tienen lista de musculos, asi que
// para ellos hay un estado vacio CON SALIDA. Todo el material sale de los datos
// clinicos de la region a traves de studyEngine: una region nueva trae su
// cuestionario, su mazo y su agenda sin tocar este fichero.
//
// -----------------------------------------------------------------------------
// LA PANTALLA ERA "CUALQUIER PROGRAMA"
// -----------------------------------------------------------------------------
// Cuatro tarjetas de cifras en fila, una barra de pestanas metida en un
// contenedor redondeado con fondo, pastillas de recuento dentro de cada pestana
// y otra pastilla verde para "En tu cuenta". Con el sistema LAMINA
// (docs/sistema-lamina.md) queda asi:
//
//   REPASAR                                   EN ESTE DISPOSITIVO
//   Hombro
//   3 dias   | 8 /20       | 12 %       | 14          <- una fila partida por filos
//   RACHA    | META DE HOY | DOMINIO    | PARA REPASAR
//   Repaso 14   Casos 4   Cuestionario   Tarjetas   Mi coleccion 2
//   ─────────────────────────────────────────────────  <- el filo de las pestanas
//
// UNA SOLA COLUMNA QUE SE DESPLAZA, CON LAS PESTANAS PEGADAS ARRIBA. Antes la
// cabecera entera era fija y solo se desplazaba el cuerpo: en un telefono
// (390 x 844, 634 px utiles bajo la barra y el aviso) las cifras en dos filas y
// las pestanas se llevaban unos 290 px, y la tarjeta de 256 px dejaba los
// botones de calificar fuera de la pantalla en CADA tarjeta. Ahora la cabecera
// se va con el desplazamiento y lo unico que se queda es la fila de pestanas.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { musclesForRegion } from '../../data/musclesByRegion';
import { REGIONS } from '../../data/regiones';
import { buildStudyCards } from '../../lib/studyEngine';
import { getDeckStats } from '../../lib/srsStore';
import { useAuth } from '../../auth/AuthContext';
import { useStudySync } from '../../hooks/useStudySync';
import { casesForRegion } from '../../data/clinicalCases';
import { QuizView } from './QuizView';
import { FlashcardsView } from './FlashcardsView';
import { ReviewView } from './ReviewView';
import { CaseView } from './CaseView';
import { StudyDashboard } from './StudyDashboard';
import { CollectionView } from './CollectionView';
import { useCollection } from '../../hooks/useCollection';
import { useAnatomyStore } from '../../store/anatomyStore';
import { EVENTS, track } from '../../lib/analytics';

type StudyTab = 'review' | 'cases' | 'quiz' | 'cards' | 'collection';

interface StudyViewProps {
  /** Active region id from the store. null/concept => empty state. */
  region: string | null;
  /** True for conceptual modules (Fundamentos), which have no muscles. */
  isConcept: boolean;
  /**
   * Abre el dialogo de inicio de sesion. Opcional: sin el, la cabecera solo
   * DICE donde se guarda el progreso; con el, ademas ofrece llevarlo a la
   * cuenta.
   */
  onOpenAuth?: () => void;
}

export function StudyView({ region, isConcept, onOpenAuth }: StudyViewProps) {
  const [tab, setTabState] = useState<StudyTab>('review');
  const setRegion = useAnatomyStore((s) => s.setRegion);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  // Which study surface people choose — repaso (SRS), casos, cuestionario or
  // tarjetas. The SRS is the retention engine, so knowing whether anyone
  // actually opens it decides how much the return-loop work (S7) is worth.
  const setTab = useCallback(
    (next: StudyTab) => {
      setTabState(next);
      track(EVENTS.studyTabOpened, { region, tab: next });
      // Si la cabecera ya se habia ido con el desplazamiento, la pestana nueva
      // empieza justo bajo la fila de pestanas, no a media lista de la anterior.
      const sc = scrollRef.current;
      const head = headerRef.current;
      if (sc && head && sc.scrollTop > head.offsetHeight) sc.scrollTop = head.offsetHeight;
    },
    [region],
  );
  // Bumped after any session activity to re-read persisted progress / schedules.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((n) => n + 1), []);

  // Account sync (no-op in demo mode / when signed out): pulls + merges on login
  // and pushes study progress as it changes. `refresh` re-reads after a merge.
  const { snapshot, studyCloud } = useAuth();
  const synced = Boolean(studyCloud && snapshot.user);
  useStudySync(refreshKey, refresh);

  const regionId = region ?? 'shoulder';
  const muscles = useMemo(() => musclesForRegion(regionId), [regionId]);
  // SRS works on atomic per-fact cards, so the dashboard / due-count must count
  // those ids (not one per muscle).
  const cardIds = useMemo(() => buildStudyCards(muscles).map((c) => c.id), [muscles]);
  const regionName = REGIONS[regionId]?.name ?? 'Región';

  // Cards-due count on the Repaso tab.
  const dueCount = useMemo(
    () => getDeckStats(regionId, cardIds, Date.now()).toReview,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regionId, cardIds, refreshKey],
  );
  const caseCount = useMemo(() => casesForRegion(regionId).length, [regionId]);
  // Saved items in THIS region, for the tab count. `useCollection` subscribes,
  // so saving from the muscle sheet updates it without a refresh.
  const savedCount = useCollection(regionId).count;

  // La pestana activa a la vista: en un telefono la fila se desplaza de lado y
  // "Mi colección" puede quedar cortada por el borde.
  const tabRefs = useRef<Partial<Record<StudyTab, HTMLButtonElement | null>>>({});
  useEffect(() => {
    tabRefs.current[tab]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [tab]);

  if (isConcept) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-base font-semibold text-fg">
            El repaso se hace por región anatómica
          </p>
          <p className="mt-2 text-sm leading-relaxed text-fg3">
            Fundamentos es un módulo de lectura y no tiene músculos que
            preguntar. Elige una región en la barra superior para repasar con
            repetición espaciada, casos, cuestionarios y tarjetas.
          </p>
          <button
            type="button"
            onClick={() => setRegion('shoulder')}
            className="btn btn-line mt-4"
          >
            Repasar el hombro
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: StudyTab; label: string; count?: number; urgent?: boolean }[] = [
    { id: 'review', label: 'Repaso', count: dueCount, urgent: dueCount > 0 },
    { id: 'cases', label: 'Casos', count: caseCount },
    { id: 'quiz', label: 'Cuestionario' },
    { id: 'cards', label: 'Tarjetas' },
    { id: 'collection', label: 'Mi colección', count: savedCount },
  ];

  return (
    // `data-study-view` marca el alcance del teclado del repaso: el gancho
    // useStudyKeys comprueba que nada tape ESTA vista antes de usar una tecla.
    <div
      ref={scrollRef}
      data-study-view=""
      className="h-full overflow-y-auto overscroll-contain bg-page"
    >
      {/* Cabecera: region, donde se guarda el progreso y la fila de cifras. */}
      <header ref={headerRef} className="mx-auto max-w-2xl px-6 pb-4 pt-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="kicker">Repasar</p>
            <h1 className="mt-1.5 font-display text-xl font-semibold leading-tight text-fg">
              {regionName}
            </h1>
          </div>
          {/* DONDE VIVE EL PROGRESO. Solo se decia cuando estaba en la cuenta;
              sin sesion no se decia nada, y la racha y la agenda viven en el
              almacenamiento de ESTE navegador: quien lo limpia o cambia de
              equipo las pierde sin que nadie se lo hubiera avisado. */}
          {synced ? (
            <span className="tag inline-flex items-center gap-1.5 text-brand">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              En tu cuenta
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span
                className="tag"
                title="Tu progreso se guarda en este navegador. Con una cuenta te sigue a tus otros dispositivos."
              >
                En este dispositivo
              </span>
              {onOpenAuth && studyCloud && (
                <button type="button" onClick={onOpenAuth} className="btn btn-quiet btn-sm">
                  Sincronizar
                </button>
              )}
            </span>
          )}
        </div>

        <div className="mt-5">
          <StudyDashboard region={regionId} cardIds={cardIds} refreshKey={refreshKey} />
        </div>
      </header>

      {/* PESTANAS. El filo corre de lado a lado de la vista; la fila va en la
          misma columna que todo lo demas. A 360 px las cinco con sus recuentos
          no caben (unos 370 px contra 312 utiles), asi que la fila se desplaza
          de lado sin barra visible en vez de partirse en dos lineas, que
          dejaria el subrayado de la primera en medio de la segunda.
          El `-mb-px pb-px` es para que el subrayado de 2 px de la activa pise
          el filo en vez de quedar recortado por el `overflow`. */}
      <div className="sticky top-0 z-10 border-b border-line/75 bg-page">
        <div className="mx-auto max-w-2xl">
          <div className="-mb-px overflow-x-auto px-6 pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              role="tablist"
              aria-label="Formas de repasar"
              className="tabs w-max min-w-full border-b-0"
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`study-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="study-tab-panel"
                  onClick={() => setTab(t.id)}
                  className="tab min-h-[44px] sm:min-h-0"
                >
                  {t.label}
                  {t.count != null && t.count > 0 && (
                    <span className={`num text-[11px] ${t.urgent ? 'text-brand' : 'text-fg3'}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div role="tabpanel" id="study-tab-panel" aria-labelledby={`study-tab-${tab}`}>
        {tab === 'review' ? (
          <ReviewView
            key={`review-${regionId}`}
            region={regionId}
            muscles={muscles}
            onReviewed={refresh}
            onGoTo={setTab}
          />
        ) : tab === 'cases' ? (
          <CaseView key={`cases-${regionId}`} region={regionId} onFinished={refresh} />
        ) : tab === 'quiz' ? (
          <QuizView
            key={`quiz-${regionId}`}
            region={regionId}
            muscles={muscles}
            onFinished={refresh}
          />
        ) : tab === 'collection' ? (
          <CollectionView key={`collection-${regionId}`} region={regionId} />
        ) : (
          <FlashcardsView
            key={`cards-${regionId}`}
            region={regionId}
            muscles={muscles}
            onFinished={refresh}
          />
        )}
      </div>
    </div>
  );
}
