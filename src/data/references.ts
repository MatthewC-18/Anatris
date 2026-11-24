// src/data/references.ts
//
// Centralized bibliography for the educational content. Every clinical claim
// in a muscle/structure entry points to one of these references by `id`, plus
// an optional page locator. Defining sources once means: edition changes live
// in a single place, and the "Fuentes" page for a module can be generated
// automatically from the set of references actually cited.
//
// IMPORTANT — page numbers:
//   Page numbers vary by edition and (for Dufour) by volume. Content authored
//   without a verified physical/edition copy should set `pageVerified: false`
//   on the citation (see Citation in ./muscleContent.ts), NOT guess a page.
//   The UI surfaces unverified pages so they can be confirmed against the
//   actual book before publishing.

export interface Reference {
  /** Stable short id used by citations. Never reuse or repurpose. */
  id: string;
  /** Author(s), "Apellido AA" style, multiple separated by ", ". */
  authors: string;
  /** Full work title. */
  title: string;
  /** Edition label as printed (e.g. "6.ª edición"). Empty if N/A. */
  edition: string;
  /** Publisher. */
  publisher: string;
  /** Year of the cited edition. */
  year: number;
  /** Optional volume label, used by multi-volume works (Dufour). */
  volume?: string;
  /** Optional note shown in the bibliography (e.g. translation info). */
  note?: string;
  /**
   * PubMed identifier (journal articles only). When present, the Evidence page
   * links straight to the PubMed record. When absent, journal refs fall back to
   * a PubMed title search (always resolves), so a missing pmid never breaks the
   * link — it just loses the one-click precision. Never guess a pmid: a wrong id
   * points at the wrong paper and destroys the very credibility this serves.
   */
  pmid?: string;
  /** Digital Object Identifier (fallback link when no pmid). */
  doi?: string;
  /**
   * A QUIEN se midió: tamaño y tipo de muestra, tal como lo dice la fuente.
   *
   * Una sensibilidad del 94% no significa lo mismo medida sobre 24 mujeres de
   * una consulta de reumatología que sobre un metanálisis de nueve estudios, y
   * hasta ahora la ficha enseñaba la cifra sin decir sobre quién se obtuvo. El
   * campo es opcional: una referencia sin él se dibuja igual que antes.
   */
  sample?: string;
  /**
   * CONTRA QUE se comparó (patrón de referencia): artroscopia, RM, bloqueo
   * intraarticular... Es lo que decide qué significa "positivo", y dos estudios
   * de la misma prueba con patrones distintos no son comparables.
   */
  standard?: string;
}

/**
 * The authoritative sources for this project.
 * Kapandji is the primary biomechanics reference; Oatis and Dufour reinforce
 * kinesiology and functional anatomy; a descriptive-anatomy source backs
 * origin/insertion/innervation facts.
 *
 * NOTE: edition/year/publisher fields below reflect commonly used Spanish
 * editions but should be checked against YOUR physical copies and adjusted —
 * they affect how citations render. Marked with `// VERIFY` where you most
 * likely need to confirm the exact edition you own.
 */
