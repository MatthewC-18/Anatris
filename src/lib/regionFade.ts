// src/lib/regionFade.ts
//
// REGION FALLOFF for the Explorar atlas.
//
// A region cannot be made to end at its joint by filtering mesh names: the atlas
// models the femur as ONE mesh from the hip to the knee, and the rectus femoris,
// the adductors and the sartorius run its whole length. So "Cadera" rendered as
// an entire thigh, cut off mid-shaft at the bottom of the frame, and "Rodilla"
// as the whole leg down to the toes.
//
// Instead of hiding those meshes (which would take the hip's own femoral head
// and quadriceps with them), we dissolve them: every fragment outside the
// region's vertical slab (RegionDef.fade, authored in world metres) fades to
// transparent across a soft margin, so a long bone drifts out of the plate
// instead of ending in a stump.
//
// ONE shared uniform object is handed to every patched material, so switching
// region is a single write, not 6316 material updates.

import * as THREE from 'three';

/**
 * x = slab min, y = slab max, z = softness (metres), w = 1 when the falloff is
 * active. Shared BY REFERENCE with every patched material's shader, so writing
 * `.value` here updates the whole atlas at once.
 */
export const regionFadeUniform = { value: new THREE.Vector4(0, 0, 1, 0) };

/** Turn the falloff on for a slab, or off entirely when `fade` is null. */
export function setRegionFade(
  fade: { min: number; max: number; soft: number } | null,
): void {
  if (fade) regionFadeUniform.value.set(fade.min, fade.max, fade.soft, 1);
  else regionFadeUniform.value.w = 0;
}

// The three chunk includes we splice into. They are part of three's standard
// mesh shaders; if a three upgrade renames one, the patch would silently become
// a no-op and the falloff would stop working with no error anywhere — hence the
// assertion below and the test in __tests__/regionFade.test.ts.
const VERTEX_ANCHOR = '#include <project_vertex>';
const FRAGMENT_ANCHOR = '#include <alphatest_fragment>';
const COMMON_ANCHOR = '#include <common>';

/**
 * Splice the world-Y falloff into a standard material's shader.
 *
 * Call once per material, before its first render. Inert until
 * `setRegionFade` turns the uniform on.
 */
export function patchRegionFadeShader(mat: THREE.Material): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRegionFade = regionFadeUniform;

    shader.vertexShader = shader.vertexShader
      .replace(COMMON_ANCHOR, `${COMMON_ANCHOR}\nvarying float vRegionY;`)
      // `transformed` is final by the time project_vertex runs (post morph /
      // skinning), so this is the safest place to read the world height.
      .replace(
        VERTEX_ANCHOR,
        `vRegionY = (modelMatrix * vec4(transformed, 1.0)).y;\n${VERTEX_ANCHOR}`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        COMMON_ANCHOR,
        `${COMMON_ANCHOR}\nvarying float vRegionY;\nuniform vec4 uRegionFade;`,
      )
      .replace(
        FRAGMENT_ANCHOR,
        `
  if ( uRegionFade.w > 0.5 ) {
    float regionLo = smoothstep( uRegionFade.x - uRegionFade.z, uRegionFade.x, vRegionY );
    float regionHi = 1.0 - smoothstep( uRegionFade.y, uRegionFade.y + uRegionFade.z, vRegionY );
    float regionAlpha = regionLo * regionHi;
    if ( regionAlpha < 0.008 ) discard;
    diffuseColor.a *= regionAlpha;
  }
  ${FRAGMENT_ANCHOR}`,
      );

    if (import.meta.env?.DEV) {
      const ok =
        shader.vertexShader.includes('vRegionY =') &&
        shader.fragmentShader.includes('uRegionFade.w');
      if (!ok) {
        console.error(
          '[regionFade] shader patch did not apply — three.js chunk names changed. ' +
            'The Explorar region falloff is inactive.',
        );
      }
    }
  };
}
