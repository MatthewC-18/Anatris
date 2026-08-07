// src/data/pathology/hip.ts
//
// Pathological movement presets for the hip region. Split out of the old
// single pathologies.ts so each region ships separately: the free region stays
// bundled, the paid ones are served by the entitlement-checked "content" edge
// function (see data/premiumStore.ts).
//
// These presets are the product's strongest differentiator -- no other atlas
// shows an ALTERED movement pattern with its mechanism and implicated
// structure -- so they are exactly the content that must not be public.
//
// Every figure stays "modelled, not invented": each preset carries its cite.

import type { MovementPathology } from '../pathologies';

export const HIP_PATHOLOGIES: MovementPathology[] = [
  {
    id: 'hip-fai-cam',
    name: 'Pinzamiento femoroacetabular (tipo cam)',
    chip: 'Pinzamiento',
    summary:
      'La rotación interna choca antes de tiempo: el hallazgo que define el FAI.',
    mechanism:
      'La pérdida del offset en la unión cabeza-cuello hace que el fémur contacte precozmente con el reborde acetabular. La rotación interna es la primera que se restringe, y la flexión profunda combinada con rotación interna comprime el labrum: es la posición del test FADIR.',
    whyItHurts:
      'Duele la ingle al sentarse mucho rato, al agacharse profundo y al entrar y salir del coche. El paciente señala la ingle en pinza con la mano (signo de la C).',
    implicated: ['psoas-major', 'iliacus', 'rectus-femoris'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['hip-internal-rotation'],
    rangeCapDeg: 18,
  },
  {
    id: 'hip-osteoarthritis',
    name: 'Artrosis de cadera (patrón capsular)',
    chip: 'Artrosis',
    summary:
      'Pérdida global de recorrido; en la flexión se nota como tope duro y precoz.',
    mechanism:
      'La retracción capsular de la coxartrosis sigue un patrón: la rotación interna y la extensión se pierden antes y en mayor grado, y la flexión termina también restringida con un tope firme y doloroso.',
    whyItHurts:
      'Rigidez matutina de menos de 30 minutos, dolor inguinal profundo que se irradia a la cara anterior del muslo y dificultad para calzarse o cortarse las uñas del pie.',
    implicated: ['gluteus-medius', 'psoas-major', 'adductor-longus'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['hip-flexion'],
    rangeCapDeg: 60,
  },
  {
    id: 'hip-adductor-related-groin-pain',
    name: 'Dolor inguinal de origen aductor',
    chip: 'Aductores',
    summary:
      'La aducción resistida duele y el recorrido activo se acorta por el dolor.',
    mechanism:
      'Sobrecarga del origen púbico de los aductores (sobre todo el aductor largo) por gestos repetidos de cambio de dirección y golpeo. Es la forma más frecuente de dolor inguinal del deportista.',
    whyItHurts:
      'Dolor a la palpación del origen aductor y a la aducción resistida (test de squeeze). El paciente lo describe al arrancar, frenar y golpear el balón.',
    implicated: ['adductor-longus', 'adductor-brevis', 'gracilis'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['hip-adduction'],
    rangeCapDeg: 10,
  },
  {
    id: 'hip-abductor-deficiency',
    name: 'Insuficiencia de abductores (Trendelenburg)',
    chip: 'Abductores',
    summary:
      'El glúteo medio no sostiene la pelvis: la abducción activa se queda corta y la pelvis cae en apoyo monopodal.',
    mechanism:
      'La debilidad o la inhibición dolorosa del glúteo medio y menor (tendinopatía glútea, poscirugía, dolor lumbar crónico) impide mantener la pelvis nivelada; la abducción activa pierde fuerza y recorrido útil.',
    whyItHurts:
      'Dolor lateral de cadera sobre el trocánter mayor al tumbarse de ese lado, marcha de Trendelenburg o de Duchenne y sobrecarga secundaria del cuadrado lumbar contralateral.',
    implicated: ['gluteus-medius', 'gluteus-minimus', 'tensor-fasciae-latae'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['hip-abduction'],
    rangeCapDeg: 25,
  },
  {
    id: 'hip-flexor-contracture',
    name: 'Retracción del iliopsoas',
    chip: 'Psoas corto',
    summary:
      'La cadera no llega a la extensión completa: queda una flexión residual.',
    mechanism:
      'El acortamiento del iliopsoas (sedestación prolongada, síndrome cruzado inferior) impide alcanzar los últimos grados de extensión; la pelvis compensa basculando en anteversión y aumentando la lordosis lumbar.',
    whyItHurts:
      'Acorta el paso, obliga a extender desde el raquis lumbar en vez de desde la cadera y sobrecarga las carillas lumbares. Es lo que objetiva la prueba de Thomas.',
    implicated: ['psoas-major', 'iliacus', 'rectus-femoris'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['hip-extension'],
    rangeCapDeg: 5,
  },
];
