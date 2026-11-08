# Plan premium para empezar a vender

Barrido de 7 dimensiones, 74 hallazgos medidos (2026-11-08). Esto no es una lista de
deseos: cada línea trae el fichero, la línea y la cifra que la justifica. El orden es
por **qué bloquea la grabación de un vídeo vendible**, no por gusto.

Corrección de una premisa que arrastré yo: el cartel de carga **no dice "59MB"**. Dice
`cuerpo-rig.glb · 59%` (`RigViewer.tsx:375-380`). El defecto real es que enseña el
nombre de fichero del desarrollador, no una cifra mentirosa.

---

## 0. El diagnóstico en una frase

Hoy no se puede grabar nada vendible del laboratorio, y el motivo principal es uno y
medible: **la piel se vuelve fantasma (translúcida + emisivo azul marino a 0,45)
siempre que hay un músculo resaltado**, y eso es siempre. Encima, el papel del músculo
repinta el tejido: en el plano estrella del hombro un pectoral sale **verde menta** al
lado de uno rojo.

Tres cifras que mandan sobre todo lo demás:

| Medida | Hoy | Objetivo |
|---|---|---|
| Primer fotograma útil, caché caliente | **~10,3 s** | < 4 s |
| Cartel de carga en `/rodilla/movimiento` | **19,8 s** (la escena existe a 4,4 s) | ≈ 4,5 s |
| Encuadre de apertura en `/hombro/movimiento` | 1,24 m de escena para una articulación de 10 cm | esternón-coronilla |

El umbral de "bueno" para LCP es 2,5 s y el de "malo" 4,0 s. Diez segundos es 4,5x el
umbral de malo. **Mientras eso no baje, el argumento "abres un enlace y está" no se
puede usar ni en un vídeo ni en una demo en vivo.** Es el único hallazgo que bloquea
literalmente la venta.

---

## Nivel 0 — Sin esto no se graba (horas, mismo día)

Todo lo de este nivel son constantes y ramas en ficheros que ya existen. Nada de
contenido nuevo, nada de reexportar el GLB.

### 0.1 La piel deja de ser plástico azul
`src/components/movement/RigModel.tsx`

- El emisivo `0x1a2740` entra **plano** a `0,45` (`:348`, aplicado en `:3054`). Medido
  sobre el albedo real con las luces del lab: aporta el 16% del azul en la cara
  iluminada, el 25% de frente y **el 68% en sombra**; `b-r` pasa de −19 (marrón cálido)
  a +3 (gris frío). La sombra de la piel es más azul que roja. Es aritmética.
- Arreglo: multiplicar el término emisivo por el **mismo `ghostFres`** que el shader ya
  calcula (`:1471-1474`), inyectando `totalEmissiveRadiance *= ghostK;`. El brillo queda
  solo en la silueta —que es lo que el comentario de `:343-347` dice que quiere— y el
  azul en sombra cae de 68% a casi 0. Más bajar la constante a `0,12` y subir la
  opacidad a `0,93` (con eso `depthWrite` se queda encendido; la condición es `> 0,92`).

### 0.2 La cara deja de salir desollada
`RigModel.tsx:1989-2034`

- El fantasma es `alpha = 0.85 * mix(0.1, 1.0, pow(1-|N·V|, 2.2))` y el material es
  `DoubleSide`. Medido: **de frente la cobertura de las dos caras es 0,163**, deja pasar
  el 84%. En el tronco es deliberado. En la cabeza, detrás hay 227 mallas de músculo
  facial y 149 de cráneo, así que la cara se ve al 84% de músculo rojo y hueso blanco.
- Arreglo: elegir el material por la posición del centro de la malla, con el mismo
  mecanismo ya probado del casquete distal (`:1989-1999`): una tercera instancia sólida
  para la cabeza (centro `y > 1,45`; **140 mallas, medidas**).

### 0.3 El músculo activo nunca vuelve a ser verde
`src/components/movement/RigOverlays.tsx:102-115`

- `paintGlow` pone el emisivo al **color del papel puro** con intensidad hasta 0,68. En
  lineal, el canal verde del teal es **10,2x** el techo iluminado del músculo. Medido en
  pantalla: `#8ed0c4` (hue 170) al lado de un reposo `#9f1919` (hue 0). Los cuatro
  papeles salen a hue 45 / 170 / 208 / 288: **ninguno en la banda del tejido (0-25°)**.
