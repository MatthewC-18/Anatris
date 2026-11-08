// TEMP PROBE -- delete after use.
// Reproduce: desktop, Tests panel open -> press "Demostrar" -> close the panel
// with its X. Does the demo keep driving the rig?
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import Reconciler from 'react-reconciler';
import { DefaultEventPriority, LegacyRoot } from 'react-reconciler/constants';

// ---------- browser globals the panel touches (set BEFORE importing it) ------
const g: any = globalThis;
let clock = 0;
let rafQ: Array<{ id: number; cb: (t: number) => void }> = [];
let rafId = 1;
g.requestAnimationFrame = (cb: (t: number) => void) => {
  const id = rafId++;
  rafQ.push({ id, cb });
  return id;
};
g.cancelAnimationFrame = (id: number) => {
  rafQ = rafQ.filter((f) => f.id !== id);
};
/** Run one animation frame. */
function frame(dt = 16) {
  clock += dt;
  const q = rafQ;
  rafQ = [];
  for (const f of q) f.cb(clock);
}
const mkStore = () => {
  const s = new Map<string, string>();
  return {
    getItem: (k: string) => s.get(k) ?? null,
    setItem: (k: string, v: string) => void s.set(k, String(v)),
    removeItem: (k: string) => void s.delete(k),
    clear: () => s.clear(),
    key: () => null,
    length: 0,
  };
};
g.localStorage = mkStore();
g.sessionStorage = mkStore();
g.matchMedia = (q: string) => ({
  matches: false,
  media: q,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
});
g.document = {
  getElementById: () => null,
  querySelector: () => null,
  createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {} }),
  body: { appendChild: () => {}, removeChild: () => {} },
  documentElement: { style: {}, classList: { add() {}, remove() {} } },
  addEventListener: () => {},
  removeEventListener: () => {},
};
g.addEventListener = () => {};
g.removeEventListener = () => {};
g.dispatchEvent = () => false;
g.window = g;

// ---------- minimal react-reconciler host (no DOM needed) -------------------
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
  appendInitialChild: (p: Inst, c: Inst) => void p.children.push(c),
  appendChild: (p: Inst, c: Inst) => void p.children.push(c),
  appendChildToContainer: (p: Inst, c: Inst) => void p.children.push(c),
  insertBefore: (p: Inst, c: Inst, b: Inst) => void p.children.splice(p.children.indexOf(b), 0, c),
  insertInContainerBefore: (p: Inst, c: Inst, b: Inst) =>
    void p.children.splice(p.children.indexOf(b), 0, c),
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
  commitUpdate: (inst: Inst, _pl: any, _t: string, _o: any, newProps: any) => {
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

function walk(n: Inst, out: Inst[] = []): Inst[] {
  out.push(n);
  for (const c of n.children) walk(c, out);
  return out;
}
function textOf(n: Inst): string {
  return walk(n)
    .filter((x) => x.type === '#text')
    .map((x) => x.props.text)
    .join(' ');
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const say = (...a: any[]) => process.stdout.write('PROBE ' + a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ') + String.fromCharCode(10));

describe('close the tests panel while a demo runs', () => {
  it('reports whether the rig keeps being driven', async () => {
    const { OrthopedicTestsPanel } = await import('../OrthopedicTestsPanel');
    const { rigChannel } = await import('../RigModel');
    const { demoChannel } = await import('../demoChannel');

    const pushes: Array<{ movementId: string | null; angleDeg: number; ghost?: boolean }> = [];
    const unsub = rigChannel.subscribe((s: any) =>
      pushes.push({ movementId: s.movementId, angleDeg: s.angleDeg, ghost: s.ghostSkin }),
    );

    const R = Reconciler(hostConfig);
    const container: Inst = { type: 'ROOT', props: {}, children: [] };
    const root = (R as any).createContainer(container, LegacyRoot, null, false, null, '', noop, null);

    let open = true;
    const render = () =>
      (R as any).updateContainer(
        createElement(OrthopedicTestsPanel as any, {
          region: 'shoulder',
          open,
          onOpenChange: (o: boolean) => {
            open = o;
            render();
          },
        }),
        root,
        null,
        null,
      );

    render();
    await flush();

    // 1. The real "Demostrar" button in the rendered tree.
    const demoBtn = walk(container).find(
      (n) => typeof n.props?.['aria-label'] === 'string' && n.props['aria-label'].startsWith('Demostrar'),
    );
    expect(demoBtn, 'no Demostrar button rendered').toBeTruthy();
    say('CLICK:', demoBtn!.props['aria-label']);
    demoBtn!.props.onClick();
    await flush();

    say('owner after click:', demoChannel.get());
    const beforeClose = pushes.length;
    for (let i = 0; i < 12; i++) frame();
    const anglesOpen = pushes.slice(beforeClose).map((p) => Math.round(p.angleDeg));
    say('angles with panel OPEN:', anglesOpen);
    say('rAF callbacks pending:', rafQ.length);

    // 2. Close the panel with its own X, exactly as MovementView wires it.
    const closeBtn = walk(container).find((n) => n.props?.['aria-label'] === 'Cerrar tests');
    expect(closeBtn, 'no close button rendered').toBeTruthy();
    closeBtn!.props.onClick();
    await flush();

    say('open prop now:', open);
    say('tree after close:', textOf(container.children[0] ?? ({ children: [] } as any)));
    say('owner after close:', demoChannel.get());
    say('rAF callbacks pending after close:', rafQ.length);

    const afterClose = pushes.length;
    for (let i = 0; i < 25; i++) frame();
    const anglesClosed = pushes.slice(afterClose).map((p) => Math.round(p.angleDeg));
    say('angles with panel CLOSED:', anglesClosed);
    say('pushes while closed:', anglesClosed.length);
    say('last rig state:', JSON.stringify(pushes[pushes.length - 1]));

    unsub();
    demoChannel.stop();
  });
});
