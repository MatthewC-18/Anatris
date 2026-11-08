// TEMP PROBE -- delete after use.
import { describe, it, expect } from 'vitest';
import { createElement, useEffect, useState } from 'react';
import Reconciler from 'react-reconciler';
import { DefaultEventPriority, ConcurrentRoot, LegacyRoot } from 'react-reconciler/constants';

type Inst = { type: string; props: any; children: Inst[] };

const noop = () => {};

const hostConfig: any = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: false,
  now: () => Date.now(),
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  getRootHostContext: () => ({}),
  getChildHostContext: (p: any) => p,
  getPublicInstance: (i: any) => i,
  prepareForCommit: () => null,
  resetAfterCommit: noop,
  preparePortalMount: noop,
  clearContainer: (c: Inst) => {
    c.children = [];
  },
  createInstance: (type: string, props: any): Inst => ({ type, props, children: [] }),
  createTextInstance: (text: string): Inst => ({ type: '#text', props: { text }, children: [] }),
  appendInitialChild: (p: Inst, c: Inst) => {
    p.children.push(c);
  },
  appendChild: (p: Inst, c: Inst) => {
    p.children.push(c);
  },
  appendChildToContainer: (p: Inst, c: Inst) => {
    p.children.push(c);
  },
  insertBefore: (p: Inst, c: Inst, b: Inst) => {
    p.children.splice(p.children.indexOf(b), 0, c);
  },
  insertInContainerBefore: (p: Inst, c: Inst, b: Inst) => {
    p.children.splice(p.children.indexOf(b), 0, c);
  },
  removeChild: (p: Inst, c: Inst) => {
    const i = p.children.indexOf(c);
    if (i >= 0) p.children.splice(i, 1);
  },
  removeChildFromContainer: (p: Inst, c: Inst) => {
    const i = p.children.indexOf(c);
    if (i >= 0) p.children.splice(i, 1);
  },
  finalizeInitialChildren: () => false,
  shouldSetTextContent: () => false,
  prepareUpdate: () => true,
  commitUpdate: (inst: Inst, _pl: any, _t: string, _old: any, newProps: any) => {
    inst.props = newProps;
  },
  commitTextUpdate: (inst: Inst, _o: string, n: string) => {
    inst.props = { text: n };
  },
  commitMount: noop,
  resetTextContent: noop,
  hideInstance: noop,
  hideTextInstance: noop,
  unhideInstance: noop,
  unhideTextInstance: noop,
  detachDeletedInstance: noop,
  getCurrentEventPriority: () => DefaultEventPriority,
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur: noop,
  afterActiveInstanceBlur: noop,
  prepareScopeUpdate: noop,
  getInstanceFromScope: () => null,
};

describe('harness', () => {
  it('mounts a component and runs its effects', async () => {
    const R = Reconciler(hostConfig);
    const container: Inst = { type: 'ROOT', props: {}, children: [] };
    const log: string[] = [];

    function Probe({ open }: { open: boolean }) {
      const [n] = useState(1);
      useEffect(() => {
        log.push('effect:' + open);
        return () => log.push('cleanup:' + open);
      }, []);
      return createElement('div', { 'data-open': open, 'data-n': n });
    }

    const root = (R as any).createContainer(container, LegacyRoot, null, false, null, '', noop, null);
    (R as any).updateContainer(createElement(Probe, { open: true }), root, null, null);
    await new Promise((r) => setTimeout(r, 0));
    (R as any).updateContainer(createElement(Probe, { open: false }), root, null, null);
    await new Promise((r) => setTimeout(r, 0));

    // eslint-disable-next-line no-console
    console.log('LOG', log, 'TREE', JSON.stringify(container.children.map((c) => c.props)));
    expect(log).toContain('effect:true');
    expect(ConcurrentRoot).toBe(1);
  });
});
