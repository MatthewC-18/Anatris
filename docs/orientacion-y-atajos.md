# Orientación y atajos

Cómo se responde en Anatris a las dos preguntas que un usuario se hace todo el
rato: **¿dónde estoy?** y **¿a dónde voy ahora?**

La aplicación tiene 9 módulos × 4 modos = **36 sitios**, más un panel de
selección, tres breakpoints y un muro de pago. Hasta ahora la única respuesta era
la Guía rápida, que hay que abrir a propósito. Esta nota describe la capa de
orientación que se añadió alrededor de ella.

---

## 1. Un solo mapa: `src/lib/navigation.ts`

Qué regiones existen, en qué orden y con qué etiqueta, y lo mismo para los modos.
Antes esa lista estaba escrita a mano en cuatro sitios (`TopBar` la tenía tres
veces, `GuideHub` una, `routing.ts` los slugs) y habían derivado: la tabla de
`GuideHub` no tenía `hip` ni `ankle`, así que abrir la guía desde la cadera decía
literalmente «Estás en hip».

Ahora todo lo que nombra un sitio lee de aquí, y `navigation.test.ts` comprueba
contra `regiones.ts` y `routing.ts` que no falte ni sobre ninguna región.

El módulo define también **la ruta**: los cuatro modos no son cuatro pestañas
sueltas sino una secuencia.

```
Explorar  ->  Aprender  ->  Movimiento  ->  Estudiar
```

Los módulos conceptuales (Fundamentos) no tienen lista de músculos ni rig, así
que su ruta son los dos pasos que sí existen: `Aprender -> Estudiar`.

El selector de modos de la cabecera se pinta en ese mismo orden, para que la
pestaña y la línea de progreso lean como la misma secuencia. Movimiento pasó por
delante de Estudiar a propósito: es el diferenciador del producto y estaba el
último.

## 2. El rastro: `src/components/ContextBar.tsx`

Una tira de 28 px bajo la cabecera con tres cosas y ninguna más:

| | |
|---|---|
| **Las migas** | `Región / Modo / Estructura`. Semántica de breadcrumb normal: pulsar una miga reinicia todo lo que hay a su derecha. |
| **La línea** | La ruta del módulo, un segmento por paso, con el actual encendido. Los segmentos son pulsables. |
| **El siguiente paso** | Un botón que lo da. Atajo `N`. Con candado cuando el siguiente paso entra en un módulo de pago. |

Decisiones que conviene no deshacer sin leer esto:

- **Por debajo de `sm` las migas de región y modo se ocultan.** La cabecera ya
  muestra las dos en desplegables etiquetados; repetirlas en el móvil sería
  cromo puro. Lo que sobrevive en el móvil es lo que no está en ninguna otra
  parte de la pantalla: **la estructura seleccionada** (que si no vive dentro de
  un cajón cerrado) y el siguiente paso.
- **El contador «Paso 1 de 4» sí sobrevive en el móvil**, porque sin él la tira
  se quedaría con un botón suelto y sin decir nada de la posición. Los segmentos
  necesitan un ancho que el móvil no tiene, así que empiezan en `md`.
- **Sobre el muro de pago la ruta desaparece.** Ahí el cuerpo es el embudo de
  compra, así que todos los pasos del módulo llevan a la misma pantalla y un
  botón «Siguiente» sería un control que visiblemente no hace nada. La tira se
  convierte en la salida: un botón de vuelta a un módulo que ese usuario sí
  puede abrir. El muro conserva la venta; el rastro solo evita que alguien se
  quede encallado en él.
- **Pulsar la miga de la estructura** significa cosas distintas en cada layout:
  en escritorio encuadra la cámara sobre ella, en el móvil abre el cajón de
  Detalle. Es la misma intención («enséñame lo que he tocado») resuelta con lo
  que falta en cada pantalla.

## 3. El teclado: `src/lib/shortcuts.ts` + `useAppShortcuts`

Un único listener global para la navegación. Las teclas de herramienta siguen
donde estaban (vistas de cámara en `ViewToolbar`, disección en
`DissectionPanel`): dependen de estado que el hook no tiene por qué leer y solo
tienen sentido mientras su superficie está montada.

| Tecla | Qué hace |
|---|---|
| `⇧1` … `⇧4` | Modo (en orden de ruta) |
| `⇧←` / `⇧→` | Módulo anterior / siguiente (se **detiene** en los extremos, no da la vuelta) |
| `N` | Siguiente paso sugerido |
| `⌘K` / `Ctrl K` / `/` | Paleta de comandos |
| `G` | Guía rápida |
| `?` | Hoja de atajos |
| `Esc` | Cierra lo que haya abierto; si no hay nada, suelta la selección |

Dos detalles que son la diferencia entre que funcione y que no:

1. **Los dígitos 1–6 ya estaban ocupados** por las seis vistas de cámara, y `D`
   / `A` / `Z` por la disección. Por eso los modos van en `Shift` + dígito.
2. **Los modos se leen de `event.code` (`Digit1`…), no de `event.key`.** En los
   teclados a los que este producto vende de verdad —español, latinoamericano,
   francés, alemán— `Shift+1` no produce «1», produce `!` o `&`. Leyendo `key` el
   atajo habría funcionado solo en teclados estadounidenses.

El hook se apaga entero (`enabled`) mientras un modal es dueño del teclado (el
tour de bienvenida usa las flechas, la paleta usa Enter y las flechas) y nunca
dispara si el foco está en un campo de texto (`isTypingTarget`).

La hoja de atajos se genera desde el mismo módulo que documenta las teclas, así
que **no puede** describir un atajo que no exista ni omitir uno que sí.

## 4. La paleta ya no busca solo estructuras

`⌘K` indexa cuatro cosas: **Ir a** (los modos), **Módulos** (las nueve regiones,
con candado las de pago), **Acciones** (guía, atajos, evidencia, planes) y
**Estructuras** (el índice anatómico, como antes).

- Con la caja vacía muestra la navegación, no 30 mallas arbitrarias: abrirla es
  así una forma de ver qué contiene el producto.
- El emparejado ignora acentos. «toracica» encuentra «Torácica»; nadie va a
  buscar la tecla del acento en mitad de una búsqueda.
- Las filas bloqueadas se muestran con candado y siguen siendo navegables: van a
  parar al muro de pago, que es justo el motivo de marcarlas en vez de
  esconderlas.

## 5. Efecto colateral arreglado

El selector de modos aparece a 1024 px y con él el ancho intrínseco de la
cabecera pasaba a 1099 px: entre 1024 y 1099 la barra desbordaba y recortaba a su
último hijo, el menú de cuenta. En el portátil más estrecho que muestra los modos
se leía «Iniciar sesió». Nada de la barra puede encogerse (todos los controles
son `shrink-0`, y con razón: si no, las etiquetas se comprimen), así que el ancho
sale de los huecos y del chip de atajo del botón de búsqueda, que se oculta entre
`lg` y `xl`. Medido después: a 1024 px cabe con margen.
