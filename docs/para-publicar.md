# Qué falta para publicar

Revisión del **2026-11-03**. Estado medido, no estimado: cada cosa de aquí se
comprobó ejecutando algo.

---

## 0. Supabase estaba apagado — ya no

El proyecto `ytauxazmjbdlkvfmdwnr` estaba en estado `INACTIVE`. Lo dijo el propio
despliegue:

```
unexpected deploy status 404: Cannot retrieve service for project
ytauxazmjbdlkvfmdwnr with currect status 'INACTIVE'.
```

Con la web viva y Supabase muerto, quien entraba veía una web que cargaba y un
hombro gratuito que funcionaba, porque va en el bundle. Nada más: sin sesión,
sin cobro y sin ninguna región de pago, porque desde la sesión del entitlement
el contenido premium **ya no viaja en el bundle**, lo sirve esa función.

**Reactivado el 2026-11-03** vía la Management API (`POST /v1/projects/{ref}/restore`),
con el token que ya tenía el CLI. `INACTIVE` → `COMING_UP` → `RESTORING` →
`ACTIVE_HEALTHY` en unos 90 segundos. Las cuatro funciones (`content`,
`create-checkout`, `billing-portal`, `stripe-webhook`) vuelven a estar `ACTIVE`, y
`content` se redesplegó con los payloads nuevos (cadera 120°, rodilla 135°).

**La puerta de entitlement, comprobada en producción** (POST con la clave anon,
sin sesión):

| región | respuesta | por qué |
|---|---|---|
| `knee` | **401** | premium, sin autenticar |
| `hip` | **401** | premium, sin autenticar |
| `shoulder` | **404** | gratuita: va en el bundle y no se sirve aquí |
| inexistente | **404** | no se puede usar como sonda de qué regiones existen |

Es exactamente el comportamiento que el diseño pedía.

> **Lo que queda decidido, no arreglado:** un plan de pago no puede depender de
> un proyecto que se pausa solo. Los proyectos gratuitos de Supabase se
> suspenden tras unos días sin actividad, y volverá a pasar. Antes de cobrar
> dinero real, el proyecto tiene que estar en un plan que no se suspenda.

## 1. Los grados, contra la literatura

Comparados los 34 movimientos con los valores de referencia de la AAOS
recogidos por Physiopedia. De 34, **33 estaban bien**. El que no:

| | Anatris (antes) | Referencia | Ahora |
|---|---|---|---|
| Flexión de rodilla | 105° | **135°** | 135° |

105° no era un dato clínico: era el ángulo al que la malla de la pantorrilla
empezaba a atravesar el muslo. Un fisio que lee *"arco 0° a 105°"* lee una norma
30° corta. Corregido, y explicado abajo por qué ahora se puede.

**Dos valores que NO son errores aunque se separen de la AAOS**, y conviene
saber por qué antes de que alguien los señale:

- **Rotación interna de hombro, 100°** (AAOS: 70°). El dato dice explícitamente
  que se mide con la mano pasando por detrás de la espalda, donde Kapandji da
  95–100°. Los 70° de la AAOS son con el brazo al costado. Son dos pruebas.
- **Extensión cervical, 70°** (AAOS: 45°). Kapandji, Norkin y White & Panjabi
  dan 70–85°. La app es consistentemente kapandjiana; 45° sería el valor atípico
  dentro de este corpus.

El resto coincide: hombro 180/180, codo 145, pronosupinación 85/90, cadera
120/20/45/20/40/45, tobillo 20/50/35/15, cervical 45/45/80, lumbar 60/35/25/5.

---

## 2. La rodilla se rompía al doblarse

Esto no estaba en ninguna lista y es lo más grave que se encontró.

**Desde 45° de flexión, la rodilla se abría.** Un bloque rectangular se
desprendía de la articulación y el muslo acababa en una sección plana, como un
tubo cortado. En todas las demos de rodilla, en todos los tests ortopédicos de
rodilla, y desde ayer también en la flexión profunda de cadera.

El diagnóstico evidente —una malla atada al hueso equivocado— daba **cero**
resultados (`scripts/diag-knee-skin-binding.mts`). El fallo era otro:
Z-Anatomy no entrega una piel continua en las articulaciones, entrega **parches
de región**, cada uno soldado rígidamente a UN hueso:

| parche | vértices | hueso |
|---|---|---|
| `Anterior_region_of_knee` ×3 | 155 | **`patella`** |
| `Posterior_region_of_knee` ×4 | 146 | `shin_flex` |
| `Popliteal_fossa` ×4 | 42 | `femur_base` |

El que se ve es el anterior, atado a la **rótula**. La rótula es un sesamoideo
que **desliza**, y el rig la mueve a medio ángulo: a 90° de flexión, el parche de
piel más grande de la cara anterior se iba solo 45° mientras sus vecinos se
quedaban con el muslo y con la pierna. Tres parches rígidos sobre tres huesos
que se mueven distinto no pueden seguir unidos.

