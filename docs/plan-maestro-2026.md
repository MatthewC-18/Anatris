# Anatris — Plan maestro 2026

> Barrido completo del producto, crítica competitiva, y plan de trabajo por
> sesiones. Escrito el **2026-08-04** sobre `main` (58e796b).
> Complementa —no sustituye— a [`ux-premium-audit.md`](ux-premium-audit.md)
> (auditoría medida de UX/gating/i18n) y a
> [`movement-lab-premium-roadmap.md`](movement-lab-premium-roadmap.md)
> (acabado del laboratorio).

---

## 0. Cómo usar este documento en una sesión nueva

1. Lee **§1** (estado medido) y **§3** (los 12 problemas). No re-derives.
2. Elige una sesión de **§7**. Cada una trae objetivo, archivos, criterio de
   aceptación y cómo verificar.
3. Si la sesión es de eAwards, lee **§6** primero — tiene fecha límite.
4. Al terminar, marca el estado en la tabla de **§7** y actualiza la memoria si
   el aprendizaje es reusable.

**Regla de oro heredada del repo: *modelado, no inventado*.** Todo número
clínico lleva `cite` y `pageVerified` honesto. Esto no es opcional: es el activo
más valioso que tienes y el más fácil de destruir.

---

## 1. Dónde estás realmente (medido hoy, no estimado)

| Dimensión | Valor | Lectura |
|---|---|---|
| Código | 59.053 líneas TS/TSX, 186 archivos | Producto real, no demo |
| Tests | 123 unitarios, 12 archivos, **todos pasan** | Base sana |
| Regiones | 6 (hombro, codo, cadera, rodilla, tobillo, columna) | Cobertura seria |
| Músculos con ficha | 113 (18 hombro, 41 columna, 19 cadera, 13 rodilla, 12 tobillo, 10 codo) | Competitivo |
| Tests ortopédicos | **79** con sens/spec/estudio + Fagan + clusters + modo examen (85 = nº de *citas*, no de tests) | **Único en el mercado hispano** |
| Casos clínicos | 15 | Bajo. 1 en cervical, 1 en lumbar |
| ROM con cita **verificada** | **0 / 161 (0%)** | 🔴 El riesgo nº1 |
| Tests con cita verificada | 40 / 85 (47%) — tobillo 0/5, cadera 0/8, torácica 0/10 | 🔴 |
| Errores de auditoría | 0 errores, 2 avisos (Neer y Hawkins marcados `rule-out` con sens < 80) | 🟠 Error clínico visible |
| Chunk de entrada | 391 KB · **113 KB gzip** | Subió desde 99 KB |
| Chunk 3D (`romPhaseAtAngle`) | 998 KB · **272 KB gzip** | Pesado en 4G latinoamericano |
| Idiomas | 1 (`<html lang="es">`, 0 infraestructura i18n) | 🔴 Techo de mercado |
| Verificación de pago en servidor | **No existe** (solo checkout/portal/webhook) | 🔴 Paywall cosmético |
| Open Graph / Twitter cards | **Ninguna** en `index.html` | 🔴 Ver §3.6 |
| Eventos de producto | 7, todos de embudo de venta | 🔴 No sabes qué se usa |
| Monitorización de errores | Ninguna (ErrorBoundary sin reporte) | 🟠 |
| CI / E2E | Ninguno | 🟠 |

**Veredicto en una frase:** tienes un producto con un foso técnico real —el
laboratorio de movimiento con ritmo escápulo-humeral, patologías y activación—
envuelto en un embudo que no lo enseña, con una promesa de rigor (0% de ROM
verificado) que hoy no puedes defender ante un clínico.

---

## 2. El mercado: quién es la competencia y dónde está tu foso

### 2.1 El campo real

| Producto | Precio aprox. | Fuerte | Débil (tu hueco) |
|---|---|---|---|
| **Complete Anatomy** (3D4Medical/Elsevier) | ~$70–200/año | Render de referencia, modelo completo, herramientas de dibujo, cuota institucional | Es un **atlas**, no un razonador clínico. El movimiento es animación pre-hecha, no un modelo biomecánico. Caro para LatAm |
| **Muscle & Motion** | ~$100–180/año | Animación de músculo en movimiento, buen contenido de fuerza | Vídeo pre-renderizado, no interactivo por grados. Sin tests ortopédicos ni razonamiento clínico |
| **Visible Body** | ~$25–60 | Barato, escolar | Superficial para clínica. Sin ROM por fase |
| **Kenhub** | ~$100/año | Mejor contenido pedagógico + cuestionarios | 2D/imágenes. Sin 3D interactivo real ni biomecánica |
| **Physiotutors / Physiopedia** | Gratis–$200 | Autoridad clínica, tests con sens/spec, comunidad enorme | Sin 3D. Sin interacción. Contenido en texto/vídeo |
| **Anki + decks de anatomía** | Gratis | Lo que realmente usan los estudiantes | Sin contexto visual ni clínico |

### 2.2 Tu foso, ordenado por defendibilidad

1. **⭐ Ritmo biomecánico calculado, no animado.** Complete Anatomy reproduce un
   clip; tú decompones la elevación en húmero/escápula/tronco *desde el hueso
   real del rig*, con ratio y protagonista por grado. Nadie más lo hace.
2. **⭐ Normal vs. patológico en el mismo control.** Discinesia escapular,
   hombro congelado, pinzamiento, hernia discal, whiplash… con "por qué duele"
   y estructura implicada resaltada en escena. **Esto es lo que un fisio paga.**
   Ninguna app del mercado lo tiene.
3. **⭐ Puente atlas ↔ examen clínico.** 85 tests con sens/spec, nomograma de
   Fagan, clusters y modo examen, *dentro* del mismo 3D. Physiotutors tiene el
   contenido pero sin modelo; Complete Anatomy tiene el modelo pero sin el
   contenido.
