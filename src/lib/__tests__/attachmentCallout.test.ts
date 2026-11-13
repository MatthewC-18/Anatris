// LA ETIQUETA DE ORIGEN / INSERCION DE EXPLORAR: UNA, EN PANTALLA, SIN TAPAR
// LOS PUNTOS NI CRUZARSE CON SUS LINEAS.
//
// El usuario: "cuando pulso origen sale muy grande, uno encima de otro, y no se
// lee". Era un cartel 3D de 5 cm por cada punto, todos con el mismo texto. Estas
// pruebas atan el arreglo: la colocacion y las lineas (puras), las franjas
// reservadas, el tope de tamano de los puntos 3D y que el cartel 3D no vuelva.
// Los casos "medidos" salen de capturas en Chrome sin cabeza a 1440 x 900 con el
// origen del pectoral mayor (lienzo de 840 x 834).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CALLOUT_GAP,
  CALLOUT_MARGIN,
  PIN_CLEARANCE,
  RING_RADIUS,
  RING_RADIUS_MIN,
  leaderPath,
  pinScreenScale,
  placeCallout,
  ringRadii,
  type CalloutPlacement,
  type CalloutSide,
  type ScreenPoint,
} from '../attachmentCallout';
import { toolbarReserve } from '../stageToolbar';

const W = 900;
const H = 700;
const LW = 160;
const LH = 38;

/** La caja de la etiqueta tapa algun punto (centro dentro de la caja). */
function cubre(p: { left: number; top: number }, pins: ScreenPoint[], w = LW, h = LH): boolean {
  return pins.some((q) => q.x >= p.left && q.x <= p.left + w && q.y >= p.top && q.y <= p.top + h);
}

/**
 * Algun punto queda tan cerca de la caja que su halo la toca. Fijo aqui y no
 * importado: el halo 3D llega a 11 px de radio con su pulso (22 px de diametro,
 * AttachmentMarkers) y el anillo de pantalla a 7; si alguien baja PIN_CLEARANCE
 * por debajo de eso, estas pruebas tienen que fallar.
 */
const AIRE_HALO = 11;
function pegado(p: { left: number; top: number }, pins: ScreenPoint[], w = LW, h = LH): boolean {
  const c = AIRE_HALO;
  return pins.some(
    (q) => q.x >= p.left - c && q.x <= p.left + w + c && q.y >= p.top - c && q.y <= p.top + h + c,
  );
}

/** Muestras de la curva de leaderPath que caen DENTRO de la caja (1 px hacia dentro). */
function muestrasDentro(p: CalloutPlacement, pin: ScreenPoint, w: number, h: number): number {
  const d = leaderPath({ left: p.left, top: p.top, width: w, height: h }, pin);
  const n = d.match(/-?\d+(\.\d+)?(e-?\d+)?/g)!.map(Number);
  const [x0, y0, x1, y1, x2, y2, x3, y3] = n;
  let dentro = 0;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
    if (x > p.left + 1 && x < p.left + w - 1 && y > p.top + 1 && y < p.top + h - 1) dentro++;
  }
  return dentro;
}

