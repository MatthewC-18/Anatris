// EL TONO DEL PAPEL NO PUEDE VOLVER A LA CARNE.
//
// EL DEFECTO, MEDIDO EN PANTALLA: el laboratorio señalaba el papel de un músculo
// (motor / freno excéntrico / asistente / estabilizador) poniendo el color del
// papel en el EMISIVO, y el emisivo es aditivo: no lo atenúa ninguna luz. En
// lineal, el teal del freno (0x2dd4bf) a intensidad 0,68 tiene el canal verde
// 10,2 veces por encima del techo iluminado del rojo del músculo. Compuesto
// salía #8ed0c4, hue 170: VERDE MENTA. En el plano estrella del hombro el
// pectoral salía verde y el contralateral rojo.
//
// Bajar la mezcla no servía --ya se había bajado dos veces-- porque el problema
// era la TONALIDAD, no la cantidad. Así que el vientre lleva la brasa (su propio
// rojo, calentado) y el papel se fue al contorno de Fresnel, a la leyenda del
// panel y al texto.
//
// Este test mide EXACTAMENTE eso: que para cualquier rojo de tejido del modelo,
// el emisivo que se le escribe se quede dentro de la banda del tejido. Si
// alguien vuelve a escribir un tono de papel en `color` o en `emissive`, aquí
// falla.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { EMBER, EMBER_MIX, attachRim, paintEmber, setRim } from '../rigRim';
import { ROLE_TONE, ROLE_TONE_CSS, ROLE_ORDER } from '../romRolePalette';

/**
 * Tono (0-360) de un THREE.Color EN sRGB, que es el espacio en el que se ve.
 *
 * `getHSL` sin más devuelve el tono en espacio LINEAL, y ahí los números no se
 * parecen a lo que se mide en la pantalla: la brasa 0xff6a2a da 18° en sRGB y
 * 7° en lineal. Si este test se escribe en lineal, sus umbrales dejan de
 * significar lo que un ojo llamaría "rojo".
 */
function hueOf(c: THREE.Color): number {
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl, THREE.SRGBColorSpace);
  return Math.round(hsl.h * 360);
}

/**
 * Rojos de tejido REALES del modelo preparado. Salen del jitter de tono que
 * reparte ±13° para que 357 materiales de músculo se distingan del vecino, así
 * que la banda de entrada no es un solo rojo: es un abanico.
 */
const TISSUE_REDS = [0xc23b3b, 0xc8455f, 0xc94961, 0xc65a3f, 0xba3745, 0xa23130, 0xc04739];

describe('la brasa del músculo activo', () => {
  it('deja el emisivo dentro de la banda del tejido para cualquier rojo del modelo', () => {
    const out: string[] = [];
    for (const hex of TISSUE_REDS) {
      const base = new THREE.Color(hex);
      const mat = new THREE.MeshStandardMaterial();
      paintEmber(mat, base, 1);
      const h = hueOf(mat.emissive);
      // 0-30 grados: rojo a naranja quemado. Fuera de ahí ya no es tejido.
      if (h > 30 && h < 330) out.push(`#${hex.toString(16)} -> emisivo hue ${h}`);
    }
    expect(out).toEqual([]);
  });

  it('no toca el difuso: el tejido conserva el color que lo identifica', () => {
    const base = new THREE.Color(0xc8455f);
    const mat = new THREE.MeshStandardMaterial();
    paintEmber(mat, base, 0.8);
    expect(mat.color.getHex()).toBe(base.getHex());
    expect(mat.emissiveIntensity).toBeCloseTo(0.8, 5);
  });

  it('la brasa SUBE la luminancia, que es el canal libre', () => {
    // "Encendido" se lee por luminancia porque el tono ya está ocupado por "qué
    // tejido es esto". Si el emisivo no aportara luminancia, el resalte no se
    // vería y volveríamos a necesitar el tono.
    const base = new THREE.Color(0xc23b3b);
    const mat = new THREE.MeshStandardMaterial();
    paintEmber(mat, base, 1);
    const lum = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    expect(lum(mat.emissive)).toBeGreaterThan(lum(base) * 0.9);
    expect(EMBER_MIX).toBeGreaterThan(0.2);
    expect(hueOf(EMBER)).toBeGreaterThan(10);
    expect(hueOf(EMBER)).toBeLessThan(30);
  });
});