La piel real de la rodilla es una sola lámina: anclada al muslo arriba, a la
pierna abajo, estirada por el medio. Ahora se pondera así
(`src/lib/rigSkinRepair.ts`). **Es la versión para la pierna de la reparación que
ya arregló el codo** (`UPPER_ARM_Y` en RigModel) — y por eso el codo dobla limpio
a 145° y la rodilla no lo hacía.

Vive en `src/lib/` a propósito, no dentro del componente: `scripts/render-pose.mts`
importa lo mismo, así que **el fotograma offline vuelve a ser el que ve el
usuario**. Un render que no coincide con la app no sirve para revisar nada.

Con la piel reparada se pudo medir de verdad cuánto se mete la pantorrilla en el
muslo (`scripts/measure-knee-fold.mts`):

| ángulo | vértices dentro | más profundo |
|---|---|---|
| 105° | 4 de 972 (0,4%) | 1,2 cm |
| 120° | 7 (0,7%) | 2,1 cm |
| **135°** | **11 (1,1%)** | **2,8 cm** |
| 150° | 10 (1,0%) | 3,0 cm |

A 135° el solape es un 1% de la piel en el hueco poplíteo, que es exactamente
donde la carne de la pantorrilla y el isquiotibial se comprimen en una flexión
profunda real. Pasados ~140° deja de parecer compresión y parece un fallo, así
que los valores profundos (~140 con cadera flexionada, ~160 pasivo talón-glúteo)
siguen contándose en texto.

**Blender no hizo falta.** Era código.

---

## 3. Los colores: el azul no venía del tema

El tema oscuro ya era casi negro. El azul que se notaba venía de otro sitio:
**la interfaz está pintada con `slate` de Tailwind en más de mil clases**, y
`slate-900` es `hsl(222, 47%, 11%)` — un azul marino saturado, no un gris.

Marino de fondo + cian-400 de acento es la combinación de panel generado más
reconocible que existe en la web. Pero hay una razón más fuerte que el gusto:

> Esto es un escenario iluminado para un **cuerpo**. Un entorno azul desplaza
> cómo se percibe cada color de piel, músculo y hueso que tiene delante. Los
> ilustradores médicos y los fotógrafos montan el trabajo sobre gris neutro
> justo por eso. Un escenario azul miente sobre el tejido.

Y el foco del laboratorio era **literalmente azul** (`rgba(120, 170, 220, 0.16)`),
cayendo directamente sobre el modelo.

Lo hecho:

- **`slate` redefinido entero** en `tailwind.config.js` como grafito casi neutro:
  misma escalera de luminosidad (todas las parejas de contraste sobreviven),
  saturación del 45% al 8%. Redefinir la rampa en vez de reescribir 1018 nombres
  de clase significa que **ninguna pantalla se queda fuera** y que deshacerlo es
  un commit.
- **El acento deja de ser el cian-400 de Tailwind** (`#22d3ee` → `#4fb6c7`). Al
  85% de saturación le ganaba el pulso a los colores de rol muscular, que son los
  que aquí significan algo. El color en esta app debería querer decir algo;
  gastar el más fuerte en la decoración es parte de lo que la hacía parecer
  escrita por nadie.
- **El foco del escenario pasa a luz neutra**, para que el tejido sea el único
  tono de la escena.

---

## 4. Lo que falta, por orden

### Bloqueantes

1. ~~Reactivar Supabase y redesplegar `content`.~~ **Hecho el 2026-11-03** (§0).
   El gate se comprobó en producción: 401/401/404/404.
2. **Pasar Supabase a un plan que no se suspenda.** Lo de §0 volverá a pasar: los
   proyectos gratuitos se pausan solos tras unos días sin tráfico, y un producto
   de pago no puede apagarse por falta de visitas. Es el único bloqueante de
   infraestructura que queda.
3. **Confirmar que Stripe está en modo LIVE.** Las claves viven en los secretos
   de Supabase y aparecen hasheadas en cualquier listado, así que desde el repo
   no se podía comprobar. **Ya se puede, en un clic:** `create-checkout` ahora
   devuelve en qué modo está su propia clave, y si es `sk_test` la app avisa
   antes de llevar a nadie a la pasarela:

   > Stripe está en MODO PRUEBA. No se cobrará dinero real y la suscripción que
   > se cree será de prueba.

   El modo prueba es invisible —el checkout es idéntico, la suscripción se
   activa, la app se desbloquea y no se movió un euro—, y esa es la parte
   peligrosa. Si al pulsar "Suscribirme" aparece ese aviso, faltan las claves y
   el webhook de producción. Un cliente real nunca lo verá: el modo live no
   pregunta.
4. **Una entidad para facturar.** Stripe en vivo pide un titular real, datos
   fiscales y una cuenta bancaria. Es trámite, no código, pero bloquea el cobro.

### Credibilidad (esto es lo que decide si un fisio paga)

