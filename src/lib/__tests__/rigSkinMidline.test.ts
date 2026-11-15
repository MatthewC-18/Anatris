// LA PIEL DE LA CABEZA SE CIERRA POR LA LINEA MEDIA, Y NADA MAS.
//
// src/lib/rigSkinMidline.ts acerca al plano medio los bordes abiertos de la
// piel de la cabeza: la coronilla dejaba un rombo de 9,4 x 10,8 mm por el que se
// veia el craneo, y la nariz y el labio, grietas de 1 a 2 mm. Medido sobre el
// GLB real: 24 vertices en 8 teselas, ninguno se mueve en y ni en z, y ninguna
// narina se toca. Este test fija las reglas con teselas de juguete, que es
// donde se ve cada caso aislado.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { closeSkinMidline, MIDLINE_HOLE_M, MIDLINE_SNAP_M, weldHeadSkinNormals } from '../rigSkinMidline';

/**
 * Una tira de piel de dos columnas en el plano z = 0,1: la interior (`inner`,
 * de arriba abajo) y la exterior, a `outerX`. Triangulada como una escalera.
 */
function strip(name: string, inner: [number, number][], outerX: number, extra?: (g: number[]) => void) {
  const pos: number[] = [];
  for (const [x, y] of inner) pos.push(x, y, 0.1);
  for (const [, y] of inner) pos.push(outerX, y, 0.1);
  const n = inner.length;
  const idx: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    idx.push(i, n + i, i + 1);
    idx.push(i + 1, n + i, n + i + 1);
  }
  extra?.(pos);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
  m.name = name;
  return m;
}

const skin = () => 'skin' as const;
const xOf = (m: THREE.Mesh, i: number) => m.geometry.getAttribute('position').getX(i);
const yOf = (m: THREE.Mesh, i: number) => m.geometry.getAttribute('position').getY(i);

/** Las dos mitades de una coronilla con un rombo abierto entre ellas. */
function coronilla(y0 = 1.7) {
  const bulge: [number, number][] = [
    [0, y0],
    [0.0025, y0 + 0.002],
    [0.0047, y0 + 0.005],
    [0.0025, y0 + 0.008],
    [0, y0 + 0.01],
  ];
  const left = strip('izq', bulge, 0.02);
  const right = strip(
    'der',
    bulge.map(([x, y]) => [-x, y]),
    -0.02,
  );
  const scene = new THREE.Group();
  scene.add(left, right);
  return { scene, left, right };
}

describe('el agujero entre dos teselas que deberian tocarse', () => {
  it('se cierra: el tramo abierto va entero al plano medio', () => {
    const { scene, left, right } = coronilla();
    const r = closeSkinMidline(scene, skin);
    for (const m of [left, right]) {
      for (const i of [1, 2, 3]) expect(xOf(m, i)).toBeCloseTo(0, 9);
    }
    expect(r.holes).toBe(2);
    expect(r.maxMove).toBeCloseTo(0.0047, 6);
  });

  it('solo se mueve en x: la altura y el fondo no cambian', () => {
    const { scene, left } = coronilla();
    const antes = [0, 1, 2, 3, 4].map((i) => yOf(left, i));
    closeSkinMidline(scene, skin);
    expect([0, 1, 2, 3, 4].map((i) => yOf(left, i))).toEqual(antes);
  });

  it('el borde de fuera de la tesela no se toca (esta lejos del plano medio)', () => {
    const { scene, left } = coronilla();
    closeSkinMidline(scene, skin);
    for (const i of [5, 6, 7, 8, 9]) expect(xOf(left, i)).toBeCloseTo(0.02, 9);
  });

  it('una segunda pasada no hace nada', () => {
    const { scene } = coronilla();
    closeSkinMidline(scene, skin);
    expect(closeSkinMidline(scene, skin).vertices).toBe(0);
  });

  it('por debajo de la cabeza no actua (ahi las mitades llevan pesos distintos)', () => {
    const { scene, left } = coronilla(1.0);
    expect(closeSkinMidline(scene, skin).vertices).toBe(0);
    expect(xOf(left, 2)).toBeCloseTo(0.0047, 9);
  });

  it('si el hueco pasa de 6 mm del plano medio, no es una grieta: se deja', () => {
    const { scene, left } = coronilla();
    const pos = left.geometry.getAttribute('position');
    pos.setX(2, MIDLINE_HOLE_M + 0.001);
    expect(closeSkinMidline(scene, skin).holes).toBe(1); // solo la otra mitad
    expect(xOf(left, 2)).toBeCloseTo(MIDLINE_HOLE_M + 0.001, 9);
  });
});

