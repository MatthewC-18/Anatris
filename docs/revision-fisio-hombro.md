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

El fisio comprobó dos piezas: el romboides sí aparece, la **clavícula no**.
La clavícula existe en el rig (`RigModel.tsx` la ligó en la pasada v11 de
completado de esqueleto) pero no es seleccionable ni aparece en la lista de
la región de hombro. Hay que auditar la región entera: qué huesos y músculos
del hombro se pueden ver y seleccionar, frente a la lista que debería haber.

- **Dónde:** `src/data/musclesByRegion.ts`, `src/data/shoulderMuscles.ts`,
  `src/components/movement/RigModel.tsx`, `src/components/MuscleList.tsx`
- **Estado:** pendiente

### 3 · Los músculos deberían agruparse, no ir por fibras
> *"3 músculos no por fibras sino en conjunto (deltoides ant, medio, post)"*

Hoy el deltoides se presenta separado por porciones. El fisio quiere el
músculo **como una unidad**, con las porciones dentro de su ficha, no como
tres entradas sueltas. Afecta también al pectoral mayor y al trapecio.

- **Dónde:** `src/data/shoulderMuscles.ts`, `src/types/muscle.ts` (ya
  contempla `clavicular / acromial / scapular-spinal parts`), `MuscleList.tsx`
- **Estado:** pendiente

### 4 · No hay nervios
> *"no hay nervios"*

No existe capa de nervios en el visor. Es la petición más grande del lote:
plexo braquial y nervios periféricos del hombro, al menos como capa
seleccionable con su recorrido. Se repite en el punto **26**.

- **Dónde:** capa nueva en el visor + datos nuevos
- **Estado:** pendiente

### 8 · Origen e inserción: puntos enormes, y el del pectoral está mal
> *"Origen: puntos muy grandes, no se diferencia. Inserción se repite
> (pectoral) ✗ está mal puesta"*

Tres cosas distintas:
1. Los marcadores son tan grandes que **origen e inserción no se distinguen**.
2. La inserción **se repite** (aparece más de un marcador donde debería
   haber uno).
3. La del **pectoral mayor está en el sitio equivocado**. El dato de texto
   ("cresta del troquíter") es correcto; lo que falla es dónde se pinta.

- **Dónde:** `src/components/AttachmentMarkers.tsx`,
  `src/data/attachmentLandmarks.ts`
- **Estado:** pendiente

### 25 · No están todos los dermatomas ni todos los miotomas
### 26 · No hay nervios
> *"no están todos los dermas y mios"* · *"no hay nervios"*

- **Dónde:** `src/data/neuro/cervical.ts`, `src/data/neuro/plate.ts`
- **Estado:** pendiente (26 es el mismo trabajo que el punto 4)

---

## 2. Movimiento y biomecánica

### 11 · En el movimiento deberían aislarse los músculos
> *"en el mov deberían aislarse los músculos"*

Durante la reproducción no se puede dejar un músculo solo para ver qué hace.

- **Dónde:** `src/components/movement/MovementView.tsx`, `MuscleBands.tsx`
- **Estado:** pendiente

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

- **Estado:** pendiente. Lo medido hasta ahora: el brazo **sí** clava el
  ángulo pedido (0,0° de error en todo el arco) y no se sale del plano
  sagital, así que no es el ángulo. Dos pistas: (a) la corrección de
  puntería que necesita la flexión es enorme (−53° a 180° antes de aplicarla,
  frente a −9,7° en abducción), porque la rotación ascendente de la escápula
  se gasta fuera del plano sagital; (b) a 80° hay un pico de 4,1 cm de hueso
  asomando por encima del músculo que lo cubre. Falta decidir cuál de las dos
  es lo que vio el fisio.

- **Dónde:** `src/lib/boneMap.ts`, `src/components/movement/RigModel.tsx`

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

### 19 · No se explican los tests
### 21 · Los tests no están bien hechos
### 22 · "Examen" y "guía": no se sabe para qué son
> *"no explicas los tests ortopédicos"* · *"test no están bien hechos"* ·
> *"Examen y guía no sé para qué es (tests ortopédicos)"*

El punto 21 es el grave: la **ejecución** del test (posición, maniobra, qué
se considera positivo) no está bien descrita. El 19 y el 22 son de
presentación: no se explica el test antes de pedir que lo interpretes, y los
modos "Examen" y "Guía" no dicen para qué sirven.

- **Dónde:** `src/data/orthopedicTests/shoulder.ts`,
  `src/components/movement/OrthopedicTestsPanel.tsx`
- **Estado:** pendiente

### 20 · Especificidad y sensibilidad no se entienden
> *"no está muy entendible lo de especificidad y sensibilidad"*

Se muestran las cifras y la etiqueta (`rule-out`, `weak`…) sin explicar qué
significan para la decisión clínica.

- **Dónde:** `OrthopedicTestsPanel.tsx`
- **Estado:** pendiente

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

- **Estado:** pendiente

### 6 · Relevancia clínica: verificar fuentes
> *"Relevancia clínica → verificar fuentes"*

Continúa el trabajo de `docs/verificacion-hombro-rodilla.md`, ahora sobre los
bloques de relevancia clínica de las fichas de músculo (no solo los tests).

- **Dónde:** `src/data/shoulderMuscles.ts`, `src/data/references.ts`
- **Estado:** pendiente

---

## Dos cosas que hay que preguntarle al fisio

1. **Punto 10 (porcentajes):** ¿en qué pantalla los vio?
2. **Punto 12 (240°):** ¿es el giro de la cámara o un valor de un movimiento?