5. **Los rangos ya citan poblaciones reales: 27 de 190.** Era 0 de 163. Junto
   al arco de referencia aparece ahora lo que se midió en gente de verdad:

   > Medido 150,4° ± 20 (activa, 2404 adultos sin dolor de hombro, de 20 a 91
   > años) · Gill TK 2020

   Es mejor que una página de libro: trae media, desviación típica y muestra, se
   comprueba en PubMed desde la propia app, y dice *de quién* es la cifra —no "lo
   normal", sino esas 2404 personas—, que es la pregunta que se hace un fisio
   cuando el paciente no se parece a la tabla.

   | región | fuente leída | qué es |
   |---|---|---|
   | cadera, rodilla, tobillo | Roaas & Andersson 1982 (PMID 7136564) | pasiva, goniómetro AAOS, 90 varones de 30-40 |
   | cervical, lumbar | Apti et al. 2023 (DOI 10.4274/jtss.galenos.2023.33042) | activa, goniómetro digital, 300 adultos de 18-29 |
   | hombro | Gill et al. 2020 (PMID 33046038) | activa, inclinómetro, 2404 adultos de 20-91 |
   | codo | Zwerus et al. 2017 (PMID 31210794) | activa y pasiva, goniómetro, 352 adultos de 18-79 |

   Las cuatro son de acceso abierto y **se leyó la tabla**, no el resumen. Cada
   cita dice de qué tabla y qué columna sale, y las asimetrías van dentro
   (inclinación cervical derecha 42,1 ± 7,9, izquierda 41,4 ± 7,7).

   **Tres cosas que se decidieron no maquillar:**

   - **La columna torácica se queda sin cifra medida, a propósito.** El
     metaanálisis de Esteban-González 2022 (48 estudios, 2365 sujetos, 11.892
     mediciones, PMID 35459026) concluye que los valores torácicos de unos
     aparatos y otros son muy dispares entre sí porque cada herramienta usa su
     protocolo. Sin patrón común no hay media defendible, y eso se dice en la
     app en vez de inventar una.
   - **La rotación lumbar enseña una discrepancia de 5° contra 38°**, y no es un
     error: el arco de 5° es rotación lumbar *segmentaria*, y los 38,4° de Apti
     son giro del tronco sentado, que arrastra la torácica. La muestra lo dice
     en la propia línea. Un fisio que mida 38° con un goniómetro y lea "5°"
     merece saber por qué.
   - **El codo va sin desviación típica** porque Zwerus publica intervalo de
     confianza, no DE. Antes que convertir una cosa en otra, no se pone.
   - **Fuera las cuatro referencias que nadie había leído.** Youdas 1992, Van
     Herp 2000, Fujimori 2012 y Soucie 2011 estaban en la bibliografía con la
     nota "tablas aún no leídas aquí". Una bibliografía con fuentes sin abrir es
     exactamente lo que esto no puede permitirse; se sustituyeron por las cuatro
     de arriba, que sí se abrieron.

   Quedan 163 citas sin comprobar, y conviene no confundirlas con lo de arriba:
   la mayoría son las **fases** dentro de cada arco (los "0-30°, 30-90°"), que
   ningún estudio normativo publica por separado, y el resto son las páginas de
   libro que respaldan el arco en sí —Kapandji, Neumann, Oatis—, que siguen sin
   verificar una a una. Cervical, por ejemplo: 24 de sus 28 citas son fases o
   páginas de libro. Los tests van por delante: 44 de 85 (52%), con cervical al
   94%. Lista de trabajo en `docs/clinical-verification-worklist.md`.
6. **Ningún testimonio real.** Tres fisios que la hayan usado y pongan su nombre
   valen más que cualquier funcionalidad nueva.
7. **No hay vídeo del laboratorio.** El guion está escrito en `docs/hero-clip.md`
   desde hace meses y sigue sin grabarse. Es lo único que explica el producto en
   diez segundos.

### Coste y escala

8. **47 MB de GLB en la primera visita** (27 MB comprimidos: `modelo-opt.dec.glb`
   28 MB + `cuerpo-rig.opt.glb` 19 MB). El service worker los cachea, así que es
   coste de primera visita. En el plan gratuito de Vercel (100 GB/mes) son unas
   3.700 primeras visitas al mes antes de pasarse. No es urgente, pero es el
   techo real de crecimiento y conviene saberlo antes de pagar publicidad.

### Ya no aplica

9. **eAwards Ecuador 2026 cerró el 1 de septiembre de 2026.** Hoy es 3 de
   noviembre. La candidatura preparada (`docs/candidatura-eawards.md`) sigue
   sirviendo como material de presentación, pero ese plazo pasó.

---

## 5. Estado técnico

352 pruebas en verde, `tsc -b` limpio, `npm run audit-data` con 0 errores y
0 avisos, `npm run build` correcto, `npm run audit-direction` con las 8
direcciones correctas y la rodilla doblándose donde debe dentro de la flexión de
cadera.

Supabase `ACTIVE_HEALTHY`, cuatro funciones `ACTIVE`, `content` en la versión 4
con los payloads regenerados.
