// EL ENCUADRE DE APERTURA, Y LAS DOS COSAS QUE ENSEÑABAN EL LADO EQUIVOCADO.
//
// 1) EL NÚCLEO. `REGION_FRAME_BONES` dice qué huesos no se pueden salir de
//    cuadro EN NINGÚN momento del arco, y para el hombro eso incluye la mano,
//    porque la abducción la lleva por encima de la cabeza. Pero encuadrar esa
//    lista AL ENTRAR daba medio cuerpo: en la pose de reposo la mano cuelga a
//    y=0,864 m, la misma altura que `femur_base` (0,865 m), así que la caja
//    bajaba del acromion a la cadera. Medido a 1440x900: 1,24 m de escena
//    visible para una articulación de 10 cm.
//
//    Así que hay dos listas. El núcleo es lo que se encuadra al abrir; la lista
//    completa es lo que el guardián de `RigViewer` mete en cuadro cuando el
//    arco lo saca. Medido después del cambio: la escena visible pasó de 0,88 m a
//    0,64 m y la distancia de cámara de 1,07 m a 0,74 m, con la escápula, la
//    clavícula y el húmero dentro y las manos fuera.
//
// 2) LAS VISTAS LATERALES DE EXPLORAR. "Lateral der." enseñaba el costado
//    IZQUIERDO. En este GLB el lado _R del rig está en +x, que es la izquierda
//    anatómica, y la cámara mira HACIA el modelo, así que para ver el costado
//    derecho hay que ponerla en -x. Es la misma convención que ya vigila
//    `npm run audit-laterality` en el laboratorio.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  FRAME_DEGENERATE_SIDE,
  FRAME_MIN_SIDE,
  FRAME_PAD_RATIO,
  REGION_FRAME_BONES,
  REGION_FRAME_CORE,
  regionFrameCore,
  regionFrameHeadroom,
} from '../labFraming';
import { VIEW_META } from '../anatomyMeta';
import { REGIONS } from '../../data/regiones';
import frameFixture from './fixtures/labFrameBones.json';

describe('el núcleo del encuadre', () => {
  it('todo núcleo es un subconjunto de la lista completa de su región', () => {
    const bad: string[] = [];
    for (const [region, core] of Object.entries(REGION_FRAME_CORE)) {
      const full = REGION_FRAME_BONES[region];
      expect(full, `${region} tiene núcleo pero no lista completa`).toBeDefined();
      for (const b of core) if (!full.includes(b)) bad.push(`${region}: ${b}`);
    }
    expect(bad).toEqual([]);
  });

  it('el hombro y la cadera NO encuadran el extremo distal al abrir', () => {
    // Es la causa medida del "medio cuerpo": la mano en reposo está a la altura
    // de la cadera, y el pie a la del suelo.
    expect(regionFrameCore('shoulder')).not.toContain('hand_flex');
    expect(regionFrameCore('elbow')).not.toContain('hand_flex');
    expect(regionFrameCore('hip')).not.toContain('foot_flex');
    expect(regionFrameCore('knee')).not.toContain('foot_flex');
    // Pero la lista completa SÍ, porque el arco los lleva fuera de cuadro.
    expect(REGION_FRAME_BONES.shoulder).toContain('hand_flex');
    expect(REGION_FRAME_BONES.hip).toContain('foot_flex');
  });

  it('el núcleo del hombro llega hasta el codo, que es la rama del goniómetro', () => {
    const core = regionFrameCore('shoulder')!;
    for (const b of ['clavicle', 'scapula', 'humerus_gh', 'forearm_flex']) {
      expect(core).toContain(b);
    }
  });

  it('una región sin núcleo propio cae en su lista completa, no en null', () => {
    // El raquis y el tobillo no arrastran nada fuera de su caja.
    for (const region of ['cervical', 'thoracic', 'lumbar', 'ankle']) {
      expect(regionFrameCore(region)).toEqual(REGION_FRAME_BONES[region]);
    }
    expect(regionFrameCore('no-existe')).toBeNull();
    expect(regionFrameCore(null)).toBeNull();
  });

  it('el mínimo por lado solo actúa sobre un lado degenerado', () => {
    // Si el umbral subiera por encima del mínimo, toda caja estrecha se
    // engordaría y la cámara volvería a alejarse: la del hombro mide 0,07 m de
    // profundidad cruda y 0,21 m con el margen proporcional.
    expect(FRAME_DEGENERATE_SIDE).toBeLessThan(FRAME_MIN_SIDE);
    expect(FRAME_DEGENERATE_SIDE).toBeLessThan(0.21);
  });
});

