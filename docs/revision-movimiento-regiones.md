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

## 5. La cadera iba al revés

**El hallazgo más serio de la sesión, y el que más cerca estuvo de no
encontrarse.**

`hip-flexion` y `hip-extension` llevaban `needsVisualCheck: true` desde que se
construyeron: el comentario decía que la cinemática era correcta y que solo
faltaba calibrar el signo "una vez en el laboratorio". Nunca se calibró, y el
signo estaba invertido en los dos.

Medido: a 90° de "flexión de cadera" la rótula viajaba **40,9 cm hacia atrás**.
La pierna se iba hacia atrás bajo la etiqueta de flexión.

Y casi lo doy por bueno. Mirando el renderizado lateral llegué a escribir que
"el arco es correcto, el muslo se va hacia delante". **No lo era.** En vista
lateral las dos piernas se superponen y es facilísimo leer la de apoyo como la
que se mueve. La única forma de zanjarlo fue medir contra tres pares de
referencias anatómicas independientes, que coinciden:

| Par | Anterior | Posterior |
|---|---|---|
| Hueso nasal / occipital | +0,087 | −0,017 |
| Esternón / sacro | +0,092 | −0,041 |
| Dedo gordo / calcáneo | +0,122 | −0,035 |

Anterior es **+z**. Con eso, flexión daba −40,9 y extensión +14,3: las dos al
revés. Corregidas, ahora dan +42,2 y −14,2.

`scripts/audit-movement-direction.mts` (nuevo) comprueba seis movimientos contra
lo que dice su nombre, **deduciendo "delante" de la anatomía en vez de
suponerlo**. Suponerlo fue precisamente lo que dio un falso positivo en la
primera pasada.

De paso quedó confirmado el signo del tobillo sagital, que arrastraba el mismo
aviso: dorsiflexión sube la punta 6,1 cm, plantiflexión la baja 10,6 cm. Las dos
bien. Inversión y eversión siguen sin comprobar.

---

## 6. La columna ya se puede ver

`createRigPoser` solo aceptaba `kind: 'chain'` y `kind: 'joint'`, así que los
**doce** movimientos de cervical, torácica y lumbar —un tercio del total— no se
podían posar, renderizar ni medir fuera del navegador.

Ya se puede: el banco distribuye el ángulo regional por el bloque de vértebras
igual que `RigModel`, y arrastra los hombros con el tórax (sin eso, la piel del
cuello y el deltoides se separan).

Mirados los doce por primera vez:

- **Flexión cervical** (0/22/45°): el mentón se acerca al pecho, progresivo.
- **Rotación cervical** (0/40/80°): la cabeza gira y el tronco se queda. 80° es
  un máximo realista.
- **Flexión lumbar** (0/30/60°): el tronco se inclina y la curva se reparte por
  las vértebras, no bisagra en un punto.
- **Rotación torácica** (0/18/35°): los hombros giran sobre una pelvis quieta.
- **Inclinación lateral torácica** (0/15/30°): el tronco se inclina y la cintura
  escapular lo acompaña.

Ninguno se ve roto. **Una nota de producto, no un fallo:** la rotación lumbar
son 13° en total, así que arrastrar el control casi no mueve nada. Es correcto
—el dato ya avisa de que el raquis lumbar rota poco— pero un usuario lo leerá
como que está estropeado. Merece un aviso en pantalla, no exagerar el ángulo.

---

## 7. Lo que queda abierto

### 7.1 Flexion de cadera y la rodilla — resuelto

La flexion de cadera se dibujaba con la **rodilla extendida** en todo el arco y
se cortaba en 90°, que es el limite real de esa posicion (elevacion de pierna
estirada). No habia error, pero enseñaba el numero de una prueba como si fuera
el rango de la cadera, y dejaba los 120° que cita el dato **inalcanzables en el
unico sitio donde se pueden ver**.

Ahora el arco recorre las dos condiciones de la goniometria **en el orden en que
las encuentra el cuerpo**: recto hasta 90°, y de 90 a 120 la rodilla se dobla,
porque es doblandola como se relajan los isquiotibiales biarticulares y el arco
puede seguir. Es exactamente la explicacion que ya estaba escrita en
`hipPhases.ts`; lo que faltaba era que el modelo la obedeciera.

Medido: rodilla recta (3,6°) hasta 90°, 44° a 105°, 62° a 120°. Hay una fase
nueva 90–120 con su aviso: *"Los 120° de la goniometria estandar se miden asi.
Con la rodilla recta el mismo sujeto da ~90°: no es una cadera distinta, es otra
prueba."*

