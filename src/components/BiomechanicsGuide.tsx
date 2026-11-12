// src/components/BiomechanicsGuide.tsx
//
// Step-by-step narration of a movement (e.g. abduction), played alongside the
// live 3D model. This is the honest alternative to deforming the rigid Z-
// Anatomy meshes: instead of faking skinned motion, we NARRATE the gesture over
// the real, highlighted anatomy.
//
// Each step drives the model through mechanisms the store already owns:
//   - setRomPhase(movementId, stepIndex, muscleMap) lights the step's muscles
//     by role (amber prime-mover / sky assistant / violet stabilizer),
//   - requestView(view) animates the camera to the most legible angle,
//   - setSideFilter(side) isolates the studied side so the scene stays clean.
//
// The guide cleans up after itself: leaving the phase clears the ROM highlight
// and restores the side filter to 'both'.
//
// PRESENTACION: LAMINA. Era una tarjeta con borde dentro de la columna de
// lectura, con otra tarjeta dentro para el paso y una pastilla para el rango, y
// los pasos eran barritas de 6 px de alto sin texto (el titulo de cada uno solo
// vivia en un `title`). Ahora es una seccion de la pagina: rotulo y filo, y los
// pasos son una LISTA DE OPCIONES con su titulo y su rango, todos a la vista,
// para que el gesto se lea entero antes de recorrerlo. El paso activo despliega
// debajo su explicacion y sus musculos.
//
// ASCII-only source. UI strings Spanish LATAM. No `any`.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAnatomyStore, type SideFilter } from '../store/anatomyStore';
import { Sourced } from './MuscleContentSections';
import { muscleContentForRegion } from '../data/muscleContentByRegion';
import { musclesForRomLookup } from '../data/musclesByRegion';
import { ROLE_TONE_CSS } from '../lib/romRolePalette';
import { formatRoute } from '../lib/routing';
import { useIsCompact } from '../hooks/useIsCompact';
import type { GestureGuide, GuideStep } from '../types/pedagogy';
import type { RomMuscleRole } from '../types/rom';

const ROLE_LABEL: Record<RomMuscleRole, string> = {
  'prime-mover': 'Motor principal',
  assistant: 'Asistente',
  'eccentric-control': 'Freno excéntrico',
  stabilizer: 'Estabilizador',
};

interface BiomechanicsGuideProps {
  guide: GestureGuide;
}

/** Build the muscleId -> role map a step needs for setRomPhase. */
function stepMuscleMap(step: GuideStep): Map<string, RomMuscleRole> {
  const map = new Map<string, RomMuscleRole>();
  for (const m of step.muscles) map.set(m.id, m.role);
  return map;
}

