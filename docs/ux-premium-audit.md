# Auditoría full-stack — producto, UX, monetización, i18n

Fecha: 2026-07-29 · Medido sobre `main` (bb636c1), viewport 1440×900 y 375×812, región hombro.
Todos los números de esta auditoría están medidos en el DOM o en el build, no estimados.

---

## ESTADO (2026-07-29, misma sesión)

| # | Hallazgo | Estado |
|---|---|---|
| A1/A2 | Gate solo por región; Pricing contradecía al código | **Arreglado** — gate por capacidad en `entitlements.ts` + copy alineado |
| A3 | Contenido de pago en el bundle público | **Descarga arreglada** (entrada 939 → 337 KB, rodilla/cadera/tobillo/columna fuera); la fuga sigue: falta verificación en servidor |
| D7 | Sin rutas: todo en una URL | **Arreglado** — `/hombro/movimiento`, atrás/adelante, sitemap.xml |
| A4/A5 | Sin CTA ni modos visibles <1860px | **Arreglado** — modos desde 1024px, "Hazte Premium" desde 640px |
| A6 | Columna caía al contenido del hombro | **Arreglado** — índice vacío en vez de `SHOULDER_MUSCLES` |
| A7 | 0/161 citas de ROM verificadas | Pendiente (trabajo de contenido, no de código) |
| B1–B7 | Panel izquierdo: 4,46 pantallas, 37 filas para 18 músculos | **Arreglado** — acordeón de 3 secciones, 18 filas, 1,6 pantallas |
| C1–C5 | Acentos, ⌘K en Windows, banner 112px, a11y | **Arreglado** |
| D | Sin infraestructura i18n | Pendiente (decisión de tipos antes de escribir más contenido) |
| E | Bundle de entrada 934 KB | Pendiente (mismo cambio que A3) |
| — | Modelo 3D se trababa al moverlo | **Arreglado** — ver "Rendimiento del 3D" al final |

### Medido después de los cambios (1440×900, hombro)

| | Antes | Después |
|---|---|---|
| Scroll del panel izquierdo | 4,46 pantallas (3343 px) | 1,60 pantallas (922 px) |
| Filas de músculo | 37 (18 únicos) | 18 |
| Botones en el rail | 84 | 33 |
| Secciones abiertas a la vez | 8 | 1 (de 3) |
| Modos visibles en el header | 0 | 4 |
| CTA de upgrade visible | no | sí |
| Chrome fijo en móvil (375) | 160 px (20%) | 81 px (10%) |
| `<h1>` / `aria-current` / `:focus-visible` | no / 0 / no | sí / sí / sí |
| Chunk de entrada (todos los visitantes) | 939 KB · 234 KB gzip | 337 KB · 99 KB gzip |
| Contenido clínico de pago en la entrada | rodilla, cadera, tobillo, columna | ninguno |
| URLs de la app | 1 | 37 (`/hombro/movimiento`, …) + sitemap |

### Lo que queda, por orden de impacto en la venta

1. **0/161 citas de ROM verificadas** (`npm run audit-data`). Trabajo de
   contenido: no se pueden inventar números de página, la propia guía de autoría
   de `shoulderMuscles.ts` lo prohíbe.
2. **La fuga de contenido sigue abierta.** Partir el bundle arregló la DESCARGA,
   no el acceso: los chunks de pago siguen siendo accesibles para quien los pida.
   Solo se cierra sirviendo el contenido tras una verificación de entitlement en
   servidor (edge function / RLS de Supabase).
3. **i18n**: decidir `text: Record<Locale,string>` y `group` como enum ANTES de
   escribir más contenido. Las rutas ya están listas para prefijo de idioma
   (`routing.ts` separa id interno de slug público, que es el trabajo difícil).
4. **Columna sin `MuscleContent` rico** (región de pago más pobre que la gratis).

---

## A. Monetización y gating

### A1 — El gate es solo por región, y la región gratis lo incluye TODO

`src/auth/entitlements.ts:14` define `FREE_REGIONS = {shoulder, fundamentos}`.
`src/App.tsx:182` calcula `locked = !canAccessRegion(regionId)`.
Un grep de todos los usos de entitlements devuelve solo 4 archivos: `App`, `TopBar`,
`AccountMenu`, `Pricing`. **No existe ningún otro gate en la aplicación.**

Consecuencia: el usuario gratuito, dentro del hombro, tiene acceso completo a:

