# Sistema LÁMINA

El diseño de Anatris. Una regla, unas pocas piezas y un banco que la mide.

## Por qué existe

El dueño lo dijo así: *"que no tenga el mismo diseño de las otras páginas, que
son como tarjetas dentro de tarjetas. Debe ser intuitiva y funcional."*

La interfaz era eso: paneles de cristal flotando sobre el modelo, con cajas
redondeadas dentro, pastillas con borde en la barra y fichas de colores para
cada etiqueta. Se leía como cualquier panel de control generado. Y costaba dos
defectos reales: los paneles **tapaban el cuerpo** y cada función vivía en un
sitio y con una forma distinta.

## La idea: la lámina de un atlas

Un atlas de anatomía impreso no tiene cajas. Tiene una **figura**, unos
**márgenes** con nombres y líneas guía, un **rótulo** pequeño encima de cada
cosa y **filos** finos que separan. La jerarquía la hacen el tamaño de la letra
y el espacio en blanco.

Anatris es eso mismo con un cuerpo que se mueve:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Anatris  REGIÓN Hombro ▾  Explorar Aprender Repasar Movimiento   ⌕ ? │  barra: una línea de texto
├───────────────┬──────────────────────────────────┬───────────────────┤
│ MARGEN        │                                  │ MARGEN            │
│ IZQUIERDO     │           ESCENARIO              │ DERECHO           │
│               │                                  │                   │
│ lo que se LEE │   el cuerpo, con su rectángulo   │ lo que se le HACE │
│ y sus mandos  │   propio. Nada lo tapa.          │ (herramientas)    │
│               │                                  │                   │
│               │   ⌗ Reencuadrar · Modo paciente  │ ── selección ──   │
└───────────────┴──────────────────────────────────┴───────────────────┘
```

- **Margen izquierdo**: contexto y lectura. En Explorar, el índice de la región
  (músculos, huesos, nervios). En Movimiento, la frase de la fase con su
  paginador, los tres músculos que la hacen y la consola.
- **Escenario**: el modelo. Solo lleva encima anotaciones tipográficas
  (`.stage-note`) y, al pie, la barra de acciones de vista (`.stage-bar`).
- **Margen derecho**: detalle y herramientas. En Explorar, la ficha de lo
  seleccionado. En Movimiento, las pestañas Capas / Tests / Neuro y, al pie, la
  estructura que se acaba de tocar.

Los márgenes están **acoplados**: en el flujo, pegados al borde de la ventana,
separados del escenario por un filo de 1 px. No flotan, no tienen sombra, no
tienen radio y no tapan el modelo. Por debajo de `lg` (1024 px) no caben: la
vista compacta es escena + hoja inferior con pestañas.

## La regla

> **Dentro de un margen no hay cajas.**

Nada de un borde redondeado con fondo alrededor de un grupo de cosas. Ni
recuadros tintados sin borde, ni fichas de colores para las etiquetas.

Para destacar algo hay cuatro recursos, y no hay más:

1. **Rótulo + filo** (`.sec-head`): empieza una sección.
2. **Tamaño**: la cifra que importa va grande (`.readout`).
3. **Regla a la izquierda** (`.note`): un aviso, una nota clínica, un candado.
4. **Peso y color del texto**: lo activo es `text-fg` y seminegrita; lo demás,
   `text-fg2` o `text-fg3`.

### Lo que sí puede ser una superficie

Lo que **flota de verdad**: un menú desplegable, la paleta de comandos, un
tooltip, un modal, el tour de bienvenida. Esos llevan `.instrument` (grafito
opaco, filo de 1 px, 6 px de radio). **Dentro de una superficie tampoco hay
cajas**: se aplica la misma regla.

### Cuándo una caja está justificada

Cuando el recuadro **es** el objeto: la tarjeta de repaso que se voltea, la
muestra de un color, una imagen. Se marca en el código con un comentario
`caja-ok: <motivo>` en la línea del `className` o en la de encima. El banco la
cuenta aparte.

## Las piezas

Todas están en `src/index.css`, bajo `LAMINA`. Tokens de color: **siempre** los
semánticos (`bg-page`, `bg-card`, `border-line`, `text-fg`, `text-fg2`,
`text-fg3`, `text-brand`, `bg-brand-fill`). Nunca `slate-*`, `ink-*` ni
`accent` crudos en código nuevo.

| Pieza | Para qué | En vez de |
|---|---|---|
| `.margin` `.margin-l` `.margin-r` | columna acoplada | tarjeta flotante `.instrument` |
| `.sec` | una sección del margen (padding) | `p-4` dentro de una caja |
| `.sec-head` + `.kicker` + `.sec-rule` | cabecera: rótulo y filo hasta el borde | título dentro de una tarjeta |
| `.rule` | filo de lado a lado | `border` de una caja |
| `.readout` | la cifra grande del instrumento | número dentro de una ficha |
| `.num` | cifras y unidades pequeñas, mono tabular | `font-mono tabular-nums` suelto |
| `.tabs` + `.tab` | pestañas subrayadas | control segmentado con borde |
| `.opt` | fila para elegir UNA entre varias | fila de chips con borde |
| `.btn .btn-primary` | la acción principal (una por vista) | botón `rounded-xl bg-accent` |
| `.btn .btn-line` | acción secundaria que debe verse como botón | botón con `border` y `bg` |
| `.btn .btn-quiet` | todo lo demás: texto que responde | pastilla con borde |
| `.btn-icon` `.btn-sm` | modificadores | |
| `.note` `.note-brand` `.note-warn` `.note-lock` | aviso con regla a la izquierda | caja de alerta tintada |
| `.tag` | dato corto en mono, sin borde ni fondo | chip / badge |
| `.meter` (`--v`: 0..100) | barra de 2 px | barra dentro de una pista redondeada |
| `.field` | campo de una línea | input con caja |
| `.stage-note` | anotación sobre el escenario | chip flotante |
| `.stage-bar` | acciones de vista al pie del escenario | pastilla flotante |
| `.lede` | LA cosa grande de un margen: una frase en Sora 18 (17 a 304 px de margen, 20 en ventanas altas) | párrafo largo a la vista |
| `.pager-row` `.tramo` `.pager` `.pip` | paginador: el tramo en acento y una raya por paso; la actual, de acento y 3 px | lista de fases o pastillas numeradas |
| `.byline` `.src-line` `.link-quiet` | la fuente en mono y un "Seguir leyendo" de texto | botón con borde bajo un texto |
| `.lab-axis` | rejilla del eje: botón \| pista \| cifra (2rem, 1fr, 2.375rem); la comparten el deslizador y las curvas de los músculos para que el cursor caiga sobre el pulgar | dos piezas con anchos sueltos |
| `.strip` (`ActivationStrip`) | curva de un músculo en todo el arco, con cursor y punto; dibujo solo en el recorrido del centro del pulgar | barra de % del grado actual |
| `.lab-menu` (`.instrument`) | menú flotante que sube desde el pie del margen; uno abierto, Esc y clic fuera lo cierran | cajón en el flujo que empuja la lectura |
| `.lab-switch` | interruptor con el rótulo ENCIMA (pie de tres columnas) | interruptor con rótulo al lado |
| `.attach-callout` `.attach-leader` | Explorar: UNA etiqueta en pantalla con una guía a cada punto (origen, inserción) | un cartel 3D por punto |

**El margen izquierdo del laboratorio** (`RhythmReadout` + `LabMarginParts`,
noviembre de 2026) es la receta completa: arriba lo que se elige, en medio UNA
frase grande (`.lede`) con su paginador y, debajo, tres músculos con su curva en
la rejilla del eje; abajo la consola y un pie de tres columnas con menús
flotantes. La celda de la frase mide siempre lo que la fase más alta y la llena
la continuación del texto, para que nada salte al cambiar de fase.

Radios: **0** en contenedores, **4 px** en controles (`rounded`), **6 px** en
superficies flotantes. `rounded-full` solo para puntos, pulgares de interruptor
y avatares. `rounded-lg/xl/2xl` no se usan.

Tipografía: `font-display` (Sora) para títulos y cifras; `font-sans` (IBM Plex
Sans) para el texto; mono (IBM Plex Mono) para rótulos, etiquetas y unidades.
Cuatro tamaños de texto por panel, no más.

Color: grafito neutro, **un** acento (`brand`) para lo interactivo y lo activo,
los colores de papel muscular (`role-prime`, `role-assist`, `role-stabilize`)
solo para decir el papel, y ámbar solo para candados y avisos.

## Recetas

**Una caja que agrupa → una sección**

```tsx
// antes
<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
  <p className="text-[10px] uppercase text-slate-500">Músculo protagonista</p>
  …
