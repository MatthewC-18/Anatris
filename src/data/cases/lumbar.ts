// src/data/cases/lumbar.ts
//
// Clinical cases for the lumbar region. Split out of the old single
// clinicalCases.ts so each region's prose ships separately: the free region
// stays bundled, the paid ones are served by the entitlement-checked "content"
// edge function (see data/premiumStore.ts).
//
// Authoring rules unchanged: user-facing prose in Latin American Spanish
// (UTF-8 with accents); ids/keys ASCII. Clinical reasoning is AUTHORED content
// drafted from standard physiotherapy teaching -- verify before professional use.

import type { ClinicalCase } from '../../types/clinicalCase';

export const LUMBAR_CASES: ClinicalCase[] = [
  {
    id: 'lx-l5-radiculopathy',
    region: 'lumbar',
    title: 'Lumbalgia con caída del pie',
    level: 'intermedio',
    vignette:
      'Hombre de 40 años con lumbalgia irradiada por la cara posterolateral del muslo y pierna hasta el dorso del pie y el primer dedo. Tiene dificultad para caminar de talones y debilidad para extender el dedo gordo.',
    tags: ['Radiculopatía', 'L5', 'Extensor del hallux'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué raíz explica mejor la debilidad de extensión del dedo gordo y la marcha de talones?',
        options: [
          { id: 'a', text: 'L5', correct: true },
          { id: 'b', text: 'S1', correct: false },
          { id: 'c', text: 'L3', correct: false },
          { id: 'd', text: 'L1', correct: false },
        ],
        explanation:
          'L5 inerva el extensor largo del hallux y el tibial anterior (dorsiflexión); su afectación da debilidad para extender el dedo gordo y para caminar de talones, con dolor por el dermatoma L5 hasta el dorso del pie. S1 daría debilidad de flexión plantar (marcha de puntillas).',
      },
      {
        id: 'q2',
        showsTest: 'slr-lasegue',
        prompt:
          'Las cuatro son pruebas lumbopélvicas. ¿Cuál tensa la raíz afectada y reproduce ESTE dolor?',
        options: [
          { id: 'a', text: 'Elevación de la pierna recta (Lasègue / SLR)', correct: true },
          { id: 'b', text: 'Tensión del nervio femoral (Lasègue invertido)', correct: false },
          { id: 'c', text: 'Elevación cruzada de la pierna recta', correct: false },
          { id: 'd', text: 'Maniobra de Gaenslen', correct: false },
        ],
        explanation:
          'El SLR tensa el ciático y con él las raíces L4–S1, que es donde está el problema: sensible, poco específico, sirve para descartar. El Lasègue invertido tensa el FEMORAL (L2–L4): es la misma idea un nivel más arriba y aquí no tocaría la raíz afectada. La elevación cruzada sí es de estas raíces, pero se levanta la pierna SANA y reproduce el dolor en la enferma: muy específica y poco sensible, de modo que confirma cuando sale positiva y no sustituye al SLR. Y Gaenslen provoca la sacroilíaca, no el nervio: se usa cuando la hipótesis es articular.',
      },
    ],
    takeaway:
      'Debilidad de extensión del hallux + marcha de talones + dolor al dorso del pie sugieren radiculopatía L5; el SLR apoya el componente radicular.',
  },
  // ---------------------------------------------------------------------------
  // LAS DOS PRESENTACIONES QUE FALTABAN.
  //
  // La region lumbar tenia UN caso, la radiculopatia L5, y once pruebas. Las
  // cinco del conjunto sacroiliaco -- el unico conjunto MEDIDO de toda la
  // aplicacion, con su cifra y su cita -- no aparecian en ningun razonamiento,
  // y faltaba el motivo de consulta mas frecuente que existe: la lumbalgia
  // inespecifica, que es precisamente el caso donde ninguna prueba especial
  // anade nada y hay que saber por que.
  // ---------------------------------------------------------------------------
  {
    id: 'lx-nonspecific-acute',
    region: 'lumbar',
    title: 'Lumbalgia de cinco días tras levantar una caja',
    level: 'básico',
    vignette:
      'Hombre de 29 años con dolor lumbar desde hace cinco días, tras levantar una caja girando el tronco. El dolor es difuso en la zona lumbar y en la nalga, no pasa de la rodilla. No hay hormigueos ni pérdida de fuerza, camina normal. Sin fiebre, sin pérdida de peso, sin dolor que lo despierte de noche, sin cambios en el control de esfínteres, sin antecedente de cáncer ni de corticoides.',
    tags: ['Lumbalgia inespecífica', 'Banderas rojas', 'Mantener actividad'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué es lo primero que hay que resolver en esta consulta?',
        options: [
          {
            id: 'a',
            text: 'Descartar banderas rojas con la anamnesis y una exploración neurológica básica',
            correct: true,
          },
          { id: 'b', text: 'Pedir una resonancia para ver qué estructura está dañada', correct: false },
          { id: 'c', text: 'Clasificar el dolor en una escala y empezar a tratar', correct: false },
          { id: 'd', text: 'Buscar el segmento responsable con pruebas de movilidad segmentaria', correct: false },
        ],
        explanation:
          'El primer trabajo no es encontrar la estructura, es descartar lo que no es una lumbalgia mecánica: fractura, infección, tumor, síndrome de cola de caballo, espondiloartritis inflamatoria. Eso se hace preguntando y explorando, no con imagen. Una vez descartado, el cuadro se llama INESPECÍFICO con todas las letras, y nombrar la estructura exacta no es posible ni necesario para tratarlo bien.',
      },
      {
        id: 'q2',
        prompt: 'Nada de eso aparece. ¿Está indicada la imagen ahora?',
        options: [
          {
            id: 'a',
            text: 'No: sin banderas rojas ni déficit, no cambia el tratamiento en las primeras semanas',
            correct: true,
          },
          { id: 'b', text: 'Sí, una radiografía para descartar una hernia', correct: false },
          { id: 'c', text: 'Sí, una resonancia, porque el dolor llega a la nalga', correct: false },
          { id: 'd', text: 'Sí, para poder explicarle al paciente qué tiene exactamente', correct: false },
        ],
        explanation:
          'Sin banderas rojas ni déficit, la imagen precoz no mejora el resultado y sí tiene coste: encuentra degeneración y protrusiones que también tienen las personas sin dolor, y ese hallazgo se convierte en una etiqueta que asusta y frena el movimiento. Además, una radiografía no ve una hernia. El dolor referido a la nalga, sin pasar de la rodilla y sin déficit, es típicamente mecánico y no indica estudio.',
      },
      {
        id: 'q3',
        prompt: '¿Y el tratamiento de la primera semana?',
        options: [
          {
            id: 'a',
            text: 'Mantener la actividad dentro de lo tolerable, explicar el pronóstico y progresar carga',
            correct: true,
          },
          { id: 'b', text: 'Reposo en cama hasta que deje de doler', correct: false },
          { id: 'c', text: 'Corsé de uso continuo durante un mes', correct: false },
          { id: 'd', text: 'Evitar toda flexión lumbar de forma indefinida', correct: false },
        ],
        explanation:
          'Lo que mejor sostiene el pronóstico es seguir moviéndose y entender que el dolor agudo lumbar suele mejorar en semanas. El reposo en cama empeora el resultado y alarga la baja. Un corsé continuo delega en una prenda lo que tiene que hacer el propio control motor. Y prohibir la flexión indefinidamente enseña a tener miedo a un movimiento normal, que es el camino a la cronificación.',
      },
    ],
    takeaway:
      'Lumbalgia inespecífica: el trabajo clínico es descartar banderas rojas, no encontrar la estructura. Sin déficit no hay imagen, y el tratamiento es movimiento con explicación. Es el caso donde ninguna prueba especial añade nada.',
  },
  {
    id: 'lx-sacroiliac',
    region: 'lumbar',
    title: 'Dolor en la nalga que no pasa de la rodilla',
    level: 'intermedio',
    vignette:
      'Mujer de 38 años con cuatro meses de dolor en la nalga derecha. Cuando le piden que señale dónde, pone el dedo justo por debajo y por dentro de la espina iliaca posterosuperior. Duele al levantarse de la silla y al apoyarse sobre una pierna, y mejora caminando. El dolor no pasa de la rodilla, no hay hormigueos ni debilidad, y la elevación de la pierna recta es negativa.',
    tags: ['Sacroilíaca', 'Conjunto de Laslett', 'Dolor referido'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué hipótesis encaja mejor con este patrón?',
        options: [
          { id: 'a', text: 'Dolor de origen sacroilíaco', correct: true },
          { id: 'b', text: 'Radiculopatía S1', correct: false },
          { id: 'c', text: 'Estenosis del canal lumbar', correct: false },
          { id: 'd', text: 'Hernia discal L4–L5 con dolor referido', correct: false },
        ],
        explanation:
          'Un dedo señalando por debajo de la espina iliaca posterosuperior, dolor que no pasa de la rodilla, sin parestesias ni debilidad y con elevación de la pierna recta negativa: ese conjunto apunta a la articulación, no a la raíz. Una radiculopatía S1 bajaría por la pantorrilla hasta el pie con el reflejo aquíleo afectado. La estenosis duele al caminar y alivia al sentarse, justo lo contrario que aquí. Y una hernia que refiere dolor sin déficit es posible, pero no explica el punto que la paciente señala ni que mejore caminando.',
      },
      {
        id: 'q2',
        showsTest: 'si-thigh-thrust',
        prompt:
          'Las cuatro son pruebas lumbopélvicas. ¿Cómo se explora esta hipótesis con rendimiento?',
        options: [
          {
            id: 'a',
            text: 'Con el conjunto de provocación completo: distracción, empuje del muslo, compresión, empuje sacro y Gaenslen',
            correct: true,
          },
          { id: 'b', text: 'Con la distracción sacroilíaca sola; si es negativa, se descarta', correct: false },
          { id: 'c', text: 'Con el test de Slump, para ver si el dolor es neural', correct: false },
          { id: 'd', text: 'Con la elevación de la pierna recta, repitiéndola con más cuidado', correct: false },
        ],
        explanation:
          'La sacroilíaca no se explora con una prueba, se explora con el CONJUNTO: tres o más positivas de las de provocación es la cifra que está medida contra bloqueo anestésico intraarticular, y ninguna de ellas sola llega ahí. Tampoco se pueden multiplicar sus razones de verosimilitud, porque las cinco provocan la MISMA articulación y no son hallazgos independientes. El Slump y la elevación de la pierna recta exploran tejido neural, que es la hipótesis que esta historia ya deja atrás.',
      },
      {
        id: 'q3',
        showsTest: 'si-distraction',
        prompt: 'Las cinco pruebas de provocación salen negativas. ¿Qué significa?',
        options: [
          {
            id: 'a',
            text: 'La sacroilíaca queda descartada como origen y hay que buscar otra fuente',
            correct: true,
          },
          { id: 'b', text: 'No significa nada: las pruebas de provocación no tienen valor', correct: false },
          { id: 'c', text: 'Sigue siendo sacroilíaco, pero en una fase poco irritable', correct: false },
          { id: 'd', text: 'Hay que repetirlas con más fuerza hasta reproducir el dolor', correct: false },
        ],
        explanation:
          'Este es el extremo más útil del conjunto en consulta, y también está medido: con todas las pruebas de provocación negativas, la sacroilíaca queda descartada como origen del dolor. Un conjunto sensible sirve precisamente para eso, para cerrar una hipótesis, mientras una sola prueba positiva no la abre. Repetir con más fuerza no es explorar mejor: es cambiar la prueba por otra que ya no es la medida.',
      },
    ],
    // "Con todas negativas" y no "las cinco": el resumen de Laslett 2005 (PMID
    // 16038856, E-utilities, 23 nov) dice que se descarta cuando las SEIS no
    // provocan el dolor conocido, y la ficha lista cinco entradas. Por que son
    // seis (el Gaenslen de los dos lados) solo sale de una copia no oficial del
    // texto, asi que la cuenta no va en el texto visible.
    takeaway:
      'La sacroilíaca se descarta mejor de lo que se confirma: tres o más pruebas de provocación positivas la apoyan, y con todas negativas queda descartada. Una sola prueba, en cualquier dirección, no decide.',
  },
];
