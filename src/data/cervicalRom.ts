// src/data/cervicalRom.ts

import type { RomMovement, RomMovementIndex } from '../types/rom';

const flexion: RomMovement = {
  id: 'cervical-flexion',
  name: 'Flexión',
  joint: 'Cervical',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 45 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'Flexión de la columna cervical hasta unos 45°. Es un movimiento de control fino antes que de potencia: los flexores profundos (largo del cuello y de la cabeza) inician y modulan el movimiento aplanando la lordosis, mientras el esternocleidomastoideo asume el rol de motor potente en la segunda mitad del arco. El reentrenamiento de los flexores profundos es un pilar de la rehabilitación de la cervicalgia crónica.',
  region: 'cervical',
  phases: [
    {
      startDeg: 0,
      endDeg: 20,
      label: 'Inicio (control profundo)',
      description:
        'El largo del cuello y el largo de la cabeza inician la flexión aplanando la lordosis cervical y controlando el asentamiento de la cabeza sobre el atlas. Son los estabilizadores profundos cervicales: su debilidad es un hallazgo constante en la cervicalgia crónica y el whiplash.',
      muscles: [
        { muscleId: 'longus-colli', role: 'prime-mover', note: 'Aplana la lordosis cervical e inicia la flexión segmentaria. Principal objetivo de reentrenamiento en cervicalgia.' },
        { muscleId: 'longus-capitis', role: 'prime-mover', note: 'Flexiona la cabeza sobre el atlas; controla el asentamiento craneocervical.' },
        { muscleId: 'rectus-anterior-capitis', role: 'assistant', note: 'Asiste la flexión atlanto-occipital.' },
        { muscleId: 'rectus-lateralis-capitis', role: 'stabilizer', note: 'Estabiliza la articulación atlanto-occipital durante la flexión.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 20,
      endDeg: 45,
      label: 'Rango medio-final (motor superficial)',
      description:
        'El esternocleidomastoideo potencia la flexión cervical media y final cuando ambas porciones actúan simétricamente. Los escalenos asisten y estabilizan lateralmente la columna durante el movimiento.',
      muscles: [
        { muscleId: 'sternocleidomastoid', role: 'prime-mover', note: 'Motor superficial potente: ambas porciones juntas flexionan el cuello y aproximan el mentón al tórax.' },
        { muscleId: 'scalenus-anterior', role: 'assistant', note: 'Flexor accesorio y fijador de la primera costilla.' },
        { muscleId: 'scalenus-medius', role: 'stabilizer', note: 'Estabilización lateral de la columna cervical durante la flexión.' },
        { muscleId: 'longus-colli', role: 'assistant', note: 'Mantiene el control profundo a lo largo de todo el arco.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

const extension: RomMovement = {
  id: 'cervical-extension',
  name: 'Extensión',
  joint: 'Cervical',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 70 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'La columna cervical es la región del raquis con mayor rango de extensión: hasta 70°. El movimiento lo producen los extensores posteriores en capas (esplenio, longísimo, semiespinoso y suboccipitales), mientras los extensores profundos controlan el deslizamiento segmentario. Los suboccipitales gobiernan la extensión de la articulación atlanto-occipital.',
  region: 'cervical',
  phases: [
    {
      startDeg: 0,
      endDeg: 30,
      label: 'Inicio-medio (extensores superficiales)',
      description:
        'El esplenio de la cabeza y del cuello y el longísimo de la cabeza producen la extensión potente del cuello. El semiespinoso cervical contribuye a lo largo de todo el arco.',
      muscles: [
        { muscleId: 'splenius-capitis', role: 'prime-mover', note: 'Extensor potente del cuello y la cabeza.' },
        { muscleId: 'splenius-cervicis', role: 'prime-mover', note: 'Extiende la columna cervical media.' },
        { muscleId: 'longissimus-capitis', role: 'assistant', note: 'Extiende y estabiliza la cabeza.' },
        { muscleId: 'longissimus-cervicis', role: 'assistant', note: 'Extiende los segmentos cervicales inferiores.' },
        { muscleId: 'semispinalis-cervicis', role: 'assistant', note: 'Extensión cervical profunda a lo largo de todo el arco.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 30,
      endDeg: 70,
      label: 'Rango final (extensores profundos y suboccipitales)',
      description:
        'Los multífidos cervicales y el semiespinoso completan la extensión segmentaria. Los suboccipitales (recto posterior mayor y menor de la cabeza) extienden la articulación atlanto-occipital en los últimos grados.',
      muscles: [
        { muscleId: 'multifidus-cervicis', role: 'prime-mover', note: 'Extensión y estabilización segmentaria en el rango final.' },
        { muscleId: 'rectus-posterior-major-capitis', role: 'prime-mover', note: 'Extiende la articulación atlanto-occipital.' },
        { muscleId: 'rectus-posterior-minor-capitis', role: 'assistant', note: 'Extensión atlanto-occipital fina.' },
        { muscleId: 'obliquus-superior-capitis', role: 'assistant', note: 'Extiende y estabiliza la cabeza sobre el atlas.' },
        { muscleId: 'spinalis-capitis', role: 'stabilizer', note: 'Estabilización medial durante la extensión cervical alta.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

const lateralFlexion: RomMovement = {
  id: 'cervical-lateral-flexion',
  name: 'Inclinación lateral',
  joint: 'Cervical',
  plane: 'Frontal',
  totalRangeDeg: { min: 0, max: 45 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'Inclinación lateral del cuello hasta unos 45°. Los músculos ipsilaterales producen el movimiento (escalenos, esplenio y longísimo del lado al que se inclina), mientras los contralaterales lo frenan excéntricamente. Los escalenos tienen un papel doble: inclinadores del cuello y elevadores de las primeras costillas, clave en el síndrome del desfiladero torácico.',
  region: 'cervical',
  phases: [
    {
      startDeg: 0,
      endDeg: 20,
      label: 'Inicio',
      description:
        'El escaleno anterior y el esternocleidomastoideo ipsilaterales inician la inclinación lateral. El esplenio del cuello y el longísimo cervical colaboran desde la porción posterior.',
      muscles: [
        { muscleId: 'scalenus-anterior', role: 'prime-mover', note: 'Inclina el cuello ipsilateralmente y eleva la primera costilla.' },
        { muscleId: 'scalenus-medius', role: 'prime-mover', note: 'Inclina el cuello y eleva la primera y segunda costillas.' },
        { muscleId: 'sternocleidomastoid', role: 'assistant', note: 'Asiste la inclinación cuando actúa unilateralmente.' },
        { muscleId: 'splenius-cervicis', role: 'assistant', note: 'Inclinación ipsilateral desde la capa posterior.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 20,
      endDeg: 45,
      label: 'Rango medio-final',
      description:
        'El longísimo de la cabeza y del cuello completan el rango. El levador de la escápula y los multífidos estabilizan la base cervical. El escaleno posterior actúa como freno excéntrico contralateral.',
      muscles: [
        { muscleId: 'longissimus-capitis', role: 'prime-mover', note: 'Inclina y extiende la cabeza hacia el mismo lado.' },
        { muscleId: 'longissimus-cervicis', role: 'assistant', note: 'Inclinación cervical ipsilateral.' },
        { muscleId: 'levator-scapulae', role: 'stabilizer', note: 'Estabiliza la base cervical y asiste la inclinación ipsilateral.' },
        { muscleId: 'multifidus-cervicis', role: 'stabilizer', note: 'Estabilización segmentaria durante la inclinación.' },
        { muscleId: 'scalenus-posterior', role: 'stabilizer', note: 'Fija las primeras costillas y estabiliza la base cervical.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

const rotation: RomMovement = {
  id: 'cervical-rotation',
  name: 'Rotación',
  joint: 'Cervical (C1-C2 predominante)',
  plane: 'Transversal',
  totalRangeDeg: { min: 0, max: 80 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'La rotación cervical puede alcanzar los 80° hacia cada lado. El 50% de la rotación total ocurre en C1-C2 (articulación atlanto-axoidea), gobernada por el oblicuo inferior de la cabeza. El esternocleidomastoideo contralateral es el motor superficial más potente. La rotación es el movimiento más frecuentemente limitado en el síndrome de latigazo cervical.',
  region: 'cervical',
  phases: [
    {
      startDeg: 0,
      endDeg: 40,
      label: 'Inicio (C1-C2 y motores superficiales)',
      description:
        'Aproximadamente la mitad de la rotación cervical se produce en C1-C2. El oblicuo inferior de la cabeza rota el atlas sobre el axis; el esternocleidomastoideo contralateral y el esplenio ipsilateral actúan como el par de fuerzas principal.',
      muscles: [
        { muscleId: 'obliquus-inferior-capitis', role: 'prime-mover', note: 'Rota el atlas sobre el axis (C1-C2): responsable del 50% de la rotación cervical total.' },
        { muscleId: 'sternocleidomastoid', role: 'prime-mover', note: 'Contralateral: rota la cabeza hacia el lado ipsilateral.' },
        { muscleId: 'splenius-capitis', role: 'prime-mover', note: 'Ipsilateral: rota la cabeza hacia ese lado.' },
        { muscleId: 'rectus-posterior-major-capitis', role: 'assistant', note: 'Asiste la rotación ipsilateral en C1-C2.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 40,
      endDeg: 80,
      label: 'Rango medio-final (C2-C7)',
      description:
        'El semiespinoso y los multífidos cervicales del lado opuesto, junto al esplenio del cuello ipsilateral, rotan los segmentos inferiores. Los escalenos estabilizan la base cervical.',
      muscles: [
        { muscleId: 'splenius-cervicis', role: 'prime-mover', note: 'Ipsilateral: rota los segmentos cervicales inferiores hacia el mismo lado.' },
        { muscleId: 'semispinalis-cervicis', role: 'assistant', note: 'Contralateral: contribuye a la rotación hacia el lado opuesto.' },
        { muscleId: 'multifidus-cervicis', role: 'assistant', note: 'Rotación contralateral y estabilización segmentaria.' },
        { muscleId: 'scalenus-anterior', role: 'stabilizer', note: 'Estabiliza la base cervical durante la rotación.' },
        { muscleId: 'levator-scapulae', role: 'stabilizer', note: 'Estabiliza el ángulo cervicotorácico durante la rotación.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

export const CERVICAL_ROM: RomMovementIndex = {
  'cervical-flexion': flexion,
  'cervical-extension': extension,
  'cervical-lateral-flexion': lateralFlexion,
  'cervical-rotation': rotation,
};

export const CERVICAL_ROM_LIST: RomMovement[] = Object.values(CERVICAL_ROM);