// src/lib/biomech/lumbarCoupling.ts
//
// Pure coupling for LUMBAR FLEXION — the trunk's "rhythm equivalent": the
// LUMBOPELVIC RHYTHM. A forward bend is not just lumbar spine motion; the pelvis
// rotates over the hips too, and the two share the movement in a set sequence.
//
// MODEL (Kapandji / Oatis): the lumbar spine reverses its lordosis and LEADS the
// early bend; the pelvis (hip flexion) ramps in and DOMINATES the later range. The
// coupled pelvic contribution here is a didactic model of that sequence (it varies
// by person and task), same honesty discipline as ./shoulderChain. READOUT only —
// the lab drives the lumbar segment; the pelvic share is shown, not posed.
//
// --- POR QUE LA PELVIS NO SE PUEDE POSAR, Y ESTA MEDIDO ---------------------
//
// Los otros dos acoplamientos que el panel publicaba sin que el rig los hiciera
// ya estan conducidos: el tornillo de la rodilla y el reparto de la rotacion
// cervical. Este NO SE PUEDE, y la razon no es pereza: en este GLB la PELVIS Y
// EL FEMUR VIVEN EN ESQUELETOS DISTINTOS y no hay articulacion entre ellos. El
// sacro es la raiz del Spine_Armature; cada femur es la raiz de su
// Leg_Armature, que cuelga de la raiz de la escena. La cadera no existe como
// junta, asi que girar uno no puede articularse contra el otro.
//
// Medido alrededor del sacro (316 mallas con vertices a menos de 18 cm): 191 las
// conduce el Spine_Armature y 121 los Leg_Armature, y la frontera parte la
// region por la mitad. El PIRIFORME es del raquis y el GLUTEO MAYOR de la
// pierna, los dos insertados en el mismo hueso y a 4 cm uno del otro: girar
// `vert_sacrum` se llevaria el piriforme y dejaria el gluteo atras, una costura
// abierta en plena nalga. Y arrastrar las piernas con la pelvis seria peor,
// porque en una flexion de tronco de pie las piernas se quedan verticales
// mientras la pelvis bascula sobre ellas.
//
// Asi que la aportacion pelvica se MUESTRA y se AVISA de que no se posa, con la
// misma disciplina que el resto de la aplicacion usa para un modelo ("modelo de
// reclutamiento, no medicion EMG"). Una cifra al lado de un modelo que no la
// hace, sin avisar, es la clase de error que esta auditoria vino a quitar.
// Conducirla de verdad pide rehacer la jerarquia del rig (una pelvis como padre
// de los dos femures), que es un cambio de Blender y no de runtime.
//
// `npm run audit-angles` vigila las dos mitades del contrato: que el rig NO
// mueva la pelvis mientras la bandera sea false, y que el panel lo avise.
//
// ASCII source; no `any`.

/**
 * Si el rig POSA de verdad la aportacion pelvica. Hoy es false por la estructura
 * del GLB (ver la cabecera). El panel lo lee para avisar, y el banco de medida
 * para exigir coherencia: mientras sea false, la pelvis no se mueve en 3D.
 */
export const LUMBOPELVIC_PELVIS_POSED = false;

export type LumbopelvicLeader = 'lumbar' | 'pelvis' | 'balanced';

export interface LumbopelvicRhythm {
  /** Lumbar spine flexion (the driven angle), degrees. */
  lumbarDeg: number;
  /** Coupled pelvic / hip flexion at this point (modelled), degrees. */
  pelvicDeg: number;
  /** Total trunk forward bend so far (lumbar + pelvic), degrees. */
  totalDeg: number;
  lumbarPct: number;
  pelvicPct: number;
  /** Lumbar : pelvis, e.g. "1.4:1". */
  ratio: string;
  leader: LumbopelvicLeader;
}

/** Lumbopelvic split for a given lumbar flexion angle. Null at/below neutral. */
export function lumbopelvicRhythm(lumbarDeg: number): LumbopelvicRhythm | null {
  const l = lumbarDeg < 0 ? 0 : lumbarDeg;
  if (l <= 0.5) return null;
  const seg = (lo: number, hi: number): number => Math.max(Math.min(l, hi) - lo, 0);
  // Pelvis stays quiet while the lumbar reverses (first ~25 deg), then ramps in and
  // leads the rest, so the ratio shifts from lumbar-led to pelvis-led across the arc.
  const pelvic = 0.25 * seg(0, 25) + 1.1 * seg(25, 60);
  const total = l + pelvic;
  const ratio = pelvic > 0.1 ? `${(l / pelvic).toFixed(1)}:1` : '—';
  const leader: LumbopelvicLeader =
    l > pelvic * 1.15 ? 'lumbar' : pelvic > l * 1.15 ? 'pelvis' : 'balanced';
  return {
    lumbarDeg: l,
    pelvicDeg: pelvic,
    totalDeg: total,
    lumbarPct: total > 0 ? (l / total) * 100 : 0,
    pelvicPct: total > 0 ? (pelvic / total) * 100 : 0,
    ratio,
    leader,
  };
}