- Arreglo: el emisivo es el **propio rojo del músculo calentado**, no el tono del papel
  (`emissive = baseColor.lerp(0xff6a2a, 0.35)`), y el difuso se deja intacto. Medido con
  esos valores: hue 7 a nivel 0,6 y hue 10 a nivel 1,0 — nunca sale de 0-16° — y la
  luminancia sube 4,5x. El papel se muda al **contorno Fresnel** y a una **leyenda de 4
  chips** en `RhythmReadout`. Lo mismo en el resalte de selección de disección.
- La selección de rol queda documentada, no adivinada: hoy un vistazo dice "el verde es
  el freno"; se recupera en el contorno, en la leyenda, en el borde del protagonista y
  en la barra del panel.

### 0.4 El hombro encuadra el hombro
`src/lib/labFraming.ts:26`, `src/components/movement/RigViewer.tsx:118-124`

- Los 6 nombres de hueso casan **12 huesos** (los dos lados), sin filtro de lado. Y
  `hand_flex` en reposo está a `y=0,864`, la misma altura que `femur_base`: la caja baja
  hasta la cadera. Resultado medido a 1440x900: la cabeza empieza a 84 px del borde y el
  cuerpo se corta a medio muslo.
- Arreglo: subir por `o.parent` hasta la raíz `*_Armature_{R|L}` y quedarse con el lado
  activo (traduciendo con `boneMap.rigSideFor`), y partir la lista en `core`
  (clavicle, scapula, humerus_gh) y `carried`. Medido: el ancho baja de 0,79 a 0,51 m en
  hombro y de 0,78 a 0,34 m en codo.

### 0.5 El zoom tiene tope y hay tecla para volver a la vista
`RigViewer.tsx:343`, `Viewer3D.tsx:526`, `ViewToolbar.tsx`

- `maxDistance 50` sobre un cuerpo de 1,75 m deja el cuerpo en **34 px**; y las
  etiquetas del atlas se amontonan en una columna con 12 guías convergiendo en un punto.
- Arreglo: derivar los topes de la caja recién encuadrada
  (`maxDistance = d*2`, `minDistance = max(0.12, d*0.08)`). Y un botón **Reencuadrar**
  (tecla `R`) en el laboratorio: en una sesión de grabación es lo que te deja repetir una
  toma sin recargar.

### 0.6 El cartel de carga dice la verdad y se va cuando toca
`RigViewer.tsx:355-394`

- Medido en `/rodilla/movimiento`: DCL 514 ms, GLB completo 1737 ms, `__scene` existe a
  4443 ms, **el cartel se va a 19801 ms**. Son 15 segundos de cartel con el trabajo ya
  hecho. Y el texto enseña `cuerpo-rig.glb`.
- Arreglo: «Cuerpo completo: hueso, músculo y piel · 11 MB · se descarga una vez» y
  bajar `RIG_SLOW_MS` a ~1200 ms. El cartel se cierra cuando el cuerpo está presentable.

### 0.7 Las dos vistas laterales de Explorar enseñan el lado contrario
`src/lib/anatomyMeta.ts:99-100` — intercambiar los dos `dir`, y añadir a
`npm run audit-laterality` un caso que lo vigile.

### 0.8 La guía rápida deja de llamar 'hip' a la cadera
`src/components/GuideHub.tsx:18-26` — `REGION_LABELS` no declara `hip` ni `ankle`, y
`:117` imprime el identificador en inglés. Son **dos regiones de pago**, vistas desde el
botón de ayuda permanente. Arreglo: borrar la tabla y leer `REGIONS[id].name`. Hay tres
copias de los nombres de región; que quede una.

