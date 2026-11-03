# Revisión de los movimientos — regiones distintas al hombro

Sesión del **2026-11-03**. El hombro ya pasó por un fisioterapeuta
([`revision-fisio-hombro.md`](revision-fisio-hombro.md)) y quedó casi cerrado.
Las otras siete regiones nunca se habían mirado con ese criterio.

**Método:** posar el rig con el mismo `boneMap` que usa la app
(`scripts/render-pose.mts`) y **mirar los fotogramas**, movimiento por
movimiento, en los ángulos clínicos. Un movimiento puede medir perfecto y verse
roto; y, como se ve abajo, puede estar bien construido y aun así **no verse**.

---

## 1. El patrón que aparece una y otra vez

Tres movimientos distintos tenían el mismo fallo, y el repositorio ya lo había
resuelto una vez. El comentario de `ELBOW_AT_90` en `boneMap.ts` lo decía:

> *"La rotación del hombro se explora con el codo a 90°: el antebrazo es la
> aguja que marca el ángulo. Con el codo estirado el húmero gira sobre su
> propio eje y no se aprecia nada."*

Exactamente lo mismo pasaba, sin corregir, en:

| Movimiento | Qué se veía | Arreglado con |
|---|---|---|
| Rotación interna/externa de **cadera** | Nada. Los fotogramas a 0°, 20° y 40° son indistinguibles | `KNEE_AT_90` |
| Rotación tibial (**rodilla**) | Nada. 0°, 15° y 30° idénticos | `KNEE_AT_90` |
| **Pronosupinación** | Nada de frente con el brazo colgando | `ELBOW_AT_90` |

En los tres casos la cinemática ya era correcta: el hueso giraba sobre su eje.
Lo que faltaba era **la postura de exploración**, que es lo que convierte un
cilindro girando sobre sí mismo en un ángulo que se puede leer.

Y en el caso de la rotación tibial el propio código ya lo sabía: su comentario
decía *"shown with the knee straight; clinically it is assessed at 90 deg of
flexion"*. Estaba documentado como una diferencia aceptada. No lo es: si la
posición en la que se mide es otra, el modelo tiene que enseñar esa.

**Comprobado tras el cambio:** la rotación de cadera a 0/20/40° ahora mueve la
pierna visiblemente, y la pronación a 0/45/85° gira la mano con el codo a 90°,
que es la posición de goniometría.

---

## 2. El encuadre: el fallo de uso más grande que tenía el laboratorio

La cámara encuadraba **el cuerpo entero, siempre**. Elegir "Codo" y recibir una
figura de 1,75 m significa que la articulación que se estudia ocupa un 3 % del
lienzo, y que **todo el mundo tiene que hacer zoom a mano antes de poder leer
nada** — en una herramienta cuya propuesta entera es mirar una articulación de
cerca.

Medido (`scripts/measure-region-frame.mts`), el espacio que de verdad necesita
cada región, incluyendo todo el recorrido de su movimiento:

| Región | Caja necesaria | Contra el cuerpo entero |
|---|---|---|
| Codo | 0,53 × 0,51 m | **3,4× más cerca** |
| Tobillo | 0,16 × 0,37 m | ~5× |
| Rodilla | 0,19 × 0,79 m | ~2× |
| Cadera | 1,28 × 0,91 m | ~2× |
| Hombro | 1,34 × 1,22 m | ~1,4× (la elevación lleva la mano a 2,00 m) |

Ahora el laboratorio encuadra **los huesos de la región activa**
(`src/lib/labFraming.ts`), con un margen proporcional. La lista de huesos
incluye los segmentos que el movimiento arrastra —la mano para la elevación, la
pierna para la flexión de cadera— así que el miembro no se sale del encuadre a
mitad del arco.

Dos detalles que costaron una medición:

- Las vértebras están **todas en la línea media**, así que la caja de una región
  de columna mide 0,00 m de ancho. Una caja plana manda la cámara dentro del
  modelo; por eso hay un grosor mínimo.
- Se encuadra por huesos y no por mallas porque los nombres de malla de
  Z-Anatomy son inconsistentes entre lados; los huesos están verificados.

---

## 3. Un fallo heredado del muro de pago

En el laboratorio, un suscriptor veía **"Popliteus", "Semimembranosus",
"Biceps Femoris"** en lugar de los nombres en español.

