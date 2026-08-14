# Revisión de fisioterapeuta — hombro (JCH)

Notas manuscritas recibidas el **2026-08-11**. Este documento es la
transcripción literal de las 26 observaciones, con el área de código que
toca cada una y su estado. Se actualiza a medida que se van corrigiendo.

**Cómo leerlo:** cada punto conserva el número que le puso el fisio, para
poder responderle con su misma numeración. El "estado" es:
`pendiente` · `en curso` · `hecho` · `no reproducido` (no se ha conseguido
ver el fallo descrito y hace falta que lo detalle).

---

## Resumen

**Estado del bloque de movimiento (el elegido para empezar):**

| Nota | Estado |
|---|---|
| 2 · clavícula no se encuentra | ✅ hecho |
| 8 · origen e inserción | ✅ hecho |
| 11 · aislar músculos | ✅ hecho |
| 14 · rotaciones mal | ✅ hecho |
| 16 · los huesos se atraviesan | ✅ hecho |
| 20 · sensibilidad y especificidad | ✅ hecho |
| 5 · posiciones funcionales | ✅ completado, pero ver abajo |
| 4 y 26 · nervios | ✅ accesibles y con lista propia |
| 21 · los tests se ven iguales | ✅ de 18 poses idénticas a 4, y esas 4 explicadas |
| 19 · no se explican los tests | ✅ hecho |
| 22 · "Examen" y "Guía" | ✅ hecho |
| 23 · miotomas y "Comparar" | ✅ hecho |
| 24 · lámina diminuta | ✅ hecho |
| 9 · disección en Explorar | ✅ hecho |
| 15 · modo paciente | ✅ hecho |
| 18 · patologías en 3D | ✅ hecho |
| 1 · lento | ✅ portada 1,9 MB / 0,43 s; el modelo, 43 % menos |
| 7 · borroso al zoom | ✅ hecho, por confirmar en pantalla |
| 13 · flexión mal | ✅ músculo, costura, axila y pliegue; el pectoral ya se mueve |
| 17 · ver la biomecánica | ✅ concretado y corregido: el raquis entero |
| 25 · faltan dermatomas y miotomas | ✅ C4 añadida entera (dato + lámina + piel) |
| 3 · músculos por fibras | ⚠️ no reproducido |

Lo verificado en esta tanda: **326 pruebas** en verde, build correcto,
`npm run audit-data` con **0 errores y 0 avisos**, las medidas del rig
(clavícula, separación AC, penetración) reconfirmadas en ambos lados, y la
primera carga medida en un Chromium real contra el `dist/` que se publica.

| Bloque | Puntos | Peso |
|---|---|---|
| Contenido anatómico (falta o está mal) | 2, 3, 4, 8, 25, 26 | 🔴 alto |
| Movimiento y biomecánica | 11, 13, 14, 16, 17 | 🔴 alto |
| Tests ortopédicos | 19, 20, 21, 22 | 🔴 alto |
| Dermatomas / miotomas | 23, 24 | 🔴 alto |
| Interacción y modos que no se entienden | 9, 10, 15, 18 | 🟠 medio |
| Rendimiento y acabado visual | 1, 7, 12 | 🟠 medio |
| Contenido de apoyo | 5, 6 | 🟡 bajo |

---

## 1. Contenido anatómico

### 2 · No se muestran todos los músculos o huesos — romboides ✓, clavícula ✗
> *"No se muestra todos los músculos o huesos: romboides ✓ / clavícula ✗"*

**La barra lateral solo listaba músculos.** Comprobado antes de tocar nada: la
clavícula **sí** está en el modelo, **sí** entra en la región de hombro (la
definición incluye `clavic`) y **sí** se etiqueta al margen en Explorar (lo
verifica `npm exec tsx scripts/audit-atlas-labels.mts`). Lo que no se podía
hacer era **encontrarla**: el único listado del carril es `MuscleList`, y una
clavícula no es un músculo. El romboides aparecía porque sí lo es.

Y es justo al revés de lo deseable: los huesos profundos son los que **no**
se pueden alcanzar con un clic, que es exactamente la razón por la que existe
la lista de músculos.

**Corregido:** sección **"Huesos"** nueva en la barra lateral. Para el hombro
lista las 6 estructuras que un fisio busca:

> Clavícula · Escápula · Húmero · Rodete glenoideo · Disco articular
> acromioclavicular · Disco articular esternoclavicular

Clic en una la selecciona **como estructura** (los dos lados) y lleva la
cámara hasta ella.

Lo difícil fue **agrupar**. Z-Anatomy nombra los lados de forma inconsistente:
unas estructuras llevan sufijo `l`/`r` (`Glenoid_labruml`), otras codifican el
segundo lado como cola duplicada de Blender sin lateralidad ninguna
(`Clavicle` / `Clavicle_1`), y encima el mismo nombre de malla aparece dos
veces en la escena. Además la lateralidad no se puede deducir de la letra
final: `Glenoid_labruml` tiene que perder su `l`, y `Femur` tiene que
conservar su `r` — mi primera versión rebautizó el fémur como "Femu". Lo que
los distingue es que existe `Glenoid_labrumr` y no existe `Femul`, así que
ahora decide el **emparejamiento**, no la letra.

Como el store no sabía expresar "un hueso" (solo `selectedMeshName`, que
alumbraría media clavícula), se añade `selectBone(id, meshNames)` y el modelo
resalta la unión.

- **Dónde:** `src/lib/boneList.ts`, `src/components/BoneList.tsx`,
  `src/components/Sidebar.tsx`, `src/store/anatomyStore.ts`, `AnatomyModel.tsx`
- **Estado:** ✅ hecho — 10 pruebas del agrupador, 249 en total en verde.

### 3 · Los músculos deberían agruparse, no ir por fibras
> *"3 músculos no por fibras sino en conjunto (deltoides ant, medio, post)"*

⚠️ **No he conseguido reproducirlo.** El deltoides ya está modelado como **un
solo músculo** con sus tres porciones dentro, y lo he comprobado en todos los
sitios donde aparece:

| Dónde | Qué muestra |
|---|---|
| `muscles/shoulder.ts` | **un** registro `deltoid`, con las 3 partes en `meshBases` |
| Lista lateral (`MuscleList`) | una fila, "Deltoides" |
| Clic en Explorar | `resolveMuscleId` mapea las 3 partes a `deltoid` → panel "Deltoides" |
| Clic en el laboratorio | la disección actúa sobre `muscle.meshBases`, las 3 juntas |
| Etiquetas de Explorar | "Deltoides" una vez (`scripts/audit-atlas-labels.mts`) |
| Fases de ROM | `muscleId: 'deltoid'` con nota de porción |

