// EL TITULAR DE LA FASE Y LA GEOMETRIA COMPARTIDA DEL ARCO.
//
// El margen rediseñado ensena una frase grande por fase (sacada de su propia
// descripcion, sin escribir contenido nuevo) y alinea las tiras de activacion
// con el pulgar del deslizador. Estas pruebas recorren las 73 fases de los 34
// gestos y atan las reglas que lo hacen posible.

import { describe, it, expect } from 'vitest';
import { ALL_ROM_BY_REGION } from '../../data/fullContent';
import { buildLabArc, phaseAtAngleIn } from '../romPhaseAtAngle';
import { LEAD_MAX, LEAD_MIN_CUT, phaseLead } from '../phaseLead';
import { arcFraction, axisLeft, axisX, effectiveArc, phaseSeekTarget } from '../labArc';
import { grados, sinRango } from '../phaseLabel';
import { neutralMarkLeft } from '../../components/movement/MovementControls';

const MOVIMIENTOS = Object.values(ALL_ROM_BY_REGION).flat();
const FASES = MOVIMIENTOS.flatMap((m) => [...(m.labReverse?.phases ?? []), ...m.phases]);

describe('el titular de una fase', () => {
  it('hay fases que recorrer', () => {
    expect(MOVIMIENTOS.length).toBeGreaterThanOrEqual(30);
    expect(FASES.length).toBeGreaterThanOrEqual(70);
  });

  it('es un prefijo LITERAL de su descripcion: no se escribe contenido nuevo', () => {
    for (const f of FASES) {
      const d = (f.description ?? '').trim();
      if (!d) continue;
      const { lead } = phaseLead(d);
      expect(lead.length, f.label).toBeGreaterThan(0);
      expect(d.startsWith(lead), `${f.label}: «${lead}»`).toBe(true);
    }
  });

  it('nunca pasa de 150 caracteres cuando hay donde cortar, y nunca corta antes de 40', () => {
    for (const f of FASES) {
      const d = (f.description ?? '').trim();
      if (!d) continue;
      const { lead, cut } = phaseLead(d);
      if (cut) {
        expect(lead.length, f.label).toBeLessThanOrEqual(LEAD_MAX);
        expect(lead.length, f.label).toBeGreaterThanOrEqual(LEAD_MIN_CUT);
      }
    }
  });

  it('con corte, lo que sigue empieza en el corte; sin corte, en la oracion siguiente', () => {
    const d =
      'El supraespinoso y el deltoides se activan JUNTOS desde el primer grado (coactivación electromiográfica, no "primero el supraespinoso y luego el deltoides"). Después, el deltoides toma el mando.';
    const a = phaseLead(d);
    expect(a.cut).toBe(true);
    expect(a.lead).toBe('El supraespinoso y el deltoides se activan JUNTOS desde el primer grado');
    expect(a.rest.startsWith('(coactivación electromiográfica')).toBe(true);
    expect(a.rest.endsWith('el deltoides toma el mando.')).toBe(true);
    // Titular y resto cuentan el texto entero, sin perder ni repetir nada.
    expect(`${a.lead} ${a.rest}`).toBe(d);
    // Y unos dos puntos en el corte no se repiten al empezar el resto.
    const c = phaseLead(
      'Pasados los 90° la actividad del deltoides empieza a descender mientras el brazo sigue subiendo: la rotación superior de la escápula (serrato anterior y trapecio inferior) se convierte en el motor de la elevación y lo sigue siendo hasta el final del arco.',
    );
    expect(c.rest.startsWith('la rotación superior')).toBe(true);
    const b = phaseLead('La rotación externa es glenohumeral. Infraespinoso y redondo menor son los motores.');
    expect(b).toEqual({
      lead: 'La rotación externa es glenohumeral.',
      rest: 'Infraespinoso y redondo menor son los motores.',
      cut: false,
    });
  });

  it('no corta en una abreviatura ni en un decimal', () => {
    expect(phaseLead('Gira unos 30°, p. ej. al peinarse. Luego vuelve.').lead).toBe(
      'Gira unos 30°, p. ej. al peinarse.',
    );
    expect(phaseLead('Llega a 1.5 veces el peso. Luego baja.').lead).toBe('Llega a 1.5 veces el peso.');
  });

  it('la abduccion del hombro, medida', () => {
    const abd = MOVIMIENTOS.find((m) => m.id === 'glenohumeral-abduction')!;
    const leads = abd.phases.map((p) => phaseLead(p.description ?? '').lead);
    expect(leads[1]).toBe(
      'La porción acromial (media) del deltoides se vuelve el motor principal y alcanza su máxima ventaja mecánica cerca de los 90°.',
    );
    expect(leads[2]).toBe(
      'Pasados los 90° la actividad del deltoides empieza a descender mientras el brazo sigue subiendo',
    );
  });
});

