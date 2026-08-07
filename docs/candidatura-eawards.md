# S4 — Material de candidatura · eAwards Ecuador 2026

**Cierre: 1 de septiembre de 2026, 24:00 hora Ecuador.** Envía el **30 o 31**.
Bases y criterios en [`plan-maestro-2026.md` §6](plan-maestro-2026.md).

---

## ⚠️ Léelo antes de usar nada de esto

Todo lo que aparece **entre corchetes `[ ]` lo tienes que rellenar tú**, y no
está así por pereza: son datos que solo tú tienes (tracción, equipo, cifras del
mercado ecuatoriano). **No los inventes.** Las bases dicen literalmente que *"la
inexactitud, falsedad u omisión de información relevante… podrá dar lugar a la
exclusión del participante en cualquier fase… y, en su caso, a la revocación del
Premio si ya hubiera sido concedido"*. Un número inflado no te resta puntos: te
descalifica, incluso después de ganar.

Las cifras **sin corchetes están contadas del repositorio** el 2026-08-04 y son
verdad hoy:

| Dato | Valor | De dónde sale |
|---|---|---|
| Regiones clínicas | 6 | `regiones.ts` |
| Músculos con ficha | 113 | `src/data/muscles/*.ts` |
| Movimientos con ROM | 34 | `romByRegion.ts` |
| Tests ortopédicos | **79** | `orthopedicTests/*.ts` |
| Cuadros patológicos | 21 | `pathologies.ts` |
| Casos clínicos | 15 | `clinicalCases.ts` |
| Referencias | 42, de ellas **24 con PMID** | `references.ts` |
| Precio | $7,99/mes · $59/año · 7 días de prueba | `pricing.ts` |
| Monedas | USD, EUR, MXN, COP | `pricing.ts` |

> **Ojo con "79".** El script de auditoría dice 85: ese es el número de *citas*,
> no de tests (varios tests llevan dos fuentes). El número de producto es **79**.
> Es justo el tipo de detalle por el que un jurado técnico te pregunta.

> **Verifica antes de citarlo:** el precio de Complete Anatomy y de Muscle &
> Motion cambia por país y por año. Mira el precio vigente en Ecuador el día que
> grabes y di **ese**, con fecha. No uses "unos 200 dólares" de oídas.

---

## 1. Guion del vídeo (objetivo 4:30 · **máximo 5:00 o descalificación**)

Grábalo en español. Súbelo a YouTube **como "no listado"**, no privado: privado
impide que el jurado lo abra.

### 0:00 – 0:25 · El problema, con cara

> "Soy [nombre] y esto es Anatris. En Ecuador hay [N] estudiantes de
> fisioterapia. Todos tienen que aprender lo mismo: cómo se mueve el cuerpo y
> por qué duele cuando deja de moverse bien. Las herramientas que existen para
> eso están en inglés y cuestan [precio verificado] al año. Así que casi nadie
> las usa: se estudia con fotocopias de un libro de hace treinta años."

*Necesitas:* el número de estudiantes de fisioterapia en Ecuador (SENESCYT, o
suma las carreras de UDLA, UCE, PUCE, ESPOL…) y el precio vigente verificado.
Una cifra real, aunque sea aproximada y lo digas, vale más que una redonda.

### 0:25 – 0:55 · Por qué las apps que ya existen no lo resuelven

> "Y aunque pudieras pagarlas, siguen siendo atlas: te enseñan dónde está cada
> músculo. Un fisioterapeuta no trata músculos quietos. Trata movimiento que ha
> dejado de funcionar. Eso no está en ningún atlas."

**Sin nombrar competidores.** Describe la categoría, no la marca: te ahorra
problemas y suena más seguro.

### 0:55 – 2:20 · La demostración ★ *el corazón del vídeo*

Pantalla completa del laboratorio. **Sin cortes.** Que se vea que es en vivo.

1. **Abducción normal (0:55–1:25).** Arrastra de 0 a 180 despacio.
   > "Esto no es una animación grabada. El modelo tiene un esqueleto real y yo
   > estoy moviendo el ángulo. En cada grado la aplicación calcula qué músculo
   > lidera y cómo se reparte el movimiento entre el húmero y la escápula. Aquí,
   > a 90 grados, el reparto es de 2 a 1: es el ritmo escapulohumeral que se
   > estudia en clase, ocurriendo delante de ti."

2. **Cambia a discinesia escapular (1:25–2:00).** Selector "Estado".
   > "Y ahora lo que ningún atlas hace. Le digo que este hombro tiene una
   > discinesia escapular. El mismo movimiento, el mismo ángulo: el reparto se va
   > a 6,7 a 1. La escápula ha dejado de acompañar y el húmero compensa. Ahí se
   > resalta el serrato anterior, que es la estructura implicada, y ahí está la
   > fuente: Kibler, 2013."

