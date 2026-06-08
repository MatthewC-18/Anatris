// src/data/fundamentosConcept.ts
//
// FUNDAMENTOS - the introductory conceptual module. See src/types/concept.ts.
// This is NOT a body region: it teaches the vocabulary of movement (planes,
// axes, nomenclature, contraction types, levers, kinetic chains) that the
// student needs before studying any joint. It is the natural FIRST item in the
// module menu.
//
// AUTHORING / ENCODING RULE:
//   - User-facing strings (title, summary, body text, term, definition,
//     caption): proper Latin American Spanish WITH accents and enie, UTF-8.
//   - Code, ids, keys, enum-like values (id, overlay, view, diagram, ref):
//     ASCII only.
//   - Editor MUST save as UTF-8 without BOM.
//
// CONTENT STATUS: DRAFT. Standard kinesiology textbook material structured for
// teaching. Every Citation stays pageVerified:false until checked against the
// physical editions. Never invent a page.
//
// 3D / DIAGRAM HOOKS:
//   - The planes/axes sections request the viewer's overlay (reusing the live
//     model + camera), the honest "narrate over the real anatomy" approach.
//   - The contraction / lever / chain sections use small built-in 2D diagrams
//     (the renderer maps the diagram key to an SVG); the data never embeds SVG.

import type { ConceptTrack } from '../types/concept';

