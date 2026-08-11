// scripts/lib/rigPath.mts
//
// Where the rig GLB lives. The scripts used to hardcode an absolute Windows path
// to one machine, so none of them ran on a fresh checkout (or in CI, or in an
// agent session). Resolve it from the repo instead, keeping that path as the last
// fallback so the original machine keeps working unchanged.
//
// Order: $ANATRIS_GLB -> <repo>/public/... -> the original absolute path.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function firstThatExists(candidates: (string | undefined)[], what: string): string {
  const hit = candidates.find((p): p is string => !!p && existsSync(p));
  if (!hit) {
    console.error(
      `No encuentro ${what}. Descarga los modelos con \`git lfs pull\`, ` +
      'o apunta $ANATRIS_GLB al archivo.',
    );
    process.exit(1);
  }
  return hit;
}

/** The optimised rig the app actually ships (public/cuerpo-rig.opt.glb). */
export function rigGlbPath(): string {
  return firstThatExists(
    [
      process.env.ANATRIS_GLB,
      resolve(REPO, 'public/cuerpo-rig.opt.glb'),
      'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb',
    ],
    'cuerpo-rig.opt.glb',
  );
}
