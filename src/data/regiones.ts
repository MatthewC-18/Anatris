// src/data/regiones.ts
//
// Region -> mesh-name resolution. The model holds the WHOLE body in one GLB,
// so to study a single region (e.g. the shoulder) we need to know which meshes
// belong to it and hide the rest. Listing all ~200 raw mesh names per region
// by hand is brittle (Z-Anatomy names have many variants: "Humerus",
// "Head_of_humerust_1_instance_0", "Body_of_humerust_1_instance_1", ...), so
// instead each region is defined by ANATOMICAL KEYWORDS. At runtime we scan the
// actual mesh names present in the scene and keep the ones that match.
//
// Matching rules:
// - `include`: a mesh belongs to the region if its (lowercased) name contains
//   ANY of these keyword fragments.
// - `exclude`: ...UNLESS it also contains one of these (catches neighbors that
//   share a word - e.g. forearm muscles named "...humeral head of flexor
//   carpi..." would be pulled in by "humer" but are NOT part of the shoulder).
//
// Keywords are matched as plain substrings against the lowercased mesh name,
// AFTER stripping the trailing Z-Anatomy bookkeeping suffixes does NOT happen
// here on purpose - we match the raw runtime name so "humerust_1_instance_0"
// still matches the "humer" fragment. Keep fragments lowercase.

export interface RegionDef {
  id: string;
  /** Human label (Spanish, shown to the user). */
  name: string;
  /** A mesh is in-region if its name contains ANY of these (lowercase). */
  include: string[];
  /** ...unless it ALSO contains one of these (lowercase). Optional. */
  exclude?: string[];
  /**
   * HERO FRAMING (optional). Keywords identifying the COMPACT JOINT CORE the
   * camera should frame on when this region loads. The whole region stays
   * visible (isolate model), but for long-limb regions the bones are single
   * meshes spanning the entire limb (a "knee" drags the whole femur+tibia =
   * hip-to-ankle), so fitting the full bounds shrinks the actual joint to a
   * speck. Framing on this joint-core subset (patella/menisci/ligaments, the
   * elbow articulations, …) gives a premium, composed close-up of the joint
   * with the limb as context around it. Omit for regions whose full extent
   * already frames well (shoulder girdle, spine sub-regions).
   */
  focus?: string[];
  /**
   * REGION FALLOFF (optional). The vertical slab of body this region occupies,
   * in world metres (the model stands 0 -> 1.78 with Y up), plus how far the
   * dissolve extends past each edge.
   *
   * The atlas models a long bone or a biarticular muscle as ONE mesh, so
   * keyword filtering cannot make "cadera" stop at the hip: the femur mesh runs
   * to the knee and the rectus femoris to the patella, and the region rendered
   * as a whole thigh with a stump at the bottom. AnatomyModel fades every
   * fragment out across `soft` metres beyond [min, max], so the limb dissolves
   * into the background instead of ending in a cut. Purely cosmetic — nothing
   * is removed from the region, so selection, the muscle list and the ROM
   * panel are unaffected.
   *
   * Bounds are authored against the real landmark heights measured with
   * `scripts/measure-landmarks.mts` (acetabulum 0.87, patella 0.44, ankle 0.09,
   * glenohumeral 1.36, elbow 1.10, wrist 0.86, C1 1.54, C7 1.45, T12 1.14,
   * L5 0.98, sacrum 0.87). Omit for regions that already end where the body
   * does.
   */
  fade?: { min?: number; max?: number; soft: number };
}

/* ---------------------------------------------------------------------------
 * SHOULDER
 * Bones: scapula, humerus (proximal - the shaft/elbow landmarks come along,
 *   which is fine as visual context), clavicle.
 * Joints + ligaments: glenohumeral, acromioclavicular, sternoclavicular,
 *   coracohumeral, scapular ligaments, etc.
 * Muscles: the 17 functional shoulder muscles (rotator cuff + superficial
 *   movers + scapulothoracic + biarticular arm muscles that cross the joint).
 * Vessels + nerves of the region.
 * EXCLUDES forearm/hand structures that merely share a word ("humeral head of
 *   flexor carpi ulnaris", "...flexor digitorum...", "...extensor carpi...").
 * ------------------------------------------------------------------------- */