- laboratorio de movimiento (rig, ritmo escapulohumeral, activación EMG, capas, disección)
- los 14 tests ortopédicos con sens/spec, nomograma de Fagan, clusters y **modo examen**
- panel neuro (dermatomas/miotomas/reflejos)
- modo paciente + exportar tarjeta para paciente
- estudio completo: SRS, flashcards, quiz, casos clínicos, racha
- pantalla de evidencia con enlaces a PubMed

Eso es prácticamente todo el valor percibido del producto. Pagar solo añade *más
articulaciones*, que es el argumento de venta más débil posible.

### A2 — La página de precios promete algo que el código contradice

`src/components/landing/Pricing.tsx:23-37` lista como **PREMIUM**:

- "Laboratorio de movimiento (biomecánica interactiva)"
- "Repaso inteligente con repetición espaciada en todas las regiones"

pero el plan gratis los tiene en el hombro. Y el bloque `FREE_FEATURES` dice
"Repaso espaciado, cuestionarios y tarjetas del hombro" — es decir, la propia
página se contradice a dos columnas de distancia. Un fisio que lo note pierde
confianza en todo lo demás.

`src/components/account/Paywall.tsx:15-20` tampoco menciona el laboratorio ni los
tests ortopédicos, que son lo mejor que tienes.

### A3 — El contenido de pago viaja en el bundle de todos los visitantes

Del `npm run build`:

| chunk | tamaño | gzip | se carga |
|---|---|---|---|
| `index-*.js` | 934 KB | 232 KB | **siempre, incluida la landing** |
| `romPhaseAtAngle-*.js` | 997 KB | 273 KB | al abrir cualquier vista 3D |
| `module-*.js` | 230 KB | 76 KB | dinámico |

Sondas de texto sobre `dist/assets/index-*.js` encuentran contenido clínico de
**rodilla, cadera, tobillo y columna** — las cuatro regiones de pago — en el chunk
de entrada, el que declara `dist/index.html` como `<script type="module">`.

Dos consecuencias:

1. **El paywall es cosmético.** Cualquiera abre devtools y lee toda la biblioteca
   clínica sin pagar ni registrarse.
2. Un visitante que aún no ha decidido nada se descarga 232 KB gzip de datos que
   no puede ver.

Arreglo: `import()` dinámico por región + verificar la entitlement en el servidor
(edge function / RLS de Supabase) antes de entregar el contenido de regiones pagas.

### A4 — En un portátil de 1440 px el CTA de upgrade no existe

Medido en el DOM a 1440 px, botones **visibles** en el header:

```
Hombro ▾ | Buscar estructura ⌘K | Guía | Explorar ▾ | Iniciar sesión
```

Botones **ocultos**: `Fundamentos, Hombro, Codo, Columna, Cadera, Rodilla, Tobillo,
Planes, Acerca de, Legal, Explorar, Aprender, Estudiar, Movimiento`.

El botón "Planes" lleva `min-[1860px]:block` (`TopBar.tsx:319`), así que solo aparece
en monitores de 1860 px o más. La nav inline con los candados también.
`AccountMenu` solo ofrece "Mejorar a Premium" **si ya has iniciado sesión**.

Resultado: un visitante anónimo en el portátil típico de un fisio no tiene ni un
solo punto de entrada a la venta, salvo abrir el desplegable de regiones, elegir una
con candado y chocar con el Paywall.

### A5 — La amplitud del producto es invisible

Los cuatro modos (Explorar / Aprender / Estudiar / Movimiento) colapsan por debajo
de 1860 px en un desplegable etiquetado simplemente "Explorar". Nadie descubre que
existe "Movimiento", que es tu diferenciador. Además queda junto a "Hombro ▾": dos
desplegables adyacentes sin etiqueta que se leen como el mismo control.

### A6 — Las regiones de pago son menos profundas que la gratuita

`src/data/muscleContentByRegion.ts:19-25` registra contenido rico solo para
`shoulder, elbow, hip, knee, ankle`. **La columna (cervical/torácica/lumbar) no
tiene ficha clínica rica.** Y el fallback (`:34-39`) devuelve `SHOULDER_MUSCLES`
cuando la región no está registrada.

Verificado: `levator-scapulae` existe con el mismo id en cervical y en el contenido
del hombro. En la región cervical (de pago) ese músculo **muestra la ficha del
hombro**. Cualquier colisión de id futura filtra contenido equivocado a una región
que el usuario pagó.

### A7 — Verificación de citas

`npm run audit-data`:

```
ROM verificado:    0/161  (0%)
Tests verificados: 40/75  (53%)   ankle 0/5, hip 0/8, elbow 4/8
```