/** Grupos de prueba deterministas (un generador lineal, sin Math.random). */
function grupos(ancho: number, alto: number, cuantos: number): ScreenPoint[][] {
  let s = 12345;
  const r = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const out: ScreenPoint[][] = [];
  for (let k = 0; k < cuantos; k++) {
    const n = 1 + Math.floor(r() * 10);
    const cx = r() * ancho;
    const cy = r() * alto;
    const sx = r() * ancho * 0.9;
    const sy = r() * alto * 1.1;
    const g: ScreenPoint[] = [];
    for (let i = 0; i < n; i++) {
      g.push({
        x: Math.min(ancho + 15, Math.max(-15, cx + (r() - 0.5) * sx)),
        y: Math.min(alto + 15, Math.max(-15, cy + (r() - 0.5) * sy)),
      });
    }
    out.push(g);
  }
  return out;
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
    // Centrada sobre el grupo.
    expect(p.left + LW / 2).toBeCloseTo(440, 6);
    expect(cubre(p, pins)).toBe(false);
  });

  it('debajo si el grupo esta abajo', () => {
    const pins = [{ x: 450, y: 520 }];
    const p = placeCallout(pins, W, H, LW, LH)!;
    expect(p.side).toBe('below');
    expect(p.top).toBeGreaterThanOrEqual(520 + CALLOUT_GAP - 0.001);
    expect(cubre(p, pins)).toBe(false);
  });

  it('con la camara muy cerca (el grupo llena el alto) va al lado, sin tapar ningun punto', () => {
    // Los puntos ocupan del techo al suelo del lienzo: ni encima ni debajo cabe.
    const pins = [
      { x: 300, y: 30 },
      { x: 340, y: 360 },
      { x: 320, y: 680 },
    ];
    const p = placeCallout(pins, W, H, LW, LH)!;
    expect(['left', 'right']).toContain(p.side);
    expect(pegado(p, pins)).toBe(false);
  });

  it('en una rejilla de grupos de dos puntos nunca tapa un punto', () => {
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

  it('un punto pegado al borde de la caja cuenta como tapado: su anillo caeria sobre el texto', () => {
    // Revision adversarial: contar solo el centro del punto dejaba la etiqueta a
    // 1-2 px de el, con su anillo (7 px de radio) y su halo encima del texto.
    // Aqui, sin el aire, la etiqueta iria debajo a 2 px del punto de abajo.
    const pins = [
      { x: 450, y: 30 },
      { x: 450, y: 690 },
      { x: 20, y: 360 },
      { x: 880, y: 360 },
    ];
    const p = placeCallout(pins, W, H, LW, LH)!;
    expect(pegado(p, pins)).toBe(false);
    expect(PIN_CLEARANCE).toBeGreaterThanOrEqual(AIRE_HALO);
  });

  it('si no cabe ni encima, ni debajo, ni al lado, busca un hueco libre en toda la banda', () => {
    // Revision adversarial: solo se probaban dos esquinas y se tapaba un punto
    // con media banda libre.
    const pins = [
      { x: 60, y: 20 },
      { x: 800, y: 20 },
      { x: 430, y: 30 },
      { x: 790, y: 355 },
      { x: 430, y: 690 },
    ];
    const p = placeCallout(pins, W, H, LW, LH)!;
    expect(pegado(p, pins)).toBe(false);
  });

  it('en el movil, con una etiqueta ancha, tampoco tapa un punto si hay hueco', () => {
    const pins = [
      { x: 213, y: 118 },
      { x: 228, y: 385 },
      { x: 252, y: 618 },
    ];
    const p = placeCallout(pins, 390, 800, 217, LH, { top: 72, bottom: 136 })!;
    expect(pegado(p, pins, 217)).toBe(false);
  });

  it('encuentra huecos mas estrechos que la rejilla del barrido', () => {
    // Segunda revision adversarial: con una rejilla de 12 px el hueco libre
    // (1 px de ancho aqui, 6 px de alto en el segundo caso) no tenia candidato
    // y la etiqueta acababa con un punto debajo del texto. El primero son
    // puntos reales del pectoral, con la camara dentro del torax en un lienzo
    // apaisado de movil; el segundo, una columna de puntos.
    const pectoral = [
      { x: 190, y: 109 },
      { x: 673, y: 109 },
      { x: 450, y: 174 },
      { x: 402, y: 174 },
      { x: 478, y: 113 },
      { x: 379, y: 113 },
      { x: 338, y: 260 },
      { x: 512, y: 260 },
      { x: 346, y: 228 },
      { x: 505, y: 228 },
    ];
    const a = placeCallout(pectoral, 844, 300, 170, LH, { top: 72, bottom: 138 })!;
    expect(cubre(a, pectoral, 170)).toBe(false);
    expect(pegado(a, pectoral, 170)).toBe(false);
    const columna = [
      { x: 176, y: 100 },
      { x: 205, y: 168 },
      { x: 188, y: 228 },
      { x: 214, y: 288 },
      { x: 181, y: 348 },
      { x: 209, y: 408 },
      { x: 190, y: 468 },
      { x: 200, y: 528 },
      { x: 186, y: 588 },
    ];
    const b = placeCallout(columna, 390, 778, 217, LH, { top: 72, bottom: 138 })!;
    expect(cubre(b, columna, 217)).toBe(false);
    expect(pegado(b, columna, 217)).toBe(false);
  });

  it('si no hay ningun hueco, prefiere rozar puntos a tenerlos debajo del texto', () => {
    // Una rejilla de puntos tan densa que ninguna caja queda libre del todo.
    const pins: ScreenPoint[] = [];
    for (let x = 20; x < 400; x += 45) for (let y = 20; y < 300; y += 45) pins.push({ x, y });
    const p = placeCallout(pins, 400, 300, 120, LH)!;
    const debajo = pins.filter(
      (q) => q.x >= p.left && q.x <= p.left + 120 && q.y >= p.top && q.y <= p.top + LH,
    ).length;
    expect(debajo).toBe(0);
  });
});

