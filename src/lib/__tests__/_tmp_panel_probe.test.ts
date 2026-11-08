import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrthopedicTestsPanel } from '../../components/movement/OrthopedicTestsPanel';

describe('probe: real tests panel as the sheet mounts it (bare+open)', () => {
  it('shows paid clinical metrics with no entitlement', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrthopedicTestsPanel, {
        region: 'shoulder',
        open: true,
        bare: true,
        onOpenChange: () => {},
        focusTestId: 'neer',
      }),
    );
    for (const probe of ['Neer', 'Hawkins', '72', '60', 'Sensibilidad', 'specificity']) {
      console.log(`contains "${probe}":`, html.includes(probe));
    }
    console.log('markup length:', html.length);
    console.log('test rows:', (html.match(/data-/g) ?? []).length);
    expect(html.length).toBe(0);
  });
});