const shoulder: RegionDef = {
  id: 'shoulder',
  name: 'Hombro',
  // Glenohumeral joint sits at 1.36; the humerus mesh runs down to the elbow at
  // 1.09 and the biceps/triceps with it. Fade out below the deltoid insertion so
  // the plate reads "shoulder girdle", not "whole arm". No top bound: the
  // descending trapezius legitimately reaches the occiput.
  fade: { min: 1.18, soft: 0.11 },
  include: [
    // --- bones / bony landmarks ---
    'scapula',
    'scapular',
    'humer', // humerus + all "..._of_humerus..." landmarks
    'clavic', // clavicle + clavicular landmarks
    'glenoid',
    'coracoid',
    'acromi', // acromion / acromioclavicular

    // --- joints ---
    'glenohumeral_joint',
    'acromioclavicular_joint',
    'sternoclavicular_joint',
    'scapulohumeral',

    // --- ligaments / capsules ---
    'coracohumeral',
    'glenohumeral_ligament',
    'transverse_humeral_ligament',
    'scapular_ligament',
    'acromioclavicular_ligament',
    'sternoclavicular_ligament',
    'coracoclavicular',
    'costoclavicular',
    'interclavicular',
    'coracoacromial',

    // --- muscles (the 17 functional shoulder muscles) ---
    'supraspinatus',
    'infraspinatus',
    'teres_minor',
    'teres_major',
    'subscapularis',
    'deltoid',
    'pectoralis_major',
    'pectoralis_minor',
    'latissimus_dorsi',
    'trapezius',
    'rhomboid',
    'serratus_anterior',
    'levator_scapulae',
    'subclavius',
    'omohyoid',
    'biceps_brachii',
    'triceps_brachii',
    'coracobrachialis',

    // --- vessels of the region ---
    'circumflex_humeral',
    'circumflex_scapular',
    'suprascapular_artery',
    'suprascapular_vein',
    'subscapular_artery',
    'subscapular_vein',

    // --- nerves / plexus of the region ---
    'suprascapular_nerve',
    'subscapular_nerve',
    'dorsal_scapular_nerve',
    'brachial_plexus',
    'axillary_nerve',
  ],
  exclude: [
    // Forearm / hand muscles that share "humeral head" wording but are NOT
    // shoulder structures.
    'flexor_carpi',
    'extensor_carpi',
    'flexor_digitorum',
    'extensor_digitorum',
    'pronator',
    'palmaris',
    // Elbow-only humeral landmarks we don't want as shoulder content. (We keep
    // the humeral shaft for context but drop the distal elbow articulations.)
    'humero-ulnar_joint',
    'humeroradial_joint',
    'trochlea_of_humer',
    'capitulum_of_humer',
  ],
};

/* ---------------------------------------------------------------------------
 * ELBOW
 * Bones: distal humerus, proximal radius, proximal ulna (the full shafts come
 *   along as visual context - fine).
 * Joints: humero-ulnar, humeroradial, proximal & distal radio-ulnar.
 * Ligaments / capsule: ulnar (medial) collateral, radial (lateral) collateral,
 *   annular ligament of radius, interosseous membrane of the forearm.
 * Muscles: the functional elbow + proximal radio-ulnar movers -
 *   FLEXORS: biceps brachii (both heads), brachialis, brachioradialis.
 *   EXTENSORS: triceps brachii (3 heads), anconeus.
 *   PRONATORS: pronator teres (both heads), pronator quadratus.
 *   SUPINATOR: supinator.
 *   Epicondylar muscles that cross the elbow (wrist movers with a humeral
 *     origin): extensor carpi radialis longus/brevis, extensor carpi ulnaris,
 *     flexor carpi radialis, flexor carpi ulnaris, the humero-ulnar head of
 *     flexor digitorum superficialis.
 * Neurovascular: ulnar nerve (cubital tunnel), median + anterior interosseous,
 *   radial + posterior interosseous, musculocutaneous; the ulnar / radial /
 *   interosseous recurrent and collateral arteries.
 *
 * NOTE on shared keywords (these are why `exclude` is long):
 *   - "biceps"  also matches biceps FEMORIS (thigh) -> exclude *_femoris.
 *   - "triceps" also matches triceps SURAE (calf)   -> exclude *_surae.
 *   - "interosseous" matches MANY foot/hand/pelvis ligaments and the leg
 *     interosseous membrane -> we DON'T use the bare "interosseous" fragment;
 *     instead we whitelist only the forearm interosseous structures.
 *   - "trochlea"/"epicondyle"/"head_of" match femur, talus, phalanges, etc.
 *     -> we don't use those bare fragments; bone landmarks ride in via the
 *     bone-name fragments ("humer"/"radius"/"ulna") and we exclude the foreign
 *     ones explicitly.
 *   - "ulnar_collateral_ligament" also names a WRIST ligament -> exclude that.
 *   - "coracobrachialis" / "coracoid" are SHOULDER -> excluded (do not cross
 *     the elbow).
 * ------------------------------------------------------------------------- */
