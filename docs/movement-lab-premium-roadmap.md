# Laboratorio de movimiento — Roadmap premium y handoff

> Brief para retomar en una sesión nueva. Objetivo: cerrar **"lo que todavía no
> es mejor"** que las apps existentes (Complete Anatomy, Muscle & Motion, Kenhub,
> Visible Body) y convertir el concepto —ya diferenciado— en algo que además *se
> sienta* premium. NO es un backlog de features nuevas: es acabado + validación.

---

## 0. Cómo usar este doc (arranque en frío)

1. Lee **§1 estado actual** y **§2 mapa de arquitectura** para no re-derivar.
2. Lee **§3 notas del entorno de verificación** ANTES de tocar el preview (hay
   límites reales: el canvas WebGL no pinta en el preview embebido).
3. Elige un ítem de **§4 (gaps)** o **§5 (movimientos premium)**. Cada uno trae
   qué / por qué / cómo / archivos / criterio de aceptación.
4. Revisa **§6 decisiones pendientes** (algunas requieren al usuario antes de
   construir).

Memorias relacionadas (se cargan solas): `movement-lab-muscle-spotlight`,
`movement-lab-activation-model`, `movement-lab-shoulder-carry`,
`anatris-rom-pdfs`, `orthopedic-tests-feature`, `clinical-evidence-page`,
`neuro-dermatomes-myotomes`.

---

## 1. Estado actual (hecho)

**Hombro cerrado.** El laboratorio corre sobre el rig esqueletado y muestra, en
vivo mientras se arrastra el ángulo:

- **RhythmReadout** (arriba-izquierda, fuera del modelo, `src/components/movement/RhythmReadout.tsx`):
  goniómetro de sectores + **ritmo húmero-escápulo-raquídeo** (Húmero/Escápula/
  Tronco con grados y ratio) + **músculo protagonista** + **descripción clínica
  del sector** (2 líneas) + línea "También:". Read-only, se alimenta de
  `rigChannel`. Progressive disclosure por altura de viewport (suelta descripción
  ≥780px, "También" ≥850px) para no chocar con el controlador.
- **MovementControls** (abajo-izquierda): controlador delgado (selector, lado,
  slider, reproducción, casilla "Arco en el modelo"). Empuja los músculos activos
  a `rigChannel` para el glow.
- **ShoulderRhythmArc** (`src/components/movement/ShoulderRhythmArc.tsx`, dentro
  del Canvas): arco "fino" tipo Lyon alrededor del hombro para abducción+flexión,
  derivado de la posición REAL de los huesos (humerus_gh → forearm_flex), aguja +
  marcas de sector 30/90/120/150. **NO verificado visualmente** (ver §3).
- `shoulderChain.ts`: se le añadió `readout.trunkDeg` (contribución del raquis
  >150°) sin tocar cómo mueve el rig.

Verificado por DOM: −30° Pectoral mayor → 92° Deltoides (68/24/0, 2.8:1) → 175°
Serrato ant. (116/59/22, 2.0:1). Flexión y rotaciones también leen bien.
Typecheck limpio; se corrigió un crash de Rules of Hooks (ver §3).

---

## 2. Mapa de arquitectura (para no re-derivar)

**Canal**: `rigChannel` (module pub/sub en `src/components/movement/RigModel.tsx`)
lleva `{ movementId, side, angleDeg (firmado), highlight[], showMarkers, ghostSkin }`.
`MovementControls` es el ÚNICO que escribe drive+highlight; `RhythmReadout` solo
lee y recalcula.

**Datos ROM**: `src/types/rom.ts` (RomMovement → phases con `description`+`cite`,
labReverse para arco firmado, `activations` = envolventes EMG-like por músculo).
Por región en `src/data/{shoulder,elbow,knee,thoracic,cervical,lumbar}Rom.ts`,
índice `src/data/romByRegion.ts` (`romForRegion`, `movementById`).

