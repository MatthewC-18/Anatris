// src/lib/formatName.ts
//
// Turns a raw Z-Anatomy canonical name into a clean Spanish label.
//
// This is the FALLBACK path. Anything the app teaches as a clinical record — any
// muscle — should be named from that record instead (see ViewerHud), because a
// curated name always beats a substituted one. What lands here is everything
// else: bones, ligaments, capsules, bursae, discs, vessels.
//
// Two passes, in this order:
//
//   1. TERMS. Multi-word phrases first, then single words, so "hip joint"
//      resolves before "joint" does.
//   2. WORD ORDER. English stacks the adjective in front ("annular ligament");
//      Spanish puts the noun first ("ligamento anular"). Translating word by
//      word without this step produced labels like "Anular ligamento de radio",
//      which reads as neither language.
//
// Unmatched terms are left alone on purpose: an untranslated Latin term is
// normal in anatomy teaching, whereas a wrong translation is not.

import type { Side } from '../types/anatomy';

/**
 * Z-Anatomy suffixes we strip from display names:
 *   .r .l   side
 *   .t      text label
 *   .g      group
 *   .j      joint container
 *   .e .o   muscle end / origin
 *   .i .s   (insertion/start helper nodes seen in the model)
 *   .st     UI panel groups (Colors.st, etc.)
 */
const SUFFIX_RE = /\.(r|l|t|g|j|e|o|i|s|st)\b/gi;

/* ------------------------------------------------------------------ */
/*  The flattened side letter                                          */
/* ------------------------------------------------------------------ */

/**
 * Loading the GLB through three.js flattens ".l" / ".r" into a bare trailing
 * letter, and the canonical names in the index carry that same flattening. So
 * the suffix table above — which expects a DOT — never fired, and the words it
 * was meant to protect arrived glued: "ligamentl", "radiusl", "meniscusl",
 * "knee jointl". None of them matched a term, so a ligament rendered as
 * "Dorsal radio-ulnar ligamentl".
 *
 * Stripping any trailing l/r is not safe either: it turns "Femur" into "Femu"
 * and "Patella" into "Patell". The reliable test is the ATLAS ITSELF — a letter
 * is a side marker exactly when the opposite-sided sibling also exists as a
 * mesh. "Lateral_meniscusl" has "Lateral_meniscusr", so the l is a side; "Femur"
 * has no "Femul", so the r is part of the word.
 *
 * The name set is registered once when the index loads (see useAnatomyIndex), so
 * the three call sites keep their simple signatures. With nothing registered the
 * function is a no-op, which is exactly the old behaviour.
 */
let atlasNames: Set<string> | null = null;

export function registerAtlasNames(names: Iterable<string>): void {
  atlasNames = new Set(names);
}

/**
 * Second chance for the names where the sibling test cannot help, because
 * Z-Anatomy gave BOTH sides the same letter — "Calcaneusr" and "Talusr" exist
 * twice, and "Intermediate_cuneiform_boner" has no "…bonel". A trailing letter
 * is also a side marker when removing it leaves one of these words, which are
 * exactly the terms the atlas ends structure names with.
 */
const TAIL_WORDS = new Set([
  'bone', 'ligament', 'muscle', 'joint', 'disc', 'capsule', 'meniscus',
  'membrane', 'retinaculum', 'tendon', 'bursa', 'nerve', 'artery', 'vein',
  'sheath', 'tract', 'aponeurosis', 'cartilage', 'calcaneus', 'talus',
  'cuneiform', 'navicular', 'cuboid', 'labrum', 'septum', 'head', 'part',
]);