const elbow: RegionDef = {
  id: 'elbow',
  name: 'Codo',
  // No hero `focus`: the arm (humerus + radius/ulna) is short enough that the
  // full region frames as a balanced, premium view once the distal wrist/finger
  // tendons are hidden. Only the much longer leg (knee) needs joint-focus.
  // Humero-ulnar joint at 1.10, wrist at 0.86, humeral head at 1.40. Fade above
  // mid-humerus (the long heads' scapular origins dissolve) and just above the
  // wrist, keeping the pronator quadratus (0.86-0.90) inside the solid band.
  fade: { min: 0.89, max: 1.31, soft: 0.08 },
  include: [
    // --- bones / bony landmarks (full shafts as context) ---
    'humer', // humerus + distal landmarks (trochlea/capitulum/epicondyles)
    'radius', // radius + head/neck/tuberosity landmarks
    'radiust', // "Radiust_1_instance_*" runtime variant
    'ulna', // ulna + olecranon/coronoid/trochlear-notch landmarks
    'ulnat', // "Ulnat_1_instance_*" runtime variant
    'olecranon',

    // --- joints ---
    'humero-ulnar_joint',
    'humeroradial_joint',
    'proximal_radio-ulnar_joint',
    'distal_radio-ulnar_joint',

    // --- ligaments / capsule / membrane ---
    'ulnar_collateral_ligament',
    'radial_collateral_ligament',
    'annular_ligament_of_radius',
    'interosseous_membrane_of_forearm',

    // --- muscles: flexors of the elbow ---
    'biceps_brachii', // long + short head (cross shoulder too, but motor here)
    'brachialis', // pure elbow flexor
    'brachioradialis',

    // --- muscles: extensors of the elbow ---
    'triceps_brachii',
    'anconeus',

    // --- muscles: pronators / supinator (proximal radio-ulnar) ---
    'pronator_teres',
    'pronator_quadratus',
    'supinator',

    // --- muscles: epicondylar wrist movers that CROSS the elbow ---
    'extensor_carpi_radialis_longus',
    'extensor_carpi_radialis_brevis',
    'extensor_carpi_ulnaris',
    'flexor_carpi_radialis',
    'flexor_carpi_ulnaris',
    'flexor_digitorum_superficialis',

    // --- nerves of the region ---
    'ulnar_nerve',
    'median_nerve',
    'anterior_interosseous_nerve_of_forearm',
    'posterior_interosseous_nerve_of_forearm',
    'musculocutaneous_nerve',
    'radial_nerve',

    // --- vessels of the region ---
    'ulnar_artery',
    'radial_artery',
    'brachial_artery',
    'ulnar_recurrent_artery',
    'radial_recurrent_artery',
    'recurrent_interosseous_artery',
    'common_interosseous_artery',
    'posterior_interosseous_artery',
    'anterior_interosseous_artery',
    'ulnar_collateral_artery', // superior + inferior
  ],
  exclude: [
    // --- foreign limbs sharing a muscle keyword ---
    'femoris', // biceps femoris (thigh)
    'femur', // *_epicondyle_of_femur landmarks
    'surae', // triceps surae (calf)
    'tibia',
    'fibula',
    'talus',
    'talo', // talocalcaneal etc.
    'calcaneal',
    '_leg', // interosseous_membrane_of_leg
    'of_leg',

    // --- foot / hand / pelvis "interosseous" ligaments dragged by "ulna"?
    //     (none share "ulna", but these share other bone fragments; harmless
    //     to list defensively) ---
    'metatarsal',
    'cuneo',
    'cuboid',
    'intercuneiform',
    'sacro-iliac',
    'lunotriquetral',
    'scapholunate',
    'capitohamate',
    'trapezi', // trapeziotrapezoidal / trapezoideocapitate interosseous lig.

    // --- wrist structures sharing "ulnar_collateral_ligament" / "ulna" ---
    'ulnar_collateral_ligament_of_wrist',
    'radial_collateral_ligament_of_wrist', // wrist-side; would float distal to the elbow
    'ulnar_styloid',
    'ulnar_notch',
    'articular_disc_of_distal_radio-ulnar', // TFCC disc - wrist-side, optional
    'ulnar_head_of_extensor_carpi_ulnaris', // distal forearm origin, not elbow
    'ulnar_head_of_flexor_carpi_ulnaris', // distal forearm origin, not elbow

    // --- shoulder structures that share an arm-bone fragment ---
    'coracobrachialis',
    'coracoid',
    'anatomical_neck_of_humer',
    'surgical_neck_of_humer',
    'head_of_humer', // proximal humeral head landmark = shoulder
    'lesser_tubercle',
    'greater_tubercle',
    'intertubercular',
    // Shoulder joint capsule / ligaments dragged in by "humer" or
    // "glenohumeral" - they belong to the shoulder module, not the elbow.
    'glenohumeral', // capsule + sup/mid/inf glenohumeral ligaments + joint group
    'coracohumeral_ligament',
    'transverse_humeral_ligament',
    'scapulohumeral', // "Scapulohumeral_musclesg_1" group node
    // Shoulder vessels dragged in by "humer".
    'circumflex_humeral', // anterior/posterior circumflex humeral artery + vein

    // --- distal forearm / wrist bony landmarks of radius/ulna we don't want ---
    'styloid_process_of_radius',
    'styloid_process_of_ulna',

    // --- distal forearm TENDONS ("_1" = Tendon material) of the epicondylar
    //     wrist / finger movers. Their bellies STAY (they teach the common
    //     flexor/extensor origin = golfer's / tennis elbow), but the long
    //     tendons run all the way to the wrist and fingers and dangle as thin
    //     white "wires" past the elbow, which read as broken. Hiding just the
    //     distal tendons keeps the elbow view clean without losing the
    //     epicondylitis teaching. (Finger insertion slips like
    //     "...superficialise1l" are already tucked away by the marker rule.) ---
    'flexor_carpi_radialis_1',
    'flexor_carpi_ulnaris_1',
    'extensor_carpi_radialis_longus_1',
    'extensor_carpi_radialis_brevis_1',
    'extensor_carpi_ulnaris_1',
    'flexor_digitorum_superficialis_1',
  ],
};