export const REFERENCES: Record<string, Reference> = {
  kapandji: {
    id: 'kapandji',
    authors: 'Kapandji AI',
    title: 'Fisiología articular. Tomo 1: Miembro superior',
    edition: '6.ª edición', // VERIFY: confirma la edición de tu ejemplar
    publisher: 'Editorial Médica Panamericana',
    year: 2006, // VERIFY
    volume: 'Tomo 1 — Miembro superior',
    note: 'Referencia principal de biomecánica articular.',
  },

  oatis: {
    id: 'oatis',
    authors: 'Oatis CA',
    title: 'Kinesiology: The Mechanics and Pathomechanics of Human Movement',
    edition: '3rd edition', // VERIFY: 2ª o 3ª según tu ejemplar
    publisher: 'Wolters Kluwer',
    year: 2017, // VERIFY
    note: 'Cinesiología y patomecánica del movimiento humano.',
  },

  neumann: {
    id: 'neumann',
    authors: 'Neumann DA',
    title: 'Kinesiology of the Musculoskeletal System: Foundations for Rehabilitation',
    edition: '3rd edition', // VERIFY: confirma la edición de tu ejemplar
    publisher: 'Elsevier Mosby',
    year: 2017, // VERIFY
    note: 'Cinesiología del sistema musculoesquelético; base de los modelos de reclutamiento muscular.',
  },

  dufour: {
    id: 'dufour',
    authors: 'Dufour M',
    title: 'Anatomía del aparato locomotor',
    edition: '2.ª edición', // VERIFY
    publisher: 'Elsevier Masson',
    year: 2018, // VERIFY
    volume: 'Tomo 1 — Miembro superior', // VERIFY: confirma el tomo del MMSS
    note: 'Anatomía funcional descriptiva por regiones.',
  },

  // A descriptive-anatomy backbone for origin/insertion/innervation.
  // Swap or remove if you prefer to rely solely on Dufour for descriptive data.
  descriptive: {
    id: 'descriptive',
    authors: 'Drake RL, Vogl AW, Mitchell AWM',
    title: 'Gray. Anatomía para estudiantes',
    edition: '4.ª edición', // VERIFY
    publisher: 'Elsevier',
    year: 2020, // VERIFY
    note: 'Anatomía descriptiva de referencia.',
  },

  // ---- NEURO: dermatomas, miotomas y reflejos (exploración neurológica).
  // Textbook/standard references (not PubMed articles), so they render in the
  // "Libros de referencia" block, not the studies list.
  magee: {
    id: 'magee',
    authors: 'Magee DJ',
    title: 'Orthopedic Physical Assessment',
    edition: '6th edition', // VERIFY
    publisher: 'Elsevier Saunders',
    year: 2014, // VERIFY
    note: 'Exploración ortopédica y neurológica: dermatomas, miotomas y reflejos por raíz.',
  },
  asia: {
    id: 'asia',
    authors: 'American Spinal Injury Association / ISCoS',
    title:
      'International Standards for Neurological Classification of Spinal Cord Injury (ISNCSCI). Hoja de trabajo oficial',
    edition: 'Hoja de trabajo, rev. 11/15',
    publisher: 'American Spinal Injury Association',
    year: 2019,
    sample:
      'Estándar de consenso internacional, no un estudio: no tiene muestra ni patrón de referencia.',
    note: 'Leída la hoja de trabajo por las dos caras: la de delante da los músculos clave (C5 flexores de codo, C6 extensores de muñeca, C7 extensores de codo, C8 flexores de los dedos, T1 abductor del meñique; L2 flexores de cadera, L3 extensores de rodilla, L4 dorsiflexores de tobillo, L5 extensores largos de los dedos, S1 flexores plantares) y la de detrás la tabla de músculos NO clave, que es donde aparece la abducción de hombro como C5. Los puntos clave sensitivos se contrastaron además con el capítulo de evaluación neurológica de la ASCIP (Kirshblum, 2023), que los da con las mismas palabras.',
  },

  // -------------------------------------------------------------------------
  // DIAGNOSTIC-ACCURACY STUDIES for the orthopedic special tests
  // (sensibilidad / especificidad). Journal articles, not books: `publisher`
  // holds the journal. All values authored from these sources should carry
  // `verified: false` until checked against the primary text.
  // -------------------------------------------------------------------------
  // Title, journal details and PMID corrected 2026-08-04 against the PubMed
  // record: the entry previously carried a title that does not exist (it mixed
  // this paper up with the 2008 original) and no pmid, so "Evidencia" could not
  // link to it and the citation could not be checked by a reader.
  'hegedus-2012': {
    id: 'hegedus-2012',
    pmid: '22773322',
    authors: 'Hegedus EJ, Goode AP, Cook CE, Michener L, Myer CA, Myer DM, Wright AA',
    title:
      'Which physical examination tests provide clinicians with the most value when examining the shoulder? Update of a systematic review with meta-analysis of individual tests',
    edition: '46(14):964-78',
    publisher: 'Br J Sports Med',
    year: 2012,
    sample:
      'Revisión sistemática y metaanálisis; 32 estudios nuevos sobre la revisión de 2008, evaluados con QUADAS-2',
    standard:
      'El de cada estudio incluido (artroscopia, resonancia o cirugía, según el caso)',
    note:
      'Pinzamiento subacromial, cifras agrupadas: Neer 72% / 60%, Hawkins-Kennedy 79% / 59%, arco doloroso 53% / 76%. Para las lesiones SLAP, la prueba más sensible fue la recolocación (52%), la más específica la de Yergason (95%) y la de mejor razón de verosimilitud positiva la de compresión-rotación (2,81). Su conclusión, que es la que importa: NO se puede recomendar ninguna prueba aislada para hacer un diagnóstico, y combinarlas mejora la precisión solo de forma marginal.',
  },
  'park-2005': {
    id: 'park-2005',
    pmid: '15995110',
    authors: 'Park HB, Yokota A, Gill HS, El Rassi G, McFarland EG',
    title:
      'Diagnostic accuracy of clinical tests for the different degrees of subacromial impingement syndrome',
    edition: '',
    publisher: 'J Bone Joint Surg Am',
    year: 2005,
    sample:
      '913 hombros valorados con ocho pruebas, clasificados en tres grados de enfermedad del manguito: bursitis, rotura parcial y rotura de espesor completo',
    standard:
      'Hallazgos quirúrgicos / artroscópicos',
    note:
      'Su aportación no son las cifras sueltas, que varían mucho, sino que la precisión de cada prueba DEPENDE DEL GRADO de la lesión. Las combinaciones son lo que rinde: Hawkins-Kennedy + arco doloroso + infraespinoso da una probabilidad posprueba del 95% para cualquier grado de pinzamiento, y arco doloroso + brazo caído + infraespinoso, del 91% para la rotura de espesor completo.',
  },
  'lo-2004': {
    id: 'lo-2004',
    pmid: '14977651',
    authors: 'Lo IK, Nonweiler B, Woolfrey M, Litchfield R, Kirkley A',
    title:
      'An evaluation of the apprehension, relocation, and surprise tests for anterior shoulder instability',
    edition: '',
    publisher: 'Am J Sports Med',
    year: 2004,
    doi: '10.1177/0095399703258690',
    sample: '46 pacientes con diagnóstico claro (18 inestabilidad anterior traumática, 17 tendinosis del manguito, 5 multidireccional, 4 artrosis, 2 inestabilidad posterior), valorados por cuatro examinadores ciegos e independientes',
    standard: 'Diagnóstico clínico-quirúrgico establecido; fiabilidad interobservador 0,83',
    note: 'La prueba de SORPRESA fue la más precisa por separado (sensibilidad 63,89%, especificidad 98,91%). Con aprensión en las tres pruebas, el valor predictivo positivo fue del 93,6% y el negativo del 71,9%. Del test de RECOLOCACIÓN el estudio no publica cifras: concluye que el alivio de la aprensión o del dolor "añadía poco" al valor del conjunto.',
  },
  'gerber-1991': {
    id: 'gerber-1991',
    pmid: '1670434',
    authors: 'Gerber C, Krushell RJ',
    title: 'Isolated rupture of the tendon of the subscapularis muscle',
    edition: '',
    publisher: 'J Bone Joint Surg Br',
    year: 1991,
    sample: '16 hombros con rotura aislada del subescapular',
    standard: 'Hallazgo quirúrgico',
    note: 'Descripción ORIGINAL de la maniobra de lift-off, y nada más: el artículo no publica sensibilidad ni especificidad. Durante tiempo esta aplicación le atribuyó un 62% de sensibilidad que no está en la fuente; la cifra medida de la prueba sale de Barth 2006 y es del 17,6%.',
  },
  'barth-2006': {
    id: 'barth-2006',
    pmid: '17027405',
    doi: '10.1016/j.arthro.2006.05.005',
    authors: 'Barth JR, Burkhart SS, De Beer JF',
    title:
      'The bear-hug test: a new and sensitive test for diagnosing a subscapularis tear',
    edition: '',
    publisher: 'Arthroscopy',
    year: 2006,
    sample: '68 pacientes consecutivos programados para artroscopia; prevalencia de rotura del subescapular 29,4%',
    standard: 'Artroscopia diagnóstica (estudio de nivel I)',
    note: 'Las CUATRO pruebas de subescapular medidas en la misma serie y por el mismo examinador: abrazo de oso 60% / 91,7%, press abdominal 40% / 97,9%, Napoleón 25% / 97,9% y lift-off 17,6% / 100%. El dato que ninguna tabla suele recoger: el 40% de las roturas no las predijo NINGUNA de las cuatro. Las áreas bajo la curva ROC del abrazo de oso y del press abdominal fueron significativamente mayores que las del lift-off y del Napoleón (p < 0,05).',
  },
  'hertel-1996': {
    id: 'hertel-1996',
    pmid: '8872929',
    authors: 'Hertel R, Ballmer FT, Lombert SM, Gerber C',
    title: 'Lag signs in the diagnosis of rotator cuff rupture',
    edition: '',
    publisher: 'J Shoulder Elbow Surg',
    year: 1996,
    sample:
      '100 hombros dolorosos consecutivos con síndrome de pinzamiento en estadios 1 a 3, estudio prospectivo',
    standard:
      'Hallazgo quirúrgico',
    note:
      'Comparó los signos de retardo (lag signs) con los de Jobe y de lift-off. Para el supraespinoso y el infraespinoso, el signo de retardo en rotación externa fue MENOS sensible y MÁS específico que el de Jobe; el signo de la caída (drop sign) fue el menos sensible y tan específico como aquel. Y la salvedad que hay que decirle al alumno: las roturas PARCIALES del supraespinoso se le escapan al signo de retardo. Las cifras por prueba están en las tablas del texto completo, no en el resumen.',
  },
  'chronopoulos-2004': {
    id: 'chronopoulos-2004',
    pmid: '15090381',
    authors: 'Chronopoulos E, Kim TK, Park HB, Ashenbrenner D, McFarland EG',
    title:
      'Diagnostic value of physical tests for isolated chronic acromioclavicular lesions',
    edition: '',
    publisher: 'Am J Sports Med',
    year: 2004,
    doi: '10.1177/0363546503261723',
    sample: '35 pacientes operados de resección de clavícula distal por lesión acromioclavicular aislada (1994-2002); diseño retrospectivo de casos y controles',
    standard: 'Lesión acromioclavicular crónica aislada confirmada en cirugía',
    note: 'Sensibilidad: aducción cruzada 77%, extensión resistida acromioclavicular 72%, compresión activa 41%. La especificidad más alta fue la de la compresión activa (95%); la de la aducción cruzada no consta. El 79% que suele citarse como especificidad de la aducción cruzada es su EXACTITUD global. Lo decisivo para la consulta: en las tres pruebas el valor predictivo positivo fue MENOR del 30% y el negativo MAYOR del 94%, de modo que sirven para descartar y no para confirmar. Al ser casos y controles, esos valores predictivos cuelgan de una prevalencia artificial.',
  },

  // ---- CERVICAL: radiculopatía, mielopatía, inestabilidad y cribado vascular.
  // ---------------------------------------------------------------------
  // NORMATIVE RANGE-OF-MOTION STUDIES
  // ---------------------------------------------------------------------
  // The ranges this app prints are REFERENCE values -- textbook conventions --
  // and the conventions disagree. These are the primary measurements, so the
  // spread can be shown instead of hidden. Identity of every one of them was
  // checked against its PubMed record; only the first has had its tables read.
  'roaas-1982': {
    id: 'roaas-1982',
    pmid: '7136564',
    doi: '10.3109/17453678208992202',
    authors: 'Roaas A, Andersson GBJ',
    title:
      'Normal range of motion of the hip, knee and ankle joints in male subjects, 30-40 years of age',
    edition: '',
    publisher: 'Acta Orthopaedica Scandinavica',
    year: 1982,
    note:
      'Movilidad PASIVA medida con goniómetro por la técnica de la AAOS en una muestra aleatoria de varones sanos de Gotemburgo (210 caderas, 180 rodillas, 192 tobillos). Su Tabla 1 imprime además la columna de la AAOS, lo que permite ver la diferencia entre el valor de referencia y el medido.',
  },
  'apti-2023': {
    id: 'apti-2023',
    doi: '10.4274/jtss.galenos.2023.33042',
    authors: 'Apti A, Kuru Colak T, Akcay B',
    title: 'Normative values for cervical and lumbar range of motion in healthy young adults',
    edition: '',
    publisher: 'Journal of Turkish Spinal Surgery 2023;34(3):113-117',
    year: 2023,
    note:
      'Movilidad ACTIVA cervical y lumbar con goniómetro digital de dos brazos por la técnica de la AAOS, en 300 voluntarios sanos (198 mujeres, 102 varones; media 21,4 años, rango 18-29), Estambul. Su Tabla 2 da media, DE, mediana y rango de los 12 movimientos, y la discusión imprime al lado el valor de la AAOS. Acceso abierto (CC BY-NC-ND). Tabla 2 leída aquí.',
  },
  'gill-2020': {
    id: 'gill-2020',
    pmid: '33046038',
    doi: '10.1186/s12891-020-03665-9',
    authors: 'Gill TK, Shanahan EM, Tucker GR, Buchbinder R, Hill CL',
    title:
      'Shoulder range of movement in the general population: age and gender stratified normative data using a community-based cohort',
    edition: '',
    publisher: 'BMC Musculoskeletal Disorders 2020;21:676',
    year: 2020,
    note:
      'Movilidad ACTIVA de hombro en una cohorte poblacional de Adelaida: 2404 adultos sin dolor ni rigidez de hombro (51,5% varones; media 45,8 años, DE 17,3; rango 20-91). Flexión y abducción con inclinómetro Plurimeter V; la rotación externa se estimó visualmente al múltiplo de 5 grados más cercano, así que su precisión es menor que la de los otros dos. Acceso abierto. Tabla leída aquí.',
  },
  'zwerus-2017': {
    id: 'zwerus-2017',
    pmid: '31210794',
    doi: '10.1177/1758573217728711',
    authors:
      'Zwerus EL, Willigenburg NW, Scholtes VA, Somford MP, Eygendaal D, van den Bekerom MPJ',
    title: 'Normative values and affecting factors for the elbow range of motion',
    edition: '',
    publisher: 'Shoulder & Elbow 2019;11(3):215-224',
    year: 2017,
    note:
      'Movilidad ACTIVA y PASIVA de codo con goniómetro universal, bilateral, en 352 adultos sanos (166 varones, 186 mujeres) de 18 a 79 años, Amsterdam. Publica media e intervalo de confianza al 95%, NO desviación típica, por eso aquí las cifras van sin DE. Las mujeres tienen más recorrido que los varones en todos los movimientos, y lo pasivo supera a lo activo en 3-5 grados. Acceso abierto. Tabla 2 leída aquí.',
  },
  'esteban-2022': {
    id: 'esteban-2022',
    pmid: '35459026',
    doi: '10.3390/s22083042',
    authors: 'Esteban-Gonzalez P, Sanchez-Romero EA, Villafane JH',
    title:
      'Analysis of the active measurement systems of the thoracic range of movements of the spine: a systematic review and a meta-analysis',
    edition: '',
    publisher: 'Sensors 2022;22(8):3042',
    year: 2022,
    note:
      'Revisión sistemática y metaanálisis de 48 estudios y 2365 sujetos sanos, 11.892 mediciones del raquis torácico. Su conclusión es por qué aquí NO se publica una cifra medida para la columna torácica: los resultados de los distintos aparatos son "muy dispares entre sí" porque cada herramienta usa un protocolo distinto, y los autores proponen estandarizarlo. Acceso abierto. Leída aquí.',
  },

  'sman-2015': {
    id: 'sman-2015',
    pmid: '24255766',
    doi: '10.1136/bjsports-2013-092787',
    authors:
      'Sman AD, Hiller CE, Rae K, Linklater J, Black DA, Nicholson LL, Burns J, Refshauge KM',
    title: 'Diagnostic accuracy of clinical tests for ankle syndesmosis injury',
    edition: '',
    publisher: 'British Journal of Sports Medicine 2015;49(5):323-329',
    year: 2015,
    sample:
      '87 pacientes (78% varones) con esguince de tobillo atendidos en nueve consultas de dos ciudades australianas, en las dos semanas siguientes a la lesión',
    standard:
      'Resonancia magnética leída por un radiólogo cegado',
    note:
      'Ninguna prueba aislada basta. Lo más sensible fue la incapacidad de saltar a la pata coja (89%) y la hipersensibilidad del ligamento sindesmótico a la palpación (92%, razón de verosimilitud negativa 0,28); lo más específico, el dolor desproporcionado respecto a la lesión aparente (79%) y la prueba de compresión o squeeze (88%). La sindesmosis fue cuatro veces más probable con palpación dolorosa (OR 4,04) o con la prueba de rotación externa en dorsiflexión positiva (OR 3,9). La recomendación es combinar un par de signos sensibles con un par de específicos.',
  },

  'wainner-2003': {
    id: 'wainner-2003',
    pmid: '12544957',
    authors: 'Wainner RS, Fritz JM, Irrgang JJ, Boninger ML, Delitto A, Allison S',
    title:
      'Reliability and diagnostic accuracy of the clinical examination and patient self-report measures for cervical radiculopathy',
    edition: '',
    publisher: 'Spine',
    year: 2003,
    sample:
      '82 pacientes con sospecha de radiculopatía cervical o síndrome del túnel carpiano; estudio prospectivo y cegado',
    standard:
      'Examen electrofisiológico estandarizado del miembro superior sintomático (criterio de deterioro neural), con los fisioterapeutas exploradores ciegos al diagnóstico',
    note:
      'De 34 elementos de la exploración, más de dos tercios tuvieron fiabilidad al menos aceptable y 13 dieron razones de verosimilitud por encima de 2 o por debajo de 0,50. El clúster de CUATRO variables alcanzó una razón de verosimilitud positiva de 30,3, muy superior a cualquier prueba suelta. La prueba de tensión neural del miembro superior A (ULTT A) fue la más útil para DESCARTAR. Los intervalos de confianza de todas las razones fueron amplios, y los propios autores piden validar el clúster.',
  },
  'rubinstein-2007': {
    id: 'rubinstein-2007',
    pmid: '17013656',
    authors: 'Rubinstein SM, Pool JJM, van Tulder MW, Riphagen II, de Vet HCW',
    title:
      'A systematic review of the diagnostic accuracy of provocative tests of the neck for diagnosing cervical radiculopathy',
    edition: '',
    publisher: 'Eur Spine J',
    year: 2007,
    sample:
      'Revisión sistemática: de todas las candidatas, solo SEIS estudios cumplían los criterios (identificar la prueba, un patrón de referencia cualquiera, y sensibilidad y especificidad publicadas o recalculables)',
    standard:
      'El de cada estudio incluido',
    note:
      'Las pruebas de provocación cervical se usan a diario y su precisión no se había revisado nunca de forma sistemática. Con seis estudios, lo que se puede decir es poco y con intervalos amplios.',
  },
  'tong-2002': {
    id: 'tong-2002',
    pmid: '11805661',
    authors: 'Tong HC, Haig AJ, Yamakawa K',
    title: 'The Spurling test and cervical radiculopathy',
    edition: '',
    publisher: 'Spine',
    year: 2002,
    sample:
      '255 pacientes consecutivos derivados para electrodiagnóstico de trastornos nerviosos del miembro superior (1988-1993); diseño transversal',
    standard:
      'Electromiografía',
    note:
      'Sensibilidad 30% (6 de 20) y especificidad 93% (160 de 172). La prueba salió positiva en el 16,6% de los normales y en el 40% de los que tenían radiculopatía segura. Conclusión de los autores: no sirve como cribado, sirve para CONFIRMAR.',
  },
  'cook-2010': {
    id: 'cook-2010',
    pmid: '22131790',
    authors: 'Cook C, Brown C, Isaacs R, Roman M, Davis S, Richardson W',
    title: 'Clustered clinical findings for the diagnosis of cervical spine myelopathy',
    edition: '',
    publisher: 'J Man Manip Ther',
    year: 2010,
    sample:
      '249 pacientes con distintas alteraciones de la columna cervical',
    standard:
      'Diagnóstico clínico con confirmación por imagen de mielopatía cervical',
    note:
      'Las pruebas sueltas de mielopatía son específicas pero poco sensibles, y hasta este trabajo ningún clúster había demostrado ser mejor que ellas por separado. El estudio construye, por regresión multivariante, la combinación de hallazgos con mejor capacidad predictiva.',
  },
  'uitvlugt-1988': {
    id: 'uitvlugt-1988',
    pmid: '3395385',
    authors: 'Uitvlugt G, Indenbaum S',
    title: 'Clinical assessment of atlantoaxial instability using the Sharp-Purser test',
    edition: '',
    publisher: 'Arthritis Rheum',
    year: 1988,
    sample:
      '123 pacientes ambulatorios con artritis reumatoide',
    standard:
      'Radiografía: subluxación atloaxoidea anterior',
    note:
      'Valor predictivo 85% y especificidad 96%; la sensibilidad fue del 88% CUANDO la subluxación superaba los 4 mm, un matiz que casi nunca se cita y que cambia lo que significa un negativo en una subluxación pequeña.',
  },
  'hutting-2013': {
    id: 'hutting-2013',
    pmid: '23127991',
    authors: 'Hutting N, Verhagen AP, Vijverman V, Keesenberg MDM, Dixon G, Scholten-Peeters GGM',
    title:
      'Diagnostic accuracy of premanipulative vertebrobasilar insufficiency tests: a systematic review',
    edition: '',
    publisher: 'Man Ther',
    year: 2013,
    sample:
      'Revisión sistemática: de 1677 referencias solo 4 estudios cumplían los criterios, y los cuatro de calidad cuestionable (QUADAS)',
    standard:
      'El de cada estudio incluido',
    note:
      'Sensibilidad entre 0 y 57%, especificidad entre 67 y 100%, valor predictivo positivo entre 0 y 100%, razón de verosimilitud positiva entre 0,22 y 83,25. Con esa dispersión no se puede concluir nada firme, y los autores lo dicen con todas las letras: las pruebas premanipulativas NO parecen válidas como cribado antes de manipular, y es improbable que aporten valor.',
  },
  'hutting-2013b': {
    id: 'hutting-2013b',
    pmid: '23886844',
    authors: 'Hutting N, Scholten-Peeters GGM, Vijverman V, Keesenberg MDM, Verhagen AP',
    title: 'Diagnostic accuracy of upper cervical spine instability tests: a systematic review',
    edition: '',
    publisher: 'Phys Ther',
    year: 2013,
    sample:
      'Revisión sistemática de cinco estudios sobre pruebas de inestabilidad cervical alta, en pacientes y en personas sanas; calidad evaluada con QUADAS-2',
    standard:
      'El de cada estudio incluido',
    note:
      'No se pudo agrupar estadísticamente por heterogeneidad clínica y estadística. La especificidad de siete pruebas fue suficiente, pero la sensibilidad varió mucho y los intervalos de confianza fueron amplios en casi todos los casos. Las pruebas de MEMBRANAS fueron las de mejor precisión. La salvedad que condiciona su uso: NINGUNO de los estudios evaluó estas pruebas en pacientes de atención primaria.',
  },
  'jiang-2024': {
    id: 'jiang-2024',
    pmid: '37903098',
    authors: 'Jiang Z, Davies B, Zipser C, et al.',
    title:
      'The value of clinical signs in the diagnosis of degenerative cervical myelopathy: a systematic review and meta-analysis',
    edition: '',
    publisher: 'Global Spine J',
    year: 2024,
    sample:
      'Revisión sistemática y metaanálisis: 11 estudios con grupo control para la precisión diagnóstica, más 61 que describen la frecuencia de los signos en cohortes de mielopatía cervical degenerativa; riesgo de sesgo con QUADAS-2',
    standard:
      'Diagnóstico de mielopatía cervical degenerativa establecido clínicamente y confirmado por imagen',
    note:
      'Los signos más SENSIBLES fueron el de Trömner y la hiperreflexia; los más ESPECÍFICOS, el de Babinski, el de Trömner, el clonus y el signo del supinador invertido. Cinco estudios miraron si la presencia del signo se relaciona con la gravedad: no encontraron relación definida para Hoffmann, Babinski ni hiperreflexia, de modo que un signo presente indica que hay que pedir imagen, no cuán avanzada está la enfermedad.',
  },
  // La revision HERMANA de jiang-2024, la de los SINTOMAS (Lhermitte). Verificada
  // por E-utilities (esummary de PMID 37917661, 23 nov: autores, Global Spine J
  // 2024;14(4):1395-1421, DOI) y, la frecuencia del 25%, en el texto completo
  // (PMC11289544, Europe PMC fullTextXML, apartado "Other Symptoms").
  'jiang-2024b': {
    id: 'jiang-2024b',
    pmid: '37917661',
    doi: '10.1177/21925682231210468',
    authors: 'Jiang Z, Davies B, Zipser C, et al.',
    title:
      'The frequency of symptoms in patients with a diagnosis of degenerative cervical myelopathy: results of a scoping review',
    edition: '',
    publisher: 'Global Spine J',
    year: 2024,
    sample:
      'Revisión de alcance de los estudios primarios de mielopatía cervical degenerativa publicados entre 2005 y 2020: 3 estudios con grupo control para la precisión de los síntomas y 58 que describen su frecuencia en cohortes de pacientes',
    standard:
      'El diagnóstico de mielopatía cervical degenerativa de cada estudio incluido; para el fenómeno de Lhermitte solo hay frecuencia en cohortes, sin grupo control',
    note:
      'Mide con qué frecuencia los pacientes con mielopatía refieren cada síntoma. El fenómeno de Lhermitte aparece en una cuarta parte (media ponderada del 25%, IC 95% 23-29%, entre el 2 y el 77% en cuatro estudios), así que su ausencia no descarta la mielopatía; la revisión no publica su especificidad.',
  },

  // ---- LUMBAR: radiculopatía/hernia, inestabilidad y dolor sacroilíaco.
  'deville-2000': {
    id: 'deville-2000',
    pmid: '10788860',
    authors: 'Devillé WLJM, van der Windt DAWM, Dzaferagić A, Bezemer PD, Bouter LM',
    title: 'The test of Lasègue: systematic review of the accuracy in diagnosing herniated discs',
    edition: '',
    publisher: 'Spine',
    year: 2000,
    sample:
      'Revisión sistemática con metaanálisis: 17 publicaciones localizadas y 11 agrupadas, TODAS series quirúrgicas fuera de atención primaria',
    standard:
      'Hallazgo quirúrgico (hernia discal confirmada en cirugía)',
    note:
      'Elevación de la pierna recta: sensibilidad agrupada 0,91 (IC 95% 0,82-0,94) y especificidad 0,26 (0,16-0,38). Cruzada: 0,29 (0,24-0,34) y 0,88 (0,86-0,90). El poder discriminativo BAJÓ en los estudios más recientes, en los que incluían solo hernias primarias y en los que cegaron tanto la prueba como el patrón de referencia, que es la señal clásica de que las cifras altas venían del diseño. Los autores advierten de que estas series no permiten una evaluación válida de la precisión.',
  },
  'majlesi-2008': {
    id: 'majlesi-2008',
    pmid: '18391677',
    authors: 'Majlesi J, Togay H, Ünalan H, Toprak S',
    title:
      'The sensitivity and specificity of the slump and the straight leg raising tests in patients with lumbar disc herniation',
    edition: '',
    publisher: 'J Clin Rheumatol',
    year: 2008,
    sample:
      '75 pacientes de consulta externa de neurocirugía con dolor lumbar o de pierna: 38 con hernia demostrada por resonancia y 37 controles sin hernia ni protrusión',
    standard:
      'Resonancia magnética lumbar, leída por un autor distinto del que exploraba',
    note:
      'Slump 0,84 de sensibilidad y 0,83 de especificidad; elevación de la pierna recta 0,52 y 0,89. Es decir: el Slump ve bastantes más hernias, y la elevación de la pierna recta identifica mejor a los que tienen compresión radicular que podría acabar en quirófano. Es un diseño de casos y controles, que tiende a separar mejor los grupos de lo que ocurre en consulta.',
  },
  'suri-2011': {
    id: 'suri-2011',
    pmid: '20543768',
    authors: 'Suri P, Rainville J, Katz JN, et al.',
    title:
      'The accuracy of the physical examination for the diagnosis of midlumbar and low lumbar nerve root impingement',
    edition: '',
    publisher: 'Spine',
    year: 2011,
    doi: '10.1097/BRS.0b013e3181c953cc',
    sample:
      '57 pacientes con dolor radicular de menos de 12 semanas; se excluyeron los 103 que ya tenían la RM disponible, para que el explorador estuviera CIEGO al patrón de referencia',
    standard:
      'Compresión radicular en resonancia magnética, por región (L2-L4 frente a L5-S1) y por nivel concreto',
    note: 'Texto completo abierto (PMC2978791); las cifras están en las Tablas 3 y 4. Compresión MEDIA (L2-L4): tensión femoral 50% / 100% (LR+ infinito), tensión femoral cruzada 5% / 100%, Lasègue 16% / 31%, Lasègue cruzado 4% / 93%. Compresión BAJA (L5-S1): Lasègue 69% / 84% (LR+ 4,3), cruzado 7% / 96%. Por nivel: tensión femoral en L3, 70% / 88% (LR+ 5,7). Lo que enseña este estudio es que la cifra de una prueba cambia por completo según QUÉ se busque: el mismo Lasègue vale 16% de sensibilidad para la raíz alta y 69% para la baja.',
  },
  'kasai-2006': {
    id: 'kasai-2006',
    pmid: '17033040',
    authors: 'Kasai Y, Morishita K, Kawakita E, Kondo T, Uchida A',
    title: 'A new evaluation method for lumbar spinal instability: passive lumbar extension test',
    edition: '',
    publisher: 'Phys Ther',
    year: 2006,
    sample:
      '122 sujetos con enfermedad degenerativa lumbar, divididos en inestables y estables',
    standard:
      'Radiografías dinámicas en flexión y extensión de la columna lumbar',
    note:
      'La prueba de extensión lumbar pasiva dio 84,2% de sensibilidad y 90,4% de especificidad, con una razón de verosimilitud positiva de 8,84 (IC 95% 4,51-17,33), por encima del resto de signos comparados (instability catch, painful catch y aprensión).',
  },
  'hicks-2005': {
    id: 'hicks-2005',
    pmid: '16181938',
    authors: 'Hicks GE, Fritz JM, Delitto A, McGill SM',
    title:
      'Preliminary development of a clinical prediction rule for determining which patients with low back pain will respond to a stabilization exercise program',
    edition: '',
    publisher: 'Arch Phys Med Rehabil',
    year: 2005,
    doi: '10.1016/j.apmr.2005.03.033',
    sample: '54 pacientes con lumbalgia NO radicular derivados a fisioterapia',
    standard:
      'No es un estudio diagnóstico: el desenlace es la RESPUESTA a ocho semanas de ejercicio de estabilización, medida por el cambio en el Oswestry (18 éxitos, 15 fracasos, 21 mejoría parcial)',
    // Revisado contra el resumen (PMID 16181938, E-utilities, 23 nov): "preliminary
    // clinical prediction rules" en plural, una de exito (LR+ 4,0) y otra de
    // fracaso (LR- 0,18), y "straight-leg raise" como variable en una muestra sin
    // dolor radicular: es la AMPLITUD de la pierna recta, no el signo de Lasègue.
    // El 72/58 que se le atribuye a la prueba no esta en el resumen.
    note: 'Cuidado al citarlo: este estudio no mide si el test de inestabilidad en prono acierta un diagnóstico, así que no puede dar su precisión diagnóstica. Lo que publica son dos reglas preliminares de predicción de la RESPUESTA AL TRATAMIENTO: una para el éxito, con razón de verosimilitud positiva 4,0, y otra para el fracaso, con razón de verosimilitud negativa 0,18. Las variables que más pesaron fueron seis: edad, amplitud de la elevación de la pierna recta (no el signo de Lasègue: la muestra no tenía dolor radicular), test de inestabilidad en prono, movimientos aberrantes, hipermovilidad lumbar y creencias de miedo y evitación. Las cifras de 72% / 58% que se le atribuyen a la prueba no están en el resumen.',
  },
  // Verificado por E-utilities (esummary y resumen de PMID 24261926, 23 nov):
  // autores, revista, DOI, 105 pacientes, estabilizacion frente a terapia manual,
  // Oswestry modificado a las 8 semanas; la regla no se valido ni, por poca
  // potencia, se pudo invalidar; la version de 2 elementos salio post hoc.
  'rabin-2014': {
    id: 'rabin-2014',
    pmid: '24261926',
    authors: 'Rabin A, Shashua A, Pizem K, Dickstein R, Dar G',
    title:
      'A clinical prediction rule to identify patients with low back pain who are likely to experience short-term success following lumbar stabilization exercises: a randomized controlled validation study',
    edition: '',
    publisher: 'J Orthop Sports Phys Ther',
    year: 2014,
    doi: '10.2519/jospt.2014.4888',
    sample:
      '105 pacientes con lumbalgia, estratificados según la regla de Hicks y aleatorizados a ejercicio de estabilización o a terapia manual con ejercicios de movilidad y flexibilidad',
    standard:
      'No es un estudio diagnóstico: el desenlace es la discapacidad (Oswestry modificado) al terminar ocho semanas de tratamiento',
    note: 'Intento de validar la regla del éxito de Hicks 2005: no la validó y, por su poca potencia, tampoco pudo descartarla. Una versión con solo dos elementos (movimientos aberrantes y test de inestabilidad en prono positivo) sí mostró interacción con el tratamiento, pero salió de un análisis a posteriori y los autores piden confirmarla en un estudio nuevo.',
  },
  'laslett-2005': {
    id: 'laslett-2005',
    pmid: '16038856',
    authors: 'Laslett M, Aprill CN, McDonald B, Young SB',
    title:
      'Diagnosis of sacroiliac joint pain: validity of individual provocation tests and composites of tests',
    edition: '',
    publisher: 'Man Ther',
    year: 2005,
    doi: '10.1016/j.math.2005.01.003',
    sample: '48 pacientes explorados por fisioterapeutas, diseño ciego frente al patrón',
    standard: 'Inyección de anestésico local dentro de la articulación sacroilíaca',
    note: 'El resumen publica el CONJUNTO, no las pruebas sueltas: tres o más positivas de seis dan 94% de sensibilidad y 78% de especificidad; el área bajo la curva de las mejores dos de cuatro es 0,842. Y dos frases que valen más que cualquier cifra individual: todo paciente que respondió al bloqueo tuvo al menos una prueba positiva, y cuando las seis son negativas la sacroilíaca queda descartada como origen del dolor. Las cifras por prueba suelta están en las tablas del texto completo, que es de pago.',
  },

  // ---- TORÁCICA: fractura vertebral, escoliosis, espondiloartritis axial y
  // síndrome del desfiladero torácico. Sin pmid: el enlace cae a la búsqueda
  // por título en PubMed (siempre resuelve). No inventar identificadores.
  'langdon-2010': {
    id: 'langdon-2010',
    pmid: '19995486',
    authors: 'Langdon J, Way A, Heaton S, Bernard J, Molloy S',
    title: 'Vertebral compression fractures — new clinical signs to aid diagnosis',
    edition: '',
    publisher: 'Ann R Coll Surg Engl',
    year: 2010,
    // Texto completo (PMC3025244, pagina del articulo, 23 nov): "Eighty-three
    // consecutive patients", 8 hombres y 75 mujeres, 78,4 anos (72-95); cinco
    // excluidos (dos con marcapasos y dos con claustrofobia, que no podian
    // hacerse la resonancia, y una metastasis); "Of the 78 patients"; todos
    // explorados por el autor senior; fractura = edema en STIR, "an acute or
    // chronic, but non-healed" fracture. Edad y sexo son de los 83 que entraron.
    sample:
      '83 pacientes consecutivos con sospecha de fractura vertebral osteoporótica sintomática (8 hombres y 75 mujeres, edad media 78,4 años, de 72 a 95), estudio prospectivo: 5 excluidos (4 no podían hacerse la resonancia, 1 metástasis vertebral) y 78 analizados; a todos los exploró el autor sénior',
    standard:
      'Resonancia magnética: cuenta como fractura el edema en STIR, aguda o crónica sin consolidar (la radiografía simple no distingue una fractura aguda de una antigua consolidada)',
    note:
      'Percusión con el puño cerrado: sensibilidad 87,5% y especificidad 90%. Signo en supino: 81,25% y 93,33%. Las dos son maniobras de consulta, sin coste, para decidir a quién se le pide la resonancia.',
  },
  'cote-1998': {
    id: 'cote-1998',
    pmid: '9563110',
    // Quinto autor comprobado por esummary (PMID 9563110, 23 nov): Martel J, no Hurley J.
    authors: 'Côté P, Kreitz BG, Cassidy JD, Dzus AK, Martel J',
    title:
      "A study of the diagnostic accuracy and reliability of the Scoliometer and Adam's forward bend test",
    edition: '',
    publisher: 'Spine',
    year: 1998,
    sample: '105 pacientes remitidos a una consulta de escoliosis por asimetría del tronco, explorados por 2 examinadores independientes',
    standard: 'ángulo de Cobb en radiografía, con el umbral en curvas torácicas de 20° o más',
    note:
      'El resumen NO publica sensibilidad ni especificidad; lo que sí afirma es que la prueba de Adams es MÁS SENSIBLE que el escoliómetro para curvas torácicas de 20° o más, y que la concordancia entre exploradores es sustancial en la torácica pero POBRE en la lumbar.',
  },
  'vanderlinden-1984': {
    id: 'vanderlinden-1984',
    authors: 'van der Linden S, Valkenburg HA, Cats A',
    title:
      'Evaluation of diagnostic criteria for ankylosing spondylitis: a proposal for modification of the New York criteria',
    edition: '',
    publisher: 'Arthritis Rheum',
    year: 1984,
    standard: 'familiares de pacientes con espondilitis anquilosante y controles de población',
    note:
      'Criterios de Nueva York modificados. El propio resumen califica el criterio de expansión torácica de "demasiado poco sensible", y es la razón por la que se mantuvo pero dejó de pesar por sí solo. El umbral de 2,5 cm que suele citarse NO aparece en el resumen.',
  },
  'gillard-2001': {
    id: 'gillard-2001',
    pmid: '11707008',
    authors: 'Gillard J, Pérez-Cousin M, Hachulla E, et al.',
    title:
      'Diagnosing thoracic outlet syndrome: contribution of provocative tests, ultrasonography, electrophysiology, and helical computed tomography',
    edition: '',
    publisher: 'Joint Bone Spine',
    year: 2001,
    sample: '48 pacientes con sospecha de síndrome del desfiladero torácico',
    standard:
      'ninguno único: ecografía Doppler, electrofisiología y angio-TC helicoidal, sin patrón de referencia aceptado',
    note:
      'OJO con las cifras que se le atribuyen. El resumen solo da la MEDIA de todos los tests provocativos (sensibilidad 72%, especificidad 53%) y dos valores predictivos POSITIVOS (Adson 85%, hiperabducción 92%), que no son especificidades. Las cifras por test que circulan en las revisiones se contradicen entre sí: para Adson se citan 79/76 y 72/53 atribuidos a este mismo estudio.',
  },

  'plewa-1998': {
    id: 'plewa-1998',
    pmid: '9562199',
    authors: 'Plewa MC, Delinger M',
    title:
      'The false-positive rate of thoracic outlet syndrome shoulder maneuvers in healthy subjects',
    edition: '',
    publisher: 'Acad Emerg Med',
    year: 1998,
    sample: '53 voluntarios adultos SANOS (27 mujeres, 29,7 ± 6,4 años; rango 21-58)',
    standard:
      'ninguno: mide cuántas personas SIN síntomas dan positivo, no compara contra una prueba de imagen',
    note:
      'Lo que aporta es el lado de la especificidad, y el criterio de positividad lo cambia todo. En sanos: Adson altera el pulso en el 11% y da parestesias en el 11%, pero DOLOR en el 0%; el EAST altera el pulso en el 62%, da parestesias en el 36% y dolor en el 21%. Con el dolor como criterio, el límite superior del intervalo de falsos positivos es del 7% para Adson y del 16% para tener que interrumpir el EAST.',
  },

  // ---- RODILLA: cruzados (LCA/LCP), menisco y ligamentos colaterales.
  'benjaminse-2006': {
    id: 'benjaminse-2006',
    pmid: '16715828',
    authors: 'Benjaminse A, Gokeler A, van der Schans CP',
    title: 'Clinical diagnosis of an anterior cruciate ligament rupture: a meta-analysis',
    edition: '',
    publisher: 'J Orthop Sports Phys Ther',
    year: 2006,
    sample:
      'Metaanálisis de 28 estudios (MEDLINE, EMBASE y CINAHL hasta abril de 2005) sobre la exploración del ligamento cruzado anterior',
    standard:
      'Artroscopia, artrotomía o resonancia magnética',
    note:
      'Cifras agrupadas: Lachman 85% (IC 95% 83-87) y 94% (92-95); pivot shift 24% (21-27) y 98% (96-99); cajón anterior 92% (88-95) y 91% (87-94) EN LESIÓN CRÓNICA, y expresamente no en la aguda. Los resultados entre estudios fueron heterogéneos. La recomendación es hacer el Lachman siempre y añadir el pivot shift por lo específico que es.',
  },
  // Las tres replicas del Thessaly que cita knee.ts. Verificadas por E-utilities
  // (esummary y resumen de PMID 26243431, 25420009 y 19124977, 23 nov): autores,
  // revista, año y DOI del esummary; muestras, cifras y conclusiones del resumen.
  'blyth-2015': {
    id: 'blyth-2015',
    pmid: '26243431',
    doi: '10.3310/hta19620',
    authors:
      'Blyth M, Anthony I, Francq B, Brooksbank K, Downie P, Powell A, Jones B, MacLean A, McConnachie A, Norrie J',
    title:
      "Diagnostic accuracy of the Thessaly test, standardised clinical history and other clinical examination tests (Apley's, McMurray's and joint line tenderness) for meniscal tears in comparison with magnetic resonance imaging diagnosis",
    edition: '',
    publisher: 'Health Technol Assess',
    year: 2015,
    sample:
      'Estudio prospectivo de un solo centro de atención especializada, diseñado para reproducir lo que se obtendría en atención primaria: 292 pacientes con patología de rodilla y 75 controles sin ella; a cada uno lo exploraron un clínico de atención primaria y un clínico musculoesquelético',
    standard:
      'Resonancia magnética. En el subgrupo que pasó a artroscopia, la propia resonancia tuvo una sensibilidad del 100% pero una especificidad de solo el 53% (IC 95% 28-77)',
    note:
      'Thessaly con clínicos de atención primaria: sensibilidad 66%, especificidad 39% y exactitud del 54%; con clínicos musculoesqueléticos: 62%, 55% y 59%. El resumen no da intervalos de confianza de estas cifras. Con clínicos de atención primaria, McMurray, Apley y el dolor en la interlínea rindieron igual de poco (exactitud del 54%, 53% y 54%). Conclusión de los autores: Thessaly no diagnostica la rotura meniscal mejor que las demás pruebas físicas, y ninguna prueba física rinde lo bastante para sustituir de rutina a la resonancia.',
  },
  'goossens-2015': {
    id: 'goossens-2015',
    pmid: '25420009',
    doi: '10.2519/jospt.2015.5215',
    authors: 'Goossens P, Keijsers E, van Geenen RJ, Zijta A, van den Broek M, Verhagen AP, Scholten-Peeters GG',
    title:
      'Validity of the Thessaly test in evaluating meniscal tears compared with arthroscopy: a diagnostic accuracy study',
    edition: '',
    publisher: 'J Orthop Sports Phys Ther',
    year: 2015,
    sample:
      '593 pacientes con sospecha de rotura meniscal remitidos al hospital para artroscopia, 493 (83%) con rotura. La prueba la hicieron fisioterapeutas experimentados a 20° de flexión, cegados a la información del paciente, a la rodilla afectada y a la imagen previa',
    standard: 'Artroscopia, hecha por un cirujano ortopédico cegado al resultado de la exploración del fisioterapeuta',
    note:
      'Thessaly sola: sensibilidad 64% (IC 95% 60-68) y especificidad 53% (43-63), valor predictivo positivo 87% y negativo 23%, razones de verosimilitud 1,37 y 0,68. Con Thessaly y McMurray positivas a la vez: 53% y 62%. Conclusión de los autores: ni sola ni combinada con McMurray parece útil para confirmar o descartar la rotura meniscal. La prevalencia del 83% es la de pacientes que ya iban a artroscopia.',
  },
  'harrison-2009': {
    id: 'harrison-2009',
    pmid: '19124977',
    doi: '10.1097/JSM.0b013e31818f1689',
    authors: 'Harrison BK, Abell BE, Gibson TW',
    title:
      'The Thessaly test for detection of meniscal tears: validation of a new physical examination technique for primary care medicine',
    edition: '',
    publisher: 'Clin J Sport Med',
    year: 2009,
    sample:
      'Cohorte RETROSPECTIVA de 116 pacientes consecutivos operados por artroscopia por sospecha de lesión meniscal, explorados antes de la cirugía en el servicio de cirugía ortopédica de un hospital militar de referencia (atención especializada)',
    standard: 'Artroscopia',
    note:
      'Thessaly a 20°, con el paciente de pie sobre el pie plano y sujeto de las manos: sensibilidad 90,3%, especificidad 97,7%, valor predictivo positivo 98,5% y negativo 86,0%, razones de verosimilitud 39,3 y 0,09, exactitud 88,8%; de 66 pruebas positivas, 65 tenían rotura en la artroscopia. El resumen no da intervalos de confianza. Los propios autores avisan de que, hecho en un centro de referencia, el resultado no se puede aplicar sin más a una población general.',
  },
  'hegedus-2007': {
    id: 'hegedus-2007',
    pmid: '17939613',
    authors: 'Hegedus EJ, Cook C, Hasselblad V, Goode A, McCrory DC',
    title:
      'Physical examination tests for assessing a torn meniscus in the knee: a systematic review with meta-analysis',
    edition: '',
    publisher: 'J Orthop Sports Phys Ther',
    year: 2007,
    sample:
      'Revisión sistemática y metaanálisis de 18 estudios (MEDLINE, CINAHL y SPORTDiscus, 1966 a agosto de 2006), evaluados con QUADAS',
    standard:
      'El de cada estudio incluido (artroscopia o cirugía en la mayoría)',
    note:
      'Cifras agrupadas: McMurray 70% / 71%, Apley 60% / 70%, dolor en la interlínea 63% / 77%. Los resultados fueron heterogéneos y esa heterogeneidad NO se explicó por la prevalencia, por la calidad del estudio ni por lo bien descrita que estuviera la prueba, lo que apunta a diferencias locales en cómo se hace y cómo se interpreta cada maniobra. Conclusión: ninguna prueba aislada diagnostica con precisión una rotura meniscal.',
  },
  'karachalios-2005': {
    id: 'karachalios-2005',
    pmid: '15866956',
    authors: 'Karachalios T, Hantes M, Zibis AH, Zachos V, Karantanas AH, Malizos KN',
    title:
      'Diagnostic accuracy of a new clinical test (the Thessaly test) for early detection of meniscal tears',
    edition: '',
    publisher: 'J Bone Joint Surg Am',
    year: 2005,
    sample:
      '213 pacientes sintomáticos con lesión de rodilla (exploración clínica, resonancia y artroscopia) y 197 voluntarios asintomáticos con rodillas normales',
    standard:
      'Artroscopia en los sintomáticos; resonancia en los controles',
    note:
      'La prueba de Thessaly a 20° de flexión alcanzó una EXACTITUD del 94% para el menisco medial y del 96% para el lateral, con pocos falsos positivos y negativos; el resto de pruebas tradicionales rindió peor, salvo el dolor en la interlínea para el menisco lateral (89% de exactitud). Dos cosas importan al usarla. Primera, las cifras son del grupo original de sus autores: una serie retrospectiva independiente de un centro de referencia (Harrison 2009) dio cifras igual de altas, y dos estudios posteriores no las reprodujeron (Blyth 2015, con clínicos de atención primaria y musculoesqueléticos frente a resonancia, y Goossens 2015, con fisioterapeutas frente a artroscopia). Segunda, la exactitud no es lo mismo que la sensibilidad o la especificidad, que están en las tablas del texto completo.',
  },
  'malanga-2003': {
    id: 'malanga-2003',
    pmid: '12690600',
    authors: 'Malanga GA, Andrus S, Nadler SF, McLean J',
    title:
      'Physical examination of the knee: a review of the original test description and scientific validity of common orthopedic tests',
    edition: '',
    publisher: 'Arch Phys Med Rehabil',
    year: 2003,
    doi: '10.1053/apmr.2003.50026',
    sample: 'Revisión narrativa: búsqueda en MEDLINE 1970-2000 más manuales de exploración, siguiendo cada prueba hasta su descripción original',
    standard: 'No aplica: es una revisión, no una serie de pacientes',
    note: 'Lo que concluye en palabras, porque no publica cifras propias: Lachman es muy sensible y específico para el LCA; para el LCP el cajón posterior también lo es y mejora combinado con el sag; McMurray es muy específico y poco sensible, y el dolor en la interlínea al contrario. Y la frase que importa para los colaterales: aunque su exploración PARECE sensible y específica, "faltan estudios bien diseñados" que la validen. Las pruebas femoropatelares pierden sensibilidad al contrastarlas con los hallazgos quirúrgicos.',
  },
  'rubinstein-1994': {
    id: 'rubinstein-1994',
    pmid: '7943523',
    doi: '10.1177/036354659402200419',
    authors: 'Rubinstein RA Jr, Shelbourne KD, McCarroll JR, VanMeter CD, Rettig AC',
    title:
      'The accuracy of the clinical examination in the setting of posterior cruciate ligament injuries',
    edition: '',
    publisher: 'Am J Sports Med',
    year: 1994,
    sample: '39 sujetos: 18 pacientes con 19 roturas crónicas aisladas de LCP, 9 rodillas con déficit de LCA, 12 rodillas normales y las rodillas sanas contralaterales',
    standard: 'Diagnóstico establecido; examinadores cegados a la historia, la identidad y el diagnóstico (estudio aleatorizado y controlado)',
    note: 'Exactitud global de la exploración 96%; para detectar una rotura de LCP, 90% de sensibilidad y 99% de especificidad. La exactitud fue mayor en las laxitudes de grado II y III que en el grado I, y los examinadores coincidieron en el grado el 81% de las veces. La prueba más sensible y específica fue el cajón posterior INCLUYENDO la palpación del escalón tibiofemoral: la cifra describe esa maniobra completa, no la inspección a ojo.',
  },

  // ---- CODO: epicondilalgias, ligamento colateral cubital y túnel cubital.
  'odriscoll-2005': {
    id: 'odriscoll-2005',
    authors: "O'Driscoll SW, Lawton RL, Smith AM",
    title: 'The "moving valgus stress test" for medial collateral ligament tears of the elbow',
    edition: '',
    publisher: 'Am J Sports Med',
    year: 2005,
    pmid: '15701609',
    doi: '10.1177/0363546504267804',
    sample:
      '21 pacientes operados por dolor medial de codo; las cifras salen de 17 positivos y 4 negativos',
    standard:
      'Exploración quirúrgica del ligamento colateral medial o prueba de estrés en valgo bajo artroscopia',
    note: 'Sensibilidad 100% (17 de 17) y especificidad 75% (3 de 4). Esos denominadores importan: la especificidad se calculó sobre CUATRO pacientes, de modo que un solo caso distinto la habría movido 25 puntos. Nivel de evidencia 2. El dato reproducible del estudio es el arco: el dolor aparece entre 120° y 70° y es máximo a 90° de flexión.',
  },
  'novak-1994': {
    id: 'novak-1994',
    authors: 'Novak CB, Lee GW, Mackinnon SE, Lay L',
    title: 'Provocative testing for cubital tunnel syndrome',
    edition: '',
    publisher: 'J Hand Surg Am',
    year: 1994,
    pmid: '7806810',
    doi: '10.1016/0363-5023(94)90193-7',
    sample: '32 pacientes (44 extremidades) y 33 controles sanos',
    standard: 'Síndrome del túnel cubital confirmado por electrodiagnóstico',
    // Resumen (PMID 7806810, E-utilities, 23 nov): el Tinel no es una prueba de 30
    // segundos ("The sensitivity of the Tinel sign was 0.70, and at 30 seconds, the
    // sensitivities of the other provocative tests were..."). Los recuentos de las
    // otras tres (33, 39 y 41 de 44) no dan sus cifras, asi que no se ponen al lado.
    note: 'Sólo sensibilidades: Tinel 0,70 (31 de 44 extremidades); a los 30 segundos, flexión del codo aislada 0,32, compresión aislada 0,55, compresión + flexión 0,91. El resumen NO publica especificidad de ninguna de las cuatro; de los controles dice únicamente que "rara vez" dieron positivo. Cualquier especificidad numérica atribuida a este estudio (el 98% del Tinel, el 97% de la flexión-compresión) no está en la fuente.',
  },
  'saroja-2014': {
    id: 'saroja-2014',
    authors: 'Saroja G, Antony Leo Aseer P, Venkata Sai PM',
    title: 'Diagnostic accuracy of provocative tests in lateral epicondylitis',
    edition: '',
    publisher: 'Int J Physiother Res',
    year: 2014,
    doi: '10.16965/ijpr.2014.699',
    sample: '30 sujetos; un segundo explorador, ciego a los resultados de las pruebas, hizo la ecografía',
    standard:
      'Ecografía musculoesquelética: grosor del tendón extensor común, ecotextura y contorno óseo del epicóndilo',
    note: 'Las seis cifras, del resumen: sensibilidad Cozen 84%, Maudsley 88%, Mill 53%; especificidad Cozen 0%, Maudsley 0%, Mill 100%. Sí, cero: en esta serie de 30 las dos pruebas resistidas dieron positivo en TODOS los sujetos con ecografía negativa. Con 30 sujetos los negativos son pocos, así que el 0% y el 100% son extremos de muestra pequeña, no constantes biológicas. Única con área bajo la curva ROC significativa: Mill (0,769).',
  },
  'zwerus-2018': {
    id: 'zwerus-2018',
    pmid: '28249855',
    doi: '10.1136/bjsports-2016-096712',
    // AUTORES SEGUN PUBMED (esummary del PMID, 15 nov). La lista anterior
    // (Nagels, Nieuwenhuis, van Noort) no es la de este articulo.
    authors: 'Zwerus EL, Somford MP, Maissan F, Heisen J, Eygendaal D, van den Bekerom MP',
    title: 'Physical examination of the elbow, what is the evidence? A systematic literature review',
    edition: '',
    publisher: 'Br J Sports Med 2018;52(19):1253-1260',
    year: 2018,
    sample:
      'Revisión sistemática PRISMA: de 1144 referencias se incluyeron 10 artículos (6 de rotura distal del bíceps, 1 de insuficiencia del ligamento colateral medial, 2 de inestabilidad rotatoria posterolateral y 1 de epicondilalgia lateral); nueve de los diez con riesgo de sesgo alto o poco claro según QUADAS-2',
    standard:
      'El de cada estudio incluido',
    note:
      'Se describieron 24 procedimientos de exploración del codo y solo 14 traían datos de precisión diagnóstica. No se encontró NINGÚN artículo sobre rotura del tríceps, pinzamiento posteromedial ni epicondilalgia medial. La conclusión es la que gobierna todo el panel del codo: ninguna de las pruebas descritas ofrece certeza suficiente para confirmar ni para descartar.',
  },

  // ---- HOMBRO: cuadros patologicos del laboratorio (P1 "normal vs patologico").
  // Journal articles (edition:''); sin pmid -> el enlace cae a busqueda por titulo
  // en PubMed (siempre resuelve). Confirmar pmid/pagina contra la fuente primaria.
  'kibler-2013': {
    id: 'kibler-2013',
    pmid: '23580420',
    authors: 'Kibler WB, Ludewig PM, McClure PW, Michener LA, Bak K, Sciascia AD',
    title:
      'Clinical implications of scapular dyskinesis in shoulder injury: the 2013 consensus statement from the scapular summit',
    edition: '',
    publisher: 'Br J Sports Med',
    year: 2013,
    note: 'Consenso sobre discinesia escapular: menor rotación superior/báscula posterior y su papel en la lesión de hombro.',
  },
  'ludewig-2009': {
    id: 'ludewig-2009',
    authors: 'Ludewig PM, Reynolds JF',
    title: 'The association of scapular kinematics and glenohumeral joint pathologies',
    edition: '',
    publisher: 'J Orthop Sports Phys Ther',
    year: 2009,
    note: 'Cinemática escapular alterada en el pinzamiento subacromial (menor rotación superior y báscula posterior).',
  },
  'kelley-2013': {
    id: 'kelley-2013',
    authors: 'Kelley MJ, Shaffer MA, Kuhn JE, et al.',
    title:
      'Shoulder pain and mobility deficits: adhesive capsulitis. Clinical practice guidelines',
    edition: '',
    publisher: 'J Orthop Sports Phys Ther',
    year: 2013,
    note: 'Guía de práctica clínica de capsulitis adhesiva (hombro congelado): patrón capsular, RE la más limitada.',
  },

  // ----- Cadera: fuentes PRIMARIAS de las cifras que antes sólo citaban Magee -----
  //
  // Las ocho pruebas de cadera mostraban su sensibilidad y su especificidad
  // apoyadas en un manual, sin PubMed y sin forma de comprobarlas: 0 de 8
  // verificadas. Estas tres entradas son los estudios de los que salen esas
  // cifras, y en cada una el número está en el RESUMEN público, de modo que se
  // puede comprobar sin acceso de biblioteca.
  'bird-2001': {
    id: 'bird-2001',
    pmid: '11592379',
    authors: 'Bird PA, Oakley SP, Shnier R, Kirkham BW',
    title:
      'Prospective evaluation of magnetic resonance imaging and physical examination findings in patients with greater trochanteric pain syndrome',
    edition: '',
    publisher: 'Arthritis Rheum',
    year: 2001,
    sample: '24 mujeres con síndrome doloroso del trocánter mayor (mediana 58 años)',
    standard: 'RM 1,5 T: rotura del tendón del glúteo medio',
    note: 'Signo de Trendelenburg: sensibilidad 72,7% y especificidad 76,9%, el más exacto y el más fiable de los tres signos estudiados (kappa intraobservador 0,676).',
  },

  'reiman-2015': {
    id: 'reiman-2015',
    pmid: '25515771',
    authors: 'Reiman MP, Goode AP, Cook CE, Hölmich P, Thorborg K',
    title:
      'Diagnostic accuracy of clinical tests for the diagnosis of hip femoroacetabular impingement/labral tear: a systematic review with meta-analysis',
    edition: '',
    publisher: 'Br J Sports Med',
    year: 2015,
    sample: 'Metanálisis de 9 estudios (de 21 localizados; sólo 1 de alta calidad)',
    standard: 'Pinzamiento femoroacetabular / rotura del labrum confirmados por imagen o artroscopia',
    // Resumen (PMID 25515771, E-utilities, 23 nov): "pooled SN ranging from 0.94
    // (95% CI 0.90 to 0.97) to 0.99 (95% CI 0.98 to 1.00)". Antes solo daba el 0,94.
    note: 'FADIR: sensibilidad agrupada entre 0,94 (IC 95% 0,90-0,97) y 0,99 (IC 95% 0,98-1,00), según el análisis. Los autores concluyen que sólo sirve como CRIBADO, no para confirmar.',
  },

  'maslowski-2010': {
    id: 'maslowski-2010',
    pmid: '20359681',
    authors: 'Maslowski E, Sullivan W, Forster Harwood J, et al.',
    title:
      'The diagnostic validity of hip provocation maneuvers to detect intra-articular hip pathology',
    edition: '',
    publisher: 'PM R',
    year: 2010,
    sample: '50 pacientes derivados para infiltración intraarticular de cadera',
    standard: 'Mejoría ≥80% en la escala visual analógica tras bloqueo anestésico intraarticular guiado por fluoroscopia',
    note: 'Maniobra de Stinchfield (flexión resistida): la MÁS específica de las cuatro estudiadas, y aun así sólo 0,32 (IC 95% 0,14-0,55). FABER: sensibilidad 0,82 (IC 95% 0,57-0,96). El resumen público no publica cifra para el scour: TODA especificidad de cadera por encima de 0,32 contradice este estudio.',
  },
  'vandijk-1996': {
    id: 'vandijk-1996',
    pmid: '9065068',
    doi: '10.3109/17453679608997757',
    authors: 'van Dijk CN, Mol BWJ, Lim LSL, Marti RK, Bossuyt PMM',
    title:
      'Diagnosis of ligament rupture of the ankle joint: physical examination, arthrography, stress radiography and sonography compared in 160 patients after inversion trauma',
    edition: '',
    publisher: 'Acta Orthop Scand',
    year: 1996,
    sample: '160 pacientes consecutivos de 18 a 40 años con traumatismo por inversión; 135 operados',
    standard:
      'Hallazgos intraoperatorios en los operados; artrografía más seguimiento clínico mínimo de seis meses en el resto',
    note: 'El estudio NO mide el cajón anterior por separado: compara 13 ESTRATEGIAS completas (Tabla 1). Exploración física antes de las 48 h: 71% / 33%. La misma exploración a los 5 DÍAS por un explorador experimentado: 96% / 84%; por uno inexperto pero bien instruido: 89% / 70%. Artrografía: 96% / 71%. Radiografía de estrés: 68% / 71%. El hallazgo que manda no es qué prueba se hace, es CUÁNDO. En la discusión: la combinación de dolor a la palpación del LPAA, hematoma y cajón anterior positivo tiene una sensibilidad del 96%; hematoma más dolor a la palpación, del 90%.',
  },
  'maffulli-1998': {
    id: 'maffulli-1998',
    pmid: '9548122',
    doi: '10.1177/03635465980260021801',
    authors: 'Maffulli N',
    title:
      'The clinical diagnosis of subcutaneous tear of the Achilles tendon. A prospective study in 174 patients',
    edition: '',
    publisher: 'Am J Sports Med',
    year: 1998,
    sample: '174 pacientes con rotura completa y 28 con sospecha sin rotura, reclutados a lo largo de 13 años',
    standard: 'Rotura subcutánea completa del tendón calcáneo; ausencia de rotura confirmada por imagen',
    note: 'Compresión de la pantorrilla (Thompson/Simmonds): sensibilidad 0,96 y especificidad 0,93, la más sensible de las cinco pruebas junto con Matles (0,88 / 0,85). Palpación del hueco: 0,73 despierto, 0,81 bajo anestesia, especificidad 0,89. Copeland y O’Brien: 0,80. En TODOS los pacientes del estudio al menos dos pruebas fueron positivas: de ahí que la recomendación sea combinarlas, no elegir una.',
  },
  'palsson-2020': {
    id: 'palsson-2020',
    pmid: '32335699',
    doi: '10.1007/s00167-020-06005-5',
    authors: 'Pålsson A, Kostogiannis I, Ageberg E',
    title:
      'Combining results from hip impingement and range of motion tests can increase diagnostic accuracy in patients with FAI syndrome',
    edition: '',
    publisher: 'Knee Surg Sports Traumatol Arthrosc',
    year: 2020,
    // Texto completo (PMC7511272, Europe PMC, 23 nov): 81 incluidos, pero la
    // exactitud se calculo en 63 (69 caderas, Tabla 4).
    sample: '81 pacientes incluidos (49% mujeres), dos exploradores experimentados; la exactitud diagnóstica se calculó en 63 de ellos (69 caderas)',
    standard:
      'Tres criterios a la vez: síntomas, morfología CAM o pincer en imagen, y respuesta al bloqueo anestésico intraarticular',
    note: 'FADIR: sensibilidad 80%, especificidad 25%. Prueba de pinzamiento anterior (AIMT): 80% / 26%. Y el hallazgo que da la vuelta al razonamiento: la rotación interna PASIVA en posición neutra, 29% de sensibilidad y 94% de especificidad, es la única de la serie que sirve para confirmar. Nivel de evidencia II.',
  },
  'wong-2022': {
    id: 'wong-2022',
    pmid: '35171468',
    doi: '10.1007/s12178-022-09745-8',
    authors: 'Wong SE, Cogan CJ, Zhang AL',
    title:
      'Physical Examination of the Hip: Assessment of Femoroacetabular Impingement, Labral Pathology, and Microinstability',
    edition: '',
    publisher: 'Curr Rev Musculoskelet Med',
    year: 2022,
    sample: 'Revisión narrativa; recopila los rangos publicados de otros estudios, no mide pacientes propios',
    standard: 'Variable y en su mayoría NO declarado por la revisión (es su propia advertencia)',
    note: 'Texto completo abierto. Da RANGOS, no cifras únicas: scour sensibilidad 50-100% y especificidad 29%; FABER 41-97% / 18-100%; FADIR 59-100% / 10-100%. Del log roll dice que se describe como una de las pruebas más específicas pero NO publica cifras. La propia revisión advierte que los números de cita de su tabla no siempre coinciden con el texto.',
  },
  // LAS CINCO SIGUIENTES entraron con la revision de las pruebas contra su
  // fuente (15 nov). Autores, ano, revista y DOI comprobados con esummary de
  // E-utilities; las cifras de cada nota, en el resumen o en el texto completo
  // abierto que nombra la propia nota.
  'willett-2016': {
    id: 'willett-2016',
    pmid: '26755689',
    doi: '10.1177/0363546515621762',
    authors: 'Willett GM, Keim SA, Shostrom VK, Lomneth CS',
    title: 'An Anatomic Investigation of the Ober Test',
    edition: '',
    publisher: 'Am J Sports Med 2016;44(3):696-701',
    year: 2016,
    sample:
      'Miembros inferiores de cadáveres ligeramente embalsamados; 18 pasaron por todas las secciones sucesivas (banda iliotibial a mitad del muslo, glúteo medio y menor, cápsula de la cadera)',
    note: 'Estudio anatómico, no de exactitud diagnóstica: no da sensibilidad ni especificidad. Tras seccionar la banda iliotibial a mitad del muslo, la aducción no tuvo cambio significativo en ninguna de las dos versiones de la prueba (Ober y Ober modificado); con las secciones siguientes, sumadas a esa, del glúteo medio y menor y después de la cápsula, sí aumentó (P < 0,0001 frente a la banda intacta). Los autores concluyen que el resultado refuta que la banda limite la aducción en la prueba y pone en duda su validez para medir la retracción de la banda; sugieren que valora estructuras de la cadera como el glúteo medio y menor y la cápsula.',
  },
  'netterstromwedin-2022': {
    id: 'netterstromwedin-2022',
    pmid: '34286639',
    doi: '10.1177/19417381211029953',
    authors: 'Netterström-Wedin F, Matthews M, Bleakley C',
    title:
      'Diagnostic accuracy of clinical tests assessing ligamentous injury of the talocrural and subtalar joints: a systematic review with meta-analysis',
    edition: '',
    publisher: 'Sports Health 2022;14(3):336-347',
    year: 2022,
    sample:
      'Revisión sistemática de 14 estudios (6.302 observaciones, 9 pruebas clínicas); el metaanálisis del cajón anterior agrupa 6 estudios y 885 observaciones',
    standard: 'Artrografía, artroscopia o cirugía, resonancia magnética o ecografía, según el estudio',
    note: 'Texto completo abierto (PMC9109591). Cajón anterior, metaanálisis de seis estudios (885 observaciones): sensibilidad 54% (IC 95% 35 a 71) y especificidad 87% (63 a 96); LR+ 3,97 (1,50 a 10,47) y LR- 0,54 (0,39 a 0,75). Heterogeneidad alta (I² 94,2% en la sensibilidad y 62,1% en la especificidad), que los autores atribuyen en parte al umbral con que se da por positiva la prueba; proponen un umbral alto. La mayoría de los estudios explora el cajón con la rodilla flexionada, en supino o sentado. Inclinación astragalina manual: cuatro estudios sin agrupar, sensibilidad 17 a 66% y especificidad 82 a 100%; confirma la lesión del calcaneoperoneo y falta una prueba sensible para ese ligamento. Palpación del LPAA: sensibilidad 95 a 100% y especificidad 0 a 32%. Conclusión: palpar para descartar y hacer el cajón para confirmar. Las cifras agrupadas del cajón y las de la palpación están en el resumen; las razones de verosimilitud, la heterogeneidad y las cifras de la inclinación astragalina, en el texto completo. Advierten de la baja calidad de los estudios y del mal registro del cegamiento.',
  },
  'croy-2013': {
    id: 'croy-2013',
    pmid: '24175608',
    doi: '10.2519/jospt.2013.4679',
    authors: 'Croy T, Koppenhaver S, Saliba S, Hertel J',
    title: 'Anterior talocrural joint laxity: diagnostic accuracy of the anterior drawer test of the ankle',
    edition: '',
    publisher: 'J Orthop Sports Phys Ther 2013;43(12):911-919',
    year: 2013,
    sample: '66 personas con antecedente de esguince lateral de tobillo, y 20 controles con los que se fijó uno de los dos patrones',
    standard:
      'Laxitud medida con ecografía del intervalo entre astrágalo y peroné durante el cajón, con dos patrones: 2,3 mm o más, y 3,7 mm o más',
    note: 'Estudio prospectivo y ciego del cajón aislado. Sensibilidad 0,74 (IC 95% 0,58 a 0,86) y 0,83 (0,64 a 0,93), especificidad 0,38 (0,24 a 0,56) y 0,40 (0,27 a 0,56), LR+ 1,2 y 1,4, LR- 0,66 y 0,41, con el patrón de 2,3 o de 3,7 mm. Los autores concluyen que la prueba detecta poco la laxitud excesiva, aunque puede servir comparando los dos tobillos y junto a otras exploraciones como la palpación. Es uno de los seis estudios del metaanálisis de Netterström-Wedin 2022.',
  },
  'rosen-2015': {
    id: 'rosen-2015',
    pmid: '24995627',
    doi: '10.1111/sms.12288',
    authors: 'Rosen AB, Ko J, Brown CN',
    title: 'Diagnostic accuracy of instrumented and manual talar tilt tests in chronic ankle instability populations',
    edition: '',
    publisher: 'Scand J Med Sci Sports 2015;25(2):e214-e221',
    year: 2015,
    sample: '93 participantes y 88 analizados: 39 con inestabilidad crónica de tobillo, 17 copers de esguince de tobillo y 32 controles sanos',
    standard: 'Cumberland Ankle Instability Tool (cuestionario autoinformado), no la rotura ligamentosa',
    note: 'Inclinación medial del astrágalo manual: sensibilidad 0,49 (IC 95% 0,34 a 0,64) y especificidad 0,78 a 0,88; LR+ 2,23 a 4,14 y LR- 0,58 a 0,66. Con artrómetro: 0,36 (0,23 a 0,52) y 0,72 a 0,94. Los autores concluyen que, solas, las dos rinden poco para la inestabilidad crónica y que la laxitud solo serviría para confirmarla. La revisión de Netterström-Wedin 2022 lo excluye por su patrón de referencia.',
  },
  'kovaleski-2008': {
    id: 'kovaleski-2008',
    pmid: '18523573',
    doi: '10.4085/1062-6050-43.3.242',
    authors: 'Kovaleski JE, Norrell PM, Heitman RJ, Hollis JM, Pearsall AW',
    title: 'Knee and ankle position, anterior drawer laxity, and stiffness of the ankle complex',
    edition: '',
    publisher: 'J Athl Train 2008;43(3):242-248',
    year: 2008,
    sample: 'Los dos tobillos de 20 deportistas universitarios (10 mujeres y 10 hombres)',
    standard: 'Artrómetro de tobillo; no es un estudio de precisión diagnóstica',
    note: 'Cuatro posiciones (rodilla a 0° o 90° de flexión, tobillo a 0° o 10° de flexión plantar): la laxitud anterior fue máxima con la rodilla a 90° y el tobillo a 10°, frente a la rodilla a 0° con el tobillo a 0° o a 10° (P < 0,001), y la rigidez fue máxima con la rodilla a 0° y el tobillo a 0°. Los autores concluyen que esa posición puede aislar mejor las estructuras capsuloligamentosas del tobillo. No publica sensibilidad ni especificidad. Leído el resumen; el registro de PMC (PMC2386430) no trae el texto completo.',
  },
  // Las dos fuentes de la rotacion externa (Kleiger) que cita ankle.ts.
  // Verificadas por E-utilities (esummary y resumen de PMID 22381194 y 35508553,
  // 23 nov); las cifras de Baltes por prueba, en su texto completo (PMC9568458,
  // Tabla 3 y Tabla 5, Europe PMC fullTextXML).
  'decesar-2011': {
    id: 'decesar-2011',
    pmid: '22381194',
    doi: '10.3113/FAI.2011.1110',
    authors: 'de César PC, Avila EM, de Abreu MR',
    title:
      'Comparison of magnetic resonance imaging to physical examination for syndesmotic injury after lateral ankle sprain',
    edition: '',
    publisher: 'Foot & Ankle International 2011;32(12):1110-1114',
    year: 2011,
    sample:
      '56 pacientes con esguince lateral de tobillo; lesión sindesmal en la resonancia en el 17,8%',
    standard: 'Resonancia magnética del tobillo',
    note: 'Compara con la resonancia las dos pruebas sindesmales de rutina tras un esguince lateral: rotación externa, 20% de sensibilidad y 84,8% de especificidad; squeeze, 30% y 93,5%. El resumen no dice en qué posición del tobillo se hizo la rotación externa ni cuándo se exploró, y el texto completo no es de acceso abierto: no se ha leído.',
  },
  'baltes-2022': {
    id: 'baltes-2022',
    pmid: '35508553',
    doi: '10.1007/s00167-022-06989-2',
    authors:
      "Baltes TPA, Al Sayrafi O, Arnáiz J, Al-Naimi MR, Geertsema C, Geertsema L, Holtzhausen L, D'Hooghe P, Kerkhoffs GMMJ, Tol JL",
    title: 'Acute clinical evaluation for syndesmosis injury has high diagnostic value',
    edition: '',
    publisher: 'Knee Surgery, Sports Traumatology, Arthroscopy 2022;30(11):3871-3880',
    year: 2022,
    sample:
      '150 lesiones agudas de tobillo en deportistas mayores de 18 años, exploradas en los 7 días siguientes (mediana 2 días); 26 con lesión sindesmal',
    standard: 'Resonancia de 3 T en los 10 días siguientes a la lesión',
    note: 'Texto completo abierto (PMC9568458). Tabla 3: la rotación externa en dorsiflexión sin carga da 58% de sensibilidad (IC 95% 37 a 76) y 52% de especificidad (42 a 61), con LR+ 1,19 y LR- 0,82; con carga, 69% y 34%. De las seis pruebas sindesmales, la única que quedó asociada a la lesión en el análisis multivariante fue el squeeze (LR+ 2,20; LR- 0,68). Las cifras de cada prueba están en las tablas del texto completo, no en el resumen.',
  },
};