// EL ENCUADRE DE APERTURA, EN CENTIMETROS Y NO EN BUENA INTENCION.
//
// Las listas de huesos de `labFraming` se leen muy razonables y encuadraban mal
// las tres regiones que mas se usan. El fallo no se ve leyendo nombres: hay que
// saber DONDE esta cada hueso. `REGION_FRAME_CORE.knee` decia "femur, rotula,
// tibia" y resultaba ser una caja de la CADERA a la rodilla, porque en este rig
// `femur_base` esta en y=0,865 y `patella` y `shin_flex` estan los dos en el
// mismo punto.
//
// Asi que aqui se recalcula la cadena completa --caja de huesos -> `padBox` ->
// `padOf` -> `fitToBox`-- sobre una INSTANTANEA del rig publicado
// (fixtures/labFrameBones.json), y se comprueba contra las cotas de las mallas:
// que la cabeza entra entera, que la articulacion cae en medio del cuadro y que
// el segmento distal no se sale. Igual que neuroSkin.test.ts, la instantanea
// deja el test corriendo sin el binario de 16 MB.
//
// Regenerar la instantanea cuando se reexporte el rig: cargar
// public/cuerpo-rig.opt.glb (scripts/lib/rigPath.mts) y leer la posicion de
// mundo en REPOSO de cada hueso que nombran las recetas, filtrando por el
// ancestro `*_Armature_L` exactamente como hace `RigViewer.bonePoints`; las
// cotas de `segments` son la caja en y de las mallas de cada segmento.
describe('el encuadre de apertura, recalculado sobre el rig publicado', () => {
  const BONES = frameFixture.bones as unknown as Record<string, [number, number, number]>;
  const SEG = frameFixture.segments as unknown as Record<string, [number, number]>;
  // El lienzo del laboratorio en escritorio. Un lienzo mas estrecho solo puede
  // dar MAS alto visible (pasa a limitar el ancho), asi que este es el caso
  // desfavorable para "entra la cabeza".
  const ASPECT = 1.6;
  const TAN_HALF_FOV = Math.tan(((frameFixture.camera.fovDeg / 2) * Math.PI) / 180);

  /**
   * El encuadre que sale de un nucleo, en metros de mundo.
   *
   * `fitToBox` de camera-controls redondea azimut y polar al eje mas cercano,
   * asi que la vista de apertura siempre es frontal o lateral: lo unico que
   * cambia es que lado de la caja hace de ancho de pantalla y cual de
   * profundidad.
   */
  const openFrame = (core: readonly string[], view: 'frontal' | 'lateral', headroom = 0) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const b of core) {
      const p = BONES[b];
      expect(p, `el fixture no trae ${b}`).toBeDefined();
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], p[i]);
        max[i] = Math.max(max[i], p[i]);
      }
    }
    // padBox: margen proporcional al lado mayor...
    const raw = max.map((v, i) => v - min[i]);
    const grow = Math.max(...raw) * FRAME_PAD_RATIO;
    for (let i = 0; i < 3; i++) {
      min[i] -= grow;
      max[i] += grow;
    }
    // ...y el minimo solo sobre el lado degenerado.
    for (let i = 0; i < 3; i++) {
      const side = max[i] - min[i];
      if (side >= FRAME_DEGENERATE_SIDE) continue;
      const lift = (FRAME_MIN_SIDE - side) / 2;
      min[i] -= lift;
      max[i] += lift;
    }
    // El techo propio de la region, despues del margen (REGION_FRAME_HEADROOM).
    max[1] += headroom;
    const size = max.map((v, i) => v - min[i]);
    const pad = Math.max(...size) * 0.07; // padOf
    const width = (view === 'frontal' ? size[0] : size[2]) + 2 * pad;
    const height = size[1] + 2 * pad;
    const depth = view === 'frontal' ? size[2] : size[0];
    // fitToBox: encuadra el lado que limita y retrocede media profundidad.
    const heightToFit = width / height < ASPECT ? height : width / ASPECT;
    const distance = (heightToFit * 0.5) / TAN_HALF_FOV + depth * 0.5;
    const visible = 2 * distance * TAN_HALF_FOV;
    const centreY = (min[1] + max[1]) / 2;
    return { top: centreY + visible / 2, bottom: centreY - visible / 2, visible };
  };

  /** Que fraccion del alto de un segmento entra en el cuadro. */
  const inside = (seg: [number, number], f: { top: number; bottom: number }) =>
    Math.max(0, Math.min(f.top, seg[1]) - Math.max(f.bottom, seg[0])) / (seg[1] - seg[0]);

  /** A que altura del cuadro cae una cota, 0 = borde inferior, 1 = superior. */
  const at = (y: number, f: { top: number; bottom: number }) =>
    (y - f.bottom) / (f.top - f.bottom);

  it('el hombro abre con la cabeza ENTERA, no cortada por la boca', () => {
    // El defecto medido: el borde superior caia en y=1,565 y la piel de la
    // cabeza va de 1,488 a 1,709, asi que entraba el 35% y el corte pasaba por
    // el orbicular de los labios (1,509..1,554).
    const f = openFrame(regionFrameCore('shoulder')!, 'frontal');
    expect(f.top).toBeGreaterThan(SEG.cabeza[1]);
    expect(inside(SEG.cabeza, f)).toBe(1);
    // Y no a cambio de volver a medio cuerpo: el cuerpo mide 1,709 m.
    expect(f.visible).toBeLessThan(0.9);
  });

  it('la toracica tambien, que se cortaba a la altura de las orbitas', () => {
    const f = openFrame(regionFrameCore('thoracic')!, 'lateral');
    expect(inside(SEG.cabeza, f)).toBe(1);
    expect(f.visible).toBeLessThan(0.85);
  });

  it('la rodilla abre CENTRADA en la rodilla, no sobre el muslo', () => {
    // El defecto medido: la rodilla al 23% del alto, pegada al borde de abajo,
    // y de la tibia entraba el 52%.
    const f = openFrame(regionFrameCore('knee')!, 'lateral');
    const rodilla = BONES.patella[1];
    expect(at(rodilla, f)).toBeGreaterThan(0.45);
    expect(at(rodilla, f)).toBeLessThan(0.55);
    // Y entra mas tibia que antes, que es la rama movil del goniometro.
    expect(inside(SEG.tibia, f)).toBeGreaterThan(0.65);
    expect(inside(SEG.femur, f)).toBeGreaterThan(0.6);
  });

  it('el codo igual, y con el antebrazo dentro', () => {
    // El defecto medido: el codo al 25% del alto y el antebrazo al 56%.
    const f = openFrame(regionFrameCore('elbow')!, 'lateral');
    const codo = (BONES.forearm_flex[1] + BONES.forearm_rot[1]) / 2;
    expect(at(codo, f)).toBeGreaterThan(0.45);
    expect(at(codo, f)).toBeLessThan(0.55);
    expect(inside(SEG.antebrazo, f)).toBeGreaterThan(0.95);
    expect(inside(SEG.humero, f)).toBeGreaterThan(0.8);
  });

  it('el cubo del nucleo por articulacion son 0,528 m de escena', () => {
    // Es lo que promete el comentario de FRAME_MIN_SIDE: el codo y la rodilla
    // abren con los huesos de su propia articulacion, la caja sale degenerada
    // por los tres lados y es ese minimo el que fija el zoom de apertura. Si
    // alguien mueve 0,34 m, estas dos regiones cambian de encuadre.
    for (const region of ['knee', 'elbow']) {
      const f = openFrame(regionFrameCore(region)!, 'lateral');
      expect(f.visible, region).toBeCloseTo(0.528, 2);
    }
  });

  it('la cervical mete la coronilla con su margen superior, no con mas huesos', () => {
    // Por encima de `vert_C1` (1,543) el rig no tiene ningun hueso y la
    // coronilla esta en 1,709. SIN el margen el cuadro se queda en 1,669 y
    // entra el 82% de la cabeza: es el defecto, y se comprueba que el calculo
    // lo reproduce para que el arreglo no sea una casualidad del banco.
    const sin = openFrame(regionFrameCore('cervical')!, 'lateral');
    expect(sin.top).toBeLessThan(SEG.cabeza[1]);
    expect(inside(SEG.cabeza, sin)).toBeLessThan(0.9);
    // CON el margen de la region entra entera...
    const con = openFrame(regionFrameCore('cervical')!, 'lateral', regionFrameHeadroom('cervical'));
    expect(con.top).toBeGreaterThan(SEG.cabeza[1]);
    expect(inside(SEG.cabeza, con)).toBe(1);
    // ...y sigue siendo un primer plano de cuello, no un plano de raquis: la
    // salida de alargar la lista hasta T12 daba 0,730 m de escena.
    expect(con.visible).toBeLessThan(0.5);
    // El borde de abajo no se mueve: el margen es SOLO hacia arriba.
    expect(con.bottom).toBeCloseTo(sin.bottom, 3);
  });

  it('solo la cervical lleva margen superior', () => {
    // El hombro y la toracica ya suben hasta `vert_C1` con su margen
    // proporcional; darles ademas este los alejaria sin motivo.
    expect(regionFrameHeadroom('cervical')).toBeGreaterThan(0);
    for (const r of ['shoulder', 'thoracic', 'lumbar', 'elbow', 'hip', 'knee', 'ankle', null]) {
      expect(regionFrameHeadroom(r)).toBe(0);
    }
  });

  it('en rodilla y codo hay un hueso FUERA del cuadro de apertura, por diseno', () => {
    // Es lo que hacia que el guardian reabriera el plano: `femur_base` (la
    // cadera) queda por encima del borde superior del cuadro de rodilla y
    // `humerus_gh` (el hombro) por encima del de codo. Estan en la lista
    // completa de la region, asi que el guardian los veia fuera de cuadro y, en
    // cuanto el arco pasaba de 8 grados, ampliaba la caja hasta meterlos: la
    // vista volvia al muslo entero justo al empezar a mover.
    const rodilla = openFrame(regionFrameCore('knee')!, 'lateral');
    expect(BONES.femur_base[1]).toBeGreaterThan(rodilla.top);
    const codo = openFrame(regionFrameCore('elbow')!, 'lateral');
    expect(BONES.humerus_gh[1]).toBeGreaterThan(codo.top);
  });

  it('la cadera y el tobillo no tienen el defecto, y se quedan como estaban', () => {
    // Medido: la cadera cae al 64% del alto --no contra un borde-- con el femur
    // entero dentro; y el tobillo al 23%, pero ahi el cuerpo SE ACABA y la
    // tibia entra al 100%, asi que es el encuadre correcto.
    const cadera = openFrame(regionFrameCore('hip')!, 'lateral');
    expect(at(BONES.femur_base[1], cadera)).toBeGreaterThan(0.5);
    expect(at(BONES.femur_base[1], cadera)).toBeLessThan(0.75);
    expect(inside(SEG.femur, cadera)).toBe(1);
    const tobillo = openFrame(regionFrameCore('ankle')!, 'lateral');
    expect(inside(SEG.tibia, tobillo)).toBe(1);
  });
});