/* ---------------------------------------------------------------------------
 * SPINE - split into three first-class regions (cervical / thoracic / lumbar)
 * rather than one "spine" region, because the spine carries 41 distinguishable
 * muscles: one undifferentiated list would overwhelm the student and erase the
 * segmental reasoning (e.g. rotation is mostly cervical/thoracic, minimal in
 * lumbar) that is the whole point of the module. Each sub-region is a peer of
 * shoulder/elbow in the store; the TopBar surfaces "Columna" with a second
 * level that sets region to one of these three.
 *
 * Vertebrae are named per level ("Vertebra_C3_1", "Atlas_(C1)_1",
 * "Vertebra_T5_1", "Vertebra_L2_1") and discs per pair
 * ("Intervertebral_disc_C5-C6"), so each sub-region keeps only its own levels.
 * Ribs do NOT come along (their names don't contain "vertebra_t"), which is
 * intended: this is a spine module, not a thorax module.
 *
 * NOTE ON UNDERSCORES. Three.js sanitizes GLB node names by turning spaces into
 * underscores, so every keyword here has to be written with underscores. These
 * three regions were authored with spaces ("vertebra c", "multifidus colli")
 * and therefore matched NOTHING: cervical rendered 10 meshes (the two
 * sternocleidomastoids and the scalenes, floating with no spine behind them),
 * thoracic 2 and lumbar 18. Keep every fragment underscore-separated, and check
 * a change with `npx tsx scripts/audit-region-filter.mts <region>`.
 * ------------------------------------------------------------------------- */
const cervical: RegionDef = {
  id: 'cervical',
  name: 'Cervical',
  // C1 sits at 1.54, C7 at 1.45, the sternoclavicular attachment of the
  // sternocleidomastoid at 1.39. Fade below the clavicle so the neck doesn't
  // trail the whole thorax, and above the skull base where the capitis muscles
  // insert.
  fade: { min: 1.34, max: 1.66, soft: 0.08 },
  include: [
    // --- bones / discs of the cervical levels ---
    'vertebra_c', // Vertebra_C3..C7
    'atlas_(c1)',
    'axis_(c2)',
    'dens_axis',
    'intervertebral_disc_c', // C2-C3 .. C7-T1
    // --- suboccipitals ---
    'suboccipital',
    'rectus_posterior_major_capitis',
    'rectus_posterior_minor_capitis',
    'obliquus_superior_capitis',
    'obliquus_inferior_capitis',
    'rectus_anterior_capitis',
    'rectus_lateralis_capitis',
    // --- craniocervical / superficial neck ---
    'splenius_capitis',
    'splenius_colli',
    'sternocleidomastoid',
    'levator_scapulae',
    // --- deep anterior neck ---
    'longus_capitis',
    'longus_colli',
    'scalenus',
    // --- cervical portions of erector spinae / transversospinalis ---
    'longissimus_capitis',
    'longissimus_colli',
    'iliocostalis_colli',
    'spinalis_capitis',
    'spinalis_colli',
    'semispinalis_capitis',
    'semispinalis_colli',
    'multifidus_colli',
    'interspinales_colli',
  ],
  exclude: [
    'thoracic',
    'thoracis',
    'lumbar',
    'lumborum',
    'femoris',
    'sacr',
    'coccy',
    'disc_t', // T-level discs (C7-T1 still rides in on 'intervertebral_disc_c')
    'disc_l',
    'vertebra_t',
    'vertebra_l',
  ],
};

const thoracic: RegionDef = {
  id: 'thoracic',
  name: 'Torácica',
  // T1 at 1.44, T12 at 1.14. Fade just outside both ends so the chain reads as
  // a segment of column rather than trailing off into neck and pelvis.
  fade: { min: 1.09, max: 1.49, soft: 0.08 },
  include: [
    // --- bones / discs of the thoracic levels ---
    'vertebra_t', // Vertebra_T1..T12
    'intervertebral_disc_t', // T1-T2 .. T12-L1
    // --- thoracic erector spinae / transversospinalis + rotatores ---
    'iliocostalis_thoracis',
    'longissimus_thoracis',
    'spinalis_thoracis',
    'semispinalis_thoracis',
    'multifidus_thoracis',
    'interspinales_thoracis',
    'rotatores',
  ],
  exclude: [
    'cervical',
    'colli',
    'lumbar',
    'lumborum',
    'capitis',
    'femoris',
    'sacr',
    'coccy',
    'disc_c',
    'disc_l',
    'vertebra_c',
    'vertebra_l',
    // keep the thoracic spine clean of the rib cage / shoulder girdle
    'rib',
    'costal',
    'sternum',
    'scapula',
    'clavic',
  ],
};

