// LA TABLA DE GIROS: invierte lo que dice, solo si de verdad esta al reves.
//
// src/lib/rigWindingBake.ts guarda que triangulos del musculo y del hueso giran
// contra sus normales (4.661 en 615 mallas; buscarlos en la carga costaba
// 553 ms). `npm run audit-winding-bake` comprueba la tabla contra el GLB; este
// test fija el descodificador y la regla de seguridad (comprobar antes de
// invertir), y que RigModel la aplica en el punto de la cadena donde se hizo.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { applyBakedWinding, decodeTriangles, encodeTriangles } from '../rigWindingBake';
import { trianglesAgainst } from '../faceWinding';
import { sinkForearmFascia } from '../rigForearmFascia';

/** Una caja con giro y normales de acuerdo, y `flip` triangulos invertidos. */
function box(name: string, flip: number[] = []): THREE.Mesh {
  const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const idx: number[] = [];
  for (let i = 0; i < g.getAttribute('position').count; i++) idx.push(i);
  g.setIndex(idx);
  g.computeVertexNormals();
  const arr = g.getIndex()!.array as Uint16Array;
  for (const t of flip) {
    const x = arr[t * 3 + 1];
    arr[t * 3 + 1] = arr[t * 3 + 2];
    arr[t * 3 + 2] = x;
  }
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial());
  m.name = name;
  return m;
}

describe('la codificacion de la tabla', () => {
  it('ida y vuelta, sin importar el orden de entrada', () => {
    const tris = [905, 3, 17, 18, 40000, 1];
    expect(decodeTriangles(encodeTriangles(tris))).toEqual([...tris].sort((a, b) => a - b));
  });

  it('una lista vacia es una cadena vacia', () => {
    expect(encodeTriangles([])).toBe('');
    expect(decodeTriangles('')).toEqual([]);
  });
});

describe('aplicar la tabla', () => {
  it('invierte los triangulos listados que estan al reves', () => {
    const m = box('caja', [2, 7]);
    const scene = new THREE.Group();
    scene.add(m);
    expect(trianglesAgainst(m)).toEqual([2, 7]);
    const r = applyBakedWinding(scene, [{ n: 'caja', t: encodeTriangles([2, 7]) }]);
    expect(r).toMatchObject({ meshes: 1, flipped: 2, stale: 0, missing: [] });
    expect(trianglesAgainst(m)).toEqual([]);
  });

  it('una entrada que ya esta de acuerdo NO se toca: cuenta como vieja', () => {
    // Es la red de seguridad contra una tabla de otro GLB.
    const m = box('caja', [2]);
    const scene = new THREE.Group();
    scene.add(m);
    const r = applyBakedWinding(scene, [{ n: 'caja', t: encodeTriangles([2, 5, 999]) }]);
    expect(r.flipped).toBe(1);
    expect(r.stale).toBe(2); // el 5 estaba bien y el 999 no existe
    expect(trianglesAgainst(m)).toEqual([]);
  });

  it('es idempotente', () => {
    const m = box('caja', [4]);
    const scene = new THREE.Group();
    scene.add(m);
    const tabla = [{ n: 'caja', t: encodeTriangles([4]) }];
    applyBakedWinding(scene, tabla);
    const despues = Array.from(m.geometry.getIndex()!.array);
    const r = applyBakedWinding(scene, tabla);
    expect(r.flipped).toBe(0);
    expect(Array.from(m.geometry.getIndex()!.array)).toEqual(despues);
  });

  it('dice que mallas de la tabla no estan en la escena', () => {
    const r = applyBakedWinding(new THREE.Group(), [{ n: 'fantasma', t: '1' }]);
    expect(r.missing).toEqual(['fantasma']);
  });
});

describe('la fascia hundida no deja triangulos al reves', () => {
  it('aunque el hundido doble la superficie', () => {
    // Una esfera de 1 mm hundida 3 mm hacia dentro: cada vertice cruza el
    // centro y TODOS los triangulos quedan al reves. Es el caso extremo de lo
    // que le pasaba a la fascia antebraquial en las curvas cerradas (el 7%).
    const g = new THREE.SphereGeometry(0.001, 12, 8);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial());
    expect(trianglesAgainst(m)).toEqual([]);
    expect(sinkForearmFascia(m, 0.003)).toBe(true);
    expect(trianglesAgainst(m)).toEqual([]);
  });
});

describe('RigModel la aplica donde se horneo', () => {
  it('despues de repairFaceWinding y antes del recorte del antebrazo', () => {
    const src = readFileSync('src/components/movement/RigModel.tsx', 'utf8');
    const giro = src.indexOf('const winding = repairFaceWinding(scene);');
    const tabla = src.indexOf('const bakedWinding = applyBakedWinding(scene);');
    const recorte = src.indexOf('trimForearmOutliers(scene');
    const fascia = src.indexOf('sinkForearmFascia(mesh)');
    expect(giro).toBeGreaterThan(0);
    expect(tabla).toBeGreaterThan(giro);
    expect(tabla).toBeLessThan(recorte);
    expect(tabla).toBeLessThan(fascia);
  });

  it('y el constructor de la tabla prepara la escena con la misma cadena', () => {
    const banco = readFileSync('scripts/build-winding-bake.mts', 'utf8');
    const orden = ['applyMirrorRepair(scene)', 'unmangleForearmMeshes(scene)', 'repairFaceWinding(scene)'];
    const pos = orden.map((s) => banco.indexOf(s));
    expect(pos.every((p) => p > 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });
});
