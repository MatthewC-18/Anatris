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
    authors: 'American Spinal Injury Association',
    title:
      'International Standards for Neurological Classification of Spinal Cord Injury (ISNCSCI)',
    edition: 'Revisión 2019',
    publisher: 'American Spinal Injury Association',
    year: 2019,
    note: 'Estándar de puntos clave dermatómicos y músculos clave miotómicos (C5-T1, L2-S1).',
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
    note: 'Metaanálisis de tests de hombro. Su propia conclusión: ningún test aislado permite un diagnóstico patognomónico; los clústeres rinden mejor.',
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
    note: 'Arco doloroso, drop-arm y combinaciones para pinzamiento subacromial.',
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
    note: 'Signos de retardo (lag signs) del manguito rotador.',
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
      'Movilidad PASIVA medida con goniometro por la tecnica de la AAOS en una muestra aleatoria de varones sanos de Goteborg (210 caderas, 180 rodillas, 192 tobillos). Su Tabla 1 imprime ademas la columna de la AAOS, lo que permite ver la diferencia entre el valor de referencia y el medido.',
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
      'Movilidad ACTIVA cervical y lumbar con goniometro digital de dos brazos por la tecnica de la AAOS, en 300 voluntarios sanos (198 mujeres, 102 varones; media 21,4 anos, rango 18-29), Estambul. Su Tabla 2 da media, DE, mediana y rango de los 12 movimientos, y la discusion imprime al lado el valor de la AAOS. Acceso abierto (CC BY-NC-ND). Tabla 2 leida aqui.',
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
      'Movilidad ACTIVA de hombro en una cohorte poblacional de Adelaida: 2404 adultos sin dolor ni rigidez de hombro (51,5% varones; media 45,8 anos, DE 17,3; rango 20-91). Flexion y abduccion con inclinometro Plurimeter V; la rotacion externa se estimo visualmente al multiplo de 5 grados mas cercano, asi que su precision es menor que la de los otros dos. Acceso abierto. Tabla leida aqui.',
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
      'Movilidad ACTIVA y PASIVA de codo con goniometro universal, bilateral, en 352 adultos sanos (166 varones, 186 mujeres) de 18 a 79 anos, Amsterdam. Publica media e intervalo de confianza al 95%, NO desviacion tipica, por eso aqui las cifras van sin DE. Las mujeres tienen mas recorrido que los varones en todos los movimientos, y lo pasivo supera a lo activo en 3-5 grados. Acceso abierto. Tabla 2 leida aqui.',
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
      'Revision sistematica y metaanalisis de 48 estudios y 2365 sujetos sanos, 11.892 mediciones del raquis toracico. Su conclusion es por que aqui NO se publica una cifra medida para la columna toracica: los resultados de los distintos aparatos son "muy dispares entre si" porque cada herramienta usa un protocolo distinto, y los autores proponen estandarizarlo. Acceso abierto. Leida aqui.',
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
    note:
      'Estudio transversal de precision diagnostica: 87 pacientes con esguince de tobillo de menos de dos semanas, en 9 clinicas de dos ciudades australianas, contra RESONANCIA leida por un radiologo cegado. Tabla 3 leida aqui: rotacion externa con dorsiflexion S 0,71 (0,55-0,83) / E 0,63 (0,49-0,75), LR+ 1,93, LR- 0,46; squeeze S 0,26 (0,15-0,42) / E 0,88 (0,76-0,94), LR+ 2,15 (0,86-5,39); dolor a la palpacion de los ligamentos sindesmales S 0,92 / E 0,29; lunge con compresion S 0,69 / E 0,41. La conclusion de los autores es que ninguna prueba aislada basta.',
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
    note: 'Clúster de exploración para radiculopatía cervical (Spurling, distracción, ULTT, rotación <60°).',
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
    note: 'Revisión sistemática de los tests provocativos cervicales.',
  },
  'tong-2002': {
    id: 'tong-2002',
    pmid: '11805661',
    authors: 'Tong HC, Haig AJ, Yamakawa K',
    title: 'The Spurling test and cervical radiculopathy',
    edition: '',
    publisher: 'Spine',
    year: 2002,
    note: 'Precisión diagnóstica del test de Spurling (muy específico, poco sensible).',
  },
  'cook-2010': {
    id: 'cook-2010',
    pmid: '22131790',
    authors: 'Cook C, Brown C, Isaacs R, Roman M, Davis S, Richardson W',
    title: 'Clustered clinical findings for the diagnosis of cervical spine myelopathy',
    edition: '',
    publisher: 'J Man Manip Ther',
    year: 2010,
    note: 'Agrupación de signos de mielopatía cervical (Hoffmann, supinador invertido, Babinski, marcha, edad).',
  },
  'uitvlugt-1988': {
    id: 'uitvlugt-1988',
    pmid: '3395385',
    authors: 'Uitvlugt G, Indenbaum S',
    title: 'Clinical assessment of atlantoaxial instability using the Sharp-Purser test',
    edition: '',
    publisher: 'Arthritis Rheum',
    year: 1988,
    note: 'Test de Sharp-Purser para inestabilidad atlantoaxial (serie en artritis reumatoide).',
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
    note: 'Revisión de las pruebas premanipulativas de insuficiencia vertebrobasilar (escaso valor diagnóstico; sens 0-57%, esp 67-100%).',
  },
  'hutting-2013b': {
    id: 'hutting-2013b',
    pmid: '23886844',
    authors: 'Hutting N, Scholten-Peeters GGM, Vijverman V, Keesenberg MDM, Verhagen AP',
    title: 'Diagnostic accuracy of upper cervical spine instability tests: a systematic review',
    edition: '',
    publisher: 'Phys Ther',
    year: 2013,
    note: 'Revisión de las pruebas de inestabilidad cervical alta (Sharp-Purser, estrés del transverso, alares).',
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
    note: 'Metaanálisis de signos de mielopatía cervical (Hoffmann, Babinski, clonus, supinador invertido).',
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
    note: 'Metaanálisis de la elevación de la pierna recta (SLR/Lasègue) y su versión cruzada.',
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
    note: 'Compara el test de Slump con el SLR en hernia discal lumbar.',
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
    note: 'Texto completo abierto (PMC2978791); las cifras están en las Tablas 3 y 4. Compresión MEDIA (L2-L4): tensión femoral 50% / 100% (LR+ infinito), tensión femoral cruzada 5% / 100%, Lasègue 16% / 31%, Lasègue cruzado 4% / 93%. Compresión BAJA (L5-S1): Lasègue 69% / 84% (LR+ 4,3), cruzado 7% / 96%. Por nivel: tensión femoral en L3, 70% / 88% (LR+ 5,7). Lo que ensena este estudio es que la cifra de una prueba cambia por completo segun QUE se busque: el mismo Lasègue vale 16% de sensibilidad para la raíz alta y 69% para la baja.',
  },
  'kasai-2006': {
    id: 'kasai-2006',
    pmid: '17033040',
    authors: 'Kasai Y, Morishita K, Kawakita E, Kondo T, Uchida A',
    title: 'A new evaluation method for lumbar spinal instability: passive lumbar extension test',
    edition: '',
    publisher: 'Phys Ther',
    year: 2006,
    note: 'Descripción y precisión del test de extensión lumbar pasiva para inestabilidad.',
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
    note: 'Cuidado al citarlo: este estudio NO publica sensibilidad ni especificidad del test de inestabilidad en prono, porque no mide si acierta un diagnóstico. Lo que publica es una regla de predicción de RESPUESTA AL TRATAMIENTO con razón de verosimilitud positiva 4,0 para el éxito y negativa 0,18 para el fracaso, construida con seis variables: edad, Lasègue, test de inestabilidad en prono, movimientos aberrantes, hipermovilidad lumbar y creencias de miedo-evitación.',
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
    note: 'Describe el signo de percusión con puño cerrado y el signo del supino para la fractura vertebral por compresión.',
  },
  'cote-1998': {
    id: 'cote-1998',
    pmid: '9563110',
    authors: 'Côté P, Kreitz BG, Cassidy JD, Dzus AK, Hurley J',
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
    note: 'Metaanálisis de Lachman, cajón anterior y pivot shift para rotura del LCA.',
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
    note: 'Metaanálisis de McMurray, dolor en interlínea y otros tests meniscales.',
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
    note: 'Descripción original del test de Thessaly (cifras altas no reproducidas después).',
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
    note: 'SENSIBILIDADES a los 30 segundos, y sólo sensibilidades: Tinel 0,70, flexión del codo aislada 0,32, compresión aislada 0,55, compresión + flexión 0,91. El resumen NO publica especificidad de ninguna de las cuatro; de los controles dice únicamente que "rara vez" dieron positivo. Cualquier especificidad numérica atribuida a este estudio (el 98% del Tinel, el 97% de la flexión-compresión) no está en la fuente.',
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
    authors: 'Zwerus EL, Somford MP, Nagels J, Nieuwenhuis JJ, van Noort A, Eygendaal D',
    title: 'Physical examination of the elbow, what is the evidence? A systematic literature review',
    edition: '',
    publisher: 'Br J Sports Med',
    year: 2018,
    note: 'Revisión sistemática de la evidencia de los tests de exploración del codo (escasa para varios).',
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
    note: 'FADIR: sensibilidad agrupada 0,94 (IC 95% 0,90-0,97). Los autores concluyen que sólo sirve como CRIBADO, no para confirmar.',
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
    sample: '81 pacientes (49% mujeres), dos exploradores experimentados',
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
