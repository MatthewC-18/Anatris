// src/components/movement/MovementView.tsx
//
// "Movimiento" mode body: the skinned biomechanical rig (cuerpo-rig.glb) with a
// region-aware control panel beside it. The rig drives REAL skeletal deformation
// for the shoulder, elbow, knee and the 25-vertebra spine, replacing the old
// rigid-bone-rotation prototype that only abducted the shoulder.
//
// The legacy props (byMesh / regionMeshes / resolution) are kept in the
// signature so the App call site is unchanged, but the rig lab is self-contained
// and does not consume them.
//
// -----------------------------------------------------------------------------
// UN ESCENARIO Y DOS MARGENES
// -----------------------------------------------------------------------------
// El laboratorio era un lienzo a sangre con instrumentos FLOTANDO encima: una
// tarjeta de cristal a la izquierda con cajas dentro, una pila de pastillas y
// tarjetas a la derecha, otra pastilla arriba y otra abajo. Se leia como
// cualquier panel de control: "tarjetas dentro de tarjetas". Y costaba dos
// defectos reales: los paneles TAPABAN el modelo (el brazo en abduccion pasaba
// por debajo de la tarjeta izquierda) y cada funcion vivia en un sitio y con una
// forma distinta, asi que no habia un modelo mental que aprender.
//
// Ahora es la lamina de un atlas (ver "LAMINA" en src/index.css y
// docs/sistema-lamina.md):
//
//   MARGEN IZQUIERDO  lo que se LEE del movimiento y los mandos que lo mueven.
//   ESCENARIO         el cuerpo, con su rectangulo propio. Nada lo tapa.
//   MARGEN DERECHO    lo que se le HACE al cuerpo: capas, tests, neuro, y al
//                     pie la estructura que se acaba de tocar.
//
// Los margenes estan acoplados (en el flujo, no en `absolute`), asi que el
// modelo se encuadra en el hueco que de verdad queda libre y ningun panel puede
// volver a solaparse con otro: la geometria que antes vigilaba un test a base
// de sumar rems (labOverlayGeometry) ya no existe.
//
// Por debajo de `lg` la lamina no cabe y el laboratorio es escena + hoja (ver
// MobileLabSheet). El modo paciente esconde los dos margenes y deja el cuerpo
// a pantalla completa.

import { useEffect, useMemo, useRef, useState } from 'react';
import { consumeFocusTest } from '../../lib/caseEvidence';
import { RigViewer } from './RigViewer';
import {
  MobileLabSheet,
  type LabTab,
  type LabTabDef,
  type SheetDetent,
} from './MobileLabSheet';
import { useIsCompact } from '../../hooks/useIsCompact';
import { MovementControls } from './MovementControls';
import { RhythmReadout } from './RhythmReadout';
import { LayerControls } from './LayerControls';
import { DissectionPanel } from './DissectionPanel';
import { dissectChannel } from './dissectChannel';
import { layerChannel } from './RigModel';
import { demoChannel } from './demoChannel';
import { OrthopedicTestsPanel } from './OrthopedicTestsPanel';
import { NeuroPanel } from './NeuroPanel';
import { romForRegion } from '../../data/romByRegion';
import { hasNeuro } from '../../data/neuro';
import { isDrivable } from '../../lib/boneMap';
import { useAnatomyStore } from '../../store/anatomyStore';
import {
  LockGlyph,
  PremiumTeaser,
  useFeatureGate,
} from '../account/PremiumGate';
import type { AnatomyEntry } from '../../types/anatomy';
import type { MuscleResolution } from '../../lib/muscleResolver';
import { CloseIcon, PersonIcon } from '../ui/Icons';

interface MovementViewProps {
  region: string | null;
  byMesh?: Map<string, AnatomyEntry>;
  regionMeshes?: Set<string> | null;
  resolution?: MuscleResolution;
  /** Open the region's "Evidencia" overlay (all sources + PubMed links). */
  onOpenEvidence?: () => void;
}

/** Las herramientas del margen derecho. Una a la vista cada vez. */
type Tool = 'capas' | 'tests' | 'neuro';