describe('el contorno de Fresnel', () => {
  it('se engancha una sola vez y mueve sus uniformes sin recompilar', () => {
    const mat = new THREE.MeshStandardMaterial();
    const a = attachRim(mat);
    const b = attachRim(mat);
    expect(a).toBe(b);
    setRim(mat, 0xffa51e, 0.5);
    expect(a.color.value.getHex()).toBe(0xffa51e);
    expect(a.k.value).toBeCloseTo(0.5, 5);
  });

  it('inyecta el término en el fragment shader, antes del dithering', () => {
    const mat = new THREE.MeshStandardMaterial();
    attachRim(mat);
    const sh = {
      uniforms: {} as Record<string, unknown>,
      fragmentShader: 'void main(){\n#include <dithering_fragment>\n}',
    };
    mat.onBeforeCompile(sh as never, null as never);
    expect(sh.fragmentShader).toContain('uniform vec3 uRimColor;');
    expect(sh.fragmentShader).toContain('gl_FragColor.rgb += uRimColor * rimF * uRimK;');
    expect(sh.uniforms.uRimColor).toBeDefined();
    expect(sh.uniforms.uRimK).toBeDefined();
  });

  it('un CLON no hereda un contorno muerto', () => {
    // MEDIDO sobre three: `Material.clone()` copia `userData` por JSON, asi que
    // un THREE.Color guardado ahi sale del clon como objeto PLANO (sin
    // `isColor` ni `setHex`); y `onBeforeCompile` NO se copia. Las dos cosas a la
    // vez: el clon se queda con un mango inservible y sin shader.
    //
    // Y es un camino que la escena recorre: la diseccion viste la malla con su
    // clon (que ya lleva contorno) y RigOverlays clona ESE material para el
    // brillo del arco. Con el `return existing` a secas, `setRim` llamaba a
    // `.setHex` sobre el objeto plano y lanzaba.
    const src = new THREE.MeshStandardMaterial();
    attachRim(src);
    setRim(src, 0xffa51e, 0.4);

    const clone = src.clone();
    // Primero la prueba de que el peligro es real y no imaginado.
    const inherited = (clone.userData as Record<string, unknown>).__rigRim as
      | { color: { value: THREE.Color } }
      | undefined;
    expect(inherited).toBeDefined();
    expect(inherited!.color.value.isColor).toBeUndefined();
    expect(clone.onBeforeCompile).toBe(THREE.Material.prototype.onBeforeCompile);

    // Y ahora que volver a enganchar lo repara, en los dos frentes.
    const handle = attachRim(clone);
    expect(() => setRim(clone, 0x38bdf8, 0.7)).not.toThrow();
    expect(handle.color.value.isColor).toBe(true);
    expect(handle.color.value.getHex()).toBe(0x38bdf8);
    expect(handle.k.value).toBeCloseTo(0.7, 5);
    expect(clone.onBeforeCompile).not.toBe(THREE.Material.prototype.onBeforeCompile);

    const sh = {
      uniforms: {} as Record<string, unknown>,
      fragmentShader: ['void main(){', '#include <dithering_fragment>', '}'].join('\n'),
    };
    clone.onBeforeCompile(sh as never, null as never);
    expect(sh.fragmentShader).toContain('gl_FragColor.rgb += uRimColor * rimF * uRimK;');
    expect(sh.uniforms.uRimColor).toBe(handle.color);

    // Y el original sigue con SU mango, no con el del clon.
    expect(setRim(src, 0xffa51e, 0.4) as unknown).toBeUndefined();
    expect(handle.color.value.getHex()).toBe(0x38bdf8);
  });

  it('no se cae en silencio si three cambia el nombre del include', () => {
    // Si el marcador deja de existir, `replace` no hace nada y el contorno
    // desaparece sin un solo error: es el modo de fallo de toda inyección de
    // shader, y el que hace falta vigilar.
    const mat = new THREE.MeshStandardMaterial();
    attachRim(mat);
    const sh = { uniforms: {} as Record<string, unknown>, fragmentShader: 'void main(){}' };
    mat.onBeforeCompile(sh as never, null as never);
    expect(sh.fragmentShader).not.toContain('uRimColor * rimF');
    // Y el shader real de three SÍ lo trae, que es lo que hace válida la
    // inyección: si esto falla, el contorno está muerto en la escena.
    expect(THREE.ShaderLib.physical.fragmentShader).toContain('#include <dithering_fragment>');
    expect(THREE.ShaderLib.physical.fragmentShader).toContain('#include <emissivemap_fragment>');
  });
});

describe('la paleta del papel vive en un solo sitio', () => {
  const overlays = readFileSync('src/components/movement/RigOverlays.tsx', 'utf8');
  const readout = readFileSync('src/components/movement/RhythmReadout.tsx', 'utf8');

  it('los cuatro tonos son los mismos en three y en CSS', () => {
    for (const role of ROLE_ORDER) {
      expect(ROLE_TONE_CSS[role]).toBe(`#${ROLE_TONE[role].toString(16).padStart(6, '0')}`);
    }
    expect(ROLE_ORDER.length).toBe(4);
  });

  it('RigOverlays ya no escribe el tono del papel en el músculo', () => {
    // `ROLE_COLOR3` era la tabla que teñía el difuso y pintaba el emisivo.
    expect(overlays).not.toContain('ROLE_COLOR3');
    expect(overlays).toContain('paintEmber(clone, baseColor');
    expect(overlays).toContain('setRim(clone, ROLE_GLOW[role]');
    // Y los hexadecimales no vuelven a estar escritos a mano aquí.
    for (const h of ['0xffa51e', '0x2dd4bf', '0x38bdf8', '0xa78bfa']) {
      expect(overlays).not.toContain(h);
    }
  });

  it('el resalte de selección de la disección tampoco repinta el tejido', () => {
    const model = readFileSync('src/components/movement/RigModel.tsx', 'utf8');
    // Antes: `clone.emissive = new THREE.Color(SELECTION_EMISSIVE)` -> cian.
    expect(model).not.toContain('clone.emissive = new THREE.Color(SELECTION_EMISSIVE)');
    expect(model).toContain('setRim(clone, SELECTION_EMISSIVE');
  });

  it('el panel tiene leyenda, porque sin ella el color del borde no se traduce', () => {
    expect(readout).toContain('ROLE_TONE_CSS[role]');
    expect(readout).toContain('roleCounts');
    // Y nombra a TODOS los activos, no a los tres primeros.
    expect(readout).not.toContain('live.slice(1, 4)');
  });
});