3. **Cierra el arco (2:00–2:20).**
   > "Un estudiante acaba de ver, no de leer, la diferencia entre un hombro sano
   > y uno lesionado. Hay 21 cuadros como este, en las seis regiones."

*Este minuto y medio es la candidatura entera.* Ensáyalo hasta que salga sin
tropiezos. Si algo tiene que salir perfecto, es esto.

### 2:20 – 2:50 · Rigor (tu foso frente a la IA genérica)

> "Cada número lleva su fuente. 79 tests ortopédicos con su sensibilidad, su
> especificidad y el estudio del que salen, 24 de ellos enlazados a PubMed. Y
> cuando un dato todavía no está verificado, la aplicación lo dice. Preferimos
> que se nos vea el trabajo pendiente a que se nos crea algo que no hemos
> comprobado."

Enseña la pantalla de Evidencia. **Esa frase final es tu mejor respuesta a
"¿esto no lo hace ChatGPT?"**: tú citas y admites lo que no sabes.

### 2:50 – 3:30 · Que ya funciona y ya se cobra

> "Anatris no es un prototipo. Está en producción, funciona en el navegador y en
> tablet sin instalar nada, se puede usar sin conexión, y tiene suscripción real
> con cobro en cuatro monedas: 7,99 al mes, con el hombro completo gratis para
> siempre. Desde [fecha] lo han usado [N] fisioterapeutas y estudiantes, con
> [métrica]."

*Necesitas:* los números de PostHog. **Si aún no los tienes el día de grabar,
di lo que sea cierto** — "está abierto desde [fecha] y lo están probando [N]
personas de [dónde]" — y no menciones métricas. Una frase honesta y pequeña no
te penaliza; una inventada te descalifica.

### 3:30 – 4:00 · Equipo *(criterio puntuable — prepáralo)*

> "[Quién eres, qué te cualifica, y quién más está o va a estar. Si estás solo,
> dilo y explica cómo has llegado hasta aquí y a quién necesitas incorporar.]"

**No lo improvises.** "Equipo" es uno de los siete criterios y hoy es tu punto
más flojo. Estar solo no es descalificante; no tener respuesta, sí lo parece.
Si has trabajado con algún fisioterapeuta revisando contenido, es parte del
equipo: dilo.

### 4:00 – 4:30 · Adónde va

> "El siguiente paso es medir al paciente: apuntar el móvil, capturar su
> movimiento real y compararlo contra el modelo, todo en el propio dispositivo,
> sin que el vídeo salga de ahí. Eso convierte una herramienta de estudio en un
> instrumento de consulta. Y después, inglés y portugués: el problema que
> resolvemos en Ecuador es el mismo en toda Latinoamérica."

Cierra con la URL en pantalla.

### Cómo grabarlo

- **Audio antes que imagen.** Un micro decente —hasta unos auriculares con
  micro— vale más que 4K. Un jurado perdona una imagen mediana; no un audio malo.
- Captura de pantalla limpia: F11, sin pestañas, sin notificaciones.
- **Si aparece alguien más que tú, necesitas su autorización por escrito.** Las
  bases te lo hacen garantizar. Un WhatsApp suyo diciéndolo, guardado, basta.
- Reutiliza el clip de [`hero-clip.md`](hero-clip.md): el mismo material sirve
  para el hero, el `og:image` y este vídeo.

---

## 2. Business Model Canvas

Borradores para adaptar. Lo que está **entre corchetes es tuyo**.

### Segmentos de clientes
1. **Estudiantes de fisioterapia y kinesiología** (grado y posgrado) en países
   hispanohablantes. Comprador y usuario son la misma persona; sensible al
   precio.
2. **Fisioterapeutas en ejercicio**, sobre todo en los primeros años. Usan la
   app para repasar y para **explicar al paciente** en consulta.
3. **Universidades y centros de formación** (aún sin producto — es el siguiente
   paso). Contrato por asientos; ciclo de venta largo, ingreso estable.

### Propuesta de valor
> El primer **simulador de razonamiento clínico musculoesquelético en español**.
> No enseña dónde está cada músculo: modela cómo se mueve el cuerpo, qué falla
> cuando duele y cómo se explora. Cada afirmación con su fuente.

Tres cosas que no tiene ningún competidor:
1. **Biomecánica calculada, no animada.** El reparto húmero-escápula sale de la
   posición real del hueso en cada grado. Los demás reproducen un clip.
