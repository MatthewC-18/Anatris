// The Explorar region falloff works by splicing GLSL into three's standard mesh
// shaders at three chunk includes. If a three.js upgrade renames or drops one of
// those includes, `String.replace` silently does nothing: no error, no warning,
// and the falloff just stops working while the app keeps rendering — which is
// the hardest kind of regression to notice. These tests run the real patch
// against the real shader source three ships.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { patchRegionFadeShader, regionFadeUniform, setRegionFade } from '../regionFade';

/** Run the patch the way WebGLRenderer does and hand back the spliced shader. */
function compileLike(mat: THREE.Material) {
  const lib = THREE.ShaderLib.physical;
  const shader = {
    uniforms: {} as Record<string, unknown>,
    vertexShader: lib.vertexShader,
    fragmentShader: lib.fragmentShader,
  };
  patchRegionFadeShader(mat);
  (mat.onBeforeCompile as (s: typeof shader) => void)(shader);
  return shader;
}

describe('region falloff shader patch', () => {
  const mat = new THREE.MeshStandardMaterial();
  const shader = compileLike(mat);

  it('shares the one uniform object so a region switch is a single write', () => {
    expect(shader.uniforms.uRegionFade).toBe(regionFadeUniform);
  });

  it('declares and fills the world-height varying in the vertex shader', () => {
    expect(shader.vertexShader).toContain('varying float vRegionY;');
    expect(shader.vertexShader).toContain('vRegionY = (modelMatrix * vec4(transformed, 1.0)).y;');
    // Must be assigned BEFORE the position is projected, while `transformed` is
    // still the final object-space vertex.
    expect(shader.vertexShader.indexOf('vRegionY =')).toBeLessThan(
      shader.vertexShader.indexOf('#include <project_vertex>'),
    );
  });

  it('applies the dissolve to the fragment alpha', () => {
    expect(shader.fragmentShader).toContain('uniform vec4 uRegionFade;');
    expect(shader.fragmentShader).toContain('diffuseColor.a *= regionAlpha;');
    // The varying has to be declared before it is read.
    expect(shader.fragmentShader.indexOf('varying float vRegionY;')).toBeLessThan(
      shader.fragmentShader.indexOf('regionAlpha'),
    );
  });

  it('leaves the shader alone when no region defines a falloff', () => {
    setRegionFade(null);
    expect(regionFadeUniform.value.w).toBe(0);
  });

  it('turning a slab on writes all four components', () => {
    setRegionFade({ min: 0.7, max: 1.05, soft: 0.11 });
    expect([...regionFadeUniform.value.toArray()]).toEqual([0.7, 1.05, 0.11, 1]);
    setRegionFade(null);
  });
});
