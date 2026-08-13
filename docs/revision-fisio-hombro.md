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
| 13 · flexión mal | 🟡 parcial |
| 17 · ver la biomecánica | 🟡 necesita concreción |
| 3 · músculos por fibras | ⚠️ no reproducido |

Lo verificado en esta tanda: **264 pruebas** en verde, build correcto,
`npm run audit-data` con **0 errores y 0 avisos**, y las medidas del rig
(clavícula, separación AC, penetración) reconfirmadas en ambos lados.

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
### 26 · No hay nervios
> *"no están todos los dermas y mios"* · *"no hay nervios"*

- **Dónde:** `src/data/neuro/cervical.ts`, `src/data/neuro/plate.ts`
- **Estado:** pendiente (26 es el mismo trabajo que el punto 4)

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

- **Estado:** parcial — ⚠️ **hace falta que lo concrete.** "Ver la
  biomecánica" admite varias lecturas (¿los brazos de palanca? ¿las fuerzas?
  ¿la guía narrada de "Aprender" dentro del laboratorio?) y no quiero adivinar
  y construir la equivocada.

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

**Lo que queda:** hay músculo asomando por delante de la piel en el hombro
anterior entre 45° y 135°. Es un problema de músculo que sobresale del sobre,
no de piel rota.

- **Estado:** parcial. 239 pruebas en verde.

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

- **Dónde:** `src/components/BiomechanicsGuide.tsx`, `MovementView.tsx`
- **Estado:** pendiente

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
### 22 · "Examen" y "guía": no se sabe para qué son
> *"no explicas los tests ortopédicos"* ·
> *"Examen y guía no sé para qué es (tests ortopédicos)"*

Son de presentación: no se explica el test antes de pedir que lo interpretes,
y los modos "Examen" y "Guía" no dicen para qué sirven.

- **Dónde:** `src/components/movement/OrthopedicTestsPanel.tsx`
- **Estado:** pendiente

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

### 23 · "Comparar": no se sabe para qué es, y los miotomas no se demuestran
> *"Comparar no sé para qué es (dermatomas y miotomas). C5 no hay flexión de
> codo. C6 no hace extensión de muñeca. C7 no hay extensión de codo"*

Los **datos de texto son correctos** (`cervical.ts` lista flexión de codo en
C5, extensión de muñeca en C6, extensión de codo en C7). Lo que falla es la
**demostración en el modelo**: C5 solo enseña abducción, y C6 y C7 llevan una
nota de "no se puede reproducir". El fisio espera ver el movimiento del
miotoma, no leerlo.

- **Dónde:** `src/data/neuro/cervical.ts` (bloques `demo`),
  `src/components/movement/NeuroPanel.tsx`
- **Estado:** pendiente

### 24 · El espacio de dermatomas y miotomas es diminuto
> *"muy pequeño espacio de dermatomas y miotomas"*

Se trabajó en `da6f04e` ("la lámina deja de ser diminuta"), pero la revisión
es posterior: sigue quedándose corto.

- **Dónde:** `DermatomeMap.tsx`, `NeuroPanel.tsx`
- **Estado:** pendiente (revisar si `da6f04e` ya lo cubre en parte)

---

## 5. Interacción y modos

### 9 · En "Explorar" no se puede diseccionar capa por capa
> *"En explorar no se puede diseccionar, no se ve capa por capa"*

La disección existe en el Laboratorio (`DepthPeeler`, `LayerControls`), pero
no en Explorar, que es donde el fisio la buscó.

- **Dónde:** `src/components/AnatomyModel.tsx`, `DepthPeeler.tsx`
- **Estado:** pendiente

### 10 · No se entienden los porcentajes
> *"no entiendo los porcentajes"*

Hay que localizar de qué porcentajes habla (contribución muscular en el
movimiento, probabilidad post-test, o progreso) y explicarlos donde salen.

- **Estado:** ⚠️ **hace falta que lo concrete** — la nota no dice dónde

### 15 · No se entiende el modo paciente
> *"no entiendo el modo paciente"*

- **Dónde:** `MovementControls.tsx`, `RigViewer.tsx`
- **Estado:** pendiente

### 18 · No se entienden las patologías en el modelo 3D
> *"no entiendo las patologías en el modelo 3D"*

- **Dónde:** `src/data/pathologies.ts`, `RigOverlays.tsx`, `SelectionPanel.tsx`
- **Estado:** pendiente

---

## 6. Rendimiento y acabado

### 1 · Lento
> *"lento"*

- **Estado:** pendiente (medir primero: carga del `.glb`, no suponer)

### 7 · Borroso al alejar o acercar
> *"Borroso se aleja o acerca"*

Se tocó algo parecido en `0550966` (la reproducción bajaba la resolución en
móvil). Esta nota es posterior y habla del **zoom**, no de la reproducción.

- **Dónde:** `src/components/Viewer3D.tsx`, `CanvasLoader.tsx`
- **Estado:** pendiente

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
3. **Punto 17 (biomecánica):** ¿qué esperaba ver? ¿Brazos de palanca, fuerzas,
   o la guía narrada de "Aprender" dentro del laboratorio?
