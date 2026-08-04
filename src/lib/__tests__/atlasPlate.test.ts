// The atlas labels can't be checked by eye from this environment (the preview
// pane never mounts the WebGL canvas), so the two rules that decide whether the
// plate reads well are tested directly: the stacking that keeps names from
// overlapping, and the picking that decides what gets named.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  pickLabelTargets,
  stackColumn,
  vertebralLevel,
  MAX_MUSCLE_LABELS,
  type PlacedLabel,
} from '../atlasPlate';
import type { AnatomyEntry } from '../../types/anatomy';
import type { Muscle } from '../../types/muscle';

const HEIGHT = 800;
const GAP = 26;
const PAD_TOP = 72;
const PAD_BOTTOM = 96;

const place = (ys: number[]): PlacedLabel[] =>
  ys.map((ay, i) => ({ i, ax: 300, ay, y: ay, left: true }));

describe('stackColumn', () => {
  it('leaves a spread-out column exactly where the structures are', () => {
    const col = stackColumn(place([120, 300, 500]), HEIGHT, GAP, PAD_TOP, PAD_BOTTOM);
    expect(col.map((p) => p.y)).toEqual([120, 300, 500]);
  });

  it('never lets two names overlap', () => {
    const col = stackColumn(
      place([300, 302, 305, 306, 310, 311]),
      HEIGHT,
      GAP,
      PAD_TOP,
      PAD_BOTTOM,
    );
    for (let i = 1; i < col.length; i++) {
      expect(col[i].y - col[i - 1].y).toBeGreaterThanOrEqual(GAP);
    }
  });

  it('keeps the stack inside the padded viewport when it runs long', () => {
    // 14 vertebral levels crammed onto a short stretch of column.
    const col = stackColumn(
      place(Array.from({ length: 14 }, (_, i) => 600 + i * 4)),
      HEIGHT,
      GAP,
      PAD_TOP,
      PAD_BOTTOM,
    );
    expect(col[0].y).toBeGreaterThanOrEqual(PAD_TOP);
    expect(col[col.length - 1].y).toBeLessThanOrEqual(HEIGHT - PAD_BOTTOM);
  });

  it('does not climb into the top padding even when it cannot fit', () => {
    // More labels than the column has room for: it must clamp at the top rather
    // than sliding names under the hover chip.
    const col = stackColumn(
      place(Array.from({ length: 40 }, () => 400)),
      HEIGHT,
      GAP,
      PAD_TOP,
      PAD_BOTTOM,
    );
    expect(col[0].y).toBe(PAD_TOP);
  });

  it('sorts by the structure position, not by input order', () => {
    const col = stackColumn(place([500, 120, 300]), HEIGHT, GAP, PAD_TOP, PAD_BOTTOM);
    expect(col.map((p) => p.i)).toEqual([1, 2, 0]);
  });

  it('handles an empty column', () => {
    expect(stackColumn([], HEIGHT, GAP, PAD_TOP, PAD_BOTTOM)).toEqual([]);
  });
});