Vendes "contenido clínico con referencias" y ninguna página de ROM está confirmada.
Frente a un profesional es tu mayor riesgo de credibilidad.

---

## B. El panel izquierdo (tu pregunta directa)

Medido a 1440×900 en la región hombro:

- **scrollHeight 3343 px sobre 750 px visibles = 4,46 pantallas de scroll**
- 84 botones en un rail de 260 px
- 8 secciones, todas abiertas a la vez, ninguna colapsable

| sección | alto | % del scroll |
|---|---|---|
| Músculos | 1639 px | 49% |
| Rango de movimiento | 462 px | 14% |
| Capas | 342 px | 10% |
| Fases | 289 px | 9% |
| Profundidad | 133 px | 4% |
| Lado | 65 px | 2% |
| Visualización | 61 px | 2% |
| Módulo | 49 px | 1% |

### B1 — Respuesta directa: hoy no es un problema de gating, es de ruido

En el hombro **no hay ningún músculo bloqueado**: la región entera es gratuita, así
que la lista no está mintiendo al usuario. El problema real de esa lista es otro:

**duplica cada músculo.** 37 filas para 18 músculos únicos (2,06×). Supraespinoso
aparece en "Manguito rotador" y en "Abductores". Deltoides en "Abductores" y
"Flexores". Trapecio tres veces. `MuscleList.tsx:54-64` lo hace a propósito
(un músculo se inserta bajo cada uno de sus `groups`), pero al usuario le lee como
un bug y le cuesta ~800 px de scroll.

Arreglo: una fila por músculo con chips de grupo, o un conmutador
"Por función / Alfabético" — patrón que ya existe en `RomPanel`
("Por movimiento / Por músculo"), así que sería consistente.

**Y sobre el principio que planteas:** cuando sí haya elementos premium en ese panel,
no los escondas — muéstralos con candado. Un candado vende; un hueco no comunica
nada. Es exactamente lo que ya hace bien `TopBar` con las regiones.

### B2 — Sin jerarquía

Ocho secciones abiertas simultáneamente, sin acordeón ni encabezados fijos.
"Lado" (65 px, se toca una vez por sesión) pesa visualmente lo mismo que
"Músculos" (1639 px, se usa constantemente).

### B3 — Dos controles para lo mismo, uno encima del otro

"Profundidad" (`DepthPeeler`, slider) y "Capas" (checkboxes) son la misma verdad:
el propio comentario de `DepthPeeler.tsx:6-8` dice que el slider **se deriva** de
las capas activas. Son 475 px combinados para un solo concepto.

### B4 — "Fases" no pertenece a Explorar

289 px de navegación del modo Aprender dentro del modo Explorar. Al pulsar una fase
te saca del modo actual (`Sidebar.tsx:114-118`). Es un cambio de modo disfrazado de
lista de navegación.

### B5 — Tres navegadores de músculos apilados

`MuscleList` + `RomPanel` en modo "Por músculo" + clic directo en el 3D. Tres formas
de hacer lo mismo, dos de ellas en el mismo rail de 260 px.

### B6 — Sin filtro dentro del panel

Existe ⌘K global, pero no hay búsqueda local. En rodilla y columna la lista es aún
más larga que en el hombro.

### B7 — Botón muerto

`Sidebar.tsx:63` — "Reportar un problema" es un `<button>` sin `onClick`. No hace nada.

---

## C. Craft / percepción premium

### C1 — Acentos ausentes en la interfaz

Renderizados hoy: `Musculos`, `Visualizacion`, `Modulo`, `Seleccion`, `Proximamente`,
`Cargando indice anatomico...`, y el banner legal entero
("formacion", "clinico", "atencion"). ~45 ocurrencias en `src/components` y `src/data`.

Causa raíz identificable: hubo un incidente de codificación (quedan `fix-mojibake.mjs`
y `fix-encoding.mjs` en la raíz del repo, y `RomPanel.tsx:30-33` lleva una
"ENCODING NOTE" que prohíbe literales no-ASCII y construye `°`, `–`, `·` desde
code points). La defensa contra el bug dejó el español sin tildes.

Para un producto de pago en español es lo primero que nota un profesional.

### C2 — `⌘K` en Windows

`TopBar.tsx:290` y `GuideHub.tsx:214,226` escriben el glifo de Mac fijo.
El handler sí acepta ctrl (`CommandPalette.tsx:52`). En Windows/Linux debe decir `Ctrl K`.

### C3 — El banner legal come el 20% de la pantalla en móvil