**Helpers puros (reusar SIEMPRE, no inventar)**:
- `src/lib/romPhaseAtAngle.ts`: `buildLabArc`, `phaseAtAngleIn`, `muscleNameById`.
- `src/lib/romActivation.ts`: `activeMusclesAt(movement, deg)` (nivel por músculo).
- `src/lib/biomech/shoulderChain.ts`: decompone elevación → GH/escápula(+trunkDeg),
  ER, lean torácico. `SHOULDER_CHAIN_VERIFIED=false` a propósito.
- `src/lib/boneMap.ts`: `BONE_MAP` (movementId → cómo mueve el rig), `getBoneControl`,
  `isDrivable`, `resolveArmatureName`. Hombro = `kind:'chain'` (abducción) o
  `kind:'joint'` (flexión/rotaciones).

**Escena**: `RigViewer.tsx` (Canvas, luces, env, AutoFit) monta `RigModel` +
`RigOverlays` (glow de músculos + marcador de eje) + `ShoulderRhythmArc`.

**Ecosistema integrado** (el foso real): tests ortopédicos
(`OrthopedicTestsPanel.tsx`, `src/types/orthopedicTest.ts`), neuro
(`NeuroPanel.tsx`, `DermatomeMap.tsx`), evidencia con PubMed (`evidence.ts`).

---

## 3. Notas del entorno de verificación (LEER antes de tocar el preview)

- **El canvas WebGL del rig NO se pinta en el preview embebido**: queda en
  300×150 y la vista sale desplazada ~−234px. **`computer{screenshot}` se cuelga
  (timeout 30s).** => No se puede validar visualmente lo 3D (rig, arco Lyon,
  goniómetro renderizado) por aquí. Verifica con `get_page_text`, `read_page` y
  `javascript_tool` (bounding boxes / computed style). El aspecto 3D necesita el
  ojo del usuario o una captura real de su máquina.
- **Alturas**: el preview corre a 720px de ventana → viewer ~619px (hay un banner
  de disclaimer ~50px + topbar). En pantallas reales (≥~800px) sobra espacio.
- **Rules of Hooks**: cualquier hook (incl. `useViewportHeight`) DEBE llamarse
  antes del `return null` de guardia; si no, crashea y blanquea la página, y
  **tsc no lo detecta** — siempre `read_console_messages` tras añadir hooks.
- El clasificador de seguridad del navegador a veces cae: `javascript_tool` /
  `form_input` / `key` fallan intermitentemente; `computer{left_click}` por `ref`
  suele pasar. Reintenta.
- `line-clamp-N` de Tailwind NO recortó aquí; usar estilo inline
  (`WebkitLineClamp`).

---

## 4. Los gaps ("lo que no es mejor") — con plan

### G1 — Fidelidad visual del render / modelo ◐ PARCIAL
**Por qué importa**: Complete Anatomy/Visible Body renderizan mejor; para "sentirse
premium" el modelo tiene que verse limpio. Problemas conocidos (ver memorias):
manos/pies, clipping en flexión profunda, tope de rodilla a 105° por clipping.
**Hecho (pase de materiales/luces, confirmado con captura real del usuario en su
puerto 5174 — ver nota de método abajo)**:
- Músculo menos plano: `TISSUE_PBR.muscle` roughness 0.72→0.66, envMapIntensity
  0.22→0.32 (`RigModel.tsx`) → capta más el IBL de estudio, brillo húmedo y relieve
  entre vientres. Bone/connective sin tocar.
- Rim trasero 0.7→0.95 + key 1.15→1.2 (`RigViewer.tsx`) → borde que separa la
  silueta del fondo negro.
- Exposición NO tocada: la captura mostró que NO está quemada (el delta 0.95→0.9
  propuesto habría oscurecido — descartado). 
- Verificado a 90°: hombro pulido, deltoides/escápula sin meshes salidos, mano/pie
  limpios. Arco Lyon (G2) además se ve renderizando como anillo.