describe('una abertura de verdad no se cierra', () => {
  it('una narina: su borde no empieza ni acaba en el plano medio', () => {
    // Columna interior a 3..6 mm del plano medio, cosida arriba y abajo a otra
    // tesela (la columela) a 3 mm: el tramo abierto no toca el plano medio.
    const ala = strip(
      'ala',
      [
        [0.003, 1.55],
        [0.005, 1.552],
        [0.006, 1.555],
        [0.005, 1.558],
        [0.003, 1.56],
      ],
      0.02,
    );
    const columela = strip(
      'columela',
      [
        [0.003, 1.55],
        [0.0005, 1.555],
        [0.003, 1.56],
      ],
      -0.003,
    );
    const scene = new THREE.Group();
    scene.add(ala, columela);
    closeSkinMidline(scene, skin);
    for (const i of [1, 2, 3]) expect(xOf(ala, i)).toBeGreaterThan(0.004);
  });

  it('un lazo cerrado (un ojo, una oreja) no tiene vecinos cosidos: no se toca', () => {
    // Un anillo con el agujero a 2,5..4,5 mm del plano medio: dentro de los
    // 6 mm de la regla 2, pero su borde es un lazo sin ningun vertice cosido a
    // otra tesela, asi que no es el hueco ENTRE dos teselas.
    const pos: number[] = [];
    const outer = [
      [0.0015, 1.6],
      [0.007, 1.6],
      [0.007, 1.608],
      [0.0015, 1.608],
    ];
    const inner = [
      [0.0025, 1.603],
      [0.0045, 1.603],
      [0.0045, 1.605],
      [0.0025, 1.605],
    ];
    for (const [x, y] of [...outer, ...inner]) pos.push(x, y, 0.1);
    const idx: number[] = [];
    for (let k = 0; k < 4; k++) {
      const a = k;
      const b = (k + 1) % 4;
      idx.push(a, b, 4 + a, b, 4 + b, 4 + a);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const anillo = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
    const scene = new THREE.Group();
    scene.add(anillo);
    expect(closeSkinMidline(scene, skin).vertices).toBe(0);
    const xs = [4, 5, 6, 7].map((i) => g.getAttribute('position').getX(i));
    expect(xs.map((x) => +x.toFixed(4))).toEqual([0.0025, 0.0045, 0.0045, 0.0025]);
  });
});

describe('la grieta fina', () => {
  it('un vertice abierto a 1,2 mm o menos del plano medio va a x = 0', () => {
    const left = strip(
      'izq',
      [
        [0, 1.56],
        [0.0009, 1.562],
        [0, 1.564],
      ],
      0.02,
    );
    const right = strip(
      'der',
      [
        [0, 1.56],
        [-0.0009, 1.562],
        [0, 1.564],
      ],
      -0.02,
    );
    const scene = new THREE.Group();
    scene.add(left, right);
    const r = closeSkinMidline(scene, skin);
    expect(xOf(left, 1)).toBeCloseTo(0, 9);
    expect(xOf(right, 1)).toBeCloseTo(0, 9);
    expect(r.holes).toBe(0);
    expect(r.maxMove).toBeLessThanOrEqual(MIDLINE_SNAP_M);
  });

  it('las copias de un vertice en una costura UV se mueven juntas', () => {
    // El vertice 1 duplicado (indice 6), usado por el segundo triangulo: si
    // solo se moviera una copia, la costura se abriria por dentro.
    const left = strip(
      'izq',
      [
        [0, 1.56],
        [0.0009, 1.562],
        [0, 1.564],
      ],
      0.02,
      (p) => p.push(0.0009, 1.562, 0.1),
    );
    const idx = left.geometry.getIndex()!;
    // El triangulo (1, 3, 2) pasa a usar la copia 6 en vez del 1.
    const arr = Array.from(idx.array);
    arr[3] = 6;
    left.geometry.setIndex(arr);
    const right = strip(
      'der',
      [
        [0, 1.56],
        [-0.0009, 1.562],
        [0, 1.564],
      ],
      -0.02,
    );
    const scene = new THREE.Group();
    scene.add(left, right);
    closeSkinMidline(scene, skin);
    expect(xOf(left, 1)).toBeCloseTo(0, 9);
    expect(xOf(left, 6)).toBeCloseTo(0, 9);
  });

  it('respeta la matriz de mundo de la malla', () => {
    // La tesela colgada de un padre desplazado: el plano medio es el de MUNDO.
    const { scene, left } = coronilla(1.2);
    const holder = new THREE.Group();
    holder.position.set(0, 0.5, 0);
    scene.remove(left);
    holder.add(left);
    scene.add(holder);
    const right = scene.children.find((c) => c.name === 'der')!;
    right.position.set(0, 0.5, 0);
    closeSkinMidline(scene, skin);
    expect(xOf(left, 2)).toBeCloseTo(0, 9);
  });
});

describe('RigModel lo llama donde debe', () => {
  it('justo despues de engordar la piel, antes de los pases de pesos', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/components/movement/RigModel.tsx', 'utf8');
    const inflar = src.indexOf('inflateSkinShell(scene);');
    const cerrar = src.indexOf('closeSkinMidline(scene,');
    const pesos = src.indexOf('relaxSkinSeams(scene);');
    expect(inflar).toBeGreaterThan(0);
    expect(cerrar).toBeGreaterThan(inflar);
    expect(cerrar).toBeLessThan(pesos);
  });
});

