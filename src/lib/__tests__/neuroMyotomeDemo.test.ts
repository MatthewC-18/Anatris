// EL DEMO DE MIOTOMA QUE NO ENCENDIA NADA.
//
// El panel neuro ofrece un play por raiz: el cuerpo se vuelve translucido y la
// articulacion recorre el movimiento del miotoma. El brillo del musculo sale
// SOLO de `highlight`, y `highlight` salia SOLO de `highlightMuscleId` del
// dato. Ese campo aparecia UNA vez en todo `src/data/neuro`: C5.
//
// Asi que en C6, C7, L3 y S1 el usuario pulsaba el play, el codo se estiraba o
// la rodilla se doblaba, y no se iluminaba nada: ni el triceps en C7, ni el
// cuadriceps en L3, ni los isquiotibiales en S1. Encima el lector retira la
// tarjeta "Musculo protagonista" durante todo demo --dando por hecho que el
// modelo si lo enciende--, asi que el musculo no se veia NI se nombraba.
//
// -----------------------------------------------------------------------------
// Y ESTE FICHERO SE QUEDO EN VERDE SOBRE EL DEFECTO SIGUIENTE
// -----------------------------------------------------------------------------
// Comprobaba que el id existiera en LA UNION de los seis catalogos. La
// aplicacion no tiene esa union: `useAllMuscles` es el hombro gratuito mas el
// payload de LA REGION ABIERTA, y nada mas. Una ficha que vive en otra region
// no esta, y `RigOverlays.forMuscleMeshes` hace `if (!names) return;` sin
// aviso.
//
// MEDIDO reconstruyendo el universo real region por region y resolviendolo
// contra las mallas visibles del rig (el mismo error de la union lo arrastra
// `scripts/audit-muscle-glow.mts`):
//
//   [lumbar] L3 las cuatro cabezas del cuadriceps 0 mallas; S1 el gastrocnemio
//            y el soleo 0; L4 el tibial anterior 0. Los TRES demos mudos.
//   [tobillo] L2 el iliopsoas 0; L3 el cuadriceps 0.
//   [rodilla] L2 el iliopsoas 0; L4 el tibial anterior 0.
//   [cadera] L3 el recto femoral 3 mallas y los tres vastos 0: medio encendido.
//   [cervical] y [hombro] C6 el braquiorradial 0, que solo vive en elbow.json.
//
// Asi que las comprobaciones de abajo van POR REGION. La plomeria (que payload
// trae que fichas) es de otro grupo; lo que este fichero hace es dejar el
// inventario MEDIDO por escrito, de modo que ni crezca en silencio ni se
// arregle sin que nadie se entere.
//
// Lo que NO puede comprobarse aqui (el GLB no se carga en node) es que esos ids
// resuelvan mallas: de eso se encarga `npm run audit-glow`.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { baseAngle } from '../demoTimeline';
import { CERVICAL_NEURO } from '../../data/neuro/cervical';
import { LUMBOSACRAL_NEURO } from '../../data/neuro/lumbosacral';
import { NEURO_BY_REGION } from '../../data/neuro';
import { shoulderMuscles } from '../../data/muscles/shoulder';
import { elbowMuscles } from '../../data/muscles/elbow';
import { kneeMuscles } from '../../data/muscles/knee';
import { hipMuscles } from '../../data/muscles/hip';
import { ankleMuscles } from '../../data/muscles/ankle';
import { cervicalMuscles, lumbarMuscles, spineMuscles } from '../../data/muscles/spine';
import { rigChannel } from '../../components/movement/RigModel';
import type { Muscle } from '../../types/muscle';
import type { NeuroSegmentSet } from '../../types/neuro';

const SETS: NeuroSegmentSet[] = [CERVICAL_NEURO, LUMBOSACRAL_NEURO];
const CATALOG = new Set(
  [
    ...shoulderMuscles,
    ...elbowMuscles,
    ...kneeMuscles,
    ...hipMuscles,
    ...ankleMuscles,
    ...spineMuscles,
  ].map((m) => m.id),
);

const withDemo = SETS.flatMap((s) => s.roots)
  .filter((r) => r.demo)
  .map((r) => ({ id: r.id, demo: r.demo! }));

// --- El universo REAL, region por region -------------------------------------
// Espejo de `ALL_MUSCLES_BY_REGION` (el payload que se hornea por region) mas
// el hombro, que va en el paquete gratuito. Las fichas se importan una a una y
// no desde `fullContent` porque ese modulo arrastra la biblioteca entera.
const CATALOG_BY_REGION: Record<string, Muscle[]> = {
  shoulder: shoulderMuscles,
  elbow: elbowMuscles,
  hip: hipMuscles,
  knee: kneeMuscles,
  ankle: ankleMuscles,
  cervical: cervicalMuscles,
  lumbar: lumbarMuscles,
};