describe('vertebralLevel', () => {
  it('reads the level off the runtime mesh names', () => {
    expect(vertebralLevel('Vertebra_T5_1')).toBe('T5');
    expect(vertebralLevel('Vertebra_L1_2')).toBe('L1');
    expect(vertebralLevel('Vertebra_C7_1')).toBe('C7');
    expect(vertebralLevel('Atlas_(C1)_1')).toBe('C1');
    expect(vertebralLevel('Axis_(C2)_2')).toBe('C2');
  });
  it('is not fooled by neighbours', () => {
    expect(vertebralLevel('Intervertebral_disc_T5-T6')).toBeNull();
    expect(vertebralLevel('Sacrum_1')).toBeNull();
    expect(vertebralLevel('Femur')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */

/** A stand-in mesh with a real world-space bounding sphere. */
function fakeMesh(name: string, x: number, y: number, radius: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BufferGeometry());
  mesh.name = name;
  mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(x, y, 0), radius);
  mesh.updateMatrixWorld(true);
  return mesh;
}

const boneEntry = (meshName: string): [string, AnatomyEntry] => [
  meshName,
  {
    meshName,
    canonicalName: meshName,
    parentNodeName: '',
    materialName: 'Bone',
    layer: 'bones',
    side: 'center',
    hiddenByDefault: false,
  } as AnatomyEntry,
];

const muscle = (id: string, name: string, depth: number): Muscle =>
  ({ id, name, latin: name, meshBases: [], layer: 'muscles', groups: [], depth }) as unknown as Muscle;

describe('pickLabelTargets', () => {
  it('names a paired muscle once, with one anchor per side', () => {
    const meshes = [
      fakeMesh('Deltoid_musclel', 0.2, 1.3, 0.05),
      fakeMesh('Deltoid_muscler', -0.2, 1.3, 0.05),
      fakeMesh('Deltoid_muscle_tinyl', 0.2, 1.3, 0.001),
    ];
    const targets = pickLabelTargets({
      region: 'shoulder',
      muscles: [muscle('deltoid', 'Deltoides', 1)],
      meshNamesByMuscleId: new Map([['deltoid', meshes.map((m) => m.name)]]),
      byMesh: new Map(),
      visibleMeshes: meshes,
    });
    expect(targets).toHaveLength(1);
    expect(targets[0].text).toBe('Deltoides');
    expect(targets[0].anchors).toHaveLength(2);
    // The bigger mesh wins its side, so the leader lands on the belly.
    expect(targets[0].meshNames).not.toContain('Deltoid_muscle_tinyl');
  });

  it('skips a muscle with no visible mesh', () => {
    const targets = pickLabelTargets({
      region: 'shoulder',
      muscles: [muscle('deltoid', 'Deltoides', 1), muscle('ghost', 'Fantasma', 2)],
      meshNamesByMuscleId: new Map([
        ['deltoid', ['Deltoid_musclel']],
        ['ghost', ['Not_in_scene']],
      ]),
      byMesh: new Map(),
      visibleMeshes: [fakeMesh('Deltoid_musclel', 0.2, 1.3, 0.05)],
    });
    expect(targets.map((t) => t.text)).toEqual(['Deltoides']);
  });

  it('offers the superficial muscles first and caps the count', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      muscle(`m${i}`, `Musculo ${i}`, 20 - i),
    );
    const meshes = many.map((m, i) => fakeMesh(`${m.id}_mesh`, 0.1, 1 + i * 0.01, 0.02));
    const targets = pickLabelTargets({
      region: 'shoulder',
      muscles: many,
      meshNamesByMuscleId: new Map(many.map((m) => [m.id, [`${m.id}_mesh`]])),
      byMesh: new Map(),
      visibleMeshes: meshes,
    });
    expect(targets).toHaveLength(MAX_MUSCLE_LABELS);
    // depth 1 is the most superficial, i.e. the last one built.
    expect(targets[0].text).toBe('Musculo 19');
  });

  it('turns a spine region into a level ruler', () => {
    const meshes = [
      fakeMesh('Vertebra_T1_1', 0, 1.44, 0.02),
      fakeMesh('Vertebra_T2_1', 0, 1.41, 0.02),
      fakeMesh('Intervertebral_disc_T1-T2', 0, 1.43, 0.01),
      fakeMesh('Sacrum_1', 0, 0.92, 0.04),
    ];
    const targets = pickLabelTargets({
      region: 'thoracic',
      muscles: [],
      meshNamesByMuscleId: new Map(),
      byMesh: new Map(meshes.map((m) => boneEntry(m.name))),
      visibleMeshes: meshes,
    });
    // Levels and the sacrum, never the discs.
    expect(targets.map((t) => t.text).sort()).toEqual(['Sacro', 'T1', 'T2']);
    expect(targets.every((t) => t.kind === 'bone')).toBe(true);
  });

  it('names landmark bones in Spanish outside the spine', () => {
    const meshes = [
      fakeMesh('Femur', 0.08, 0.65, 0.2),
      fakeMesh('Patella_1', 0.08, 0.44, 0.02),
      fakeMesh('Sesamoid_bones_of_footl', 0.08, 0.03, 0.005),
    ];
    const targets = pickLabelTargets({
      region: 'knee',
      muscles: [],
      meshNamesByMuscleId: new Map(),
      byMesh: new Map(meshes.map((m) => boneEntry(m.name))),
      visibleMeshes: meshes,
    });
    expect(targets.map((t) => t.text)).toEqual(['Fémur', 'Rótula']);
  });

  it('does not print one bone twice when its meshes key differently', () => {
    // "Femur" parses to base "Femu" (the trailing r reads as a side marker)
    // while "Femur_1" keys as "Femur", which used to yield "Fémur · Fémur".
    const meshes = [
      fakeMesh('Femur', 0.08, 0.65, 0.2),
      fakeMesh('Femur_1', 0.08, 0.65, 0.19),
      fakeMesh('Femur', -0.08, 0.65, 0.2),
    ];
    const targets = pickLabelTargets({
      region: 'hip',
      muscles: [],
      meshNamesByMuscleId: new Map(),
      byMesh: new Map(meshes.map((m) => boneEntry(m.name))),
      visibleMeshes: meshes,
    });
    expect(targets.map((t) => t.text)).toEqual(['Fémur']);
    expect(targets[0].anchors).toHaveLength(2); // still one leader per side
  });

  it('pins midline structures so they cannot flip margin as the camera orbits', () => {
    const meshes = [
      fakeMesh('Vertebra_T5_1', 0, 1.3, 0.02), // on the midline
      fakeMesh('Femur', 0.08, 0.65, 0.2), // off to one side
    ];
    const targets = pickLabelTargets({
      region: 'thoracic',
      muscles: [],
      meshNamesByMuscleId: new Map(),
      byMesh: new Map(meshes.map((m) => boneEntry(m.name))),
      visibleMeshes: meshes,
    });
    const level = targets.find((t) => t.text === 'T5');
    expect(level?.pin).toBe('left');
  });

  it('names nothing when nothing is visible', () => {
    expect(
      pickLabelTargets({
        region: 'knee',
        muscles: [muscle('x', 'X', 1)],
        meshNamesByMuscleId: new Map([['x', ['X_mesh']]]),
        byMesh: new Map(),
        visibleMeshes: [],
      }),
    ).toEqual([]);
  });
});
