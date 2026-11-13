// LA ETIQUETA DE ORIGEN / INSERCION DE EXPLORAR: UNA, EN PANTALLA, SIN TAPAR
// LOS PUNTOS.
//
// El usuario: "cuando pulso origen sale muy grande, uno encima de otro, y no se
// lee". Era un cartel 3D de 5 cm por cada punto, todos con el mismo texto. Estas
// pruebas atan el arreglo: la colocacion (pura) y que el cartel 3D no vuelva.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CALLOUT_GAP, CALLOUT_MARGIN, placeCallout } from '../attachmentCallout';

const W = 900;
const H = 700;
const LW = 160;
const LH = 38;

/** La caja de la etiqueta no toca ningun punto. */
function cubre(p: { left: number; top: number }, pins: { x: number; y: number }[]): boolean {
  return pins.some((q) => q.x >= p.left && q.x <= p.left + LW && q.y >= p.top && q.y <= p.top + LH);
}

describe('donde va la etiqueta', () => {
  it('sin puntos no hay etiqueta', () => {
    expect(placeCallout([], W, H, LW, LH)).toBeNull();
  });

  it('encima del grupo si el grupo esta arriba y hay sitio', () => {
    const pins = [
      { x: 400, y: 260 },
      { x: 480, y: 250 },
    ];
    const p = placeCallout(pins, W, H, LW, LH)!;
    expect(p.side).toBe('above');
    expect(p.top + LH).toBeLessThanOrEqual(250 - CALLOUT_GAP + 0.001);
    // Centrada sobre el grupo, y las guias salen del borde de abajo.
    expect(p.anchorX).toBeCloseTo(440, 6);
    expect(p.anchorY).toBeCloseTo(p.top + LH, 6);
    expect(cubre(p, pins)).toBe(false);
  });

  it('debajo si el grupo esta abajo', () => {
    const pins = [{ x: 450, y: 520 }];
    const p = placeCallout(pins, W, H, LW, LH)!;
    expect(p.side).toBe('below');
    expect(p.top).toBeGreaterThanOrEqual(520);
    expect(p.anchorY).toBeCloseTo(p.top, 6);
    expect(cubre(p, pins)).toBe(false);
  });

  it('con la camara muy cerca (el grupo llena el alto) va al lado, sin tapar ningun punto', () => {
    // Medido al acercar la camara en Explorar: los puntos del deltoides ocupan
    // del techo al suelo del lienzo y ni encima ni debajo cabe la etiqueta.
    const pins = [
      { x: 300, y: 30 },
      { x: 340, y: 360 },
      { x: 320, y: 680 },
    ];
    const p = placeCallout(pins, W, H, LW, LH)!;
    expect(['left', 'right']).toContain(p.side);
    expect(cubre(p, pins)).toBe(false);
    // Las guias salen del borde que mira a los puntos.
    expect(p.anchorX).toBeCloseTo(p.side === 'right' ? p.left : p.left + LW, 6);
  });

  it('en ningun caso de una rejilla de grupos tapa un punto si hay donde ponerla', () => {
    // Barrido: grupos de dos puntos por todo el lienzo, juntos y separados.
    let tapados = 0;
    for (let x = 20; x < W; x += 110) {
      for (let y = 20; y < H; y += 90) {
        for (const d of [0, 60, 220]) {
          const pins = [
            { x, y },
            { x: Math.min(W - 5, x + d), y: Math.min(H - 5, y + d / 2) },
          ];
          const p = placeCallout(pins, W, H, LW, LH)!;
          if (cubre(p, pins)) tapados++;
        }
      }
    }
    expect(tapados).toBe(0);
  });

  it('siempre dentro del lienzo, tambien con el grupo pegado a un borde', () => {
    for (const pins of [
      [{ x: 5, y: 20 }],
      [{ x: W - 3, y: H - 4 }],
      [
        { x: 10, y: 300 },
        { x: W - 10, y: 320 },
      ],
    ]) {
      const p = placeCallout(pins, W, H, LW, LH)!;
      expect(p.left).toBeGreaterThanOrEqual(CALLOUT_MARGIN);
      expect(p.left + LW).toBeLessThanOrEqual(W - CALLOUT_MARGIN + 0.001);
      expect(p.top).toBeGreaterThanOrEqual(CALLOUT_MARGIN);
      expect(p.top + LH).toBeLessThanOrEqual(H - CALLOUT_MARGIN + 0.001);
    }
  });
});

describe('el cartel 3D por punto no vuelve', () => {
  const marcadores = readFileSync('src/components/AttachmentMarkers.tsx', 'utf8');
  const etiqueta = readFileSync('src/components/AttachmentCallout.tsx', 'utf8');

  it('AttachmentMarkers ya no pinta texto en 3D: publica los puntos a la etiqueta de pantalla', () => {
    expect(marcadores).not.toContain('makeLabelSprite');
    expect(marcadores).not.toContain('new THREE.Sprite');
    expect(marcadores).toContain('attachmentCallout.set(');
  });

  it('el proyector no pinta nada y el fichero no mezcla reconciliadores', () => {
    // Igual que los nombres del atlas: dentro del <Canvas> solo proyecta; el DOM
    // lo pinta su hermano. Un createPortal de react-dom dentro del Canvas revienta
    // en el navegador con el build en verde.
    const cuerpo = etiqueta.slice(etiqueta.indexOf('export function AttachmentProjector'));
    const hasta = cuerpo.indexOf('\n}\n');
    expect(cuerpo.slice(0, hasta)).toContain('return null;');
    expect(cuerpo.slice(0, hasta)).not.toMatch(/<[a-z]/);
    expect(etiqueta).not.toContain("from 'react-dom'");
  });

  it('las guias no se desalinean si un punto queda detras de la camara', () => {
    // screen[i] tiene que ser el punto i: un hueco (null), no un salto.
    expect(etiqueta).toContain('screen.push(null)');
  });

  it('una etiqueta por parte, con su guia a cada punto', () => {
    expect(etiqueta.match(/className="attach-callout"/g)?.length).toBe(1);
    expect(etiqueta).toContain('s.pins.map(');
  });
});
