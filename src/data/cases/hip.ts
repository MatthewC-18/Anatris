// src/data/cases/hip.ts
//
// Clinical cases for the hip region. Split out of the old single
// clinicalCases.ts so each region's prose ships separately: the free region
// stays bundled, the paid ones are served by the entitlement-checked "content"
// edge function (see data/premiumStore.ts).
//
// Authoring rules unchanged: user-facing prose in Latin American Spanish
// (UTF-8 with accents); ids/keys ASCII. Clinical reasoning is AUTHORED content
// drafted from standard physiotherapy teaching -- verify before professional use.

import type { ClinicalCase } from '../../types/clinicalCase';

export const HIP_CASES: ClinicalCase[] = [
  {
    id: 'hip-fai',
    region: 'hip',
    title: 'Dolor inguinal en futbolista de 24 años',
    level: 'intermedio',
    vignette:
      'Futbolista de 24 años con dolor inguinal derecho de seis meses, progresivo, sin traumatismo. Empeora al sentarse mucho rato, al entrar y salir del coche y en los cambios de dirección. Señala la ingle con la mano en pinza. En la exploración, la rotación interna de cadera en flexión de 90° es de 15° a la derecha y de 35° a la izquierda.',
    tags: ['Pinzamiento femoroacetabular', 'Labrum', 'FADIR'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué significa el signo de la C que hace el paciente con la mano?',
        options: [
          {
            id: 'a',
            text: 'Dolor intraarticular profundo de cadera',
            correct: true,
          },
          { id: 'b', text: 'Tendinopatía glútea lateral', correct: false },
          { id: 'c', text: 'Dolor referido lumbar', correct: false },
          { id: 'd', text: 'Hernia inguinal', correct: false },
        ],
        explanation:
          'El signo de la C (mano en pinza abrazando la cara lateral y anterior de la cadera) es un gesto característico del dolor intraarticular. Un dolor lateral puntual con el dedo apunta a tendinopatía glútea, y un dolor difuso lumbar se señala con la palma en la espalda.',
      },
      {
        id: 'q2',
        prompt: '¿Qué test provoca mejor el pinzamiento anterior?',
        options: [
          { id: 'a', text: 'FADIR (flexión, aducción y rotación interna)', correct: true },
          { id: 'b', text: 'Prueba de Ober', correct: false },
          { id: 'c', text: 'Signo de Trendelenburg', correct: false },
          { id: 'd', text: 'Prueba de Thomas', correct: false },
        ],
        explanation:
          'FADIR lleva el cuello femoral contra el reborde acetabular anterosuperior y comprime el labrum: es el test de provocación del pinzamiento anterior, muy sensible y poco específico. Ober valora la banda iliotibial, Trendelenburg los abductores y Thomas la longitud de los flexores.',
      },
      {
        id: 'q3',
        prompt: 'La asimetría de rotación interna (15° vs 35°) es el dato más objetivo. ¿Qué implica para el tratamiento?',
        options: [
          {
            id: 'a',
            text: 'Trabajar control lumbopélvico y fuerza de cadera evitando el rango de choque, sin forzar la rotación interna',
            correct: true,
          },
          { id: 'b', text: 'Estirar agresivamente la cadera en rotación interna forzada', correct: false },
          { id: 'c', text: 'Reposo deportivo absoluto durante tres meses', correct: false },
          { id: 'd', text: 'Fortalecer solo el psoas en rango máximo de flexión', correct: false },
        ],
        explanation:
          'La restricción es de origen ÓSEO (morfología cam), no de tejido blando: forzar la rotación interna repite el choque y agrava la lesión labral. El tratamiento conservador de referencia es fuerza de cadera y control lumbopélvico dentro de un rango libre de dolor, con adaptación del gesto deportivo.',
      },
    ],
    takeaway:
      'Dolor inguinal + signo de la C + asimetría de rotación interna en flexión = sospecha de pinzamiento femoroacetabular; se trabaja fuerza y control POR DEBAJO del rango de choque, no estirando contra el hueso.',
  },
  {
    id: 'hip-gluteal-tendinopathy',
    region: 'hip',
    title: 'Dolor lateral de cadera que no deja dormir',
    level: 'básico',
    vignette:
      'Mujer de 55 años con dolor en la cara lateral de la cadera izquierda desde hace cuatro meses. No puede dormir sobre ese lado ni cruzar las piernas. Duele al subir escaleras y al estar de pie mucho rato. La palpación del trocánter mayor es exquisitamente dolorosa. En apoyo monopodal izquierdo, la pelvis derecha desciende.',
    tags: ['Tendinopatía glútea', 'Trendelenburg', 'Glúteo medio'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué estructura explica mejor el cuadro?',
        options: [
          {
            id: 'a',
            text: 'Tendón del glúteo medio y menor en su inserción en el trocánter mayor',
            correct: true,
          },
          { id: 'b', text: 'Labrum acetabular', correct: false },
          { id: 'c', text: 'Bursa iliopectínea', correct: false },
          { id: 'd', text: 'Raíz L4', correct: false },
        ],
        explanation:
          'El dolor lateral sobre el trocánter con imposibilidad de tumbarse de ese lado es el cuadro clásico de la tendinopatía glútea (el antiguo "bursitis trocantérea": hoy sabemos que el tendón es la estructura dominante). El labrum da dolor inguinal y L4 daría irradiación por la cara anteromedial del muslo.',
      },
      {
        id: 'q2',
        prompt: 'La pelvis derecha desciende en apoyo monopodal izquierdo. ¿Cómo se llama y qué indica?',
        options: [
          {
            id: 'a',
            text: 'Signo de Trendelenburg positivo: insuficiencia de los abductores IZQUIERDOS',
            correct: true,
          },
          {
            id: 'b',
            text: 'Signo de Trendelenburg positivo: insuficiencia de los abductores derechos',
            correct: false,
          },
          { id: 'c', text: 'Signo de Thomas positivo', correct: false },
          { id: 'd', text: 'Signo de Ober positivo', correct: false },
        ],
        explanation:
          'El Trendelenburg se nombra por el lado de APOYO: si la pelvis del lado que cuelga (derecha) desciende, el fallo está en los abductores del lado que soporta (izquierda). Es un error frecuente y cambia por completo el objetivo del tratamiento.',
      },
      {
        id: 'q3',
        prompt: '¿Qué consejo empeoraría el cuadro?',
        options: [
          {
            id: 'a',
            text: 'Estirar la banda iliotibial cruzando la pierna por delante en aducción mantenida',
            correct: true,
          },
          { id: 'b', text: 'Dormir con una almohada entre las rodillas', correct: false },
          { id: 'c', text: 'Ejercicio isométrico de abducción de baja carga', correct: false },
          { id: 'd', text: 'Evitar estar de pie con la cadera "colgada" hacia un lado', correct: false },
        ],
        explanation:
          'La aducción COMPRIME el tendón glúteo contra el trocánter mayor: los estiramientos en aducción y dormir sin almohada entre las rodillas mantienen la compresión y perpetúan el dolor. El tratamiento va por evitar la compresión y cargar el tendón progresivamente.',
      },
    ],
    takeaway:
      'En el dolor lateral de cadera la clave es la COMPRESIÓN en aducción: quitarla (postura, almohada, evitar estiramientos en aducción) y cargar el tendón de forma progresiva.',
  },
];
