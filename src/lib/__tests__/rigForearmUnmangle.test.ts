// EL ANTEBRAZO ENSENABA EL HUESO PELADO, Y LA CULPA ERA DE 34 MALLAS TUMBADAS.
//
// Cinco grupos de musculos superficiales del antebrazo venian del GLB del rig
// ATRAVESANDO el miembro en vez de recorrerlo: discos de 1,4-2,7 cm de largo y
// 11,8-14,9 cm de radio. El recorte medido los ocultaba, con razon, y el cuarto
// distal del antebrazo se quedaba con el 22-32% de su musculo en pantalla. Con
// el radio y el cubito dentro y la piel en modo fantasma, ahi solo se veia
// hueso pelado pegado a una mano opaca: el "la piel del brazo va hasta abajo y
// deja descubierto el hueso del antebrazo" que se reporto.
//
// El sitio bueno NO SE INVENTO: el GLB de Explorar -- el mismo modelo, sin
// riggear -- trae esas mismas mallas bien colocadas, y
// `npm run build-forearm-unmangle` mide el giro rigido que lleva una encima de
// la otra. Medido: el flexor profundo de los dedos pasa de 8,67 cm de su version
// sana a 0,10 cm. Tras el giro el antebrazo esta al 100% en toda su longitud
// (`npm run audit-forearm-fill`).
//
// Aqui no se puede cargar el GLB (son 50 MB y el entorno de pruebas es node),
// asi que se fija lo que SI es comprobable sin el: que la tabla existe, que
// cubre los dos brazos, que sus matrices son giros de verdad, y que el banco
// que la vigila sigue exigiendo un antebrazo lleno.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FOREARM_UNMANGLE } from '../../data/rigForearmUnmangle';

const NAMES = FOREARM_UNMANGLE.map(([n]) => n);

describe('las mallas tumbadas del antebrazo', () => {
  it('la tabla cubre los cinco grupos que estaban rotos', () => {
    for (const grupo of [
      'Extensor_digitorum',
      'Extensor_digiti_minimi',
      'Flexor_digitorum_profundus',
      'Flexor_pollicis_longus',
      'Palmaris_longus_muscle',
    ]) {
      expect(NAMES.some((n) => n.startsWith(grupo))).toBe(true);
    }
    expect(FOREARM_UNMANGLE.length).toBeGreaterThanOrEqual(30);
  });

  it('endereza LOS DOS brazos', () => {
    // Z-Anatomy marca la copia espejada con `001`. Un arreglo que solo coja un
    // brazo es el defecto clasico de este rig: mirando un lado parece perfecto
    // (ver la nota de `dominantBoneName`).
    const izq = NAMES.filter((n) => n.includes('001'));
    const der = NAMES.filter((n) => !n.includes('001'));
    expect(izq.length).toBe(der.length);
    for (const n of der) expect(NAMES).toContain(n.replace(/(_1)?$/, (m) => '001' + m));
  });

  it('cada fila es un giro de verdad, no una escala ni un aplastamiento', () => {
    // Si una matriz llevara escala, la malla cambiaria de tamano al enderezarla
    // y dejaria de encajar en el antebrazo.
    for (const [name, arr] of FOREARM_UNMANGLE) {
      expect(arr.length, name).toBe(16);
      const m = new THREE.Matrix4().fromArray(arr as number[]);
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      m.decompose(pos, quat, scale);
      expect(scale.x, `${name} escala x`).toBeCloseTo(1, 3);
      expect(scale.y, `${name} escala y`).toBeCloseTo(1, 3);
      expect(scale.z, `${name} escala z`).toBeCloseTo(1, 3);
      // Y mueve de verdad: una fila que no mueve nada no pintaba nada en la tabla.
      const ang = 2 * Math.acos(Math.min(1, Math.abs(quat.w)));
      expect((ang * 180) / Math.PI, `${name} giro`).toBeGreaterThan(5);
    }
  });

  it('el runtime la aplica antes del recorte, y el banco lo comparte', () => {
    const rig = readFileSync(
      resolve(__dirname, '../../components/movement/RigModel.tsx'),
      'utf8',
    );
    expect(rig).toMatch(/unmangleForearmMeshes\(scene\)/);
    // ANTES de engordar la piel y, sobre todo, antes de `trimForearmOutliers`:
    // si fuese despues, el recorte volveria a ocultarlas por atravesadas.
    expect(rig.indexOf('unmangleForearmMeshes(scene)')).toBeLessThan(
      rig.indexOf('inflateSkinShell(scene)'),
    );
    expect(rig.indexOf('unmangleForearmMeshes(scene)')).toBeLessThan(
      rig.indexOf('trimForearmOutliers('),
    );
    // Y el banco de render aplica lo mismo, o las hojas de revision ensenan un
    // antebrazo que la aplicacion no tiene (ver render-harness-fidelity).
    const harness = readFileSync(resolve(__dirname, '../../../scripts/lib/rigPose.mts'), 'utf8');
    expect(harness).toMatch(/unmangleForearmMeshes\(scene\)/);
  });

  it('el banco exige un antebrazo LLENO, no uno tapado', () => {
    // El parche anterior daba piel solida al tramo hueco. Esa era la tapadera;
    // el arreglo es que no haya hueco. Si alguien relaja este umbral, el
    // antebrazo puede volver a vaciarse sin que nada falle.
    const audit = readFileSync(
      resolve(__dirname, '../../../scripts/audit-forearm-fill.mts'),
      'utf8',
    );
    const m = audit.match(/const FULL_ENOUGH = ([\d.]+)/);
    expect(m, 'FULL_ENOUGH en audit-forearm-fill.mts').not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(0.9);
    // Y ya no queda rastro del parche.
    const trim = readFileSync(resolve(__dirname, '../rigLimbTrim.ts'), 'utf8');
    expect(trim).not.toMatch(/export function inForearmHollow/);
  });
});
