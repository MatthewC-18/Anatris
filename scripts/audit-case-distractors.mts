// ¿SE PUEDE RESPONDER UN PASO DE CASO CLINICO SIN RAZONAR?
//
// La explicacion completa del defecto, con el ejemplo que lo destapo, esta en
// src/lib/caseDistractors.ts, que es donde vive la deteccion. Este script solo
// la pasea por los 15 casos y la imprime opcion por opcion, para poder ver DE
// QUE region es cada distractor y no solo el veredicto.
//
// El test de regresion (src/lib/__tests__/caseDistractors.test.ts) comprueba lo
// mismo dentro de `npm test`; esto es la hoja para trabajar.
//
// Run: npm run audit-cases
import { SHOULDER_CASES } from '../src/data/cases/shoulder.ts';
import { ANKLE_CASES } from '../src/data/cases/ankle.ts';
import { CERVICAL_CASES } from '../src/data/cases/cervical.ts';
import { ELBOW_CASES } from '../src/data/cases/elbow.ts';
import { HIP_CASES } from '../src/data/cases/hip.ts';
import { KNEE_CASES } from '../src/data/cases/knee.ts';
import { LUMBAR_CASES } from '../src/data/cases/lumbar.ts';
import { THORACIC_CASES } from '../src/data/cases/thoracic.ts';
import { SHOULDER_ORTHOPEDIC_TESTS } from '../src/data/orthopedicTests/shoulder.ts';
import { ANKLE_ORTHOPEDIC_TESTS } from '../src/data/orthopedicTests/ankle.ts';
import { CERVICAL_ORTHOPEDIC_TESTS } from '../src/data/orthopedicTests/cervical.ts';
import { ELBOW_ORTHOPEDIC_TESTS } from '../src/data/orthopedicTests/elbow.ts';
import { HIP_ORTHOPEDIC_TESTS } from '../src/data/orthopedicTests/hip.ts';
import { KNEE_ORTHOPEDIC_TESTS } from '../src/data/orthopedicTests/knee.ts';
import { LUMBAR_ORTHOPEDIC_TESTS } from '../src/data/orthopedicTests/lumbar.ts';
import { THORACIC_ORTHOPEDIC_TESTS } from '../src/data/orthopedicTests/thoracic.ts';
import { buildTestNeedles, readStepDistractors } from '../src/lib/caseDistractors.ts';
import type { ClinicalCase } from '../src/types/clinicalCase';
import type { OrthopedicTest } from '../src/types/orthopedicTest';

const CASES: Record<string, ClinicalCase[]> = {
  shoulder: SHOULDER_CASES, ankle: ANKLE_CASES, cervical: CERVICAL_CASES,
  elbow: ELBOW_CASES, hip: HIP_CASES, knee: KNEE_CASES,
  lumbar: LUMBAR_CASES, thoracic: THORACIC_CASES,
};
const TESTS: Record<string, OrthopedicTest[]> = {
  shoulder: SHOULDER_ORTHOPEDIC_TESTS, ankle: ANKLE_ORTHOPEDIC_TESTS,
  cervical: CERVICAL_ORTHOPEDIC_TESTS, elbow: ELBOW_ORTHOPEDIC_TESTS,
  hip: HIP_ORTHOPEDIC_TESTS, knee: KNEE_ORTHOPEDIC_TESTS,
  lumbar: LUMBAR_ORTHOPEDIC_TESTS, thoracic: THORACIC_ORTHOPEDIC_TESTS,
};

const namedTestsIn = buildTestNeedles(TESTS);

let failures = 0;
let asking = 0;
const rows: string[] = [];

for (const [region, list] of Object.entries(CASES)) {
  for (const c of list) {
    for (const s of c.steps) {
      const r = readStepDistractors(s, region, namedTestsIn);
      if (!r.asksForATest) continue;
      asking++;
      if (r.answerableByRegionAlone) failures++;
      rows.push(
        `  ${r.answerableByRegionAlone ? 'MAL' : 'OK '} ${region.padEnd(9)} ` +
        `${c.id.padEnd(26)} ${s.id.padEnd(4)} ${r.sameRegion}/${r.total} opciones son de la region` +
        (r.answerableByRegionAlone ? '  <- la region regala la respuesta' : ''),
      );
      for (const o of r.options) {
        const where = o.named.length ? o.named.map((n) => n.region).join('+') : 'sin prueba';
        rows.push(`        ${o.correct ? '*' : ' '} [${where.padEnd(9)}] ${o.text}`);
      }
    }
  }
}

console.log('===== OPCIONES DE PRUEBA: LA REGION NO PUEDE REGALAR LA RESPUESTA =====');
console.log('');
console.log(rows.join('\n'));
console.log('');
console.log(`  ${asking} paso(s) preguntan por una prueba.`);
console.log(
  failures === 0
    ? '  En todos hay mas de una prueba de la region, asi que hay que razonar.'
    : `  ${failures} se resuelven mirando solo de que parte del cuerpo es cada opcion.`,
);
console.log('');
if (failures > 0) process.exitCode = 1;