**MÉTODO DE VERIFICACIÓN (importante, actualiza §3)**: el canvas WebGL del rig NO se
puede capturar desde el preview embebido (queda 300×150, R3F no redimensiona; el
ResizeObserver no dispara; `computer{screenshot}` y `toDataURL` inservibles) NI por
Claude-in-Chrome (extensión no conectada). LO QUE SÍ FUNCIONA: el usuario abre su
propio dev server (aquí 5174), recarga EN DURO (el pase de estilo corre 1 vez por
escena cacheada, no por HMR) y pega la captura; se itera con eso.
**Pendiente**: (a) glass/translucidez de piel y borde fresnel en ghost — no tocado;
(b) auditar las 6 vistas y flexión profunda / rodilla 105°; (c) el realce ámbar del
músculo lee plano → refinar a glow que mantiene rojo (memoria `movement-lab-premium-finish`).
**Aceptación**: en abducción 0→180 no hay meshes que "se salgan"; el hombro lee
pulido en las 6 vistas.
**Esfuerzo**: medio. **Riesgo**: visual; ahora verificable vía captura del usuario.

### G2 — Arco 3D Lyon ✅ HECHO (confirmado por captura)
**Qué**: `ShoulderRhythmArc` es robusto por construcción (deriva del hueso). En las
capturas del usuario se veía como ANILLO completo brillante (era una semicircunf.
0-180° de radio = largo del brazo entero, toda en accent brillante).
**Hecho**: convertido en goniómetro real (`ShoulderRhythmArc.tsx`): dial COMPACTO
`R_ARC = 0.62` del largo del brazo (antes = 1.0); arco de referencia 0-180 TENUE
(opacity 0.26) + arco de "progreso" 0→ángulo actual BRILLANTE barrido con
`setDrawRange` (llena como un transportador en vez de anillo estático); la aguja
sigue a largo completo del brazo, cayendo sobre el húmero; ticks/caps al nuevo
radio. Typecheck limpio.
**Confirmado por captura del usuario**: lee como transportador (dial compacto +
sector barrido brillante + aguja sobre el húmero), ya NO como anillo. ✅
**Aceptación**: la aguja cae sobre el húmero y el arco lee como transportador. ✅
**Ajuste futuro**: si se quiere aún más pequeño, bajar `R_ARC` (hoy 0.62).

### G3 — Activación = modelo didáctico, no EMG medido ✅ HECHO
**Por qué importa**: mostrar % puede leerse como "dato medido". Un profesional lo
va a cuestionar. Hay que enmarcarlo con honestidad (ya es la disciplina del repo).
**Hecho**: pie fijo (siempre visible) en `RhythmReadout` — "Porcentajes y
proporciones: modelo de reclutamiento (Kapandji · Oatis · Neumann), no medición
EMG." Cubre tanto el % del músculo protagonista como la proporción del ritmo. Se
añadió `neumann` a `references.ts`. Se usó texto estático, NO tooltip, para no
romper el drag-through (pointer-events-none) ni chocar con §3.
**Pendiente opcional**: enlazar a la fuente EMG concreta (Inman, etc.) vía
`evidence.ts` si se quiere profundizar.
**Aceptación**: en ningún punto el % se presenta como medición. ✅ verificado por DOM.
**Esfuerzo**: bajo.

### G4 — Flexión/rotaciones más pobres que abducción
**Qué**: abducción usa el `chain` (ritmo real); flexión es `kind:'joint'` (GH puro,
sin escápula/tronco), así que el bloque de ritmo no aplica — y mostrarlo sería
deshonesto (el rig no mueve la escápula en flexión).
**Cómo (elección de diseño, ver §6)**:
- Opción A: convertir flexión a `chain` (escápula upward rotation + trunk como en
  abducción) en `boneMap.ts`/`shoulderChain` (la elevación en plano sagital
  también tiene ritmo escapulohumeral). Es la correcta clínicamente pero toca el
  rig — validar que no rompe piel/cuello.
- Opción B: dejar flexión sin ritmo pero añadir su propio contenido (ER obligada,
  arco doloroso sagital) para que no se sienta "vacío".
**Aceptación**: flexión no se siente como versión degradada de abducción.
**Esfuerzo**: A = alto (rig), B = bajo. **Necesita decisión del usuario.**