/** Drop the flattened side letter when the atlas says it is one. */
export function stripFlattenedSide(name: string): string {
  const last = name.slice(-1).toLowerCase();
  if (last !== 'l' && last !== 'r') return name;
  const stem = name.slice(0, -1);
  if (!stem) return name;

  if (atlasNames) {
    const sibling = stem + (last === 'l' ? 'r' : 'l');
    const siblingUpper = stem + (last === 'l' ? 'R' : 'L');
    if (atlasNames.has(sibling) || atlasNames.has(siblingUpper)) return stem;
  }

  const lastWord = stem.split(/[_\s]/).pop()?.toLowerCase() ?? '';
  return TAIL_WORDS.has(lastWord) ? stem : name;
}

/** Phrases, applied before single words so the longer match wins. */
const PHRASE_MAP: Array<[RegExp, string]> = [
  [/\barticular capsule\b/gi, 'cápsula articular'],
  [/\barticular disc\b/gi, 'disco articular'],
  [/\bintervertebral disc\b/gi, 'disco intervertebral'],
  [/\bcostal cartilage\b/gi, 'cartílago costal'],
  [/\btendon sheath\b/gi, 'vaina tendinosa'],
  [/\bhip bone\b/gi, 'hueso coxal'],
  // A joint named after a REGION reads as the region: "of knee joint" -> "de la
  // rodilla", not "de la articulación rodilla". A joint named after its two
  // bones keeps the noun: "of superior tibiofibular joint" -> "de la
  // articulación superior tibioperonea". Neither emits the article — the
  // agreement pass adds the right one, so "of shoulder joint" ends up "del
  // hombro" and not "de la hombro".
  [/\bof (?:the )?(knee|hip|shoulder|elbow|ankle|wrist) joint\b/gi, 'of $1'],
  // Up to three words, so "of superior tibiofibular joint" is covered too.
  [/\bof (?:the )?((?:[\w-]+ ){0,2}[\w-]+) joint\b/gi, 'de articulación $1'],
  // Numbered rays: the ordinal carries the meaning, "bone" is noise.
  [/\b(first|second|third|fourth|fifth) (metatarsal|metacarpal) bone\b/gi, '$1 $2'],
  [/\bsesamoid bones?\b/gi, 'huesos sesamoideos'],
  [/\bof the\b/gi, 'de'],
];

