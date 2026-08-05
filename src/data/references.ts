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
  'hegedus-2012': {
    id: 'hegedus-2012',
    authors: 'Hegedus EJ, Goode AP, Cook CE, et al.',
    title:
      'Which physical examination tests provide clinically important changes in shoulder pain? A systematic review with meta-analysis',
    edition: '',
    publisher: 'Br J Sports Med',
    year: 2012,
    note: 'Revisión sistemática con metaanálisis de tests de hombro.',
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
    note: 'Aprensión, recolocación y sorpresa para inestabilidad anterior.',
  },
  'gerber-1991': {
    id: 'gerber-1991',
    pmid: '1670434',
    authors: 'Gerber C, Krushell RJ',
    title: 'Isolated rupture of the tendon of the subscapularis muscle',
    edition: '',
    publisher: 'J Bone Joint Surg Br',
    year: 1991,
    note: 'Descripción original del test de lift-off (subescapular).',
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
    note: 'Tests para lesión acromioclavicular (aducción cruzada, etc.).',
  },

  // ---- CERVICAL: radiculopatía, mielopatía, inestabilidad y cribado vascular.
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
    note: 'Precisión de la exploración (incluye SLR y tensión femoral / reverse SLR) por niveles lumbares.',
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
    note: 'Test de inestabilidad en prono y regla de predicción para ejercicio de estabilización.',
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
    note: 'Clúster de provocación sacroilíaca (distracción, empuje del muslo, compresión, thrust sacro, Gaenslen).',
  },

  // ---- TORÁCICA: fractura vertebral, escoliosis, espondiloartritis axial y
  // síndrome del desfiladero torácico. Sin pmid: el enlace cae a la búsqueda
  // por título en PubMed (siempre resuelve). No inventar identificadores.
  'langdon-2010': {
    id: 'langdon-2010',
    authors: 'Langdon J, Way A, Heaton S, Bernard J, Molloy S',
    title: 'Vertebral compression fractures — new clinical signs to aid diagnosis',
    edition: '',
    publisher: 'Ann R Coll Surg Engl',
    year: 2010,
    note: 'Describe el signo de percusión con puño cerrado y el signo del supino para la fractura vertebral por compresión.',
  },
  'cote-1998': {
    id: 'cote-1998',
    authors: 'Côté P, Kreitz BG, Cassidy JD, Dzus AK, Hurley J',
    title:
      "A study of the diagnostic accuracy and reliability of the Scoliometer and Adam's forward bend test",
    edition: '',
    publisher: 'Spine',
    year: 1998,
    note: 'Precisión y fiabilidad de la prueba de Adams y del escoliómetro en el cribado de escoliosis.',
  },
  'vanderlinden-1984': {
    id: 'vanderlinden-1984',
    authors: 'van der Linden S, Valkenburg HA, Cats A',
    title:
      'Evaluation of diagnostic criteria for ankylosing spondylitis: a proposal for modification of the New York criteria',
    edition: '',
    publisher: 'Arthritis Rheum',
    year: 1984,
    note: 'Criterios de Nueva York modificados; la expansión torácica reducida es uno de los criterios clínicos.',
  },
  'gillard-2001': {
    id: 'gillard-2001',
    authors: 'Gillard J, Pérez-Cousin M, Hachulla E, et al.',
    title:
      'Diagnosing thoracic outlet syndrome: contribution of provocative tests, ultrasonography, electrophysiology, and helical computed tomography',
    edition: '',
    publisher: 'Joint Bone Spine',
    year: 2001,
    note: 'Compara Adson, Wright (hiperabducción) y Roos/EAST en el síndrome del desfiladero torácico.',
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
    note: 'Revisión de la validez de los tests de rodilla (cajón posterior, estrés colateral, etc.).',
  },

  // ---- CODO: epicondilalgias, ligamento colateral cubital y túnel cubital.
  'odriscoll-2005': {
    id: 'odriscoll-2005',
    authors: "O'Driscoll SW, Lawton RL, Smith AM",
    title: 'The "moving valgus stress test" for medial collateral ligament tears of the elbow',
    edition: '',
    publisher: 'Am J Sports Med',
    year: 2005,
    note: 'Descripción y precisión del moving valgus stress test para el LCU del codo.',
  },
  'novak-1994': {
    id: 'novak-1994',
    authors: 'Novak CB, Lee GW, Mackinnon SE, Lay L',
    title: 'Provocative testing for cubital tunnel syndrome',
    edition: '',
    publisher: 'J Hand Surg Am',
    year: 1994,
    note: 'Precisión del Tinel del cubital y del test de flexión-compresión del codo.',
  },
  'saroja-2014': {
    id: 'saroja-2014',
    authors: 'Saroja G, Antony Leo Aseer P, Sai Kumar N',
    title: 'Diagnostic accuracy of provocative tests in lateral epicondylitis',
    edition: '',
    publisher: 'Int J Physiother Res',
    year: 2014,
    note: 'Cifras de Cozen y Mill para la epicondilalgia lateral.',
  },
  'zwerus-2018': {
    id: 'zwerus-2018',
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