export function MovementView({ region, onOpenEvidence }: MovementViewProps) {
  const setRegion = useAnatomyStore((s) => s.setRegion);
  const hasDrivable = romForRegion(region).some((m) => isDrivable(m.id));

  // Capability gates. These are premium in EVERY region, including the free
  // shoulder: they are what a physio uses in front of a patient, which is what
  // they actually pay for. See src/auth/entitlements.ts.
  const testsGate = useFeatureGate('orthopedic-tests');
  const neuroGate = useFeatureGate('neuro');
  const patientGate = useFeatureGate('patient-mode');

  // LA HERRAMIENTA DEL MARGEN DERECHO. Una a la vez, siempre en el mismo sitio y
  // con la misma forma: una pestana. Antes eran tres cosas distintas --dos
  // pastillas que se desplegaban en hojas y una tarjeta-- y abrir una escondia
  // las otras. Vuelve a Capas al cambiar de region, para que cada articulacion
  // empiece igual.
  const [tool, setTool] = useState<Tool>('capas');
  // La ranura de arriba del margen izquierdo, para la lista de movimientos.
  const [movementSlot, setMovementSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setTool('capas'), [region]);

  // Reset any click-to-dissect peel when the studied region changes or the lab
  // unmounts, so a new joint always opens with the full model. Releasing the
  // demo arbiter here too means a test/myotome demo can never survive a region
  // change and keep animating the rig behind the new region's console.
  useEffect(() => {
    dissectChannel.reset();
    demoChannel.stop();
    return () => {
      dissectChannel.reset();
      demoChannel.stop();
    };
  }, [region]);

  // PATIENT MODE: a clean, full-screen view (big 3D + one plain-language bar) the
  // physio turns toward the patient. Hides every clinical overlay. Reset on region
  // change so switching joints always returns to the clinician view.
  const [patientMode, setPatientMode] = useState(false);
  useEffect(() => setPatientMode(false), [region]);
  // Y SE DESHACE LA DISECCION AL ENTRAR. El modo paciente esconde la ficha de
  // diseccion junto con el resto de los mandos clinicos, pero el pelado seguia
  // aplicado al modelo: se giraba la pantalla hacia el paciente para ensenarle
  // su hombro y el paciente veia un cuerpo al que le falta un musculo, sin que
  // el fisio tuviera ya ningun control para devolverlo. El modo paciente es una
  // vista limpia; eso incluye el cuerpo entero.
  // Y LAS CAPAS, POR LA MISMA RAZON. El pelado de piel/musculo/hueso vivia en
  // otro canal y se quedaba puesto: con la piel y el musculo apagados, girar la
  // pantalla hacia el paciente le ensena un ESQUELETO, y en esa vista los
  // interruptores estan escondidos con el resto de los mandos clinicos, asi que
  // el fisio ya no tiene como devolver la piel sin salir del modo.
  useEffect(() => {
    if (patientMode) {
      dissectChannel.reset();
      layerChannel.reset();
    }
  }, [patientMode]);

  // ---------------------------------------------------------------------------
  // COMPACT LAYOUT
  // ---------------------------------------------------------------------------
  // Below lg the three-column plate is abandoned entirely rather than shrunk:
  // see the note at the top of MobileLabSheet for why two margins cannot share
  // 390px with the body they annotate.
  const compact = useIsCompact();
  const [sheetTab, setSheetTab] = useState<LabTab>('movimiento');
  const [detent, setDetent] = useState<SheetDetent>('peek');
  // Cambiar de region devuelve la hoja a Movimiento. Se compara con la region
  // ANTERIOR a proposito: en el primer render la region todavia es null y se
  // resuelve despues, asi que un efecto sobre [region] a secas se disparaba
  // tambien al montar y pisaba la pestana que acaba de elegir el enlace
  // profundo de un caso clinico.
  const prevRegionRef = useRef(region);
  useEffect(() => {
    if (prevRegionRef.current === region) return;
    prevRegionRef.current = region;
    setSheetTab('movimiento');
  }, [region]);

  // LLEGADA DESDE UN CASO CLINICO: /<region>/movimiento?prueba=<id>.
  //
  // El parametro se lee UNA vez y se borra de la direccion. Tiene que ser aqui
  // y no dentro del panel porque el panel se monta en dos sitios (el margen
  // derecho de escritorio y la pestana de la hoja movil) y el primero que lo
  // leyera dejaria al otro sin nada. Ademas hay que ABRIR el panel, que no es
  // cosa suya.
  const [focusTestId, setFocusTestId] = useState<string | null>(null);
  useEffect(() => {
    const id = consumeFocusTest();
    if (!id) return;
    setFocusTestId(id);
    setTool('tests');
    setSheetTab('tests');
    setDetent('full');
  }, []);

  const testsPanel = (
    <OrthopedicTestsPanel
      key={`tests-${region ?? 'shoulder'}`}
      region={region}
      open
      bare
      onOpenChange={() => {}}
      onOpenEvidence={onOpenEvidence}
      focusTestId={focusTestId}
    />
  );
  const neuroPanel = (
    <NeuroPanel
      key={`neuro-${region ?? 'shoulder'}`}
      region={region}
      open
      bare
      onOpenChange={() => {}}
    />
  );

  const sheetTabs = useMemo<LabTabDef[]>(() => {
    const tabs: LabTabDef[] = [
      {
        id: 'movimiento',
        label: 'Movimiento',
        render: () => (
          <MovementControls
            key={region ?? 'shoulder'}
            region={region}
            embedded
            inSheet
          />
        ),
      },
      { id: 'capas', label: 'Capas', render: () => <LayerControls embedded /> },
      {
        id: 'tests',
        label: 'Tests',
        locked: !testsGate.unlocked,
        onLocked: testsGate.requestUpgrade,
        render: () => testsPanel,
      },
    ];
    if (hasNeuro(region)) {
      tabs.push({
        id: 'neuro',
        label: 'Neuro',
        locked: !neuroGate.unlocked,
        onLocked: neuroGate.requestUpgrade,
        render: () => neuroPanel,
      });
    }
    return tabs;
    // `testsPanel` y `neuroPanel` se recrean en cada render con las mismas
    // claves; lo que decide si la lista cambia es lo de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, onOpenEvidence, testsGate, neuroGate, focusTestId]);

  if (!hasDrivable) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-base font-semibold text-fg">
            El laboratorio de movimiento aún no cubre esta región
          </p>
          <p className="mt-2 text-sm text-fg3">
            Ya están disponibles hombro, codo, cadera, rodilla, tobillo y
            columna. Empieza por el hombro para ver el rig en acción.
          </p>
          <button
            type="button"
            onClick={() => setRegion('shoulder')}
            className="btn btn-line mt-4"
          >
            Ir al hombro
          </button>
        </div>
      </div>
    );
  }

  // COMPACT, CLINICIAN VIEW: two rows. The scene owns a real rectangle and the
  // sheet owns everything else, so nothing is drawn on top of the body except
  // the dissection card (which is about the thing under it).
  if (compact && !patientMode) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="relative min-h-0 flex-1">
          {/* `refitKey` re-frames the model whenever the sheet resizes the
              canvas; without it the body keeps the framing it had when the
              sheet was a different height and the limb swings out of view. */}
          <RigViewer refitKey={detent} region={region} />
          {patientGate.unlocked ? (
            <button
              type="button"
              onClick={() => setPatientMode(true)}
              title="Vista simplificada para mostrar al paciente"
              className="instrument pointer-events-auto absolute top-3 right-3 z-30 flex min-h-[36px] items-center gap-2 px-3 text-xs font-medium text-fg2"
            >
              <PersonIcon size={13} />
              Paciente
            </button>
          ) : (
            <button
              type="button"
              onClick={patientGate.requestUpgrade}
              title="Modo paciente: vista simplificada a pantalla completa (Premium)"
              className="instrument pointer-events-auto absolute top-3 right-3 z-30 flex min-h-[36px] items-center gap-2 px-3 text-xs font-medium text-amber-200"
            >
              <PersonIcon size={13} />
              Paciente
              <LockGlyph />
            </button>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
            <DissectionPanel />
          </div>
        </div>

        <MobileLabSheet
          tabs={sheetTabs}
          active={sheetTab}
          onActiveChange={setSheetTab}
          detent={detent}
          onDetentChange={setDetent}
        />
      </div>
    );
  }

  // Las pestanas del margen derecho. Las bloqueadas NO se esconden ni saltan a
  // precios: se quedan en su sitio con el candado y, al abrirlas, cuentan lo que
  // hacen. Esconderlas haria que la version gratuita pareciera completa, que es
  // justo por lo que nadie se suscribia.
  const tools: { id: Tool; label: string; locked: boolean }[] = [
    { id: 'capas', label: 'Capas', locked: false },
    { id: 'tests', label: 'Tests', locked: !testsGate.unlocked },
  ];
  if (hasNeuro(region)) {
    tools.push({ id: 'neuro', label: 'Neuro', locked: !neuroGate.unlocked });
  }
  const activeTool: Tool = tools.some((t) => t.id === tool) ? tool : 'capas';

  // EL BOTON DEL MODO PACIENTE VA EN LA BARRA DEL ESCENARIO, junto a
  // Reencuadrar: las dos son acciones sobre la VISTA, no sobre el cuerpo. Era
  // una pastilla flotando arriba en el centro, encima del modelo.
  const patientButton = patientGate.unlocked ? (
    <button
      type="button"
      onClick={() => setPatientMode(true)}
      title="Vista simplificada a pantalla completa para mostrar al paciente"
      className="btn btn-quiet btn-sm"
    >
      <PersonIcon size={13} />
      Modo paciente
    </button>
  ) : (
    // Locked: stays VISIBLE with a lock so the free user sees the capability
    // exists; clicking it goes straight to pricing.
    <button
      type="button"
      onClick={patientGate.requestUpgrade}
      title="Modo paciente: vista simplificada a pantalla completa (Premium)"
      className="btn btn-quiet btn-sm text-amber-200/90 hover:text-amber-100"
    >
      <PersonIcon size={13} />
      Modo paciente
      <LockGlyph />
    </button>
  );

  return (
    // LOS TRES HIJOS OCUPAN SIEMPRE LA MISMA POSICION, aunque dos de ellos se
    // escondan en el modo paciente. No es estetica: `RigViewer` es el segundo
    // hijo en las dos vistas, asi que React conserva su instancia al entrar y
    // salir del modo. Si los margenes se montaran alrededor de otro arbol, el
    // lienzo se desmontaria y el cuerpo volveria a cargarse entero: diez
    // segundos de espera por pulsar un boton.
    <div className="flex h-full w-full">
      {patientMode ? null : (
        <aside
          aria-label="Lectura y mandos del movimiento"
          className="margin margin-l w-[19rem] shrink-0 xl:w-[21.5rem]"
        >
          {/* UNA columna, dos secciones: arriba lo que se lee (goniometro,
              ritmo, musculo protagonista) y abajo la consola que lo mueve,
              partidas por un filo. La lectura se encoge y la consola no: tiene
              su alto acotado dentro de MovementControls. */}
          {/* ARRIBA, QUE SE ESTUDIA: la lista de movimientos y el lado. La
              pinta la consola (es suya: elegir un gesto cambia su estado) a
              traves de un portal a esta ranura. */}
          <div ref={setMovementSlot} className="shrink-0" />
          <div className="rule" />
          {/* EN MEDIO, LO QUE EL ESCENARIO NO DICE: que pasa en esta fase y por
              que, los avisos, el ritmo y el reclutamiento entero. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <RhythmReadout region={region} embedded stageReads />
          </div>
          <div className="rule" />
          {/* ABAJO, CUANTO SE MUEVE: el arco, a la altura de la regla del
              escenario, y lo que se pone una vez por sesion. */}
          <div className="shrink-0">
            <MovementControls
              key={region ?? 'shoulder'}
              region={region}
              embedded
              movementSlot={movementSlot}
            />
          </div>
        </aside>
      )}

      <div className="relative min-w-0 flex-1">
        {/* `refitKey` cambia con el modo: al esconderse los margenes el lienzo
            pasa de la columna central a la ventana entera, y sin reencuadrar el
            cuerpo se queda con el encuadre de un lienzo que ya no existe. */}
        <RigViewer
          region={region}
          refitKey={patientMode ? 'paciente' : 'clinico'}
          stageActions={patientMode ? null : patientButton}
          hud={!patientMode}
        />

        {patientMode && (
          <>
            <button
              type="button"
              onClick={() => setPatientMode(false)}
              className="instrument pointer-events-auto absolute top-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg2 transition-colors hover:text-fg"
            >
              <CloseIcon size={14} />
              Salir del modo paciente
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
              <MovementControls key={region ?? 'shoulder'} region={region} patientMode />
            </div>
          </>
        )}
      </div>

      {patientMode ? null : (
        <aside
          aria-label="Herramientas del laboratorio"
          className="margin margin-r w-[19rem] shrink-0 xl:w-[23rem]"
        >
          <div role="tablist" aria-label="Herramientas" className="tabs shrink-0 px-4">
            {tools.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`lab-tool-${t.id}`}
                aria-selected={activeTool === t.id}
                aria-controls="lab-tool-panel"
                onClick={() => setTool(t.id)}
                className={`tab ${t.locked ? 'text-amber-200/80 hover:text-amber-100' : ''}`}
              >
                {t.label}
                {t.locked && <LockGlyph />}
              </button>
            ))}
          </div>

          {/* LAS CAPAS NO DESAPARECEN AL CAMBIAR DE HERRAMIENTA: pasan a una
              tira bajo las pestanas. Desmontarlas dejaba al fisio sin los
              interruptores justo durante la demostracion de un test o de un
              miotoma, que es cuando mas falta hacen, y sin forma de volver a
              encender la piel si la habia apagado antes. */}
          {activeTool !== 'capas' && (
            <>
              <LayerControls strip />
              <div className="rule" />
            </>
          )}

          <div
            role="tabpanel"
            id="lab-tool-panel"
            aria-labelledby={`lab-tool-${activeTool}`}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
          >
            {activeTool === 'capas' && <LayerControls embedded />}
            {activeTool === 'tests' &&
              (testsGate.unlocked ? (
                testsPanel
              ) : (
                <div className="sec">
                  <PremiumTeaser
                    feature="orthopedic-tests"
                    title="Tests ortopédicos"
                    lines={[
                      'Sensibilidad, especificidad y razones de verosimilitud con su estudio de origen.',
                      'Demostración del test en el modelo 3D y nomograma de Fagan.',
                      'Clusters diagnósticos y modo examen para autoevaluarte.',
                    ]}
                    compact
                  />
                </div>
              ))}
            {activeTool === 'neuro' &&
              (neuroGate.unlocked ? (
                neuroPanel
              ) : (
                <div className="sec">
                  <PremiumTeaser
                    feature="neuro"
                    title="Neuro: dermatomas y miotomas"
                    lines={[
                      'Dermatoma, miotoma y reflejo de cada raíz nerviosa.',
                      'El miotoma demostrado sobre el rig, raíz por raíz.',
                      'Mapa esquemático de dermatomas para el examen neurológico.',
                    ]}
                    compact
                  />
                </div>
              ))}
          </div>

          {/* LA ESTRUCTURA QUE SE ACABA DE TOCAR, AL PIE DEL MARGEN. Era una
              tarjeta de hasta 30rem flotando sobre el borde inferior del
              modelo: tapaba justo lo que se acababa de pinchar, caia encima del
              boton de Reencuadrar y habia que sumar rems para que no pisara la
              hoja de tests. Acoplada aqui no tapa nada, no se solapa con nada y
              esta siempre en el mismo sitio, sea cual sea la herramienta
              abierta. Se pinta sola cuando hay algo seleccionado, retirado o
              aislado. */}
          <DissectionPanel docked />
        </aside>
      )}
    </div>
  );
}