/** Single words. Anatomical nouns first, then descriptors. */
const TERM_MAP: Array<[RegExp, string]> = [
  // --- structures ---
  // Plural forms first: the singular pattern would otherwise swallow them, and
  // the agreement pass needs the number to inflect the adjectives with it.
  [/\bmuscles\b/gi, 'músculos'],
  [/\bligaments\b/gi, 'ligamentos'],
  [/\bbursae\b/gi, 'bolsas'],
  [/\bdiscs\b/gi, 'discos'],
  [/\bvertebrae\b/gi, 'vértebras'],
  [/\bnerves\b/gi, 'nervios'],
  [/\bveins\b/gi, 'venas'],
  [/\bmuscles?\b/gi, 'músculo'],
  [/\bbones?\b/gi, 'hueso'],
  [/\bnerves?\b/gi, 'nervio'],
  [/\bartery\b/gi, 'arteria'],
  [/\barteries\b/gi, 'arterias'],
  [/\bveins?\b/gi, 'vena'],
  [/\bligaments?\b/gi, 'ligamento'],
  [/\btendons?\b/gi, 'tendón'],
  [/\bbursae?\b/gi, 'bolsa'],
  [/\bcapsule\b/gi, 'cápsula'],
  [/\bcartilage\b/gi, 'cartílago'],
  [/\bmeniscus\b/gi, 'menisco'],
  [/\blabrum\b/gi, 'rodete'],
  [/\bdiscs?\b/gi, 'disco'],
  [/\bretinaculum\b/gi, 'retináculo'],
  [/\bsheath\b/gi, 'vaina'],
  [/\bmembrane\b/gi, 'membrana'],
  [/\bseptum\b/gi, 'tabique'],
  [/\bjoints?\b/gi, 'articulación'],
  [/\bvertebrae?\b/gi, 'vértebra'],

  // --- named bones ---
  [/\bhumerus\b/gi, 'húmero'],
  [/\bulna\b/gi, 'cúbito'],
  [/\bradius\b/gi, 'radio'],
  [/\bscapula\b/gi, 'escápula'],
  [/\bclavicle\b/gi, 'clavícula'],
  [/\bsternum\b/gi, 'esternón'],
  [/\bribs?\b/gi, 'costilla'],
  [/\bfemur\b/gi, 'fémur'],
  [/\bpatella\b/gi, 'rótula'],
  [/\bfibula\b/gi, 'peroné'],
  [/\bsacrum\b/gi, 'sacro'],
  [/\bcoccyx\b/gi, 'cóccix'],
  [/\btalus\b/gi, 'astrágalo'],
  [/\bcalcaneus\b/gi, 'calcáneo'],
  [/\bnavicular\b/gi, 'escafoides'],
  [/\bcuboid\b/gi, 'cuboides'],
  [/\bcuneiform\b/gi, 'cuneiforme'],
  [/\bmetatarsal\b/gi, 'metatarsiano'],
  [/\bmetacarpal\b/gi, 'metacarpiano'],
  [/\bphalanx\b/gi, 'falange'],
  [/\bskull\b/gi, 'cráneo'],
  [/\bmandible\b/gi, 'mandíbula'],

  // --- regions ---
  [/\bshoulder\b/gi, 'hombro'],
  [/\belbow\b/gi, 'codo'],
  [/\bwrist\b/gi, 'muñeca'],
  [/\bknee\b/gi, 'rodilla'],
  [/\bankle\b/gi, 'tobillo'],
  [/\bhip\b/gi, 'cadera'],
  [/\bhands?\b/gi, 'mano'],
  [/\bfoot\b/gi, 'pie'],
  [/\bthigh\b/gi, 'muslo'],
  [/\bforearm\b/gi, 'antebrazo'],
  [/\barm\b/gi, 'brazo'],
  [/\bleg\b/gi, 'pierna'],
  [/\bneck\b/gi, 'cuello'],
  [/\bhead\b/gi, 'cabeza'],
  [/\bbody\b/gi, 'cuerpo'],
  [/\bprocess\b/gi, 'proceso'],
  [/\bfingers?\b/gi, 'dedo'],
  [/\btoes?\b/gi, 'dedo'],
  [/\bfirst\b/gi, 'primer'],
  [/\bsecond\b/gi, 'segundo'],
  [/\bthird\b/gi, 'tercer'],
  [/\bfourth\b/gi, 'cuarto'],
  [/\bfifth\b/gi, 'quinto'],
  [/\bdistal\b/gi, 'distal'],
  [/\bproximal\b/gi, 'proximal'],
  [/\bmiddle\b/gi, 'medio'],
  [/\binterpubic\b/gi, 'interpúbico'],
  [/\bparts\b/gi, 'porciones'],
  [/\bpart\b/gi, 'porción'],

  // --- descriptors ---
  [/\bannular\b/gi, 'anular'],
  [/\bcollateral\b/gi, 'colateral'],
  [/\bcruciate\b/gi, 'cruzado'],
  [/\bpatellar\b/gi, 'rotuliano'],
  [/\bpopliteal\b/gi, 'poplíteo'],
  [/\btibiofibular\b/gi, 'tibioperoneo'],
  [/\bfibular\b/gi, 'peroneo'],
  [/\bulnar\b/gi, 'cubital'],
  [/\bradio-ulnar\b/gi, 'radiocubital'],
  [/\bradial\b/gi, 'radial'],
  [/\binterosseous\b/gi, 'interóseo'],
  [/\barcuate\b/gi, 'arqueado'],
  [/\btract\b/gi, 'cintilla'],
  [/\bcoronoid\b/gi, 'coronoides'],
  [/\bolecranon\b/gi, 'olécranon'],
  [/\bacromion\b/gi, 'acromion'],
  [/\btransverse\b/gi, 'transverso'],
  [/\boblique\b/gi, 'oblicuo'],
  [/\bdeep\b/gi, 'profundo'],
  [/\bsuperficial\b/gi, 'superficial'],
  [/\blong\b/gi, 'largo'],
  [/\bshort\b/gi, 'corto'],
  [/\bgreater\b/gi, 'mayor'],
  [/\blesser\b/gi, 'menor'],
  // Adjectives enter in masculine singular; the agreement pass inflects them.
  [/\bsubcutaneous\b/gi, 'subcutáneo'],
  [/\bsubtendinous\b/gi, 'subtendinoso'],
  [/\bleft\b/gi, 'izquierdo'],
  [/\bright\b/gi, 'derecho'],
  [/\bof\b/gi, 'de'],
];