2. **Normal vs. patológico en el mismo control.** 21 cuadros que alteran el
   movimiento y señalan la estructura implicada, con su cita.
3. **Del atlas al examen clínico sin cambiar de app.** 79 tests con sens/spec,
   nomograma de Fagan, clústeres y modo examen, dentro del mismo modelo 3D.

Y una de contexto: **en español y a precio latinoamericano** — cobro nativo en
USD, EUR, MXN y COP.

### Canales
- Web (PWA instalable, sin tienda de aplicaciones de por medio).
- Docentes que lo enseñan en clase — el canal más barato: un profesor trae un
  curso entero.
- Boca a boca entre estudiantes; cada tarjeta exportada para un paciente lleva
  la marca.
- SEO por contenido clínico (pendiente): una página por test ortopédico.

### Relación con el cliente
Autoservicio. Plan gratuito permanente (hombro + fundamentos completos), 7 días
de prueba de Premium, sin tarjeta para empezar. El repaso espaciado y la racha
diaria sostienen el uso.

### Fuentes de ingresos
- Suscripción individual: **$7,99/mes** o **$59/año**.
- Licencia institucional por asientos *(en desarrollo)*: es donde está el
  ingreso grande y estable en educación sanitaria.
- Sin publicidad y sin venta de datos. En un producto de salud eso es
  posicionamiento, no solo ética.

### Recursos clave
- **La base de contenido clínico citado** — el activo real y lo más difícil de
  copiar: 113 fichas musculares, 34 movimientos, 79 tests, 42 referencias.
- **El rig 3D calibrado**: modelo esqueletado de cuerpo completo con la
  cinemática resuelta articulación por articulación.
- El motor biomecánico (acoplamientos, activación por grado, cuadros
  patológicos).
- [El equipo.]

### Actividades clave
Autoría y **verificación** de contenido clínico · calibración del rig ·
desarrollo de producto · relación con docentes.

### Socios clave
[Universidades o docentes con los que ya hablas.] · Fisioterapeutas revisores ·
Stripe y Supabase como infraestructura · Z-Anatomy como base anatómica del
modelo *(revisa su licencia y menciónala: la transparencia sobre de dónde sale
el modelo 3D juega a favor)*.

### Estructura de costes
Muy baja: infraestructura (hosting + base de datos + pagos) por debajo de
[$X]/mes, sin coste marginal por usuario. El coste real es **tiempo de autoría
clínica**. Margen bruto alto, propio del software.

---

## 3. Antes de enviar

**Contenido**
- [ ] Las 8 páginas de ROM de hombro y rodilla verificadas ([S2](verificacion-hombro-rodilla.md)) — es lo que enseñas en el vídeo
- [ ] `npm run audit-data` sin errores ni avisos
- [ ] Ninguna cifra del vídeo o del formulario sin comprobar

**Producto**
- [ ] PostHog encendido y con datos ([`analitica.md`](analitica.md))
- [ ] Clip del laboratorio grabado ([`hero-clip.md`](hero-clip.md))
- [ ] Testimonios reales publicados, si los conseguiste
- [ ] La app abre sin errores desde un móvil y un ordenador que no sean los tuyos

**Requisitos de las bases**
- [ ] Vídeo **≤ 5:00** (cronometrado, no estimado), en español, YouTube/Vimeo **no listado**
- [ ] Cuestionario Business Model Canvas completo
- [ ] Información de contacto correcta
- [ ] Autorización por escrito de cualquier persona que aparezca en el vídeo
- [ ] Compruebas que encajas en "proyecto desarrollado en Ecuador"
- [ ] Límites económicos: <1 M€ capital · <1,5 M€ total · <500 k€ facturados

**Envío**
- [ ] **30 o 31 de agosto.** No el día 1
- [ ] Todo revisado: **no se puede modificar tras enviar**
- [ ] Guarda el acuse de recibo

---

## 4. Las tres preguntas que te van a hacer

**"¿Por qué no lo hace mañana una empresa grande?"**
> Porque el 3D no es la barrera. La barrera son los años de modelado clínico
> citado y el rig calibrado detrás. Una empresa de atlas tendría que rehacer su
> producto desde el modelo de datos, no añadir una función.

**"¿Esto no lo resuelve ya la IA?"**
> Un chat te da una respuesta plausible sin decirte de dónde sale. Aquí cada
> número lleva su fuente, y cuando algo no está verificado, la aplicación lo
> dice. En salud, "plausible" no basta.

**"¿Cómo sabes que alguien pagará?"**
> [Tus datos. Si aún no tienes conversiones, di la verdad y apóyate en el uso:
> cuánta gente vuelve y cuánto tiempo pasa dentro. La retención convence más que
> una proyección.]
