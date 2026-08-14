// The pre-compressed model URL.
//
// Small surface, one real trap: the rig is requested as
// `/cuerpo-rig.opt.glb?v=7`, and appending `.gz` to the whole string would ask
// for `...glb?v=7.gz` -- a URL that 404s, sending every visitor back to the 18 MB
// fallback without anything appearing to be wrong.

import { describe, it, expect } from 'vitest';
import { gzUrl } from '../compressedGLTF';

describe('gzUrl', () => {
  it('appends .gz to a plain model path', () => {
    expect(gzUrl('/modelo-opt.dec.glb')).toBe('/modelo-opt.dec.glb.gz');
  });

  it('puts .gz on the PATH, keeping the cache-busting query intact', () => {
    expect(gzUrl('/cuerpo-rig.opt.glb?v=7')).toBe('/cuerpo-rig.opt.glb.gz?v=7');
  });

  it('handles a query with several parameters', () => {
    expect(gzUrl('/a/b.glb?v=7&x=1')).toBe('/a/b.glb.gz?v=7&x=1');
  });

  it('leaves an empty query alone rather than dropping the ?', () => {
    expect(gzUrl('/a/b.glb?')).toBe('/a/b.glb.gz?');
  });
});
