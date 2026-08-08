# S5 — Cerrar la fuga: verificación de suscripción en el servidor

Sesión del **2026-08-05**. Hasta hoy el muro de pago era **cosmético**: toda la
biblioteca clínica viajaba en chunks de JavaScript que Vercel sirve como
ficheros públicos. Cualquiera podía pedirlos y leerse las siete regiones de pago
sin registrarse. Partir el bundle (un pase anterior) arregló **la descarga**, no
el acceso.

Ahora el contenido de pago **no está en el bundle**: lo sirve una edge function
que comprueba la suscripción antes de responder.

---

## 1. Cómo funciona

```
        ┌── libre (hombro + fundamentos) ──► empaquetado en la app
CONTENIDO
        └── premium (7 regiones) ──► edge function `content`
                                        ├─ ¿sesión válida?      no → 401
                                        ├─ ¿plan activo?        no → 403
                                        └─ sí → JSON → premiumStore (memoria)
```

**Las piezas**

| Archivo | Papel |
|---|---|
| `src/data/fullContent.ts` | La biblioteca completa. **Solo build/test**, nunca la app |
| `scripts/build-premium-content.mts` | Serializa las 7 regiones de pago a JSON (`npm run build-premium-content`) |
| `supabase/functions/content/index.ts` | Sirve un payload tras verificar la suscripción |
| `src/data/premiumStore.ts` | Donde aterriza el payload en el cliente |
| `src/lib/premiumContent.ts` | Descarga, deduplica peticiones en vuelo, instala |
| `src/hooks/usePremiumRegion.ts` | La puerta: 'ready' cuando ya se puede pintar |

**La decisión de diseño que lo hizo abarcable.** Los registros
(`romForRegion`, `musclesForRegion`…) se leen **síncronamente** desde ~30 sitios,
varios dentro del bucle de render de r3f donde no cabe un hook. Convertirlos a
asíncronos habría tocado todos los paneles de la app. En su lugar, `App` no
monta una región premium hasta que su payload está instalado, así que cuando
esos 30 sitios se ejecutan **el dato ya está** y siguen siendo síncronos.

**Dos puertas, no una.** `locked` es la comprobación de cliente (rápida, se
puede falsear). `contentDenied` es la respuesta del **servidor**. Ambas caen en
el mismo Paywall, así que quien se salte la primera choca con la segunda.

---

## 2. Qué hay que hacer para desplegarlo

⚠️ **Sin estos dos pasos, en producción las regiones de pago quedarán en
"Cargando contenido clínico…" y luego en el muro de pago.** Compruébalo en una
preview antes de tocar producción.

```bash
npm run build-premium-content
supabase functions deploy content
```