/* ------------------------------------------------------------------ */
/*  Agreement                                                          */
/* ------------------------------------------------------------------ */

/**
 * Gender and number of every noun the translation can produce.
 *
 * Spanish adjectives agree with their noun, and a word-for-word substitution
 * cannot know that: it produced "porción profundo" and "bolsa subtendinoso".
 * The table below is what makes agreement derivable — the head noun sets the
 * gender, and every adjective after it is inflected to match. It also drives the
 * article contraction ("de fémur" -> "del fémur", "de rodilla" -> "de la
 * rodilla"), which is the other thing that gave the labels away as machine
 * output.
 */
type Gender = 'm' | 'f';
const NOUN_GENDER: Record<string, Gender> = {
  // structures
  músculo: 'm', hueso: 'm', nervio: 'm', arteria: 'f', vena: 'f',
  ligamento: 'm', tendón: 'm', bolsa: 'f', cápsula: 'f', cartílago: 'm',
  menisco: 'm', rodete: 'm', disco: 'm', retináculo: 'm', vaina: 'f',
  membrana: 'f', tabique: 'm', articulación: 'f', vértebra: 'f',
  cintilla: 'f', porción: 'f', aponeurosis: 'f',
  // bones
  húmero: 'm', cúbito: 'm', radio: 'm', escápula: 'f', clavícula: 'f',
  esternón: 'm', costilla: 'f', fémur: 'm', rótula: 'f', peroné: 'm',
  tibia: 'f', sacro: 'm', cóccix: 'm', astrágalo: 'm', calcáneo: 'm',
  escafoides: 'm', cuboides: 'm', cuneiforme: 'm',
  falange: 'f', cráneo: 'm', mandíbula: 'f',
  // regions and parts
  cabeza: 'f', cuerpo: 'm', cuello: 'm', proceso: 'm', dedo: 'm', hombro: 'm',
  codo: 'm', muñeca: 'f', rodilla: 'f', tobillo: 'm', cadera: 'f',
  mano: 'f', pie: 'm', muslo: 'm', antebrazo: 'm', brazo: 'm', pierna: 'f',
};

/**
 * Adjectives the formatter is allowed to inflect, masculine singular -> feminine
 * singular. `null` means the adjective does not change with gender (it may still
 * take a plural). Anything NOT in this table is left exactly as it is, which is
 * how Latin terms ("meniscotibial", "digitorum superficialis") survive untouched
 * instead of being mangled by a guess.
 */
const ADJECTIVES: Record<string, string | null> = {
  profundo: 'profunda',
  cruzado: 'cruzada',
  transverso: 'transversa',
  oblicuo: 'oblicua',
  rotuliano: 'rotuliana',
  poplíteo: 'poplítea',
  tibioperoneo: 'tibioperonea',
  peroneo: 'peronea',
  interóseo: 'interósea',
  arqueado: 'arqueada',
  largo: 'larga',
  corto: 'corta',
  subcutáneo: 'subcutánea',
  subtendinoso: 'subtendinosa',
  externo: 'externa',
  interno: 'interna',
  medio: 'media',
  distal: null,
  proximal: null,
  dorsal: null,
  plantar: null,
  palmar: null,
  // Ray names are adjectives here ("ligamentos metatarsianos"); the standalone
  // bone is handled by its own phrase rule ("quinto metatarsiano").
  metatarsiano: 'metatarsiana',
  metacarpiano: 'metacarpiana',
  anular: null,
  colateral: null,
  articular: null,
  anterior: null,
  posterior: null,
  superior: null,
  inferior: null,
  lateral: null,
  medial: null,
  radial: null,
  cubital: null,
  tibial: null,
  superficial: null,
  mayor: null,
  menor: null,
};

