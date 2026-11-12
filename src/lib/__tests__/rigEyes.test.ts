// LOS OJOS DEL RIG: donde van, que siguen a la cabeza y cuando se ven.
//
// El GLB del laboratorio no trae globo ocular y por la abertura de los parpados
// se veia el orbicular, rojo (ver src/lib/rigEyes.ts). Este test fija las tres
// cosas que hacian falta para que no vuelva: el globo cubre la abertura MEDIDA
// (19 puntos del borde libre de los parpados, sacados de la piel del rig en
// reposo), cuelga del hueso de la cabeza y no estorba al resto del laboratorio
// (ni se disecciona ni flota sobre una calavera).

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  addEyes,
  EYE_CENTER,
  EYE_NAME,
  EYE_RADIUS,
  EYE_RX,
  EYELID_RIM,
  eyesIn,
  eyesVisibleFor,
  gapToEye,
} from '../rigEyes';

/** Una escena minima con el hueso de la cabeza, fuera del origen y girado. */
function sceneWithHead() {
  const scene = new THREE.Group();
  const root = new THREE.Bone();
  root.name = 'root';
  root.position.set(0, 1.2, -0.01);
  const head = new THREE.Bone();
  head.name = 'vert_C1';
  head.position.set(0, 0.33, 0.005);
  head.rotation.set(0.21, -0.05, 0.03);
  root.add(head);
  scene.add(root);
  scene.updateMatrixWorld(true);
  return { scene, head };
}

const mm = (m: number) => m * 1000;

describe('el globo cubre la abertura de los parpados', () => {
  it('ningun punto del borde queda a mas de 0,55 mm por fuera del globo', () => {
    // Un hueco entre el borde y el globo es por donde se ve el orbicular. Con la
    // esfera de 23 mm centrada por los rectos llegaba a 5,7 mm; con la de 26 mm
    // ajustada por minimos cuadrados, a 1,8 mm, y aun se veia rojo en el canto
    // lateral.
    const huecos = EYELID_RIM.map((p) => mm(gapToEye(p)));
    expect(Math.max(...huecos)).toBeLessThan(0.55);
  });

  it('y el globo no asoma mas de 1 mm por delante de ninguno', () => {
    // Lo contrario del hueco: la esclera montada sobre el parpado.
    const huecos = EYELID_RIM.map((p) => mm(gapToEye(p)));
    expect(Math.min(...huecos)).toBeGreaterThan(-1);
  });

  it('el borde es una abertura de verdad: 27 x 15 mm, a la altura de los ojos', () => {
    const xs = EYELID_RIM.map((p) => p[0]);
    const ys = EYELID_RIM.map((p) => p[1]);
    expect(mm(Math.max(...xs) - Math.min(...xs))).toBeCloseTo(27.2, 0);
    expect(mm(Math.max(...ys) - Math.min(...ys))).toBeCloseTo(14.7, 0);
    // El centro del globo cae dentro de la abertura vista de frente.
    expect(EYE_CENTER.x).toBeGreaterThan(Math.min(...xs));
    expect(EYE_CENTER.x).toBeLessThan(Math.max(...xs));
    expect(EYE_CENTER.y).toBeGreaterThan(Math.min(...ys));
    expect(EYE_CENTER.y).toBeLessThan(Math.max(...ys));
  });

  it('el globo es poco mas ancho que alto, como la cornea (no un huevo)', () => {
    expect(EYE_RX / EYE_RADIUS).toBeGreaterThan(1);
    expect(EYE_RX / EYE_RADIUS).toBeLessThan(1.15);
  });
});

describe('los globos cuelgan de la cabeza', () => {
  it('pone dos, en su sitio de mundo y colgados de vert_C1', () => {
    const { scene, head } = sceneWithHead();
    expect(addEyes(scene)).toBe(2);
    const ojos = eyesIn(scene);
    expect(ojos).toHaveLength(2);
    const p = new THREE.Vector3();
    const xs: number[] = [];
    for (const o of ojos) {
      expect(o.parent).toBe(head);
      o.getWorldPosition(p);
      xs.push(p.x);
      expect(Math.abs(p.x)).toBeCloseTo(EYE_CENTER.x, 6);
      expect(p.y).toBeCloseTo(EYE_CENTER.y, 6);
      expect(p.z).toBeCloseTo(EYE_CENTER.z, 6);
    }
    // Uno a cada lado.
    expect(Math.sign(xs[0])).toBe(-Math.sign(xs[1]));
  });

  it('miran hacia delante (+z) aunque el hueso este girado', () => {
    const { scene } = sceneWithHead();
    addEyes(scene);
    const q = new THREE.Quaternion();
    for (const o of eyesIn(scene)) {
      o.getWorldQuaternion(q);
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      // Hacia delante y un poco hacia abajo (la mirada en reposo).
      expect(fwd.z).toBeGreaterThan(0.99);
      expect(fwd.y).toBeLessThan(0);
      expect(fwd.y).toBeGreaterThan(-0.1);
    }
  });

  it('una segunda llamada no duplica (la escena del rig se reutiliza)', () => {
    const { scene } = sceneWithHead();
    addEyes(scene);
    expect(addEyes(scene)).toBe(0);
    expect(eyesIn(scene)).toHaveLength(2);
  });

  it('sin hueso de la cabeza no pone nada', () => {
    const scene = new THREE.Group();
    scene.add(new THREE.Bone());
    expect(addEyes(scene)).toBe(0);
    expect(eyesIn(scene)).toHaveLength(0);
  });

  it('al girar la cabeza, el ojo va con ella', () => {
    // Una flexion cervical: el ojo se mueve en mundo pero no respecto al hueso.
    const { scene, head } = sceneWithHead();
    addEyes(scene);
    const ojo = eyesIn(scene)[0];
    const antes = ojo.getWorldPosition(new THREE.Vector3());
    const hueso0 = head.getWorldPosition(new THREE.Vector3());
    const d0 = antes.distanceTo(hueso0);
    head.rotation.x += 0.6;
    scene.updateMatrixWorld(true);
    const despues = ojo.getWorldPosition(new THREE.Vector3());
    expect(despues.distanceTo(antes)).toBeGreaterThan(0.01);
    expect(despues.distanceTo(head.getWorldPosition(new THREE.Vector3()))).toBeCloseTo(d0, 9);
  });
});