/** La misma regla de `useAllMuscles`: una ficha por id, y el gratuito gana. */
function universeFor(region: string): Set<string> {
  const seen = new Set<string>();
  for (const list of [shoulderMuscles, CATALOG_BY_REGION[region] ?? []]) {
    for (const m of list) if (m.meshBases.length > 0) seen.add(m.id);
  }
  return seen;
}

/** Regiones donde se dibuja la pestana Neuro, con su conjunto de raices. */
const NEURO_REGIONS = Object.entries(NEURO_BY_REGION);

/** Por region y raiz: cuantos musculos del demo tienen ficha, de cuantos. */
function glowTally(region: string, set: NeuroSegmentSet, extra?: Set<string>) {
  const universe = universeFor(region);
  return set.roots
    .filter((r) => r.demo)
    .map((r) => {
      const ids = r.demo!.highlightMuscleIds ?? [];
      const lit = ids.filter((id) => universe.has(id) || extra?.has(id)).length;
      return { root: r.id, lit, total: ids.length };
    });
}

/**
 * El SUELO del universo: las fichas que `useAllMuscles` suma siempre, abra el
 * usuario la region que abra, para que una pantalla pueda nombrar un musculo de
 * otra region y encenderlo igual.
 *
 * Se lee del fuente y no se importa porque es una constante de modulo, y la
 * extraccion va por la FORMA de la entrada --primer argumento un id kebab,
 * segundo una cadena-- y no por el nombre de la funcion, para que renombrarla
 * no vuelva esta prueba verde por accidente.
 */