describe('RigViewer encuadra un solo lado y con margen proporcional', () => {
  const src = readFileSync('src/components/movement/RigViewer.tsx', 'utf8');

  it('el guardian solo sigue a los huesos que el movimiento ha desplazado', () => {
    // Un hueso que ya estaba fuera de cuadro al encuadrar lo esta por diseno
    // (ver el test de rodilla y codo, mas arriba). Lo que el guardian tiene que
    // seguir es lo que el gesto SACA: el pie en la flexion de rodilla, la mano
    // en la abduccion. Se compara contra la foto tomada al encuadrar.
    expect(src).toContain('framedAt.current = new Map(');
    const guardian = src.slice(src.indexOf('// SOLO LO QUE EL MOVIMIENTO HA DESPLAZADO.'));
    const i = guardian.indexOf('framedAt.current.get(id)');
    const j = guardian.indexOf('keptBox.current.containsPoint(p)');
    expect(i).toBeGreaterThan(0);
    // Y se descarta ANTES de mirar la caja: si no, el hueso quieto y fuera de
    // cuadro seguiria ampliandola.
    expect(i).toBeLessThan(j);
    expect(guardian.slice(i, j)).toContain('MOVED_SQ');
    expect(src).toMatch(/const MOVED_SQ = 0\.01 \* 0\.01;/);
  });

  it('la apertura aplica el margen superior de la region', () => {
    expect(src).toContain('box.max.y += regionFrameHeadroom(region)');
  });

  it('filtra por el armature del lado activo', () => {
    // Los nombres base casan en los DOS armatures: medido, los 6 del hombro
    // casaban 12 huesos y la caja abarcaba los dos brazos.
    expect(src).toContain('_Armature_([RL])$');
    expect(src).toContain('rigSideFor(cmd.side)');
  });

  it('abre con el núcleo, no con la lista completa', () => {
    expect(src).toContain('regionFrameCore(region)');
  });

  it('el margen de fitToBox es proporcional, no 0,15 m fijos', () => {
    expect(src).not.toMatch(/paddingTop: 0\.1\d*,/);
    expect(src).toContain('const pad = padOf(');
  });

  it('el tope de la rueda se deriva de la caja encuadrada', () => {
    // Eran 0,05 y 50 fijos sobre un cuerpo de 1,75 m: el cuerpo entero cabía en
    // 34 px con la rueda hacia atrás.
    expect(src).toContain('controls.maxDistance = d * 2');
    expect(src).not.toContain('maxDistance={50}');
  });

  it('la cámara solo amplía con el arco fuera de su inicio', () => {
    // Sin esto el guardián veía la mano fuera de cuadro EN REPOSO y ampliaba en
    // el primer fotograma, devolviendo el encuadre de medio cuerpo.
    expect(src).toContain('buildLabArc(mv).startDeg');
  });
});

