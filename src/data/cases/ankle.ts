// src/data/cases/ankle.ts
//
// Clinical cases for the ankle region. Split out of the old single
// clinicalCases.ts so each region's prose ships separately: the free region
// stays bundled, the paid ones are served by the entitlement-checked "content"
// edge function (see data/premiumStore.ts).
//
// Authoring rules unchanged: user-facing prose in Latin American Spanish
// (UTF-8 with accents); ids/keys ASCII. Clinical reasoning is AUTHORED content
// drafted from standard physiotherapy teaching -- verify before professional use.

import type { ClinicalCase } from '../../types/clinicalCase';

export const ANKLE_CASES: ClinicalCase[] = [
  {
    id: 'ankle-lateral-sprain',
    region: 'ankle',
    title: 'Esguince de tobillo en inversión',
    level: 'básico',
    vignette:
      'Jugadora de baloncesto de 21 años. Al caer de un rebote pisa el pie de una compañera y el tobillo derecho se va en inversión. Acude a las 48 horas con edema y hematoma por delante y por debajo del maléolo lateral. Puede apoyar y dar cuatro pasos, con dolor. No hay dolor a la palpación del borde posterior de los maléolos ni de la base del quinto metatarsiano.',
    tags: ['LPAA', 'Reglas de Ottawa', 'Propiocepción'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué ligamento se lesiona primero en el mecanismo de inversión?',
        options: [
          { id: 'a', text: 'Peroneoastragalino anterior (LPAA)', correct: true },
          { id: 'b', text: 'Deltoideo', correct: false },
          { id: 'c', text: 'Peroneocalcáneo', correct: false },
          { id: 'd', text: 'Ligamento tibioperoneo anteroinferior', correct: false },
        ],
        explanation:
          'El peroneoastragalino anterior es el más débil y el primero en ceder en inversión con flexión plantar. El peroneocalcáneo se lesiona después, en esguinces más graves. El deltoideo es medial (mecanismo de eversión) y el tibioperoneo corresponde a la sindesmosis (rotación externa).',
      },
      {
        id: 'q2',
        prompt: 'Según los datos de la exploración, ¿está indicada la radiografía por las reglas de Ottawa?',
        options: [
          {
            id: 'a',
            text: 'No: puede apoyar cuatro pasos y no hay dolor óseo en los puntos clave',
            correct: true,
          },
          { id: 'b', text: 'Sí, porque hay hematoma', correct: false },
          { id: 'c', text: 'Sí, siempre tras un esguince deportivo', correct: false },
          { id: 'd', text: 'No se pueden aplicar en menores de 25 años', correct: false },
        ],
        explanation:
          'Las reglas de Ottawa indican radiografía si hay dolor óseo en el borde posterior o la punta de cualquier maléolo, en el escafoides o en la base del quinto metatarsiano, O si el paciente no puede dar cuatro pasos. Aquí no se cumple ninguno: son reglas muy sensibles, así que un negativo hace la fractura muy improbable. El edema y el hematoma no son criterio.',
      },
      {
        id: 'q3',
        prompt: '¿Cuál es el factor que más se asocia a la recidiva y hay que tratar sí o sí?',
        options: [
          {
            id: 'a',
            text: 'El déficit propioceptivo y la reacción tardía de los peroneos',
            correct: true,
          },
          { id: 'b', text: 'El tamaño del hematoma', correct: false },
          { id: 'c', text: 'La fuerza máxima del cuádriceps', correct: false },
          { id: 'd', text: 'La movilidad de la primera articulación metatarsofalángica', correct: false },
        ],
        explanation:
          'La inestabilidad crónica de tobillo se explica más por el déficit sensoriomotor (retardo del reflejo peroneo, mal control postural) que por la laxitud ligamentosa aislada. Por eso el trabajo propioceptivo y de fuerza de los peroneos es el pilar de la prevención de recidivas.',
      },
    ],
    takeaway:
      'Esguince lateral: LPAA primero, Ottawa para decidir la imagen y propiocepción + peroneos para evitar que se repita.',
  },
  {
    id: 'ankle-achilles',
    region: 'ankle',
    title: 'Dolor en el tendón de Aquiles en corredor',
    level: 'intermedio',
    vignette:
      'Corredor aficionado de 42 años que ha subido de 30 a 55 kilómetros semanales en un mes preparando una media maratón. Dolor y rigidez en el tercio medio del tendón de Aquiles derecho, peor al levantarse por la mañana, que mejora al calentar y reaparece al terminar. La dorsiflexión con la rodilla extendida es de 6°; con la rodilla flexionada, de 18°.',
    tags: ['Tendinopatía aquílea', 'Dorsiflexión', 'Carga progresiva'],
    steps: [
      {
        id: 'q1',
        prompt: 'La dorsiflexión mejora al flexionar la rodilla (6° a 18°). ¿Qué indica?',
        options: [
          {
            id: 'a',
            text: 'Retracción del gastrocnemio, que es biarticular y se destensa al flexionar la rodilla',
            correct: true,
          },
          { id: 'b', text: 'Retracción del sóleo', correct: false },
          { id: 'c', text: 'Bloqueo óseo de la mortaja tibioperoneoastragalina', correct: false },
          { id: 'd', text: 'Debilidad del tibial anterior', correct: false },
        ],
        explanation:
          'Es la prueba de Silfverskiöld. El gastrocnemio cruza rodilla y tobillo: al flexionar la rodilla se relaja y la dorsiflexión aumenta. Si la limitación NO cambiara con la rodilla flexionada, el responsable sería el sóleo (monoarticular) o un tope óseo.',
      },
      {
        id: 'q2',
        prompt: '¿Qué elemento de la historia es el más determinante en la génesis del cuadro?',
        options: [
          {
            id: 'a',
            text: 'El salto brusco de volumen de entrenamiento (de 30 a 55 km/semana en un mes)',
            correct: true,
          },
          { id: 'b', text: 'La edad del paciente', correct: false },
          { id: 'c', text: 'El horario del entrenamiento', correct: false },
          { id: 'd', text: 'La rigidez matutina', correct: false },
        ],
        explanation:
          'La tendinopatía es un problema de CARGA: el error de progresión es el factor modificable central. La rigidez matutina es un síntoma característico, no la causa; y la edad es un factor de riesgo de fondo que no se puede cambiar.',
      },
      {
        id: 'q3',
        prompt: '¿Cuál es la primera línea de tratamiento con mejor respaldo?',
        options: [
          {
            id: 'a',
            text: 'Ejercicio de carga progresiva del tríceps sural, ajustando el volumen de carrera',
            correct: true,
          },
          { id: 'b', text: 'Reposo completo hasta que desaparezca el dolor', correct: false },
          { id: 'c', text: 'Estiramiento pasivo intenso del tendón varias veces al día', correct: false },
          { id: 'd', text: 'Masaje transverso profundo como tratamiento único', correct: false },
        ],
        explanation:
          'La carga progresiva (isométrica al principio si duele mucho, luego excéntrica y de fuerza pesada lenta) es lo que remodela el tendón. El reposo completo lo debilita y el dolor vuelve al retomar la carrera; el estiramiento intenso añade compresión y tracción sin el estímulo de carga que el tendón necesita.',
      },
    ],
    takeaway:
      'Tendinopatía aquílea = problema de carga: corrige la progresión, mide la dorsiflexión con Silfverskiöld y trata con carga progresiva, no con reposo.',
  },
];
