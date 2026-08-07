# Analítica de producto — qué se mide y cómo encenderlo

Sesión **S3** del [plan maestro](plan-maestro-2026.md). Hasta hoy la app medía
**solo el embudo de venta**: 7 eventos que terminaban en el momento del pago.
Todo lo que pasaba *dentro* del producto era invisible, así que preguntas como
"¿alguien usa el laboratorio?", "¿alguien termina un examen?" o "¿qué región
merece el próximo contenido?" solo se podían responder con una opinión.

Ahora hay **12 eventos de producto** además de los 7 de embudo.

---

## 1. Encenderlo en producción (5 minutos, y hay que hacerlo hoy)

**El código ya está.** Sin clave configurada no se envía absolutamente nada, así
que ahora mismo sigues sin datos. Faltan dos variables de entorno en Vercel:

| Variable | Valor |
|---|---|
| `VITE_POSTHOG_KEY` | `phc_...` — la clave de proyecto de PostHog |
| `VITE_POSTHOG_HOST` | `https://eu.i.posthog.com` (recomendado) o `https://us.i.posthog.com` |

Pasos:

1. Crea un proyecto en [posthog.com](https://posthog.com) (el plan gratuito
   cubre de sobra este volumen).
2. **Elige la región UE.** Tus usuarios son europeos y latinoamericanos y el
   producto es de ámbito sanitario: alojar en la UE simplifica el RGPD y es un
   argumento en una venta institucional.
3. Copia la *Project API Key*.
4. Vercel → tu proyecto → Settings → Environment Variables → añade las dos, en
   **Production** (y en Preview si quieres probar).
5. **Vuelve a desplegar.** Vite incrusta las `VITE_*` en tiempo de build: sin un
   despliegue nuevo la clave no entra.

Comprobación: abre la app en producción, ve a *Movimiento*, arrastra un
movimiento, y mira "Activity" en PostHog. Deben aparecer `region_opened`,
`mode_opened` y `movement_driven` en menos de un minuto.

> La clave `phc_` es **publicable** por diseño: solo puede enviar eventos, no
> leer datos. Vive en una variable de entorno para poder cambiarla por entorno,
> no porque sea un secreto.

---

## 2. Privacidad — la línea que no se cruza

Está en el código (`src/lib/analytics.ts`), no solo en este documento:

- **Apagado** si no hay clave: en local y en cualquier build sin configurar no
  sale un solo evento.
- **Sin autocaptura**: solo los 19 eventos con nombre, nunca cada clic.
- **Sin grabación de sesión.**
- **Perfiles solo de usuarios identificados** (los que han iniciado sesión).
- **Nunca se envía contenido**: ni texto libre, ni notas, ni el contenido de una
  tarjeta de paciente, ni respuestas de examen, ni calificaciones de estudio.
  Solo **qué id** se abrió — región, modo, movimiento, test— y esos ids son un
  vocabulario público y fijo de los propios archivos de datos del repo.

**Regla al añadir eventos:** si una propiedad pudiera contener algo que escribió
una persona, o algo sobre un paciente real, no va. Un id de `regiones.ts` sí; el
nombre de un paciente, jamás.

---

## 3. Diccionario de eventos

### Embudo de venta (ya existían)

| Evento | Cuándo |
|---|---|
| `landing_viewed` | Se muestra la landing |
| `enter_app` | Entra a la app (plan gratuito) |
| `sign_up` / `sign_in` | Registro / inicio de sesión |
| `paywall_viewed` | Choca con el muro de pago |
| `checkout_started` | Va a Stripe |
| `premium_activated` | Suscripción activa |

### Producto (nuevos)