Causa: `muscleNameById` leía `MUSCLES_BY_REGION` directamente. Desde que el
contenido de pago salió del bundle, ese registro **solo contiene el tier
gratuito**, así que la búsqueda fallaba en las siete regiones de pago y caía al
último recurso, que convierte el id en texto. El dato en español estaba
descargado y en memoria; simplemente no se consultaba.

Arreglado pasando por el accesor (`musclesForRomLookup`), que sí consulta el
contenido premium ya cargado.

---

## 4. Tres cosas que PARECÍAN fallos y no lo son

Las tres me costaron una comprobación, y las tres habrían mandado a alguien a
Blender para nada. Van anotadas para que no se repita el viaje.

**Las tiras rojas y blancas "flotando" junto al brazo, la ingle y la muñeca.**
No son geometría suelta: son nervios cutáneos y ligamentos
(`Medial_brachial_cutaneous_nerve`, `Anterior_tibiofibular_ligament`,
`Meniscopatellar_ligament`), que el banco dibuja porque se le pide
`LAYERS=all`. En la app están **desactivados por defecto** y no se ven.

**El pie "partido en dos" y el "hueco" en la rodilla.** Son artefactos de mirar
una **vista lateral**: en esa proyección el pie derecho y el izquierdo se
superponen. Cuando el derecho flexiona y el izquierdo se queda quieto, el
resultado dibuja dos pies, uno girado. Lo mismo en la rodilla. Para juzgar un
movimiento del lado derecho hay que usar vista frontal, o aceptar que lo que se
ve detrás es la pierna de apoyo.

**"192 mallas del pie no siguen al hueso".** Lo midió un script mío con
`Box3.setFromObject`, y eso es sencillamente falso para una malla con esqueleto:
la matriz del objeto **no cambia cuando se mueven sus huesos**, así que todo el
cuerpo mide cero desplazamiento. Medido correctamente, con `applyBoneTransform`
como hacen los audits del repo, **182 de 192 mallas del pie sí siguen al hueso**,
hasta 7,8 cm. Las 10 que no se mueven son justo las que no deben: tibial
anterior, extensores, peroneos, tibial posterior y el maléolo medial, que son
pierna, no pie. `scripts/audit-foot-binding.mts` lleva el aviso escrito en la
cabecera.

Y con `audit-arc-tears`: **ninguna malla se desgarra** en ningún arco de ninguna
región. El peor caso es 1,6× su propio tamaño, que es deformación articular
normal.

---

## 5. Lo que queda abierto

### 5.1 Los movimientos de columna no se han visto nunca

`createRigPoser` solo acepta `kind: 'chain'` y `kind: 'joint'`. Los doce
movimientos de cervical, torácica y lumbar son `kind: 'spine'`, así que **el
banco de pruebas no puede posarlos** y nadie los ha mirado fuera de la app.

No es que estén mal: es que no hay constancia de que estén bien. Extender el
poser a `spine` es el siguiente paso obvio, y barato.

### 5.2 Flexión de cadera y la rodilla

La flexión de cadera se dibuja con la **rodilla extendida** en todo el arco. El
rango del dato (0–90°) es el correcto para esa posición —es la elevación de
pierna recta—, así que no hay error. Pero conviene decidirlo a propósito: la
goniometría estándar mide 120° con la rodilla flexionada y 90° con ella
extendida, y hoy el modelo enseña la segunda sin decirlo.

### 5.3 La pierna que atraviesa la mano

En abducción de cadera a 45° el muslo pasa **a través del antebrazo y la mano**,
que cuelgan al costado. El hombro ya tiene una solución para esta misma clase de
problema (`ARM_CLEARANCE_DEG`, una separación cosmética que no es parte del
ángulo clínico). La cadera no la tiene.

### 5.4 Signo del tobillo, pendiente de confirmar

`ankle-dorsiflexion` y `ankle-plantarflexion` siguen con
`needsVisualCheck: true`, y esta sesión **no ha conseguido confirmarlo**: en
vista lateral los dos pies se superponen (ver §4) y no se puede decir cuál se
está moviendo ni hacia dónde.

La forma de resolverlo es mirar **un solo pie**: una vista lateral con el lado
izquierdo oculto, o medir el signo en vez de verlo (la punta del pie debe subir
en dorsiflexión y bajar en plantiflexión, respecto al maléolo). Hasta entonces,
**no tocar el signo**: cambiarlo a ojo sobre una imagen ambigua es cómo se
introduce el fallo que se quería arreglar.

---

## 6. Estado

341 pruebas en verde, `tsc -b` limpio, `npm run audit-data` con 0 errores y
0 avisos. Nada del hombro se ha tocado.