</div>

// después
<section className="sec">
  <div className="sec-head">
    <span className="kicker">Músculo protagonista</span>
    <span className="sec-rule" />
  </div>
  …
</section>
```

**Una fila de chips para elegir → opciones**

```tsx
// antes: chips con borde en una fila que se desborda
<button className="rounded-lg border px-3 py-1.5 …">Abducción</button>

// después: lista, todas a la vista, sin scroll horizontal
<div role="radiogroup" aria-label="Movimiento">
  <button role="radio" aria-checked={activo} className="opt">Abducción</button>
</div>
```

**Un control segmentado de 2 a 4 opciones cortas → pestañas**

```tsx
<div role="tablist" className="tabs">
  <button role="tab" aria-selected={lado === 'R'} className="tab">Derecho</button>
  <button role="tab" aria-selected={lado === 'L'} className="tab">Izquierdo</button>
</div>
```

**Una caja de aviso → una nota**

```tsx
// antes
<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs">…</div>
// después
<p className="note note-lock">Versión gratuita con un movimiento de demostración…</p>
```

**Chips de etiqueta → etiquetas en línea**

```tsx
// antes
<span className="rounded-full border px-2 py-0.5 text-[10px]">Manguito rotador</span>
// después (varias se separan con un punto medio)
<span className="tag">Manguito rotador</span>
```

**Una ficha de estadística → cifra y rótulo**

```tsx
// antes: cuatro tarjetas en fila
// después: una fila partida por filos verticales
<dl className="flex divide-x divide-line/75">
  <div className="px-4 first:pl-0">
    <dd className="readout text-2xl">12</dd>
    <dt className="kicker mt-1.5">Para repasar</dt>
  </div>
  …
