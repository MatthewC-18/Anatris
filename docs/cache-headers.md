# Cabeceras de caché (`vercel.json`)

`vercel.json` **no admite comentarios**, ni siquiera la convención de meter una
clave `"//"` con el texto dentro: Vercel valida el fichero contra su esquema y
rechaza cualquier propiedad que no conozca.

> `The vercel.json schema validation failed with the following message:`
> `headers[0] should NOT have additional property //`

Y lo rechaza **antes de compilar**, así que un `"//"` no es un comentario que
sobra: es un despliegue que no sale. Por eso el razonamiento vive aquí y el JSON
se queda desnudo.

## Por qué cada regla es como es

### `*.glb` y `*.glb.gz` — una semana de `stale-while-revalidate`

Los dos modelos pesan 27,3 MB y 18,2 MB. Iban cacheados **un solo día y con
`must-revalidate`**, así que pasado ese día cada visita los volvía a pagar
enteros — buena parte del *"lento"* de la nota 1.

`stale-while-revalidate` sirve la copia cacheada **al instante** y la refresca
por detrás, así que después de la primera carga nadie vuelve a esperar por el
modelo, y un modelo reexportado sigue llegando a todos en su siguiente visita.

**`immutable` no se usa, a propósito:** los nombres no llevan hash de contenido,
así que dejaría un modelo corregido atrapado en cachés durante un año.

Son **dos reglas y no una** con `(\.gz)?` opcional porque los `source` de Vercel
van anclados al final: `/(.*)\.glb` no casa con `/modelo.glb.gz`. La forma
`/(.*)\.glb` es además la única que se sabe validada — venía de antes — así que
la segunda regla la copia en vez de inventar una sintaxis nueva.

### `/anatomy-index.json` — igual que los modelos

1,3 MB de JSON con el mismo ciclo de vida: sólo se regenera cuando se regenera
el modelo.

### `/assets/*` — un año, `immutable`

Vite pone hash de contenido a todo lo que hay bajo `/assets`, así que un fichero
distinto es una URL distinta y se puede cachear para siempre.

## Qué NO hay aquí

No hay cabecera de compresión para los `.glb`. Comprimir el transporte lo decide
el CDN y `model/gltf-binary` no es un tipo que compriman de forma fiable, así que
la compilación escribe un `.glb.gz` junto a cada modelo y el navegador lo
descomprime él mismo. Ver `src/lib/compressedGLTF.ts` y `vite.config.ts`.