4. **Disección por lados + capas** (piel/músculo/hueso/tendones) sobre un rig
   esqueletado completo neck-to-toe.
5. **SRS tipo Anki integrado con el contenido**, no un deck aparte.
6. **Precio y mercado.** $7,99/mes en español, con MXN y COP nativos, contra
   $200/año en inglés. En LatAm eso es la diferencia entre comprar y piratear.

### 2.3 Dónde pierdes hoy

- **Render.** Complete Anatomy se ve mejor. Ver G1 del roadmap del laboratorio.
- **Cobertura anatómica.** Ellos tienen el cuerpo entero con sistemas
  (linfático, endocrino…). Tú tienes 6 regiones musculoesqueléticas. *No
  compitas ahí* — es una guerra que no puedes ganar y que además diluye tu
  posicionamiento.
- **Marca y confianza.** Ellos tienen Elsevier detrás. Tú tienes 0 testimonios,
  0 logos, 0 usuarios visibles. Ver §3.4.
- **Idioma.** Ellos están en inglés; tú no. Eso te cierra el 70% del mercado.

### 2.4 El posicionamiento que deberías defender

> **No eres un atlas de anatomía. Eres un simulador de razonamiento clínico
> para el aparato locomotor.**

Todo —landing, precios, pitch de eAwards, tienda de apps— debe decir eso. Un
atlas más barato es una commodity; un simulador clínico no tiene sustituto.

---

## 3. Los 12 problemas que hoy impiden que enganche

Ordenados por impacto sobre la conversión y la retención.

### 3.1 🔴 Hay tres puertas antes de que alguien vea el producto

`App.tsx:304` → gate legal **a pantalla completa**. `App.tsx:311` → landing.
Solo entonces se carga el 3D. Un visitante que llega desde WhatsApp
(el canal real en Ecuador) ve un muro de texto legal antes de ver una sola
imagen del producto.

**Arreglo:** el 3D primero. El disclaimer pasa a ser un banner con "Entendido"
sobre la escena ya cargada, o un modal ligero *después* de la primera
interacción. Legalmente es equivalente (sigue habiendo consentimiento
registrado y versionado); comercialmente es la diferencia entre 20% y 60% de
gente que ve el producto.

### 3.2 🔴 La landing vende el producto con un SVG, no con el producto

`LandingScreen.tsx:143` muestra un `<Goniometer>` dibujado a mano. Tu
diferenciador —el rig moviéndose con el ritmo escápulo-humeral en vivo— **no
aparece en ninguna parte de la página de venta**.

**Arreglo:** un loop de vídeo (WebM/MP4, ~3-5 s, autoplay muted loop playsinline)
grabado del propio laboratorio: abducción 0→180 con el goniómetro y el músculo
protagonista cambiando. Pesa menos que el chunk de three.js y vende solo.
Bonus: el mismo clip sirve para eAwards, LinkedIn e Instagram.

### 3.3 🔴 Vendes rigor y tienes 0% de ROM verificado

La landing dice *"Cada afirmación, con su fuente"* (`LandingScreen.tsx:249`).
`npm run audit-data` dice **0/161 ROM verificado**. Además dos tests están
clasificados mal (Neer y Hawkins como `rule-out` con sensibilidad 72 y 74).

Un fisio docente que abra tres fichas y encuentre una página sin verificar deja
de confiar en las otras 158. **Este es el único problema de esta lista que puede
matar el producto entero**, y es trabajo de lectura, no de código.

**Arreglo:** ver Sesión 2 en §7. No hace falta el 100%: hace falta el **100% de
lo que enseñas en la demo y en la región gratuita**.

### 3.4 🔴 Cero prueba social

No hay testimonios, ni logos de universidades, ni número de usuarios, ni
"revisado por". En salud, la confianza *es* el producto. Un estudiante compara
tu app anónima con una que dice "Elsevier".

**Arreglo barato y honesto:** 3 citas reales de fisios/docentes con nombre,
foto y centro. Una línea "Contenido revisado por [nombre], PT, MSc". Si aún no
los tienes, conseguirlos es la tarea de más alto ROI del mes — y es requisito
de facto para eAwards.

### 3.5 🔴 El paywall es cosmético

No hay verificación de entitlement en servidor (`supabase/functions/` solo tiene
checkout, portal y webhook). Los chunks de pago (`muscleContentByRegion` 33 KB
gzip, `trackByRegion` 36 KB gzip, `romByRegion`) se sirven a cualquiera que los
pida por URL. Toda tu biblioteca clínica —el activo— es descargable gratis.

**Arreglo:** edge function que sirva el contenido de regiones premium tras
comprobar la suscripción, o RLS de Supabase sobre tablas de contenido. Es la
diferencia entre tener un activo y tener un PDF público.

### 3.6 🔴 Compartir un enlace no muestra nada

`index.html` no tiene **ni una** etiqueta Open Graph ni Twitter card. En el
canal por el que te llegó la propia convocatoria (WhatsApp), tu enlace aparece
como texto pelado. Lo mismo en LinkedIn, el canal profesional.

**Arreglo (30 minutos, impacto desproporcionado):** `og:title`,
`og:description`, `og:image` (1200×630 con el rig), `og:url`, `twitter:card`.
Y por ruta si puedes generarlas: `/rodilla/movimiento` debería previsualizar la
rodilla.

### 3.7 🟠 No sabes qué usa la gente

7 eventos, todos de embudo de venta. Ninguno de producto: qué región se abre,
qué movimiento se arrastra, qué test se consulta, cuántos segundos dura una
sesión, dónde se abandona. Sin eso, cada priorización futura es una opinión.

