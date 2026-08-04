// A guard for a failure TypeScript cannot see and this environment cannot
// render.
//
// <AtlasProjector> mounts inside <Canvas>, where React is running R3F's
// reconciler, not react-dom. Any DOM element that ends up in that subtree — a
// <div>, a <button>, or anything reached through `createPortal` from react-dom,
// which does NOT switch reconcilers — is handed to R3F as a three.js object and
// blows the whole viewer up at render time with:
//
//   R3F: Button is not part of the THREE namespace! Did you forget to extend?
//
// That is exactly how the first version of the atlas plate shipped. The types
// are happy (a button is valid JSX), the build passes, and the preview pane
// never mounts the canvas, so nothing catches it before a real browser does.
// The projector must therefore stay headless: it computes and writes to DOM the
// <AtlasPlate> sibling created, and renders nothing itself.

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const SOURCE = readFileSync('src/components/AtlasLabels.tsx', 'utf8');

/** The body of a top-level exported function component. */
function bodyOf(name: string): string {
  const start = SOURCE.indexOf(`export function ${name}(`);
  expect(start, `${name} not found`).toBeGreaterThan(-1);
  const next = SOURCE.indexOf('\nexport function ', start + 1);
  return SOURCE.slice(start, next === -1 ? undefined : next);
}

describe('AtlasProjector stays headless', () => {
  const body = bodyOf('AtlasProjector');

  it('renders nothing', () => {
    expect(body).toContain('return null;');
  });

  it('contains no JSX', () => {
    // Any `<tag` that is not a generic/comparison. Keeps this blunt on purpose:
    // the rule is "no elements at all", not "no DOM elements".
    const jsx = body.match(/<[a-zA-Z][a-zA-Z0-9.]*[\s/>]/g) ?? [];
    expect(jsx).toEqual([]);
  });

  it('never reaches for a react-dom portal', () => {
    // A portal from react-dom does not switch reconcilers, so it is never a way
    // out of the canvas — the DOM half is a sibling of <Canvas> instead. Match
    // the IMPORT, not the word: the file explains this trap in its header.
    const imports = SOURCE.match(/^import[\s\S]*?from\s+'[^']+';$/gm) ?? [];
    expect(imports.filter((line) => line.includes('react-dom'))).toEqual([]);
  });
});

describe('AtlasPlate owns the DOM', () => {
  const body = bodyOf('AtlasPlate');

  it('renders the names and the leaders', () => {
    expect(body).toContain('<button');
    expect(body).toContain('<path');
  });

  it('keeps each leader gradient inside its own group', () => {
    // A gradient hoisted into a shared <defs> resolves `currentColor` against
    // that <defs>, not against the leader referencing it, and the hover /
    // selected colour would silently stop working. Nesting it in the group is
    // what makes one CSS property drive the whole leader, so assert the order:
    // group opens -> gradient -> path that strokes with it.
    const group = body.indexOf("'atlas-leader'");
    const gradient = body.indexOf('<linearGradient');
    const path = body.indexOf('<path');
    expect(group).toBeGreaterThan(-1);
    expect(gradient).toBeGreaterThan(group);
    expect(path).toBeGreaterThan(gradient);
  });
});
