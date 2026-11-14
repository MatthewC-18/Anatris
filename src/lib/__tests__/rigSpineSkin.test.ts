// LA CARA OBEDECE AL ATLAS, AUNQUE ESTE POR DEBAJO DE EL.
//
// El reparto por altura del cuello (`smoothSkinSpine`) daba por hecho que la
// cara estaba por encima de C1. La mitad de abajo no lo esta (en el GLB, C1 en
// y=1,543 y la mandibula hasta y=1,496), y la boca y el menton se repartian
// entre C1 y C4 como si fueran cuello: al girar la cabeza 80 grados se
// quedaban atras hasta 96 mm (medido contra la transformacion de C1). Ahora el
// techo del cuello es el borde de la mandibula. Estas pruebas lo fijan con una
// escena de juguete: un atlas, dos cervicales, una mandibula y tres vertices.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { headShare, measureHeadFloor, smoothSkinSpine, vertebraHeights } from '../rigSpineSkin';

/** Columna de juguete: C3, C2 y C1, con sus alturas de reposo. */
function columna(scene: THREE.Object3D): THREE.Bone[] {
  const arm = new THREE.Object3D();
  arm.name = 'Spine_Armature';
  scene.add(arm);
  const huesos: [string, number][] = [
    ['vert_C3', 1.48],
    ['vert_C2', 1.51],
    ['vert_C1', 1.543],
  ];
  return huesos.map(([n, y]) => {
    const b = new THREE.Bone();
    b.name = n;
    b.position.set(0, y, -0.02);
    arm.add(b);
    return b;
  });
}

/** Mandibula de juguete: borde inferior de y=1,50 (menton, z=0,09) a 1,52 (angulo, z=0). */
function mandibula(scene: THREE.Object3D): void {
  const pts: number[] = [];
  for (let k = 0; k <= 45; k++) {
    const z = (0.09 * k) / 45;
    const yBorde = 1.52 - (0.02 * k) / 45;
    for (const x of [-0.04, 0, 0.04]) {
      pts.push(x, yBorde, z); // el borde
      pts.push(x, yBorde + 0.03, z); // el cuerpo del hueso, encima
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
  m.name = 'Mandible';
  scene.add(m);
}

/** Una malla de piel con vertices dados, toda pesada a C1 como en el GLB. */
function piel(scene: THREE.Object3D, bones: THREE.Bone[], vertices: [number, number, number][]): THREE.SkinnedMesh {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
  const n = vertices.length;
  const si = new Uint16Array(n * 4);
  const sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    si[i * 4] = 2; // vert_C1
    sw[i * 4] = 1;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  mesh.name = 'Mental_region';
  scene.add(mesh);
  scene.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  return mesh;
}

/** Peso de un vertice por nombre de hueso. */
function pesos(mesh: THREE.SkinnedMesh, i: number): Record<string, number> {
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  const out: Record<string, number> = {};
  for (let k = 0; k < 4; k++) {
    const w = sw.getComponent(i, k);
    if (w <= 1e-6) continue;
    const n = mesh.skeleton.bones[si.getComponent(i, k)].name;
    out[n] = (out[n] ?? 0) + w;
  }
  return out;
}

describe('el suelo de la cabeza', () => {
  it('se mide en la mandibula y viaja con las alturas de las vertebras', () => {
    const scene = new THREE.Scene();
    columna(scene);
    mandibula(scene);
    scene.updateMatrixWorld(true);
    const alturas = vertebraHeights(scene);
    expect(alturas.get('vert_C1')).toBeCloseTo(1.543, 3);
    expect(alturas.headFloor).toBeTruthy();
    // Sin mandibula no hay suelo: se reparte como antes, por altura de C1.
    const sin = new THREE.Scene();
    columna(sin);
    sin.updateMatrixWorld(true);
    expect(vertebraHeights(sin).headFloor).toBeNull();
  });

  it('cara 1, cuello 0, y una rampa suave bajo el borde', () => {
    const scene = new THREE.Scene();
    mandibula(scene);
    scene.updateMatrixWorld(true);
    const suelo = measureHeadFloor(scene);
    const h = (x: number, y: number, z: number) => headShare(suelo, new THREE.Vector3(x, y, z));
    // El menton (z=0,08, borde en ~1,502): por encima, cabeza entera.
    expect(h(0, 1.51, 0.08)).toBe(1);
    // Muy por debajo del borde, cuello.
    expect(h(0, 1.43, 0.08)).toBe(0);
    // En la franja, entre los dos y creciendo hacia arriba.
    const a = h(0, 1.47, 0.08);
    const b = h(0, 1.49, 0.08);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeLessThan(1);
    expect(b).toBeGreaterThan(a);
    // Detras de la mandibula (la nuca) y lejos de la linea media, nunca.
    expect(h(0, 1.53, -0.05)).toBe(0);
    expect(h(0.2, 1.53, 0.05)).toBe(0);
  });
});

describe('el reparto del cuello respeta la cara', () => {
  it('el menton, por debajo de C1 pero encima de la mandibula, va entero al atlas', () => {
    const scene = new THREE.Scene();
    const bones = columna(scene);
    mandibula(scene);
    const mesh = piel(scene, bones, [
      [0, 1.51, 0.08], // menton: por debajo de C1 (1,543)
      [0, 1.44, 0.06], // cuello anterior, bajo la franja
      [0, 1.525, -0.06], // nuca, detras de la mandibula
    ]);
    expect(smoothSkinSpine(mesh, vertebraHeights(scene))).toBe(true);
    // El menton sigue al craneo: C1 entero. Antes de esto salia C1 0,45 y C2
    // 0,55, y al girar la cabeza el menton se quedaba atras.
    expect(pesos(mesh, 0)).toEqual({ vert_C1: 1 });
    // El cuello se reparte como siempre: por debajo de C3, C3 entero.
    expect(pesos(mesh, 1)).toEqual({ vert_C3: 1 });
    // La nuca tambien: entre C2 (1,51) y C1 (1,543), por altura.
    const nuca = pesos(mesh, 2);
    expect(nuca.vert_C1).toBeCloseTo((1.525 - 1.51) / (1.543 - 1.51), 3);
    expect(nuca.vert_C2).toBeCloseTo(1 - (1.525 - 1.51) / (1.543 - 1.51), 3);
  });

  it('los pesos siguen sumando 1 en la franja', () => {
    const scene = new THREE.Scene();
    const bones = columna(scene);
    mandibula(scene);
    const mesh = piel(scene, bones, [
      [0, 1.47, 0.08],
      [0, 1.485, 0.05],
      [0.03, 1.495, 0.02],
    ]);
    smoothSkinSpine(mesh, vertebraHeights(scene));
    for (let i = 0; i < 3; i++) {
      const w = Object.values(pesos(mesh, i)).reduce((s, x) => s + x, 0);
      expect(w, `vertice ${i}`).toBeCloseTo(1, 5);
      // Y algo de cabeza y algo de cuello: es la franja.
      expect(pesos(mesh, i).vert_C1 ?? 0, `vertice ${i}`).toBeGreaterThan(0);
    }
  });
});
