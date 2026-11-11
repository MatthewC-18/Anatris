// CUANTAS CAJAS QUEDAN, FICHERO A FICHERO.
//
// El dueno lo dijo asi: "que no tenga el mismo diseno de las otras paginas, que
// son como tarjetas dentro de tarjetas". El sistema LAMINA (src/index.css,
// docs/sistema-lamina.md) lo resuelve con una regla: DENTRO DE UN MARGEN NO HAY
// CAJAS. La jerarquia la hacen el rotulo, el filo, el tamano de la cifra y el
// espacio; nunca un borde redondeado con fondo alrededor de un grupo de cosas.
//
// Una regla asi no se sostiene con buena voluntad: se sostiene contandola. El
// detector esta en src/lib/laminaSurfaces.ts (lo comparte con el test que fija
// en cero los ficheros ya convertidos); esto es la tabla.
//
// Las SUPERFICIES no estan prohibidas: un menu, un modal o la paleta de
// comandos flotan de verdad. La columna existe para que una que deberia ser un
// margen acoplado no pase por menu.
//
// Run:  npm run audit-surfaces            (tabla entera)
//       npm run audit-surfaces -- <ruta>  (solo ese fichero o carpeta, con lineas)

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { auditSurfaces, type SurfaceFinding, type SurfaceKind } from '../src/lib/laminaSurfaces.ts';

const RAIZ = resolve('src');
const filtro = process.argv[2] ? resolve(process.argv[2]) : null;

function ficheros(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (n === '__tests__' || n === 'node_modules') continue;
      ficheros(p, out);
    } else if (n.endsWith('.tsx')) {
      out.push(p);
    }
  }
  return out;
}

interface Fila {
  path: string;
  cajas: number;
  bloques: number;
  pastillas: number;
  superficies: number;
  justificadas: number;
  detalle: SurfaceFinding[];
}

const lista = ficheros(RAIZ).filter((p) => !filtro || p === filtro || p.startsWith(filtro));
const filas: Fila[] = [];
for (const p of lista) {
  const h = auditSurfaces(readFileSync(p, 'utf8'));
  if (h.length === 0) continue;
  const viva = (k: SurfaceKind) => h.filter((x) => x.kind === k && !x.justified).length;
  filas.push({
    path: relative(process.cwd(), p).replace(/\\/g, '/'),
    cajas: viva('caja'),
    bloques: viva('bloque'),
    pastillas: viva('pastilla'),
    superficies: h.filter((x) => x.kind === 'superficie').length,
    justificadas: h.filter((x) => x.justified).length,
    detalle: h,
  });
}
const peso = (f: Fila) => f.cajas + f.bloques + f.pastillas;
filas.sort((a, b) => peso(b) - peso(a) || b.superficies - a.superficies);

const pad = (s: string | number, w: number) => String(s).padStart(w);
console.log('===== CAJAS QUE QUEDAN EN LA INTERFAZ =====');
console.log(
  `  ${'fichero'.padEnd(56)} ${pad('cajas', 6)} ${pad('bloques', 8)} ${pad('pastillas', 10)} ${pad('superf.', 8)} ${pad('justif.', 8)}`,
);
let tc = 0;
let tb = 0;
let tp = 0;
let ts = 0;
let tj = 0;
for (const f of filas) {
  tc += f.cajas;
  tb += f.bloques;
  tp += f.pastillas;
  ts += f.superficies;
  tj += f.justificadas;
  console.log(
    `  ${f.path.padEnd(56)} ${pad(f.cajas, 6)} ${pad(f.bloques, 8)} ${pad(f.pastillas, 10)} ${pad(f.superficies, 8)} ${pad(f.justificadas, 8)}`,
  );
}
console.log(`  ${'TOTAL'.padEnd(56)} ${pad(tc, 6)} ${pad(tb, 8)} ${pad(tp, 10)} ${pad(ts, 8)} ${pad(tj, 8)}`);
console.log('');
console.log(
  `  ${lista.length} ficheros leidos, ${filas.filter((f) => peso(f) > 0).length} con cajas, bloques o pastillas sin justificar.`,
);

// Con un filtro se ensena cada sitio, que es como se trabaja un fichero.
if (filtro) {
  for (const f of filas) {
    console.log('');
    console.log(`--- ${f.path} ---`);
    for (const h of [...f.detalle].sort((a, b) => a.line - b.line)) {
      const marca = h.justified
        ? `ok (${h.justified})`
        : h.kind === 'superficie'
          ? 'superficie'
          : h.kind.toUpperCase();
      console.log(`  ${pad(h.line, 5)}  ${marca.padEnd(12)}  ${h.text}`);
    }
  }
}