describe('las lineas guia no cruzan la etiqueta', () => {
  it('el caso medido: la etiqueta a la altura de las claviculas, con las lineas por fuera', () => {
    // Captura del pectoral muy cerca (paso 13): la etiqueta, apretada arriba,
    // quedaba entre los dos puntos de las claviculas y sus lineas, que salian
    // todas del borde de abajo, volvian a subir cruzando el texto.
    const pins = [
      { x: 602, y: 84 },
      { x: 238, y: 84 },
      { x: 368, y: 385 },
      { x: 472, y: 385 },
      { x: 357, y: 145 },
      { x: 483, y: 145 },
      { x: 702, y: 850 },
      { x: 138, y: 850 },
      { x: 644, y: 645 },
      { x: 196, y: 645 },
    ];
    const visibles = pins.filter((q) => q.y <= 834 + 20);
    const p = placeCallout(visibles, 840, 834, 170, LH, { top: 72, bottom: 82 })!;
    expect(pegado(p, visibles, 170)).toBe(false);
    for (const q of visibles) expect(muestrasDentro(p, q, 170, LH)).toBe(0);
  });

  it('en ningun grupo de un barrido (escritorio y movil) una linea entra en la etiqueta', () => {
    const casos = [
      { w: 840, h: 834, lw: 170, reserve: { top: 72, bottom: 80 } },
      { w: 390, h: 778, lw: 170, reserve: { top: 72, bottom: 138 } },
    ];
    let dentro = 0;
    let total = 0;
    for (const c of casos) {
      for (const g of grupos(c.w, c.h, 600)) {
        const p = placeCallout(g, c.w, c.h, c.lw, LH, c.reserve)!;
        for (const q of g) {
          // Un punto tapado (solo si no habia ningun hueco) no cuenta: no hay
          // borde que lo mire.
          if (q.x >= p.left && q.x <= p.left + c.lw && q.y >= p.top && q.y <= p.top + LH) continue;
          total++;
          if (muestrasDentro(p, q, c.lw, LH) > 0) dentro++;
        }
      }
    }
    expect(total).toBeGreaterThan(3000);
    expect(dentro).toBe(0);
  });

  it('cada linea sale por el borde que mira a su punto', () => {
    const box = { left: 100, top: 100, width: 160, height: 38 };
    expect(leaderPath(box, { x: 180, y: 20 }).startsWith('M180,100')).toBe(true); // arriba
    expect(leaderPath(box, { x: 180, y: 300 }).startsWith('M180,138')).toBe(true); // abajo
    expect(leaderPath(box, { x: 400, y: 120 }).startsWith('M260,119')).toBe(true); // derecha
    expect(leaderPath(box, { x: 10, y: 110 }).startsWith('M100,119')).toBe(true); // izquierda
  });

  it('un punto debajo de la etiqueta no lleva linea (cruzaria el texto)', () => {
    const box = { left: 100, top: 100, width: 160, height: 38 };
    expect(leaderPath(box, { x: 150, y: 120 })).toBe('');
  });
});