### 0.9 El modo paciente deja de hablar en jerga
`src/lib/patientPhrase.ts:28` — imprime «Separa **hombro** hacia el lado». El propio
encabezado del fichero dice que debería decir «Separa el brazo». Es la **única** frase
que el paciente lee. El test que la vigila solo comprueba longitud ≥ 12 y punto final.
Arreglo: tabla de **segmento** ('el brazo', 'la rodilla', 'el cuello', 'la espalda
baja') separada del verbo, y endurecer el test: por cada uno de los 34 movimientos,
prohibir la lista de jerga (abducción, aducción, pronación, flexión, torácica, cervical,
lumbar) y exigir verbo + artículo.

### 0.10 Un despliegue no puede publicar un modelo de 133 bytes
`vite.config.ts:40-63` — `.gitattributes` mete los GLB en LFS, así que en git el modelo
son **133 bytes** de puntero. El plugin copia con `copyFileSync` sin mirar cabecera ni
tamaño: si el checkout de Vercel no materializa LFS, `dist` sale con un `.glb` de 133
bytes, el loader no encuentra magia y la app 3D está muerta en producción **sin que el
build falle**. Arreglo: leer 64 bytes y `throw` si empieza por `version https://git-lfs`
o pesa menos de 1 MB. Tres líneas.

### 0.11 Bandera de grabación `?hd=1`
`RigViewer.tsx:43` — el lab renderiza a `RIG_DPR = [1, 1.25]` frente a `[1, 2]` del
atlas, y `performance={{min: 0.75}}` baja a 0,94x píxeles CSS **mientras el brazo se
mueve**, devolviendo la nitidez 120 ms después de parar: en vídeo se ve como un enfoque
que llega tarde. Arreglo: `?hd=1` sube a `[1,2]` y `min: 1` solo para grabar. El tope de
1,25 se queda por defecto: está ahí por los portátiles de los fisios.

---

## Nivel 1 — Lo que convierte la suscripción en gasto de consulta (días)

### 1.1 Copiar para la historia clínica
`navigator.clipboard` aparece en **un solo sitio** de todo `src/`: `NeuroPanel.tsx:266`.
El panel de pruebas calcula Fagan y clusters y el laboratorio calcula rango y ritmo, y
**ni uno ni otro se puede copiar**. `window.print` y `@media print`: cero coincidencias.
Arreglo: replicar ese botón en `OrthopedicTestsPanel` (prueba, resultado, sens/espec con
su estudio, probabilidad pre y post-test) y en `MovementControls` (movimiento, lado,
grados, déficit contra la normativa). **Ese texto pegado en la historia es lo que
convierte la suscripción en gasto de consulta, no en gasto de formación.**

### 1.2 Las 80 pruebas tienen dirección propia
80 pruebas (hombro 14, cervical 12, rodilla 11, lumbar 11, torácica 10, cadera 9, codo
8, tobillo 5), 58 con demostración. La única entrada es `?prueba=<id>` y la app **la lee
una vez y la borra** (`caseEvidence.ts:65-71`). `sitemap.xml` tiene 37 `<loc>`: ninguna
prueba. Y `⌘K` solo recorre nombres de malla, así que "Hawkins" o "Lachman" devuelven
cero. Arreglo: `/rodilla/pruebas/lachman`, las 80 en el sitemap, y `⌘K` sobre pruebas,
movimientos y casos. Es a la vez el atajo del martes por la tarde y **el único canal de
captación realista**.

### 1.3 La piel se ABRE por la zona de estudio (la palanca de vídeo)
`RigModel.tsx:1460-1478` — pasar `uGhost` de escalar a **ventana**: un centro y un radio
en coordenadas de mundo, `smoothstep` por fragmento, alimentado por el hueso de la región
ya encuadrada. El cuerpo entero queda sólido y **se abre un óvalo suave sobre el hombro
que se estudia**. Ese es el plano que vende, y de paso arregla la costura de la muñeca
(que son **dos materiales distintos a 1,5 cm**, `:1430-1449`) y el orden de mezcla de las
456 mallas transparentes.

### 1.4 El plano estrella sale del desplegable
La fila de **Estado clínico** (discinesia) vive dentro de un desplegable, dentro de un
scroll de 36vh, detrás de un candado. En cámara se vería a alguien buscando el
diferenciador del producto. Arreglo: cuando la región soporta patología, esa fila va
junto al carril de Movimiento.

### 1.5 El gratuito mueve algo
Hoy el plan gratuito mueve **1 de 4 arcos** del hombro: el visitante que llega del vídeo
ve un arco y tres candados, lo contrario de lo que el vídeo le prometió. Arreglo: hombro
completo abierto (explorar + laboratorio + tests) y 14 días sin tarjeta. La queja número
uno de la competencia es literalmente "no puedo ver nada antes de pagar".

### 1.6 Reordenar Repasar y arreglar el sitemap
Dos de los cuatro modos son de estudiante de segundo. Reordenar a Casos / Repaso /
Tarjetas / Cuestionario y abrir en Casos. Y `npm run gen-sitemap` con filtro de rutas
vivas: hoy anuncia 9 direcciones del nombre viejo y 4 páginas sin contenido, y en
Fundamentos la pestaña 'Movimiento' lleva a un callejón.

---

## Nivel 2 — El arranque (semana)

La espera **no es la descarga**: con caché caliente y cero bytes sigue tardando ~10,3 s.
De eso, ~8,5 s son los 9 pases de preparación de `RigModel` sobre 2.659 mallas y
1.000.527 vértices. KTX2 no aplica (0 texturas) y el ahorro comprimido de adelgazar el
GLB es del 2,5%: **hay que cortar mallas, no bytes.**

1. **Un GLB por región**, con el filtro que ya existe (`scripts/audit-region-filter.mts`):
   `/hombro/movimiento` parsearía ~1/5 de las primitivas.
2. **Trocear** el efecto de `RigModel.tsx:1327-2377` con `yield` entre etapas y llamar a
   `onReady` en cuanto el cuerpo esté presentable.
3. `modulepreload` inyectado desde `index.html` según `location.pathname`: hoy son
   **tres saltos de red** antes de que exista three.js.
4. `injectRegister: null` en VitePWA: el service worker se baja **2,56 MB de JS en la
   primera visita**, compitiendo con el modelo por el ancho de banda.

---

## Nivel 3 — Contenido que decide la renovación (más)

- **Dosis.** El tratamiento dice el por qué y **nunca la dosis**. Añadir a
  `TreatmentPhase` posición, series × repeticiones, progresión y criterio de paso. Es la
  diferencia entre "entiendo el hombro" y "sé qué le mando hoy a esta señora", y es lo
  que el cliente necesita a las 18:40.
- **Hoja de programa imprimible.** La tarjeta "para el paciente" es una ficha de clínico
  con foto. Convertirla en cesta de 3-5 poses con frase llana, series y veces al día, en
  A4 imprimible. Los grados y los nombres latinos van en la copia para la historia.
- **Muñeca y mano.** El miembro superior se acaba en el codo. Túnel carpiano, De
  Quervain, dedo en gatillo: consulta diaria. Con 5-6 pruebas (Phalen, Tinel,
  Finkelstein, Durkan, Watson) se cubre el 80%. Bajo la mano ya hay **37 mallas de hueso
  del carpo limpias**, apagadas por un motivo que ya se demostró falso para el pie.
- **Citas.** El 2% está cotejado contra la fuente. Cotejar primero las 80 pruebas y las
  tablas normativas de ROM, con `npm run audit-data` como contador público.
- **Casos.** 19 no bastan para cobrar por "razonamiento clínico": ~8 por región (64).

---

## Precio y posicionamiento

El titular **no es "atlas 3D en español"** —tres competidores ya cubren el español— ni
"app de tests". Es: **«el test lo hace el modelo»**. Esa combinación (test + movimiento +
español + navegador) es lo único que no pueden copiar ni Physiotutors (no tiene rig) ni
Elsevier (no tiene tests ni web individual).

Dos hechos que abren el hueco:

- **Complete Anatomy for Web es solo institucional** (aviso de Elsevier). Quien compró
  licencia de estudiante o profesional no puede entrar por web. La app nativa pesa
  **1,5 GB** y pide 16 GB de almacenamiento; Visible Body, 1,9 GB. Anatris abre con un
  enlace: ése es el argumento, **en cuanto baje de 4 s**.
- **Elsevier no baja el precio en LatAm**: en México cobra más que en EE.UU. Es el hueco
  comercial más limpio del análisis y no requiere producto nuevo, solo tabla de precios.

| Tramo | Precio | Nota |
|---|---|---|
| España / UE | 14,99 €/mes o **149 €/año** | por encima de la Individual License de Complete Anatomy (29,99 €): señal de herramienta profesional |
| Fundador | **99 €/año**, limitado y con fecha de corte | la jugada de Physitrack con su EMR |
| LatAm | **59-69 USD/año** cobrado en MXN/COP/ARS/BRL | 40-55% por debajo del europeo, dentro de la heurística PPP |
| Prueba | **14 días sin tarjeta** + hombro completo abierto | la competencia va de 3 a 14 días |

Y el aviso que importa: **en esta categoría lo premium se decide por estabilidad, no por
cantidad de contenido.** Visible Body tiene 4,8/5 con 4,6K valoraciones. Complete
Anatomy, con 3.000.000 de usuarios, 500+ universidades y 1.500+ vídeos, tiene **3,7/5 en
iPhone y 3,3/5 en Google Play**, y la queja principal es que se cuelga al arrancar.
**No añadas regiones ni contenido antes de vender.**

Dos avisos más: el volumen hispanohablante está en Brasil-Argentina-Colombia, y Brasil
es portugués —hay que decidir pronto si el producto es hispano o iberoamericano—; y la
vía de entrada barata en LatAm es el acuerdo con colegio o asociación profesional, no la
publicidad.

---

## Los cinco vídeos

| # | Duración | Título | Dónde se graba |
|---|---|---|---|
| 1 | 75 s | **El grado que no es del hombro** | `/hombro/movimiento`, abducción con *Ver movimiento* a Normal (25°/s = 7,2 s de 0 a 180), luego Estado clínico → Discinesia, luego Hawkins-Kennedy → Fagan, cierre en Modo paciente |
| 2 | 45 s | **Una cifra y su estudio** | `/rodilla/movimiento` (11/11 con demostración, cero huecos en cámara) → prueba meniscal → Fagan moviendo la probabilidad |
| 3 | 40 s | **Quítale el pectoral. Solo el izquierdo.** | hombro a 90° congelado → clic en el pectoral izquierdo → Diseccionar → tecla `Z`. Sin voz, con rótulo |
| 4 | 35 s | **Gira la pantalla** | rodilla a medio recorrido → modo paciente → barrido Lento (12°/s) |
| 5 | 50 s | **C5, C6, C7, sobre el cuerpo que se mueve** | `/cervical/movimiento` → Neuro → raíz C6 → miotoma sobre el rig |

Duración: mediana de 59 s en 1.750 vídeos demo B2B de 2026, y entre 30 s y 2,5 min el
rendimiento es el mismo. Abrir con **pregunta**: lo hace el 8% de los guiones y llegan al
cuartil alto el 40% frente al 26% general. De ahí la frase de apertura del vídeo 1:
«¿Cuántos de esos grados son del hombro, y cuántos los está poniendo la escápula?»

### Lo que NO se graba todavía
1. La **cabeza** en cuadro (recortar por encima del acromion).
2. La **primera carga de Explorar** (hay un temporizador de seguridad de 20.000 ms que
   quita el velo aunque nada esté listo).
3. **Alejar con la rueda** (el tope de 50 no entra en cámara si no la tocas: es regla de
   rodaje, no arreglo previo).
4. Las listas de pruebas de **lumbar (5/11)** y **torácica (5/10)**.
5. **Manos y pies** en primer plano.
6. El **menú de cuenta** (sale el correo) ni el **checkout de Stripe** (sale el banner de
   modo de prueba).
7. El **muro legal**, salvo que el vídeo sea explícitamente "primer uso".

### Trampa de rodaje que cuesta la sesión entera
Si Windows tiene **Efectos de animación** apagados (Configuración → Accesibilidad →
Efectos visuales), el botón Reproducir **no hace nada**. Compruébalo con un arco corto
antes del primer plano bueno. Y graba todo con **Reproducir**, no arrastrando el
deslizador: el barrido por `requestAnimationFrame` reparte los grados por tiempo y sale
parejo; una mano no.

### Captura, sin equipo caro
OBS Studio, fuente *Captura de ventana* sobre Chrome en pantalla completa (`F11`),
*Capturar cursor* desmarcado. **Base y Salida exactamente iguales y iguales a tu
pantalla** (1920x1080): si no coinciden, OBS remuestrea cada fotograma, y eso es la mitad
del tembleque. 60 fps, codificador por hardware (NVENC / QuickSync / AMF), **CQP 18, no
CBR**. Graba a MKV y remuxea a MP4 al final: así una caída no te cuesta la toma.

### Y el asset de portada que falta
`HeroMedia` espera un **bucle mudo de 3-6 s** en `public/hero-lab.webm|mp4`, y **no
existe**. No es el vídeo de 75 s: es otro recorte, y la portada lo está pidiendo.

---

## Orden de ejecución

1. **Nivel 0 completo** → ya se puede grabar el vídeo 3 y el 4.
2. **Nivel 2, puntos 1-2** (GLB por región + trocear la preparación) → se puede grabar
   el 1, el 2 y el 5, y se puede decir "abres un enlace y está".
3. **Nivel 1.1 y 1.2** (copiar a la historia + URL por prueba) → el producto pasa de
   formación a consulta, y existe para Google.
4. **Nivel 1.3** (la ventana de piel) → el plano que vende.
5. Precio y prueba de 14 días.
6. Nivel 3, en paralelo y sin bloquear nada de lo anterior.