/** Spanish plural: vowel takes -s, consonant takes -es. */
function pluralize(word: string): string {
  return /[aeiouáéíóú]$/.test(word) ? `${word}s` : `${word}es`;
}

/** Singular stem of a noun, when the token is one of ours in the plural. */
function nounInfo(token: string): { gender: Gender; plural: boolean } | null {
  const direct = NOUN_GENDER[token];
  if (direct) return { gender: direct, plural: false };
  for (const [noun, gender] of Object.entries(NOUN_GENDER)) {
    if (pluralize(noun) === token) return { gender, plural: true };
  }
  return null;
}

/**
 * Nouns that must come FIRST in Spanish. When a translated label reads
 * "<adjective> <noun>", the two are swapped: "anular ligamento" ->
 * "ligamento anular".
 *
 * ONLY structure nouns, never the region and part words. Those never carry a
 * stacked adjective in the source; they arrive as the tail of a "de" phrase, and
 * making them reorder-eligible scrambled it — "membrana interósea de antebrazo"
 * came out as "antebrazo interóseo membrana de", and "de la rodilla" as "de
 * cadera la".
 */
const REORDERABLE = [
  'músculo', 'hueso', 'nervio', 'arteria', 'vena', 'ligamento', 'tendón',
  'bolsa', 'cápsula', 'cartílago', 'menisco', 'rodete', 'disco', 'retináculo',
  'vaina', 'membrana', 'tabique', 'vértebra', 'cintilla', 'porción',
  'aponeurosis', 'falange',
];
const HEAD_NOUNS = REORDERABLE.flatMap((n) => [n, pluralize(n)]).join('|');
// Up to three stacked adjectives: "anterior cruzado ligamento" is as deep as the
// atlas goes ("Anterior cruciate ligament", "Inferior fibular retinaculum").
// Fires at the start of the label AND after a "de", which is where the second
// noun phrase lands ("porción profunda de tibial colateral ligamento").
// The adjective run must not swallow a "de": without the lookahead, "profundo
// porción de ligamento" matched with "profundo porción de" as the adjectives and
// came out as "ligamento profundo porción de".
const REORDER_RE = new RegExp(
  `(^|\\bde )((?:(?!de\\s)[\\wáéíóúñ-]+\\s+){1,3})(${HEAD_NOUNS})\\b`,
  'gi',
);

/** Tokens that must keep their capitals: vertebral levels and joint codes. */
const CODE_RE = /^[CTLS]\d{1,2}(-[CTLS]?\d{1,2})?$|^\(.*\)$/;

const SIDE_LABEL: Record<Side, string> = {
  right: 'derecho',
  left: 'izquierdo',
  center: '',
};