export function BiomechanicsGuide({ guide }: BiomechanicsGuideProps): JSX.Element {
  const setRomPhase = useAnatomyStore((s) => s.setRomPhase);
  const clearRom = useAnatomyStore((s) => s.clearRom);
  const requestView = useAnatomyStore((s) => s.requestView);
  const setSideFilter = useAnatomyStore((s) => s.setSideFilter);
  const setRomFocusMuscle = useAnatomyStore((s) => s.setRomFocusMuscle);
  const region = useAnatomyStore((s) => s.region);
  const compact = useIsCompact();

  // EL MUSCULO SE NOMBRA, NO SE DELETREA SU ID. La lista de cada paso pintaba
  // `m.id` tal cual ("supraspinatus", "pectoralis-major"): el identificador
  // interno en ingles en mitad de un texto en espanol. Se resuelve contra la
  // ficha de la region y, para los musculos invitados de la columna (la pared
  // abdominal en una rotacion toracica, que vive en la lumbar), contra el
  // universo de nombres del ROM, que es el mismo que usa el laboratorio.
  const nameOf = useMemo(() => {
    const content = muscleContentForRegion(region);
    const lookup = new Map<string, string>();
    for (const m of musclesForRomLookup(region)) lookup.set(m.id, m.name);
    return (id: string): string => content[id]?.nameEs ?? lookup.get(id) ?? id;
  }, [region]);

  const [stepIndex, setStepIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const step = guide.steps[stepIndex];

  // Remember the side filter we found, to restore it when leaving the guide.
  const priorSideRef = useRef<SideFilter | null>(null);

  // Apply a step to the model: highlight its muscles by role, move the camera,
  // isolate the studied side.
  const applyStep = useCallback(
    (s: GuideStep, index: number) => {
      setRomPhase(guide.movementId, index, stepMuscleMap(s));
      requestView(s.view);
      if (s.side) setSideFilter(s.side);
    },
    [guide.movementId, setRomPhase, requestView, setSideFilter],
  );

  // On mount: capture the current side filter, then apply the first step.
  useEffect(() => {
    priorSideRef.current = useAnatomyStore.getState().sideFilter;
    applyStep(guide.steps[0], 0);
    setStepIndex(0);
    // On unmount: clear the ROM highlight and restore the side filter.
    return () => {
      clearRom();
      if (priorSideRef.current) setSideFilter(priorSideRef.current);
    };
    // Run once per guide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide]);

  // Apply whenever the active step changes (via buttons or autoplay).
  useEffect(() => {
    applyStep(guide.steps[stepIndex], stepIndex);
  }, [stepIndex, guide, applyStep]);

  // Simple autoplay: advance every few seconds, stop at the last step.
  useEffect(() => {
    if (!playing) return;
    if (stepIndex >= guide.steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStepIndex((i) => Math.min(i + 1, guide.steps.length - 1)), 3500);
    return () => clearTimeout(t);
  }, [playing, stepIndex, guide.steps.length]);

  const atFirst = stepIndex === 0;
  const atLast = stepIndex === guide.steps.length - 1;

  const goPrev = (): void => {
    setPlaying(false);
    setStepIndex((i) => Math.max(0, i - 1));
  };
  const goNext = (): void => {
    setPlaying(false);
    setStepIndex((i) => Math.min(guide.steps.length - 1, i + 1));
  };

  return (
    <section className="flex flex-col gap-4 py-6 first:pt-3">
      {/* Header */}
      <div>
        <div className="sec-head mb-2">
          <span className="kicker">Recorrido guiado</span>
          <span className="sec-rule" />
          <span className="num shrink-0 text-[11px] text-fg3">
            Paso {stepIndex + 1} de {guide.steps.length}
          </span>
        </div>
        <h3 className="font-display text-lg font-semibold text-fg">{guide.name}</h3>
        <div className="mt-2">
          <Sourced item={guide.intro} />
        </div>
      </div>

      {/* LOS PASOS, TODOS A LA VISTA. El activo despliega debajo lo que pasa en
          ese tramo y que musculos lo hacen. */}
      <div role="radiogroup" aria-label={`Pasos de ${guide.name}`} className="flex flex-col">
        {guide.steps.map((s, i) => {
          const isActive = i === stepIndex;
          return (
            <div key={s.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => {
                  setPlaying(false);
                  setStepIndex(i);
                }}
                className="opt"
              >
                <span className={`num w-4 shrink-0 text-[11px] ${isActive ? 'text-brand' : 'text-fg3'}`}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">{s.title}</span>
                {s.rangeLabel && (
                  <span className="num shrink-0 text-[11px] font-normal text-fg3">{s.rangeLabel}</span>
                )}
              </button>

              {isActive && (
                // Sangrado hasta el texto de la opcion: el punto (7 px) mas el
                // hueco (10 px) de `.opt`, mas el numero (16 px) y su hueco.
                <div className="pb-3 pl-[2.6875rem] pt-1">
                  <Sourced item={step.caption} />

                  {/* Muscles in play, by role */}
                  {step.muscles.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {step.muscles.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center gap-2 text-[13px]"
                          onMouseEnter={() => setRomFocusMuscle(m.id)}
                          onMouseLeave={() => setRomFocusMuscle(null)}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: ROLE_TONE_CSS[m.role] }}
                            aria-hidden="true"
                          />
                          <span className="text-fg2">{nameOf(m.id)}</span>
                          <span className="text-fg3" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs" style={{ color: ROLE_TONE_CSS[m.role] }}>
                            {ROLE_LABEL[m.role]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button type="button" onClick={goPrev} disabled={atFirst} className="btn btn-quiet btn-sm">
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
          className="btn btn-line btn-sm"
        >
          {playing ? 'Pausar' : 'Reproducir'}
        </button>
        <button type="button" onClick={goNext} disabled={atLast} className="btn btn-quiet btn-sm">
          Siguiente
        </button>
      </div>

      {/* LO QUE DICE DEL MODELO TIENE QUE SER VERDAD EN ESTA PANTALLA. En la
          vista compacta Aprender lleva el modelo encima del texto y cada paso
          lo resalta y lo orienta. Desde lg App monta ese visor con
          `lg:hidden`: no hay modelo en pantalla, y la nota prometia un
          resaltado que nadie podia ver. Alli se dice y se ofrece el
          laboratorio, donde el gesto se ve entero sobre el cuerpo articulado. */}
      {compact ? (
        <p className="note">
          El modelo resalta los músculos de cada paso por su rol y orienta la
          cámara al mejor ángulo. El gesto se explica sobre la anatomía real; no se
          deforma el modelo (las mallas no tienen rigging).
        </p>
      ) : (
        <p className="note">
          En esta pantalla Aprender no muestra el modelo 3D: los pasos se leen
          aquí y el gesto completo se ve en el laboratorio de movimiento.{' '}
          <button
            type="button"
            onClick={() => {
              window.history.pushState(
                {},
                '',
                formatRoute({ region: region ?? 'shoulder', mode: 'movement' }),
              );
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="rounded font-medium text-brand underline-offset-4 hover:underline"
          >
            Abrir el laboratorio →
          </button>
        </p>
      )}
    </section>
  );
}