Medido a 375×812: banner 112 px + header 48 px = 160 px, el 20% del viewport,
en todas las vistas, permanentemente — y el aviso **ya se aceptó** en el gate inicial.
Debería ser una barra fina descartable, o vivir en el pie y en Legal.

### C4 — Accesibilidad (medido en el DOM)

- sin `<h1>` en toda la app (solo dos `<h2>`)
- `aria-current`: 0 usos — ni en la nav de regiones ni en el segmentado de modos
- `aria-pressed`: 0 usos — los toggles de capas/lado no anuncian su estado
- sin ninguna regla `:focus-visible` en el CSS
- 19 objetivos táctiles por debajo de 32 px

Para venta institucional (universidades, clínicas públicas europeas) la accesibilidad
se pregunta en el pliego.

### C5 — Casillas que no son casillas

`Sidebar.tsx:183-201` y `DisplayControls` usan `<button>` con un cuadrito SVG dibujado
en vez de `<input type="checkbox">`. No se anuncian como casilla ni exponen estado.

---

## D. Internacionalización (lo que quieres a futuro)

**Estado actual: cero infraestructura.** `<html lang="es">` fijo, ninguna librería
i18n instalada, ~679 nodos de texto en JSX + ~120 literales en componentes, y
**22.040 líneas de datos clínicos** con prosa española incrustada.

### D1 — El tipo de datos está casado con el idioma

`src/types/muscleContent.ts`:

```ts
nameEs: string;      // no hay nameEn
nameLat: string;
origin: { text: string; cite: Citation[] };   // text SIEMPRE en español
```

Traducir significaría duplicar cada archivo de datos, o cambiar el tipo a
`text: Record<Locale, string>`. **Esta decisión hay que tomarla ahora**: cada músculo
nuevo que escribas multiplica el coste de la migración.

### D2 — Dos sistemas de grupos en paralelo

`Muscle.groups` es un enum traducible vía `FUNCTIONAL_GROUP_LABEL`.
`MuscleContent.group` es texto libre en español (`'Manguito rotador'`).
El mismo concepto, modelado dos veces, una de ellas intraducible. Unifícalos al enum.

### D3 — Prosa generada en código

`patientPhrase.ts`, `RhythmReadout`, la prosa clínica de ROM y los textos de banderas
concatenan español en el código. Un diccionario de strings no basta: hay que
plantillarlo (con cuidado del orden de palabras y de las concordancias de género).

### D4 — Formato de fecha fijo

`AccountMenu.tsx:53` — `toLocaleDateString('es', ...)`.

### D5 — Lo que ya está bien

`src/lib/pricing.ts` es multi-moneda con detección por `Intl.Locale` y `currency_options`
de Stripe. Es un buen cimiento y ya cubre USD/EUR/MXN/COP.

Faltan BRL, ARS, CLP, PEN. Ojo con Brasil: es el mercado de fisioterapia más grande
de LatAm y necesita **portugués**, no español — no basta con añadir la moneda.

### D6 — El latín es tu puente

`nameLat` ya está en los datos. La nomenclatura latina es idéntica en todos los
mercados. Un modo "mostrar nomenclatura latina" te da valor internacional inmediato
sin traducir una sola línea de prosa, y es un argumento de venta académico.

### D7 — Sin rutas

Todo es estado de React sobre una sola URL. No puedes tener `/es/hombro` y
`/en/shoulder`, ni enlazar a una región o a un test concreto. Eso te bloquea el SEO
orgánico en cada país nuevo (que es el canal barato) y también impide que un fisio
comparta un enlace a un test con un colega — un vector de crecimiento gratis que
hoy no existe.

---

## E. Rendimiento

- Entrada 934 KB (232 KB gzip) en la primera visita, landing incluida. Debería estar
  por debajo de 100 KB gzip.
- `romPhaseAtAngle` 997 KB (273 KB gzip) junto al visor 3D.
- Precache PWA de 2,6 MB.

La causa es la misma que A3: todos los datos clínicos son imports estáticos.
Arreglarlo resuelve el rendimiento y la fuga de contenido de una vez.

---

## Propuesta de nuevo gating

El error de base es cortar por **región**. Lo que un fisio paga no es "más músculos",
es lo que usa **delante del paciente** y para preparar el examen.

**Gratis**
- Hombro completo en Explorar + Aprender + Estudiar
- Movimiento en modo demostración: un solo movimiento (abducción), sin tests
  ortopédicos, sin neuro, sin modo paciente
- Ficha clínica completa del hombro con sus citas