**Arreglo:** ~10 eventos de producto (`region_opened`, `movement_driven`,
`test_opened`, `exam_mode_started`, `study_session_completed`,
`patient_card_exported`, `pathology_selected`, `dissection_used`,
`session_duration`). Sigue siendo privacy-first: nada de contenido de paciente.

### 3.8 🟠 No hay ningún bucle que traiga de vuelta al usuario

Tienes SRS y racha diaria (`srs.ts`, `streak.ts`) — el motor de retención— pero
**nada lo dispara**. Sin notificación, sin email, sin push de la PWA, la racha
solo la ve quien ya volvió por su cuenta.

**Arreglo:** push de la PWA (ya tienes service worker vía `vite-plugin-pwa`) con
"tienes 14 tarjetas para repasar". Es el mecanismo que hizo grande a Duolingo y
a Anki, y aquí ya está construido a medias.

### 3.9 🟠 El usuario no puede guardar nada suyo

No hay marcadores, ni notas, ni colecciones, ni "mis casos". Un profesional que
no puede dejar rastro de su trabajo en la herramienta no la adopta: la consulta
y se va. La retención de un producto de referencia viene de **el contenido que
el usuario crea dentro**.

**Arreglo:** "Mi colección" (guardar músculo/test/movimiento) + nota libre por
elemento, sincronizada en Supabase. Es también un motivo honesto para
registrarse.

### 3.10 🟠 Un solo idioma = techo de mercado

Español solamente. Sin inglés no existes para el mercado global; sin portugués
pierdes Brasil, el mercado de fisioterapia más grande de LatAm. `nameLat` ya
está en los datos y la nomenclatura latina es universal — es tu puente barato.

**Arreglo por fases:** (1) modo "nomenclatura latina" (cero traducción de prosa,
valor internacional inmediato); (2) UI en inglés; (3) datos clínicos en inglés.
Antes de nada, **decidir el tipo** `text: Record<Locale,string>` — cada músculo
nuevo multiplica el coste de la migración (ver D1 de `ux-premium-audit.md`).

### 3.11 🟠 No hay plan institucional

$7,99/mes individual es el único producto. En educación sanitaria el dinero
está en **licencias de aula**: una universidad compra 200 asientos de una vez.
Complete Anatomy vive de eso. Tú ni siquiera tienes dónde pedir presupuesto.

**Arreglo:** plan "Aula/Institución" con precio a consultar, un formulario, y un
modo docente (proyección limpia sin HUD, código de sesión). Además es
exactamente la tracción que un jurado de premios quiere ver.

### 3.12 🟠 Peso en la primera visita

113 KB gzip de entrada + 272 KB gzip del motor 3D + el GLB. En una conexión
móvil ecuatoriana media eso son varios segundos de pantalla negra antes del
primer píxel del modelo.

**Arreglo:** póster estático (una imagen del rig) mientras carga el canvas, GLB
con LOD progresivo o versión ligera para móvil, y un indicador de progreso real
en vez de "Cargando índice anatómico...".

---

## 4. Pensando en grande: lo que te haría mundialmente conocido

Estos no son "features más". Son los tres saltos que cambian de categoría.

### 4.1 ⭐⭐⭐ Goniometría por cámara — medir al paciente y compararlo con el modelo

El usuario apunta el móvil al paciente, hace la abducción, y la app mide el ROM
real (MediaPipe Pose / TensorFlow.js, todo **en el dispositivo**, sin subir
vídeo) y lo superpone sobre tu modelo normal: *"tu paciente llega a 118°; el
patrón normal a ese ángulo reparte 78/40; el suyo sugiere sustitución
escapular"*.

- **Por qué es el salto:** ninguna app de atlas mide nada. Convierte a Anatris
  de material de estudio en **instrumento clínico**. Y encaja perfectamente con
  el "impacto social + tecnología de alto impacto" que piden los eAwards.
- **Por qué es viable aquí y no en otro sitio:** ya tienes el modelo
  interpretativo (`shoulderChain`, `romActivation`, patologías). La medición
  sola no vale nada; la medición *interpretada contra un modelo citado* sí.
- **Privacidad:** procesamiento local, nunca sale vídeo del dispositivo. Dilo en
  grande — es un argumento de venta en salud, no una nota al pie.
- **Riesgo:** cruzar de "educativo" a "diagnóstico" cambia el marco regulatorio.
  Enmarcar siempre como **medición orientativa de apoyo docente**, mantener el
  disclaimer, y no emitir juicio diagnóstico.

### 4.2 ⭐⭐ Asistente clínico anclado a tu propia base citada

Un chat que responde *solo* desde tu contenido, y siempre devuelve la cita y el
enlace al punto del 3D: *"¿por qué duele entre 60 y 120 en el pinzamiento?"* →
respuesta + fase resaltada + Kapandji p. X + test de Neer.

- Diferencia clave frente a un ChatGPT genérico: **no inventa**, cita, y te
  lleva al modelo. Es tu regla de oro convertida en producto.
- Empieza acotado: hombro y rodilla, con respuesta rechazada si no hay fuente.

### 4.3 ⭐⭐ Modo docente / aula

Proyección limpia (sin paneles), código de sesión para que los alumnos sigan
desde su móvil, y el modo examen ya existente convertido en examen del aula con
resultados agregados. Abre la venta institucional (§3.11) y crea el bucle de
adquisición más barato que existe en educación: **el profesor trae 200 alumnos**.

### 4.4 Ideas menores pero de alto retorno

- **Export/compartir con marca.** `patientExport.ts` ya estampa "Anatris" en la
  tarjeta. Extiéndelo: cada captura compartida es publicidad. Añade un QR corto
  a la ruta del movimiento.
