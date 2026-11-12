// One hand and one foot rendered dark brown beside their light-skinned twins,
// with the same material instance, the same colour and non-zero normals. The
// difference was the winding: Z-Anatomy mirrors half the body, a mirror reverses
// triangle order, and a DoubleSide material shades a back-facing fragment with
// the NEGATED normal -- so on that half the surface was lit from the inside.
//
// Measured on the shipped rig before the pass: 0% of the x>0 skin and cap
// triangles wound with their own normals, against 100% on x<0.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { agreeTriangleWinding, repairFaceWinding } from '../faceWinding';

/** A closed box whose winding and normals agree. */
function goodMesh(name: string): THREE.Mesh {
  const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const idx: number[] = [];
  for (let i = 0; i < g.getAttribute('position').count; i++) idx.push(i);
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial());
  m.name = name;
  return m;
}

/** The same box with every triangle wound the other way -- the mirrored half. */
function reversedMesh(name: string): THREE.Mesh {
  const m = goodMesh(name);
  const arr = m.geometry.getIndex()!.array as ArrayLike<number> & { [i: number]: number };
  for (let i = 0; i + 2 < arr.length; i += 3) {
    const t = arr[i + 1];
    arr[i + 1] = arr[i + 2];
    arr[i + 2] = t;
  }
  return m;
}

/** Fraction of triangles whose winding agrees with the normal at their first vertex. */
function agreement(mesh: THREE.Mesh): number {
  const pos = mesh.geometry.getAttribute('position');
  const nor = mesh.geometry.getAttribute('normal');
  const idx = mesh.geometry.getIndex()!;
  const a = new THREE.Vector3();
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();
  const f = new THREE.Vector3();
  const n = new THREE.Vector3();
  let ok = 0;
  let total = 0;
  for (let t = 0; t < idx.count / 3; t++) {
    a.fromBufferAttribute(pos, idx.getX(t * 3));
    u.fromBufferAttribute(pos, idx.getX(t * 3 + 1)).sub(a);
    v.fromBufferAttribute(pos, idx.getX(t * 3 + 2)).sub(a);
    f.crossVectors(u, v);
    n.fromBufferAttribute(nor, idx.getX(t * 3));
    if (f.dot(n) > 0) ok++;
    total++;
  }
  return ok / total;
}

describe('face winding repair', () => {
  it('reverses a mesh wound against its normals and leaves a good one alone', () => {
    const root = new THREE.Group();
    const good = goodMesh('good');
    const bad = reversedMesh('bad');
    root.add(good, bad);

    expect(agreement(good)).toBe(1);
    expect(agreement(bad)).toBe(0);

    const r = repairFaceWinding(root);
    expect(r.flipped).toBe(1);
    expect(r.left).toBe(1);
    expect(agreement(bad), 'the mirrored mesh now winds with its normals').toBe(1);
    expect(agreement(good), 'the good mesh is untouched').toBe(1);
  });

  it('does not move a single vertex', () => {
    const bad = reversedMesh('bad');
    const before = Array.from(bad.geometry.getAttribute('position').array);
    const root = new THREE.Group().add(bad);
    repairFaceWinding(root);
    expect(Array.from(bad.geometry.getAttribute('position').array)).toEqual(before);
  });

  it('is idempotent -- a second pass finds nothing to do', () => {
    const root = new THREE.Group().add(reversedMesh('bad'));
    expect(repairFaceWinding(root).flipped).toBe(1);
    expect(repairFaceWinding(root).flipped).toBe(0);
  });

  it('flips SHARED geometry once, not once per mesh', () => {
    // The rig dedups: two meshes can point at one BufferGeometry. Flipping the
    // same index buffer twice would put it straight back.
    const a = reversedMesh('twin-a');
    const b = new THREE.Mesh(a.geometry, a.material);
    b.name = 'twin-b';
    const root = new THREE.Group().add(a, b);
    const r = repairFaceWinding(root);
    expect(r.flipped).toBe(1);
    expect(agreement(a)).toBe(1);
  });

  it('leaves a mesh alone when its triangles do not agree with each other', () => {
    // Open sheets (insertion patches, fasciae) have no meaningful inside. Only a
    // mesh that is decisively reversed is touched; a mixed one is left as it is.
    const mixed = goodMesh('mixed');
    const arr = mixed.geometry.getIndex()!.array as unknown as number[];
    for (let i = 0; i + 2 < arr.length / 2; i += 3) {
      const t = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = t;
    }
    const root = new THREE.Group().add(mixed);
    const r = repairFaceWinding(root);
    expect(r.flipped).toBe(0);
    expect(r.left).toBe(1);
  });
});

