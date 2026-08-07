# S2 — Verificación clínica: hombro y rodilla

Sesión del **2026-08-04**. Objetivo: que la promesa de la landing ("cada
afirmación, con su fuente") sea cierta donde el visitante mira.

**Método:** cada cita de test se comprobó contra el registro público de PubMed
del artículo citado. Solo se marca `verified: true` cuando el resumen del propio
artículo contiene la cifra. Nada se dio por bueno "porque suena razonable".

**Resultado:** 0 errores y **0 avisos** en `npm run audit-data` (antes 2).
Tests de rodilla 6/11 → **8/11**. Y aparecieron cuatro problemas reales que
nadie había detectado.

---

## 1. Lo que se corrigió (con la evidencia)

### 1.1 🔴 Interlínea articular: la sensibilidad estaba 20 puntos alta

`src/data/orthopedicTests/knee.ts` · `joint-line-tenderness`

| | Antes | Ahora |
|---|---|---|
| Sensibilidad | 83% | **63%** |
| Especificidad | 76% | **77%** |
| Utilidad | `balanced` | **`weak`** |

La ficha citaba **Hegedus 2007** (PMID [17939613](https://pubmed.ncbi.nlm.nih.gov/17939613/)),
y ese metaanálisis dice literalmente en su resumen: *"Pooled sensitivity and
specificity were 70% and 71% for McMurray's, 60% and 70% for Apley's, and 63%
and 77% for joint line tenderness."*

El error iba en la dirección peligrosa: **sobrevendía el test**. Con 83% se
presentaba como cribado sensible ("un negativo hace menos probable la lesión
meniscal"), y con 63% no descarta nada. La interpretación se reescribió en
consecuencia.

### 1.2 🔴 Hawkins-Kennedy: cifras que no coincidían con su propia fuente

`src/data/orthopedicTests/shoulder.ts` · `hawkins-kennedy`

| | Antes | Ahora |
|---|---|---|
| Sensibilidad | 74% | **79%** |
| Especificidad | 57% | **59%** |
| Utilidad | `rule-out` | **`weak`** |

Hegedus 2012 (PMID [22773322](https://pubmed.ncbi.nlm.nih.gov/22773322/)):
*"for the Hawkins-Kennedy test was 79% and 59%, respectively"*.

### 1.3 🟠 Neer y Hawkins estaban clasificados como "Descarta"

Los dos avisos que arrastraba la auditoría. `rule-out` significa SnNout: un
negativo descarta, y eso exige sensibilidad alta. Neer tiene 72% y Hawkins 79%.
Ninguno llega. Ambos pasan a **`weak`** ("En conjunto: poca precisión aislado,
úsalo dentro de un grupo de tests"), que es además la conclusión textual del
propio metaanálisis: *"the use of any single ShPE test to make a pathognomonic
diagnosis cannot be unequivocally recommended"*.

Neer 72/60 sí quedó **confirmado** contra el resumen.

### 1.4 🟠 Apley citaba al artículo equivocado

`apley-compression` daba 60/70 citando **Malanga 2003**, cuyo resumen no contiene
ninguna cifra. Esos 60/70 son los valores agrupados de **Hegedus 2007**, que sí
los enuncia. Mismos números, fuente correcta — y ahora comprobables por un
lector. Marcado `verified: true`.

### 1.5 🟠 La referencia `hegedus-2012` estaba mal catalogada

`src/data/references.ts`. Tenía un título que no existe (mezclaba este artículo
con el original de 2008) y **ningún PMID**, así que la pantalla de Evidencia no
podía enlazarlo. Corregidos título, autores, volumen/páginas
(*Br J Sports Med* 2012;46(14):964-78) y añadido el PMID **22773322**.

---

## 2. Lo que NO se pudo verificar, y por qué

Se documentó **dentro del dato** (campo `locator`), no en una nota aparte, para
que aparezca en la worklist y no se pierda.

| Test | Cifras | Qué pasa |
|---|---|---|
| `lift-off` (hombro) | 62/100 | Gerber 1991 es una **serie de 16 casos sin grupo control**: describe la maniobra y no da sens/espec. Una especificidad del 100% no puede salir de ahí. Las cifras vienen de otra fuente sin identificar |
| `belly-press` (hombro) | 40/98 | Hegedus 2012 solo menciona el belly press *modificado* como prometedor, sin cifras |
| `relocation` (hombro) | 65/90 | Lo 2004 da cifras **solo del test de sorpresa**; sobre el de recolocación concluye que "añade poco" |
| `cross-body-adduction` (hombro) | 77/79 | **Sens 77% confirmada.** El 79% aparece en el resumen como **exactitud global**, no como especificidad — son cosas distintas. Verificar en la tabla del texto completo |
| `posterior-sag`, `valgus-stress`, `varus-stress` (rodilla) | varias | Malanga 2003 es una **revisión narrativa**: su resumen describe los tests en palabras ("sensitive and specific", "lack of well-designed studies") sin dar números. Están en las tablas del texto completo |

### ⚠️ Un aviso que hay que revisar

`apprehension` (hombro) figura como **`verified: true`** con 72/96 citando Lo
2004, pero **el resumen de Lo 2004 no contiene esas cifras** (solo las del test
de sorpresa). No se ha cambiado —puede que alguien lo comprobara en el texto
completo— pero **hay que confirmarlo**. Si no aparece en la tabla original, es
una verificación falsa, y una sola de esas hace dudar de las otras 41.

---

## 3. ROM: por qué sigue en 0/161, y qué hace falta exactamente

**No es pereza ni un olvido: es materialmente imposible desde aquí.** Las 161
citas de ROM apuntan a **Kapandji, Oatis y Neumann**, libros con derechos de
autor que no están en línea. Y hoy esas citas **no tienen ni número de página**:

```
glenohumeral-abduction    0..180  ::  kapandji [SIN PÁGINA] | oatis [SIN PÁGINA]
glenohumeral-flexion      0..180  ::  kapandji [SIN PÁGINA]
glenohumeral-ext-rotation 0..80   ::  kapandji [SIN PÁGINA]
glenohumeral-int-rotation 0..100  ::  kapandji [SIN PÁGINA]
knee-flexion              0..105  ::  kapandji [SIN PÁGINA] | oatis [SIN PÁGINA]
knee-extension            0..105  ::  kapandji [SIN PÁGINA]
knee-internal-rotation    0..30   ::  kapandji [SIN PÁGINA]
knee-external-rotation    0..40   ::  kapandji [SIN PÁGINA]
```

Verificar significa **abrir el libro y anotar la página**. Es tu ejemplar o el de
la biblioteca. Inventar un número de página es exactamente lo que la guía de
autoría del repo prohíbe, y con razón: es la mentira más fácil de pillar.

### La buena noticia: son 8 valores, no 161

Hombro y rodilla —lo que enseñas en la demo y en el plan gratuito— son **8
rangos**. Con los dos libros delante es **media hora**.

Para cada uno, en `src/data/shoulderRom.ts` y `src/data/kneeRom.ts`:

```ts
rangeCite: [
  { ref: 'kapandji', page: '58', pageVerified: true },
  //                  ^^^^^^^^^  ^^^^^^^^^^^^^^^^^^
  //                  la página   solo tras verla
]
```

Comprueba a la vez que **la cifra coincide** con lo que dice el libro. Si
Kapandji da 95° de rotación interna y el dato dice 100, manda el libro.

> **Nota sobre la rodilla:** `knee-flexion` dice 0–105° y **está bien**. Es el
> límite de la malla, no el ROM clínico, y la prosa ya lo explica (~120° activa
> con cadera extendida, ~140° con cadera flexionada, ~160° pasiva). Verifica la
> página de esas cifras del texto, no del 105.

### Comprueba el progreso

```bash
npm run audit-data
```

Objetivo de S2: hombro **23/23** y rodilla **17/17**.

---

## 4. Lo que queda de S2

- [ ] Las 8 páginas de ROM de hombro y rodilla (Kapandji + Oatis).
- [ ] Los 7 tests de la tabla §2, en los textos completos.
- [ ] Confirmar `apprehension` (§2, aviso).

Los textos completos de Malanga 2003, Lo 2004, Chronopoulos 2004 y Gerber 1991
suelen estar accesibles desde una biblioteca universitaria. Si alguno no
aparece, **la salida honesta es quitar la cifra y dejar el test como cualitativo**,
no dejarla citada a una fuente que no la contiene.