const lumbar: RegionDef = {
  id: 'lumbar',
  name: 'Lumbar',
  // L1 at 1.13, L5 at 0.96, sacrum 0.87-0.98. The rectus abdominis reaches the
  // costal margin at ~1.30 and the psoas dives to the lesser trochanter at
  // ~0.80, so the band spans both and dissolves outside them.
  fade: { min: 0.79, max: 1.34, soft: 0.08 },
  include: [
    // --- bones / discs of the lumbar levels + sacrum ---
    'vertebra_l', // Vertebra_L1..L5
    'intervertebral_disc_l', // L1-L2 .. L5-S1
    'sacrum',
    'sacro-iliac',
    // --- lumbar erector spinae / transversospinalis ---
    'iliocostalis_lumborum',
    'longissimus_lumborum',
    'multifidus_lumborum',
    'interspinales_lumborum',
    'intertransversarii',
    // NOTE: no 'erector_spinae'. The atlas ships no erector-spinae belly, only
    // two unparsed origin patches ("Erector_spinaeol/or") that render as loose
    // blobs on the sacrum. The group is present through its named columns
    // (iliocostalis / longissimus / spinalis) instead.
    // --- deep / anterolateral trunk ---
    'quadratus_lumborum',
    'psoas_major',
    'psoas_minor',
    'iliacus',
    'rectus_abdominis',
    'external_abdominal_oblique',
    'internal_abdominal_oblique',
    'transversus_abdominis',
  ],
  exclude: [
    'cervical',
    'colli',
    'thoracic',
    'thoracis',
    'capitis',
    'femoris',
    'femur',
    'disc_c',
    'disc_t',
    'vertebra_c',
    'vertebra_t',
    'vertebrae', // group nodes "Lumbar_vertebraeg" etc. (keep individual ones)
    // iliac bone / vessels that share "iliac" with the iliacus muscle
    'iliac_crest',
    'iliac_fossa',
    'iliac_spine',
    'iliolumbar',
    'iliac_branch',
    'iliac_artery',
    'iliac_vein',
  ],
};


/* ---------------------------------------------------------------------------
 * KNEE
 * Bones: distal femur, patella, proximal tibia & fibula (full shafts as
 *   visual context).
 * Joints: tibiofemoral (knee joint) + proximal tibiofibular.
 * Ligaments / capsule: cruciates (ACL/PCL), collaterals (tibial/medial,
 *   fibular/lateral), menisci + meniscal ligaments, patellar ligament,
 *   popliteal ligaments.
 * Muscles: the 13 functional knee movers - quadriceps (rectus femoris, three
 *   vasti), hamstrings (biceps femoris two heads, semitendinosus,
 *   semimembranosus), triceps surae + posterior (gastrocnemius two heads,
 *   soleus, plantaris, popliteus) and pes anserinus (sartorius, gracilis).
 * Neurovascular: popliteal vessels, genicular arteries, tibial + common
 *   fibular nerves.
 *
 * NOTE on shared keywords (verified against the real mesh dump):
 *   - "biceps" alone also matches biceps BRACHII (arm) -> we use the full
 *     "biceps femoris" fragment and defensively exclude "brachii"/"brachialis".
 *   - "tibia"/"fibula" drag in the ANKLE/FOOT muscles (tibialis anterior/
 *     posterior, fibularis brevis/longus/tertius) and the foot ligaments ->
 *     excluded explicitly, along with "calcaneofibular" (an ankle ligament).
 *   - "femur" rides in only as bony context; thigh/hip muscles that are not
 *     knee movers (adductors, gluteus, pectineus) are excluded.
 * include/exclude verified against the real mesh dump (0 leaks, 13/13 muscles).
 * ------------------------------------------------------------------------- */
