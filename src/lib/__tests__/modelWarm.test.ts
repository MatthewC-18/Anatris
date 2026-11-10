// Qué modelo se adelanta en cada ruta. Equivocarse aquí no da un error: da
// 9 MB descargados para nada (o los dos segundos de espera de vuelta), y en
// ninguno de los dos casos se nota mirando la aplicación.
//
// Los slugs ya cambiaron una vez (`/estudiar` -> `/repasar`), que es justo lo
// que rompería una segunda tabla de slugs escrita a mano aquí.

import { describe, expect, it } from 'vitest';
import { ATLAS_URL, RIG_URL, gzUrl, modelForMode, modelForPath } from '../modelWarm';

describe('modelWarm', () => {
  it('adelanta el rig sólo en el laboratorio de movimiento', () => {
    expect(modelForPath('/hombro/movimiento')).toBe(RIG_URL);
    expect(modelForPath('/rodilla/movimiento')).toBe(RIG_URL);
    expect(modelForPath('/HOMBRO/Movimiento')).toBe(RIG_URL);
  });

  it('adelanta el atlas en Explorar y Aprender', () => {
    expect(modelForPath('/hombro/explorar')).toBe(ATLAS_URL);
    expect(modelForPath('/cervical/aprender')).toBe(ATLAS_URL);
    // Enlace corto: cae en el modo por defecto, que lleva 3D.
    expect(modelForPath('/hombro')).toBe(ATLAS_URL);
  });

  it('no adelanta nada donde no hay 3D', () => {
    expect(modelForPath('/hombro/repasar')).toBeNull();
    expect(modelForPath('/hombro/estudiar')).toBeNull(); // slug viejo, mismo modo
    expect(modelForPath('/')).toBeNull(); // portada
    expect(modelForPath('/precios')).toBeNull();
  });

  it('mapea el modo directamente, que es como lo llama App', () => {
    expect(modelForMode('movement')).toBe(RIG_URL);
    expect(modelForMode('explore')).toBe(ATLAS_URL);
    expect(modelForMode('learn')).toBe(ATLAS_URL);
    expect(modelForMode('study')).toBeNull();
  });

  it('pone el .gz en la ruta y no en la query', () => {
    expect(gzUrl(RIG_URL)).toBe('/cuerpo-rig.opt.glb.gz?v=8');
    expect(gzUrl(ATLAS_URL)).toBe('/modelo-opt.dec.glb.gz');
  });
});
