// LA TABLA DE PESOS HORNEADOS TIENE UN FORMATO, Y EL FORMATO SE ROMPE SOLO.
//
// `applyBakedSkinWeights` escribe pesos de skinning leyendo un bloque binario.
// Si alguien cambia el ancho del registro en el generador y no aqui --o al
// reves-- no falla nada: se escriben pesos a huesos equivocados y la piel se
// despega al mover el brazo. Estos tests fijan el contrato por los dos lados.
//
// La prueba de que la tabla REPRODUCE los pases no vive aqui, porque necesita el
// GLB de 19 MB: es `npm run audit-skin-weight-bake`, que compara 1.000.527
// vertices con los dos pases de verdad y exige diferencia < 1e-4 (medido:
// 1,85e-5, que es la ida y vuelta del u16).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { applyBakedSkinWeights, applyBakedTable } from '../rigSkinWeightBake';
import { SKIN_WEIGHT_BAKE } from '../../data/rigSkinWeightBake';

/** Dos huesos en una cadena, y una malla de piel con esqueleto. */
function escena(nombreMalla: string, huesos: string[]): THREE.Object3D {
  const root = new THREE.Object3D();
  const bones = huesos.map((n) => {
    const b = new THREE.Bone();
    b.name = n;
    root.add(b);
    return b;
  });
  const geom = new THREE.BufferGeometry();
  const n = 4;
  geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(n * 4), 4));
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Float32Array(n * 4), 4));
  const mesh = new THREE.SkinnedMesh(geom, new THREE.MeshStandardMaterial());
  mesh.name = nombreMalla;
  mesh.bind(new THREE.Skeleton(bones));
  root.add(mesh);
  root.updateMatrixWorld(true);
  return root;
}

describe('la tabla horneada', () => {
  it('no esta vacia: si lo esta, el arranque paga 3,4 s de mas', () => {
    expect(SKIN_WEIGHT_BAKE.length).toBeGreaterThan(200);
  });

  it('cada bloque mide un numero entero de registros de 15 B', () => {
    // u16 indice | u8 x4 paleta | u16 x4 peso | u8 banderas = 15 B.
    let vertices = 0;
    for (const fila of SKIN_WEIGHT_BAKE) {
      const bytes = Buffer.from(fila.d, 'base64');
      expect(bytes.byteLength % 15, fila.n).toBe(0);
      expect(fila.b.length, fila.n).toBeGreaterThan(0);
      expect(fila.b.length, fila.n).toBeLessThanOrEqual(256);
      vertices += bytes.byteLength / 15;
    }
    // El orden de magnitud importa: si un cambio en el generador dejara 50
    // vertices, la tabla "funcionaria" y no arreglaria nada.
    expect(vertices).toBeGreaterThan(5000);
    expect(vertices).toBeLessThan(40000);
  });

  it('toda ranura de paleta que usa un registro existe en su paleta', () => {
    for (const fila of SKIN_WEIGHT_BAKE) {
      const bytes = Buffer.from(fila.d, 'base64');
      for (let o = 0; o < bytes.byteLength; o += 15) {
        for (let k = 0; k < 4; k++) {
          expect(bytes[o + 2 + k], `${fila.n}@${o}`).toBeLessThan(fila.b.length);
        }
      }
    }
  });

  it('los pesos de cada registro suman 1 dentro del error del u16', () => {
    for (const fila of SKIN_WEIGHT_BAKE.slice(0, 40)) {
      const bytes = Buffer.from(fila.d, 'base64');
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let o = 0; o < bytes.byteLength; o += 15) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += dv.getUint16(o + 6 + k * 2, true) / 65535;
        expect(Math.abs(s - 1), `${fila.n}@${o}`).toBeLessThan(1e-3);
      }
    }
  });
});

describe('al aplicarla', () => {
  it('traduce la paleta a los indices DE ESA malla y normaliza a 1', () => {
    // Paleta ['B','A'] contra un esqueleto ['A','B']: si no tradujera, el peso
    // iria al hueso contrario y la piel seguiria al brazo equivocado.
    const buf = new Uint8Array(15);
    const dv = new DataView(buf.buffer);
    dv.setUint16(0, 2, true); // vertice 2
    buf[2] = 0; // 'B'
    buf[3] = 1; // 'A'
    buf[4] = 1;
    buf[5] = 1;
    dv.setUint16(6, 40000, true);
    dv.setUint16(8, 25535, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true);
    buf[14] = 1;

    const root = escena('Piel_prueba', ['A', 'B']);
    const mesh = root.getObjectByName('Piel_prueba') as THREE.SkinnedMesh;
    const informe = applyBakedTable(root, [
      { n: 'Piel_prueba', b: ['B', 'A'], d: Buffer.from(buf).toString('base64') },
    ]);
    expect(informe).not.toBeNull();
    expect(informe!.vertices).toBe(1);

    const si = mesh.geometry.getAttribute('skinIndex');
    const sw = mesh.geometry.getAttribute('skinWeight');
    expect(si.getComponent(2, 0)).toBe(1); // la ranura 0 era 'B' -> indice 1
    expect(si.getComponent(2, 1)).toBe(0); // la ranura 1 era 'A' -> indice 0
    expect(sw.getComponent(2, 0) + sw.getComponent(2, 1)).toBeCloseTo(1, 5);
    expect(sw.getComponent(2, 0)).toBeGreaterThan(sw.getComponent(2, 1));
    // Y la marca de costura, que `reweightArmAboveElbow` lee.
    expect((mesh.userData.seamSettled as Uint8Array)[2]).toBe(1);
    expect(mesh.userData.skinRootSpread).toBe(true);
  });

  it('con una escena que no es el rig devuelve null y deja correr los pases', () => {
    // Es la salvaguarda contra una tabla de otro GLB: mejor pagar los 3,4 s que
    // ensenar una piel mal pegada.
    const root = escena('No_existe_en_el_rig', ['A']);
    expect(applyBakedSkinWeights(root)).toBeNull();
  });
});

describe('como la montan los dos lados', () => {
  it('RigModel y el banco de render la aplican en el MISMO sitio', () => {
    // Si solo uno la usara, las hojas de revision medirian un rig que el usuario
    // no ve ([[render-harness-fidelity]]).
    const model = readFileSync('src/components/movement/RigModel.tsx', 'utf8');
    const pose = readFileSync('scripts/lib/rigPose.mts', 'utf8');
    for (const [que, src] of [
      ['RigModel', model],
      ['rigPose', pose],
    ] as const) {
      expect(src, que).toContain('if (!applyBakedSkinWeights(scene)) {');
      // Y los dos pases siguen ahi dentro, como respaldo.
      expect(src, que).toContain('redistributeSkinRootWeight(scene');
      expect(src, que).toContain('relaxSkinSeams(scene);');
    }
  });

  it('el gancho del horneado vive SOLO en el banco', () => {
    // `__anatrisBakeSnapshot` es como el generador lee los pesos en el instante
    // exacto. En el navegador no pinta nada y no debe viajar.
    const model = readFileSync('src/components/movement/RigModel.tsx', 'utf8');
    const pose = readFileSync('scripts/lib/rigPose.mts', 'utf8');
    expect(pose).toContain('__anatrisBakeSnapshot');
    expect(model).not.toContain('__anatrisBakeSnapshot');
  });
});