describe('la etiqueta no salta de lado mientras su sitio siga libre', () => {
  it('el caso medido: el encuadre deja el grupo a 0,5 px de la mitad', () => {
    // Vista del pectoral al pulsar Origen: centro del grupo en y = 417,5 de un
    // lienzo de 834. Medio pixel de camara bastaba para cambiar de lado.
    const base = [
      { x: 442, y: 377 },
      { x: 398, y: 377 },
      { x: 415, y: 414 },
      { x: 425, y: 414 },
      { x: 413, y: 387 },
      { x: 427, y: 387 },
      { x: 447, y: 458 },
      { x: 393, y: 458 },
      { x: 442, y: 439 },
      { x: 398, y: 439 },
    ];
    const reserve = { top: 72, bottom: 82 };
    let prev: CalloutPlacement | null = null;
    const lados = new Set<CalloutSide>();
    for (const dy of [0, -1, 1, -2, 2, -0.6, 0.6, -3, 3]) {
      const pins = base.map((q) => ({ x: q.x, y: q.y + dy }));
      const p: CalloutPlacement = placeCallout(pins, 840, 834, 170, LH, reserve, prev)!;
      lados.add(p.side);
      prev = p;
    }
    expect(lados.size).toBe(1);
    // Sin el sitio anterior, ese mismo temblor si cambia de lado: la memoria es
    // la que lo sujeta.
    const sinMemoria = new Set(
      [-1, 1].map((dy) => placeCallout(base.map((q) => ({ x: q.x, y: q.y + dy })), 840, 834, 170, LH, reserve)!.side),
    );
    expect(sinMemoria.size).toBe(2);
  });

  it('al acercar la camara no cruza el grupo mientras su sitio siga libre', () => {
    // Segunda revision adversarial: al acercar la camara desde el encuadre (la
    // etiqueta debajo) hasta la captura de casi la barra, en un fotograma
    // saltaba ENCIMA, 570 px, con su sitio de debajo aun libre. Se interpolan
    // las dos capturas medidas, punto a punto, pasando el sitio anterior.
    const desde = [
      { x: 442, y: 377 },
      { x: 398, y: 377 },
      { x: 415, y: 414 },
      { x: 425, y: 414 },
      { x: 413, y: 387 },
      { x: 427, y: 387 },
      { x: 447, y: 458 },
      { x: 393, y: 458 },
      { x: 442, y: 439 },
      { x: 398, y: 439 },
    ];
    const hasta = [
      { x: 554, y: 173 },
      { x: 286, y: 173 },
      { x: 384, y: 395 },
      { x: 456, y: 395 },
      { x: 375, y: 223 },
      { x: 465, y: 223 },
      { x: 612, y: 712 },
      { x: 228, y: 712 },
      { x: 573, y: 573 },
      { x: 267, y: 573 },
    ];
    const reserve = { top: 72, bottom: 80 };
    let prev: CalloutPlacement | null = null;
    let salto = 0;
    for (let k = 0; k <= 200; k++) {
      const t = k / 200;
      const pins = desde.map((a, i) => ({ x: a.x + (hasta[i].x - a.x) * t, y: a.y + (hasta[i].y - a.y) * t }));
      const p: CalloutPlacement = placeCallout(pins, 840, 834, 170, LH, reserve, prev)!;
      expect(pegado(p, pins, 170)).toBe(false);
      if (prev) salto = Math.max(salto, Math.hypot(p.left - prev.left, p.top - prev.top));
      prev = p;
    }
    expect(salto).toBeLessThan(60);
  });

  it('si su sitio deja de estar libre, cambia', () => {
    const anterior: CalloutPlacement = { left: 335, top: 300, side: 'above' };
    const pins = [
      { x: 420, y: 100 },
      { x: 420, y: 495 },
    ];
    const p = placeCallout(pins, 840, 834, 170, LH, { top: 72, bottom: 82 }, anterior)!;
    expect(p.side).not.toBe('above');
    expect(pegado(p, pins, 170)).toBe(false);
  });
});