Secretos que necesita la función (los mismos que las otras): `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, ambos inyectados por Supabase. Opcionalmente
`OWNER_USER_IDS` para el acceso total del dueño (abajo).

**Regenera y redespliega SIEMPRE que edites contenido clínico de pago.** Si se
te olvida, `npm test` lo caza: hay un test que compara los payloads escritos
contra los datos fuente. No llega a un usuario.

### Diagnóstico: «solo carga el hombro, el resto no»

Ese es el **síntoma normal de cualquier fallo de esta función**, no un problema
del modelo 3D ni de los datos: el hombro y Fundamentos van empaquetados en la
app y las otras siete regiones pasan por aquí. La app dice ahora *cuál* de las
causas es, en la propia tarjeta de error y en la consola:

| Lo que ves | Causa | Arreglo |
|---|---|---|
| `La funcion "content" no existe…` (HTTP 404) | Nunca se desplegó (§2) | `supabase functions deploy content` |
| `…fallo en el servidor` (HTTP 5xx) | Excepción dentro de la función | `supabase functions logs content` |
| `No se pudo contactar con el servidor…` (sin HTTP) | Sin conexión, CORS, bloqueador | Red / extensiones del navegador |
| `Esta build no tiene Supabase configurado` | Faltan `VITE_SUPABASE_*` en el deploy | Ponlas en Vercel y **rebuild** |
| `El servidor devolvio un contenido invalido` | Payload corrupto o de otra región | Regenera y redespliega |
| **Muro de pago** (no tarjeta roja) | 401/403: sin sesión o sin plan | Inicia sesión / `OWNER_USER_IDS` |

Las tres primeras traen botón **Reintentar**: antes había que salir de la región
y volver a entrar para que el efecto se disparara otra vez.

**Acceso total del dueño.** `?acceso=…` y `VITE_ALL_ACCESS` son de **cliente**:
desbloquean la navegación, no el contenido. Desde que el contenido lo sirve el
servidor, el dueño choca con el 403 en las siete regiones igual que cualquiera.
La mitad de servidor es el secreto `OWNER_USER_IDS` (lista de user ids de Auth
separados por comas) que la función respeta saltándose la comprobación de plan.
Vacío por defecto.

### Cómo comprobar que la fuga está cerrada

1. Sin sesión, en la consola del navegador:
   ```js
   await fetch('<SUPABASE_URL>/functions/v1/content', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ region: 'knee' }),
   }).then(r => r.status)   // esperado: 401
   ```
2. Con sesión pero sin plan → **403**.
3. Con plan activo → **200** y el JSON.
4. Y en el bundle: `grep -r "Hipercifosis" dist/assets/` no debe devolver nada.

---

## 3. Lo que se midió

**Contenido de pago fuera del bundle público** (sondas de texto sobre `dist/`):

| Sonda | Antes | Ahora |
|---|---|---|
| `Hipercifosis` (torácica) | en `MovementView` | **ninguno** |
| `whiplash` (cervical) | en el chunk | **ninguno** |
| `Epicondilalgia` (codo) | en el chunk | **ninguno** |
| `Hernia discal` (lumbar) | en el chunk | **ninguno** |

**Tamaños:**

| Chunk | Antes | Ahora |
|---|---|---|
| `muscleContentByRegion` | 161,7 KB · 33,0 gz | **54,6 KB · 11,0 gz** (−67%) |
| `trackByRegion` | 158,8 KB · 36,5 gz | **37,6 KB · 9,6 gz** (−74%) |
| `romByRegion` | 86,5 KB | **desaparece** |
| Precache de la PWA | 2818 KB | **2397 KB** |

La entrada sube ~6 KB (el cargador y el store). Compensa de sobra.

**Verificado en navegador real**, no solo compilado: `/rodilla/movimiento` abre
con sus 4 movimientos, sus 11 tests, el mecanismo de tornillo y los presets
(Extension lag, Maltracking); `/hombro/movimiento` abre **sin espera** porque
sigue empaquetado. Consola limpia en ambos. 138 tests en verde, auditoría con 0
errores y 0 avisos.

---

## 4. Cómo no romperlo

Cuatro tests nuevos lo vigilan, porque **esta regresión es invisible**: no lanza
excepciones, no rompe tipos, la app se ve bien — el contenido simplemente vuelve
a ser público.

1. Ningún registro en runtime contiene una región de pago.
2. Ningún archivo de la app importa `fullContent` (solo la auditoría y el
   cargador).
3. El import de `fullContent` del cargador sigue siendo **dinámico y bajo
   `import.meta.env.DEV`**, que Vite elimina en producción.
4. Los payloads existen para las 7 regiones y coinciden con los datos fuente.

**Al añadir contenido clínico de una región de pago:** escríbelo en su archivo
(`data/muscles/`, `data/cases/<región>.ts`, `data/pathology/<región>.ts`…),
**no** en los registros de runtime, y vuelve a ejecutar
`npm run build-premium-content`.

---

## 5. Lo que queda deliberadamente público

**La bibliografía** (`references.ts`): autores, títulos, revista y PMID de las 42
referencias. Sigue en el bundle a propósito — una lista de referencias es
información pública por naturaleza, la región gratuita la necesita, y ocultarla
no protegería nada: son artículos que cualquiera puede buscar en PubMed. Lo que
sí está protegido es **la interpretación**: qué significa cada cifra, en qué
fase del movimiento aplica y qué estructura implica.

**En modo demo (sin Supabase configurado) y en `npm run dev`** el contenido se
lee de la biblioteca local: sin backend no hay endpoint al que llamar. Ese
camino vive dentro de `if (import.meta.env.DEV)` y Vite lo elimina del build de
producción — comprobado por test y por las sondas sobre `dist/`.

---

## 6. Pendiente

- **Desplegar** (§2). Hasta entonces la fuga sigue abierta en producción, porque
  el build viejo es el que está servido.
- **Offline de regiones de pago.** La PWA ya no puede precachear ese contenido
  (es el objetivo). Un suscriptor que abra la rodilla sin conexión y sin haberla
  visitado antes verá el error de carga. Si se quiere offline de pago, hay que
  guardar el payload en IndexedDB tras la primera descarga con éxito —
  decisión de producto, no de seguridad.
- **`current_period_end` no se comprueba** en la función: se confía en que el
  webhook de Stripe pone `status` a `canceled`/`past_due`. Es correcto mientras
  el webhook funcione; añadir la comprobación de fecha sería cinturón y
  tirantes.
