// src/data/neuro/lumbosacral.ts
//
// LOWER-LIMB nerve roots (L2-S1): dermatome key point, key myotome and reflex,
// with a rig demo of the myotome where the model can reproduce it. Values follow
// the ASIA/ISNCSCI key points and Magee; verified:false until checked.
//
// Rig demos available for the lower limb: knee extension, knee flexion. Hip,
// ankle and toe movements are not riggable, so those roots carry a demoNote.

import type { NeuroSegmentSet } from '../../types/neuro';

const CITE = [
  { ref: 'asia', verified: false },
  { ref: 'magee', verified: false },
];

export const LUMBOSACRAL_NEURO: NeuroSegmentSet = {
  id: 'lumbosacral',
  title: 'Raíces del miembro inferior',
  subtitle: 'Dermatoma, miotoma y reflejo por raíz (L2 a S1)',
  figure: 'lower-limb',
  roots: [
    {
      id: 'L2',
      label: 'L2',
      dermatome: {
        area: 'Cara anterior y medial del muslo, tercio proximal.',
        keyPoint: 'Cara anterior del muslo, mitad de la distancia entre pliegue inguinal y cóndilo (punto clave ASIA).',
        keyPointShort: 'Muslo anterior medio',
      },
      myotome: {
        action: 'Flexión de cadera.',
        muscles: 'Psoas ilíaco.',
      },
      demoNote:
        'El modelo mueve la pierna desde la rodilla, así que la flexión de cadera no se puede reproducir aquí.',
      mimic: {
        nerve: 'Nervio femorocutáneo lateral (meralgia parestésica)',
        discriminator:
          'La meralgia adormece y quema la cara lateral del muslo sin quitar un gramo de fuerza: si la flexión de cadera está conservada, no es radicular.',
      },
      pearl:
        'L1-L2-L3 comparten la flexión de cadera; sepáralas por el nivel del dermatoma en el muslo.',
      cite: CITE,
    },
    {
      id: 'L3',
      label: 'L3',
      dermatome: {
        area: 'Cara anterior del muslo hasta la rodilla, lado medial.',
        keyPoint: 'Cóndilo femoral medial (punto clave ASIA).',
        keyPointShort: 'Cóndilo femoral medial',
      },
      myotome: {
        action: 'Extensión de rodilla.',
        muscles: 'Cuádriceps femoral.',
      },
      reflex: {
        name: 'Reflejo rotuliano o patelar (L3 y L4)',
        elicitation:
          'Con la rodilla en semiflexión y relajada, percute el tendón rotuliano; respuesta: extensión de rodilla.',
      },
      demo: {
        movementId: 'knee-extension',
        angleDeg: 90,
        side: 'R',
      },
      mimic: {
        nerve: 'Nervio femoral',
        discriminator:
          'El femoral también debilita el cuádriceps y abole el rotuliano, pero su déficit sensitivo sigue el territorio del safeno interno y no el dermatoma, y no hay dolor radicular a la puesta en tensión.',
      },
      pearl:
        'El reflejo rotuliano cubre L3 y L4; usa el dermatoma (rodilla medial en L3, maléolo interno en L4) para separarlas.',
      cite: CITE,
    },
    {
      id: 'L4',
      label: 'L4',
      dermatome: {
        area: 'Cara medial de la pierna hasta el maléolo interno.',
        keyPoint: 'Maléolo medial o interno (punto clave ASIA).',
        keyPointShort: 'Maléolo medial',
      },
      myotome: {
        action: 'Dorsiflexión de tobillo.',
        muscles: 'Tibial anterior.',
      },
      reflex: {
        name: 'Reflejo rotuliano o patelar (L3 y L4)',
        elicitation:
          'Percute el tendón rotuliano; respuesta: extensión de rodilla (comparte nivel con L3).',
      },
      demoNote:
        'El modelo llega hasta la flexión de rodilla, así que la dorsiflexión de tobillo no se puede reproducir aquí.',
      pearl:
        'Marcha del talón débil (no puede caminar sobre los talones): sospecha L4-L5 por el tibial anterior.',
      cite: CITE,
    },
    {
      id: 'L5',
      label: 'L5',
      dermatome: {
        area: 'Cara lateral de la pierna y dorso del pie.',
        keyPoint: 'Dorso del pie, tercera articulación metatarsofalángica (punto clave ASIA).',
        keyPointShort: 'Dorso del pie',
      },
      myotome: {
        action: 'Extensión del dedo gordo.',
        muscles: 'Extensor largo del hallux.',
      },
      demoNote:
        'La extensión del dedo gordo no se puede reproducir en el modelo.',
      mimic: {
        nerve: 'Nervio peroneo común en la cabeza del peroné',
        discriminator:
          'El pie caído es el mismo. Explora la inversión del pie y la abducción de cadera: el peroneo las respeta, L5 las debilita.',
      },
      pearl:
        'La raíz lumbar más afectada. Explora el extensor del hallux: se debilita pronto y no tiene reflejo propio.',
      cite: CITE,
    },
    {
      id: 'S1',
      label: 'S1',
      dermatome: {
        area: 'Cara posterior de la pierna, borde lateral y planta del pie.',
        keyPoint: 'Cara lateral del talón (punto clave ASIA).',
        keyPointShort: 'Talón, cara lateral',
      },
      myotome: {
        action: 'Flexión plantar de tobillo (y flexión de rodilla).',
        muscles: 'Tríceps sural; isquiotibiales.',
      },
      reflex: {
        name: 'Reflejo aquíleo (S1 y S2)',
        elicitation:
          'Con el tobillo en ligera dorsiflexión, percute el tendón de Aquiles; respuesta: flexión plantar.',
      },
      demo: {
        movementId: 'knee-flexion',
        angleDeg: 90,
        side: 'R',
        note: 'El modelo muestra la flexión de rodilla (isquiotibiales, S1); la flexión plantar no se puede reproducir aquí.',
      },
      mimic: {
        nerve: 'Ciático troncular (incluido el sindrome piriforme)',
        discriminator:
          'Una lesión del tronco del ciático mezcla territorios de L4 a S2 a la vez; una radiculopatía S1 se queda dentro de un solo dermatoma y un solo miotoma.',
      },
      pearl:
        'Marcha de puntillas débil y reflejo aquíleo abolido apuntan a S1.',
      cite: CITE,
    },
  ],
  redFlags: [
    {
      label: 'Síndrome de cola de caballo',
      detail:
        'Anestesia en silla de montar, retención o incontinencia urinaria, déficit motor bilateral o pérdida del tono anal. Es una urgencia: derivación inmediata, no tratamiento.',
    },
    {
      label: 'Déficit motor progresivo',
      detail:
        'Pie caído nuevo, o fuerza que baja entre sesiones. Valoración médica sin esperar la evolución.',
    },
    {
      label: 'Bandera roja sistémica',
      detail:
        'Fiebre, inmunosupresión, uso de drogas por vía parenteral, antecedente oncológico o traumatismo importante.',
    },
  ],
};
