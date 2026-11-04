# Qué falta para publicar

Revisión del **2026-11-03**. Estado medido, no estimado: cada cosa de aquí se
comprobó ejecutando algo.

---

## 0. Bloqueante absoluto: Supabase está APAGADO

El proyecto `ytauxazmjbdlkvfmdwnr` está en estado `INACTIVE`. Lo dijo el propio
despliegue:

```
unexpected deploy status 404: Cannot retrieve service for project
ytauxazmjbdlkvfmdwnr with currect status 'INACTIVE'.
```

Y se confirma desde fuera: la función `content` y `auth/v1/health` no responden
(código 000, ni siquiera un error HTTP), mientras `anatris.vercel.app` sigue
dando 200.

**Qué significa para alguien que entre hoy:** la web carga y el hombro gratuito
funciona, porque va en el bundle. Todo lo demás está caído. No se puede iniciar
sesión, no se puede pagar, y ninguna región de pago carga su contenido, porque
desde la sesión del entitlement el contenido premium **ya no viaja en el
bundle**: lo sirve esa función.

Los proyectos gratuitos de Supabase se pausan tras unos días sin actividad y
**sólo se reactivan desde el panel**, a mano. No hay forma de hacerlo desde aquí.

> Primer paso, antes que cualquier otra cosa: reactivar el proyecto en
> supabase.com → el proyecto → *Restore*. Después, `supabase functions deploy
> content`, que hoy subió los 7 payloads y falló justo en el último paso.

Y una consecuencia de producto que conviene decidir: **un plan de pago no puede
depender de un proyecto que se pausa solo.** Antes de cobrar dinero real, el
proyecto tiene que estar en un plan que no se suspenda.

---

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

1. **Reactivar Supabase** y redesplegar `content` (§0). Sin esto no hay producto
   de pago, sólo una demo de hombro.
2. **Confirmar que Stripe está en modo LIVE.** Las claves viven en los secretos
   de Supabase, así que desde el repo no se puede comprobar; la última nota del
   proyecto decía que el circuito completo estaba verificado **en modo TEST** y
   que faltaba el cambio a claves y webhook reales. Cobrar con `sk_test` no cobra.
3. **Una entidad para facturar.** Stripe en vivo pide un titular real, datos
   fiscales y una cuenta bancaria. Es trámite, no código, pero bloquea el cobro.

### Credibilidad (esto es lo que decide si un fisio paga)

4. **Las citas no están verificadas página a página: 0 de 163 rangos.** Los tests
   van mejor (44 de 85, 52%), con cervical al 94% y cadera y tobillo al 0%. El
   producto promete "de qué obra procede el dato" y hoy puede decir la obra pero
   no la página. Para una herramienta de pago dirigida a profesionales, es la
   deuda más cara que queda. La lista de trabajo está en
   `docs/clinical-verification-worklist.md`.
5. **Ningún testimonio real.** Tres fisios que la hayan usado y pongan su nombre
   valen más que cualquier funcionalidad nueva.
6. **No hay vídeo del laboratorio.** El guion está escrito en `docs/hero-clip.md`
   desde hace meses y sigue sin grabarse. Es lo único que explica el producto en
   diez segundos.

### Coste y escala

7. **47 MB de GLB en la primera visita** (27 MB comprimidos: `modelo-opt.dec.glb`
   28 MB + `cuerpo-rig.opt.glb` 19 MB). El service worker los cachea, así que es
   coste de primera visita. En el plan gratuito de Vercel (100 GB/mes) son unas
   3.700 primeras visitas al mes antes de pasarse. No es urgente, pero es el
   techo real de crecimiento y conviene saberlo antes de pagar publicidad.

### Ya no aplica

8. **eAwards Ecuador 2026 cerró el 1 de septiembre de 2026.** Hoy es 3 de
   noviembre. La candidatura preparada (`docs/candidatura-eawards.md`) sigue
   sirviendo como material de presentación, pero ese plazo pasó.

---

## 5. Estado técnico

352 pruebas en verde, `tsc -b` limpio, `npm run audit-data` con 0 errores y
0 avisos, `npm run build` correcto, `npm run audit-direction` con las 8
direcciones correctas y la rodilla doblándose donde debe dentro de la flexión de
cadera.
