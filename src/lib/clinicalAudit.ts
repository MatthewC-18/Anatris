// src/lib/clinicalAudit.ts
//
// Internal-consistency audit of the clinical data layer, as a PURE function so
// both the CLI (scripts/audit-clinical-data.mts) and the regression test
// (src/lib/__tests__/clinicalAudit.test.ts) share exactly one implementation.
//
// It catches the "stale state / forgotten site" class of bug the data layer is
// prone to: a muscleId renamed in one place but not another, a citation to a ref
// that no longer exists (getReference throws in dev), a test demo pointing at a
// movement that isn't drivable, metrics out of range, etc. None of these are
// type errors, so only a data-aware audit finds them.

// BUILD/TEST-ONLY IMPORT. The audit must see EVERY region, including the paid
// ones, so it reads `fullContent` rather than the runtime registries — those
// now carry only the free tier, with premium content fetched behind an
// entitlement check (see data/premiumStore.ts). This module never runs in the
// browser: it is imported by the CLI script and by the regression test only,
// which is what `fullContent.test.ts` enforces.
import {
  ALL_ROM_BY_REGION as ROM_BY_REGION,
  ALL_MUSCLES_BY_REGION as MUSCLES_BY_REGION,
  ALL_TESTS_BY_REGION as ORTHOPEDIC_TESTS_BY_REGION,
  ALL_CASES_BY_REGION as CLINICAL_CASES,
  ALL_PATHOLOGIES as PATHOLOGIES,
} from '../data/fullContent';
import { REFERENCES } from '../data/references';
import { BONE_MAP } from './boneMap';
import type { RomMovement } from '../types/rom';
import type { OrthopedicTest } from '../types/orthopedicTest';
import type { Citation } from '../types/muscleContent';

export interface AuditIssue {
  level: 'ERROR' | 'WARN';
  where: string;
  msg: string;
}

export interface RegionProgress {
  romCites: number;
  romVerified: number;
  testCites: number;
  testVerified: number;
}

export interface AuditResult {
  issues: AuditIssue[];
  progress: Record<string, RegionProgress>;
}