describe('la etiqueta no se mete bajo la barra de vistas', () => {
  // Medido en Explorar a 1440 x 900 acercando la camara al origen del pectoral:
  // la etiqueta caia en y 818-856 de la pagina y la barra ocupa 820-875; no se
  // veia. El lienzo era de 840 x 834 y la barra ocupaba sus 80 px de abajo.
  const CW = 840;
  const CH = 834;
  const RESERVA = { top: 72, bottom: 80 };
  const fuera = (p: { top: number }) =>
    p.top >= RESERVA.top + CALLOUT_MARGIN - 0.001 && p.top + LH <= CH - RESERVA.bottom - CALLOUT_MARGIN + 0.001;

  it('el caso medido: el grupo baja hasta casi la barra y la etiqueta no va debajo', () => {
    // Los diez puntos de esa captura, en px del lienzo.
    const pins = [
      { x: 554, y: 173 },
      { x: 286, y: 173 },
      { x: 384, y: 395 },
      { x: 456, y: 395 },
      { x: 375, y: 223 },
      { x: 465, y: 223 },
      { x: 612, y: 712 },
      { x: 228, y: 712 },
      { x: 573, y: 573 },
      { x: 267, y: 573 },
    ];
    const p = placeCallout(pins, CW, CH, 170, LH, RESERVA)!;
    expect(fuera(p)).toBe(true);
    expect(pegado(p, pins, 170)).toBe(false);
  });

  it('en un barrido de grupos nunca pisa las franjas reservadas', () => {
    let pisa = 0;
    for (const g of grupos(CW, CH, 800)) {
      const p = placeCallout(g, CW, CH, LW, LH, RESERVA)!;
      if (!fuera(p)) pisa++;
    }
    expect(pisa).toBe(0);
  });

  it('en un lienzo bajo suelta antes la franja de arriba que la barra', () => {
    // Revision adversarial: se soltaban las dos a la vez y la etiqueta acababa
    // entera debajo de la barra, con sitio libre encima.
    const p = placeCallout([{ x: 200, y: 60 }], 400, 150, LW, LH, RESERVA)!;
    expect(p.top).toBeGreaterThanOrEqual(CALLOUT_MARGIN);
    expect(p.top + LH).toBeLessThanOrEqual(150 - RESERVA.bottom - CALLOUT_MARGIN + 0.001);
  });
});

describe('los anillos de puntos muy juntos no se montan', () => {
  // La vista con que se abre el origen del pectoral, medida en Chrome sin
  // cabeza: con anillos fijos de 7 px de radio, 1 par montado en escritorio
  // (a 10 px) y 8 en el movil (a 6-13 px), un racimo de circulos.
  const escritorio = [
    { x: 442, y: 377 },
    { x: 398, y: 377 },
    { x: 415, y: 414 },
    { x: 425, y: 414 },
    { x: 413, y: 387 },
    { x: 427, y: 387 },
    { x: 447, y: 458 },
    { x: 393, y: 458 },
    { x: 442, y: 439 },
    { x: 398, y: 439 },
  ];
  const movil = [
    { x: 206, y: 435 },
    { x: 184, y: 435 },
    { x: 192, y: 453 },
    { x: 198, y: 453 },
    { x: 192, y: 440 },
    { x: 198, y: 440 },
    { x: 208, y: 475 },
    { x: 182, y: 475 },
    { x: 206, y: 466 },
    { x: 184, y: 466 },
  ];
  const montados = (pts: ScreenPoint[], r: number[]) => {
    let n = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < r[i] + r[j]) n++;
      }
    }
    return n;
  };

  it('el caso medido: ningun par montado, ni en escritorio ni en el movil', () => {
    expect(montados(escritorio, escritorio.map(() => RING_RADIUS))).toBe(1);
    expect(montados(movil, movil.map(() => RING_RADIUS))).toBe(8);
    expect(montados(escritorio, ringRadii(escritorio))).toBe(0);
    expect(montados(movil, ringRadii(movil))).toBe(0);
  });

  it('un punto aislado conserva su anillo entero, y uno que no se ve no tiene', () => {
    expect(ringRadii([{ x: 10, y: 10 }, { x: 300, y: 300 }])).toEqual([RING_RADIUS, RING_RADIUS]);
    expect(ringRadii([{ x: 10, y: 10 }, null])).toEqual([RING_RADIUS, 0]);
  });

  it('nunca por debajo del minimo, aunque dos puntos coincidan', () => {
    const r = ringRadii([
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    ]);
    expect(Math.min(...r)).toBe(RING_RADIUS_MIN);
  });
});