### 7.2 La pierna que atravesaba la mano — arreglado

En abduccion de cadera a 45° el muslo pasaba **a traves del antebrazo y la
mano**. El hombro ya tenia la solucion (`ARM_CLEARANCE_DEG`, una separacion
cosmetica que no forma parte del angulo clinico); ahora los movimientos de
pierna la aplican tambien, **a los dos brazos**: la abduccion choca con el brazo
de su lado y la aduccion cruza la linea media y choca con el otro. Simetrico, se
lee como alguien de pie con los brazos ligeramente adelantados, y no se puede
confundir con un angulo clinico, que es lo que si podria pasar con un solo
brazo.

### 7.3 Inversion y eversion del tobillo — estaban al reves

Seguian con `needsVisualCheck: true`, y **el aviso tenia razon: los dos signos
estaban invertidos**. La planta giraba hacia FUERA bajo el nombre de inversion,
que es el mecanismo del esguince de tobillo contado del reves.

No se podia ver. Un hito distal suelto no sirve aqui, porque una dorsiflexion
sube los dos bordes del pie y se parece a lo mismo. Lo que lo zanja es medir el
**desnivel entre los bordes**: a 35° de inversion el primer metatarsiano tiene
que acabar por encima del quinto, y acababa 2,9 cm por **debajo**.

Corregido, y de paso queda confirmado el EJE y no solo el signo: 2,4 cm a 35° y
1,2 cm a 15° es lo que da un giro sobre el eje largo del pie con los bordes
separados 4,8 cm (tan 35 x 4,8 = 3,4; tan 15 x 4,8 = 1,3).

**Ya no queda ningun movimiento con `needsVisualCheck`.** Y el aviso deja de ser
un pendiente aceptable: los dos que lo llevaban estaban mal. Lo que hace falta
no es mirarlo, es medirlo.

### 7.4 La rotacion lumbar se lee como estropeada — dicho en pantalla

Son 5° en total, porque las carillas lumbares son sagitales y la bloquean. El
dato es correcto y el aviso clinico ya estaba, pero arrastrar el control no mueve
casi nada y la lectura honesta de la pantalla es "esto esta roto".

La respuesta no es exagerar el angulo, que enseñaria un numero falso, sino
decirlo: debajo del control, cuando el arco total es de 10° o menos, aparece
*"Arco real de 5°. Que el modelo apenas se mueva no es un fallo del visor: este
movimiento casi no existe en el cuerpo."* Sale del arco, no de una lista, asi
que un movimiento corto futuro lo hereda sin que nadie se acuerde.

## 8. Estado

352 pruebas en verde, `tsc -b` limpio, `npm run audit-data` con 0 errores y
0 avisos, `npm run build` correcto. Nada del hombro se ha tocado.

Herramientas nuevas, todas ejecutables:

| Comando | Para que |
|---|---|
| `npm run audit-direction` | Va el movimiento donde dice su nombre? Deduce "delante" de la anatomia, mide desniveles para el plano frontal del pie y el angulo de la rodilla dentro de la flexion de cadera |
| `scripts/measure-region-frame.mts` | Caja que necesita cada region para que su arco quepa |
| `scripts/audit-foot-binding.mts` | Que mallas siguen al hueso y cuales se quedan |

Y una prueba nueva en `npm test`:
`src/lib/__tests__/movementDirection.test.ts` guarda el signo que tenia cada
movimiento el dia en que se midio su direccion, con la medida citada en el
mensaje de fallo. Cambiar un signo rompe la prueba y nombra la medicion que
contradice, asi que el siguiente volteo tiene que ser deliberado. Esa prueba no
carga el rig; el audit si, y por eso vive fuera de `npm test`.

### Dos trampas de medicion que conviene no perder

**`Box3.setFromObject` no sirve para medir una malla con esqueleto.** La matriz
del objeto no cambia cuando se mueven sus huesos, asi que informa de cero
desplazamiento para todo el cuerpo. Se mide con `applyBoneTransform`, como hacen
los audits del repo. Ese error me hizo "encontrar" que 192 mallas del pie
estaban sueltas, y no lo estaban.

**Un desplazamiento no vale para comprobar un acoplamiento.** La primera version
del chequeo de la rodilla dentro de la flexion de cadera **suspendio un
acoplamiento correcto**: esperaba que el talon quedase detras de la rodilla, y
con el muslo casi horizontal a 120° el talon queda delante se doble la rodilla o
no. Lo que hay que medir es el angulo, con tres hitos a lo largo del miembro.
