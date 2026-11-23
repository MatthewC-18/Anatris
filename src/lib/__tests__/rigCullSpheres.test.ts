// LAS ESFERAS DE RECORTE SIGUEN A LA POSE (ver rigCullSpheres.ts).
//
// Un brazo de juguete: dos huesos en cadena y una tira de vertices repartida
// entre los dos, con mezcla en el codo. Se eleva el brazo y se dobla el codo en
// 24 combinaciones y se comprueba que la esfera puesta al dia envuelve TODOS los
// vertices con su piel aplicada (la cuenta de three, `applyBoneTransform`),
// mientras que la esfera de reposo, la que three se queda si nadie la toca,
// deja fuera la mano en cuanto el brazo sube.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { prepareCullSpheres, refreshCullSpheres } from '../rigCullSpheres';

function brazo(): { mesh: THREE.SkinnedMesh; hombro: THREE.Bone; codo: THREE.Bone; root: THREE.Group } {
  const hombro = new THREE.Bone();
  const codo = new THREE.Bone();
  codo.position.set(0, -0.3, 0);
  hombro.add(codo);
  const n = 31;
  const pos = new Float32Array(n * 3);
  const idx = new Uint16Array(n * 4);
  const w = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const y = -0.6 * (i / (n - 1));
    pos.set([0.02 * (i % 2), y, 0], i * 3);
    // Mezcla lineal alrededor del codo (y = -0.3), como una piel real.
    const t = Math.min(1, Math.max(0, (-y - 0.25) / 0.1));
    idx.set([0, 1, 0, 0], i * 4);
    w.set([1 - t, t, 0, 0], i * 4);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(w, 4));
  const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshBasicMaterial());
  const root = new THREE.Group();
  root.add(hombro);
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([hombro, codo]));
  return { mesh, hombro, codo, root };
}

function todosDentro(mesh: THREE.SkinnedMesh, s: THREE.Sphere): number {
  const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  let fuera = 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    mesh.applyBoneTransform(i, v);
    if (v.distanceTo(s.center) > s.radius + 1e-6) fuera++;
  }
  return fuera;
}

describe('esferas de recorte de las mallas con piel', () => {
  it('la esfera de reposo deja fuera lo que la pose mueve (el defecto)', () => {
    const { mesh, hombro, root } = brazo();
    mesh.computeBoundingSphere(); // lo que hace three en el primer render
    const reposo = mesh.boundingSphere!.clone();
    // El brazo entero se eleva 120 grados: la mano sale de la esfera de reposo.
    hombro.rotation.z = (120 * Math.PI) / 180;
    root.updateMatrixWorld(true);
    expect(todosDentro(mesh, reposo)).toBeGreaterThan(0);
  });

  it('puesta al dia envuelve todos los vertices posados, en varias poses', () => {
    const { mesh, hombro, codo, root } = brazo();
    const tabla = prepareCullSpheres(root);
    expect(tabla.meshes.length).toBe(1);
    expect(tabla.pairs).toBe(2);
    for (const h of [0, 45, 120, 170]) {
      for (const deg of [0, 30, 90, 120, 150, -60]) {
        hombro.rotation.z = (h * Math.PI) / 180;
        codo.rotation.z = (deg * Math.PI) / 180;
        root.updateMatrixWorld(true);
        refreshCullSpheres(tabla);
        expect(todosDentro(mesh, mesh.boundingSphere!), `hombro ${h}, codo ${deg}`).toBe(0);
      }
    }
  });

  it('en reposo no es mucho mayor que la exacta', () => {
    const { mesh, root } = brazo();
    const tabla = prepareCullSpheres(root);
    refreshCullSpheres(tabla);
    const unida = mesh.boundingSphere!.clone();
    mesh.boundingSphere = null;
    mesh.computeBoundingSphere();
    // Dibujar de mas cuesta poco; aun asi la union no se dispara.
    expect(unida.radius).toBeLessThan(mesh.boundingSphere!.radius * 1.3);
  });

  it('sin tabla no hace nada', () => {
    expect(() => refreshCullSpheres(null)).not.toThrow();
  });
});