</dl>
```

**Un botón**

```tsx
<button className="btn btn-primary">Diseccionar</button>   // la acción del margen
<button className="btn btn-line">Aislar</button>           // secundaria visible
<button className="btn btn-quiet btn-sm">Deshacer</button> // el resto
```

## Lo que NO cambia

- **El comportamiento.** Esto es piel: mismos mandos, mismos atajos, mismos
  `aria-*`, mismos textos. Si al convertir una pantalla aparece un defecto de
  función, se arregla aparte y se dice.
- **Los objetivos táctiles**: 44 px en la hoja móvil.
- **El foco visible** (`:focus-visible` en `index.css`).
- **Los comentarios que explican una medida.** Si un comentario describe la
  caja que se acaba de quitar, se reescribe; no se borra la medida.

## El banco

```bash
npm run audit-surfaces
```

Cuenta cajas, bloques, pastillas y superficies por fichero. Con una ruta enseña
cada sitio con su línea:

```bash
npm run audit-surfaces -- src/components/RomPanel.tsx
```

Línea base del 10 nov 2026, antes de convertir nada: **62 cajas, 46 bloques y
52 pastillas en 44 ficheros**. El objetivo es cero sin justificar.
`src/lib/__tests__/laminaSurfaces.test.ts` fija en cero los ficheros ya
convertidos, para que ninguno vuelva atrás.