describe('las normales de la cara, soldadas por las costuras', () => {
  // MEDIDO en la app: 929 de 2.465 costuras de piel de la cabeza tenian
  // normales distintas a cada lado (hasta 88 grados), y con el cuello inclinado
  // la nariz salia partida por la luz. Dos teselas de juguete que se tocan en
  // x = 0, cada una con su normal: tras soldar, la misma direccion.
  function mitad(name: string, x0: number, x1: number, y0: number, normal: [number, number, number]) {
    const pos = [x0, y0, 0.1, x1, y0, 0.1, x0, y0 + 0.01, 0.1, x1, y0 + 0.01, 0.1];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const n: number[] = [];
    for (let i = 0; i < 4; i++) n.push(...normal);
    g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    g.setIndex([0, 1, 2, 1, 3, 2]);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
    m.name = name;
    return m;
  }
  const nOf = (m: THREE.Mesh, i: number) =>
    new THREE.Vector3().fromBufferAttribute(m.geometry.getAttribute('normal'), i);

  it('las copias de la costura acaban con la misma direccion', () => {
    const scene = new THREE.Scene();
    const izq = mitad('Nasal_region_1', -0.01, 0, 1.6, [-0.5, 0, 0.866]);
    const der = mitad('Nasal_region_3', 0, 0.01, 1.6, [0.5, 0, 0.866]);
    scene.add(izq, der);
    const r = weldHeadSkinNormals(scene, skin);
    expect(r.disagreeing).toBe(2); // los dos puntos de la costura
    expect(r.worstDeg).toBeGreaterThan(50);
    // Costura: vertice 1 y 3 de la izquierda (x = 0) con 0 y 2 de la derecha.
    for (const [a, b] of [[1, 0], [3, 2]] as const) {
      const na = nOf(izq, a);
      const nb = nOf(der, b);
      expect(na.angleTo(nb)).toBeLessThan(0.01);
      expect(na.z).toBeCloseTo(1, 3); // la media de las dos: de frente
    }
    // Lejos de la costura no se toca nada.
    expect(nOf(izq, 0).x).toBeCloseTo(-0.5, 3);
    expect(nOf(der, 1).x).toBeCloseTo(0.5, 3);
  });

  it('cada copia conserva su sentido (una tesela con la normal al reves sigue al reves)', () => {
    const scene = new THREE.Scene();
    const izq = mitad('Philtruml', -0.01, 0, 1.55, [-0.5, 0, 0.866]);
    const der = mitad('Philtrumr', 0, 0.01, 1.55, [-0.5, 0, -0.866]); // al reves
    scene.add(izq, der);
    weldHeadSkinNormals(scene, skin);
    const na = nOf(izq, 1);
    const nb = nOf(der, 0);
    expect(Math.abs(na.dot(nb))).toBeCloseTo(1, 3); // paralelas...
    expect(na.dot(nb)).toBeLessThan(0); // ...y la del reves sigue mirando hacia dentro
  });

  it('por debajo de la cabeza no actua', () => {
    const scene = new THREE.Scene();
    const izq = mitad('Pectoral_region_1', -0.01, 0, 1.2, [-0.5, 0, 0.866]);
    const der = mitad('Pectoral_region_3', 0, 0.01, 1.2, [0.5, 0, 0.866]);
    scene.add(izq, der);
    const r = weldHeadSkinNormals(scene, skin);
    expect(r.vertices).toBe(0);
    expect(nOf(izq, 1).x).toBeCloseTo(-0.5, 3);
  });

  it('RigModel y el banco lo llaman despues de cerrar la linea media', async () => {
    const { readFileSync } = await import('node:fs');
    for (const f of ['src/components/movement/RigModel.tsx', 'scripts/lib/rigPose.mts']) {
      const src = readFileSync(f, 'utf8');
      const cerrar = src.indexOf('closeSkinMidline(scene,');
      const soldar = src.indexOf('weldHeadSkinNormals(scene,');
      expect(cerrar, f).toBeGreaterThan(0);
      expect(soldar, f).toBeGreaterThan(cerrar);
    }
  });
});