const knee: RegionDef = {
  id: 'knee',
  name: 'Rodilla',
  // Frame on the knee joint (patella + menisci + cruciates/collaterals +
  // tibiofemoral/tibiofibular joint), so the camera opens on the knee close-up
  // instead of the whole leg (femur+tibia+fibula span hip-to-ankle).
  // Patella at 0.44, hip joint at 0.87, ankle at 0.09. The femur and the
  // tibia/fibula are each ONE mesh spanning their whole limb segment, and the
  // quadriceps/hamstrings/triceps surae run the length of them, so without a
  // falloff "rodilla" rendered as the entire leg from mid-femur to the toes.
  // Keep ~22 cm of thigh and ~18 cm of shin around the joint line.
  fade: { min: 0.26, max: 0.66, soft: 0.1 },
  focus: [
    'knee_joint',
    'patella',
    'meniscus',
    'cruciate',
    'tibial_collateral_ligament',
    'fibular_collateral_ligament',
    'patellar_ligament',
    'oblique_popliteal',
    'arcuate_popliteal',
  ],
  include: [
    // --- bones / bony landmarks (full shafts as context) ---
    'femur',
    'patella',
    'patellar',
    'tibia',
    'fibula',

    // --- joints ---
    'knee_joint',
    'tibiofibular',

    // --- ligaments / capsule / menisci ---
    'cruciate',
    // Specific knee collaterals only. The generic "collateral_ligament" fragment
    // used to leak the elbow/wrist/ankle/finger collateral ligaments into the
    // knee (they floated as stray white bits at arm height), so name the two
    // knee collaterals explicitly instead.
    'tibial_collateral_ligament',
    'fibular_collateral_ligament',
    'meniscus',
    'meniscotibial',
    'meniscofemoral',
    'meniscopatellar',
    'patellar_ligament',
    'oblique_popliteal',
    'arcuate_popliteal',
    'transverse_ligament_of_knee',

    // --- muscles: quadriceps ---
    'rectus_femoris',
    'vastus',

    // --- muscles: hamstrings ---
    'biceps_femoris',
    'head_of_biceps_femoris',
    'semitendinosus',
    'semimembranosus',

    // --- muscles: triceps surae + posterior ---
    'gastrocnemius',
    'soleus',
    'plantaris',
    'popliteus',

    // --- muscles: pes anserinus ---
    'sartorius',
    'gracilis',

    // --- neurovascular of the region ---
    'popliteal_artery',
    'popliteal_vein',
    'genicular',
    'tibial_nerve',
    'common_fibular_nerve',
  ],
  exclude: [
    // ankle / foot muscles dragged in by "tibia" / "fibula"
    'tibialis_anterior',
    'tibialis_posterior',
    'fibularis',
    'flexor_digitorum',
    'flexor_hallucis',
    'extensor_digitorum',
    'extensor_hallucis',
    // ankle / foot joints, bones and ligaments
    '_ankle',
    'talus',
    'talo',
    'calcaneal',
    'calcaneus',
    'calcaneofibular',
    'tarsal',
    'metatarsal',
    'malleol',
    'navicular',
    'cuboid',
    'cuneiform',
    // arm structures sharing "biceps"/"triceps" wording
    'brachii',
    'brachialis',
    // thigh / hip muscles that are not knee movers
    'iliac',
    'obturator',
    'pectineus',
    'adductor',
    'gluteus',
    'gluteal',
    // distal tibiofibular (ankle side)
    'distal_tibiofibular',
    'inferior_tibiofibular',
  ],
};

/* ---------------------------------------------------------------------------
 * HIP
 * Bones: hip bone (ilium/ischium/pubis), femur (proximal - head/neck/greater +
 *   lesser trochanter; the shaft comes along as context), sacrum/coccyx as the
 *   pelvic ring backdrop.
 * Joint + ligaments: coxofemoral (ball-and-socket), acetabular labrum, articular
 *   capsule, iliofemoral (Y of Bigelow), pubofemoral, ischiofemoral, ligament of
 *   the head of the femur (teres), transverse acetabular ligament.
 * Muscles: hip flexors (iliopsoas = psoas major + iliacus, rectus femoris,
 *   sartorius, tensor fasciae latae, pectineus), extensors (gluteus maximus;
 *   hamstrings are biarticular and taught mainly with the knee), abductors
 *   (gluteus medius/minimus + TFL), adductors (longus, brevis, magnus, gracilis,
 *   pectineus) and the DEEP SIX external rotators (piriformis, obturator
 *   internus/externus, superior/inferior gemellus, quadratus femoris).
 *
 * NOTE on shared keywords (verified against the real mesh dump):
 *   - "adductor" alone also matches adductor HALLUCIS (foot) and adductor
 *     POLLICIS (hand) -> excluded explicitly.
 *   - "quadratus" alone matches quadratus lumborum/plantae -> we key the full
 *     "quadratus_femoris".
 *   - "femur"/"femoris" rides in the whole femur + biceps femoris (a knee mover)
 *     -> "biceps_femoris" excluded (hamstrings live in the knee region).
 *   - distal knee structures (patella, menisci, cruciates, tibia, fibula) are
 *     excluded so the region frames on the COXOFEMORAL joint, not the knee.
 * ------------------------------------------------------------------------- */