/** Run the full clinical-data consistency audit. Pure: no I/O, no console. */
export function runClinicalAudit(): AuditResult {
  const issues: AuditIssue[] = [];
  const err = (where: string, msg: string) => issues.push({ level: 'ERROR', where, msg });
  const warn = (where: string, msg: string) => issues.push({ level: 'WARN', where, msg });

  const refKeys = new Set(Object.keys(REFERENCES));
  const progress: Record<string, RegionProgress> = {};
  const prog = (region: string): RegionProgress =>
    (progress[region] ??= { romCites: 0, romVerified: 0, testCites: 0, testVerified: 0 });

  // ----- ROM -----
  for (const [region, movements] of Object.entries(ROM_BY_REGION as Record<string, RomMovement[]>)) {
    const muscleIds = new Set((MUSCLES_BY_REGION[region] ?? []).map((m) => m.id));
    const p = prog(region);
    for (const mv of movements) {
      const at = `ROM ${region}/${mv.id}`;
      if (!(mv.id in BONE_MAP)) warn(at, 'sin entrada en BONE_MAP (no se anima en el lab)');

      const rng = mv.totalRangeDeg;
      if (!rng || !isFinite(rng.min) || !isFinite(rng.max) || rng.max < rng.min) {
        err(at, `totalRangeDeg inválido: ${JSON.stringify(rng)}`);
      }

      const checkCites = (cites: Citation[] | undefined, ctx: string) => {
        for (const c of cites ?? []) {
          p.romCites += 1;
          if (c.pageVerified) p.romVerified += 1;
          if (!refKeys.has(c.ref)) err(ctx, `cita a ref inexistente '${c.ref}'`);
        }
      };
      checkCites(mv.rangeCite, `${at} rangeCite`);
      // Measured population values count towards the same progress figure: a
      // primary study with a DOI is a source a reader can actually open, which
      // is more than an unverified page number in a book gives them.
      for (const n of mv.normative ?? []) {
        checkCites([n.cite], `${at} normative`);
        if (!isFinite(n.meanDeg)) err(`${at} normative`, 'meanDeg no es un número');
        if (!n.sample.trim()) err(`${at} normative`, 'falta la muestra');
      }

      const phases = [...(mv.phases ?? []), ...(mv.labReverse?.phases ?? [])];
      for (const ph of phases) {
        checkCites(ph.cite, `${at} fase "${ph.label}"`);
        for (const mu of ph.muscles ?? []) {
          if (muscleIds.size && !muscleIds.has(mu.muscleId)) {
            err(`${at} fase "${ph.label}"`, `muscleId '${mu.muscleId}' no existe en músculos de ${region}`);
          }
        }
      }
      for (const a of mv.activations ?? []) {
        if (muscleIds.size && !muscleIds.has(a.muscleId)) {
          err(`${at} activations`, `muscleId '${a.muscleId}' no existe en ${region}`);
        }
        let prev = -Infinity;
        for (const k of a.curve ?? []) {
          if (k.level < 0 || k.level > 1) err(`${at} activation ${a.muscleId}`, `level fuera de [0,1]: ${k.level}`);
          if (k.deg < prev) warn(`${at} activation ${a.muscleId}`, `curve no ascendente (deg=${k.deg})`);
          prev = k.deg;
        }
      }
    }
  }

  // ----- Orthopedic tests -----
  for (const [region, tests] of Object.entries(
    ORTHOPEDIC_TESTS_BY_REGION as Record<string, OrthopedicTest[]>,
  )) {
    const romIds = new Set((ROM_BY_REGION[region] ?? []).map((m) => m.id));
    const muscleIds = new Set((MUSCLES_BY_REGION[region] ?? []).map((m) => m.id));
    const p = prog(region);
    const seen = new Set<string>();
    for (const t of tests) {
      const at = `TEST ${region}/${t.id}`;
      if (seen.has(t.id)) err(`TEST ${region}`, `id duplicado '${t.id}'`);
      seen.add(t.id);
      if (t.region !== region) warn(at, `campo region='${t.region}' != clave '${region}'`);

      for (const c of t.cite ?? []) {
        p.testCites += 1;
        if (c.verified) p.testVerified += 1;
        if (!refKeys.has(c.ref)) err(at, `cita a ref inexistente '${c.ref}'`);
      }

      const m = t.metrics ?? {};
      for (const key of ['sensitivity', 'specificity'] as const) {
        const v = m[key];
        if (v != null && (v < 0 || v > 100)) err(at, `${key}=${v} fuera de [0,100]`);
      }
      if (t.demo) {
        // LA MANIOBRA DE UNA REGIÓN PUEDE MOVER OTRA ARTICULACIÓN, y en varias
        // pruebas reales TIENE que hacerlo: el Lasègue es una prueba lumbar que
        // se ejecuta flexionando la CADERA, y el Thomas es de cadera y se lee en
        // la rodilla. Exigir que el movimiento estuviera en el ROM de la propia
        // región obligaba a posar la articulación equivocada (el Lasègue estaba
        // puesto como flexión lumbar: el paciente se doblaba hacia delante en
        // vez de elevar la pierna recta). Lo que sí se exige es que el
        // movimiento EXISTA: o está en el ROM de la región, o es accionable en
        // el rig; un id inventado sigue siendo un error.
        if (!romIds.has(t.demo.movementId) && !(t.demo.movementId in BONE_MAP)) {
          err(
            at,
            `demo.movementId '${t.demo.movementId}' no está en el ROM de ${region} ni es accionable`,
          );
        }
        // EL ANGULO DE UN COMPONENTE CABE EN LO QUE EL RIG PUEDE HACER.
        //
        // `clinicalRange` no es decorativo: es el tope hasta el que la malla
        // aguanta sin atravesar el cuerpo. La rotacion interna llega a 100
        // grados en la tabla de ROM --con la mano pasando por detras de la
        // espalda-- pero solo a 70 en la postura de lectura, codo a 90 y brazo
        // al costado, porque a partir de ahi el antebrazo entra en el abdomen.
        // Un componente autorizado por encima del tope no se queja: posa la
        // maniobra atravesando al paciente, que es lo que se ve en pantalla.
        const compAt = (id: string, deg: number) => {
          const ctrl = BONE_MAP[id];
          const r = ctrl && 'clinicalRange' in ctrl ? ctrl.clinicalRange : null;
          if (!r) return;
          if (deg < r.min || deg > r.max) {
            err(
              at,
              `demo: '${id}' a ${deg}° se sale de lo accionable (${r.min}–${r.max}°)`,
            );
          }
        };
        for (const c of t.demo.components ?? []) {
          if (!(c.movementId in BONE_MAP)) {
            err(at, `demo.components: '${c.movementId}' no es accionable en el rig`);
          } else {
            compAt(c.movementId, c.angleDeg);
          }
        }
        if (t.demo.movementId in BONE_MAP) compAt(t.demo.movementId, t.demo.angleDeg);
        const hm = t.demo.highlightMuscleId;
        if (hm && muscleIds.size && !muscleIds.has(hm)) {
          err(at, `demo.highlightMuscleId '${hm}' no existe en ${region}`);
        }

        // QUIEN HACE LA FUERZA, CONTRASTADO CON LA MANIOBRA ESCRITA.
        //
        // El panel imprime instrucciones OPUESTAS segun `examinerForce`: en una
        // resistida pide al paciente que empuje, en una pasiva pide que no lo
        // haga. Siete pruebas de rodilla llevaban la etiqueta resistida solo
        // para que se dibujara la mano, y el panel acababa pidiendo una
        // contraccion en un cajon anterior, donde la contraccion del paciente
        // es justamente lo que enmascara la traslacion.
        //
        // Un booleano no se puede auditar contra nada. Esto si: la maniobra
        // escrita dice si hay resistencia, y la etiqueta tiene que coincidir con
        // su propio texto.
        const says = `${t.maneuver} ${t.positive}`.toLowerCase();
        const saysResisted = /resist|contra\s+resistencia/.test(says);
        if (t.demo.examinerForce === 'applies' && saysResisted) {
          warn(
            at,
            `demo.examinerForce='applies' pero la maniobra habla de resistencia: una de las dos miente`,
          );
        }
        if (t.demo.examinerForce === 'resists' && !saysResisted) {
          warn(
            at,
            `demo.examinerForce='resists' pero ni la maniobra ni el positivo mencionan resistencia`,
          );
        }
      }
      // SE DESCARTA CON UNA PRUEBA SENSIBLE Y SE CONFIRMA CON UNA ESPECIFICA,
      // y cuando la etiqueta no concuerda con la cifra hay que explicarlo.
      //
      // Dos pruebas reales no concuerdan por un buen motivo: la aduccion
      // cruzada se usa para descartar por su valor predictivo negativo (> 94%)
      // y no por su sensibilidad del 77%, y el 72% de la prueba de Roos no es
      // suyo sino la media de todos los tests provocativos de su estudio. Sin
      // una via para decirlo, el aviso era permanente y por tanto invisible:
      // dos avisos que nadie va a quitar ensenan a ignorar la lista entera.
      //
      // Asi que la excepcion se declara en el dato (`utilityBasis`), donde el
      // usuario tambien la lee, y aqui solo se comprueba que exista.
      if (t.utility === 'rule-out' && m.sensitivity != null && m.sensitivity < 80 && !t.utilityBasis) {
        warn(at, `utility 'rule-out' pero sensibilidad ${m.sensitivity} < 80 y sin utilityBasis que lo explique`);
      }
      if (t.utility === 'rule-in' && m.specificity != null && m.specificity < 80 && !t.utilityBasis) {
        warn(at, `utility 'rule-in' pero especificidad ${m.specificity} < 80 y sin utilityBasis que lo explique`);
      }
      // Y UNA ETIQUETA SIN NINGUNA CIFRA DETRAS TAMBIEN HAY QUE DECLARARLA.
      //
      // Las dos reglas de arriba solo miran la cifra CUANDO EXISTE (`!= null`),
      // asi que una prueba que no publica ninguna pasaba limpia llevando la
      // insignia mas fuerte del panel. Medido sobre las 80 pruebas: cuatro
      // decian "Confirma", con el titulo "Alta especificidad (SpPin): un
      // positivo confirma", sin publicar ni sensibilidad ni especificidad
      // --shoulder/relocation, thoracic/adams-forward-bend, hip/hip-log-roll y
      // knee/posterior-sag--, y la nota de relocation dice ella misma que Lo
      // 2004 "no publico sensibilidad ni especificidad de la recolocacion
      // aislada". Otras ocho llevaban "Equilibrado", que AFIRMA que las dos
      // cifras se parecen, teniendo una sola o ninguna.
      //
      // 'weak' no entra: "poca precision aislado, usalo dentro de un grupo" es
      // justo lo que significa no tener cifras, asi que ahi la etiqueta no
      // promete nada que falte.
      //
      // Es la MISMA regla que el panel usa para pintar la palabra en gris
      // (`utilityBacked` en OrthopedicTestsPanel.tsx): si cambia una, cambia la
      // otra, o el panel gris contradice a una auditoria en verde.
      const sinRespaldo =
        (t.utility === 'rule-in' && m.specificity == null) ||
        (t.utility === 'rule-out' && m.sensitivity == null) ||
        (t.utility === 'balanced' && (m.sensitivity == null || m.specificity == null));
      if (sinRespaldo && !t.utilityBasis) {
        warn(
          at,
          `utility '${t.utility}' sin la cifra que lo respalda (Se=${m.sensitivity ?? 's/d'}, ` +
            `Es=${m.specificity ?? 's/d'}) y sin utilityBasis que lo explique`,
        );
      }
      // Y al contrario: una base declarada cuando la cifra YA concuerda sobra,
      // porque entonces no explica ninguna excepcion.
      if (t.utilityBasis) {
        const concuerda =
          (t.utility === 'rule-out' && (m.sensitivity ?? 0) >= 80) ||
          (t.utility === 'rule-in' && (m.specificity ?? 0) >= 80);
        if (concuerda) warn(at, 'utilityBasis sobra: la cifra ya respalda la etiqueta');
      }
    }
  }

  // ----- Movement pathology presets -----
  // A preset points at movement ids and muscle ids that live in OTHER files, so
  // it is exactly the kind of cross-file reference that rots silently. It also
  // carries a single rangeCapDeg shared by every movement in `appliesTo`: a cap
  // above a movement's own max is inert (the preset looks broken in the lab),
  // which is worth a warning.
  const romById = new Map<string, RomMovement>();
  for (const movements of Object.values(ROM_BY_REGION as Record<string, RomMovement[]>)) {
    for (const mv of movements) romById.set(mv.id, mv);
  }
  const allMuscleIds = new Set<string>();
  for (const muscles of Object.values(MUSCLES_BY_REGION)) {
    for (const m of muscles) allMuscleIds.add(m.id);
  }
  const seenPathologies = new Set<string>();
  for (const p of PATHOLOGIES) {
    const at = `PATOLOGIA ${p.id}`;
    if (seenPathologies.has(p.id)) err('PATOLOGIA', `id duplicado '${p.id}'`);
    seenPathologies.add(p.id);

    for (const c of p.cite ?? []) {
      if (!refKeys.has(c.ref)) err(at, `cita a ref inexistente '${c.ref}'`);
    }
    for (const mu of p.implicated ?? []) {
      if (!allMuscleIds.has(mu)) err(at, `implicated '${mu}' no existe en ninguna región`);
    }
    if (!p.appliesTo?.length) err(at, 'appliesTo vacío: el preset nunca se ofrece');
    for (const mvId of p.appliesTo ?? []) {
      const mv = romById.get(mvId);
      if (!mv) {
        err(at, `appliesTo '${mvId}' no es un movimiento de ningún ROM`);
        continue;
      }
      if (p.rangeCapDeg != null && p.rangeCapDeg >= mv.totalRangeDeg.max) {
        warn(
          at,
          `rangeCapDeg ${p.rangeCapDeg} >= max de '${mvId}' (${mv.totalRangeDeg.max}): el tope no se nota`,
        );
      }
      if (p.rangeFloorDeg != null && p.rangeFloorDeg <= mv.totalRangeDeg.min) {
        warn(
          at,
          `rangeFloorDeg ${p.rangeFloorDeg} <= min de '${mvId}' (${mv.totalRangeDeg.min}): el suelo no se nota`,
        );
      }
    }
  }

  // ----- Clinical cases -----
  // Exactly one correct option per step is the invariant the case UI assumes;
  // a step with zero or two correct answers cannot be completed correctly.
  const seenCases = new Set<string>();
  for (const [region, cases] of Object.entries(CLINICAL_CASES)) {
    for (const c of cases) {
      const at = `CASO ${region}/${c.id}`;
      if (seenCases.has(c.id)) err('CASO', `id duplicado '${c.id}'`);
      seenCases.add(c.id);
      if (c.region !== region) warn(at, `campo region='${c.region}' != clave '${region}'`);
      if (!c.steps.length) err(at, 'caso sin pasos');
      for (const s of c.steps) {
        const correct = s.options.filter((o) => o.correct).length;
        if (correct !== 1) {
          err(at, `paso '${s.id}' tiene ${correct} opciones correctas (debe ser 1)`);
        }
        const ids = new Set(s.options.map((o) => o.id));
        if (ids.size !== s.options.length) err(at, `paso '${s.id}' con ids de opción repetidos`);
      }
    }
  }

  return { issues, progress };
}
