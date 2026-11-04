# Modelo de negocio y proteccion legal

Escrito 2026-11-04. Complementa `docs/plan-maestro-2026.md` (producto) y
`docs/para-publicar.md` (lo que falta para publicar). Aqui va solo lo
comercial y lo legal.

Dos avisos antes de empezar:

- **No soy abogado.** Lo que sigue describe el terreno y nombra las preguntas
  concretas que hay que llevar a un abogado de propiedad intelectual. No es
  asesoria legal.
- **Las cifras de precio de terceros estan verificadas donde hay enlace y
  marcadas "VERIFICAR" donde no.** No hay ninguna inventada.

---

## 0. Lo primero no es el precio: es la licencia del modelo 3D

El modelo anatomico deriva de **Z-Anatomy, CC BY-SA 4.0** (ver
`src/components/AttributionScreen.tsx`, que ya cumple la atribucion). Esto
manda sobre todo lo demas, asi que va antes que los planes:

- **Vender acceso SI esta permitido.** CC BY-SA 4.0 permite uso comercial. No
  hay que pedir permiso ni pagar regalias.
- **ShareAlike alcanza al modelo, no a tu codigo ni a tu contenido clinico.**
  La aplicacion modifica la malla (decimado, recortes, re-rigging, re-pesado de
  musculos): eso es una obra derivada del modelo, y la malla resultante queda
  bajo CC BY-SA 4.0. Tu codigo, tus textos, las tablas de rango, los tests con
  sensibilidad y especificidad, el indice de musculos: eso es tuyo y no se
  contagia por estar en la misma aplicacion.
- **Las dos preguntas para el abogado**, en estos terminos:
  1. Servir la malla detras de autenticacion y de un pago, ¿cuenta como
     "medida tecnologica de proteccion" en el sentido de la clausula 2(a)(4)
     de BY-SA 4.0? (La licencia prohibe aplicar medidas que impidan al
     receptor ejercer los derechos de la licencia.)
  2. ¿Hasta donde llega la frontera entre "coleccion" y "obra derivada" en
     este caso concreto, con codigo propio cargando una malla modificada?
- **La salida estructural, si la respuesta aprieta:** sustituir la malla por
  una propia o comprada con licencia comercial. Es caro y lento, pero convierte
  la geometria en un activo tuyo. No hace falta para empezar a vender; hace
  falta para que el activo sea defendible a largo plazo.

**La consecuencia comercial es la importante:** el foso de Anatris no es la
geometria, que cualquiera puede descargar de Z-Anatomy. Es la capa clinica en
castellano (rangos citados a su poblacion, actividad muscular por tramo, tests
con sensibilidad/especificidad y Fagan, casos). Eso es lo que hay que cuidar,
cobrar y proteger. Y es tambien la razon por la que la patente no es el
instrumento adecuado (seccion 6).

---

## 1. A quien se le vende

**Cliente primario: la escuela de fisioterapia.** Una carrera de fisioterapia
con 120 alumnos vale mas que 120 suscripciones individuales, y rota cerca de
cero: lo que entra en un programa de asignatura se queda anos. La lista de
universidades con carrera de fisioterapia en Ecuador es finita y alcanzable a
pie: no es un mercado que haya que descubrir, es una docena de llamadas.