const hip: RegionDef = {
  id: 'hip',
  name: 'Cadera',
  // Frame on the coxofemoral joint core (acetabulum + femoral head/neck + labrum
  // + capsule/iliofemoral ligament), not the whole hip-to-knee femur.
  // Acetabulum at 0.87, iliac crest at 1.01, ischium at 0.80, knee at 0.44. The
  // femur mesh reaches the knee and the rectus femoris / adductors / sartorius
  // go with it, which is why "cadera" used to render as a whole thigh. Keep the
  // pelvic ring plus the proximal third of the thigh and dissolve the rest.
  fade: { min: 0.7, max: 1.05, soft: 0.11 },
  focus: [
    'hip_joint',
    'acetabul',
    'head_of_femur',
    'neck_of_femur',
    'acetabular_labrum',
    'articular_capsule_of_hip',
    'iliofemoral',
    'greater_trochanter',
  ],
  include: [
    // --- bones / bony landmarks (pelvic ring + full femur as context) ---
    'hip_bone',
    'ilium',
    'iliac',
    'ischium',
    'ischial',
    'pubis',
    'pubic',
    'acetabul',
    'femur',
    'greater_trochanter',
    'lesser_trochanter',
    'sacrum',
    'coccyx',

    // --- joint / labrum ---
    'hip_joint',
    'acetabular_labrum',

    // --- ligaments / capsule ---
    'articular_capsule_of_hip',
    'iliofemoral',
    'pubofemoral',
    'ischiofemoral',
    'ligament_of_head_of_femur',
    'transverse_acetabular',

    // --- muscles: flexors ---
    'iliacus',
    'psoas_major',
    'iliopsoas',
    'rectus_femoris',
    'sartorius',
    'tensor_fasciae_latae',
    'pectineus',

    // --- muscles: extensor / abductors ---
    'gluteus',
    'gluteal',

    // --- muscles: adductors ---
    'adductor_longus',
    'adductor_brevis',
    'adductor_magnus',
    'adductor_minimus',
    'gracilis',

    // --- muscles: deep external rotators (the "deep six") ---
    'piriformis',
    'obturator_internus',
    'obturator_externus',
    'superior_gemellus',
    'inferior_gemellus',
    'quadratus_femoris',

    // --- neurovascular of the region ---
    'femoral_artery',
    'femoral_vein',
    'femoral_nerve',
    'obturator_nerve',
    'sciatic_nerve',
    'superior_gluteal',
    'inferior_gluteal',
  ],
  exclude: [
    // foot / hand structures sharing "adductor" / "obturator" wording
    'adductor_hallucis',
    'adductor_pollicis',
    // hamstrings + distal knee structures (they belong to the knee region)
    'biceps_femoris',
    'semitendinosus',
    'semimembranosus',
    'patella',
    'patellar',
    'meniscus',
    'cruciate',
    'tibia',
    'fibula',
    'vastus',
    // spine side-benders sharing "quadratus"
    'quadratus_lumborum',
    'quadratus_plantae',
    // ankle/foot muscles that share "tensor"/"fascia" or ride the femur nerve
    'fibularis',
    'tibialis',
  ],
};

/* ---------------------------------------------------------------------------
 * ANKLE / FOOT
 * Bones: distal tibia + fibula (malleoli, as context), talus, calcaneus,
 *   navicular, cuboid, cuneiforms, metatarsals, phalanges of the foot.
 * Joints + ligaments: talocrural (ankle mortise), subtalar (talocalcaneal),
 *   the lateral collateral complex (anterior/posterior talofibular,
 *   calcaneofibular) and the medial deltoid ligament, plus the distal
 *   tibiofibular syndesmosis.
 * Muscles: dorsiflexors (tibialis anterior, extensor digitorum/hallucis longus,
 *   fibularis tertius), plantarflexors (gastrocnemius, soleus, plantaris,
 *   tibialis posterior, flexor digitorum/hallucis longus), evertors (fibularis
 *   longus/brevis) and invertors (tibialis anterior/posterior).
 *
 * NOTE on shared keywords:
 *   - "extensor/flexor digitorum" and "hallucis" also exist in the HAND -> we
 *     key the foot-specific longus/brevis bellies and exclude the hand's
 *     "...pollicis"/"...indicis".
 *   - the proximal femur/knee is excluded so the region frames on the ANKLE
 *     mortise, not the whole leg.
 * ------------------------------------------------------------------------- */
