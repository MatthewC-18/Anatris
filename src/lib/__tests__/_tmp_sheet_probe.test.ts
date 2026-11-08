import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MobileLabSheet } from '../../components/movement/MobileLabSheet';

const SECRET = 'CUERPO-PREMIUM-DE-TESTS';

describe('probe: locked tab body in the mobile sheet', () => {
  it('renders active=tests even when that tab is locked', () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileLabSheet, {
        tabs: [
          { id: 'movimiento', label: 'Movimiento', render: () => 'LIBRE' },
          { id: 'capas', label: 'Capas', render: () => 'CAPAS' },
          {
            id: 'tests',
            label: 'Tests',
            locked: true,
            onLocked: () => {},
            render: () => SECRET,
          },
        ],
        active: 'tests',
        onActiveChange: () => {},
        detent: 'full',
        onDetentChange: () => {},
      }),
    );
    const leaked = html.includes(SECRET);
    const selected = (html.match(/aria-selected="true"/g) ?? []).length;
    console.log('LOCKED BODY RENDERED:', leaked);
    console.log('TABS MARKED SELECTED:', selected);
    expect(leaked).toBe(false);
  });
});
