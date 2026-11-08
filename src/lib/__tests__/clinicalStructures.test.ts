// EL CONTRATO DEL RESALTE: lo que se puede encender se nombra, y lo que no se
// puede se dice.
//
// La ayuda del panel promete que al pulsar Demostrar el modelo "resalta la
// estructura evaluada". Medido: 42 de los 64 demos no encendían nada, porque el
// único resalte que existía resuelve MÚSCULOS y estas pruebas valoran
// ligamentos, meniscos, cápsulas, tendones y nervios.
//
// `npm run audit-structures` mide el registro contra el GLB, que es la medida
// que manda; pero el GLB tarda y no está en CI, así que lo que se puede vigilar
// sin él se vigila aquí: que el contrato se cumpla para los 64 demos, que
// ningún patrón se ensanche hasta pisar el homónimo de otra región, y que las
// dos piezas de runtime que hacen visible la estructura sigan en su sitio.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CLINICAL_STRUCTURES,
  meshIsStructure,
  structureLabel,
} from '../clinicalStructures';
import { ALL_TESTS_BY_REGION } from '../../data/fullContent';

const ids = Object.keys(CLINICAL_STRUCTURES);

describe('el registro de estructuras clínicas', () => {
  it('tiene patrones anclados y una cifra de mallas que medir', () => {
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const s = CLINICAL_STRUCTURES[id];
      expect(s.include.length, id).toBeGreaterThan(0);
      expect(s.expectMeshes, id).toBeGreaterThan(0);
      expect(s.label.length, id).toBeGreaterThan(3);
      for (const rx of s.include) {
        // Sin anclar, 'collateral_ligament' casa en rodilla, codo, muñeca y
        // tobillo a la vez y una prueba de codo enciende el pie.
        expect(rx.source.startsWith('^'), `${id}: ${rx.source} sin anclar`).toBe(true);
      }
    }
  });

  // Los dos homónimos que de verdad están en el GLB, uno en el codo (y=1,09) y
  // otro en la muñeca (y=0,85), con el MISMO nombre base.
  it('separa el colateral del codo del de la muñeca', () => {
    expect(meshIsStructure('elbow-ucl', 'Ulnar_collateral_ligamentr')).toBe(true);
    expect(meshIsStructure('elbow-ucl', 'Ulnar_collateral_ligamentl')).toBe(true);
    expect(meshIsStructure('elbow-ucl', 'Ulnar_collateral_ligament_of_wrist_jointr')).toBe(false);
    expect(meshIsStructure('elbow-rcl', 'Radial_collateral_ligamentl')).toBe(true);
    expect(meshIsStructure('elbow-rcl', 'Radial_collateral_ligament_of_wrist_jointr')).toBe(false);
  });

  it('no mete el menisco lateral en el medial (el rig no lo tiene)', () => {
    expect(meshIsStructure('knee-medial-meniscus', 'Medial_meniscusr')).toBe(true);
    expect(meshIsStructure('knee-medial-meniscus', 'Lateral_meniscusr')).toBe(false);
  });

  it('coge el tendón del bíceps y no su vientre', () => {
    // _1 y _3 son el tendón (material 'Tendon'); _2 es el vientre derecho.
    expect(meshIsStructure('biceps-long-head-tendon', 'Long_head_of_biceps_brachii_1')).toBe(true);
    expect(meshIsStructure('biceps-long-head-tendon', 'Long_head_of_biceps_brachii_3')).toBe(true);
    expect(meshIsStructure('biceps-long-head-tendon', 'Long_head_of_biceps_brachii_2')).toBe(false);
    expect(meshIsStructure('biceps-long-head-tendon', 'Long_head_of_biceps_brachii')).toBe(false);
  });

  it('no encienda nada en una capa que el laboratorio no muestra', () => {
    for (const id of ids) {
      expect(['muscle', 'bone', 'connective', 'skin']).toContain(CLINICAL_STRUCTURES[id].layer);
    }
  });
});

describe('la promesa de cada demo', () => {
  const demos = Object.entries(ALL_TESTS_BY_REGION).flatMap(([region, tests]) =>
    tests.filter((t) => t.demo).map((t) => ({ region, t })),
  );

  it('cubre los demos de las ocho regiones', () => {
    expect(demos.length).toBeGreaterThanOrEqual(64);
  });

  it('o resalta algo, o dice por qué no puede', () => {
    const mudos = demos.filter(({ t }) => {
      const d = t.demo!;
      const resalta = (d.highlightStructureIds ?? []).length > 0 || d.highlightMuscleId != null;
      return !resalta && !d.cannotShow;
    });
    expect(
      mudos.map(({ region, t }) => `${region}/${t.id} (${t.target})`),
      'estos demos prometen resaltar la estructura evaluada y no encienden nada ni lo explican',
    ).toEqual([]);
  });

  it('no cita una estructura que no esté en el registro', () => {
    for (const { region, t } of demos) {
      for (const sid of t.demo!.highlightStructureIds ?? []) {
        expect(CLINICAL_STRUCTURES[sid], `${region}/${t.id}: '${sid}'`).toBeDefined();
        expect(structureLabel(sid)).toBeTruthy();
      }
    }
  });

  it('explica con una frase, no con una palabra', () => {
    for (const { region, t } of demos) {
      const c = t.demo!.cannotShow;
      if (c == null) continue;
      expect(c.length, `${region}/${t.id}`).toBeGreaterThan(40);
    }
  });
});

describe('el runtime que hace visible la estructura', () => {
  // El panel de capas arranca con el conectivo APAGADO, y `applyLayers`
  // reescribe `.visible` en cada cambio de capa o de diseccion. Sin estas dos
  // piezas, encender un ligamento no se ve: la malla sigue invisible.
  it('RigModel respeta la marca del demo al aplicar capas', () => {
    const src = readFileSync('src/components/movement/RigModel.tsx', 'utf8');
    expect(src).toMatch(/userData\.demoStructure/);
    expect(src).toMatch(/structures\?:\s*string\[\]/);
  });

  it('RigOverlays fuerza la visibilidad y la devuelve al salir', () => {
    const src = readFileSync('src/components/movement/RigOverlays.tsx', 'utf8');
    expect(src).toMatch(/forcedVisibleRef/);
    expect(src).toMatch(/mesh\.userData\.demoStructure = true/);
    expect(src).toMatch(/delete mesh\.userData\.demoStructure/);
    // Y el lado se decide por geometría, como en todo el laboratorio.
    expect(src).toMatch(/sideOfMesh/);
  });

  it('el panel manda las estructuras al rig y las nombra', () => {
    const src = readFileSync('src/components/movement/OrthopedicTestsPanel.tsx', 'utf8');
    expect(src).toMatch(/structures: d\.highlightStructureIds/);
    expect(src).toMatch(/structureLabels/);
    expect(src).toMatch(/cannotShow/);
  });
});