### G5 — Valor del tronco (raquis) sin validar
**Qué**: `trunkDeg` sale de la flexión lateral torácica del modelo (~22° a 175°);
puede sobreestimar la contribución del raquis a la elevación.
**Cómo**: contrastar contra los PDFs Anatris (memoria `anatris-rom-pdfs`) y
Kapandji; ajustar `G_SPINE_PER_VERT`/umbral en `shoulderChain.ts` o el mapeo a
"grados de contribución". Marcar `cite`.
**Aceptación**: la cifra de tronco es defendible con fuente.
**Esfuerzo**: bajo-medio (sobre todo lectura clínica).

### G6 — Cobertura (replicar el patrón a otras regiones) ◐ EN MARCHA
**Hallazgo clave**: el readout ya es REGION-AGNÓSTICO. Verificado en vivo (Codo):
goniómetro + tarjeta de sector + descripción + "Fuente:" + protagonista + "También"
+ encuadre G3 salen SOLOS de los datos existentes (`activeMusclesAt`/`phaseAtAngleIn`).
Lo shoulder-específico (ritmo húmero-escápulo, presets patológicos) se OCULTA
correcto en las demás (verificado: sin chips "Estado" en codo).
**Hecho (P2 replicado — flags clínicos por fase, modelado + citado en la prosa
existente)**:
- Rodilla: mecanismo de tornillo, desbloqueo (poplíteo), protección del LCA.
- Codo: síndrome del pronador redondo (warn), estabilidad al valgo.
- Cervical: flexores profundos (whiplash), 50% en C1-C2, desfiladero torácico (warn).
- Torácica: motor abdominal, oblicuos cruzados.
- Lumbar: estabilización profunda (feed-forward TrA), base de McKenzie, rotación
  mínima/riesgo discal (warn).
- Verificado por DOM (Codo→Pronación): el flag "Síndrome del pronador redondo"
  renderiza. Typecheck limpio.
**Hecho (RITMOS EQUIVALENTES por región — cada uno un análogo del ritmo húmero-
escápulo del hombro, todos READOUT-only, no tocan el rig)**:
- **Rodilla** — `src/lib/biomech/kneeCoupling.ts` (`kneeScrewHome`): MECANISMO DE
  TORNILLO, RE tibial acoplada (15° a extensión → 0° a los 30° de flexión). Tarjeta
  con gauge + zona Bloqueada/Desbloqueando/Libre. Verif DOM: 0°→15° Bloqueada,
  10°→10° Desbloqueando, 105°→0° Libre. El flag de la extensión se repurpuso a
  "Extension lag" (warn) para no duplicar título.
- **Cervical** — `src/lib/biomech/cervicalCoupling.ts` (`cervicalRotationSplit`):
  reparto C1-C2 vs C2-C7 (~50% atlanto-axial, front-loaded). Verif DOM: 60°→C1-C2
  33° / C2-C7 27° (1.2:1).
- **Lumbar** — `src/lib/biomech/lumbarCoupling.ts` (`lumbopelvicRhythm`): ritmo
  lumbopélvico (lumbar lidera, pelvis/cadera ramp-in). Verif DOM: 50°→Lumbar 50 /
  Pelvis 34 (1.5:1).
- Renderizados por un componente compartido `SegmentSplitCard` (barra + leyenda +
  nota + fuente) en RhythmReadout; cada ritmo se muestra SOLO en su gesto
  (cervical-rotation, lumbar-flexion, knee flexo-extensión).
- **Codo y Torácica NO reciben ritmo forzado**: no tienen un coupling icónico
  honesto (pronosupinación es independiente; Fryette es sign-incierto/no riggable).
  Quedan premium por readout + flags. (Disciplina "modelado, no inventado".)
**Hecho (PRESETS PATOLÓGICOS generalizados a otras regiones)**: el sistema de P1 se
unificó en `src/data/pathologies.ts` (`MovementPathology` con `appliesTo[]` +
efectos opcionales: `shoulderMod` para el ritmo del hombro, `rangeCapDeg` tope de
máximo, `rangeFloorDeg` suelo de mínimo). `pathologiesForMovement(id)` da los presets
del gesto activo; MovementControls acota el slider/playback a [effMin, effMax] y el
selector "Estado" aparece en cualquier gesto con presets. (Se borró
`shoulderPathologies.ts`.)
Presets por región (TODAS las 6 regiones tienen ya al menos uno; verif DOM cada una):
- **Hombro**: Discinesia (`shoulderMod scapulaGainMul 0.5`), Pinzamiento (0.8),
  Congelado (1.25 + `rangeCapDeg 115`). Intacto tras el refactor (6.7:1 / tope 115).
