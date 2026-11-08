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

import { readdirSync, readFileSync } from 'node:fs';
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

  it('NINGUN componente del laboratorio construye su universo con el registro estatico', () => {
    // El guardian de la regresion. Antes miraba SOLO RigOverlays.tsx, y por eso
    // no vio que RigModel.tsx tenia la misma copia para la DISECCION: el brillo
    // quedo arreglado y el clic siguio roto. Medido entonces sobre el GLB: ese
    // mapa resolvia 205 de las 744 mallas de musculo, y 92 de 113 musculos
    // abrian la ficha con el nombre crudo de Blender. Asi que el guardian ya no
    // nombra ficheros: barre la carpeta entera.
    const dir = resolve(__dirname, '..');
    const offenders: string[] = [];
    const users: string[] = [];
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.tsx') && !f.endsWith('.ts')) continue;
      const src = readFileSync(resolve(dir, f), 'utf8');
      // El import del REGISTRO, no la palabra (los comentarios la citan al
      // explicar el defecto) y no el fichero (`musclesForRomLookup`, del mismo
      // modulo, SI consulta el contenido premium descargado y es correcto).
      if (/^import\s*\{[^}]*\bMUSCLES_BY_REGION\b/m.test(src)) offenders.push(f);
      if (/buildMuscleResolution/.test(src)) users.push(f);
    }
    expect(offenders).toEqual([]);
    // Y el que SI resuelve musculos tiene que sacar la lista del hook, no de
    // una constante de modulo.
    expect(users.length).toBeGreaterThan(0);
    for (const f of users) {
      const src = readFileSync(resolve(dir, f), 'utf8');
      expect(src, `${f} resuelve musculos sin useAllMuscles`).toMatch(/useAllMuscles/);
    }
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