| Evento | Propiedades | Qué responde |
|---|---|---|
| `region_opened` | `region` | Qué regiones se usan de verdad. Decide dónde poner el próximo contenido |
| `mode_opened` | `mode`, `region` | ¿Se descubre "Movimiento", tu diferenciador, o la gente se queda en Explorar? |
| `movement_driven` | `region`, `movement` | Qué gestos se arrastran. Fuera de la lista = movimiento que nadie mira |
| `pathology_selected` | `movement`, `pathology` | **El evento más importante.** Normal vs. patológico es el foso; si nadie lo encuentra, es un problema de descubribilidad, no de valor |
| `dissection_used` | `action` (`dissect`/`isolate`) | ¿Se usa la disección por lados? |
| `test_opened` | `region`, `test` | Qué tests ortopédicos se consultan (de 85) |
| `exam_mode_started` | `region` | ¿Alguien usa el modo examen? |
| `neuro_opened` | `region` | ¿El panel neuro justifica ser premium? |
| `study_tab_opened` | `region`, `tab` | ¿Se abre el repaso espaciado? Decide cuánto vale el bucle de vuelta (S7) |
| `patient_card_exported` | `region`, `movement` | Uso clínico real delante del paciente. Y cada tarjeta lleva marca: es difusión |
| `evidence_opened` | `region` | ¿Le importan las fuentes a alguien más que a ti? |
| `guide_opened` | `region`, `mode` | Guía abierta = la interfaz no se explicó sola. Un pico aquí señala un problema de UX |

### Detalles de implementación que importan al leer los datos

- **`trackChange`** (en `analytics.ts`) descarta el evento si su payload no ha
  cambiado desde la última vez. Sin eso, un usuario que lee el hombro diez
  minutos generaría un `region_opened` por render y cualquier media por usuario
  sería basura. La memoria es **por carga de página**: volver mañana cuenta otra
  vez.
- **`movement_driven` se dispara al SELECCIONAR**, nunca por fotograma de
  arrastre. Arrastrar un arco un minuto es 1 evento, no 3000.
- **`region_opened` y `mode_opened` cuelgan del par (region, mode) que sincroniza
  el router**, así que cubren todas las vías —TopBar, enlace profundo, botón
  Atrás— con un solo efecto. Son además tu señal de navegación: PostHog solo
  captura `$pageview` en la carga inicial, y la app navega en cliente.

---

## 4. Los cuatro paneles que hay que montar

No hagas 30 gráficas. Estas cuatro responden a todo lo que decide el plan.

**1 · Embudo de venta**
`landing_viewed → enter_app → sign_up → paywall_viewed → checkout_started → premium_activated`
Mira dónde cae. Si cae en `landing_viewed → enter_app`, el problema es la
landing (S1). Si cae en `paywall_viewed → checkout_started`, es el precio o la
promesa.

**2 · Descubrimiento del diferenciador**
Proporción de usuarios que llegan a `mode_opened{mode:'movement'}`, y de esos,
cuántos llegan a `pathology_selected`. **Si el segundo número es bajo, tu mejor
función está escondida** — y eso es un arreglo de UI de un día, no de producto.

**3 · Retención**
Retención a D1/D7/D30 sobre `region_opened`. Es el número que un jurado de
premios y un inversor miran antes que ningún otro.

**4 · Dónde poner el contenido**
`region_opened` desglosado por región y `test_opened` por test. Deja de escribir
a ciegas: si nadie abre el tobillo, sus 5 tests sin verificar no son la
prioridad; si todos abren la rodilla, sus 17 ROM sin verificar sí lo son.

---

## 5. Lo que falta de S3 (y no es código)

**Conseguir 15–30 usuarios reales, esta semana.** La instrumentación sin tráfico
son gráficas vacías, y para la candidatura de los eAwards necesitas **al menos
10 días de datos** antes de presentar.

Ideas por coste, de menor a mayor:

- El grupo de WhatsApp de tu promoción y el de la comunidad UDLA.
- Un docente de fisioterapia que lo enseñe 10 minutos en clase. Es la vía más
  rápida a 30 usuarios y, de paso, al testimonio que falta en S1.
- Grupos de Facebook / Telegram de fisioterapia de Ecuador, Colombia y México.
- Un post en LinkedIn con el clip del laboratorio (el de
  [`hero-clip.md`](hero-clip.md)). El mismo material sirve para todo.

Pide algo concreto, no "pruébalo": *"abre el hombro, arrastra la abducción y
cambia el estado a discinesia escapular; dime si se entiende"*. Una petición
concreta se responde; una vaga se ignora.