- **Rodilla**: Extension lag (`rangeFloorDeg 12`), Maltracking/VMO (banner-only).
- **Codo**: Contractura en flexión (`rangeFloorDeg 30`), Epicondilalgia lateral
  (banner-only, solo en extensión).
- **Cervical**: Whiplash (`rangeCapDeg 50` en rotación).
- **Torácica**: Hipercifosis (`rangeCapDeg 12` en extensión).
- **Lumbar**: Inestabilidad (banner-only), Hernia discal (`rangeCapDeg 35` en flexión).
Verif DOM confirmada: cada cap/suelo acota el slider, el banner sale con "por qué
duele" + "Estructura clave" (nombres resueltos también para músculos de columna), y
los coupling readouts (p.ej. lumbopélvico) respetan la ventana acotada. Typecheck
limpio, consola sin errores en carga fresca (el error visto antes era artefacto de
Fast Refresh al añadir un hook, no reaparece).
**Pendiente (futuro, según se quiera)**: aún más cuadros donde aporten (rodilla
LCA-insuficiente, etc.) — es solo añadir entradas a `pathologies.ts`. Si un cuadro
necesita ALTERAR un ritmo no-hombro (no solo acotar rango), habría que extender ese
coupling con un `mod` como se hizo con `shoulderChain`.
**Aceptación**: cada región abre con el mismo nivel de readout. ✅ (base + flags)
**Esfuerzo**: el grueso ya estaba; los "ritmos"/patologías por región son el resto.

---

## 5. Movimientos premium (diferenciadores defendibles)

### P1 — Normal vs. patológico ★ ✅ HECHO (confirmado por captura)
**Por qué**: ningún atlas lo hace, y es exactamente lo que un fisio pagaría. Ver
el ritmo escapulohumeral ALTERADO (discinesia escapular, hombro congelado, pinzamiento)
al lado del normal.
**Hecho (3 cuadros, data-driven + citado)**:
- `src/data/shoulderPathologies.ts` (NUEVO): 3 presets con `mod: ShoulderChainMod`
  (`scapulaGainMul` / `elevationCapDeg`) + mecanismo + "por qué duele" + estructura
  implicada + cite. Discinesia `scapulaGainMul:0.5`; Pinzamiento `0.8`; Congelado
  `1.25` + `elevationCapDeg:115`.
- `shoulderChain(deg, side, mod?)` aplica el modificador (escala escápula, tope de
  elevación) → como la MISMA función mueve el rig (vía `boneMap` chain decompose,
  ahora `(deg,side,mod)`) y alimenta el readout, la patología cambia AMBOS.
- `RigCommand.pathologyId` (canal); MovementControls: selector "Estado"
  (Normal + 3 chips ámbar), solo en la abducción (`PATHOLOGY_MOVEMENT_IDS`); el
  tope congela el slider+playback en 115.
- RhythmReadout: banner "PATOLÓGICO · nombre" + por qué duele + estructura clave +
  fuente, y el ritmo muestra "X:1 vs Y:1 normal".
- Refs nuevas: `kibler-2013`, `ludewig-2009`, `kelley-2013` (sin pmid → búsqueda por
  título). El selector vive en el CONTROLADOR (no en el readout, que es drag-through).
