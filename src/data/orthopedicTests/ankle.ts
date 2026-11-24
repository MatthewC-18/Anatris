// src/data/orthopedicTests/ankle.ts
//
// Orthopedic special tests for the ANKLE. Analogue of ./hip.ts.
//
// ESTADO DE LA VERIFICACION (2026-11-04; cajon e inclinacion astragalina
// puestos al dia el 2026-11-15, la nota de Kleiger el 2026-11-23). Las cinco
// pruebas estan comprobadas contra su fuente y ninguna cita ya un manual sin
// abrir. Una salvedad con Sman 2015, cuyo texto completo es de pago: cuatro de
// sus cifras no estan en el resumen, el 63% y el LR+ 1,93 de Kleiger y el 26%
// y el LR- 0,84 del squeeze. Se leyeron en la Tabla 5 abierta de Beynon 2022
// (PMC9764698, Europe PMC, 23 nov), que reproduce sus dos filas con los
// intervalos (ver la nota de Kleiger).
//
//   ankle-anterior-drawer   78% / 75%  ->  54% / 87%: Netterstrom-Wedin 2022 (6 estudios, 885 obs.)
//   ankle-talar-tilt        50% / 88%  ->  sin cifra agrupada: 4 estudios (Netterstrom-Wedin 2022), 17-66% / 82-100%, confirma
//   ankle-thompson          96% / 93%  ->  confirmadas: Maffulli 1998, 174 roturas
//   ankle-kleiger / squeeze            ->  Sman 2015; la nota de Kleiger cita ademas de Cesar 2011 y Baltes 2022 sin achacar la diferencia a la posicion
//
// El hallazgo que cambia como se ensena el tobillo esta en van Dijk 1996 (160
// traumatismos consecutivos por inversion, hallazgos quirurgicos como patron de
// referencia): el estudio no compara pruebas sueltas, compara ESTRATEGIAS. La
// misma exploracion fisica da 71% / 33% antes de las 48 horas y 96% / 84% a los
// cinco dias. Esa diferencia es mayor que la que separa a dos pruebas
// distintas, y mayor que la que separa al explorador experto (96/84) del
// inexperto bien instruido (89/70). En el tobillo, el factor que manda es
// CUANDO se explora.
//
// Las dos pruebas de estabilidad lateral estuvieron en nota, sin cifra, porque
// se dio por hecho que nadie las media por separado. No era asi. La revision
// sistematica de Netterstrom-Wedin 2022 (PMID 34286639; texto completo
// PMC9109591; los dos leidos por E-utilities el 15 nov) metaanaliza seis
// estudios del cajon aislado, 54% / 87% (uno de los seis es la publicacion de
// van Dijk en el J Bone Joint Surg Br, PMID 8951015), y reune cuatro de la
// inclinacion astragalina sin agruparlos, 17-66% / 82-100%. Su conclusion: el
// cajon y la inclinacion confirman, y la palpacion del LPAA descarta. De ahi
// 'rule-in' en las dos; la inclinacion lleva su utilityBasis porque no tiene
// cifra agrupada. La fecha sigue pesando, y la cifra del cajon depende del
// umbral con que se da por positivo (efecto umbral, en el texto completo).
//
// DEMO: un movimiento de tobillo accionable (ankleRom.ts) solo donde el rig de
// un eje se acerca a la maniobra. El cajon posa solo su flexion plantar de
// partida (el rig gira articulaciones, no traslada el astragalo); la
// inclinacion, la direccion de la inversion; Thompson, la respuesta normal a la
// compresion. Sin demo: el squeeze, porque el rig no comprime, y Kleiger,
// porque ningun movimiento gira el pie sobre la tibia quieta (foot_flex solo se
// conduce en x e y; su z no la conduce nadie). Compartir foot_flex NO es el
// motivo: RigModel.applyComponents compone sobre el hueso que la base ya giro
// (revisiones U61 y J30, 23 nov; ver la nota de Kleiger).
//
// QUIEN HACE LA FUERZA, SIN MANO (15 nov). El cajon y la inclinacion son
// pruebas pasivas y llevan `examinerForce: 'applies'` con `examinerHand: false`:
// asi vuelven la etiqueta "Pasivo" y el aviso de no contraer, y no se promete
// una mano que no sale. foot_flex no tiene descendientes (lo leyo en el JSON del
// GLB el verificador de C52; no se ha vuelto a medir aqui) y DISTAL_OF no tiene
// entrada para el (RigOverlays.tsx:176-186), asi que la mano generica se
// ocultaria igual (RigOverlays.tsx:495-512); y si saliera, empujaria hacia el
// reposo colgando (RigOverlays.tsx:521-526), no tiraria del talon ni
// invertiria el retropie. Las
// revisiones C48 y C52 pedian NO declarar `examinerForce` precisamente por esa
// mano prometida; el campo `examinerHand` (commit 21233e0) quita esa razon, y
// es lo mismo que hacen hoy los cajones de knee.ts. Thompson no lo lleva: la
// ficha pasiva dice "La fuerza la aplicas tu sobre el segmento distal"
// (OrthopedicTestsPanel.tsx:1239), y en Thompson se comprime la pantorrilla,
// que es el segmento proximal.