**Cliente secundario: el fisioterapeuta en consulta.** Compra por dos motivos
distintos del academico: explicarle al paciente lo que le pasa (de ahi "Modo
paciente" y la tarjeta de exportacion) y resolver una duda de prueba
ortopedica en treinta segundos entre pacientes.

**Cliente terciario: el estudiante que paga de su bolsillo.** Es el que menos
paga y el que mas habla. Vale como canal, no como ingreso.

**A quien NO se le vende:** medicos, fisioterapeutas deportivos de alto
rendimiento, cirujanos. Anatris no tiene imagen radiologica, ni biomecanica de
carga, ni nada quirurgico. Prometer ahi es quemar la credibilidad que da el
contenido citado.

### Contra quien se compara

El referente es **Complete Anatomy** (Elsevier). En su tienda de EE. UU. la
licencia Student aparece a **74,99 USD** de precio habitual con un descuento de
primer ano a **39,99 USD**
([3D4Medical store](https://store.3d4medical.com/offer)); la propia pagina de
soporte de Elsevier confirma que el precio de estudiante lleva descuento el
primer ano y luego vuelve al habitual
([Elsevier support](https://www.elsevier.support/es-es/complete-anatomy/answer/c%C3%B3mo-funcionan-los-precios)).
Los precios por pais no coinciden entre fuentes, asi que para cualquier
comparativa publica hay que mirar la tienda del pais ese mismo dia.

Lo que Complete Anatomy hace mejor: cobertura anatomica, pulido, marca Elsevier,
contenido en ingles con mucho mas presupuesto.

Lo que no hace, y es el hueco de Anatris: razonamiento clinico en castellano
con la fuente a la vista. Un numero de rango que dice a que poblacion se midio.
Un test que dice su sensibilidad, su especificidad y como cambia la
probabilidad si sale positivo. Eso no es "otro atlas mas barato": es otra cosa.

---

## 2. Los tres planes

Precios recomendados, no verificados contra disposicion a pagar real. El primer
numero que hay que validar con los diez primeros usuarios es justamente este.

| Plan | Precio | Quien | Que incluye |
|---|---|---|---|
| **Gratis** | 0 | cualquiera | Hombro completo en Explorar y Aprender. Laboratorio de movimiento con el arco, sin tests ni Neuro. Sirve para juzgar la calidad sin pagar. |
| **Pro** | 9 USD/mes o 69 USD/ano | fisioterapeuta en consulta | Todo: seis regiones, laboratorio completo, tests ortopedicos con modo examen, Neuro, Evidencia, Modo paciente, exportacion. |
| **Pro LatAm** | 4 USD/mes o 29 USD/ano | mismo producto, poder de compra local | Igual que Pro. Se aplica por pais de facturacion, no por IP. |
| **Institucional** | 12-20 USD por butaca y ano, desde 25 butacas, factura anual | escuela o clinica | Pro para todas las butacas + alta por dominio de correo + una sesion de formacion al profesorado. |

Tres decisiones dentro de esa tabla, por si hay que defenderlas:

1. **El gratis da una region entera, no una demostracion recortada.** Ya es la
   decision del producto (ver memoria `premium-gating-model`): el corte es por
   capacidad, no por region. Un gratis mezquino en un mercado donde el
   competidor regala el primer ano a 39,99 no convence a nadie.
2. **Pro por debajo del Student de Complete Anatomy.** No por ser mas barato
   como argumento, sino porque Anatris cubre menos anatomia: cobrar mas seria
   indefendible la primera vez que alguien los abra en paralelo.
3. **La tarifa LatAm no es caridad, es la unica que convierte.** 69 USD/ano en
   Ecuador no es el mismo precio que en Espana. Un precio unico global aqui
   significa vender solo en Espana.

---

## 3. El orden de venta

El orden importa mas que el precio, porque hay un bloqueo real: **no hay
traccion ni testimonios** (ya anotado en `docs/para-publicar.md` y en la
memoria de eAwards). Todo esto esta pensado para producir traccion, no para
esperarla.

**Paso 1 — Diez fisioterapeutas, sesenta dias, gratis, a cambio de algo
concreto.** No "pruebalo y dime". A cambio de: un testimonio escrito y
firmado con nombre y centro, y una sesion de veinte minutos grabada usandolo
con un caso real. Los testimonios desbloquean la pagina de precios; las
grabaciones son el material del video (y de paso dicen donde se atasca la
gente de verdad). Diez conversaciones, no mil registros.

**Paso 2 — Un piloto universitario.** Un semestre gratis para una asignatura,
a cambio de: aparecer como institucion piloto, y una encuesta al final del
semestre a alumnos y docente. Ese piloto es el que se convierte en
presupuesto institucional al semestre siguiente, y la encuesta es lo que se
le ensena a la segunda universidad.

**Paso 3 — Contenido en lo que nadie mas hace.** Una entrada por test
ortopedico, con su sensibilidad, su especificidad, el estudio de donde salen y
que le pasa a la probabilidad si sale positivo. "Test de Hawkins: 79% de
sensibilidad, 59% de especificidad, y que significa eso en tu consulta". Las
rutas profundas ya existen (`/hombro/movimiento`) y las tarjetas de
compartir ya estan hechas, asi que el trabajo es escribir, no programar.

**Paso 4 — WhatsApp y LinkedIn, no anuncios.** El canal por el que corre este
producto es un fisio mandandole un enlace a otro. Las tarjetas Open Graph ya
estan puestas para eso. Pagar publicidad antes de tener los diez testimonios
es pagar para que no conviertan.

---

## 4. Lo que cuesta tenerlo encendido

Costes fijos mensuales, a precio de lista (VERIFICAR cada uno el dia de la
contratacion, cambian):

- **Supabase Pro**, ~25 USD/mes. No es opcional: los proyectos gratuitos se
  suspenden solos por inactividad, y con ellos se cae la autenticacion y el
  contenido de pago (memoria `server-side-entitlement`).
- **Vercel Pro**, ~20 USD/mes. Lo que importa aqui no es el precio sino el
  ancho de banda incluido, por lo siguiente.
- **Stripe**, ~2,9% + 0,30 USD por cobro (VERIFICAR para el pais de la
  entidad).
- **Dominio**, ~15 USD/ano.

Total aproximado: **45-50 USD/mes**. Umbral de rentabilidad: **7-8
suscripciones Pro** anuales, o **una sola institucion pequena**.

**El coste variable que puede sorprender es el ancho de banda.** Medido hoy
sobre `dist/`: cada primera visita al laboratorio baja **11,26 MB** (el rig
comprimido) y cada primera visita a Explorar **16,24 MB** (el atlas). Mil
primeras visitas al laboratorio son ~11 GB. Con el plan Pro de Vercel eso no
preocupa; en el gratuito (100 GB) sí, y una entrada que se viralice se come el
mes. Dos mitigaciones ya puestas: el modelo se cachea un dia
(`vercel.json`) y solo se baja en las rutas que lo usan, nunca en la portada
ni en Repasar (`src/lib/modelWarm.ts`).

---

## 5. Lo que falta para cobrar de verdad

Esto no es estrategia, es la lista de bloqueos. Sin ella no se puede facturar
aunque el producto este listo.

1. **Entidad de facturacion.** Stripe necesita un pais soportado para los
   pagos. Las fuentes publicas se contradicen sobre Ecuador
   ([una dice que si](https://www.doola.com/?p=25018),
   [otra dice que no y vende la solucion](https://incorpuk.com/blog/how-to-open-stripe-account-in-ecuador/)),
   asi que **hay que mirar la lista oficial de paises de Stripe antes de
   decidir cualquier cosa**. Si Ecuador no esta, las salidas reales son: una
   sociedad en un pais soportado (Stripe Atlas y similares), o un procesador
   que si opere en Ecuador (PayPhone, Kushki, dLocal, Mercado Pago). Esto
   condiciona el calendario entero: es lo primero que hay que resolver.
2. **Claves LIVE de Stripe.** El flujo completo ya funciona de punta a punta
   en modo TEST (memoria `subscription-go-live`). Falta el cambio a LIVE y el
   webhook de produccion.
3. **Supabase en plan pago**, por lo del punto 4.
4. **Tres testimonios reales.** Paso 1 de la seccion 3.
5. **Terminos de servicio y licencia institucional.** Lo que de verdad impide
   que una universidad reparta la cuenta no es la tecnologia, es el contrato.
6. **El clip del heroe** (`docs/hero-clip.md`): la portada todavia ensena una
   tarjeta generada, no el laboratorio moviendose.

---

## 6. La patente: la respuesta corta es no

Y no por falta de ambicion, sino porque es el instrumento equivocado y gastar
ahi es gastar mal.

**Por que no se patenta:**

- Una aplicacion de anatomia es software mas contenido. En Estados Unidos, la
  doctrina de *Alice* tumba las reivindicaciones que son "hacer lo de siempre,
  pero en un ordenador", y ensenar anatomia en pantalla es exactamente eso. En
  Europa, el articulo 52 del Convenio sobre la Patente Europea excluye los
  programas de ordenador "como tales": haria falta un efecto tecnico real.
- Lo unico que podria tener pinta de patentable es un algoritmo concreto y
  novedoso (una tecnica de skinning, un esquema de compresion), no "una
  aplicacion que ensena rangos articulares con musculos".
- **Publicar destruye la novedad.** En Europa no hay periodo de gracia: si la
  aplicacion es publica antes de presentar la solicitud, esa invencion ya no
  es patentable. (En EE. UU. el inventor tiene doce meses.) Es decir: "primero
  lo publico y luego lo patento" no es una secuencia que funcione.
- Coste y plazo: anos y miles de dolares, **por jurisdiccion**, y despues hay
  que litigar uno mismo para que sirva de algo.

**Lo que si protege Anatris, en orden de rentabilidad:**

1. **La marca. Esto es lo unico que hay que presentar ya.** "Anatris" y el
   logotipo, en clase 9 (software) y clase 41 (educacion). En Ecuador se
   tramita en el SENADI. Se hace **antes** de la difusion amplia, porque un
   nombre que no puedes defender es un nombre que quizas tengas que cambiar
   cuando ya lo conozca tu mercado. Es el tramite mas barato y el de mayor
   efecto.
2. **El derecho de autor. Ya lo tienes, automaticamente.** Cubre el codigo,
   los textos clinicos, la interfaz y el trabajo 3D propio. No hay que
   registrarlo para tenerlo, pero registrarlo da fecha y prueba frente a
   terceros, y en Ecuador el registro en el SENADI es economico. El
   repositorio privado con su historial ya es evidencia de autoria fechada.
3. **El secreto industrial.** La curaduria de las tablas normativas, la receta
   del rig, el pipeline de datos clinicos. Buena parte ya esta fuera del
   paquete publico: el contenido de pago lo sirve una funcion de servidor y no
   viaja al navegador de quien no paga (memoria `server-side-entitlement`).
   Eso no es solo monetizacion, es proteccion.
4. **Los contratos.** Terminos de servicio y licencia institucional con
   prohibicion de redistribucion. Repito: lo que impide que una universidad
   reparta una cuenta entre 120 alumnos es una clausula, no un candado.
5. **La base de datos clinica como activo.** La seleccion y disposicion de
   datos citados tiene proteccion propia (en la UE existe un derecho *sui
   generis* de bases de datos; fuera, se protege via derecho de autor sobre la
   seleccion mas contrato).

**Y el recordatorio incomodo:** antes de invertir un dolar en proteger lo
propio, hay que resolver la seccion 0. ShareAlike sobre la malla es un limite
real a lo que se puede reclamar como exclusivo, y es la pregunta legal con mas
consecuencias de todo este documento.

---

## Resumen en cinco lineas

1. Vender a escuelas primero, por butaca y con factura anual.
2. Tres planes: gratis con una region entera, Pro a 69/ano, tarifa LatAm a 29.
3. Antes de cobrar: resolver la entidad de facturacion (Stripe y Ecuador),
   pasar Supabase a pago y conseguir tres testimonios.
4. Olvidar la patente. Presentar la marca esta semana. El derecho de autor ya
   lo tienes.
5. Llevarle a un abogado de propiedad intelectual una sola pregunta, la de la
   seccion 0: hasta donde alcanza el ShareAlike de Z-Anatomy.
