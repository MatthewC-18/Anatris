import { describe, expect, it } from 'vitest';
import { layerChannel } from '../RigModel';
import { dissectChannel } from '../dissectChannel';
import { demoChannel } from '../demoChannel';

describe('_tmp layer persistence probe', () => {
  it('A: surface of layerChannel vs dissectChannel', () => {
    console.log('layerChannel keys   =', JSON.stringify(Object.keys(layerChannel)));
    console.log('dissectChannel keys =', JSON.stringify(Object.keys(dissectChannel)));
    console.log('demoChannel keys    =', JSON.stringify(Object.keys(demoChannel)));
    console.log('has layerChannel.reset =', 'reset' in layerChannel);
  });

  it('B: user peels skin+muscle, then the region-change effect of MovementView runs', () => {
    console.log('default           =', JSON.stringify(layerChannel.get()));
    // LayerControls.tsx:57 -> toggle('skin'), toggle('muscle')
    layerChannel.set({ skin: false });
    layerChannel.set({ muscle: false });
    console.log('after peel        =', JSON.stringify(layerChannel.get()));
    // EXACT body of MovementView.tsx:76-82 (region change AND unmount)
    dissectChannel.reset();
    demoChannel.stop();
    console.log('after regionchange=', JSON.stringify(layerChannel.get()));
    // and again, as the unmount cleanup would
    dissectChannel.reset();
    demoChannel.stop();
    console.log('after unmount     =', JSON.stringify(layerChannel.get()));
    expect(layerChannel.get()).toEqual({ skin: false, muscle: false, bone: true, connective: false });
  });

  it('C: what a fresh LayerControls / fresh RigModel reads on remount', () => {
    // LayerControls.tsx:44  useState(() => layerChannel.get())
    const freshPanel = layerChannel.get();
    // RigModel.tsx:2266 + 2275  applyLayers(layerChannel.get())
    const freshRig = layerChannel.get();
    console.log('fresh panel reads =', JSON.stringify(freshPanel));
    console.log('fresh rig  reads  =', JSON.stringify(freshRig));
    expect(freshRig.skin).toBe(false);
    expect(freshRig.muscle).toBe(false);
  });
});
