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

### 13 · La flexión está mal
### 14 · Las rotaciones interna y externa están mal
> *"flexión mal el mov"* · *"Rot int y ext mal"*

Fallos de rig en tres movimientos base del hombro. Son los que más
credibilidad quitan: un fisio detecta al instante que el brazo no se mueve
como se mueve un hombro.

- **Dónde:** `src/lib/boneMap.ts`, `src/components/movement/RigModel.tsx`,
  `src/data/shoulderRom.ts`
- **Estado:** pendiente

### 16 · Los huesos se atraviesan, no se mueven en conjunto
> *"el mov de los huesos se atraviesa, no se mueve en conjunto"*

Falta el **ritmo escapulohumeral**: la escápula y la clavícula deberían
acompañar al húmero. Hoy el húmero se mueve solo y penetra la escápula.

- **Dónde:** `RigModel.tsx`, `ShoulderRhythmArc.tsx`, `RhythmReadout.tsx`
- **Estado:** pendiente

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