export const FUNDAMENTOS_TRACK: ConceptTrack = {
  conceptId: 'fundamentos',
  conceptName: 'Fundamentos',
  intro: {
    text: 'Antes de estudiar una articulación necesitas un lenguaje común para describir el movimiento: en qué plano ocurre, alrededor de qué eje, con qué nombre y con qué tipo de contracción. Estos fundamentos son la base de todo el razonamiento clínico que sigue.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  sections: [
    {
      id: 'posicion-anatomica',
      title: 'Posición anatómica',
      summary: 'El punto de partida de toda descripción del movimiento.',
      body: [
        {
          text: 'La posición anatómica de referencia es de pie, con la mirada al frente, los brazos a los lados, las palmas hacia delante y los pies juntos. Todos los términos de movimiento y de dirección se definen respecto a esta posición, no a la postura real del paciente.',
          cite: [{ ref: 'gray', pageVerified: false }],
        },
        {
          text: 'Por convención, "medial" es hacia la línea media del cuerpo y "lateral" alejándose de ella; "proximal" es más cerca del tronco y "distal" más lejos. Estos pares evitan ambigüedades como "arriba" o "adentro", que cambian con la postura.',
          cite: [{ ref: 'gray', pageVerified: false }],
        },
      ],
      view: {
        overlay: 'none',
        view: 'anterior',
        caption: {
          text: 'El modelo se muestra en posición anatómica: de frente, palmas hacia delante.',
          cite: [{ ref: 'gray', pageVerified: false }],
        },
      },
    },
    {
      id: 'planos-anatomicos',
      title: 'Planos anatómicos',
      summary: 'Sagital, frontal y transversal: dónde ocurre el movimiento.',
      body: [
        {
          text: 'Los tres planos cardinales dividen el cuerpo y definen dónde ocurre un movimiento. El plano sagital lo divide en mitades derecha e izquierda; el plano frontal (o coronal), en una parte anterior y otra posterior; el plano transversal (u horizontal), en una superior y otra inferior.',
          cite: [{ ref: 'kapandji', pageVerified: false }],
        },
        {
          text: 'La regla práctica: la flexión y la extensión ocurren en el plano sagital; la abducción y la aducción, en el frontal; las rotaciones, en el transversal. Reconocer el plano de un movimiento es el primer paso para identificar qué músculos lo producen.',
          cite: [{ ref: 'kapandji', pageVerified: false }],
        },
      ],
      terms: [
        {
          term: 'Plano sagital',
          definition: {
            text: 'Divide el cuerpo en derecha e izquierda. El plano sagital medio pasa por la línea media.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
        {
          term: 'Plano frontal',
          definition: {
            text: 'Divide el cuerpo en anterior y posterior. También se le llama plano coronal.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
        {
          term: 'Plano transversal',
          definition: {
            text: 'Divide el cuerpo en superior e inferior. Es el plano de las rotaciones.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
      ],
      view: {
        overlay: 'planes',
        view: 'three-quarter',
        caption: {
          text: 'Los tres planos cardinales se superponen sobre el modelo. Gira la vista para verlos en el espacio.',
          cite: [{ ref: 'kapandji', pageVerified: false }],
        },
      },
    },
    {
      id: 'ejes-de-movimiento',
      title: 'Ejes de movimiento',
      summary: 'Toda rotación articular gira alrededor de un eje perpendicular a su plano.',
      body: [
        {
          text: 'Cada movimiento angular gira alrededor de un eje perpendicular al plano en que ocurre. El eje frontal (de lado a lado) gobierna la flexo-extensión en el plano sagital; el eje sagital (de delante a atrás) gobierna la abducción-aducción en el plano frontal; el eje vertical (longitudinal) gobierna las rotaciones en el plano transversal.',
          cite: [{ ref: 'kapandji', pageVerified: false }],
        },
        {
          text: 'Eje y plano siempre van juntos y son perpendiculares: el eje es la línea imaginaria alrededor de la cual gira el hueso, el plano es la lámina en la que se desplaza el segmento. Pensar en ambos a la vez ordena la biomecánica de cualquier articulación.',
          cite: [{ ref: 'kapandji', pageVerified: false }],
        },
      ],
      terms: [
        {
          term: 'Eje frontal',
          definition: {
            text: 'De lado a lado; perpendicular al plano sagital. Eje de la flexo-extensión.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
        {
          term: 'Eje sagital',
          definition: {
            text: 'De delante a atrás; perpendicular al plano frontal. Eje de la abducción-aducción.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
        {
          term: 'Eje vertical',
          definition: {
            text: 'De arriba a abajo; perpendicular al plano transversal. Eje de las rotaciones.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
      ],
      view: {
        overlay: 'planes-and-axes',
        view: 'three-quarter',
        caption: {
          text: 'Cada eje (línea) es perpendicular a su plano (lámina). Observa cómo se emparejan.',
          cite: [{ ref: 'kapandji', pageVerified: false }],
        },
      },
    },
    {
      id: 'nomenclatura-movimientos',
      title: 'Nomenclatura de los movimientos',
      summary: 'Los nombres estándar de los movimientos articulares.',
      body: [
        {
          text: 'Los movimientos básicos se nombran por pares opuestos. Flexión y extensión modifican el ángulo en el plano sagital. Abducción aleja un segmento de la línea media; aducción lo acerca, en el plano frontal. Rotación interna y externa giran el segmento en el plano transversal.',
          cite: [{ ref: 'kapandji', pageVerified: false }],
        },
        {
          text: 'Hay movimientos compuestos y regionales: la circunducción combina flexión, abducción, extensión y aducción en un cono; la pronación y supinación del antebrazo; la inversión y eversión del pie. Cada región añade su vocabulario propio, pero todos se anclan a los planos y ejes.',
          cite: [{ ref: 'kapandji', pageVerified: false }],
        },
      ],
      terms: [
        {
          term: 'Flexión / Extensión',
          definition: {
            text: 'Disminuye / aumenta el ángulo articular, en el plano sagital.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
        {
          term: 'Abducción / Aducción',
          definition: {
            text: 'Aleja / acerca un segmento de la línea media, en el plano frontal.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
        {
          term: 'Rotación interna / externa',
          definition: {
            text: 'Gira el segmento hacia dentro / hacia fuera, en el plano transversal.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
        {
          term: 'Circunducción',
          definition: {
            text: 'Movimiento circular que combina flexión, abducción, extensión y aducción.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
      ],
      view: {
        overlay: 'none',
        view: 'anterior',
      },
    },
    {
      id: 'tipos-de-contraccion',
      title: 'Tipos de contracción muscular',
      summary: 'Concéntrica, excéntrica e isométrica: cómo trabaja el músculo.',
      body: [
        {
          text: 'Un músculo puede generar tensión de tres formas. En la contracción concéntrica el músculo se acorta y vence la resistencia (subir una mancuerna). En la excéntrica el músculo se alarga mientras frena la resistencia (bajarla de forma controlada). En la isométrica genera tensión sin cambiar de longitud (sostenerla quieta).',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        {
          text: 'La distinción es clínica, no solo académica: la contracción excéntrica produce más fuerza y es la implicada en muchas lesiones (tirón de isquiotibiales en la carrera) y en su rehabilitación. Identificar qué tipo de contracción falla orienta el ejercicio terapéutico.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      ],
      terms: [
        {
          term: 'Concéntrica',
          definition: {
            text: 'El músculo se acorta y produce movimiento venciendo la carga.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
        },
        {
          term: 'Excéntrica',
          definition: {
            text: 'El músculo se alarga mientras frena la carga (control del descenso).',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
        },
        {
          term: 'Isométrica',
          definition: {
            text: 'El músculo genera tensión sin cambiar de longitud; no hay movimiento articular.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
        },
      ],
      diagram: 'contraction-types',
    },
    {
      id: 'palancas',
      title: 'Sistemas de palanca',
      summary: 'Primer, segundo y tercer género: cómo el cuerpo transmite fuerza.',
      body: [
        {
          text: 'El aparato locomotor funciona como un sistema de palancas: el hueso es la barra, la articulación el fulcro (punto de apoyo), el músculo aplica la potencia y la carga es la resistencia. Según el orden de estos tres elementos, la palanca es de primer, segundo o tercer género.',
          cite: [{ ref: 'kapandji', pageVerified: false }],
        },
        {
          text: 'La mayoría de las palancas del cuerpo son de tercer género (potencia entre el fulcro y la resistencia, como el codo en flexión): favorecen la velocidad y la amplitud de movimiento a costa de exigir mucha fuerza muscular. Entender el género de palanca explica por qué un músculo necesita generar fuerzas varias veces mayores que la carga que mueve.',
          cite: [{ ref: 'kapandji', pageVerified: false }],
        },
      ],
      terms: [
        {
          term: 'Primer género',
          definition: {
            text: 'Fulcro entre potencia y resistencia (como una balanza). Ej.: la cabeza sobre la columna cervical.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
        {
          term: 'Segundo género',
          definition: {
            text: 'Resistencia entre fulcro y potencia. Favorece la fuerza. Ej.: ponerse de puntillas.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
        {
          term: 'Tercer género',
          definition: {
            text: 'Potencia entre fulcro y resistencia. Favorece velocidad y amplitud. Es el más frecuente en el cuerpo.',
            cite: [{ ref: 'kapandji', pageVerified: false }],
          },
        },
      ],
      diagram: 'lever-classes',
    },
    {
      id: 'cadenas-cineticas',
      title: 'Cadenas cinéticas',
      summary: 'Cadena abierta y cerrada: el contexto cambia la función.',
      body: [
        {
          text: 'Una cadena cinética abierta tiene el segmento distal libre en el espacio (extender la rodilla sentado, con el pie en el aire). En la cadena cerrada el segmento distal está fijo contra una resistencia (ponerse de pie desde una sentadilla, con el pie en el suelo). El mismo músculo cumple funciones distintas en cada contexto.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        {
          text: 'La distinción guía el ejercicio terapéutico: los ejercicios en cadena cerrada (sentadilla controlada) suelen ser más funcionales y seguros para la articulación porque reparten la carga y favorecen la co-contracción estabilizadora, mientras los de cadena abierta permiten aislar un músculo concreto.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      ],
      terms: [
        {
          term: 'Cadena abierta',
          definition: {
            text: 'El extremo distal se mueve libre en el espacio; permite aislar un músculo.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
        },
        {
          term: 'Cadena cerrada',
          definition: {
            text: 'El extremo distal está fijo; favorece la función global y la co-contracción.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
        },
      ],
      diagram: 'kinetic-chains',
    },
  ],
};
