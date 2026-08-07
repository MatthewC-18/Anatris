# S6 — Verificación clínica: triaje del resto

Sesión del **2026-08-06**. Continuación de
[`verificacion-hombro-rodilla.md`](verificacion-hombro-rodilla.md) (S2).

**Conclusión de la sesión:** el camino de "verificar desde los resúmenes de
PubMed" **está agotado**, y eso es un resultado, no un fracaso. Ahora se sabe
exactamente qué queda, por qué ruta y a qué coste — y resulta que **el 73% del
trabajo son dos libros**.

---

## 1. Lo que se verificó de verdad

### ✅ Torácica pasa de 0/10 a 2/10

`closed-fist-percussion` y `supine-sign` citan **Langdon 2010**, y su resumen
público (PMID [19995486](https://pubmed.ncbi.nlm.nih.gov/19995486/)) enuncia las
cifras: 87,5% / 90% y 81,25% / 93,33%. Las de la ficha (88/90 y 81/93) coinciden
redondeadas. Marcados `verified: true` con su localizador.

### ✅ Cinco referencias ya son enlazables

`Evidencia` solo genera enlace a PubMed cuando la referencia tiene `pmid`. Cinco
artículos no lo tenían; encontrados en PubMed y añadidos:

| Referencia | PMID |
|---|---|
| `kibler-2013` — consenso de discinesia escapular | [23580420](https://pubmed.ncbi.nlm.nih.gov/23580420/) |
| `gillard-2001` — desfiladero torácico | [11707008](https://pubmed.ncbi.nlm.nih.gov/11707008/) |
| `langdon-2010` — fracturas vertebrales | [19995486](https://pubmed.ncbi.nlm.nih.gov/19995486/) |
| `cote-1998` — Adams / escoliómetro | [9563110](https://pubmed.ncbi.nlm.nih.gov/9563110/) |
| `zwerus-2018` — revisión de codo | [28249855](https://pubmed.ncbi.nlm.nih.gov/28249855/) |

`kibler-2013` importa más de lo que parece: es la fuente que se cita en voz alta
en la demo de discinesia escapular del vídeo de la candidatura. Ahora el jurado
puede pinchar y comprobarla.

### ⚠️ Un riesgo nuevo detectado (Gillard 2001, desfiladero torácico)

El resumen dice dos cosas que **no** son lo que la ficha afirma:

1. El **85% de Adson es un valor predictivo positivo**, no una especificidad.
2. Da **72% / 53% como media de TODOS los tests provocativos** — sospechosamente
   igual al 70/53 que la ficha atribuye a Wright en concreto.

Es el mismo patrón que la aducción cruzada en S2 (exactitud confundida con
especificidad). No se ha cambiado ninguna cifra —haría falta el texto completo—
pero queda anotado en el propio dato para que no se pierda.

### 📌 Comprobado y descartado (el resumen no lo respalda)

| Fuente | Qué dice realmente el resumen |
|---|---|
| **Laslett 2005** (5 tests sacroilíacos) | Solo publica el **compuesto**: 3 o más de 6 positivos = 94% / 78%. Las cifras por test están en las tablas |
| **Suri 2011** (2 tests lumbares) | Presenta **razones de verosimilitud**, no sens/espec, y no nombra esos tests |
| **Jiang 2024** (Lhermitte) | Solo dice cualitativamente qué signos son "más sensibles/específicos", sin cifras |
| **Zwerus 2018** (3 tests de codo) | Sin cifras en el resumen |
| **Côté 1998** (Adams) | Sin cifras en el registro público |

Todo esto quedó escrito **dentro del dato** (campo `locator`), no en una nota
aparte, así que sale solo en la worklist y en el triaje.

---

## 2. La herramienta nueva: `npm run triage-citations`

El problema real no era la falta de ganas, era la falta de visibilidad: "0/161"
no dice si eso son dos tardes o dos meses. El triaje clasifica cada cita
pendiente por **cómo** se puede verificar, y las agrupa por fuente, porque un
solo libro abierto cierra decenas de ítems de una sentada.

```bash
npm run triage-citations
```

### El resultado, hoy

```
  LIBRO (necesita el ejemplar):        177
  TEXTO (necesita el texto completo):   25
  TOTAL sin verificar:                 202
```

Y agrupado por fuente:

| Fuente | Citas | Ruta |
|---|---:|---|
| **Kapandji** | **98** | Libro |
| **Oatis** | **49** | Libro |
| Magee | 16 | Libro |
| Neumann | 14 | Libro |
| Laslett 2005 | 5 | Texto completo |
| Gillard 2001 · Malanga 2003 · Zwerus 2018 | 3 c/u | Texto completo |
| Suri 2011 | 2 | Texto completo |
| 9 fuentes más | 1 c/u | Texto completo |

### La conclusión que cambia el plan

**Kapandji y Oatis son 147 de las 202 citas: el 73%.** No son 202 problemas
distintos: son **dos libros**. Con cada uno abierto, anotar páginas es trabajo
mecánico, no investigación.

**Empieza por Kapandji.** Cierra el 48% del total, y es la fuente principal de
todos los rangos de movimiento — justo lo que la landing promete y lo que se ve
en el vídeo.

---

## 3. Por qué no se puede hacer desde aquí

Dos pases de verificación (4 y 6 de agosto) llegaron a la misma pared por
caminos distintos, así que conviene dejarlo escrito para no reintentarlo:

- **Kapandji, Oatis, Neumann y Magee** son libros con derechos de autor. No
  están en línea en ninguna forma legal. Verificar = abrir el ejemplar.
- **Los resúmenes de PubMed casi nunca traen las cifras por test.** Viven en las
  tablas del texto completo, de pago. La excepción son los **metaanálisis que
  enuncian sus cifras agrupadas en el propio resumen** — y esos ya se
  cosecharon: son exactamente los que cazaron los 4 errores reales de S2
  (Hegedus 2007 y 2012) y los 2 tests de Langdon de hoy.
- Se comprobó también que **PubMed Central no tiene copia libre** de Malanga
  2003 ni de Hegedus 2007.

Inventar un número de página es lo único que la guía de autoría del repo
prohíbe explícitamente, y con razón: es la mentira más fácil de pillar y
destruiría lo único que este producto vende de verdad.

---

## 4. Un test que se hizo más estricto

El test de frescura de los payloads premium solo comparaba `rom`. Esta misma
sesión editó `tests` de torácica y lumbar y **habría pasado sin avisar**, dejando
contenido caducado servido a quien paga mientras el repositorio parecía correcto.

Ahora compara **todos** los campos (`rom`, `tests`, `cases`, `muscles`,
`content`, `pathologies`) y falla con el mensaje exacto:

```
lumbar.tests está desincronizado: corre "npm run build-premium-content"
```

Comprobado: falló con mis propios cambios antes de regenerar. Es la clase de
test que solo sirve si de verdad se rompe cuando debe.

---

## 5. Estado y siguiente paso

```
  Errores: 0   Avisos: 0
  ROM verificado:    0/161 (0%)
  Tests verificados: 44/85 (52%)     ← era 42/85
```

**Lo siguiente, por orden de retorno:**

1. **Kapandji, una tarde** → 98 citas (48% del total). Empieza por hombro y
   rodilla: es lo que se enseña en la demo y en el vídeo.
2. **Oatis, otra tarde** → 49 más. Acumulado: 73%.
3. **Magee** → cierra 16 tests de tobillo, cadera y torácica, que están a 0%.
4. Los textos completos, si consigues acceso de biblioteca. Si alguno no
   aparece, **la salida honesta es quitar la cifra y dejar el test como
   cualitativo**, no dejarla citada a una fuente que no la contiene.

Usa `npm run triage-citations` para trabajar por fuente y `npm run audit-data`
para ver el avance.