// POR TRIANGULO. Dentro de una malla tambien hay triangulos sueltos que giran
// contra sus normales, y con DoubleSide salen negros desde los dos lados: la
// oreja "rota" del laboratorio (54 de 68 en `Antihelixl`, 35 de 37 en
// `Posterior_auricular_groovel`; 691 de 27.918 triangulos de piel en total).
describe('agreeTriangleWinding: triangulos sueltos', () => {
  /** Un cubo con SOLO algunos triangulos invertidos. */
  function mixed(flip: number[]): THREE.Mesh {
    const m = goodMesh('mezcla');
    const arr = m.geometry.getIndex()!.array as ArrayLike<number> & { [i: number]: number };
    for (const t of flip) {
      const i = t * 3;
      const x = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = x;
    }
    return m;
  }

  it('invierte solo los que van contra sus normales', () => {
    const m = mixed([0, 5, 7]);
    expect(agreement(m)).toBeLessThan(1);
    expect(agreeTriangleWinding(m)).toBe(3);
    expect(agreement(m)).toBe(1);
  });

  it('una malla ya de acuerdo no se toca', () => {
    const m = goodMesh('bien');
    const antes = Array.from(m.geometry.getIndex()!.array);
    expect(agreeTriangleWinding(m)).toBe(0);
    expect(Array.from(m.geometry.getIndex()!.array)).toEqual(antes);
  });

  it('es idempotente: la segunda pasada no deshace la primera', () => {
    // Importa con geometria compartida por dos mallas: se pasa dos veces.
    const m = mixed([1, 2]);
    agreeTriangleWinding(m);
    const despues = Array.from(m.geometry.getIndex()!.array);
    expect(agreeTriangleWinding(m)).toBe(0);
    expect(Array.from(m.geometry.getIndex()!.array)).toEqual(despues);
  });

  it('no mueve ni un vertice: solo el orden de dos indices', () => {
    const m = mixed([3]);
    const antes = Array.from(m.geometry.getAttribute('position').array);
    agreeTriangleWinding(m);
    expect(Array.from(m.geometry.getAttribute('position').array)).toEqual(antes);
  });

  it('marca el indice para volver a subirlo a la GPU', () => {
    const m = mixed([4]);
    const v0 = m.geometry.getIndex()!.version;
    agreeTriangleWinding(m);
    expect(m.geometry.getIndex()!.version).toBeGreaterThan(v0);
  });
});

describe('RigModel: la cabeza solida escribe profundidad', () => {
  // La muesca negra de la coronilla en el laboratorio cervical: con el cuello en
  // cristal la piel deja de escribir profundidad, y la cara INTERNA de la frente
  // se pintaba encima de la parietal (rayo medido: Parietal_region_3 de cara,
  // Frontal_region_3 por detras, 4 cm mas alla). 128 pixeles oscuros -> 0.
  it('las teselas siempre solidas llevan su material, con depthWrite fijo', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/components/movement/RigModel.tsx', 'utf8');
    expect(src).toContain('headSkinMat.depthWrite = true;');
    expect(src).toContain('headSkinMat.onBeforeCompile = bodySkinMat.onBeforeCompile;');
    expect(src).toContain('skinAlwaysSolid(mesh) ? headSkinMat : bodySkinMat');
    // El fundido a cristal solo mueve el material del cuerpo; al remontar no
    // puede recoger el de la cabeza como si fuera el del cuerpo.
    expect(src).toContain("userData?.headSkin !== true");
  });

  it('la subida de la nuca en JS es la misma cuenta que en el shader', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/components/movement/RigModel.tsx', 'utf8');
    expect(src).toContain(
      "'float napeLift = uNapeLift * (1.0 - smoothstep(uNapeZ0, uNapeZ1, vAnatZ));'",
    );
    expect(src).toContain('return NAPE_LIFT * (1 - t * t * (3 - 2 * t));');
    expect(src).toContain("'float headSolid = smoothstep(uHeadY0 + napeLift, uHeadY1 + napeLift, vAnatY);'");
    expect(src).toContain('if (wy < HEAD_SOLID_Y1 + napeLiftAt(wz)) return false;');
  });

  it('y la piel pasa por el giro por triangulo antes de recibir su material', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/components/movement/RigModel.tsx', 'utf8');
    expect(src).toMatch(/windingTris \+= agreeTriangleWinding\(mesh\);\s+swap\(mesh, skinAlwaysSolid/);
    expect(src).toMatch(/windingTris \+= agreeTriangleWinding\(mesh\);\s+swap\(mesh, skinMat\)/);
  });
});