describe('las vistas por plano de Explorar', () => {
  it('la lateral derecha mira desde -x, que es donde está la derecha del paciente', () => {
    expect(VIEW_META['lateral-right'].dir[0]).toBeLessThan(0);
    expect(VIEW_META['lateral-left'].dir[0]).toBeGreaterThan(0);
  });

  it('y las dos son opuestas, no iguales', () => {
    expect(VIEW_META['lateral-right'].dir[0]).toBe(-VIEW_META['lateral-left'].dir[0]);
  });
});

describe('la guía rápida no habla inglés', () => {
  const guide = readFileSync('src/components/GuideHub.tsx', 'utf8');

  it('lee el nombre de la región de REGIONS y no de una copia a mano', () => {
    // Faltaban `hip` y `ankle` en la copia, así que el "estás aquí" imprimía el
    // identificador: 'hip' y 'ankle', en dos regiones de PAGO.
    expect(guide).toContain('REGIONS[regionId]?.name');
    expect(guide).not.toContain("shoulder: 'Hombro'");
  });

  it('cada región del registro tiene nombre en español', () => {
    const bad: string[] = [];
    for (const [id, def] of Object.entries(REGIONS)) {
      if (!def.name || def.name === id) bad.push(id);
      if (/^[a-z_]+$/.test(def.name)) bad.push(`${id}: "${def.name}" parece un id`);
    }
    expect(bad).toEqual([]);
    // Y las dos que faltaban, por su nombre.
    expect(REGIONS.hip.name).toBe('Cadera');
    expect(REGIONS.ankle.name).toContain('Tobillo');
  });
});

