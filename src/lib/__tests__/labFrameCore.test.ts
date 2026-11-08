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
  REGION_FRAME_BONES,
  REGION_FRAME_CORE,
  regionFrameCore,
} from '../labFraming';
import { VIEW_META } from '../anatomyMeta';
import { REGIONS } from '../../data/regiones';

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

describe('RigViewer encuadra un solo lado y con margen proporcional', () => {
  const src = readFileSync('src/components/movement/RigViewer.tsx', 'utf8');

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

  it('el fantasma se apaga por altura anatómica entre dos cotas medidas', () => {
    // Medido sobre el GLB: la piel del cuello llega a y=1,498 y la de la cara
    // empieza por encima (Eyebrow 1,617, Frontal 1,625, Parietal 1,686).
    expect(model).toMatch(/HEAD_SOLID_Y0 = 1\.5/);
    expect(model).toMatch(/HEAD_SOLID_Y1 = 1\.58/);
    expect(model).toContain('smoothstep(uHeadY0, uHeadY1, vAnatY)');
  });

  it('la altura es la de la pose de LIGADO, no la animada', () => {
    // Con la pose animada, 50 grados de flexión cervical bajan la coronilla
    // 8,6 cm y parte de la cara volvería a fantasmear.
    expect(model).toContain('vAnatY = ( modelMatrix * vec4( position, 1.0 ) ).y;');
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
