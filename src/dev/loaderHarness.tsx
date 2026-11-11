// src/dev/loaderHarness.tsx
//
// BANCO DE LA PANTALLA DE CARGA. Solo desarrollo: lo sirve `vite dev` en
// /loader-harness.html y NO entra en el build (el build solo empaqueta
// index.html).
//
// La pantalla de carga del laboratorio dura diez segundos y detras tiene un
// modelo de 9 MB que bloquea el hilo principal: mirarla "de verdad" exige
// recargar el laboratorio entero cada vez, y con el hilo bloqueado no se puede
// ni capturar la pantalla. Aqui se monta SOLA, y sus fases se disparan a mano
// por el mismo canal que usa el cargador real (`setModelPhase`).
//
//   /loader-harness.html                la descarga, parada al 0%
//   /loader-harness.html?p=62           la descarga, al 62%
//   /loader-harness.html?run=1          el relevo: arranca la coreografia
//   /loader-harness.html?run=1&x=4      lo mismo, cuatro veces mas rapido
//   /loader-harness.html?auto=1         la secuencia entera, descarga incluida
//   /loader-harness.html?auto=1&bloqueo=1   y ademas BLOQUEA el hilo principal
//                                       los tramos de parseo y preparacion, que
//                                       es la prueba de que la coreografia la
//                                       lleva el compositor
//   &compact=1                          la variante de movil
//   &fuera=1                            la salida

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { RigLoadingScreen, DEFAULT_TIMINGS } from '../components/movement/RigLoadingScreen';
import { setModelPhase } from '../lib/modelPhase';
import { RIG_URL } from '../lib/modelWarm';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
const TOTAL = 9_323_344;

/** Ocupa el hilo principal sin soltarlo, como hacen el parseo y los pases. */
function bloquear(ms: number) {
  const fin = performance.now() + ms;
  // eslint-disable-next-line no-empty
  while (performance.now() < fin) {}
}

function Banco() {
  const [p, setP] = useState(num('p', 0));
  const [fuera, setFuera] = useState(q.has('fuera'));
  const x = Math.max(0.25, num('x', 1));

  useEffect(() => {
    // Los tiempos de la coreografia, escalados por ?x= para no esperar diez
    // segundos en cada prueba.
    try {
      localStorage.setItem(
        'anatris.carga.v1',
        JSON.stringify({
          parse: DEFAULT_TIMINGS.parse / x,
          prep: DEFAULT_TIMINGS.prep / x,
          paint: DEFAULT_TIMINGS.paint / x,
        }),
      );
    } catch {
      /* sin almacenamiento */
    }
  }, [x]);

  useEffect(() => {
    if (q.has('run')) {
      setP(100);
      const t = setTimeout(() => setModelPhase(RIG_URL, 'parsing'), 300);
      return () => clearTimeout(t);
    }
    if (!q.has('auto')) return;
    let vivo = true;
    const t0 = performance.now();
    const DESCARGA = 2600 / x;
    const paso = () => {
      if (!vivo) return;
      const f = Math.min(1, (performance.now() - t0) / DESCARGA);
      setP(f * 100);
      if (f < 1) {
        requestAnimationFrame(paso);
        return;
      }
      setModelPhase(RIG_URL, 'parsing');
      // Dos fotogramas, igual que el cargador real, y entonces el bloqueo.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (q.has('bloqueo')) {
            bloquear(DEFAULT_TIMINGS.parse / x);
            setModelPhase(RIG_URL, 'done');
            bloquear(DEFAULT_TIMINGS.prep / x);
            bloquear(DEFAULT_TIMINGS.paint / x);
            setFuera(true);
          } else {
            const total = (DEFAULT_TIMINGS.parse + DEFAULT_TIMINGS.prep + DEFAULT_TIMINGS.paint) / x;
            setTimeout(() => vivo && setFuera(true), total);
          }
        }),
      );
    };
    requestAnimationFrame(paso);
    return () => {
      vivo = false;
    };
  }, [x]);

  const loaded = Math.round((Math.min(p, 100) / 100) * TOTAL);
  return (
    <div className="theme-ink flex h-screen w-screen bg-page text-fg">
      <div className="relative min-w-0 flex-1 viewer-bg">
        <div className="absolute inset-0 flex items-center justify-center text-sm text-fg3">
          (aquí va el laboratorio)
        </div>
        <RigLoadingScreen
          progress={p}
          loaded={loaded}
          total={TOTAL}
          item={RIG_URL}
          compact={q.has('compact')}
          leaving={fuera}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Banco />
  </StrictMode>,
);
