// UNA PRUEBA PUEDE VIVIR EN EL PANEL DE UNA REGIÓN Y MOVER OTRA PARTE DEL CUERPO.
//
// El test de tensión neural del miembro superior está en la lista CERVICAL y lo
// que mueve es el brazo; el del nervio femoral está en la LUMBAR y mueve la
// rodilla y la cadera. El encuadre del laboratorio es por región, así que ese
// segmento se quedaba fuera de pantalla: medido en el navegador, durante el
// ULNT la mano caía a y = −1,65 en coordenadas normalizadas (el borde es 1), de
// modo que el botón parecía no hacer nada porque lo que hacía no se veía.
//
// `extraFrameBonesFor` es lo que amplía la caja. Esto vigila las dos mitades de
// la regla: que amplíe cuando el demo se sale de su región, y que NO amplíe
// cuando no hace falta (reencuadrar de más mueve la cámara en cada empuje de la
// consola y marea).
import { describe, expect, it } from 'vitest';
import { extraFrameBonesFor, regionFrameBones } from '../labFraming';
import { ALL_TESTS_BY_REGION } from '../../data/fullContent';

describe('el encuadre de un demo fuera de su región', () => {
  it('amplía con el brazo cuando una prueba cervical mueve el brazo', () => {
    const extra = extraFrameBonesFor('cervical', 'glenohumeral-abduction', [
      { movementId: 'elbow-extension' },
      { movementId: 'wrist-extension' },
    ]);
    expect(extra).toContain('hand_flex');
    expect(extra).toContain('humerus_gh');
  });

  it('amplía con la pierna cuando una prueba lumbar mueve rodilla y cadera', () => {
    const extra = extraFrameBonesFor('lumbar', 'knee-flexion', [{ movementId: 'hip-extension' }]);
    expect(extra).toContain('shin_flex');
    expect(extra).toContain('femur_base');
  });

  it('no amplía cuando la región ya contiene el segmento', () => {
    expect(extraFrameBonesFor('shoulder', 'glenohumeral-abduction')).toEqual([]);
    expect(extraFrameBonesFor('knee', 'knee-flexion')).toEqual([]);
    expect(extraFrameBonesFor('ankle', 'ankle-inversion')).toEqual([]);
  });

  it('no amplía con un movimiento de raquis: la región ya trae sus vértebras', () => {
    expect(extraFrameBonesFor('cervical', 'cervical-rotation')).toEqual([]);
    expect(extraFrameBonesFor('lumbar', 'lumbar-flexion')).toEqual([]);
  });

  it('no amplía sin región ni sin movimiento', () => {
    expect(extraFrameBonesFor(null, 'glenohumeral-abduction')).toEqual([]);
    expect(extraFrameBonesFor('cervical', null)).toEqual([]);
  });

  // La lista, a la vista: si un demo nuevo se sale de su región, aparece aquí.
  // No es una restriccion, es un inventario -- lo que no puede pasar es que se
  // salga SIN que nadie amplie la caja, y de eso se encarga el mecanismo.
  //
  // Los seis de hoy, y por qué cada uno se sale:
  //  - cervical/ulnt-median: vive en el panel cervical y mueve el BRAZO.
  //  - lumbar/slr-lasegue y lumbar/crossed-slr: flexión de cadera a 60° con la
  //    rodilla extendida; el encuadre lumbar llega al sacro, no a la pierna.
  //  - lumbar/femoral-nerve-stretch: flexión de rodilla en prono.
  //  - thoracic/roos-east y thoracic/wright-hyperabduction: las dos pruebas del
  //    desfiladero torácico se posan con el BRAZO en alto, y el encuadre
  //    torácico son vértebras.
  it('estos son los demos que hoy necesitan ampliar el encuadre', () => {
    const fuera: string[] = [];
    for (const [region, tests] of Object.entries(ALL_TESTS_BY_REGION)) {
      if (!regionFrameBones(region)) continue;
      for (const t of tests) {
        const d = t.demo;
        if (!d) continue;
        const extra = extraFrameBonesFor(region, d.movementId, d.components ?? []);
        if (extra.length) fuera.push(`${region}/${t.id}`);
      }
    }
    expect(fuera.sort()).toEqual([
      'cervical/ulnt-median',
      'lumbar/crossed-slr',
      'lumbar/femoral-nerve-stretch',
      'lumbar/slr-lasegue',
      'thoracic/roos-east',
      'thoracic/wright-hyperabduction',
    ]);
  });

  // Y SE AMPLIA LO JUSTO: el tobillo no arrastra el fémur.
  //
  // El primer mecanismo añadía el miembro entero del grupo tocado, así que una
  // inversión de tobillo pedía meter fémur y rótula en la caja y la cámara se
  // alejaba de lo único que se mira. La regla medida es: el hueso que gira y lo
  // que cuelga de él.
  it('amplía solo del hueso movido hacia distal', () => {
    // Rodilla dentro de la lumbar: tibia y pie, nunca el fémur.
    const rodilla = extraFrameBonesFor('lumbar', 'knee-flexion');
    expect(rodilla).toEqual(['foot_flex', 'shin_flex']);
    // Cadera dentro de la lumbar: ahí sí entra la pierna entera.
    const cadera = extraFrameBonesFor('lumbar', 'hip-flexion');
    expect(cadera).toEqual(['femur_base', 'foot_flex', 'patella', 'shin_flex']);
    // Tobillo dentro de la rodilla: solo el pie.
    expect(extraFrameBonesFor('knee', 'ankle-dorsiflexion')).toEqual([]);
    // Codo dentro del hombro: ya contenido.
    expect(extraFrameBonesFor('shoulder', 'elbow-flexion')).toEqual([]);
    // Codo dentro de la cervical: antebrazo y mano, no la clavícula.
    expect(extraFrameBonesFor('cervical', 'elbow-flexion')).toEqual([
      'forearm_flex',
      'forearm_rot',
      'hand_flex',
    ]);
  });
});
