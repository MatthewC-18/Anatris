// EL MUSCULO QUE SE QUEDABA ENCENDIDO PARA SIEMPRE.
//
// Reproduce la secuencia exacta que lo dejaba asi, con materiales de THREE de
// verdad: el musculo esta encendido por el brillo de activacion, el usuario lo
// pincha (resalte de seleccion), el arco avanza y el brillo se retira, y al
// final se deselecciona. Antes, el ultimo paso devolvia a la malla un material
// DESTRUIDO y el musculo se quedaba iluminado sin manera de apagarlo.

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { baseMaterialOf, cloneOverlayMaterial } from '../rigMaterialStack';

/** Lo que hace RigOverlays al encender un musculo. */
function glowOn(mesh: THREE.Mesh) {
  const src = mesh.material as THREE.Material;
  const clone = cloneOverlayMaterial(src);
  mesh.material = clone;
  return { original: baseMaterialOf(src), clone };
}

/** Lo que hace RigModel al seleccionar una estructura. */
function selectOn(mesh: THREE.Mesh) {
  const src = mesh.material as THREE.Material;
  const clone = cloneOverlayMaterial(src);
  mesh.material = clone;
  return { orig: baseMaterialOf(src), clone };
}

/** Retirada: solo devuelve el material si la malla aun lleva NUESTRO clon. */
function remove(mesh: THREE.Mesh, entry: { clone: THREE.Material }, back: THREE.Material) {
  if (mesh.material === entry.clone) mesh.material = back;
  entry.clone.dispose();
}

describe('los dos sistemas que visten la misma malla', () => {
  it('deseleccionar devuelve el material plano aunque el brillo se fuera antes', () => {
    const base = new THREE.MeshStandardMaterial({ name: 'Muscle' });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), base);

    const g = glowOn(mesh);              // 1. el musculo se enciende
    const s = selectOn(mesh);            // 2. el usuario lo pincha
    expect(s.orig).toBe(base);           //    guarda el PLANO, no el clon del brillo

    remove(mesh, g, g.original);         // 3. el arco avanza, el brillo se retira
    expect(mesh.material).toBe(s.clone); //    la malla sigue con el resalte

    remove(mesh, s, s.orig);             // 4. se deselecciona
    expect(mesh.material).toBe(base);    //    y vuelve al plano, vivo
  });

  it('y al reves: el brillo se retira al plano aunque la seleccion se fuera antes', () => {
    const base = new THREE.MeshStandardMaterial({ name: 'Muscle' });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), base);

    const s = selectOn(mesh);
    const g = glowOn(mesh);
    expect(g.original).toBe(base);

    remove(mesh, s, s.orig);
    expect(mesh.material).toBe(g.clone);

    remove(mesh, g, g.original);
    expect(mesh.material).toBe(base);
  });

  it('el clon no es el de base, y el de base de un material pelado es el mismo', () => {
    const base = new THREE.MeshStandardMaterial({ name: 'Muscle' });
    expect(baseMaterialOf(base)).toBe(base);
    const c1 = cloneOverlayMaterial(base);
    expect(c1).not.toBe(base);
    expect(baseMaterialOf(c1)).toBe(base);
    // Clon de clon: sigue apuntando al plano, no al intermedio.
    expect(baseMaterialOf(cloneOverlayMaterial(c1))).toBe(base);
  });
});