**Verificado por DOM (90°)**: Discinesia 6.7:1 (húmero 78/escápula 12), Pinzamiento
3.8:1 (manguito implicado), Congelado tope 115° + 1.5:1 (sustitución escapular);
Normal resetea (max→180, banner fuera). Typecheck limpio, consola sin errores.
**Confirmado por captura**: la discinesia mueve el rig (escápula resaltada, patrón
alterado) con banner + estructura clave (Serrato·Trapecio, fuente Kibler). ✅
**Aceptación**: un fisio ve la diferencia de reparto y "por qué duele aquí". ✅
**Esfuerzo**: medio-alto.
**Hecho (resaltado en ESCENA de las estructuras implicadas)**: `RigCommand.implicated`
lleva los ids del preset activo; MovementControls los empuja; RigOverlays les da un
énfasis naranja "lesionado" que PULSA (useFrame) sobre el glow normal, para que el
ojo vaya a DÓNDE se localiza la patología (no solo leerlo en el banner). Estable, sin
errores, glow normal intacto; el pulso es WebGL → pendiente el OK visual del usuario
(ver [[movement-lab-visual-verify]]).

### P2 — Insight clínico por sector (promover lo que ya existe) ✅ HECHO
**Qué**: los datos ya tienen prosa clínica por fase (`RomPhase.description`, y hay
notas por músculo). Antes la descripción estaba en 2 líneas recortadas.
**Hecho**:
- Nuevo campo de datos `RomPhase.flag?: RomClinicalFlag` (`{ label, detail?, tone }`,
  tone `'warn'`|`'pearl'`) en `src/types/rom.ts`. Hereda el `cite` de la fase; es
  modelado/citado, no inventado.
- Abducción del hombro poblada: 30-90° y 90-120° → banner `warn` "Arco doloroso";
  120-180° → banner `pearl` "Control escapular" (`src/data/shoulderRom.ts`).
- `RhythmReadout` ahora muestra una TARJETA "sector clínico" protagonista (antes
  nota al pie): etiqueta + escala + banner del flag (ámbar/teal) + prosa a 4 líneas
  + "Fuente: Kapandji · Oatis". Helper `citeLabel()` para la atribución corta.
- NO se añadió toggle "expandir" (evita pointer-events-auto y el riesgo de §3); la
  prosa se muestra a 4 líneas y se descarta solo en viewports muy bajos.
**Aceptación**: el "por qué clínico" es lo primero que ve el fisio. ✅ verificado por DOM.
**Pendiente**: replicar `flag` en flexión/rotaciones y en otras regiones (va con G6).
**Esfuerzo**: bajo-medio.

### P3 — Validación + modo enseñanza/export
**Qué**: cerrar los `pageVerified:false` (disciplina del repo) y permitir
proyectar/screenshot para clase o paciente.
**Cómo**: pasada de verificación de páginas Kapandji/Oatis; botón "captura/limpiar
HUD" (ocultar paneles para una vista limpia); posible export a imagen.
**Aceptación**: contenido citado verificado + vista presentable.
**Esfuerzo**: medio (validación es lectura).

---

## 6. Decisiones pendientes del usuario (preguntar ANTES de construir)

1. **G4/flexión**: ¿convertir flexión a `chain` con ritmo real (correcto, toca el
   rig) o darle contenido propio sin ritmo? 
2. **P1/patológico**: ¿qué 2–3 cuadros priorizar (discinesia escapular, hombro
   congelado, pinzamiento subacromial)? ¿alcance de "modelado" aceptable?
3. **Orden**: ¿pulir hombro al 100% (G1–G5 + P1–P3) antes de replicar a otras
   regiones (G6), o llevar el patrón actual a codo/rodilla/columna primero?

## 7. Secuencia sugerida (si no hay otra preferencia)

1. G2 (validar arco 3D con el ojo del usuario) — desbloquea confianza en lo 3D.
2. ~~P2 (insight por sector) + G3 (encuadre honesto del %)~~ ✅ HECHO — barato, alto valor.
3. G5 (validar tronco) + G1 (pasada visual del hombro).
4. P1 (normal vs patológico) — el diferenciador estrella.
5. G4 (decidir flexión) y P3 (validación/export).
6. G6 (replicar a codo/rodilla/columna) al final, con el patrón ya pulido.

> Regla de oro del proyecto: **modelado, no inventado**. Todo número clínico va
> con `cite` y `pageVerified` honesto. Reusar los helpers puros; no duplicar
> lógica de reclutamiento/fase.