**Premium**
- El resto de regiones
- Laboratorio de movimiento completo (todos los movimientos, capas, disección, activación)
- Tests ortopédicos + Fagan + clusters + modo examen
- Panel neuro
- Modo paciente + exportar tarjeta
- Evidencia clínica
- Sincronización de progreso entre dispositivos

Y en los paneles: los elementos premium **visibles con candado**, no ocultos.

---

## Orden que yo seguiría

**P0 — esta semana**
1. Redefinir el gate free/premium (propuesta de arriba)
2. Alinear `Pricing.tsx` y `Paywall.tsx` con lo que el código hace de verdad
3. CTA de upgrade visible por debajo de 1860 px + modos visibles (no escondidos en ▾)
4. Acentos en toda la UI

**P1 — rediseño del panel izquierdo**
5. Acordeón, una sección abierta a la vez
6. Deduplicar la lista de músculos (37 filas → 18)
7. Fusionar "Profundidad" y "Capas" en un solo control
8. Sacar "Fases" de Explorar
9. `h1`, `aria-current`, `aria-pressed`, `:focus-visible`, checkboxes reales

**P2 — integridad del producto de pago**
10. Sacar el contenido de pago del bundle público + verificación en servidor
11. Arreglar el fallback de columna a `SHOULDER_MUSCLES` (contenido incorrecto en
    una región pagada)
12. Contenido clínico rico para la columna

**P3 — credibilidad**
13. Verificar las citas de ROM (0/161 hoy)

**P4 — internacionalización**
14. Refactor de tipos: `text: Record<Locale, string>`, `group` como enum,
    `nameEs` → `name: Record<Locale, string>`
15. Enrutado por idioma (`/es/...`, `/en/...`)
16. Modo "nomenclatura latina" como puente internacional barato
17. Traducción de UI, luego de datos, empezando por inglés

---

## Rendimiento del 3D — por qué se trababa

El atlas de `Explorar` son **6316 mallas** (`public/anatomy-index.json`), y
`AnatomyModel` **clona un material por malla** para poder tintarlas
individualmente. Sobre esa base había tres problemas encadenados:

1. **`mat.needsUpdate = true` en cada malla del paso de apariencia.**
   `needsUpdate` sube la versión del material, lo que obliga al renderer a
   recalcular los parámetros del programa y consultar la caché de shaders **para
   cada uno de los 6316 materiales**. Ninguna de las propiedades que ese bucle
   escribe (`emissive`, `emissiveIntensity`, `color`, `opacity`, `renderOrder`)
   lo necesita: son uniforms que three.js relee cada frame. La única que sí forma
   parte de la clave del programa es `transparent`, así que ahora solo se sube la
   versión cuando esa propiedad realmente cambia.

2. **El hover repintaba las 6316 mallas.** `hoveredMeshName` estaba en las
   dependencias de ese efecto, así que pasar el ratón por el modelo — que cambia
   el hover varias veces por segundo — disparaba un repintado completo cada vez.
   Ahora el cuerpo del bucle es una función `paintMesh(mesh)` y, cuando lo único
   que cambió fue el hover, solo se repintan **dos** mallas: la que se abandona y
   la que se entra. El resto se estaba repintando al valor que ya tenía.
   Además `handlePointerOver` ahora ignora los eventos que repiten la misma malla
   (r3f dispara uno por objeto intersectado).

3. **Nada bajaba el coste mientras se arrastraba la cámara.** Se añadió
   `AdaptiveDpr` + `AdaptiveEvents` con `performance={{min: 0.5}}` y `regress()`
   en `onChange` de los controles, en los DOS visores: durante el arrastre baja
   la resolución de render y se **deja de hacer raycast**, y ambas se restauran
   en cuanto la cámara se detiene. El frame quieto —el único que alguien mira—
   conserva la calidad completa. En el laboratorio pesa más aún: son 1300+
   mallas *skinned*, así que cada frame paga también el skinning en CPU, y hacer
   raycast contra una malla skinned es lo más caro que hace three.js.

4. **`smoothTime` era 0,5 s (atlas) y 0,4 s (rig).** Aunque los frames vayan
   bien, ese suavizado hace que el modelo persiga al cursor con retraso y se
   percibe como que "se traba". Ahora 0,18 s, y 0,08 s mientras se arrastra.

No pude medir FPS desde el navegador embebido (no compone frames, por eso
tampoco se pueden hacer capturas del rig — ver la nota de memoria
`movement-lab-visual-verify`). El diagnóstico es estático pero las tres causas
son verificables leyendo el código; **conviene confirmar la mejora en tu propio
`npm run dev`** arrastrando el modelo en Explorar y en Movimiento.