function floorMuscleIds(): Set<string> {
  const src = readFileSync(resolve(__dirname, '../../hooks/useMuscleResolution.ts'), 'utf8');
  const ids = new Set<string>();
  for (const m of src.matchAll(/\(\s*'([a-z][a-z0-9-]*)',\s*'/g)) ids.add(m[1]);
  return ids;
}

describe('los demos de miotoma', () => {
  it('hay demos que comprobar', () => {
    expect(withDemo.length).toBeGreaterThanOrEqual(5);
  });

  it('TODOS encienden al menos un musculo', () => {
    const mudos = withDemo.filter((r) => (r.demo.highlightMuscleIds ?? []).length === 0);
    expect(mudos.map((r) => r.id), 'raices cuyo play no ilumina nada').toEqual([]);
  });

  it('y el musculo que nombran existe en el catalogo', () => {
    const malos: string[] = [];
    for (const r of withDemo) {
      for (const id of r.demo.highlightMuscleIds ?? []) {
        if (!CATALOG.has(id)) malos.push(`${r.id} -> ${id}`);
      }
    }
    expect(malos).toEqual([]);
  });

  it('cada demo enciende su miotoma ENTERO en al menos una region', () => {
    // El suelo: un demo cuyo miotoma no se ilumina completo en NINGUNA region
    // es un demo que nadie puede ver bien, y eso no se arregla con plomeria.
    const sinCasa: string[] = [];
    for (const r of withDemo) {
      const ids = r.demo.highlightMuscleIds ?? [];
      const casa = NEURO_REGIONS.filter(([region, set]) => {
        if (!set.roots.some((x) => x.id === r.id)) return false;
        const universe = universeFor(region);
        return ids.every((id) => universe.has(id));
      });
      if (casa.length === 0) sinCasa.push(r.id);
    }
    expect(sinCasa, 'su miotoma no se ilumina entero en ninguna region').toEqual([]);
  });

  // EL INVENTARIO MEDIDO, Y DE QUE MITAD HABLA.
  //
  // El catalogo de la region NO alcanza para estos demos, y eso no es un error
  // del dato: un conjunto de raices sirve a toda una extremidad, asi que C6
  // nombra una ficha del codo y L3/S1 fichas de la rodilla. Lo que hace que se
  // enciendan de todas formas es el SUELO del universo (las fichas prestadas
  // que `useAllMuscles` suma siempre, pase lo que pase con la region abierta),
  // y esa plomeria es de otro grupo.
  //
  // Asi que este test mide las dos mitades y no confunde una con otra:
  //   1. Con suelo: la promesa de pantalla. Ningun demo puede quedarse mudo en
  //      ninguna region donde aparezca su pestana.
  //   2. Sin suelo: el inventario del catalogo a secas, que es lo que estaba
  //      midiendo este fichero antes CON LA UNION de los seis catalogos (una
  //      union que la aplicacion no tiene nunca) y por eso salia verde sobre
  //      22 acreditaciones de miotoma que no encendian ni una malla.
  //
  // Medido region por region: [lumbar] L3, L4 y S1 mudos; [tobillo] L2 y L3;
  // [cadera] L4 y S1 mudos y L3 a 1 de 4; [cervical] y [hombro] C6; codo y
  // rodilla, duenos de esas fichas, correctos.
  it('con el suelo del universo, ningun demo se queda mudo en ninguna region', () => {
    const suelo = floorMuscleIds();
    expect(
      suelo.size,
      'no se encuentra el suelo de fichas resolubles en hooks/useMuscleResolution.ts: ' +
        'sin el, estos demos se quedan mudos en 5 de las 7 regiones (ver la cabecera)',
    ).toBeGreaterThan(0);
    const mudos: string[] = [];
    for (const [region, set] of NEURO_REGIONS) {
      for (const t of glowTally(region, set, suelo)) {
        if (t.lit < t.total) mudos.push(`${region}/${t.root} ${t.lit}/${t.total}`);
      }
    }
    expect(mudos, 'el play se pulsa y no se enciende el musculo que nombra').toEqual([]);
  });

  it('y el catalogo de la region por si solo no alcanza: esta es la cuenta', () => {
    const sinSuelo: string[] = [];
    for (const [region, set] of NEURO_REGIONS) {
      for (const t of glowTally(region, set)) {
        if (t.lit < t.total) sinSuelo.push(`${region}/${t.root} ${t.lit}/${t.total}`);
      }
    }
    // SUBCONJUNTO, no igualdad: si el payload de una region acaba trayendo esas
    // fichas por su cuenta la lista se encoge, y eso es una mejora que no tiene
    // por que romper esta prueba. Lo que no puede pasar es que CREZCA: un demo
    // nuevo que nombre una ficha de otra region sin pasar por el suelo.
    const medido = new Set([
      'cervical/C6 0/1',
      'shoulder/C6 0/1',
      'lumbar/L3 0/4',
      'lumbar/L4 0/1',
      'lumbar/S1 0/2',
      'hip/L3 1/4',
      'hip/L4 0/1',
      'hip/S1 0/2',
      'knee/L2 0/2',
      'knee/L4 0/1',
      'ankle/L2 0/2',
      'ankle/L3 0/4',
    ]);
    expect(sinSuelo.filter((x) => !medido.has(x)), 'cuentas nuevas sin medir').toEqual([]);
  });

  it('el panel DICE cuando un musculo no se puede encender', () => {
    // La mitad que si es nuestra: que el demo no se quede mudo EN SILENCIO.
    // Antes encendia el cristal, movia la articulacion y no decia nada.
    const src = readPanel();
    expect(src, 'el panel tiene que separar lo que enciende de lo que no').toMatch(
      /splitHighlight/,
    );
    expect(src, 'y mandarselo al lector como aviso').toMatch(/cannotShow/);
    expect(src, 'con el universo REAL, no con el registro estatico').toMatch(/useAllMuscles/);
  });

  it('y NOMBRA el musculo que se enciende', () => {
    // El lector tenia la linea "Resaltado: ..." preparada y el panel de tests
    // si le mandaba el campo; este no. Un musculo se ponia rojo y en ningun
    // sitio aparecia su nombre, con la tarjeta "Musculo protagonista" retirada
    // durante todo demo.
    expect(readPanel()).toMatch(/structureLabels/);
  });

  it('el panel mapea la LISTA, no un solo id', () => {
    const src = readPanel();
    expect(src).toMatch(/highlightMuscleIds/);
    expect(src).not.toMatch(/d\.highlightMuscleId\b(?!s)/);
  });

  it('con movimiento reducido, un arco compartido acaba ESTIRADO', () => {
    // C7 es `elbow-extension` con target 120 y L3 `knee-extension` con 90: los
    // dos son arcos compartidos (`arcFrom: 'max'`), donde 0 ES la articulacion
    // estirada. La rama de movimiento reducido hacia `push(target)` y ensenaba
    // el codo doblado 120 grados bajo el rotulo "Extension de codo".
    //
    // Desde que los dos paneles usan el bucle compartido
    // (src/lib/demoTimeline.ts), esa rama es `startDemoLoop` con
    // `reduceMotion`: posa la fraccion final del trazo, y en un arco compartido
    // la fraccion final es el 0.
    const src = readPanel();
    expect(src).toMatch(/startDemoLoop\(\{[\s\S]*?fromMax,[\s\S]*?reduceMotion: reduce,/);
    expect(baseAngle(1, 120, true)).toBe(0);
    expect(baseAngle(1, 90, true)).toBe(0);
  });

  it('y el demo se para al cerrar el panel', () => {
    // Cerrar con la X no desmonta el panel en escritorio, asi que el bucle
    // seguia conduciendo el rig sin ningun boton para pararlo.
    for (const f of ['NeuroPanel.tsx', 'OrthopedicTestsPanel.tsx']) {
      const src = readMovement(f);
      expect(src, f).toMatch(/if \(!open && !bare\) \{\s*\n\s*demoChannel\.stop\(/);
      // Las dependencias pueden crecer; `open` y `bare` no pueden faltar, que
      // es lo que hace que el efecto reaccione al cierre.
      expect(src, `${f}: el efecto debe depender de open/bare`).toMatch(
        /\}, \[demoId, byId, open, bare[^\]]*\]\)/,
      );
    }
  });
});

// -----------------------------------------------------------------------------
// PARAR EL DEMO CON LA CONSOLA DESMONTADA (tableta y movil)
// -----------------------------------------------------------------------------
// Por debajo de 1024 px la hoja del laboratorio dibuja UNA pestana a la vez, asi
// que estando en Neuro `MovementControls` NO esta montada. El unico sitio que
// devolvia el rig a su estado era su empuje (`setFromConsole`), de modo que el
// stop del panel soltaba el canal y nada mas: `rigChannel.set` es un parche y el
// ultimo fotograma del demo se quedaba puesto. En un iPad en vertical (820 px)
// el cuerpo se quedaba translucido, con el brazo en abduccion y el codo doblado
// 90 grados (el miotoma C5 lleva `elbow-flexion` como componente), los musculos
// encendidos, y el boton parecia no responder.
//
// El entorno de pruebas es node, sin DOM, asi que no se puede montar el panel:
// se comprueban las dos mitades. Primero que el empuje de vuelta deja el canal
// limpio; despues, por texto, que el panel es quien lo hace.
describe('parar un miotoma sin consola montada', () => {
  /** Lo que escribe el ultimo fotograma de un demo de miotoma. */
  const dejarDemoPuesto = () =>
    rigChannel.set({
      movementId: 'glenohumeral-abduction',
      side: 'R',
      angleDeg: 90,
      components: [{ movementId: 'elbow-flexion', angleDeg: 90 }],
      highlight: [{ muscleId: 'deltoid', role: 'prime-mover', level: 1 }],
      showMarkers: false,
      ghostSkin: true,
      demo: { label: 'Miotoma C5', targetDeg: 90 },
    });

  it('el empuje de vuelta deja el rig limpio', () => {
    dejarDemoPuesto();
    expect(rigChannel.get().ghostSkin).toBe(true);
    // El mismo empuje que hace `release()` en NeuroPanel.
    rigChannel.setFromConsole({
      movementId: null,
      side: 'R',
      angleDeg: 0,
      highlight: [],
      implicated: [],
      showMarkers: true,
    });
    const s = rigChannel.get();
    expect(s.components, 'el codo se quedaba doblado 90 grados').toEqual([]);
    expect(s.ghostSkin, 'la piel se quedaba de cristal').toBe(false);
    expect(s.demo, 'la tarjeta del miotoma se quedaba puesta').toBeNull();
    expect(s.highlight, 'los musculos se quedaban encendidos').toEqual([]);
    expect(s.showMarkers, 'los marcadores se quedaban apagados').toBe(true);
  });

  it('y es el panel quien lo empuja al parar, no la consola ausente', () => {
    const src = readPanel();
    // Dentro de `release()`, que es lo que corre tanto al pulsar stop como al
    // desmontarse el efecto.
    const release = /const release = \(\) => \{([\s\S]*?)\n    \};/.exec(src);
    expect(release, 'release() ya no es una sola linea: debe devolver el rig').not.toBeNull();
    const cuerpo = release![1];
    expect(cuerpo).toMatch(/rigChannel\.setFromConsole\(/);
    expect(cuerpo, 'la pose guardada de la consola').toMatch(/readPose\(region\)/);
    expect(cuerpo, 'el brillo no es campo de demo: hay que apagarlo a mano').toMatch(
      /highlight: \[\]/,
    );
    expect(cuerpo, 'y los marcadores vuelven').toMatch(/showMarkers: true/);
  });
});

function readPanel(): string {
  return readMovement('NeuroPanel.tsx');
}

function readMovement(file: string): string {
  return readFileSync(resolve(__dirname, '../../components/movement/' + file), 'utf8');
}