describe('la piel de la cabeza no fantasmea', () => {
  const model = readFileSync('src/components/movement/RigModel.tsx', 'utf8');

  it('la rampa del fantasma cae por DEBAJO de la mandíbula, no encima', () => {
    // LA REGLA, NO EL NÚMERO. Lo que no puede volver a pasar es que la rampa
    // se solape con la banda dental: ahí estuvo (1,50..1,58 contra unos
    // dientes y una mandíbula que ocupan y 1,496..1,579) y la cara salía
    // desdentada, con la piel sobre los incisivos al 4% de solidez.
    //
    // Cotas medidas sobre public/cuerpo-rig.opt.glb:
    //   mandíbula + dientes      y 1,496 .. 1,579
    //   piel del cuello          y 1,402 .. 1,563   (30 piezas)
    // La rampa tiene que terminar en o antes del borde inferior de la
    // mandíbula, y empezar dentro de la piel del cuello para que no haya un
    // salto de material a la vista.
    const MANDIBULA_Y0 = 1.496;
    const CUELLO_Y0 = 1.402;
    const y0 = Number(/HEAD_SOLID_Y0 = ([\d.]+)/.exec(model)?.[1]);
    const y1 = Number(/HEAD_SOLID_Y1 = ([\d.]+)/.exec(model)?.[1]);
    expect(Number.isFinite(y0)).toBe(true);
    expect(Number.isFinite(y1)).toBe(true);
    expect(y1).toBeLessThanOrEqual(MANDIBULA_Y0);
    expect(y0).toBeGreaterThanOrEqual(CUELLO_Y0);
    expect(y0).toBeLessThan(y1);
    expect(model).toContain('smoothstep(uHeadY0 + napeLift, uHeadY1 + napeLift, vAnatY)');
  });

  it('por detrás la rampa sube: la nuca es cuello hasta el occipital', () => {
    // MEDIDO lanzando rayos de perfil (44 x 52, de y=1,40 a 1,62): 30 de 1.483
    // tocan músculo antes que piel y 26 son UNA malla, el trapecio, en una
    // rendija de 1 cm de ancho (z de -0,068 a -0,048) y 6 de alto (y de 1,478 a
    // 1,558), donde sobresale de la piel. Bajo piel sólida era una franja roja
    // detrás de la oreja en el plano lateral de la cervical.
    const lift = Number(/const NAPE_LIFT = ([\d.]+)/.exec(model)?.[1]);
    const z0 = Number(/const NAPE_Z0 = (-?[\d.]+)/.exec(model)?.[1]);
    const z1 = Number(/const NAPE_Z1 = (-?[\d.]+)/.exec(model)?.[1]);
    const y0 = Number(/HEAD_SOLID_Y0 = ([\d.]+)/.exec(model)?.[1]);
    const y1 = Number(/HEAD_SOLID_Y1 = ([\d.]+)/.exec(model)?.[1]);
    for (const v of [lift, z0, z1, y0, y1]) expect(Number.isFinite(v)).toBe(true);
    // La subida es SOLO por detrás: termina antes de z = 0, que es donde
    // empiezan la mandíbula y los dientes (delante). Si llegara a la cara,
    // volvería el defecto de la cara desdentada.
    expect(z1).toBeLessThan(0);
    expect(z0).toBeLessThan(z1);
    // La rendija entera queda dentro del cristal completo o de su rampa: su
    // borde más adelantado (z = -0,048) cae dentro de la transición, y por
    // detrás de z0 la rampa empieza por encima de su techo (1,558 - 0,03).
    expect(z0).toBeLessThanOrEqual(-0.048);
    expect(z1).toBeGreaterThan(-0.048);
    expect(y0 + lift).toBeGreaterThanOrEqual(1.558 - 0.03);
    // Y no se come el cráneo: por detrás la piel vuelve a ser sólida antes de
    // la altura de las órbitas (1,591).
    expect(y1 + lift).toBeLessThanOrEqual(1.6);
    expect(model).toContain('uNapeLift * (1.0 - smoothstep(uNapeZ0, uNapeZ1, vAnatZ))');
  });

  it('la órbita se vacía por nombre Y por cota, nunca solo por nombre', () => {
    // El modelo no trae globo ocular (ni esclera, ni córnea, ni iris), así que
    // detrás de la abertura palpebral solo hay músculo rojo y en pantalla se
    // lee como dos ojos encendidos. Se apagan los siete extraoculares de cada
    // lado, que no mueven ningún segmento ni los nombra ninguna prueba.
    //
    // El filtro NO puede ser solo el nombre: "rectus" también está en el recto
    // femoral, el del abdomen y los capitales, y "retina" es el principio de
    // "retinaculum" (44 mallas de rodilla y tobillo). Por eso exige además la
    // cota orbitaria.
    expect(model).toContain('OCULAR_NAME.test(mesh.name)');
    expect(model).toMatch(/c\.y > ORBIT_Y0 && c\.y < ORBIT_Y1/);
    const re = /const OCULAR_NAME =\s*([\s\S]*?);/.exec(model)?.[1] ?? '';
    expect(re).not.toMatch(/retina[^c]/);
    // Los que tienen que caer y los que NO.
    const ocular = new RegExp(
      /^(Superior|Inferior|Medial|Lateral)_rectus_muscle|^(Superior|Inferior)_oblique_muscle|^Levator_palpebrae/
        .source,
      'i',
    );
    for (const n of ['Lateral_rectus_musclel', 'Superior_oblique_muscler', 'Levator_palpebrae_superiorisl']) {
      expect(ocular.test(n)).toBe(true);
    }
    for (const n of [
      'Rectus_femorisl',
      'Rectus_abdominis_muscle',
      'Rectus_lateralis_capitis_musclel',
      'Lateral_patellar_retinaculuml',
      'Flexor_retinaculum_of_anklel',
      'External_oblique_muscle',
    ]) {
      expect(ocular.test(n)).toBe(false);
    }
  });

  it('la altura es la de la pose de LIGADO, no la animada', () => {
    // Con la pose animada, 50 grados de flexión cervical bajan la coronilla
    // 8,6 cm y parte de la cara volvería a fantasmear.
    expect(model).toContain('vec4 anatPos = modelMatrix * vec4( position, 1.0 );');
    expect(model).toContain('vAnatY = anatPos.y;');
    // La z también es la de ligado: la máscara de la nuca es anatómica.
    expect(model).toContain('vAnatZ = anatPos.z;');
  });

  it('el emisivo va multiplicado por el Fresnel, no sumado plano', () => {
    // Entrando plano aportaba el 68% del azul en sombra y volvía la piel más
    // azul que roja (b-r de -19 a +3).
    expect(model).toContain('totalEmissiveRadiance *= ghostK * (1.0 - headSolid);');
    expect(model).toMatch(/BODY_SKIN_GHOST_EMISSIVE = 0\.12/);
    // El tinte viejo ya no se ASIGNA (solo se nombra en el comentario que
    // explica la medida, y eso tiene que seguir siendo legible).
    expect(model).not.toContain('new THREE.Color(0x1a2740)');
    expect(model).toContain('new THREE.Color(0x2a3348)');
  });
});
