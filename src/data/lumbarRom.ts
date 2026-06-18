// src/data/lumbarRom.ts

import type { RomMovement, RomMovementIndex } from '../types/rom';

const flexion: RomMovement = {
  id: 'lumbar-flexion',
  name: 'Flexión',
  joint: 'Lumbar',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 60 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'Flexión lumbar hasta unos 60°. La pared abdominal inicia el movimiento concéntricamente aplanando la lordosis; superado el equilibrio, el erector lumbar y los multífidos controlan excéntricamente el descenso. El transverso del abdomen crea presión intraabdominal antes de que comience el movimiento, estabilizando el raquis.',
  region: 'lumbar',
  phases: [
    {
      startDeg: 0,
      endDeg: 25,
      label: 'Inicio (motor abdominal y estabilización profunda)',
      description:
        'El recto del abdomen y los oblicuos inician la flexión concéntrica. El transverso del abdomen genera presión intraabdominal previa al movimiento, estabilizando el núcleo. El multífido lumbar controla excéntricamente el deslizamiento segmentario.',
      muscles: [
        { muscleId: 'transversus-abdominis', role: 'stabilizer', note: 'Genera presión intraabdominal previa al movimiento: estabilizador profundo del raquis lumbar.' },
        { muscleId: 'rectus-abdominis', role: 'prime-mover', note: 'Motor principal de la flexión del tronco; aproxima el tórax a la pelvis.' },
        { muscleId: 'external-oblique', role: 'assistant', note: 'Colabora en la flexión y controla la rotación durante el movimiento.' },
        { muscleId: 'internal-oblique', role: 'assistant', note: 'Colabora en la flexión y aumenta la presión intraabdominal.' },
        { muscleId: 'multifidus-lumborum', role: 'stabilizer', note: 'Control excéntrico segmentario; se atrofia selectivamente tras episodios de lumbalgia aguda.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 25,
      endDeg: 60,
      label: 'Rango medio-final (control excéntrico del erector)',
      description:
        'Superado el punto de equilibrio, la gravedad tira el tronco y el erector lumbar frena excéntricamente el descenso. El psoas actúa como estabilizador de la columna lumbar e influye en la lordosis.',
      muscles: [
        { muscleId: 'iliocostalis-lumborum', role: 'prime-mover', note: 'Control excéntrico del descenso del tronco en flexión; frena la cifosis lumbar progresiva.' },
        { muscleId: 'multifidus-lumborum', role: 'assistant', note: 'Estabilización y control excéntrico segmentario en el rango final.' },
        { muscleId: 'psoas-major', role: 'stabilizer', note: 'Comprime la columna lumbar; su tensión afecta la lordosis durante la flexión.' },
        { muscleId: 'quadratus-lumborum', role: 'stabilizer', note: 'Fija la base lumbopélvica y estabiliza L4-L5 durante la flexión.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

const extension: RomMovement = {
  id: 'lumbar-extension',
  name: 'Extensión',
  joint: 'Lumbar',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 35 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'La extensión lumbar puede alcanzar los 35°, aumentando la lordosis. El erector espinal lumbar es el motor concéntrico principal; los multífidos estabilizan segmento a segmento. En clínica, la extensión lumbar repetida es la base de los ejercicios de McKenzie para el síndrome de disfunción posterior.',
  region: 'lumbar',
  phases: [
    {
      startDeg: 0,
      endDeg: 20,
      label: 'Inicio-medio (erector lumbar)',
      description:
        'El iliocostal lumbar extiende la columna concéntricamente aumentando la lordosis. Los multífidos estabilizan cada segmento y el cuadrado lumbar fija la base lumbopélvica.',
      muscles: [
        { muscleId: 'iliocostalis-lumborum', role: 'prime-mover', note: 'Motor principal de la extensión lumbar; aumenta la lordosis.' },
        { muscleId: 'multifidus-lumborum', role: 'assistant', note: 'Estabilización y extensión segmentaria.' },
        { muscleId: 'quadratus-lumborum', role: 'stabilizer', note: 'Fija la base lumbopélvica durante la extensión.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 20,
      endDeg: 35,
      label: 'Rango final (multífidos y límite facetario)',
      description:
        'En el rango final las facetas lumbares se aproximan y frenan el movimiento. Los multífidos profundos mantienen la estabilidad segmentaria mientras el psoas tensiona la columna anterior limitando la extensión excesiva.',
      muscles: [
        { muscleId: 'multifidus-lumborum', role: 'prime-mover', note: 'Extensión segmentaria fina; estabiliza las vértebras hasta el límite facetario.' },
        { muscleId: 'iliocostalis-lumborum', role: 'assistant', note: 'Mantiene la extensión en el rango final.' },
        { muscleId: 'transversus-abdominis', role: 'stabilizer', note: 'Presión intraabdominal que estabiliza el raquis en la extensión final.' },
        { muscleId: 'psoas-major', role: 'stabilizer', note: 'Tensión anterior que limita la extensión excesiva y protege los discos.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

const lateralFlexion: RomMovement = {
  id: 'lumbar-lateral-flexion',
  name: 'Inclinación lateral',
  joint: 'Lumbar',
  plane: 'Frontal',
  totalRangeDeg: { min: 0, max: 25 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'Inclinación lateral lumbar hasta unos 25° hacia cada lado. El cuadrado lumbar es el motor ipsilateral más potente; el erector lumbar y los oblicuos colaboran. La inclinación lateral asimétrica o dolorosa es un signo clínico frecuente en la lumbalgia y la hernia discal lumbar.',
  region: 'lumbar',
  phases: [
    {
      startDeg: 0,
      endDeg: 12,
      label: 'Inicio',
      description:
        'El cuadrado lumbar ipsilateral inicia la inclinación aproximando la cresta ilíaca a las costillas inferiores. El iliocostal lumbar y el oblicuo externo del mismo lado colaboran.',
      muscles: [
        { muscleId: 'quadratus-lumborum', role: 'prime-mover', note: 'Motor principal de la inclinación lateral: aproxima cresta ilíaca y costillas del mismo lado.' },
        { muscleId: 'iliocostalis-lumborum', role: 'assistant', note: 'Asiste la inclinación ipsilateral desde la capa posterior.' },
        { muscleId: 'external-oblique', role: 'assistant', note: 'Aproxima el tórax a la pelvis del mismo lado.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 12,
      endDeg: 25,
      label: 'Rango final',
      description:
        'Los multífidos ipsilaterales y el oblicuo interno completan la inclinación. Los músculos contralaterales frenan excéntricamente el movimiento.',
      muscles: [
        { muscleId: 'multifidus-lumborum', role: 'assistant', note: 'Inclinación y estabilización segmentaria en el rango final.' },
        { muscleId: 'internal-oblique', role: 'assistant', note: 'Colabora en la inclinación ipsilateral.' },
        { muscleId: 'quadratus-lumborum', role: 'stabilizer', note: 'Contralateral: frena excéntricamente la inclinación.' },
        { muscleId: 'transversus-abdominis', role: 'stabilizer', note: 'Estabilización del núcleo durante la inclinación.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

const rotation: RomMovement = {
  id: 'lumbar-rotation',
  name: 'Rotación',
  joint: 'Lumbar',
  plane: 'Transversal',
  totalRangeDeg: { min: 0, max: 5 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'La rotación lumbar es el rango más limitado del raquis: solo 3-5° totales. Las carillas articulares lumbares están orientadas en el plano sagital, bloqueando mecánicamente la rotación. Forzarla concentra la carga en el anillo fibroso posterior y es un factor de riesgo en la hernia discal lumbar.',
  region: 'lumbar',
  phases: [
    {
      startDeg: 0,
      endDeg: 5,
      label: 'Arco completo (muy limitado)',
      description:
        'En los escasos grados disponibles, los multífidos contralaterales y los oblicuos cruzados producen el movimiento. El transverso del abdomen genera el corsé intraabdominal que protege el disco. La orientación sagital de las carillas actúa como tope mecánico.',
      muscles: [
        { muscleId: 'multifidus-lumborum', role: 'prime-mover', note: 'Rotación contralateral segmentaria; muy limitada por la geometría de las carillas.' },
        { muscleId: 'external-oblique', role: 'assistant', note: 'Par rotador del tronco: el externo gira hacia el lado opuesto.' },
        { muscleId: 'internal-oblique', role: 'assistant', note: 'Par rotador del tronco: el interno gira hacia el mismo lado.' },
        { muscleId: 'transversus-abdominis', role: 'stabilizer', note: 'Genera presión intraabdominal que protege el disco intervertebral durante la rotación.' },
        { muscleId: 'intertransversarii', role: 'stabilizer', note: 'Estabilización segmentaria; propioceptores del movimiento intervertebral.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

export const LUMBAR_ROM: RomMovementIndex = {
  'lumbar-flexion': flexion,
  'lumbar-extension': extension,
  'lumbar-lateral-flexion': lateralFlexion,
  'lumbar-rotation': rotation,
};

export const LUMBAR_ROM_LIST: RomMovement[] = Object.values(LUMBAR_ROM);