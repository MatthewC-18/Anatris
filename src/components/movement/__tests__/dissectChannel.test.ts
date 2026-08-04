// Dissection logic: what a click resolves to, and what a removal takes away.
//
// The bug these tests exist for: peeling the LEFT pectoral used to take the right
// one with it, because the side came from the mesh NAME and Z-Anatomy leaves
// laterality out of most names (or mirrors it). Side is now geometric and every
// removal carries the side it was taken from, so the cases below pin that down.

import { describe, expect, it, beforeEach } from 'vitest';
import {
  dissectChannel,
  makeSelection,
  meshIsDissected,
  meshIsIsolatedOut,
  prettifyBase,
  scopeFromSides,
  type HiddenEntry,
  type StructureSides,
} from '../dissectChannel';
import type { Muscle } from '../../../types/muscle';

const PECTORAL: Muscle = {
  id: 'pectoralis-major',
  name: 'Pectoral mayor',
  latin: 'Musculus pectoralis major',
  meshBases: ['Pectoralis_major_muscle', 'Pectoralis_major_muscle_2'],
  clinicalNote: 'Aductor y rotador interno del hombro.',
} as unknown as Muscle;

const BOTH_SIDES: StructureSides = { left: 4, right: 4, center: 0 };
const ONE_SIDE: StructureSides = { left: 0, right: 3, center: 0 };
const MIDLINE: StructureSides = { left: 0, right: 0, center: 2 };

const hiddenOf = (
  scope: 'left' | 'right' | 'both',
  bases = PECTORAL.meshBases,
): HiddenEntry[] => [
  { key: `pectoralis-major:${scope}`, id: 'pectoralis-major', label: 'Pectoral mayor', bases, scope },
];

describe('scopeFromSides', () => {
  it('opens on the clicked side when the structure is bilateral', () => {
    expect(scopeFromSides('left', BOTH_SIDES)).toBe('left');
    expect(scopeFromSides('right', BOTH_SIDES)).toBe('right');
  });

  it('opens whole when there is nothing to choose', () => {
    expect(scopeFromSides('right', ONE_SIDE)).toBe('both');
    expect(scopeFromSides('center', MIDLINE)).toBe('both');
    // A bilateral structure clicked on a midline sliver has no side to prefer.
    expect(scopeFromSides('center', BOTH_SIDES)).toBe('both');
  });
});

describe('makeSelection', () => {
  it('takes the side from the geometry, not from the mesh name', () => {
    // The name carries no l/r marker at all: only the measured side can say.
    const sel = makeSelection(
      'Pectoralis_major_muscle_2',
      'muscle',
      PECTORAL,
      'left',
      BOTH_SIDES,
    );
    expect(sel.side).toBe('left');
    expect(sel.scope).toBe('left');
    expect(sel.bilateral).toBe(true);
    expect(sel.sideLabel).toBe('Lado izquierdo');
    expect(sel.label).toBe('Pectoral mayor');
    expect(sel.dissectable).toBe(true);
  });

  it('falls back to the parsed base for an uncatalogued mesh', () => {
    const sel = makeSelection('Some_odd_muscle', 'muscle', undefined, 'right', ONE_SIDE);
    expect(sel.id).toBe('Some_odd_muscle');
    expect(sel.bases).toEqual(['Some_odd_muscle']);
    expect(sel.bilateral).toBe(false);
    expect(sel.scope).toBe('both');
  });

  it('marks bone as not dissectable', () => {
    const sel = makeSelection('Humerus', 'bone', undefined, 'right', ONE_SIDE);
    expect(sel.dissectable).toBe(false);
    expect(sel.planeLabel).toBeNull();
  });
});

describe('meshIsDissected', () => {
  it('removes only the side it was taken from', () => {
    const hidden = hiddenOf('left');
    expect(meshIsDissected('Pectoralis_major_muscle', 'left', hidden)).toBe(true);
    expect(meshIsDissected('Pectoralis_major_muscle', 'right', hidden)).toBe(false);
    // The midline slivers of a side-scoped removal stay on the model.
    expect(meshIsDissected('Pectoralis_major_muscle', 'center', hidden)).toBe(false);
  });

  it('removes every side when scoped to both', () => {
    const hidden = hiddenOf('both');
    for (const side of ['left', 'right', 'center'] as const) {
      expect(meshIsDissected('Pectoralis_major_muscle', side, hidden)).toBe(true);
    }
  });

  it('leaves other structures alone', () => {
    expect(meshIsDissected('Deltoid_muscle', 'left', hiddenOf('left'))).toBe(false);
    expect(meshIsDissected('Deltoid_muscle', 'left', [])).toBe(false);
  });
});

