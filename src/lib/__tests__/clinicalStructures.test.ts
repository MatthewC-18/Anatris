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
import { BONE_MAP } from '../boneMap';

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
      // 'bursa' entra desde que el panel tiene su interruptor; lo que sigue
      // fuera es lo que `layerForMaterial` deja en null (nervio, vaso, fascia).
      expect(['muscle', 'bone', 'connective', 'skin', 'bursa']).toContain(
        CLINICAL_STRUCTURES[id].layer,
      );
    }
  });
});

describe('la promesa de cada demo', () => {
  const demos = Object.entries(ALL_TESTS_BY_REGION).flatMap(([region, tests]) =>
    tests.filter((t) => t.demo).map((t) => ({ region, t })),
  );

  // CADA PRUEBA TIENE DEMO, O TIENE ESCRITO POR QUE NO.
  //
  // Esto era una cuenta --"al menos 64 demos"-- y la cuenta era lo peor que se
  // podia vigilar: al borrar ocho demostraciones que posaban la maniobra
  // equivocada, la prueba se puso roja por haber MEJORADO el contenido. Y al
  // mismo tiempo no detectaba el agujero de verdad: 24 pruebas sin demo y sin
  // una palabra de por que, que el alumno lee como "esto esta sin terminar".
  //
  // Asi que lo que se vigila es la disyuntiva: o el modelo lo ensena, o esta
  // dicho que no puede. Nunca las dos, nunca ninguna.
  it('toda prueba tiene demostración o la razón de no tenerla', () => {
    const todas = Object.entries(ALL_TESTS_BY_REGION).flatMap(([region, tests]) =>
      tests.map((t) => ({ region, t })),
    );
    expect(todas.length, 'el catálogo de pruebas se ha quedado vacío').toBeGreaterThan(60);
    const sinNada = todas
      .filter(({ t }) => !t.demo && !t.noDemo)
      .map(({ region, t }) => `${region}/${t.id}`);
    expect(
      sinNada,
      'estas pruebas no tienen demostración en 3D y tampoco dicen por qué: el hueco se lee como un error',
    ).toEqual([]);
    const ambas = todas
      .filter(({ t }) => t.demo && t.noDemo)
      .map(({ region, t }) => `${region}/${t.id}`);
    expect(ambas, 'estas pruebas dicen que no se pueden demostrar y traen demostración').toEqual(
      [],
    );
  });

  it('la razón de no tener demostración es una frase, no una palabra', () => {
    for (const [region, tests] of Object.entries(ALL_TESTS_BY_REGION)) {
      for (const t of tests) {
        if (t.noDemo == null) continue;
        expect(t.noDemo.length, `${region}/${t.id}`).toBeGreaterThan(40);
      }
    }
  });

  // LA MANO DEL EXPLORADOR SOLO SE PROMETE DONDE SALE.
  //
  // `examinerForce` hace dos cosas a la vez: cambia el texto de la ficha
  // ("prueba pasiva" / "prueba resistida") y promete literalmente que "en
  // Demostrar verás la mano del fisio". Pero `placeResistance` solo dibuja la
  // mano sobre un MIEMBRO --exige que el control sea `joint` o `chain`--, de
  // modo que declararlo en una prueba de raquis (Spurling, Lhermitte,
  // Sharp-Purser) imprimiria la promesa sin que salga ninguna mano. Que es
  // exactamente el defecto que todo este trabajo persigue.
  it('solo promete la mano del fisio donde el rig la dibuja', () => {
    const enRaquis: string[] = [];
    for (const { region, t } of demos) {
      if (!t.demo!.examinerForce) continue;
      const c = BONE_MAP[t.demo!.movementId] as { kind?: string } | undefined;
      if (c?.kind !== 'joint' && c?.kind !== 'chain') {
        enRaquis.push(`${region}/${t.id} (${t.demo!.movementId}: ${c?.kind ?? 'sin control'})`);
      }
    }
    expect(
      enRaquis,
      'declaran quién hace la fuerza sobre un movimiento donde no se dibuja ninguna mano',
    ).toEqual([]);
  });

  it('el panel ocupa el sitio del play con la razón', () => {
    const src = readFileSync('src/components/movement/OrthopedicTestsPanel.tsx', 'utf8');
    // El hueco del play lleva la razon, y ademas se lee en la ficha abierta.
    expect(src).toMatch(/!test\.demo && test\.noDemo/);
    expect(src.match(/!test\.demo && test\.noDemo/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    // Y el titulo del play no promete una maniobra cuando la fuerza es del
    // explorador y el rig solo coloca la posicion.
    expect(src).toMatch(/test\.demo\?\.examinerForce\s*\n?\s*\?/);
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
