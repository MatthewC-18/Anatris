// LA ULTIMA LETRA DEL NOMBRE NO SIEMPRE ES EL LADO.
//
// Z-Anatomy pega el lado al final del nombre: `.l` / `.r` se aplanan a una `l`
// o una `r` sueltas (`Teres_major_muscleol` = origen, lado izquierdo). El
// analizador recortaba esa letra siempre que la precediera un alfanumerico, y
// un monton de terminos anatomicos acaban legitimamente en l o en r.
//
// El caso que lo destapo: `Psoas_major` salia con base `Psoas_majo` y lado
// `right`, siendo una malla bilateral sin marcador ninguno. Consecuencias en
// el laboratorio de cadera: el psoas queda tageado en un lado que no existe,
// y sus otras tres mallas (`Psoas_major_1..3`, base `Psoas_major`) ya no
// comparten base con la primera, asi que "Diseccionar" se llevaba una y dejaba
// tres.
//
// El criterio NO se eligio a ojo. Un marcador de lado de verdad trae SIEMPRE
// su gemelo del otro lado; medido sobre los dos GLB del proyecto (6376 nombres
// unicos), de los 1234 nombres que acaban en l/r solo 71 no lo tienen, y de
// esos 71 los que llevan la letra dentro de la palabra son los que fija esta
// prueba. Aplicar la guardia cambia la clasificacion de 28 nombres, todos
// ciertos, y deja los otros 6348 como estaban.

import { describe, expect, it } from 'vitest';
import { parseMeshName, structureKey } from '../parseMeshName';

describe('parseMeshName: la letra final', () => {
  it('no se come la r de los terminos que acaban en r', () => {
    for (const n of ['Psoas_major', 'Femur', 'Vomer', 'Deep_part_of_masseter']) {
      const p = parseMeshName(n);
      expect(p.base, n).toBe(n);
      expect(p.side, n).toBe('center');
    }
  });

  it('no se come la l de los rotulos de orientacion ni del ojo', () => {
    for (const n of ['Proximal', 'Distal', 'Dorsal', 'Ventral', 'Palmar', 'Plantar', 'Radial', 'Corneal', 'Scleral', 'Central_canal']) {
      const p = parseMeshName(n);
      expect(p.base, n).toBe(n);
      expect(p.side, n).toBe('center');
    }
  });

  it('el psoas vuelve a ser UNA estructura: sus cuatro mallas comparten clave', () => {
    // Es lo que hace que "Diseccionar" se lleve el musculo entero y no una
    // cuarta parte. La clave, no la base: `structureKey` quita los `_N`.
    const keys = ['Psoas_major', 'Psoas_major_1', 'Psoas_major_2', 'Psoas_major_3'].map(structureKey);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe('Psoas_major');
  });

  it('sigue leyendo el lado donde SI es un marcador', () => {
    // La regresion que esta guardia no puede causar: los 1163 nombres con
    // marcador de verdad no se tocan.
    const cases: Array<[string, string, string]> = [
      ['Teres_major_musclel', 'Teres_major_muscle', 'left'],
      ['Teres_major_muscler', 'Teres_major_muscle', 'right'],
      ['Teres_major_muscleol', 'Teres_major_muscle', 'left'],
      ['Pectoralis_major_muscleer', 'Pectoralis_major_muscle', 'right'],
      ['Sternocostal_head_of_pectoralis_major_musclee2l', 'Sternocostal_head_of_pectoralis_major_muscle', 'left'],
      ['Ulnopisiform_ligamentl', 'Ulnopisiform_ligament', 'left'],
      ['Iliocostalis_colli_muscler', 'Iliocostalis_colli_muscle', 'right'],
      ['(Abdominal_part_of_pectoralis_major_muscle)or', '(Abdominal_part_of_pectoralis_major_muscle)', 'right'],
    ];
    for (const [name, base, side] of cases) {
      const p = parseMeshName(name);
      expect(p.base, name).toBe(base);
      expect(p.side, name).toBe(side);
    }
  });

  it('la guardia exige frontera de palabra: no muerde un termino que solo la CONTIENE', () => {
    // `Radial_...` empieza por un termino de la lista; el marcador final sigue
    // valiendo. Si la guardia no anclase, este nombre perderia su lado.
    const p = parseMeshName('Radial_collateral_ligament_of_wrist_jointr');
    expect(p.side).toBe('right');
    expect(p.base).toBe('Radial_collateral_ligament_of_wrist_joint');
  });
});
