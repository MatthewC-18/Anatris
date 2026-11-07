// ¿SE ENCIENDE EL MUSCULO DEL QUE HABLA EL PANEL?
//
// El laboratorio pinta el brillo resolviendo cada `muscleId` contra los nombres
// de malla del rig (`buildMuscleResolution`). Si el id no esta en la lista de
// musculos con la que se construye ese mapa, `forMuscleMeshes` sale sin hacer
// nada: el panel anuncia "Motor principal / Vasto lateral 92%" y en la escena
// no se enciende NADA. Sin excepcion, sin aviso y sin hueco en la pantalla.
//
// Eso es justo lo que pasaba. RigOverlays tenia su propia copia del universo de
// musculos, `Object.values(MUSCLES_BY_REGION).flat()`, calculada una sola vez al
// cargar el modulo y sobre el registro ESTATICO -- que desde la division premium
// solo contiene el hombro. Medido en la app: 18 musculos, y los 13 de la rodilla
// fuera. Resultado: en rodilla, cadera, tobillo, codo y raquis el laboratorio no
// encendia un solo musculo.
//
// No se puede montar el componente aqui (el entorno de pruebas es node y no hay
// testing-library), asi que se fija lo que SI es comprobable: que el registro
// estatico no puede servir de universo, y que el laboratorio no vuelve a leerlo.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MUSCLES_BY_REGION } from '../../../data/musclesByRegion';
import { KNEE_ROM_LIST } from '../../../data/kneeRom';
import { HIP_ROM_LIST } from '../../../data/hipRom';
import { LUMBAR_ROM_LIST } from '../../../data/lumbarRom';

const FREE_IDS = new Set(Object.values(MUSCLES_BY_REGION).flat().map((m) => m.id));

describe('el universo de musculos del laboratorio', () => {
  it('el registro estatico NO alcanza: solo lleva el nivel gratuito', () => {
    // Si algun dia esto fallara porque el registro crece, seria porque una
    // region de pago volvio al paquete publico, que es la otra regresion que
    // este proyecto vigila (premiumContent.test.ts).
    expect(Object.keys(MUSCLES_BY_REGION)).toEqual(['shoulder']);
  });

  it('los movimientos de pago nombran musculos que el registro estatico no tiene', () => {
    // La prueba de que el defecto era real y no teorico: estos ids son los que
    // el panel rotula y el resolutor no conocia.
    const premiumCredits = [...KNEE_ROM_LIST, ...HIP_ROM_LIST, ...LUMBAR_ROM_LIST]
      .flatMap((mv) => mv.phases.flatMap((p) => p.muscles.map((m) => m.muscleId)));
    const missing = [...new Set(premiumCredits.filter((id) => !FREE_IDS.has(id)))];
    expect(missing.length).toBeGreaterThan(20);
    expect(missing).toContain('vastus-lateralis');
    expect(missing).toContain('gluteus-maximus');
  });

  it('RigOverlays no construye su universo con el registro estatico', () => {
    // El guardian de la regresion: si vuelve a aparecer ese import aqui, el
    // brillo vuelve a ser solo del hombro.
    const src = readFileSync(resolve(__dirname, '../RigOverlays.tsx'), 'utf8');
    expect(src).not.toMatch(/MUSCLES_BY_REGION/);
    expect(src).toMatch(/useAllMuscles/);
  });

  it('useAllMuscles suma las regiones premium ya descargadas', () => {
    const src = readFileSync(
      resolve(__dirname, '../../../hooks/useMuscleResolution.ts'),
      'utf8',
    );
    expect(src).toMatch(/export function useAllMuscles/);
    expect(src).toMatch(/allLoadedPremiumMuscles\(\)/);
  });
});
