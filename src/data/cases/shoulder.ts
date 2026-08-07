// src/data/cases/shoulder.ts
//
// Clinical cases for the shoulder region. Split out of the old single
// clinicalCases.ts so each region's prose ships separately: the free region
// stays bundled, the paid ones are served by the entitlement-checked "content"
// edge function (see data/premiumStore.ts).
//
// Authoring rules unchanged: user-facing prose in Latin American Spanish
// (UTF-8 with accents); ids/keys ASCII. Clinical reasoning is AUTHORED content
// drafted from standard physiotherapy teaching -- verify before professional use.

import type { ClinicalCase } from '../../types/clinicalCase';

export const SHOULDER_CASES: ClinicalCase[] = [
  {
    id: 'sh-impingement',
    region: 'shoulder',
    title: 'Dolor en arco medio de abducción',
    level: 'básico',
    vignette:
      'Mujer de 45 años, pintora, con dolor en la cara lateral del hombro al elevar el brazo. Refiere un “arco doloroso” entre los 60° y 120° de abducción, que cede por encima y por debajo de ese rango. Sin antecedente traumático.',
    tags: ['Manguito rotador', 'Pinzamiento subacromial', 'Supraespinoso'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué estructura es la más probablemente implicada en un arco doloroso de 60–120°?',
        options: [
          { id: 'a', text: 'Tendón del supraespinoso', correct: true },
          { id: 'b', text: 'Cápsula posterior glenohumeral', correct: false },
          { id: 'c', text: 'Tendón del subescapular', correct: false },
          { id: 'd', text: 'Bíceps porción corta', correct: false },
        ],
        explanation:
          'El arco doloroso medio es clásico del pinzamiento subacromial: en ese rango el supraespinoso (y la bursa) se comprimen contra el acromion. El supraespinoso es el tendón del manguito más frecuentemente afectado.',
      },
      {
        id: 'q2',
        prompt: '¿Qué prueba ayuda a aislar el supraespinoso?',
        options: [
          { id: 'a', text: 'Maniobra de Jobe (lata vacía)', correct: true },
          { id: 'b', text: 'Test de Lachman', correct: false },
          { id: 'c', text: 'Signo de Froment', correct: false },
          { id: 'd', text: 'Test de Thomas', correct: false },
        ],
        explanation:
          'La maniobra de Jobe (lata vacía) carga selectivamente al supraespinoso: abducción a 90° en el plano de la escápula, rotación interna y resistencia descendente. Lachman es de rodilla, Froment de nervio cubital y Thomas de flexores de cadera.',
      },
      {
        id: 'q3',
        prompt: '¿Cuál es un objetivo inicial razonable del tratamiento conservador?',
        options: [
          { id: 'a', text: 'Recentrar la cabeza humeral fortaleciendo el manguito y mejorando el ritmo escapular', correct: true },
          { id: 'b', text: 'Inmovilización estricta 6 semanas', correct: false },
          { id: 'c', text: 'Potenciar solo el deltoides medio', correct: false },
          { id: 'd', text: 'Estiramiento agresivo en el rango doloroso', correct: false },
        ],
        explanation:
          'Sin desgarro completo, el manejo conservador busca descomprimir el espacio subacromial: fortalecer el manguito (depresores de la cabeza humeral) y los estabilizadores escapulares, evitando provocar dolor. La inmovilización prolongada y el deltoides aislado tienden a empeorar el pinzamiento.',
      },
    ],
    takeaway:
      'Arco doloroso medio + Jobe positivo orientan a pinzamiento del supraespinoso. El tratamiento prioriza recentrar la cabeza humeral (manguito + control escapular) antes que ganar rango a la fuerza.',
  },
  {
    id: 'sh-suprascapular',
    region: 'shoulder',
    title: 'Debilidad de rotación externa',
    level: 'intermedio',
    vignette:
      'Voleibolista de 22 años con pérdida de fuerza en la rotación externa del hombro dominante y atrofia visible en la fosa infraespinosa. No hay dolor significativo ni pérdida de sensibilidad cutánea.',
    tags: ['Infraespinoso', 'Nervio supraescapular', 'C5–C6'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué músculo explica mejor la debilidad de rotación externa con esa atrofia?',
        options: [
          { id: 'a', text: 'Infraespinoso', correct: true },
          { id: 'b', text: 'Redondo mayor', correct: false },
          { id: 'c', text: 'Pectoral mayor', correct: false },
          { id: 'd', text: 'Dorsal ancho', correct: false },
        ],
        explanation:
          'El infraespinoso es el principal rotador externo del manguito y ocupa la fosa infraespinosa; su atrofia es visible ahí. El redondo mayor, pectoral mayor y dorsal ancho son rotadores internos / aductores.',
      },
      {
        id: 'q2',
        prompt: '¿Qué nervio, atrapado en la escotadura espinoglenoidea, produciría debilidad aislada de rotación externa sin déficit sensitivo cutáneo?',
        options: [
          { id: 'a', text: 'Nervio supraescapular', correct: true },
          { id: 'b', text: 'Nervio axilar', correct: false },
          { id: 'c', text: 'Nervio musculocutáneo', correct: false },
          { id: 'd', text: 'Nervio torácico largo', correct: false },
        ],
        explanation:
          'El nervio supraescapular (C5–C6) inerva supraespinoso e infraespinoso. Atrapado en la escotadura espinoglenoidea afecta solo al infraespinoso, sin déficit sensitivo cutáneo (es esencialmente motor en ese punto). El axilar afectaría deltoides/redondo menor; el torácico largo, el serrato anterior.',
      },
    ],
    takeaway:
      'Atrofia infraespinosa + debilidad aislada de rotación externa sin déficit sensitivo sugiere atrapamiento del nervio supraescapular en la escotadura espinoglenoidea, típico en deportes de lanzamiento.',
  },
  {
    id: 'sh-cant-initiate',
    region: 'shoulder',
    title: 'No puede iniciar la abducción',
    level: 'intermedio',
    vignette:
      'Hombre de 60 años tras una caída sobre el hombro. Al pedirle que separe el brazo del cuerpo no logra iniciar el movimiento, pero si se le eleva pasivamente hasta ~30° puede continuar y sostenerlo.',
    tags: ['Supraespinoso', 'Deltoides', 'Desgarro del manguito'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué músculo es el principal iniciador de los primeros grados de abducción?',
        options: [
          { id: 'a', text: 'Supraespinoso', correct: true },
          { id: 'b', text: 'Deltoides medio', correct: false },
          { id: 'c', text: 'Trapecio superior', correct: false },
          { id: 'd', text: 'Subescapular', correct: false },
        ],
        explanation:
          'El supraespinoso inicia la abducción (~primeros 15°) y centra la cabeza humeral para que el deltoides actúe con ventaja. Por eso, si está roto, el paciente no puede iniciar, pero una vez superado ese tramo el deltoides toma el relevo.',
      },
      {
        id: 'q2',
        prompt: 'El paciente continúa el rango tras la ayuda inicial. ¿Qué confirma esto?',
        options: [
          { id: 'a', text: 'El deltoides (y su nervio axilar) están funcionales', correct: true },
          { id: 'b', text: 'Hay una luxación glenohumeral', correct: false },
          { id: 'c', text: 'El trapecio está paralizado', correct: false },
          { id: 'd', text: 'Hay lesión del plexo braquial completo', correct: false },
        ],
        explanation:
          'Que pueda continuar y sostener la abducción una vez iniciada indica que el deltoides y el nervio axilar funcionan; el problema está en el iniciador (supraespinoso). Es el patrón típico del desgarro del supraespinoso.',
      },
    ],
    takeaway:
      'Incapacidad de INICIAR la abducción con capacidad de continuarla tras ayuda pasiva apunta a desgarro del supraespinoso, con deltoides/axilar intactos.',
  },
];
