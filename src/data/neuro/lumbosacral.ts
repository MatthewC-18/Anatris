// src/data/neuro/lumbosacral.ts
//
// LOWER-LIMB nerve roots (L2-S1): dermatome key point, key myotome and reflex,
// with a rig demo of the myotome where the model can reproduce it.
//
// Cotejado igual que el miembro superior (ver la cabecera de `cervical.ts`):
// puntos clave y musculos clave leidos en la hoja de trabajo oficial ISNCSCI y
// contrastados con el capitulo de la ASCIP (Kirshblum, 2023). En el miembro
// inferior las dos lecturas ya coincidian, asi que aqui el cotejo no corrigio
// ningun valor: solo anade el musculo clave en las palabras de ISNCSCI y los
// movimientos que esa misma hoja lista como NO clave.
//
// -----------------------------------------------------------------------------
// LO QUE EL MODELO SI PUEDE ENSENAR, MEDIDO (2026-11-10)
// -----------------------------------------------------------------------------
// Esta cabecera decia "Hip, ankle and toe movements are not riggable", y de ahi
// salian tres textos en pantalla que NEGABAN un movimiento que el rig si hace:
// L2 ("la flexion de cadera no se puede reproducir aqui"), L4 (igual con la
// dorsiflexion) y S1, que sustituia la flexion plantar por la de rodilla. Se
// escribio antes de que cadera y tobillo fueran regiones completas y nadie la
// volvio a mirar: un fisio que acababa de usar el laboratorio de Cadera leia
// aqui que la flexion de cadera no se puede reproducir.
//
// Antes de prometer un movimiento se mide, y en LOS DOS LADOS, porque los cinco
// armazones del rig no comparten convencion de eje (`npm run audit-direction` y
// `npm run audit-angles`, corridos hoy):
//
//   hip-flexion           R y L   90 grados   la rodilla avanza 42,2 cm
//   ankle-dorsiflexion    R y L   20 grados   la punta del pie sube 6,1 cm
//   ankle-plantarflexion  R y L   50 grados   la punta del pie baja 10,6 cm
//   knee-flexion          R y L   90 grados   el talon sube 39,9 cm
//   knee-extension        R y L  120 grados   el talon baja 59,8 cm
//
// El unico miotoma lumbosacro que sigue sin demo es L5 (extension del dedo
// gordo): `boneMap` no tiene ningun hueso de los dedos del pie, asi que ahi el
// demoNote es cierto y se queda.

import type { NeuroSegmentSet } from '../../types/neuro';

const CITE = [
  { ref: 'asia', verified: true },
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
        keyPoint: 'Cara anterior del muslo, mitad de la distancia entre el pliegue inguinal y el cóndilo femoral medial (punto clave ASIA).',
        keyPointShort: 'Muslo anterior medio',
      },
      myotome: {
        action: 'Flexión de cadera.',
        muscles: 'Psoas ilíaco.',
        asiaKey: 'Flexores de cadera (iliopsoas).',
        asiaNonKey: 'Cadera: aducción.',
      },
      // 90 GRADOS, NO 120. Hasta los 90 el arco es de PIERNA RECTA: la rodilla
      // solo empieza a plegarse pasado ese punto (hipDeepFlexionKneeCoupling en
      // boneMap), y el gesto con el que se explora el iliopsoas en consulta es
      // la elevacion de la pierna recta. Medido a 90: la rodilla avanza 42,2 cm
      // en los dos lados.
      demo: {
        movementId: 'hip-flexion',
        angleDeg: 90,
        side: 'R',
        // El musculo clave de ISNCSCI es el iliopsoas, que en el catalogo son
        // dos fichas: el psoas mayor y el iliaco.
        highlightMuscleIds: ['psoas-major', 'iliacus'],
      },
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
        asiaKey: 'Extensores de rodilla (cuádriceps).',
        asiaNonKey: 'Cadera: rotación externa.',
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
        // El miotoma L3 es el cuadriceps entero, no una de sus cabezas.
        highlightMuscleIds: [
          'rectus-femoris',
          'vastus-lateralis',
          'vastus-medialis',
          'vastus-intermedius',
        ],
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
        asiaKey: 'Dorsiflexores de tobillo (tibial anterior).',
        asiaNonKey:
          'Cadera: extensión, abducción y rotación interna. Rodilla: flexión. Tobillo: inversión y eversión. Dedos: extensión metatarsofalángica e interfalángica.',
      },
      reflex: {
        name: 'Reflejo rotuliano o patelar (L3 y L4)',
        elicitation:
          'Percute el tendón rotuliano; respuesta: extensión de rodilla (comparte nivel con L3).',
      },
      // 20 grados es el tope activo del arco, y es el recorrido completo de la
      // dorsiflexion: medido, la punta del pie sube 6,1 cm en los dos lados.
      // SIN COMPONENTES. La dorsiflexion se explora con la rodilla extendida,
      // que es lo que pone en tension al gastrocnemio; doblar la rodilla para
      // acercar el pie a la camara cambiaria el significado clinico del gesto.
      demo: {
        movementId: 'ankle-dorsiflexion',
        angleDeg: 20,
        side: 'R',
        highlightMuscleIds: ['tibialis-anterior'],
      },
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
        asiaKey: 'Extensores largos de los dedos (extensor largo del hallux).',
        asiaNonKey:
          'Hallux y dedos: flexión de las interfalángicas distal y proximal, y abducción.',
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
        asiaKey: 'Flexores plantares de tobillo (gastrocnemio y sóleo).',
        asiaNonKey: 'Hallux: aducción.',
      },
      reflex: {
        name: 'Reflejo aquíleo (S1 y S2)',
        elicitation:
          'Con el tobillo en ligera dorsiflexión, percute el tendón de Aquiles; respuesta: flexión plantar.',
      },
      // S1 ENSENA SU MUSCULO CLAVE, QUE ES EL TRICEPS SURAL. El demo era
      // `knee-flexion` con una nota que decia que la flexion plantar "no se
      // puede reproducir aqui", y si se puede: 50 grados en los dos lados, la
      // punta del pie baja 10,6 cm. Asi que el gesto que se demuestra es el que
      // ISNCSCI puntua, y el gastrocnemio y el soleo se encienden directamente.
      // La flexion de rodilla sigue siendo parte del miotoma y se dice en la
      // nota, en vez de ocupar el demo.
      demo: {
        movementId: 'ankle-plantarflexion',
        angleDeg: 50,
        side: 'R',
        highlightMuscleIds: ['gastrocnemius', 'soleus'],
        note: 'El demo muestra la flexión plantar, que es el músculo clave de ISNCSCI para S1. La flexión de rodilla (isquiotibiales) es el otro componente del miotoma y se ve en el laboratorio de rodilla.',
      },
      mimic: {
        nerve: 'Ciático troncular (incluido el síndrome piriforme)',
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
