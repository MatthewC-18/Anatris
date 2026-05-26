// fix-mojibake.mjs  — v2, maneja mojibake SIMPLE y DOBLE.
//   node fix-mojibake.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const FILES = [
  'src/data/shoulderRom.ts',
  'src/data/muscles/shoulder.ts',
];

const MOJIBAKE_SIGNATURE = /Ã.|Â.|â€|â‚¬/;

// Una pasada de reversión: trata los chars como bytes latin1 y re-decodifica
// como utf-8.
function reverseOnce(text) {
  return Buffer.from(text, 'latin1').toString('utf8');
}

// Aplica la reversión hasta que desaparezca la firma de mojibake, con tope.
// Devuelve { text, passes } o null si no logró limpiarlo sin romperlo.
function fixMojibake(text) {
  let current = text;
  for (let pass = 1; pass <= 3; pass++) {
    const next = reverseOnce(current);
    // Si la pasada no cambió nada, no hay más que hacer.
    if (next === current) break;
    current = next;
    if (!MOJIBAKE_SIGNATURE.test(current)) {
      return { text: current, passes: pass };
    }
  }
  // Tras las pasadas, ¿quedó limpio?
  if (!MOJIBAKE_SIGNATURE.test(current) && current !== text) {
    return { text: current, passes: 3 };
  }
  return null; // no se pudo limpiar de forma fiable
}

for (const file of FILES) {
  if (!existsSync(file)) {
    console.log(`SKIP  ${file} (no existe)`);
    continue;
  }

  const original = readFileSync(file, 'utf8');

  if (!MOJIBAKE_SIGNATURE.test(original)) {
    console.log(`OK    ${file} (sin mojibake detectable, no se toca)`);
    continue;
  }

  const result = fixMojibake(original);

  if (!result) {
    console.log(`WARN  ${file}: no se pudo limpiar sin riesgo. NO se reescribe.`);
    console.log(`      Pega el diagnóstico de bytes al asistente.`);
    continue;
  }

  const lengthRatio = result.text.length / original.length;
  if (lengthRatio < 0.7 || lengthRatio > 1.05) {
    console.log(`WARN  ${file}: tamaño cambió demasiado (${lengthRatio.toFixed(2)}x). NO se reescribe.`);
    continue;
  }

  writeFileSync(`${file}.bak`, original, 'utf8');
  writeFileSync(file, result.text, 'utf8');
  console.log(`FIXED ${file}  (${result.passes} pasada(s), backup en ${file}.bak)`);

  const o = original.split('\n');
  const f = result.text.split('\n');
  let shown = 0;
  for (let i = 0; i < o.length && shown < 6; i++) {
    if (o[i] !== f[i]) {
      console.log(`      L${i + 1}:  ${o[i].trim().slice(0, 55)}`);
      console.log(`        →  ${f[i].trim().slice(0, 55)}`);
      shown++;
    }
  }
}

console.log('\nListo. Revisa: git diff src/data/  |  npx tsc --noEmit');