Las porciones sí se nombran **dentro** de la ficha ("Porción clavicular
(anterior): flexión…"), que es justo lo que pide la nota.

**Hace falta que diga dónde lo vio.** Si es una pantalla que no he mirado, se
corrige rápido; pero no quiero reestructurar un modelo de datos que en todo lo
que he podido comprobar ya hace lo que pide.

- **Estado:** ⚠️ no reproducido

### 4 · No hay nervios
> *"no hay nervios"*  (se repite en el **26**)

**No había que crearlos: ya estaban, y no se podía llegar a ellos.** El modelo
trae **661 mallas de nervio**, y el plexo braquial **completo**: raíces, los
tres troncos, sus divisiones anteriores y posteriores, el fascículo posterior
y todas las ramas (axilar, supraescapular, musculocutáneo, radial, mediano,
cubital, torácico largo, toracodorsal, subescapulares, pectorales, dorsal de
la escápula).

Dos cosas lo tapaban:

1. **La capa "Nervios" está apagada por defecto**, y es una decisión
   deliberada que el propio store documenta: al recortar una región, las ramas
   que salen de ella *"quedan flotando en el aire, y se lee como roto"*. No la
   he cambiado — es decisión de producto, no mía.
2. **El filtro de la región de hombro los dejaba fuera.** Sus palabras clave
   son óseas y musculares, así que solo pasaban los nervios cuyo nombre
   contiene "scapular" por casualidad. El hombro tenía nervio *supraescapular*
   y **no tenía nervio axilar** — precisamente el que inerva el deltoides y el
   que se lesiona en la luxación glenohumeral, que la propia ficha del
   deltoides menciona.

**Corregido:**
- Palabras clave de nervio en la región de hombro. Pasan de 38 mallas sueltas
  a **24 estructuras nombradas**, en el orden en que se enseña un plexo:
  raíces → troncos → divisiones → fascículo → ramas.
- Sección **"Nervios"** en la barra lateral, con la misma maquinaria que la de
  huesos (el agrupador es agnóstico de capa; solo cambia la tabla de nombres).
- **Elegir un nervio enciende su capa.** Pedirlo por su nombre es una petición
  inequívoca de verlo, así que no tiene sentido enfocar la cámara sobre nada.
  Parte del "no hay nervios" era no encontrar nunca ese interruptor.

Una trampa por el camino: `axillary_nerve` es subcadena de `m-axillary_nerve`,
así que el nervio **maxilar** de la cara y su rama meníngea se colaron en la
lista del hombro. Excluidos.

- **Dónde:** `src/data/regiones.ts`, `src/lib/boneList.ts`,
  `src/components/BoneList.tsx`, `src/components/Sidebar.tsx`
- **Estado:** ✅ el plexo es accesible y navegable por nombre. Queda como
  decisión tuya si la capa debe venir encendida por defecto en el hombro.

### 8 · Origen e inserción: puntos enormes, y el del pectoral está mal
> *"Origen: puntos muy grandes, no se diferencia. Inserción se repite
> (pectoral) ✗ está mal puesta"*

Las tres cosas eran ciertas, y las dos últimas salían de las **etiquetas del
propio modelo**.

**"Se repite" y "está mal puesta".** El pectoral mayor traía **8 marcadores
de inserción** en vez de 2. Seis pertenecen a la cabeza esternocostal y están
sobre el **esternón** (x ≈ 0,01–0,06 · z ≈ +0,10), que es donde esa cabeza
*se origina*. La app dibujaba por tanto cuatro chinchetas que decían
"Inserción: cresta del troquíter" repartidas por el pecho.

Auditando el resto apareció un segundo fallo que el fisio no llegó a anotar:
el **trapecio tiene las dos inserciones invertidas**. Su única "inserción"
estaba en la línea media de la nuca (0,020 · 1,572) y sus "orígenes",
lateralmente sobre el hombro.

Ninguna de las dos correcciones es opinión mía: **contradicen el contenido
citado de la propia app**. `shoulderMuscles.ts` da el origen del trapecio como
*"protuberancia occipital externa, ligamento nucal y apófisis espinosas de C7
a T12"* y su inserción como *"tercio lateral de la clavícula, acromion y
espina de la escápula"* — exactamente al revés que los sufijos de malla. Y
lista la cabeza esternocostal del pectoral bajo **origen**.

Tras la corrección, medido sobre el modelo:

| Músculo | Origen | Inserción |
|---|---|---|
| Pectoral mayor | 5 puntos (esternón, clavícula, vaina abdominal) | **1, en el húmero** |
| Trapecio | 1 (nuca, línea media) | 3 (clavícula, acromion, espina) |
| Deltoides | 3 (clavícula, acromion, espina) | 1 (tuberosidad deltoidea) |

El deltoides queda **igual que antes**, que es la comprobación de que la
corrección no toca lo que ya estaba bien.

**"Puntos muy grandes".** La chincheta medía 1,2 cm de radio y su halo 2,6 cm:
dos anclajes a pocos centímetros se fundían en un solo borrón. Reducidos a la
mitad. Y ahora **origen e inserción se distinguen por forma** (esfera contra
octaedro), no solo por color — el color solo falla con los dos en pantalla, en
un proyector lavado, o para alguien daltónico.

Además, varias mallas-punto a un centímetro entre sí se funden en una sola
chincheta, así que un mismo anclaje deja de apilar etiquetas.

Se hace con **tabla curada, no con heurística geométrica** ("las inserciones
son laterales"): una heurística que reetiqueta anclajes en silencio es justo
lo que rompería un músculo que nadie vuelva a mirar.

- **Dónde:** `src/lib/attachmentParts.ts`, `src/components/AttachmentMarkers.tsx`
- **Estado:** ✅ hecho — 259 pruebas en verde.

### 25 · No están todos los dermatomas ni todos los miotomas
> *"no están todos los dermas y mios"*

Lo que hay hoy, y por qué:

| Conjunto | Raíces | Falta |
|---|---|---|
| Miembro superior | C5 · C6 · C7 · C8 · T1 | **C4** |
| Miembro inferior | L2 · L3 · L4 · L5 · S1 | L1, S2 y abajo |

El recorte **no es un descuido**: es el cribado motor de ASIA, que empieza en
C5 (ASIA no asigna músculo clave a C4) y del que tanto `plate.ts` como
`skinRegions.ts` dejan constancia por escrito — el cabo cervical y el triángulo
clavicular *"pertenecen a raíces que este cribado no cubre"* y quedan **sin
pintar a propósito**.

Dicho eso, para un módulo de **hombro** la ausencia de **C4 sí pesa**: su punto
clave ASIA es la **articulación acromioclavicular**, y el dolor referido al
cabo del hombro es pan de cada día.

**Añadida, y añadida entera.** El motivo de que faltara era bueno pero estaba
mal aplicado: ASIA no le asigna músculo clave a C4, cierto — pero eso es un
argumento sobre **miotomas**, y el mapa es de **dermatomas**. C4 tiene punto
clave sensitivo, y en un módulo de hombro no es un caso raro. Son las tres
piezas, porque una raíz que se lista y no se pinta es peor que una raíz
honestamente ausente:

| Pieza | Qué recibe C4 | Dónde |
|---|---|---|
| **Dato** | Casquete del hombro; punto clave en la articulación acromioclavicular | `neuro/cervical.ts` |
| **Lámina 2D** | El casquete, en las dos vistas, con su chincheta y su propio pigmento | `neuro/plate.ts` |
| **Piel 3D** | Fosas supraclaviculares mayor (marca) y menor | `neuro/skinRegions.ts` |

Detalles que no son cosméticos:

- **El hueco motor se dice, no se rellena.** C4 no lleva demostración: lleva una
  nota explicando que ASIA no le asigna músculo clave. Inventarle un miotoma para
  que la ficha quedara simétrica habría sido exactamente lo contrario de lo que
  pedía el fisio.
- **C4 no lleva reflejo**, porque no tiene uno propio.
- **Pigmento nuevo.** La rampa tenía cinco colores y se indexa en módulo, así que
  una sexta raíz sin sexto color habría salido del mismo verde que la primera.
  Se añade un verde-amarillo al extremo proximal, siguiendo la regla que ya
  estaba escrita: frío, lejos del sector rojo-naranja-ámbar que ocupa el tejido.
- **C5 se corre hacia abajo** en la lámina para dejarle el casquete, con un pelo
  de solape para que no quede un anillo desnudo entre las dos.
- Las dos notas que decían *"fuera de este tamizaje"* se han reescrito: ahora
  dicen lo que de verdad pasa, que el cribado **motor** empieza en C5.

- **Estado:** ✅ hecho. Guardado por pruebas en las tres piezas: que C4 no finge
  demostración motora, que se pinta en las dos vistas de la lámina, que no invade
  el brazo, que tiene color propio, y que su punto clave cae sólido sobre la
  fosa supraclavicular mayor en el cuerpo 3D.

**Sigue fuera**, y por el mismo motivo de siempre: L1, S2 y abajo. Son raíces de
tronco y miembro inferior distal que este cribado no cubre, y la lámina lo dice.

### 26 · No hay nervios
Mismo trabajo que el punto **4** — ✅ hecho.

---

## 2. Movimiento y biomecánica

### 11 · En el movimiento deberían aislarse los músculos
> *"en el mov deberían aislarse los músculos"*

Aislar **ya existía**, pero solo llegaba por clic sobre el modelo: había que
encontrar el músculo en el 3D, en marcha, y acertarle. Y justo al lado, el
panel del ritmo te estaba diciendo por su nombre qué músculo trabaja en ese
ángulo — como texto muerto.

**Corregido:** los nombres del panel son ahora accionables. Clic en el músculo
protagonista (o en cualquiera de la línea "También") lo deja solo en el
modelo; clic otra vez lo deshace. Sale en el panel de disección con su salida,
y Escape también lo quita.

- `dissectChannel.isolateMuscle(id, label, bases)`, que aísla por id sin
  necesitar una selección de clic.
- Los músculos se resuelven con `musclesForRomLookup`, no con el registro
  estático, para que funcione también en las regiones de pago.
- **Estado:** ✅ hecho

### 17 · En el movimiento quiere ver la biomecánica
> *"en el mov quisiera ver la biomecánica"*

`BiomechanicsGuide` existe, pero vive en la pestaña **"Aprender"**, no en el
laboratorio de movimiento.

**Hecho a medias.** He añadido lo que la corrección de la nota 16 acaba de
hacer posible: el panel del ritmo abre ahora la parte escapular en las dos
articulaciones que la producen — cuántos grados pone la **esternoclavicular**
(la clavícula que se eleva) y cuántos la **acromioclavicular** (la escápula
girando sobre ella). Antes eso no se podía enseñar porque el modelo no lo
hacía.

**Ya está concretado.** El fisio dijo qué echaba en falta: *"no se mueve en
bloque, todo debe moverse, porque solo se mueve la parte de arriba de la
columna y no todo"*, y lo apoyó con la secuencia de la Université Lyon sobre
el **ritmo húmero-escápulo-raquídeo**, que nombra los dos bloques que
intervienen en el desplazamiento del tronco: *"el raquis lumbar (RL)"* y *"el
raquis torácico (RT)"*.

**Tenía razón, y se medía.** La inclinación contralateral del tronco al final
del arco estaba puesta sobre **cinco vértebras dorsales altas** (T6..T2) y
sobre nada más. `scripts/measure-trunk-lean.mts` (nuevo) posa el rig y mide,
vértebra a vértebra, cuánto gira cada nivel y cuánto se desplaza su cuerpo:

> **Antes, a 180°:** 5 de 21 niveles se movían. De L5 a T7 —once vértebras—
> el desplazamiento era **0,00 cm**: una tabla rígida con una bisagra en T6,
> que es exactamente lo que él vio.

**Corregido:** la inclinación se reparte ahora por **todo el raquis**, doce
dorsales (T12..T1) y cinco lumbares (L5..L1). Y no a partes iguales: la
capacidad de inclinación lateral es de ~30° en toda la dorsal (12 niveles,
~2,5° cada uno) frente a ~25° en la lumbar (5 niveles, ~5°), así que **un
nivel lumbar dobla a uno dorsal**. Repartir un ángulo plano por vértebra
sería el mismo error en versión sutil: doblaría la dorsal media, que es
rígida, tanto como la lumbar.

El **total no cambia** (~27° a 180°): esos grados se reparten *dentro* del
ángulo goniométrico, no se suman encima, así que redistribuirlos no mueve la
lectura de húmero / escápula / tronco.

> **Después, a 180°:** 17 de 21 niveles participan y el desplazamiento sube en
> rampa continua desde el sacro —L1 1,29 cm, T8 5,24 cm, T1 11,58 cm, C1
> 16,23 cm— con 26,2° de inclinación total. La columna describe una curva, no
> un codo.

- **Dónde:** `src/lib/biomech/shoulderChain.ts`
  (`G_SPINE_THORACIC_PER_VERT` / `G_SPINE_LUMBAR_PER_VERT`,
  `THORACIC_LEAN_VERTS` / `LUMBAR_LEAN_VERTS`), `src/lib/boneMap.ts`
  (los objetivos `thoracic` y `lumbar` de la cadena).
- **De paso:** `scripts/sweep-shoulder-arc.mts` medía la separación de la
  escápula contra una **nube de costillas en reposo**, tomada una sola vez.
  Servía mientras el tórax casi no se movía; con el tronco inclinándose de
  verdad, una escápula perfectamente apoyada marcaba **10,5 cm de despegue**
  que no existía. Ahora la nube se reconstruye en cada pose, y la columna dice
  lo que promete: la escápula se queda en 2,4 cm a 180°, igual que antes.
- **Estado:** ✅ hecho — 300 pruebas en verde, build correcto, `audit-data`
  con 0 errores y 0 avisos.

### 14 · Las rotaciones interna y externa están mal
> *"Rot int y ext mal"*

**Dos fallos, y el segundo escondía al primero.**

1. **Se mostraban con el codo estirado.** Con el codo recto, la rotación del
   húmero es un cilindro girando sobre su propio eje: no se aprecia nada. La
   medida lo confirma — la torsión seguía al ángulo pedido con 0,0° de error
   mientras el brazo se veía **idéntico** a 0° y a 40°. Y la propia ficha de
   `shoulderRom.ts` ya enseñaba lo contrario: *"evaluada con el codo
   flexionado a 90° y pegado al cuerpo"*. La app decía una cosa en el texto y
   mostraba otra en el 3D.
2. **Los dos sentidos estaban intercambiados.** Al poner el codo a 90° se
   hizo visible. Medido sobre el rig (vector codo→muñeca, componente lateral,
   los dos lados): la "rotación externa" llevaba la mano **hacia dentro**
   (−0,87 a 80°) y la "interna" **hacia fuera** (+0,92 a 70°). Exactamente al
   revés. El fallo sobrevivió tanto tiempo justo porque la postura de codo
   recto lo hacía invisible.

**Corregido:**
- Concepto nuevo de **posición de exploración** en `boneMap` (`ExamPosture`):
  una articulación que se mantiene fija durante todo el arco, incluido el 0°,
  porque es la posición en la que se lee el movimiento. Distinto de un
  acoplamiento, que sigue al ángulo.
- Signos invertidos en las dos rotaciones. Y con ellos el de la **rotación
  externa obligatoria de la elevación**, que el propio comentario del código
  decía alinear con la rotación externa: mientras estuvieron cambiadas, la
  elevación rotaba el húmero **hacia dentro**, lo contrario de lo que esa
  rotación existe para hacer.
- Rango de rotación interna 100° → **70°**. Los 100° son con la mano por
  detrás de la espalda (lo dice la propia ficha); con el codo a 90° al
  costado, el antebrazo llega a la barriga y más allá la atraviesa.
- El panel explica ahora por qué el modelo arranca con el codo doblado.

| Medida (vector codo→muñeca, lateral) | Antes | Ahora |
|---|---|---|
| Rotación **externa** a 80° | −0,87 (hacia dentro) | **+0,91 (hacia fuera)** |
| Rotación **interna** a 70° | +0,92 (hacia fuera) | **−0,77 (hacia dentro)** |

- **Estado:** ✅ hecho — medido en ambos lados, 234 pruebas en verde.
- **Nota:** el espacio subacromial empeoró en esa métrica al invertir el
  signo de la cadena. Es un artefacto: mide el punto más cercano entre dos
  huesos enteros, y a 180° el húmero está legítimamente pegado al acromion.
  La interpenetración real sigue en 0,00. Conviene que lo mires en pantalla.

### 13 · La flexión está mal
> *"flexión mal el mov"*

**Parcialmente corregido.** Lo descartado, con medida:

- **No es el ángulo.** El brazo clava el ángulo pedido con 0,0° de error en
  todo el arco.
- **No se sale del plano.** El brazo apenas se desvía respecto a su propio
  hombro; lo que se mueve es el hombro entero (4,5 cm hacia dentro, 8,8 cm
  hacia arriba a 180°), y eso es geometría correcta de una clavícula que se
  eleva. Flexión y abducción se comportan **idénticamente** ahí.
- **La piel no se rompe.** El sobre cutáneo está entero durante todo el arco.

**Corregido — la piel de transición estaba soldada a la columna.** Entre el
pecho y el deltoides hay una tira de piel (triángulo deltopectoral y fosa
infraclavicular) cuya función es estirarse sobre un hombro que se mueve. Las
dos venían cosidas al 100 % a una vértebra (`vert_T3` y `vert_T2`), el mismo
fallo que la clavícula. Al flexionar, la piel del deltoides se iba con el
húmero y la tira se quedaba.

Corregirlo costó tres intentos, y los dos primeros enseñan por qué el
reparto hay que **derivarlo** y no elegirlo:

| Intento | Peor apertura a 180° |
|---|---|
| Original (tira soldada a la vértebra) | 14,84 cm |
| Degradado medial→lateral por su anchura | 14,15 cm (abrió otra costura) |
| Degradado hacia la escápula | 10,34 cm |
| **Heredando la mezcla real del vecino** | **9,69 cm** |

La tira hereda ahora a sus vecinos: cada vértice mira la piel que se queda en
el tórax y la que viaja con el hombro, y mezcla según cuál tiene más cerca,
copiando la mezcla de huesos del vecino sea cual sea (la piel del deltoides
es 60 % escápula / 40 % húmero, no escápula pura — por eso los intentos
anteriores no cerraban).

**El músculo que asomaba: los pesos estaban planos.**

Quedaba pendiente el músculo que se veía por delante de la piel entre 45° y
135°. `scripts/measure-muscle-spill.mts` (nuevo) lo mide: para cada vértice de
músculo que queda justo debajo de la piel, ajusta un parche local con los ocho
vértices de piel más cercanos y proyecta la diferencia sobre su normal. Positivo
= el músculo está por fuera.

> A 90° de flexión, seis músculos acababan ~1 cm **por fuera** de la piel
> habiendo estado ~2,7 cm por dentro en reposo: redondo mayor, subescapular,
> coracobraquial, supraespinoso, porción corta del bíceps y porción larga del
> tríceps. Los seis son **las paredes de la axila**.

La causa estaba en los pesos. Todos ellos **cruzan la articulación** —nacen en
la escápula y se insertan en el húmero— pero venían con **una sola mezcla plana
aplicada a la malla entera**:

| Músculo | Cómo venía | Dónde nace de verdad |
|---|---|---|
| Redondo menor | húmero 100 % | borde lateral de la **escápula** |
| Porción corta del bíceps | húmero 100 % | apófisis **coracoides** |
| Redondo mayor | húmero 50 % / escápula 50 % | ángulo inferior de la escápula |
| Coracobraquial | húmero 61 % / escápula 39 % | coracoides |
| Subescapular | escápula 65 % / húmero 35 % | fosa subescapular |
| Supraespinoso | escápula 67 % / húmero 33 % | fosa supraespinosa |

Una mezcla plana significa que **todos los vértices se mueven igual**, así que
el origen viaja con la inserción. El redondo menor, atado entero al húmero,
arrastraba su origen escapular hacia delante con el brazo. Medido, la diagonal
del coracobraquial pasaba de 14,9 cm en reposo a **18,9 cm a 135°** cuando el
músculo, siendo un flexor, tendría que **acortarse** en flexión.

**Corregido igual que la clavícula y las tiras de piel: derivando los pesos en
vez de elegirlos.** Cada vértice pregunta contra qué hueso está apoyado —la
escápula o el húmero— y se ata a ese, de modo que el origen se queda en su fosa,
el tendón viaja con el húmero y el vientre interpola. No hay nada ajustado a
mano por músculo: la misma regla le da al manguito un cuerpo escapular con
tendón humeral y al bíceps corto un anclaje coracoideo con vientre largo,
porque es donde la geometría los pone. **53 mallas** regraduadas, 0 saltadas.

| Medida | Antes | Después |
|---|---|---|
| redondo mayor a 90°, vértices fuera de la piel | 13 | **3** |
| redondo mayor a 90°, cuánto sobresale | 1,11 cm | **0,87 cm** |
| coracobraquial a 90°, cuánto sobresale | 1,07 cm | **0,95 cm** |
| peor exceso del arco, a 60° | 4,42 cm | **3,42 cm** |
| peor exceso del arco, a 90° | 3,78 cm | **3,55 cm** |
| peor exceso del arco, a 160° | 5,42 cm | **4,98 cm** |
| diagonal del coracobraquial a 135° | 18,9 cm | **14,1 cm** |
| diagonal del bíceps corto a 135° | 28,8 cm | **26,7 cm** |
| recorrido del redondo menor a 135° | se iba con el brazo | **se queda en la escápula** |

El redondo mayor sigue estirándose (14,7 → 22,3 cm de diagonal a 135°), y eso
**no es un fallo**: nace en el ángulo inferior de la escápula y se inserta en el
húmero, así que en flexión se alarga de verdad. Lo que ha dejado de pasar es que
su origen viajase con la inserción.

- **Dónde:** `src/lib/shoulderMuscleBinding.ts` (nuevo), llamado desde
  `RigModel` y desde el banco de medidas, como los otros dos arreglos de pesos.
- **Estado:** ✅ hecho — 306 pruebas en verde.

**La costura deltopectoral y la axila: eran el mismo fallo.**

Quedaban dos cosas, y resultaron ser una. La piel se publica como un **mosaico**
de ~250 regiones con nombre, cada una una malla aparte y cada una cosida a **un
solo hueso** por la pasada de "completar el esqueleto":

```
Deltoid_region_1            scapula 100 %
Lateral_region_of_thorax_1  vert_T9 100 %
Posterior_region_of_neck_1  vert_C1 100 %
Posterior_axillary_line     vert_T9 100 %
```

Las teselas **se tocan**: de 13 948 vértices de borde en todo el cuerpo, sólo 76
no tienen parche vecino, así que el sobre está cerrado en reposo. Pero dos
teselas que **comparten un vértice y siguen huesos distintos** tiran de ese
vértice en dos direcciones en cuanto algo se mueve, y el sobre se abre por las
juntas. Eso es un solo defecto con dos caras:

- **La costura deltopectoral.** El vértice de `Deltoid_region_3` en x 0,160 y
  1,357 es el mismo que uno de `Deltopectoral_triangle_1`; a 180° de flexión las
  dos copias acababan **9,69 cm** separadas. El puente anterior no podía
  cerrarlo, y ahora se ve por qué: **ese mismo vértice lo comparte también**
  `Lateral_region_of_thorax_1`, que va 100 % en una vértebra. A una regla que
  mezcla "hacia el vecino de hombro más cercano" se le estaba pidiendo estar en
  el tórax y en el brazo a la vez, y se quedaba a medias (vert_T3 65 % / escápula
  21 % / húmero 14 %), rompiendo por los dos lados.
- **La axila.** Su piel es `Lateral_region_of_thorax` y `Posterior_axillary_line`,
  las dos atornilladas a `vert_T9`, sobre músculo que viaja con el brazo (húmero
  62 % / escápula 38 %).

**Corregido dejando de tratarlas como superficies separadas** (`skinSeamRelax.ts`):

1. **Soldar.** Los vértices que coinciden en reposo pasan a ser **un nodo con un
   solo vector de pesos**, la media de lo que tenían sus miembros. Dos copias de
   un vértice con pesos idénticos caen en el mismo sitio en cualquier postura,
   así que una costura soldada **no puede abrirse** — no "se abre menos": no
   puede.
2. **Relajar.** Una soldadura cuyos miembros discrepaban deja un pliegue, así que
   los pesos se suavizan (Laplaciano) unos anillos alrededor de cada soldadura
   conflictiva, repartiendo el compromiso por un palmo de piel en vez de por una
   arista.

Todo lo que está lejos de una costura conflictiva se queda **exactamente como
venía**, así que la pasada no puede mover piel que ya estaba bien: 2 578
soldaduras, de ellas **676 conflictivas**, 162 mallas tocadas.

| Medida | Antes | Después |
|---|---|---|
| costura deltopectoral a 180° | 9,69 cm | **0,05 cm** (la de reposo) |
| costura deltopectoral a 45° | 2,69 cm | **0,05 cm** |
| peor costura de piel del hombro, todo el arco | hasta 3,4 cm | **0,2 cm** |
| peor costura a 180°, dónde | hombro | **en la cara** (nariz/órbita) |
| la axila a 90° | se veía dorsal ancho, serrato, intercostales | **cerrada** |

Que la peor costura del barrido pase a estar en la **cara** es la señal de que en
el hombro ya no queda ninguna abierta.

**El precio, y qué había detrás.** Al soldar, la piel del pliegue axilar anterior
pasó a acompañar en parte al brazo —que es lo que hace de verdad— y al hacerlo se
despegó del pectoral mayor: a 90° de flexión el haz clavicular quedaba **2,18 cm
por fuera** de la piel, donde antes quedaba ~1,0.

Persiguiéndolo aparecieron dos cosas, y la segunda es la buena.

**Primero, el valor de la soldadura era arbitrario.** Una soldadura conflictiva se
quedaba con la **media** de sus miembros. Eso aguanta la costura —cualquier valor
único la aguanta— pero no dice nada sobre dónde debe acabar la piel, y ser
arbitrario cuesta: la media le daba a la piel del pecho un tirón del ~50 % hacia
el húmero. La respuesta no arbitraria es la que usa el cuerpo: **la piel sigue al
tejido sobre el que se apoya**. Ahora una soldadura conflictiva toma la mezcla del
músculo o la fascia que tiene debajo (641 de 676 lo encuentran), y la media queda
sólo de reserva para donde no hay tejido blando a mano.

**Y segundo: el pectoral mayor no se movía.** Ni un milímetro. Medido, la diagonal
de su haz clavicular es **19,8 cm a 0° de flexión y 19,8 cm a 135°** — las tres
porciones van cosidas al 100 % a una sola vértebra. Un **motor primario de la
flexión** que se queda quieto mientras el brazo sube por encima de la cabeza es la
misma clase de fallo que la clavícula soldada a `vert_T1`, y el módulo del músculo
lo había aparcado por escrito como *"otro par de huesos, otro problema"*.

Lo era, y era peor. Ahora se gradúa de la pared torácica a su inserción, con dos
diferencias respecto al manguito:

- **El origen conserva la vértebra que ya tenía**, tomada por peso y no por
  nombre: en este rig no hay hueso "tórax" —el pecho lo mueve el raquis— así que
  sólo cambia el extremo de la inserción.
- **No es la regla de la razón entre dos distancias.** Esa vale para un músculo
  que va *entre* dos huesos, como el manguito. El pectoral es un abanico de varios
  palmos que converge en un tendón de unos 5 cm, y la malla del húmero recorre el
  brazo entero, así que por razón de distancias el húmero salía "cerca" de medio
  pecho: las fibras bajas se iban con el brazo y **empeoraban** el problema
  (2,34 cm a 90°). Lo que sigue al brazo es el tendón y las fibras que convergen
  en él, así que la parte humeral es una caída alrededor del hueso, no un reparto.

| A 90° de flexión, cuánto sobresale | Antes | Después |
|---|---|---|
| pectoral mayor, haz clavicular | 2,18 cm | **1,26 cm** |
| pectoral mayor, haz esternocostal | 1,81 cm | **1,19 cm** |
| coracobraquial | 1,18 cm | **0,92 cm** |
| peor exceso del arco, a 90° | 3,99 cm | **3,77 cm** |
| peor exceso del arco, a 120° | 4,43 cm | **3,64 cm** |
| la costura deltopectoral | 0,05 cm | **0,05 cm** (intacta) |

Y el pectoral **se mueve**: su diagonal deja de ser una constante y se acorta con
la flexión, que es lo que hace un flexor.

Lo que queda es ruido de fondo del modelo de origen: triángulos sueltos de músculo
asomando unos milímetros, que ya están en la postura de reposo. El desgarro
grande, la ventana al tórax y el pliegue despegado, no.

**Y un fallo mío de la tanda anterior, corregido aquí.** Al medir el coste de
carga de las cuatro pasadas de pesos salió que la del músculo tardaba **22,3
segundos**: su búsqueda de "hueso más cercano" recorría capas de una rejilla de
1 cm hasta 30 capas —27 000 celdas— por cada vértice lejano a uno de los dos
huesos. Como al degradado sólo le importa la **razón** entre las dos distancias,
la superficie de cada hueso se reduce ahora a 600 puntos y la distancia se
satura a 15 cm. Las cuatro pasadas juntas: **22,6 s → 0,65 s**, con las mismas
medidas (la diagonal del coracobraquial sigue en 14,1 cm a 135°).

### ⚠️ Aviso sobre el instrumental

En medio de esto me equivoqué de diagnóstico: `render-pose` reutilizaba las
normales de la pose de reposo, así que un miembro muy rotado se sombreaba
como si no se hubiera movido. Eso pinta facetas y placas oscuras que **son
indistinguibles a ojo de una piel rompiéndose**, y me llevó a dar por roto un
sobre cutáneo que estaba entero. El renderizador recalcula ya las normales
desde los triángulos posados. Cualquier conclusión visual anterior a ese
arreglo hay que mirarla con desconfianza; las **medidas** no se ven afectadas,
porque salen de posiciones, no de sombreado.

### 16 · Los huesos se atraviesan, no se mueven en conjunto
> *"el mov de los huesos se atraviesa, no se mueve en conjunto"*

**Causa encontrada — la clavícula estaba soldada a la columna.** No era el
ritmo escapulohumeral, que sí existía: era que la clavícula no participaba.

1. La malla de las dos clavículas venía del GLB cosida al **100 % a
   `vert_T1`** (la pasada v11 de "completado de esqueleto" ligó cada hueso
   suelto a su hueso *más cercano*, y el más cercano a la clavícula es una
   vértebra). Medido sobre el GLB: el extremo lateral de la clavícula
   recorría **0,00 cm** en todo el arco de 0° a 150°.
2. El hueso `clavicle` sí existe en el rig — es la **raíz** de la cadena
   `clavicle → scapula → humerus_gh` — pero `boneMap` nunca lo accionaba: los
   ~60° de rotación ascendente se los quedaba entera la escápula.

Resultado: la escápula rotaba saliéndose de una clavícula atornillada al
tórax, la articulación acromioclavicular se abría, y la cintura se
atravesaba a sí misma en vez de moverse como una pieza.

**Corregido:**
- `src/lib/clavicleBinding.ts` — la malla se religa a su propio hueso
  (empalmando el hueso en el esqueleto de la columna, que no lo tenía).
- `src/lib/biomech/shoulderChain.ts` — los ~60° escapulotorácicos se reparten
  entre la **esternoclavicular** (~28°, pronto en el arco) y la
  **acromioclavicular** (~32°, tarde), según Inman / Ludewig / Neumann, más
  ~20° de retracción clavicular. La suma no cambia, así que las cifras
  citadas del panel siguen siendo las mismas.
- `src/lib/biomech/scapulaWrap.ts` — tabla de envoltura **resuelta de nuevo**
  contra la cadena real (`scripts/solve-scapula-wrap.mts`).

| Medida (abducción, lado derecho) | Antes | Ahora |
|---|---|---|
| Recorrido de la clavícula a 150° | 0,00 cm | **8,36 cm** |
| Separación AC a 120° | −0,23 cm | **−0,06 cm** |
| Despegue de la escápula (peor del arco) | 2,4 cm | **2,2 cm** |
| Error del brazo respecto al ángulo pedido | 0,0° | 0,0° |

- **Estado:** ✅ hecho — 229 pruebas en verde, izquierdo y derecho medidos.
- **Pendiente dentro de esta nota:** el espacio subacromial sigue cerrándose
  a 0,06 cm entre 60° y 90°. La cabeza humeral aún roza el acromion en pleno
  arco doloroso, porque la rotación externa obligatoria no arranca hasta 90°.

### 17 · En el movimiento quiere ver la biomecánica
> *"en el mov quisiera ver la biomecánica"*

Existe `BiomechanicsGuide` / `BiomechanicsSchematic`, pero no se muestra
mientras se reproduce el movimiento.

- **Dónde:** `src/components/BiomechanicsGuide.tsx`, `MovementView.tsx`,
  `src/lib/biomech/shoulderChain.ts`, `src/lib/boneMap.ts`
- **Estado:** ✅ hecho — el desglose SC/AC en el panel del ritmo y, sobre
  todo, el reparto de la inclinación del tronco por todo el raquis. Ver la
  ficha completa en el bloque de arriba.

---

## 3. Tests ortopédicos

### 21 · Los tests no están bien hechos — «todos se ven iguales»
> *"test no están bien hechos"*, y en persona: *"todos hacen lo mismo, no veo
> la diferencia"*

**Tenía razón, y era medible.** La demo de cada test llevaba **un solo
movimiento base y un ángulo**. Todo lo que distingue una maniobra —la
rotación interna forzada de Hawkins, la externa de la aprensión, el pulgar
abajo de Jobe— vivía únicamente en el **texto de la nota**, nunca en el
modelo.

`scripts/measure-test-poses.mts` (nuevo) posa el rig en cada test y compara
las posiciones par a par. Antes:

> ⚠️ **18 pares por debajo de 4 cm.** Y no "parecidos": **0,0 cm**.
> `arco doloroso`, `lata vacía`, `brazo caído`, `aprensión`, `recolocación` y
> `sorpresa` eran **la misma pose exacta**. `Hawkins`, `O'Brien` y `Speed`,
> otra.

**Corregido:** la demo lleva ahora los **componentes** de la maniobra —
articulaciones sostenidas mientras el movimiento base recorre su arco—
expresadas como movimientos clínicos, no como huesos y ejes, para reutilizar
los signos por lado que `boneMap` ya resolvió. Cada componente sale del texto
`maneuver` **del propio test**:

| Test | Base | Lo que lo hace ser él |
|---|---|---|
| Neer | flexión 160° | + rotación interna 60° |
| Hawkins | flexión 90° | + codo 90° + rotación interna 70° |
| Lata vacía (Jobe) | abducción 90° | + rot. interna 70° + pronación 80° (pulgar abajo) |
| Aprensión | abducción 90° | + codo 90° + rotación externa 80° |
| O'Brien | flexión 90° | + rot. interna 60° + pronación 80° |
| Speed | flexión 90° | + supinación 80° |
| Lift-off / belly-press | rot. interna 90° / 45° | + codo 90° |

**De 18 pares idénticos a 4** — y los 4 que quedan **son clínicamente
correctos**, así que no los he falseado, los he explicado:

- **Arco doloroso y brazo caído** son los dos 90° de abducción. Lo que cambia
  no es dónde está el brazo, sino que uno sube activamente y el otro controla
  el descenso.
- **Aprensión, recolocación y sorpresa** son **tres pasos en una misma
  posición**; lo único que cambia es la mano del explorador.

Las notas de esos cinco tests lo dicen ahora explícitamente, así que "se ven
iguales" pasa de ser un fallo a ser un hecho que se enseña.

Un fallo mío por el camino: mi primera métrica medía orígenes de hueso, que
están **sobre** el eje de la pronosupinación, así que daba por iguales un
antebrazo con el pulgar abajo y otro con la palma arriba. Corregida con
puntos de sonda fuera del eje.

- **Dónde:** `src/types/orthopedicTest.ts`, `src/data/orthopedicTests/shoulder.ts`,
  `src/components/movement/RigModel.tsx`, `scripts/measure-test-poses.mts`
- **Estado:** ✅ hecho — 6 pruebas nuevas que impiden añadir un test sin maniobra propia.

### 19 · No se explican los tests
> *"no explicas los tests ortopédicos"*

El dato `purpose` existe desde siempre y su comentario dice literalmente *"una
línea: qué intenta detectar el test"*. **Solo se veía abriendo la ficha.** La
lista mostraba nombre, estructura diana y una fila de números; para saber qué
hace una prueba había que desplegarla.

Y había algo peor. En **modo examen**, el bloque que te pide predecir la
sensibilidad y la especificidad se pintaba **por encima** de "Objetivo" y
"Maniobra". Es decir: te pedía juzgar la precisión de una prueba **antes** del
texto que dice qué es y cómo se hace. Eso no es estudiar, es adivinar.

**Corregido:**
- `purpose` sale ahora en la fila cerrada, que es donde se decide si una prueba
  interesa.
- El bloque de predicción baja **detrás** de Objetivo → Maniobra → Positivo.
  "Interpretación" sigue oculta hasta revelar: esa sí es la respuesta.

- **Estado:** ✅ hecho

### 22 · "Examen" y "Guía": no se sabe para qué son
> *"Examen y guía no sé para qué es (tests ortopédicos)"*

Tres causas, y ninguna era el contenido:

1. **Lo que hacía cada botón vivía en un `title`**, es decir, solo al pasar el
   ratón. En una tablet no aparece nunca, y de un vistazo tampoco.
2. **La guía se descarta para siempre** (`localStorage`). Después de cerrarla
   una vez, "Guía" queda como un botón sin significado visible.
3. **La guía no mencionaba el modo Examen.** Sus cinco pasos hablaban del
   pre-test, de sensibilidad/especificidad, de Combinar y de Demostrar — del
   botón de al lado, nada.

**Corregido:**
- Paso 6 en la guía, explicando qué es Examen y **para qué sirve**: comprobar
  si sabrías *elegir* la prueba adecuada, no solo leerla.
- Con el modo activo, una tira bajo la cabecera explica por qué los números
  están ocultos y qué se espera que hagas — donde se lee, no al pasar el ratón.
- Los `title` de ambos botones dicen ahora qué hacen, no cómo se llaman.
- El paso de Demostrar menciona que cada prueba tiene **su propia** maniobra,
  que es lo que la nota 21 acaba de hacer cierto.

- **Dónde:** `src/components/movement/OrthopedicTestsPanel.tsx`
- **Estado:** ✅ hecho — 5 pruebas nuevas que impiden que una prueba se quede
  sin explicación en los datos.

### 20 · Especificidad y sensibilidad no se entienden
> *"no está muy entendible lo de especificidad y sensibilidad"*

El panel enseñaba el número, la etiqueta (`Confirma` / `Descarta` / …) y el
mnemotécnico (*SpPin*, *SnNout*) — y daba por sabido el resto. Un porcentaje
con un mnemotécnico latino al lado no explica qué acaba de decirte la prueba.

**Corregido:** debajo de cada cifra va ahora una frase en claro, construida
con el número **de ese test**, que cuenta a **quién falla**:

> Sensibilidad 79 % → *"De cada 100 personas que SÍ tienen la lesión, da
> positivo en 79. A 21 se le escapan."*
>
> Especificidad 59 % → *"De cada 100 personas que NO la tienen, da negativo en
> 59. 41 dan un falso positivo."*

La mitad que decide si puedes actuar sobre un resultado es la que el test
falla, y era justo la que no se decía.

- **Dónde:** `src/components/movement/OrthopedicTestsPanel.tsx`
- **Estado:** ✅ hecho — 5 pruebas propias.

---

## 4. Dermatomas y miotomas

### 23 · "Comparar" y los miotomas que no se demostraban
> *"Comparar no sé para qué es (dermatomas y miotomas). C5 no hay flexión de
> codo. C6 no hace extensión de muñeca. C7 no hay extensión de codo"*

**Las tres líneas del miotoma eran ciertas, y ninguna era un error de datos.**
El texto listaba los movimientos correctos; lo que fallaba era la demo.

| Raíz | Qué pasaba | Ahora |
|---|---|---|
| **C5** | El miotoma es deltoides **y** bíceps, y la demo solo abducía | Sostiene el codo a 90° durante el arco: los dos músculos clave a la vez |
| **C6** | Demo de flexión de codo, con una nota diciendo que la extensión de muñeca *"no se puede reproducir aquí"* | **La muñeca sí estaba en el rig, solo que nunca se había mapeado.** Ahora la demo es extensión de muñeca, su movimiento clave |
| **C7** | `elbow-extension` a 120° **y se detenía ahí** — un codo doblado bajo la etiqueta "extensión de codo" | Arranca flexionado y **termina recto**: la extensión es el recorrido hacia 0° |

Medido después de corregir, en el punto donde la demo se detiene:

> C5 → codo a **100°** junto a la abducción · C6 → muñeca **62°** fuera del
> eje · C7 → codo a **13°** (recto)

Lo de C7 era un fallo estructural, no un ángulo mal puesto: en el codo y en la
rodilla, 0° **es** la articulación extendida, así que la extensión es el
regreso hacia 0. El propio `boneMap` ya lo decía por escrito ("started from the
flexed end") pero la animación no lo hacía. Ahora esos movimientos llevan
`arcFrom: 'max'` y la reproducción va del extremo flexionado hacia 0, con la
pausa larga **al final** del movimiento que se nombra.

**Y la muñeca es nueva.** `hand_flex` estaba en el rig desde el principio sin
mapear. Los ejes se midieron sobre el GLB, y el sentido se resolvió con la
anatomía del **propio modelo**, no a ojo: las estructuras palmares (retináculo
flexor, tenar, hipotenar) están a z=+1,8 cm en el sistema local de la mano y
las dorsales a 0, así que la palma mira al +Z local; girar +40° en X lleva los
dedos 5 cm hacia el dorso, que es la extensión. Sale igual en ambos lados.

**"Comparar no sé para qué es":** mismo patrón que la nota 22 — la explicación
vivía en un `title`, invisible al tacto. Y el tooltip decía lo que el botón
*hacía* sin decir **por qué querrías hacerlo**. Ahora, con el modo activo, una
línea explica que los dermatomas **se solapan**, que por eso un déficit
sensitivo casi nunca cae en un solo nivel, y que el territorio propio de cada
raíz es el que orienta.

- **Dónde:** `src/lib/boneMap.ts`, `src/data/neuro/cervical.ts`,
  `src/types/neuro.ts`, `src/components/movement/NeuroPanel.tsx`
- **Estado:** ✅ hecho — 9 pruebas nuevas del miotoma.

### 24 · El espacio de dermatomas y miotomas es diminuto
> *"muy pequeño espacio de dermatomas y miotomas"*

La causa es de reparto, no de tamaño: las **dos vistas van lado a lado** en un
carril estrecho, así que cada figura se queda con media anchura y las bandas
del antebrazo salen de unos pocos píxeles. Subir el tope de alto ya se intentó
antes (`da6f04e`) y el propio comentario del código explica el límite: a su
altura natural la lámina empuja la lista de raíces fuera de una pantalla de
portátil.

**Corregido sin romper ese equilibrio:** botón **"Ampliar"**. La lámina pasa a
**una sola columna a lo ancho del panel** y el tope de alto sube de
`min(38vh, 19rem)` a `min(72vh, 34rem)`. Cada figura gana el doble de anchura
y bastante más de alto; a cambio el panel hace scroll, que es justo la
concesión que el modo compacto evita — y la correcta cuando la lámina es a lo
que has venido. El comportamiento por defecto no cambia.

- **Dónde:** `src/components/movement/DermatomeMap.tsx`
- **Estado:** ✅ hecho

---

## 5. Interacción y modos

### 9 · En "Explorar" no se puede diseccionar capa por capa
> *"En explorar no se puede diseccionar, no se ve capa por capa"*

**Sí se puede, y con ocho paradas.** `DepthPeeler` está en Explorar y pela el
cuerpo piel → órganos → vasos → nervios → músculos → ligamentos → esqueleto,
con su etiqueta en cada nivel.

El problema era que **la palabra "disección" no aparecía en ninguna parte de la
pantalla**: el control se titulaba "Profundidad", vivía dentro de una sección
llamada "Vista y capas" plegada por defecto, y "disección" existía solo en un
`aria-label`. Quien la busca no la encuentra y concluye que no está.

**Corregido:** la sección pasa a llamarse **"Capas y disección"**, el control
**"Disección por capas"**, y lleva una línea que dice qué hace arrastrarlo.

- **Estado:** ✅ hecho

### 10 · No se entienden los porcentajes
> *"no entiendo los porcentajes"*

Hay que localizar de qué porcentajes habla (contribución muscular en el
movimiento, probabilidad post-test, o progreso) y explicarlos donde salen.

- **Estado:** ⚠️ **hace falta que lo concrete** — la nota no dice dónde

### 15 · No se entiende el modo paciente
> *"no entiendo el modo paciente"*

No hay un "modo paciente": hay un botón **"Exportar"** que genera una ficha
PNG. Y ahí estaba el problema — la fila decía solo "Exportar", y al abrirla
saltaba directa a un campo de nota y un botón de descarga. Qué produce la
función había que **deducirlo del texto de ejemplo del campo**.

**Corregido:** la fila se llama ahora **"Ficha para el paciente"**, y antes del
campo de nota una línea dice qué sale: foto de la postura actual, movimiento y
rango, músculos que trabajan y tu nota, en lenguaje llano, para imprimir o
mandar — y que se genera en el propio equipo sin que salga nada a internet.

- **Estado:** ✅ hecho

### 18 · No se entienden las patologías en el modelo 3D
> *"no entiendo las patologías en el modelo 3D"*

La fila de patologías se titula "Estado clínico" y es un juego de fichas
(Normal · cuadros). **En el punto de elegir no se dice qué le hace al modelo.**
La explicación existe —el panel del ritmo saca una banda ámbar con el cuadro,
por qué duele, la estructura clave y su fuente— pero **solo después** de
haberla activado, que es tarde para entender qué estás activando.

**Corregido:** una línea bajo "Estado clínico" dice qué cambia al elegir un
cuadro: el modelo se mueve **con ese patrón alterado** (cambia el ritmo entre
húmero y escápula, se limita el rango) y las estructuras implicadas se marcan
en la escena.

- **Estado:** ✅ hecho

---

## 6. Rendimiento y acabado

### 1 · Lento
> *"lento"*

Medido antes de tocar nada, y el reparto no deja lugar a dudas:

| Recurso | Tamaño |
|---|---|
| `modelo-opt.dec.glb` (Explorar) | **27,3 MB** |
| `cuerpo-rig.opt.glb` (laboratorio) | **18,2 MB** |
| `anatomy-index.json` | 1,3 MB |
| Bundle JS más grande | 0,95 MB |

Los modelos son **45 MB**, cuarenta veces el mayor trozo de código. Y estaban
cacheados **un solo día, con `must-revalidate`**: pasado ese día, cada visita
volvía a pagarlos enteros.

**Corregido:** `stale-while-revalidate` de una semana. El visitante que vuelve
recibe el modelo **al instante desde caché** mientras se revalida por detrás,
así que después de la primera carga nadie vuelve a esperar por él, y un modelo
reexportado sigue llegando a todos en su siguiente visita. No uso `immutable`
a propósito: los nombres no llevan hash de contenido y dejaría un modelo
corregido atrapado en cachés durante un año. Los archivos de `/assets` sí lo
llevan, así que esos se cachean para siempre.

### La primera carga: medida en un navegador de verdad

Lo de arriba estaba estimado **desde el tamaño de los ficheros en disco**, que no
es la misma pregunta. `scripts/measure-first-load.mts` (nuevo) sirve el `dist/`
real por HTTP y lanza un Chromium contra él, así que la respuesta sale del
registro de red y no de un `ls`. Y la premisa era falsa:

| Momento | Lo que baja de verdad |
|---|---|
| Aterrizar en la portada | **1,9 MB**, primer pintado a **0,43 s** |
| Entrar al explorador 3D | + el modelo del atlas |
| Entrar al laboratorio | + el rig, **sólo si entras** |

**Los 45 MB nunca fueron la primera carga.** Los dos modelos son perezosos: no se
piden hasta que se abre una vista 3D, se pide **uno solo** —el de la vista en la
que estés— y el aviso de uso educativo va delante de todo, así que ni siquiera
compiten con el primer pintado. Después de la primera vez los sirve el service
worker desde caché durante 60 días, sin red.

**La decisión: no decimar más.** El modelo del atlas ya va decimado un 56 % y
codificado con meshopt, y bajar de ahí se ve. No hace falta, porque el 43 % de lo
que viaja por el cable **no es geometría**:

| Modelo | Como iba | Comprimido |
|---|---|---|
| `modelo-opt.dec.glb` | 27,3 MB | **15,5 MB** (56 %) |
| `cuerpo-rig.opt.glb` | 18,2 MB | **10,7 MB** (59 %) |

meshopt está **diseñado** para ir acompañado de compresión de transporte —
reordena los vértices para que un compresor genérico remate el trabajo — y el
*chunk* JSON de cada modelo (5,8 y 5,0 MB) no lo toca en absoluto. Así que los
bytes están ahí, gratis y sin coste visual ninguno.

El problema es que comprimir el transporte lo decide el CDN, no nosotros, y
`model/gltf-binary` no es un tipo que los CDN compriman de forma fiable. En vez
de depender de un comportamiento que desde el repositorio no puedo ni ver, **la
compilación escribe un `<nombre>.glb.gz` junto a cada modelo** y el navegador lo
descomprime con su propio `DecompressionStream`. Si el `.gz` no está —en
`vite dev`, o en un despliegue anterior a esto— la carga cae sola al `.glb` de
siempre.

**Medido en el navegador**, entrando a `/hombro/explorar`:

| | Antes | Después |
|---|---|---|
| entrar al explorador | 30,5 MB | **18,6 MB** |
| el modelo | 27,31 MB | **15,48 MB** |
| primer pintado de la portada | 0,43 s | **0,43 s** (sin cambio) |

Y que lo que se descomprime son **los mismos bytes** no es una impresión: el
SHA-256 del `.gz` inflado es idéntico al del `.glb`, en los tres modelos. La
caída al `.glb` también está comprobada borrando los `.gz` y volviendo a medir:
30,5 MB y la aplicación monta igual.

- **Dónde:** `vercel.json`, `vite.config.ts`, `src/lib/compressedGLTF.ts`,
  `scripts/measure-first-load.mts`
- **Estado:** ✅ hecho — decisión tomada: la calidad visual se queda donde está y
  el 43 % sale del transporte.

⚠️ **Un hallazgo de paso, no un defecto comprobado.** En este entorno el primer
pintado tardaba 12,9 s, y resultó ser el proxy de la caja colgando la llamada a
Supabase: haciéndola fallar al instante, el pintado baja a 0,19 s. No es un fallo
de la aplicación. Pero sí enseña que **el primer pintado espera a una llamada de
terceros**: si Supabase va lento para alguien, ve la página en blanco mientras
tanto. No lo he tocado — queda apuntado.

### 7 · Borroso al alejar o acercar
> *"Borroso se aleja o acerca"*

**Es deliberado, y estaba demasiado agresivo.** Los dos visores llaman a
`regress()` en **cada** cambio de cámara, lo que baja la resolución mientras te
mueves y la restaura al parar. Un zoom —un gesto cuyo propósito entero es mirar
de cerca— pasa por tanto toda su duración en resolución reducida, más los
200 ms de rebote de r3f.

El propio código ya había llegado a esta conclusión una vez: los móviles están
**exentos** de esta mitad porque *"a 0,5 el modelo se rompía visiblemente en
cada pellizco"*, y el comentario dice que quitar el raycast es gratis y bajar
la resolución no.

**Corregido:** el suelo sube de `0,5` a `0,75` y el rebote baja de 200 ms a
120 ms, en los dos visores. El coste de esta escena son miles de mallas con su
propio material clonado — está limitada por *draw calls*, no por relleno — así
que reducir píxeles apenas movía los fotogramas mientras se veía perfectamente.

⚠️ Es un cambio de configuración que **no he podido comprobar en pantalla**
desde aquí. Que lo mire él.

- **Dónde:** `src/components/Viewer3D.tsx`, `src/components/movement/RigViewer.tsx`
- **Estado:** ✅ hecho, pendiente de que lo confirme en pantalla

### 12 · A 240° se corta el texto
> *"en 240° se corta el texto"*

No hay ningún valor de 240 en los datos de hombro: lo más probable es que
sea el **giro de cámara** — al pasar de cierto ángulo, las etiquetas del
margen se recortan.

- **Dónde:** `src/components/AtlasLabels.tsx`
- **Estado:** ⚠️ **por reproducir**

---

## 7. Contenido de apoyo

### 5 · Faltan las posiciones funcionales
> *"Posiciones funcionales ✗"*

La sección **"Posiciones funcionales"** (acortado / estirado, con su fuente)
existe y se pinta en el panel de detalle. Lo que había era un **hueco**: 16 de
los 18 músculos del hombro la tenían, y faltaba en `subclavius` y `omohyoid`
— en los que la sección desaparecía entera sin decir por qué.

**Completados los dos**, con el mismo estándar de citación que el resto
(`pageVerified: false`, como todas las fichas del archivo).

Un matiz que puede ser lo que vio: la sección se pinta **plegada** por
defecto, al contrario que "Origen" e "Inserción", que llevan `defaultOpen`.

- **Estado:** ✅ los 18 músculos la tienen ya. Si su ✗ era por lo plegado, se
  cambia en una línea — que lo confirme.

### 6 · Relevancia clínica: verificar fuentes
> *"Relevancia clínica → verificar fuentes"*

Continúa el trabajo de `docs/verificacion-hombro-rodilla.md`, ahora sobre los
bloques de relevancia clínica de las fichas de músculo (no solo los tests).

- **Dónde:** `src/data/shoulderMuscles.ts`, `src/data/references.ts`
- **Estado:** pendiente

---

## Lo que hay que preguntarle al fisio

1. **Punto 10 (porcentajes):** ¿en qué pantalla los vio? Sospecho que son los
   de reclutamiento muscular del panel del ritmo, que llevan al lado un aviso
   de que son un modelo y no un EMG medido — si son esos, el aviso no está
   funcionando.
2. **Punto 12 (240°):** ¿es el giro de la cámara o un valor de un movimiento?
   No hay ningún 240 en los datos de hombro.
3. ~~**Punto 17 (biomecánica):** ¿qué esperaba ver?~~ **Contestado:** que el
   tronco no se moviera en bloque. Corregido y medido — ver la nota 17.