describe('la barra de vistas, medida', () => {
  // Sin navegador: un documento y un lienzo de mentira con los rectangulos
  // medidos (1440 x 900: lienzo hasta y = 900, barra desde y = 818).
  const lienzo = (bottom: number, top = 66) =>
    ({ getBoundingClientRect: () => ({ top, bottom }) }) as unknown as HTMLElement;
  const conBarra = (rect: { top: number; bottom: number; height: number } | null, fn: () => void) => {
    const antes = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = {
      querySelector: () => (rect ? { getBoundingClientRect: () => rect } : null),
    };
    try {
      fn();
    } finally {
      (globalThis as { document?: unknown }).document = antes;
    }
  };

  it('ocupa desde el borde de ARRIBA de la barra hasta el pie del lienzo', () => {
    conBarra({ top: 818, bottom: 875, height: 57 }, () => expect(toolbarReserve(lienzo(900))).toBe(82));
    // Tableta (768 x 1024): la barra sube por encima de Indice y Ficha.
    conBarra({ top: 886, bottom: 948, height: 62 }, () => expect(toolbarReserve(lienzo(1024))).toBe(138));
  });

  it('sin barra, oculta o fuera del lienzo, no reserva nada', () => {
    conBarra(null, () => expect(toolbarReserve(lienzo(900))).toBe(0));
    conBarra({ top: 0, bottom: 0, height: 0 }, () => expect(toolbarReserve(lienzo(900))).toBe(0));
    conBarra({ top: 950, bottom: 1000, height: 50 }, () => expect(toolbarReserve(lienzo(900))).toBe(0));
  });
});

describe('el punto 3D no crece sin limite al acercar la camara', () => {
  // Halo de 26 mm, camara de 45 grados en un lienzo de 834 px de alto.
  const HALO = 0.026;
  const FOV = 45;
  const ALTO = 834;
  const px = (depth: number, zoom = 1) =>
    (HALO * ALTO * zoom) / (2 * depth * Math.tan((FOV * Math.PI) / 360));

  it('lejos no se toca', () => {
    expect(pinScreenScale(HALO, 3, FOV, ALTO, 22)).toBe(1);
  });

  it('cerca se queda justo en el tope', () => {
    for (const depth of [0.3, 0.1, 0.03]) {
      const s = pinScreenScale(HALO, depth, FOV, ALTO, 22);
      expect(s).toBeLessThan(1);
      expect(px(depth) * s).toBeCloseTo(22, 6);
    }
  });

  it('detras de la camara o sin tamano, escala 1', () => {
    expect(pinScreenScale(HALO, 0, FOV, ALTO, 22)).toBe(1);
    expect(pinScreenScale(HALO, -1, FOV, ALTO, 22)).toBe(1);
    expect(pinScreenScale(0, 1, FOV, ALTO, 22)).toBe(1);
  });

  it('cuenta el zoom de la camara', () => {
    const s = pinScreenScale(HALO, 0.3, FOV, ALTO, 22, 2);
    expect(px(0.3, 2) * s).toBeCloseTo(22, 6);
  });
});