import type { OrthopedicTest } from '../../types/orthopedicTest';

export const ANKLE_ORTHOPEDIC_TESTS: OrthopedicTest[] = [
  /* ======================= Lateral stability ======================= */
  {
    id: 'ankle-anterior-drawer',
    name: 'Cajón anterior de tobillo',
    aka: ['Anterior drawer test'],
    region: 'ankle',
    category: 'Estabilidad lateral',
    target: 'Ligamento peroneoastragalino anterior (LPAA)',
    purpose: 'Detectar laxitud del LPAA tras el esguince por inversión.',
    // LA POSICION DEL PACIENTE FALTABA (revision C51). La maniobra no decia como
    // se coloca, y "la mayoria de los estudios" explora con la rodilla
    // flexionada, en supino o sentado (Netterstrom-Wedin 2022, PMC9109591,
    // Resultados). La Discusion da el porque: rodilla flexionada y flexion
    // plantar JUNTAS dejan el triceps sural con la minima tension y cargan al
    // maximo el LPAA; la rodilla sola solo afloja el gastrocnemio, porque el
    // soleo es monoarticular. Kovaleski 2008 (PMID 18523573, resumen, leido por
    // E-utilities) midio con artrometro la laxitud maxima con la rodilla a 90 y
    // el tobillo a 10 de flexion plantar, frente a la rodilla a 0.
    maneuver:
      'Paciente sentado o en supino con la rodilla flexionada, como lo describe la mayoría de los estudios, y el tobillo en ligera flexión plantar: las dos posiciones juntas dejan el tríceps sural con la mínima tensión y cargan al máximo el LPAA. Se estabiliza la tibia y se tracciona el retropié/calcáneo hacia delante. Con artrómetro, en deportistas, la laxitud fue máxima con la rodilla a 90° y el tobillo a 10° de flexión plantar, frente a la rodilla extendida.',
    positive:
      'Desplazamiento anterior aumentado del astrágalo (a veces con hoyuelo de succión) frente al lado sano.',
    // CON CIFRA PROPIA (revision C50). La nota decia que nadie mide el cajon por
    // separado, y el metaanalisis de Netterstrom-Wedin 2022 agrupa seis
    // estudios del cajon aislado: 54% (35-71) y 87% (63-96) estan en el resumen
    // (PMID 34286639); LR+ 3,97 (1,50-10,47), LR- 0,54 (0,39-0,75) y la
    // heterogeneidad (I2 94,2% y 62,1%), en el texto completo (PMC9109591).
    // Croy 2013 es uno de los seis (su ref. 11): las cifras de su resumen (PMID
    // 24175608) salen de sus dos patrones ecograficos. La revision cree
    // "plausible" que un efecto umbral explique "parte" de la dispersion, y no
    // se afirma mas que eso. La relectura de Croy que hizo la revision la
    // reconstruyo el verificador de C50 con los datos abiertos de los autores
    // (Zenodo 4917138), que en esta pasada no se abrieron: no va al texto.
    metrics: {
      sensitivity: 54,
      specificity: 87,
      lrPositive: 3.97,
      lrNegative: 0.54,
      note: 'Netterström-Wedin 2022, revisión sistemática con metaanálisis: seis estudios y 885 observaciones dan una sensibilidad agrupada del 54% (IC 95% 35 a 71) y una especificidad del 87% (63 a 96), con LR+ 3,97 (1,50 a 10,47) y LR- 0,54 (0,39 a 0,75). Su conclusión: el cajón confirma la lesión del LPAA y la palpación la descarta. Son pocos estudios, de calidad baja y muy dispares, y los autores lo atribuyen en parte al UMBRAL con que cada explorador da la prueba por positiva. Croy 2013, uno de los seis (66 personas con esguince previo y la laxitud medida con ecografía durante la maniobra), publicó un 74 a 83% de sensibilidad y solo un 38 a 40% de especificidad, según el patrón ecográfico; la revisión propone un umbral alto, con la laxitud sutil contada como negativa, para que un positivo valga más. Y pesa la FECHA: en van Dijk 1996 la exploración completa pasa del 71% y 33% antes de las 48 horas al 96% y 84% a los cinco días.',
    },
    // 'rule-in' es la conclusion de la revision ("anterior drawer testing (rule
    // in)") y el 87 pasa el umbral de 80 de clinicalAudit.ts, que ademas da por
    // sobrante el utilityBasis que habia. Queda para criterio clinico: el IC de
    // la especificidad baja hasta 63 y los estudios son de calidad baja.
    utility: 'rule-in',
    interpretation:
      'Laxitud aumentada respecto al lado sano apoya lesión del LPAA; combínalo con la inclinación astragalina y la clínica.',
    pearl:
      'Lo que más cambia el rendimiento no es la técnica, es la FECHA: a los 4-5 días del esguince la exploración pasa de 71%/33% a 96%/84%, porque el dolor y el edema agudos impiden localizar la palpación y tolerar la maniobra.',
    demo: {
      highlightStructureIds: ['ankle-atfl'],
      // EL LPAA SE ENCIENDE PERO APENAS SE VE, y el panel dice "Se resalta" y
      // la lectura "Resaltado" (OrthopedicTestsPanel.tsx:1280,
      // RhythmReadout.tsx:368; revision U60). En el rig es una lamina plana de
      // 4 vertices y 2 triangulos, lados de 7 a 12 mm (104 mm2), con la cara
      // mirando hacia delante y atras, no al lado (leido en el GLB por el
      // verificador). La
      // camara del demo es la del plano sagital (azimut -90, labCamera), asi que
      // lo ve casi de canto, y a 15 grados de flexion plantar queda en buena
      // parte detras del perone. MEDIDO en la app despues del arreglo del
      // recorte (ae0c5e5), en la captura de la pose sostenida
      // (scratchpad/capturas/despues2/tobillo/cajón-anterior-de-tobillo.png,
      // 728x834; el escenario marca 15 grados y el deslizador esta en 15 de 50):
      // 8 px naranjas (tono 18-45, saturacion > 0,35; 11 px con > 0,25) en
      // x 365-369, y 665-669, en el borde anterior del maleolo lateral. No era
      // el recorte: son la postura y la vista. RECONSTRUIDO por el verificador
      // fuera del navegador (rayos con el encuadre y los pesos del laboratorio,
      // cuadra con dos capturas a menos de 5 px; no medido en la app): de perfil
      // se ve el 19% (el 78% queda detras del perone), unos 4 px2; girando la
      // camara hacia delante, de 50 a 58 px2; una pasada de rayos X sola se
      // quedaria en unos 23 px2. Lo que falta es una vista propia del demo, y
      // eso es codigo (TestDemo no lleva camara), no dato de esta prueba.
      cannotShow:
        'El ligamento peroneoastragalino anterior es en el modelo una lámina plana muy pequeña: se enciende, pero desde la vista lateral del demo queda casi de canto y en gran parte detrás del maléolo lateral, así que solo asoma como una mota naranja. Para verlo, acerca la cámara al tobillo y gírala hacia delante.',
      // SIN COMPONENTE DE RODILLA, A PROPOSITO (rama B de la revision C51). La
      // rama A ponia knee-flexion a 90 como componente. De pie, con el muslo
      // vertical, eso deja la pierna horizontal hacia atras y el pie a la altura
      // de la rodilla (geometria, sin medir), que no se parece ni al supino ni
      // al sentado; con la rodilla recta la pierna cuelga vertical, como en la
      // camilla con el paciente sentado, y lo que la rodilla cambia (la tension
      // del gastrocnemio) no se ve en el modelo. Como componente, ademas,
      // knee-flexion pierde la rotula y el tornillo (los acoples solo corren en
      // la base; lectura de codigo del verificador de C51), y su encuadre pide
      // una medida en el navegador que esta pasada no tomo. La captura de la pose sostenida (scratchpad/capturas/antes/
      // tobillo, cajon anterior, 15 nov) ensena 15 grados de flexion plantar del
      // pie derecho, la rodilla recta y ninguna mano: la nota lo dice.
      movementId: 'ankle-plantarflexion',
      angleDeg: 15,
      side: 'R',
      // Pasiva, y sin mano: ver la cabecera. La ficha y la lectura dicen ya que
      // el paciente no empuja y que el modelo no dibuja la mano, asi que la nota
      // no lo repite (la revision C52 la pedia mas corta).
      examinerForce: 'applies',
      examinerHand: false,
      note: 'Se ve la posición de partida, el tobillo en ligera flexión plantar, con el modelo de pie y la rodilla recta; la prueba suele hacerse sentado o en supino con la rodilla flexionada, así que mira el tobillo, no la postura global. El tirón del talón hacia delante con la tibia fija es una traslación del astrágalo que el modelo no reproduce.',
    },
    cite: [
      {
        ref: 'netterstromwedin-2022',
        verified: true,
        locator:
          'Resumen: 6 estudios, 885 observaciones, 54% (IC 95% 35 a 71) / 87% (63 a 96). Texto completo (PMC9109591): LR+ 3,97 (1,50 a 10,47), LR- 0,54 (0,39 a 0,75); la mayoría de los estudios explora con la rodilla flexionada, en supino o sentado',
      },
      {
        ref: 'croy-2013',
        verified: true,
        locator:
          'Resumen: sensibilidad 0,74 y 0,83, especificidad 0,38 y 0,40, con el patrón ecográfico de 2,3 o de 3,7 mm',
      },
      {
        ref: 'kovaleski-2008',
        verified: true,
        locator:
          'Resumen: laxitud máxima con la rodilla a 90° y el tobillo a 10° de flexión plantar, frente a la rodilla a 0°; no publica sensibilidad ni especificidad',
      },
      {
        ref: 'vandijk-1996',
        verified: true,
        locator: 'Tabla 1: exploración <48 h 71%/33%, a los 5 días 96%/84%',
      },
    ],
  },
  {
    id: 'ankle-talar-tilt',
    name: 'Inclinación astragalina (talar tilt)',
    aka: ['Talar tilt', 'Inversion stress test'],
    region: 'ankle',
    category: 'Estabilidad lateral',
    target: 'Ligamento calcaneoperoneo (y complejo lateral)',
    purpose: 'Valorar la laxitud del ligamento calcaneoperoneo con estrés en inversión.',
    maneuver:
      'Con el retropié en posición neutra, se invierte pasivamente el calcáneo/astrágalo comparando con el lado contralateral.',
    positive: 'Aumento de la apertura/inclinación lateral respecto al lado sano.',
    // LA PRUEBA MANUAL SI ESTA MEDIDA (revision C49). La nota decia que ningun
    // estudio la mide por separado. Netterstrom-Wedin 2022 la incluye en cuatro
    // estudios (texto completo PMC9109591, Resultados, caracteristicas de los
    // estudios: "talar tilt 19, 21, 49, 63 (n = 4)") y no los agrupa: 17-66% /
    // 82-100% (Resultados, pruebas de estres manual). De los cuatro, solo
    // George 2020 pasa todos los dominios de QUADAS-2 con bajo riesgo (Riesgo de
    // sesgo: Croy, George y Li son los unicos tres). Rosen 2015 (PMID 24995627, resumen) midio la
    // manual contra un cuestionario y la revision lo excluye por su patron (su
    // ref. 51, "no or inaccurate reference test"). El 50% / 88% que circulaba
    // sigue sin fuente localizable y no se usa. El desglose por estudio de los
    // datos abiertos de los autores no se ha abierto aqui y no va al texto.
    metrics: {
      note: 'Sin cifra agrupada. La revisión sistemática de Netterström-Wedin 2022 reúne cuatro estudios de la prueba manual frente a artrografía o ecografía (Prins 1978, Funder 1982, van den Hoogenband 1984 y George 2020) y no los agrupa: sensibilidad del 17 al 66% y especificidad del 82 al 100%, para la lesión del calcaneoperoneo o de cualquier ligamento lateral. Concluye que confirma pero no descarta. De los cuatro, solo George 2020 tiene bajo riesgo de sesgo en todos los apartados de calidad. Rosen 2015 midió la prueba manual en la inestabilidad crónica, con un cuestionario como patrón y no la rotura (por eso la revisión lo excluye): sensibilidad 0,49 (0,34 a 0,64) y especificidad de 0,78 a 0,88. La radiografía de estrés de van Dijk 1996 dio 68% y 71%.',
    },
    // 'rule-in' sin especificidad agrupada: clinicalAudit.ts exige entonces el
    // utilityBasis, y este lo explica. Toda especificidad calculable de los
    // cuatro estudios esta en 82 o mas, y las dos fuentes concluyen que sirve
    // para confirmar (precedente: hip-log-roll, 'rule-in' con utilityBasis).
    utility: 'rule-in',
    utilityBasis:
      'Lo que falta es una cifra agrupada: la revisión de 2022 solo metaanaliza el cajón anterior, y de esta prueba da los cuatro estudios por separado, con una especificidad del 82 al 100%. Concluye que confirma la lesión del calcaneoperoneo pero no la descarta; Rosen 2015, en la inestabilidad crónica, concluye que solo serviría para confirmar.',
    interpretation:
      'Una inclinación aumentada y asimétrica apoya la lesión del calcaneoperoneo. Es específica y poco sensible: un positivo suma, un negativo no descarta. Su sitio está junto al cajón anterior y la palpación, a los 4 o 5 días.',
    demo: {
      highlightStructureIds: ['ankle-cfl', 'ankle-atfl'],
      // EL ASTRAGALO SE ABRE PORQUE EL MODELO NO TIENE SUBASTRAGALINA (revision
      // C48, medido en CPU con scripts/lib/rigPose.mts, las mismas reparaciones
      // que RigModel). Talusr_1, Calcaneusr_1, Navicular_bone_1 y Cuboid_bone_1
      // van al 100% con foot_flex, y la copia visible del astragalo se desvia
      // 0,0 mm del solido rigido: gira con el pie como una sola pieza. A 30
      // grados de inversion se inclina -28,1 grados en el plano frontal con la
      // tibia quieta (calcaneo -26,0) y su borde lateral pasa de 2,9 a 14,8 mm
      // del perone; a 15, -13,8 grados y 9,0 mm, asi que bajar el angulo no lo
      // quita (queda a criterio clinico, igual que pasar a noDemo). La pierna
      // solo tiene femur_base, patella, shin_flex y foot_flex (rigAnkleRebind.ts).
      // El demo posa un lado y el otro queda en reposo: la escena ensena una
      // diferencia de apertura entre lados, que es justo lo que `positive` llama
      // positivo. Eso se DICE. En la captura de la pose sostenida (scratchpad/
      // capturas/antes/tobillo, 30 grados, vista frontal) el tobillo ocupa poco:
      // la apertura esta medida en CPU, no comprobada en pantalla.
      cannotShow:
        'El modelo no tiene articulación subastragalina, así que toda la inversión cae en la mortaja: el astrágalo gira con el pie como una sola pieza y se separa del peroné, mientras el otro tobillo sigue en reposo. Esa diferencia de apertura entre los dos lados es lo que la prueba llama positivo; aquí es un límite del modelo, no un hallazgo. Mira la dirección del gesto, no cuánto se abre.',
      movementId: 'ankle-inversion',
      angleDeg: 30,
      side: 'R',
      // Pasiva, y sin mano: ver la cabecera.
      examinerForce: 'applies',
      examinerHand: false,
      note: 'Con el retropié en posición neutra se invierte pasivamente el calcáneo/astrágalo, comparando con el lado contralateral. El modelo muestra la dirección del gesto.',
    },
    cite: [
      {
        ref: 'netterstromwedin-2022',
        verified: true,
        locator:
          'Texto completo (PMC9109591), Resultados: cuatro estudios de la prueba; pruebas de estrés manual, 17 a 66% / 82 a 100%. Resumen: confirma la lesión del calcaneoperoneo',
      },
      {
        ref: 'rosen-2015',
        verified: true,
        locator: 'Resumen: prueba manual 0,49 (0,34 a 0,64) / 0,78 a 0,88 frente al CAIT',
      },
      {
        ref: 'vandijk-1996',
        verified: true,
        locator: 'Tabla 1: radiografía de estrés (talar tilt instrumentado) 68%/71%',
      },
    ],
  },
  /* ======================= Achilles ======================= */
  {
    id: 'ankle-thompson',
    name: 'Prueba de Thompson (Simmonds)',
    aka: ['Thompson test', 'Simmonds squeeze'],
    region: 'ankle',
    category: 'Tendón de Aquiles',
    target: 'Integridad del tendón calcáneo (de Aquiles)',
    purpose: 'Detectar la rotura completa del tendón de Aquiles.',
    maneuver:
      'Paciente en decúbito prono con los pies fuera de la camilla; el explorador comprime la pantorrilla y observa el pie.',
    positive:
      'AUSENCIA de flexión plantar al comprimir la pantorrilla: rotura completa del Aquiles.',
    metrics: {
      sensitivity: 96,
      specificity: 93,
      note: 'Las dos cifras del mismo estudio (Maffulli 1998: 174 roturas completas y 28 sospechas sin rotura, recogidas a lo largo de 13 años). Fue la más sensible de las cinco pruebas comparadas, junto con Matles (0,88 / 0,85); la palpación del hueco se queda en 0,73. El dato que remata: en TODOS los pacientes del estudio al menos DOS pruebas fueron positivas.',
    },
    utility: 'rule-out',
    interpretation:
      'Muy sensible: la presencia de flexión plantar al comprimir descarta prácticamente la rotura completa; su ausencia la confirma.',
    pearl: 'La flexión plantar activa puede conservarse por los flexores largos aunque el Aquiles esté roto: por eso se explora con la compresión, no pidiendo el movimiento.',
    demo: {
      highlightStructureIds: ['achilles-tendon'],
      movementId: 'ankle-plantarflexion',
      angleDeg: 25,
      side: 'R',
      highlightMuscleId: 'gastrocnemius',
      // EN PRONO, Y LA COMPRESION NO SE DIBUJA (revision C54). La nota solo
      // decia lo que se ve, y durante el demo el margen del laboratorio no
      // ensena la maniobra: esta nota es el unico sitio para decir la postura,
      // que la mano no esta y que el paciente no contrae. Sin `examinerForce`
      // (ver la cabecera). Prono con los dos pies fuera de la camilla, y el
      // lado sano hace una flexion plantar PASIVA: Silvers 2020 (PMC7781505,
      // leido por E-utilities); el resumen de Maffulli 1998 no describe la
      // tecnica. La captura de la pose sostenida (scratchpad/capturas/antes/
      // tobillo, Thompson, 25 grados) ensena el modelo de pie y sin mano.
      note: 'La prueba se hace en PRONO con los pies fuera de la camilla: el modelo lo muestra de pie, así que mira el tobillo, no la postura global. La compresión de la pantorrilla no se dibuja. Lo que se ve es la flexión plantar PASIVA que produce un Aquiles íntegro al comprimir (positiva = NO ocurre); el paciente no contrae.',
    },
    cite: [
      {
        ref: 'maffulli-1998',
        verified: true,
        locator: 'Compresión de la pantorrilla: sensibilidad 0,96, especificidad 0,93',
      },
    ],
  },
  /* ======================= Syndesmosis (high sprain) ======================= */
  {
    id: 'ankle-kleiger',
    name: 'Prueba de rotación externa (Kleiger)',
    aka: ['Kleiger test', 'External rotation test'],
    region: 'ankle',
    category: 'Sindesmosis',
    target: 'Sindesmosis tibiofibular y ligamento deltoideo',
    purpose: 'Detectar el esguince alto (sindesmal) y la lesión del deltoideo.',
    maneuver:
      'Con la rodilla flexionada, se lleva el tobillo a DORSIFLEXIÓN y se aplica rotación externa al pie mientras se estabiliza la pierna.',
    positive:
      'Dolor en la sindesmosis anterolateral (o medial, si es el deltoideo) reproducido con la rotación externa.',
    // LA NOTA YA NO ACHACA A LA DORSIFLEXION LA DIFERENCIA ENTRE ESTUDIOS
    // (revision J32). Decia que sin dorsiflexion "la sensibilidad cae mucho",
    // hasta el 20% de la version en tobillo neutro, sin cita. Ese 20% es de
    // Cesar 2011 (PMID 22381194, resumen leido por E-utilities el 23 nov:
    // rotacion externa 20% / 84,8%, squeeze 30% / 93,5%), y su resumen no dice
    // la posicion del tobillo; el texto completo es de pago. Con dorsiflexion y
    // sin carga, Baltes 2022 (PMC9568458, texto completo abierto en Europe PMC
    // el 23 nov, Tabla 3) midio 58% (37 a 76) / 52% (42 a 61), LR- 0,82, frente
    // al 71% / 63% de Sman 2015. Ninguna de las tres compara el tobillo neutro
    // con la dorsiflexion en los mismos pacientes. "Que es la recomendable"
    // exageraba a Sman, que recomienda combinarla como prueba sensible.
    // DE DONDE SALEN LAS CUATRO CIFRAS: el resumen de Sman 2015 (PMID 24255766)
    // trae el 71% y el LR- 0,46 (0,27 a 0,79); el 63% y el LR+ 1,93 no estan en
    // el resumen y su texto completo es de pago. Las cuatro, con sus
    // intervalos, las reproduce la Tabla 5 de Beynon 2022 (PMC9764698, abierta
    // en Europe PMC el 23 nov): 71 (55 a 83) / 63 (49 a 75), LR+ 1,93 (1,28 a
    // 2,94), LR- 0,46 (0,27 a 0,79).
    metrics: {
      sensitivity: 71,
      specificity: 63,
      lrPositive: 1.93,
      lrNegative: 0.46,
      note: 'Cifras de Sman 2015, que hace la prueba con el tobillo en DORSIFLEXIÓN. Otros estudios contra resonancia dan cifras distintas: de César 2011 (56 esguinces laterales) publica un 20% de sensibilidad y un 84,8% de especificidad para la rotación externa, sin decir en su resumen en qué posición iba el tobillo, y Baltes 2022 (150 lesiones agudas en deportistas), con la misma prueba en dorsiflexión y sin carga, midió 58% y 52%. Son muestras distintas: la diferencia no se puede atribuir a la posición del tobillo, y el 71% de Sman no se repite en todos los estudios.',
    },
    utility: 'balanced',
    interpretation:
      'Es de las dos más sensibles del grupo sindesmal, no una prueba de confirmación: un negativo resta (LR- 0,46), un positivo aporta poco por sí solo (LR+ 1,93). Combínala con la palpación sindesmal y con el squeeze.',
    // SIN DEMO, Y NO POR COMPARTIR HUESO (revisiones U61 y J30). Los cuatro
    // movimientos del tobillo giran foot_flex, pero eso no impide combinarlos:
    // applyComponents (RigModel.tsx:3250-3297) no devuelve a reposo un hueso
    // que la base ya giro y compone encima, como hacen el pivot shift y McMurray
    // con la flexion de rodilla y la rotacion tibial en shin_flex (knee.ts;
    // leido en el codigo, no medido en el tobillo). Lo que falta es el giro:
    // ningun movementId rota el pie sobre la tibia quieta (foot_flex solo se
    // conduce en x, la bisagra, y en y, el eje largo del pie medido con la
    // inversion y la eversion; boneMap.ts:984-1036). La rotacion externa de
    // rodilla no sirve de sustituto: gira la tibia con el pie, justo lo que la
    // maniobra evita al estabilizar la pierna, y en el tobillo no habria giro
    // relativo. El eje que falta seria la z local de foot_flex, que hoy no
    // conduce nadie. CALCULADO por el verificador de J30 con los nodos del GLB,
    // no medido en la app ni con audit-direction: compuesta sobre 20 grados de
    // dorsiflexion, esa z queda a 2 grados del eje de la tibia, y el mismo
    // signo gira la punta del pie hacia fuera en los dos lados (no se refleja).
    // Darlo de alta es un movimiento nuevo en boneMap (codigo, decision aparte),
    // y cuantos grados ensenar queda a criterio clinico: ninguna fuente abierta
    // dice cuanto gira el pie en esta prueba.
    noDemo:
      'Es una rotación externa del pie con la pierna estabilizada y el tobillo en dorsiflexión, un giro que el modelo no tiene: su tobillo solo hace dorsiflexión, flexión plantar, inversión y eversión.',
    cite: [
      { ref: 'sman-2015', verified: true, locator: 'Tabla 3' },
      {
        ref: 'decesar-2011',
        verified: true,
        locator: 'Resumen: rotación externa 20% / 84,8%; no indica la posición del tobillo',
      },
      {
        ref: 'baltes-2022',
        verified: true,
        locator: 'Tabla 3: rotación externa en dorsiflexión sin carga 58% / 52%',
      },
    ],
  },
  {
    id: 'ankle-squeeze',
    name: 'Prueba de compresión (squeeze)',
    aka: ['Squeeze test'],
    region: 'ankle',
    category: 'Sindesmosis',
    target: 'Sindesmosis tibiofibular',
    purpose: 'Detectar la lesión sindesmal (esguince alto).',
    maneuver:
      'Se comprimen la tibia y la fíbula juntas en el tercio medio de la pierna, proximal a la lesión.',
    positive: 'Dolor referido distal en la sindesmosis al comprimir proximalmente.',
    metrics: {
      sensitivity: 26,
      specificity: 88,
      lrPositive: 2.15,
      lrNegative: 0.84,
      note: 'Poco sensible y bastante específica, pero el intervalo del LR+ cruza el 1 (0,86 a 5,39): por sí sola no confirma nada.',
    },
    utility: 'rule-in',
    interpretation:
      'Un positivo sube la sospecha de esguince alto, pero con un intervalo que incluye el 1 no cierra el diagnóstico. Un negativo no sirve para descartar (LR- 0,84). Úsala DESPUÉS de una prueba sensible (palpación sindesmal, rotación externa con dorsiflexión).',
    noDemo:
      'Es una compresión de la tibia y la fíbula en el tercio medio de la pierna: el rig gira articulaciones, no comprime.',
    cite: [{ ref: 'sman-2015', verified: true, locator: 'Tabla 3' }],
  },
];