describe('meshIsIsolatedOut', () => {
  const iso = { id: 'pectoralis-major', label: 'Pectoral mayor', bases: PECTORAL.meshBases };

  it('hides everything but the isolated structure', () => {
    const active = { ...iso, scope: 'both' as const };
    expect(meshIsIsolatedOut('Deltoid_muscle', 'left', active)).toBe(true);
    expect(meshIsIsolatedOut('Pectoralis_major_muscle', 'left', active)).toBe(false);
    expect(meshIsIsolatedOut('Pectoralis_major_muscle', 'right', active)).toBe(false);
  });

  it('keeps only the isolated side when scoped', () => {
    const active = { ...iso, scope: 'left' as const };
    expect(meshIsIsolatedOut('Pectoralis_major_muscle', 'left', active)).toBe(false);
    expect(meshIsIsolatedOut('Pectoralis_major_muscle', 'right', active)).toBe(true);
  });

  it('does nothing when no structure is isolated', () => {
    expect(meshIsIsolatedOut('Deltoid_muscle', 'left', null)).toBe(false);
  });
});

describe('dissectChannel', () => {
  beforeEach(() => dissectChannel.reset());

  const select = (side: 'left' | 'right') =>
    dissectChannel.setSelection(
      makeSelection('Pectoralis_major_muscle', 'muscle', PECTORAL, side, BOTH_SIDES),
    );

  it('peels one side and leaves the other clickable', () => {
    select('left');
    dissectChannel.dissectSelected();
    const { hidden, selection } = dissectChannel.get();
    expect(selection).toBeNull();
    expect(hidden).toHaveLength(1);
    expect(hidden[0].scope).toBe('left');
    expect(meshIsDissected('Pectoralis_major_muscle', 'right', hidden)).toBe(false);
  });

  it('keeps the two sides as separate removals', () => {
    select('left');
    dissectChannel.dissectSelected();
    select('right');
    dissectChannel.dissectSelected();
    expect(dissectChannel.get().hidden.map((h) => h.scope)).toEqual(['left', 'right']);
  });

  it('absorbs the per-side removals when the structure is taken whole', () => {
    select('left');
    dissectChannel.dissectSelected();
    select('right');
    dissectChannel.setScope('both');
    dissectChannel.dissectSelected();
    const { hidden } = dissectChannel.get();
    expect(hidden).toHaveLength(1);
    expect(hidden[0].scope).toBe('both');
  });

  it('restores one removal without touching the rest', () => {
    select('left');
    dissectChannel.dissectSelected();
    select('right');
    dissectChannel.dissectSelected();
    dissectChannel.restoreOne('pectoralis-major:left');
    const { hidden } = dissectChannel.get();
    expect(hidden).toHaveLength(1);
    expect(hidden[0].scope).toBe('right');
  });

  it('retargets the pending action without removing anything', () => {
    select('left');
    dissectChannel.setScope('both');
    expect(dissectChannel.get().selection?.scope).toBe('both');
    expect(dissectChannel.get().hidden).toHaveLength(0);
  });

  it('isolates one structure and leaves isolation on restore', () => {
    select('right');
    dissectChannel.isolateSelected();
    expect(dissectChannel.get().isolated?.scope).toBe('right');
    dissectChannel.restoreAll();
    expect(dissectChannel.get().isolated).toBeNull();
  });

  it('notifies subscribers and unsubscribes cleanly', () => {
    let calls = 0;
    const off = dissectChannel.subscribe(() => {
      calls += 1;
    });
    select('left');
    dissectChannel.dissectSelected();
    expect(calls).toBe(2);
    off();
    dissectChannel.restoreAll();
    expect(calls).toBe(2);
  });
});

describe('prettifyBase', () => {
  it('reads as a name, not as a mesh id', () => {
    expect(prettifyBase('Pectoralis_major_muscle')).toBe('Pectoralis major');
  });
});