describe('el cartel 3D por punto no vuelve', () => {
  const marcadores = readFileSync('src/components/AttachmentMarkers.tsx', 'utf8');
  const etiqueta = readFileSync('src/components/AttachmentCallout.tsx', 'utf8');
  const atlas = readFileSync('src/components/AtlasLabels.tsx', 'utf8');

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
    // Una etiqueta JSX en minusculas (<div, <svg...), no un generico de
    // TypeScript (useRef<number[]>), que va pegado a un nombre.
    expect(cuerpo.slice(0, hasta)).not.toMatch(/(^|[\s({>])<[a-z]/m);
    expect(etiqueta).not.toContain("from 'react-dom'");
  });

  it('las guias no se desalinean si un punto queda detras de la camara', () => {
    // screen[i] tiene que ser el punto i: un hueco (null), no un salto.
    expect(etiqueta).toContain('screen.push(null)');
  });

  it('una etiqueta por parte, con su guia a cada punto, cada una por su borde', () => {
    expect(etiqueta.match(/className="attach-callout"/g)?.length).toBe(1);
    expect(etiqueta).toContain('s.pins.map(');
    expect(etiqueta).toContain('leaderPath(box, p)');
  });

  it('el proyector da a cada anillo el radio de ringRadii', () => {
    expect(etiqueta).toContain('ringRadii(screen, radii)');
    expect(etiqueta).toMatch(/firstElementChild\?\.setAttribute\('r'/);
  });

  it('el proyector pasa a la colocacion las franjas medidas y el sitio anterior, y lo guarda', () => {
    expect(etiqueta).toMatch(/placeCallout\([\s\S]*?reserve,\s*last\.current,?\s*\)/);
    expect(etiqueta).toContain('last.current = where;');
    // Y lo olvida al cambiar lo que se nombra.
    expect(etiqueta).toMatch(/if \(s !== lastState\.current\) \{\s*last\.current = null;/);
  });

  it('el aire de la etiqueta cubre el halo de los puntos 3D', () => {
    // Si alguien sube el tope del halo, el aire tiene que subir con el.
    const m = marcadores.match(/const HALO_MAX_PX = (\d+);/);
    expect(m).not.toBeNull();
    expect(Number(m![1]) / 2).toBeLessThanOrEqual(PIN_CLEARANCE);
  });

  it('la etiqueta y los nombres del atlas miden la barra de vistas por su marca, y la barra la lleva', () => {
    // Medido a 768 x 1024: con una franja fija, cuatro nombres del atlas
    // quedaban detras de la barra al bajar el modelo (lib/stageToolbar).
    const barra = readFileSync('src/components/ViewToolbar.tsx', 'utf8');
    const medida = readFileSync('src/lib/stageToolbar.ts', 'utf8');
    expect(barra).toContain('data-stage-toolbar=""');
    expect(medida).toContain("'[data-stage-toolbar]'");
    expect(etiqueta).toContain('toolbarReserve(gl.domElement)');
    expect(atlas).toContain('toolbarReserve(gl.domElement)');
    expect(atlas).toMatch(/stackColumn\(leftCol, size\.height, LABEL_GAP, PAD_TOP, padBottom\.current\)/);
    expect(atlas).toMatch(/stackColumn\(rightCol, size\.height, LABEL_GAP, PAD_TOP, padBottom\.current\)/);
  });

  it('los dos proyectores ponen la camara al dia antes de proyectar', () => {
    const proyector = etiqueta.slice(etiqueta.indexOf('export function AttachmentProjector'));
    expect(proyector.indexOf('camera.updateMatrixWorld()')).toBeGreaterThan(-1);
    expect(proyector.indexOf('camera.updateMatrixWorld()')).toBeLessThan(proyector.indexOf('.project(camera)'));
    const atlasProyector = atlas.slice(atlas.indexOf('export function AtlasProjector'));
    expect(atlasProyector.indexOf('camera.updateMatrixWorld()')).toBeGreaterThan(-1);
    expect(atlasProyector.indexOf('camera.updateMatrixWorld()')).toBeLessThan(atlasProyector.indexOf('.project(camera)'));
  });

  it('los puntos 3D llevan el tope en pantalla, contando el pulso del halo', () => {
    expect(marcadores).toContain('pinScreenScale(');
    expect(marcadores).toContain('HALO_RADIUS * 2 * (1 + HALO_PULSE)');
    expect(marcadores).toMatch(/const HALO_MAX_PX = \d+;/);
  });
});
