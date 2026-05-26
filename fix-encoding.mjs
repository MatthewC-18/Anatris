// fix-encoding.mjs — repara doble mojibake en archivos UTF-8 válidos.
//   node fix-encoding.mjs            (modo prueba: solo reporta)
//   node fix-encoding.mjs --write    (aplica, con backup .bak)

import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const WRITE = process.argv.includes('--write');
const ROOT = 'src';
const EXTS = new Set(['.ts', '.tsx']);
const SIG = /Ã.|Â./;

function reverseOnce(text) {
  return Buffer.from(text, 'latin1').toString('utf8');
}

// Aplica reversión hasta limpiar la firma, máx 3 pasadas. Devuelve
// {text, passes} o null si no se pudo limpiar de forma fiable.
function fix(text) {
  let cur = text;
  for (let pass = 1; pass <= 3; pass++) {
    const next = reverseOnce(cur);
    if (next === cur) break;
    cur = next;
    if (!SIG.test(cur)) return { text: cur, passes: pass };
  }
  return null;
}

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const fp = join(d, f);
    if (statSync(fp).isDirectory()) walk(fp);
    else if (EXTS.has(extname(f))) files.push(fp);
  }
})(ROOT);

let affected = 0;
for (const fp of files) {
  const original = readFileSync(fp, 'utf8');
  if (!SIG.test(original)) continue;
  affected++;

  const result = fix(original);
  if (!result) {
    console.log(`SKIP  ${fp} — no se pudo limpiar sin riesgo`);
    continue;
  }
  const ratio = result.text.length / original.length;
  if (ratio < 0.7 || ratio > 1.05) {
    console.log(`SKIP  ${fp} — cambio de tamaño sospechoso (${ratio.toFixed(2)}x)`);
    continue;
  }

  if (WRITE) {
    writeFileSync(`${fp}.bak`, original, 'utf8');
    writeFileSync(fp, result.text, 'utf8');
    console.log(`FIXED ${fp} (${result.passes} pasada/s, .bak guardado)`);
  } else {
    // Modo prueba: muestra un ejemplo de antes/después.
    const o = original.split('\n');
    const n = result.text.split('\n');
    let ex = '';
    for (let i = 0; i < o.length; i++) {
      if (o[i] !== n[i]) {
        ex = `\n      antes: ${o[i].trim().slice(0, 50)}\n      desp.: ${n[i].trim().slice(0, 50)}`;
        break;
      }
    }
    console.log(`WOULD-FIX ${fp} (${result.passes} pasada/s)${ex}`);
  }
}

console.log(`\n${affected} archivo(s) afectado(s). ${WRITE ? 'Aplicado.' : 'Modo prueba — usa --write para aplicar.'}`);