- **Páginas públicas de contenido para SEO.** Hoy eres una SPA: Google indexa
  poco. Una página estática por test ortopédico ("Test de Neer: sensibilidad,
  especificidad e interpretación") es el canal de adquisición más barato que
  existe, y ya tienes el contenido escrito.
- **Programa de embajadores estudiantiles** (un semestre gratis por delegado de
  curso). Es como creció Notion en universidades.
- **Onboarding segmentado en una pregunta**: estudiante / clínico / docente.
  Cambia el arranque por defecto y te da segmentación gratis en PostHog.

---

## 5. MCPs e integraciones con Claude para acelerar esto

Lo que pediste: usar Claude conectado a otras aplicaciones. Ordenado por lo que
de verdad desbloquea trabajo en **este** repo.

| MCP | Qué desbloquea aquí | Prioridad |
|---|---|---|
| **Playwright / Chrome DevTools MCP** | 🔴 **El que más falta.** Hoy no se puede capturar el rig desde el preview embebido (memoria `movement-lab-visual-verify`), así que toda verificación visual del 3D depende de que tú pegues capturas a mano. Un Chromium real headed permite screenshots del canvas WebGL, tests E2E del embudo y comparación visual antes/después. Desbloquea G1 del roadmap del laboratorio | **Alta** |
| **Figma MCP** | Sistema de diseño real: tokens sincronizados con `tailwind.config.js`, generar la landing y las tarjetas de export desde diseño, y mantener coherencia con `instrument-design-system` | Alta |
| **Blender MCP** *(ya conectado)* | Ya lo usas para el rig. Explótalo más: re-exportar GLB con LOD para móvil, renders de marketing del modelo (justo lo que falta en §3.2), y arreglar los huesos duplicados de manos/pies | Alta |
| **Supabase MCP** | Escribir/aplicar la edge function de entitlement (§3.5), RLS, y las tablas de "mi colección" (§3.9) sin salir de la sesión | Alta |
| **PostHog MCP** | Leer el embudo real y priorizar con datos en vez de opiniones. Sin esto, §3.7 solo genera eventos que nadie mira | Media |
| **Sentry MCP** | Errores de producción con stack real. Hoy el `ErrorBoundary` traga y no reporta | Media |
| **Stripe MCP** | Crear el plan institucional/anual, cupones de embajador y trials sin tocar el dashboard | Media |
| **GitHub MCP** | PRs, CI (typecheck + `npm test` + `audit-data` en cada push). Hoy no hay CI | Media |
| **Vercel MCP** | Previews por rama y logs de build | Media |
| **Linear / Notion MCP** | El backlog vivo entre sesiones. Este documento es un sustituto; una herramienta real lo hace mejor | Media |
| **PubMed / Semantic Scholar** (vía web) | Verificar las 161 citas de ROM y los 45 tests sin verificar. Es lectura, pero se puede semiautomatizar | Alta (por §3.3) |

**Recomendación concreta:** activa primero **Playwright + Supabase + Figma**.
Los tres desbloquean trabajo que hoy está *bloqueado*, no solo acelerado.

---

## 6. eAwards Ecuador 2026 — viabilidad

### 6.1 Los datos — CONFIRMADOS contra las bases oficiales (PDF, 2026-08-04)

Ya no hay que estimar nada: las bases legales de *eAwards Ecuador 2026* (NTT DATA
Ecuador S.A. + Fundación NTT DATA EMEAL) resuelven todas las incógnitas.

| | |
|---|---|
| **Cierre** | **1 de septiembre de 2026, 24:00 hora Ecuador**. Abierto desde el 10 de julio |
| **Premio nacional** | **$10.000 USD** a fondo perdido + programa de aceleración de hasta 3 meses |
| **Premio global** | Pase a la final de los Global eAwards (25ª edición): **100.000 €** + aceleración. Vuelo y hotel de un representante, cubiertos |
| **Fase mínima** | "Prototipo avanzado" |
| **Sectores** | Banca, **Educación**, Energía, Industria, Medio ambiente, **Salud**, Seguridad, Seguros |
| **Quién puede** | "Cualquier emprendedor, empresario individual, grupo de emprendedores, así como sociedades ya constituidas en Ecuador" |
| **Límites económicos** | <1 M€ de aportaciones con entrada en capital · <1,5 M€ acumulado · **<500 k€ facturados** en el último ejercicio y en el actual |
| **Entregables (todos obligatorios)** | Formulario + cuestionario **Business Model Canvas** + **vídeo de máximo 5 minutos** (YouTube/Vimeo). Todo **en español** |

> **Corrección importante:** el premio son **$10.000**, no los $11.355 que
> aparecen en la web. El mensaje de WhatsApp tenía razón. Y **quedan 28 días**,
> no dos semanas: eso cambia el plan, porque ahora **S2 (los libros) sí cabe**.

### 6.2 Las dos dudas que teníamos, resueltas

**No hace falta tener empresa para presentarse.** Puede participar un
emprendedor o empresario individual. La sociedad mercantil en Ecuador solo es
obligatoria **si ganas**, para cobrar. Esto elimina el riesgo que estaba marcado
como medio-alto.

**Anatris encaja en dos sectores de la lista a la vez**, Educación y Salud, y
supera con holgura el listón de "prototipo avanzado": está en producción y
cobrando.

⚠️ **Lo único que debes confirmar tú:** el premio es para "proyectos
desarrollados en Ecuador por emprendedores, empresarios individuales, grupo de
emprendedores o por sociedades mercantiles ecuatorianas". Comprueba que encajas.

### 6.3 Detalles de las bases que cambian cómo se trabaja

- **Una vez enviada, la propuesta NO se puede modificar**, ni siquiera dentro de
  plazo. Se envía cuando está terminada, no antes.
- Puedes presentar varios proyectos si son claramente distintos. No aplica.
- El vídeo de **más de 5 minutos queda descalificado**. Es un corte duro.
- Al inscribirte declaras, entre otras cosas, **"que la solución propuesta está
  probada o, al menos, debe demostrarse que existen indicadores o pruebas
  suficientes de que funciona"**. Es literalmente la razón por la que S3
  (analítica + usuarios reales) no es opcional: es un requisito declarado.
- Cedes derechos de imagen sobre el vídeo, y **garantizas tener permiso de
  cualquier tercero que aparezca en él**. Si grabas a un fisio o a un paciente,
  necesitas su autorización por escrito.
- La inexactitud u omisión de información relevante puede excluirte, incluso
  después de haber ganado. Otra razón para no exagerar la tracción ni el estado
  de verificación del contenido.

### 6.4 Los 7 criterios con los que te van a puntuar

Y con qué respondes a cada uno hoy:

| Criterio | Tu respuesta | Estado |
|---|---|---|
| Soluciona un problema | Formación clínica de calidad en español a $7,99 frente a ~$200/año en inglés | 🟢 Falta la cifra ecuatoriana |
| Llegada al mercado | Producto en producción, Stripe funcionando, 4 monedas | 🟢 |
| Innovación tecnológica | Rig biomecánico calculado + normal vs. patológico. Ninguna app del mercado lo tiene | 🟢 Tu punto más fuerte |
| Potencial de crecimiento | Software puro, suscripción, i18n pendiente pero mapeada | 🟡 |
| Equipo | — | 🔴 **El más flojo.** Prepara esta respuesta |
| Presentación | Vídeo ≤5 min + BMC | 🔴 Por hacer (S4) |
| Cumplimiento de bases | — | 🟢 |

### 6.5 Veredicto: **sí, es viable — y estás por encima del listón técnico**

**A favor:**

- Piden "prototipo avanzado". Tú tienes un producto **en producción, con pagos
  reales funcionando end-to-end**. Eso te sitúa por encima del 90% de los
  candidatos, que presentan mockups.
- Tecnología de alto impacto: el rig biomecánico calculado + patologías
  modeladas es una afirmación técnica defendible, no marketing.
- Impacto social con un relato limpio y **cierto**: formación clínica de calidad
  en español a $7,99 frente a $200/año en inglés. En Ecuador y LatAm eso es
  acceso real, no una frase de pitch.
- Escalable y sostenible: software puro, suscripción, margen alto.

**En contra (lo que hay que tapar antes del 1 de septiembre):**

| Riesgo | Gravedad | Mitigación en el plazo |
|---|---|---|
| **0% de ROM verificado** | 🔴 Alta — si un jurado clínico lo detecta, se cae el relato de rigor | Hombro y rodilla son **8 valores**: media hora con Kapandji y Oatis delante. Con 28 días cabe de sobra (S2) |
| **Cero tracción demostrable** | 🔴 Alta — las bases te hacen **declarar** que hay "indicadores o pruebas suficientes de que funciona" | Encender PostHog **hoy** y traer 15–30 usuarios reales. Con 28 días te dan ~3 semanas de datos, no 10 días (S3) |
| **Equipo** | 🔴 Alta — es un criterio de puntuación explícito y hoy es tu punto más flojo | Decide si te presentas solo o con equipo, y prepara la respuesta. No se improvisa en el vídeo |
| **Cero prueba social** | 🟠 Media | 3 testimonios con nombre y centro (S1) |
| **La demo no arranca en el producto** | 🟠 Media — el jurado ve un muro legal | ✅ Arreglado en S1 |
| ~~Sin figura legal~~ | ✅ Resuelto | Las bases admiten emprendedor individual; la sociedad solo hace falta si ganas |
| Nombre "Anatris" sin registrar | 🟢 Baja | Comprobar disponibilidad; no bloquea |

### Calendario hasta el 1 de septiembre (28 días)

| Semana | Qué |
|---|---|
| **Ahora (4–6 ago)** | Encender PostHog (2 variables + redeploy) y **empezar a traer usuarios**. Todo lo demás puede esperar; esto no, porque los datos necesitan tiempo |
| 5–10 ago | S2: los libros (8 páginas de ROM). Pedir los 3 testimonios |
| 11–17 ago | Grabar el clip del laboratorio → sirve para el hero, el og:image y el vídeo de candidatura |
| 18–24 ago | S4: Business Model Canvas + vídeo de 5 min + carta de apoyo |
| 25–29 ago | Revisión, ensayo del vídeo, comprobar cifras de tracción |
| **30–31 ago** | **Enviar.** Nunca el día 1: no se puede modificar tras enviar y las bases eximen de fallos técnicos en el envío |

### 6.6 Cómo presentarlo (el encuadre importa más que el producto)

**No lo presentes como "una app de anatomía 3D".** Hay diez. Preséntalo así:

> **Anatris — el primer simulador de razonamiento clínico musculoesquelético en
> español.** No muestra el cuerpo: modela cómo se mueve, qué falla cuando duele,
> y cómo se explora. Cada afirmación va con su fuente.

Tres pilares para el pitch, en este orden:

1. **El problema, con cifra ecuatoriana.** Cuántos estudiantes de fisioterapia
   hay en el país, cuánto cuesta la alternativa, cuántos la pueden pagar.
   *Consigue el dato real; no lo inventes.*
2. **La tecnología, demostrada en 40 segundos.** Abducción normal → cambias a
   discinesia escapular → el rig se mueve distinto, el ratio pasa de 2:1 a 6.7:1,
   se resalta el serrato, aparece la fuente (Kibler 2013). Ese clip **es** el
   pitch. Nadie más puede enseñar eso.
3. **La tracción.** Usuarios, retención, y una carta de una universidad o
   clínica ecuatoriana. Aunque sean números pequeños, un número real vence a
   cualquier proyección.

Y ten preparada la respuesta a la pregunta que **siempre** hace el jurado:
*"¿por qué no lo hace Complete Anatomy mañana?"* → porque su producto es un
atlas y el tuyo es un motor biomecánico con contenido clínico citado; el foso no
es el 3D, son las 59.000 líneas de modelado clínico y el rig calibrado.

---

## 7. Plan de trabajo por sesiones

Diseñado para arrancar en frío. **Bloque A (S1–S4) es la carrera de eAwards** —
hazlas en orden. **Bloque B en adelante es el producto a 6 meses.**

Estado: ⬜ pendiente · 🟡 en curso · ✅ hecho

---

### 🏁 Bloque A — Impecable para eAwards (≤ 2 semanas)

#### 🟡 S1 · Primera impresión y prueba social — *código hecho 2026-08-04; faltan 2 activos*
**Objetivo:** que quien abra el enlace vea el producto en 3 segundos y crea en él.

**✅ Hecho y verificado en navegador real (localhost:5233):**
- **Landing antes del gate legal** (`App.tsx`). El muro de texto médico ya no es
  lo primero que ve un visitante. El consentimiento NO se debilita: el gate sigue
  bloqueando la app, así que nadie llega a una ficha, un ROM ni un test sin
  aceptar; y un enlace profundo (`/rodilla/movimiento`) marca `entered`, se salta
  la landing y cae en el gate igual que antes. Verificado: raíz → landing sin
  gate → "Entrar a la app" → gate, sin canvas ni TopBar → "Acepto" → app con 3D.
- **`HeroMedia`** (`src/components/landing/HeroMedia.tsx`): el hero reproduce
  `/hero-lab.webm|mp4` en bucle mudo cuando exista, y cae al goniómetro SVG
  mientras no exista. Verificado el fallback: cero cajas rotas.
- **Open Graph + Twitter card** (`index.html`): 14 etiquetas, verificadas en el
  DOM y presentes en `dist/`.
- **`og:image` generado** — `npm run gen-og-image` → `public/og-image.png`
  1200×630 con marca, goniómetro y cifras reales (6 / 113 / 85).
- **`SocialProof`** (`src/components/landing/SocialProof.tsx`): bloque de
  respaldo bibliográfico (Kapandji · Oatis · Neumann · Magee · Dufour), que es
  cierto hoy y verificable dentro de la app.
- Typecheck limpio, 123/123 tests, build OK, consola sin errores. Coste en la
  entrada: **+0,7 KB gzip** (113,0 → 113,7 KB).

**⬜ Lo que falta, y solo lo puedes hacer tú:**
1. **Grabar el clip del laboratorio.** El canvas WebGL no se puede capturar
   desde las herramientas. Receta completa en [`hero-clip.md`](hero-clip.md).
   En cuanto los archivos estén en `public/`, la landing los usa sola.
2. **Conseguir 3 testimonios reales.** `src/data/testimonials.ts` está vacío a
   propósito y el bloque no se renderiza hasta que haya entradas reales con
   permiso. **No se inventan.** Es la tarea de más retorno de la semana.

**Aceptación pendiente:** compartir la URL de producción en WhatsApp muestra la
tarjeta con imagen, y el hero reproduce el laboratorio.

#### 🟡 S2 · Verificación clínica del contenido de demo — *pase de artículos hecho 2026-08-04; faltan los libros*
**Objetivo:** que la promesa "cada dato con su fuente" sea cierta donde se mira.
**Informe completo: [`verificacion-hombro-rodilla.md`](verificacion-hombro-rodilla.md).**

**✅ Hecho** (método: cada cita contrastada contra el registro público de PubMed
del artículo citado; solo se marca `verified` si el resumen contiene la cifra):
- **0 avisos** en `npm run audit-data` (antes 2). Tests de rodilla 6/11 → **8/11**.
- **4 errores clínicos reales corregidos**, ninguno detectado antes:
  1. `joint-line-tenderness` — sensibilidad **83 → 63%** (su propia fuente,
     Hegedus 2007, dice 63/77). Iba en la dirección peligrosa: sobrevendía el
     test como cribado sensible.
  2. `hawkins-kennedy` — **74/57 → 79/59** (Hegedus 2012, PMID 22773322).
  3. Neer y Hawkins reclasificados `rule-out` → `weak`: ninguno llega al umbral
     de sensibilidad para descartar, que es la conclusión del propio metaanálisis.
  4. `apley-compression` re-atribuido de Malanga 2003 (que no da cifras) a
     Hegedus 2007 (que sí las enuncia).
- Referencia `hegedus-2012` corregida: título inexistente → título real, y
  añadido el PMID que faltaba, así que "Evidencia" ya puede enlazarla.
- Lo no verificable se documentó **dentro del dato** (campo `locator`), así que
  sale solo en la worklist.

**⬜ Lo que falta:**
1. **Las 8 páginas de ROM de hombro y rodilla.** Imposible desde aquí: Kapandji,
   Oatis y Neumann no están en línea, y hoy las citas no tienen ni número de
   página. Son 8 valores, no 161 — media hora con los libros delante. Receta
   exacta en el informe.
2. **7 tests** cuyas cifras no constan en el resumen público (`lift-off`,
   `belly-press`, `relocation`, `cross-body-adduction`, `posterior-sag`,
   `valgus-stress`, `varus-stress`): hacen falta los textos completos.
3. **⚠️ Revisar `apprehension`**: figura como verificado con 72/96, pero el
   resumen de Lo 2004 no contiene esas cifras. Una verificación falsa hace dudar
   de las otras 41.

**Aceptación pendiente:** `npm run audit-data` → hombro 23/23 y rodilla 17/17 en ROM.

#### 🟡 S3 · Instrumentación y tracción real — *código hecho 2026-08-04; falta encender y traer gente*
**Objetivo:** tener números que enseñar al jurado.
**Guía completa: [`analitica.md`](analitica.md).**

**✅ Hecho:**
- **12 eventos de producto** además de los 7 de embudo: `region_opened`,
  `mode_opened`, `movement_driven`, `pathology_selected`, `dissection_used`,
  `test_opened`, `exam_mode_started`, `neuro_opened`, `study_tab_opened`,
  `patient_card_exported`, `evidence_opened`, `guide_opened`.
- **`trackChange`**: descarta el evento si el payload no cambió. Sin eso, leer el
  hombro 10 minutos daría un `region_opened` por render y toda media por usuario
  sería basura. `movement_driven` se dispara al SELECCIONAR, no por fotograma.
- Cableado en un solo sitio por señal: región y modo cuelgan del par que
  sincroniza el router (cubre TopBar, enlace profundo y botón Atrás con un
  efecto); la disección se instrumenta en los mutadores del canal, así que el
  teclado (D/A) y los botones quedan cubiertos a la vez.
- **4 tests nuevos** sobre el diccionario de eventos (valores únicos, snake_case,
  nombres de embudo estables). 123 → **127 tests**.
- Verificado en navegador: laboratorio, tests ortopédicos y modo examen sin
  errores de consola. Coste en la entrada: **+0,4 KB gzip**.
- La disciplina de privacidad quedó escrita en el código: sin clave no se envía
  nada, sin autocaptura, sin grabación de sesión, y **nunca contenido** — solo
  ids de un vocabulario público.

**⬜ Lo que falta, y bloquea la candidatura:**
1. **Encender PostHog en producción.** Dos variables en Vercel
   (`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`) + un despliegue nuevo, porque Vite
   incrusta las `VITE_*` en build. **Sin esto sigue sin haber un solo dato.**
   Recomendado: proyecto en la región UE.
2. **15–30 usuarios reales, esta semana.** Necesitas ≥10 días de datos antes de
   presentar. Ideas ordenadas por coste en la guía.
3. Montar los 4 paneles (embudo, descubrimiento del diferenciador, retención,
   dónde poner el contenido).

**Aceptación pendiente:** panel con usuarios activos, sesiones y regiones más
usadas, con ≥10 días de datos antes de presentar.

#### 🟡 S4 · Material de candidatura — *guion y BMC redactados 2026-08-04*
**Objetivo:** dossier impecable. ✅ Bases confirmadas (§6.1): cierre **1 sep
2026 24:00**, premio **$10.000**, no hace falta empresa.
**Borradores listos en [`candidatura-eawards.md`](candidatura-eawards.md):**
guion del vídeo minuto a minuto (4:30 sobre un máximo de 5:00), Business Model
Canvas completo, checklist de envío y las 3 preguntas del jurado con su
respuesta. Todo lo que solo sabes tú va **entre corchetes**, sin rellenar.
- ⚠️ Corregido de paso: el producto tiene **79 tests**, no 85 (85 es el número de
  *citas*). La cifra inflada estaba ya en el `og:image`; regenerado.
- **Vídeo de máximo 5 minutos** (más = descalificado), en español, subido a
  YouTube o Vimeo. Estructura: problema con cifra ecuatoriana → demo normal vs.
  patológico → tracción real → equipo. Si aparece alguien más, necesitas su
  autorización por escrito (las bases te lo hacen garantizar).
- **Cuestionario Business Model Canvas** del formulario.
- Preparar la respuesta de **Equipo**: es criterio de puntuación y hoy es el
  punto más flojo.
- Una carta de apoyo (docente, clínica o universidad).
- **Aceptación:** candidatura enviada **el 30 o 31 de agosto**, no el día 1: una
  vez enviada no se puede modificar, y las bases eximen al organizador de fallos
  técnicos en el envío.

---

### 🚧 Bloque B — Integridad del producto de pago *(mes 1)*

#### 🟡 S5 · Cerrar la fuga de contenido — *código hecho 2026-08-05; falta desplegar*
Edge function de Supabase que sirve el contenido premium tras verificar la
suscripción. Es el paso que convierte tu biblioteca clínica en un activo.
**Informe completo: [`entitlement-servidor.md`](entitlement-servidor.md).**

**✅ Hecho:**
- Las 7 regiones de pago salen del bundle y las sirve la función `content`,
  que responde 401 sin sesión y **403 sin plan activo**.
- Los registros siguen siendo **síncronos**: App no monta una región premium
  hasta que su payload está instalado, así que los ~30 sitios de lectura no se
  tocaron. Se dividieron `clinicalCases` y `pathologies` en un archivo por
  región (`data/cases/`, `data/pathology/`).
- **Dos puertas**: `locked` (cliente, falseable) y `contentDenied` (servidor).
  Ambas caen en el mismo Paywall.
- Sondas sobre `dist/`: `Hipercifosis`, `whiplash`, `Epicondilalgia` y
  `Hernia discal` **ya no aparecen**. `muscleContentByRegion` −67%,
  `trackByRegion` −74%, `romByRegion` desaparece, precache PWA 2818 → 2397 KB.
- **4 tests nuevos** que impiden la regresión (que es invisible: nada falla, el
  contenido simplemente vuelve a ser público). 127 → **138 tests**.
- Verificado en navegador: rodilla carga con sus 11 tests y sus presets; hombro
  abre sin espera. Consola limpia.

**⬜ Falta:** `npm run build-premium-content && supabase functions deploy content`.
Hasta desplegar, **en producción sigue sirviéndose el build viejo**.

#### 🟡 S6 · Verificación clínica del resto — *triaje hecho 2026-08-06; el resto son los libros*
**Informe completo: [`verificacion-triaje.md`](verificacion-triaje.md).**

**✅ Hecho:**
- **Torácica 0/10 → 2/10**: los dos signos de fractura vertebral se verificaron
  contra Langdon 2010, cuyo resumen sí enuncia las cifras. Total 42 → **44/85**.
- **5 referencias con PMID nuevo** (kibler-2013, gillard-2001, langdon-2010,
  cote-1998, zwerus-2018): sin `pmid`, "Evidencia" no genera enlace a PubMed.
  `kibler-2013` es la fuente que se cita en voz alta en el vídeo de candidatura.
- **Riesgo nuevo detectado en Gillard 2001**: el 85% de Adson es un *valor
  predictivo positivo*, no una especificidad, y el 70/53 de Wright coincide con
  la *media global* de todos los tests. Mismo patrón que la aducción cruzada de
  S2. Anotado en el dato, sin tocar cifras.
- **`npm run triage-citations`** (nuevo): clasifica cada cita pendiente por CÓMO
  se verifica y las agrupa por fuente.
- El test de frescura de payloads ahora compara **todos** los campos, no solo
  `rom` — habría dejado pasar los cambios de esta misma sesión.

**El hallazgo que cambia el plan:** de las 202 citas pendientes, **Kapandji (98)
y Oatis (49) son el 73%**. No son 202 problemas: son **dos libros**. Una tarde
con Kapandji cierra el 48%.

**⬜ Falta:** los libros. Orden por retorno: Kapandji → Oatis → Magee (cierra los
16 tests de tobillo, cadera y torácica que están a 0%) → textos completos.
El camino de verificar desde resúmenes de PubMed **está agotado**: solo funciona
con metaanálisis que publican sus cifras agrupadas, y ya se cosecharon todos.

#### ⬜ S7 · Retención: bucle de vuelta + "mi colección"
Push de la PWA para el repaso pendiente (§3.8) + marcadores y notas
sincronizados (§3.9). **Aceptación:** un usuario que no abre la app en 3 días
recibe un aviso y vuelve; se puede guardar un músculo y encontrarlo mañana.

#### ⬜ S8 · Casos clínicos (de 15 a ~40)
Cervical y lumbar tienen 1 caso cada una. El razonamiento clínico es tu
posicionamiento; 1 caso no lo sostiene. **Aceptación:** ≥ 4 casos por región.

---

### 🌍 Bloque C — Escala *(meses 2–4)*

#### ⬜ S9 · Decisión de i18n y refactor de tipos
`text: Record<Locale,string>`, `group` como enum, `nameEs` → `name` por locale.
**Hacerlo antes de escribir más contenido** (D1 de `ux-premium-audit.md`).

#### ⬜ S10 · Modo "nomenclatura latina" + UI en inglés
El puente barato al mercado global. `nameLat` ya existe en los datos.

#### ⬜ S11 · Plan institucional + modo docente
Precio de aula en Stripe, formulario de presupuesto, proyección limpia, código
de sesión, examen de aula con resultados agregados. *MCP útil: Stripe.*

#### ⬜ S12 · SEO: páginas públicas por test y por región
Contenido ya escrito, prerenderizado a HTML estático. El canal de adquisición
más barato que tienes.

#### ⬜ S13 · Rendimiento y acabado visual
Póster mientras carga, GLB con LOD móvil, progreso real; y G1 del roadmap del
laboratorio (fidelidad del render). *MCP útil: Playwright para verificación
visual real, Blender para el LOD.*

---

### 🚀 Bloque D — Salto de categoría *(meses 4+)*

#### ⬜ S14 · Goniometría por cámara (§4.1)
Prototipo en hombro: MediaPipe Pose en el dispositivo → ROM medido → comparación
con el modelo normal. Encuadre educativo, procesamiento local, disclaimer firme.

#### ⬜ S15 · Asistente clínico anclado a la base citada (§4.2)
Acotado a hombro y rodilla. Rechaza responder sin fuente.

#### ⬜ S16 · Infraestructura de ingeniería
CI (typecheck + tests + `audit-data` en cada push), E2E del embudo, Sentry.
*MCP útil: GitHub, Playwright, Sentry.*

---

## 8. Cómo sabremos que funciona

| Métrica | Hoy | Objetivo 3 meses |
|---|---|---|
| Visitante → ve el 3D | desconocido (3 puertas) | > 60% |
| Registro → suscripción | desconocido | > 4% |
| Retención D7 | desconocido | > 25% |
| Minutos por sesión | desconocido | > 8 |
| ROM verificado | 0% | 100% |
| Tests verificados | 47% | 100% |
| Idiomas | 1 | 2 (es, en) |
| Chunk de entrada (gzip) | 113 KB | < 80 KB |
| Cuentas institucionales | 0 | ≥ 1 piloto |

**Lo primero que hay que arreglar es que casi toda esta tabla dice
"desconocido".** Por eso S3 va antes que casi todo lo demás.

---

## Fuentes consultadas para §6

- [eAwards Ecuador · Global eAwards](https://globaleawards.com/es/ecuador/)
- [eAwards Argentina 2026 — inscripciones abiertas · CevicheNews](https://www.ceviche.news/eawards-argentina-2026-inscripciones-abiertas/)
- [NTT DATA Foundation abre sus eAwards 2026 · Club del Emprendimiento](https://www.clubdelemprendimiento.com/blog/pymes/ntt-data-foundation-abre-sus-eawards-2026/)
- [eAwards España 2026 · El Ecosistema Startup](https://ecosistemastartup.com/eawards-espana-2026-10-000e-sin-equity-para-tu-startup-tech/)
- [eAwards Ecuador · I3LAB ESPOL](https://www.i3lab.org/noticias/2025/7/30/eawards-ecuador)