describe('el nombre de la fase', () => {
  it('pierde su tramo entre parentesis, y nada mas', () => {
    expect(sinRango('Fase de ajuste (0-30°)')).toBe('Fase de ajuste');
    expect(sinRango('Rango medio (deltoides motor)')).toBe('Rango medio (deltoides motor)');
    expect(sinRango('(0-30°)')).toBe('(0-30°)');
  });

  it('los grados negativos llevan el signo tipografico', () => {
    expect(grados(-30)).toBe('−30');
    expect(grados(45.4)).toBe('45');
  });
});

describe('la geometria compartida del arco', () => {
  it('el arco efectivo recorta por el tope y por el suelo del cuadro', () => {
    expect(effectiveArc({ min: -30, max: 180 }, { rangeCapDeg: 115 })).toEqual({ min: -30, max: 115 });
    expect(effectiveArc({ min: 0, max: 105 }, { rangeFloorDeg: 10 })).toEqual({ min: 10, max: 105 });
    expect(effectiveArc({ min: -30, max: 180 }, { rangeCapDeg: 200 })).toEqual({ min: -30, max: 180 });
    expect(effectiveArc({ min: -30, max: 180 }, null)).toEqual({ min: -30, max: 180 });
  });

  it('axisLeft es neutralMarkLeft para cualquier grado (la marca del 0 no se mueve)', () => {
    const pct = (0 - -30) / 210 * 100;
    const viejo = neutralMarkLeft(pct);
    const nuevo = axisLeft(0, -30, 180);
    // Mismo calculo: el desplazamiento del pulgar sale identico.
    expect(nuevo.endsWith(viejo.slice(viejo.lastIndexOf('+')))).toBe(true);
  });

  it('axisX pone el cursor en el CENTRO del pulgar', () => {
    // Un pulgar de 15 px sobre 200 px: su centro va de 7,5 a 192,5.
    expect(axisX(-30, -30, 180, 200)).toBeCloseTo(7.5, 6);
    expect(axisX(180, -30, 180, 200)).toBeCloseTo(192.5, 6);
    expect(axisX(75, -30, 180, 200)).toBeCloseTo(7.5 + 0.5 * 185, 6);
    expect(arcFraction(500, 0, 100)).toBe(1);
  });

  it('ir a una fase nunca cae en un borde compartido: siempre abre ESA fase', () => {
    for (const m of MOVIMIENTOS) {
      const arc = buildLabArc(m);
      arc.phases.forEach((p, i) => {
        const t = phaseSeekTarget(p, arc.min, arc.max);
        if (t == null) return;
        const at = phaseAtAngleIn(arc.phases, t);
        expect(at?.index, `${m.id} · ${p.label} -> ${t}°`).toBe(i);
      });
    }
  });

  it('con el hombro congelado (tope 115°) la elevacion completa no se alcanza', () => {
    const abd = MOVIMIENTOS.find((m) => m.id === 'glenohumeral-abduction')!;
    const arc = buildLabArc(abd);
    const eff = effectiveArc(arc, { rangeCapDeg: 115 });
    const destinos = arc.phases.map((p) => phaseSeekTarget(p, eff.min, eff.max));
    expect(destinos[destinos.length - 1]).toBeNull();
    // La transicion (90 a 120) queda en su parte alcanzable: 90 a 115.
    const trans = arc.phases.findIndex((p) => p.startDeg === 90);
    expect(destinos[trans]).toBe(103);
  });
});

describe('las mayusculas de los textos de fase', () => {
  // `typeset` (LabMarginParts) compone en minuscula seminegrita las palabras en
  // mayusculas de cuatro letras o mas, salvo las siglas de SIGLAS. Si el dato
  // trae una palabra nueva en mayusculas, esta prueba falla hasta que alguien
  // decida si es enfasis o sigla: si no, una sigla nueva saldria en minuscula.
  it('cada palabra en mayusculas es enfasis conocido o una sigla de la lista', async () => {
    const { SIGLAS } = await import('../../components/movement/LabMarginParts');
    const ENFASIS = new Set(['JUNTOS', 'TODO', 'ANTES']);
    const sinClasificar = new Set<string>();
    for (const f of FASES) {
      for (const t of [f.description ?? '', f.flag?.detail ?? '']) {
        for (const w of t.match(/\b[A-ZÁÉÍÓÚÑ]{4,}\b/g) ?? []) {
          if (!SIGLAS.has(w) && !ENFASIS.has(w)) sinClasificar.add(w);
        }
      }
    }
    expect([...sinClasificar]).toEqual([]);
  });
});