const ankle: RegionDef = {
  id: 'ankle',
  name: 'Tobillo y pie',
  // Talocrural mortise at 0.09, calcaneus at 0.01-0.06, knee at 0.44. The
  // triceps surae and the long flexors/extensors originate up at the knee, so
  // fade above the mid-shin. No lower bound: the foot is where the body ends.
  fade: { max: 0.3, soft: 0.1 },
  // Frame on the talocrural mortise (talus + malleoli + collateral ligaments).
  focus: [
    'talus',
    'talo',
    'ankle_joint',
    'malleol',
    'talofibular',
    'calcaneofibular',
    'deltoid_ligament',
    'medial_ligament_of_ankle',
  ],
  include: [
    // --- bones (distal leg + foot) ---
    'malleol',
    'talus',
    'calcaneus',
    'calcaneal',
    'navicular',
    'cuboid',
    'cuneiform',
    'tarsal',
    'metatarsal',
    'finger_of_foot',
    'sesamoid_bones_of_foot',

    // --- joints ---
    'ankle_joint',
    'talocalcaneal',
    'talonavicular',
    'calcaneocuboid',
    'subtalar',
    'distal_tibiofibular',
    'inferior_tibiofibular',

    // --- ligaments (lateral complex + deltoid + syndesmosis + plantar) ---
    'talofibular',
    'calcaneofibular',
    'deltoid_ligament',
    'medial_ligament_of_ankle',
    'tibiofibular_ligament',
    'plantar_calcaneonavicular',
    'long_plantar',
    'plantar_aponeurosis',

    // --- muscles: dorsiflexors / evertors / plantarflexors of the ankle ---
    'tibialis_anterior',
    'tibialis_posterior',
    'fibularis',
    'extensor_digitorum_longus',
    'extensor_hallucis_longus',
    'extensor_digitorum_brevis',
    'extensor_hallucis_brevis',
    'flexor_digitorum_longus',
    'flexor_hallucis_longus',
    'gastrocnemius',
    'soleus',
    'plantaris',

    // --- neurovascular of the region ---
    'tibial_nerve',
    'deep_fibular_nerve',
    'superficial_fibular_nerve',
    'dorsalis_pedis',
    'posterior_tibial_artery',
  ],
  exclude: [
    // hand structures sharing digit-muscle wording
    'pollicis',
    'indicis',
    'digiti_minimi_of_hand',
    // proximal leg / knee (keep the frame on the ankle, not the whole limb)
    'patella',
    'patellar',
    'meniscus',
    'cruciate',
    'knee_joint',
    'popliteal',
    'genicular',
    // hip structures sharing "tibialis" nerve roots etc.
    'gluteus',
    'gluteal',
  ],
};

/** All defined regions, keyed by id. */
export const REGIONS: Record<string, RegionDef> = {
  shoulder,
  elbow,
  cervical,
  thoracic,
  lumbar,
  hip,
  knee,
  ankle,
};

/**
 * Resolve a region definition against the real mesh names present in the
 * scene. Returns the Set of mesh names that belong to the region, ready to
 * hand to <Viewer3D regionMeshes={...} />.
 *
 * @param region    a RegionDef (or its keyword config)
 * @param allNames  every mesh name in the loaded model
 */
export function resolveRegionMeshes(
  region: RegionDef,
  allNames: Iterable<string>,
): Set<string> {
  const inc = region.include.map((s) => s.toLowerCase());
  const exc = (region.exclude ?? []).map((s) => s.toLowerCase());
  const result = new Set<string>();

  for (const name of allNames) {
    const lower = name.toLowerCase();
    if (exc.some((frag) => lower.includes(frag))) continue;
    if (inc.some((frag) => lower.includes(frag))) result.add(name);
  }
  return result;
}

/**
 * Resolve a region's HERO-FRAMING focus meshes: the compact joint-core subset
 * the camera should frame on. Returns null when the region defines no `focus`
 * (the caller then frames the full visible bounds, the previous behaviour). The
 * region's own `exclude` still applies, so a focus keyword can't drag in a
 * neighbour the region deliberately drops.
 *
 * @param region    a RegionDef
 * @param allNames  every mesh name in the loaded model
 */
export function resolveRegionFocus(
  region: RegionDef,
  allNames: Iterable<string>,
): Set<string> | null {
  if (!region?.focus || region.focus.length === 0) return null;
  const foc = region.focus.map((s) => s.toLowerCase());
  const exc = (region.exclude ?? []).map((s) => s.toLowerCase());
  const result = new Set<string>();
  for (const name of allNames) {
    const lower = name.toLowerCase();
    if (exc.some((frag) => lower.includes(frag))) continue;
    if (foc.some((frag) => lower.includes(frag))) result.add(name);
  }
  return result.size > 0 ? result : null;
}

/**
 * How far an OPEN end of a falloff slab is pushed, in metres. The body is 1.78 m
 * tall, so ±10 km is "never reached" while staying an ordinary finite float.
 *
 * It has to be finite. The slab is fed to a GLSL `smoothstep`, and
 * `smoothstep(inf, inf + soft, y)` evaluates `(y - inf) / (inf - inf)` = NaN,
 * which propagates into the fragment alpha: with `Infinity` here the shoulder
 * (open at the top) and the ankle (open at the bottom) rendered as flat black
 * silhouettes.
 */
const FADE_OPEN_END = 1e4;

/** A resolved falloff slab, in world metres. See RegionDef.fade. */
export interface RegionFade {
  /** Below this the region dissolves. -FADE_OPEN_END when it has no floor. */
  min: number;
  /** Above this the region dissolves. +FADE_OPEN_END when it has no ceiling. */
  max: number;
  /** How many metres the dissolve takes past each edge. */
  soft: number;
}

/**
 * Resolve a region's falloff slab, with the open ends filled in so the renderer
 * can use one formula for every region. Returns null when the region defines no
 * falloff (nothing fades; the previous behaviour).
 */
export function resolveRegionFade(region: RegionDef | undefined): RegionFade | null {
  if (!region?.fade) return null;
  const { min, max, soft } = region.fade;
  return {
    min: min ?? -FADE_OPEN_END,
    max: max ?? FADE_OPEN_END,
    soft: soft > 0 ? soft : 0.001,
  };
}
