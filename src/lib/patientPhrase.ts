// src/lib/patientPhrase.ts
//
// Plain-language phrasing of a clinical movement, for PATIENT-facing surfaces
// (the "Modo paciente" full-screen view and the "Exportar para paciente" card).
// Turns "glenohumeral-abduction" / "Abducción" into "Separa el brazo hacia el
// lado, despacio." -- what the patient should actually DO.
//
// Rule-based off the movementId so it covers every region's movements without a
// per-movement table. Falls back to the clinical name when no rule matches.

import type { RomMovement } from '../types/rom';

/**
 * A short, friendly instruction in Spanish (LATAM) for what the patient does.
 * `regionName` is the user-facing region label (e.g. "Hombro", "Tobillo y pie").
 */
export function patientInstruction(movement: RomMovement, regionName: string): string {
  const id = movement.id.toLowerCase();
  const r = regionName.toLowerCase();
  const slow = 'despacio y sin dolor';

  if (/dorsiflexion/.test(id)) return `Lleva el pie hacia arriba, ${slow}.`;
  if (/plantarflexion/.test(id)) return `Estira el pie hacia abajo, como de puntillas, ${slow}.`;
  if (/inversion/.test(id)) return `Gira la planta del pie hacia adentro, ${slow}.`;
  if (/eversion/.test(id)) return `Gira la planta del pie hacia afuera, ${slow}.`;
  if (/pronation/.test(id)) return `Gira la palma de la mano hacia abajo, ${slow}.`;
  if (/supination/.test(id)) return `Gira la palma de la mano hacia arriba, ${slow}.`;
  if (/abduction/.test(id)) return `Separa ${r} hacia el lado, ${slow}.`;
  if (/adduction/.test(id)) return `Acerca ${r} hacia el centro del cuerpo, ${slow}.`;
  if (/internal-rotation/.test(id)) return `Gira ${r} hacia adentro, ${slow}.`;
  if (/external-rotation/.test(id)) return `Gira ${r} hacia afuera, ${slow}.`;
  if (/lateral-flexion/.test(id)) return `Inclina ${r} hacia el lado, ${slow}.`;
  if (/rotation/.test(id)) return `Gira ${r} hacia el lado, ${slow}.`;
  if (/flexion/.test(id)) {
    if (/shoulder|glenohumeral|hip/.test(id)) return `Lleva ${r} hacia adelante, ${slow}.`;
    return `Dobla ${r}, ${slow}, hasta donde te resulte cómodo.`;
  }
  if (/extension/.test(id)) {
    if (/shoulder|glenohumeral|hip/.test(id)) return `Lleva ${r} hacia atrás, ${slow}.`;
    return `Estira ${r}, ${slow}.`;
  }
  return `Realiza ${movement.name.toLowerCase()} de ${r}, ${slow}.`;
}

/** A short exercise title, e.g. "Flexión · Codo". */
export function patientTitle(movement: RomMovement, regionName: string): string {
  return `${movement.name} · ${regionName}`;
}