describe('el iris se asienta sobre el globo', () => {
  it('cada casquete queda por fuera de la esclera, y en orden', () => {
    // Un disco plano con el borde a ras del globo quedaba tapado por la esclera
    // y solo asomaba el contorno. Los casquetes van por encima, y cada uno por
    // encima del anterior (limbo, iris, pupila), para que no parpadeen.
    const { scene } = sceneWithHead();
    addEyes(scene);
    const g = eyesIn(scene)[0];
    const [, ...caps] = g.children as THREE.Mesh[];
    expect(caps).toHaveLength(3);
    let previo = 0;
    for (const m of caps) {
      const pos = m.geometry.attributes.position;
      const v = new THREE.Vector3();
      let minLift = Infinity;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const len = v.length();
        const u = v.clone().normalize();
        const t = 1 / Math.sqrt((u.x / EYE_RX) ** 2 + (u.y / EYE_RADIUS) ** 2 + (u.z / EYE_RADIUS) ** 2);
        minLift = Math.min(minLift, len - t);
      }
      expect(minLift).toBeGreaterThan(previo);
      previo = minLift;
    }
  });

  it('y visto de frente es redondo', () => {
    const { scene } = sceneWithHead();
    addEyes(scene);
    const iris = eyesIn(scene)[0].children[2] as THREE.Mesh;
    iris.geometry.computeBoundingBox();
    const b = iris.geometry.boundingBox!;
    const ancho = b.max.x - b.min.x;
    const alto = b.max.y - b.min.y;
    expect(ancho / alto).toBeGreaterThan(0.99);
    expect(ancho / alto).toBeLessThan(1.04);
  });
});

describe('los ojos no estorban', () => {
  it('se ven con piel o con musculo, y no con el esqueleto solo', () => {
    expect(eyesVisibleFor({ skin: true, muscle: true })).toBe(true);
    expect(eyesVisibleFor({ skin: true, muscle: false })).toBe(true);
    expect(eyesVisibleFor({ skin: false, muscle: true })).toBe(true);
    expect(eyesVisibleFor({ skin: false, muscle: false })).toBe(false);
  });

  it('un clic no los toca: no son un musculo que diseccionar', () => {
    const { scene } = sceneWithHead();
    addEyes(scene);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(EYE_CENTER.x, EYE_CENTER.y, 1),
      new THREE.Vector3(0, 0, -1),
    );
    expect(ray.intersectObject(scene, true)).toHaveLength(0);
  });

  it('no entran en la lista de capas: marca propia, sin rigLayer', () => {
    const { scene } = sceneWithHead();
    addEyes(scene);
    scene.traverse((o) => {
      if (!o.userData.rigEye) return;
      expect(o.userData.rigLayer).toBeUndefined();
    });
    expect(eyesIn(scene).every((o) => o.name === EYE_NAME)).toBe(true);
  });
});

describe('RigModel los monta como se debe', () => {
  it('en la pasada de preparacion (rig en reposo) y con la regla de capas', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/components/movement/RigModel.tsx', 'utf8');
    // Antes de marcar la escena como preparada: con el rig ya posado, la
    // posicion de mundo dejaria los ojos fuera de sitio.
    const add = src.indexOf('addEyes(scene);');
    const prepared = src.indexOf('scene.userData.__rigPrepared = true;');
    expect(add).toBeGreaterThan(0);
    expect(add).toBeLessThan(prepared);
    expect(prepared - add).toBeLessThan(80);
    expect(src).toContain('eyesVisibleFor(st)');
    expect(src).toContain('eyesRef.current = eyesIn(scene);');
  });
});