/** Type-safe set of valid reference ids. */
export type ReferenceId = keyof typeof REFERENCES;

/** Resolve a reference by id (throws in dev if missing, to catch typos). */
export function getReference(id: ReferenceId): Reference {
  const ref = REFERENCES[id];
  if (!ref && import.meta.env.DEV) {
    throw new Error(`Referencia desconocida: "${id}"`);
  }
  return ref;
}

/** Format a reference for display in a bibliography list (Vancouver-ish). */
export function formatReference(ref: Reference): string {
  // Strip a trailing period on authors so "... et al." + "." doesn't double up.
  const parts = [
    `${ref.authors.replace(/\.$/, '')}.`,
    `${ref.title}.`,
    ref.edition ? `${ref.edition}.` : '',
    `${ref.publisher}; ${ref.year}.`,
  ].filter(Boolean);
  return parts.join(' ');
}

/**
 * A journal article vs. a textbook. Books carry an `edition`; the diagnostic-
 * accuracy studies are authored with `edition: ''`. This single invariant lets
 * the Evidence page split "Estudios" (PubMed-linkable) from "Libros" cleanly
 * without a redundant flag on every entry.
 */
export function isJournalRef(ref: Reference): boolean {
  return ref.edition.trim() === '';
}

/**
 * Best external link for a reference:
 *   1. explicit PubMed record (pmid)         -> exact article
 *   2. DOI                                    -> publisher landing page
 *   3. journal without pmid/doi              -> PubMed search by exact title
 *   4. textbook                               -> no link (not on PubMed)
 * The title-search fallback means every study is always one click from PubMed,
 * even before its pmid is filled in.
 */
export function sourceUrl(ref: Reference): string | null {
  if (ref.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/`;
  if (ref.doi) return `https://doi.org/${ref.doi}`;
  if (isJournalRef(ref)) {
    return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(ref.title)}`;
  }
  return null;
}

/** Short label for the source link ("PubMed" for a precise record, else search). */
export function sourceLinkLabel(ref: Reference): string {
  if (ref.pmid) return 'Ver en PubMed';
  if (ref.doi) return 'Ver artículo (DOI)';
  if (isJournalRef(ref)) return 'Buscar en PubMed';
  return '';
}