/** Run every pass over a cleaned-up term. */
function translate(base: string): string {
  let out = base;
  for (const [re, es] of PHRASE_MAP) out = out.replace(re, es);
  for (const [re, es] of TERM_MAP) out = out.replace(re, es);
  // Head noun to the front: "anterior cruzado ligamento" -> "ligamento anterior
  // cruzado".
  out = out.replace(
    REORDER_RE,
    (_m, lead: string, adjectives: string, noun: string) =>
      `${lead}${noun} ${adjectives.trim()}`,
  );
  // Sentence case. The reorder drags capitalised words into the middle
  // ("Ligamento Anterior de..."), so every token is lowered except the codes.
  out = out
    .split(' ')
    .map((word) => (CODE_RE.test(word) ? word : word.toLowerCase()))
    .join(' ');
  out = agreeAndArticle(out);
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Make the adjectives agree with their head noun, and give "de" its article.
 *
 * Walks the phrase left to right. A known noun sets the gender and number in
 * force; every adjective the formatter recognises after it is inflected to
 * match, until a "de" starts a new noun phrase. Words outside the tables — Latin
 * terms, vertebral codes — pass through untouched, because a wrong inflection is
 * worse than none.
 *
 *   "porción profundo de ligamento tibial colateral"
 *      -> "porción profunda del ligamento tibial colateral"
 *   "bolsa subtendinoso"           -> "bolsa subtendinosa"
 *   "ligamentos cuneonavicular dorsal" -> "ligamentos cuneonavicular dorsales"
 */
function agreeAndArticle(phrase: string): string {
  const words = phrase.split(' ').filter(Boolean);
  const out: string[] = [];
  let gender: Gender | null = null;
  let plural = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // "de" + noun -> "del" / "de la". Skip when an article is already there
    // (the joint phrase rule emits "de la rodilla").
    if (word === 'de') {
      // Look past any ordinals or adjectives sitting between "de" and its noun,
      // so "de cuarto dedo" still contracts to "del cuarto dedo".
      let info: ReturnType<typeof nounInfo> = null;
      for (let j = i + 1; j <= i + 3 && j < words.length; j++) {
        info = nounInfo(words[j]);
        if (info) break;
      }
      if (!info) {
        out.push(word);
      } else if (info.gender === 'm') {
        out.push(info.plural ? 'de los' : 'del');
      } else {
        out.push(info.plural ? 'de las' : 'de la');
      }
      gender = null;
      continue;
    }

    const info = nounInfo(word);
    if (info) {
      gender = info.gender;
      plural = info.plural;
      out.push(word);
      continue;
    }

    if (gender && word in ADJECTIVES) {
      const feminine = ADJECTIVES[word];
      let form = gender === 'f' && feminine ? feminine : word;
      if (plural) form = pluralize(form);
      out.push(form);
      continue;
    }

    out.push(word);
  }

  return out.join(' ');
}

/** Strip Blender's duplicate/tendon tail ("Femur 1", "Vertebra T5 1"). */
function dropTrailingIndex(name: string): string {
  return name.replace(/\s+\d+$/, '');
}

/**
 * Produce a display label from a canonical name + known side.
 * Example: ("Annular ligament of radius.l", "left")
 *              -> "Ligamento anular de radio, izquierdo"
 */
export function formatCanonicalName(canonical: string, side: Side): string {
  // Blender's duplicate tail comes off FIRST: in "Calcaneusr_1" it hides the
  // side letter from the strip below, and the name kept rendering as
  // "Calcaneusr".
  let base = stripFlattenedSide(canonical.replace(SUFFIX_RE, '').replace(/_\d+$/, ''));
  base = dropTrailingIndex(base.replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim());
  base = translate(base);
  base = base.charAt(0).toUpperCase() + base.slice(1);

  const sideLabel = SIDE_LABEL[side];
  return sideLabel ? `${base}, ${sideLabel}` : base;
}

/**
 * A shorter version without laterality, for compact lists (e.g. command
 * palette).
 */
export function formatShortName(canonical: string): string {
  // Blender's duplicate tail comes off FIRST: in "Calcaneusr_1" it hides the
  // side letter from the strip below, and the name kept rendering as
  // "Calcaneusr".
  let base = stripFlattenedSide(canonical.replace(SUFFIX_RE, '').replace(/_\d+$/, ''));
  base = dropTrailingIndex(base.replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim());
  base = translate(base);
  return base.charAt(0).toUpperCase() + base.slice(1);
}
