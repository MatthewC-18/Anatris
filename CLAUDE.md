# Anatris

App web en español de anatomía clínica y biomecánica 3D para fisioterapeutas
(React 18 + three.js/R3F + Tailwind + Supabase + Stripe). Se va a vender.
Memoria detallada: `~/.claude/projects/C--Users-Matthew-Documents-Fisio/memory/MEMORY.md`.

## Comandos
- `npx tsc -b --pretty false` → typecheck. **Nunca** `tsc --noEmit -p tsconfig.json`: pasa en verde sobre código roto.
- `npm test` (vitest, ~650 tests) · `npm run build` (~45 s, el chequeo completo).
- Bancos: `audit-glow` `audit-direction` `audit-angles` `audit-laterality` `audit-structures` `audit-data` `audit-cases` `audit-skin-weight-bake` `audit-surfaces` `audit-rig-strip` `rig-find`.
- Dev: preview `dev` (puerto 5190). Desbloqueo total en local: `?acceso=fisio-acceso-total`.
- Banco de la pantalla de carga: `/loader-harness.html?auto=1&bloqueo=1`.

## Reglas de la casa (no negociables)
1. **Se mide, no se supone.** Cada arreglo lleva su medida (script, banco o navegador). Scripts temporales en el scratchpad, nunca en el repo.
2. **Sin cifra defendible no se inventa una métrica.** Si falta: "s/d" o se explica.
3. **Comentarios en español que cuentan el PORQUÉ y citan la medida.** Nada de guiones largos en texto que ve el usuario.
4. **Dos modelos 3D, no se mezclan:** Explorar = `public/modelo-opt.dec.glb` (índice `public/anatomy-index.json`); laboratorio = `public/cuerpo-rig.opt.glb` (`RIG_URL` en `src/lib/modelWarm.ts`, subir `?v=` al cambiarlo).
5. **Lado:** en el rig el nodo `_R` está en +x = IZQUIERDA anatómica. Único traductor: `boneMap.rigSideFor`.
6. **Contenido de pago fuera del bundle:** `supabase/functions/content/payloads/*.json`, regenerar con `npm run build-premium-content` y desplegar `content` (pendiente de hacer).
7. **Diseño LÁMINA** (`docs/sistema-lamina.md`): escenario + dos márgenes acoplados, **sin cajas dentro de un margen**. `npm run audit-surfaces`; `src/lib/__tests__/laminaSurfaces.test.ts` fija en cero los ficheros convertidos.
8. Commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No empujar sin que lo pida el usuario.
9. Nunca leer `.env` ni `secrets/**`.

## Trampas medidas
- El hilo principal se bloquea ~10 s al montar el rig: lo que se anime en la carga solo puede ser `transform`/`opacity` (ver `RigLoadingScreen.tsx`).
- Normales del GLB en Int8: `computeVertexNormals()` sin borrar el atributo deja la malla negra.
- HMR del servidor de desarrollo invalida las comprobaciones en el navegador mientras otros agentes editan: verificar con el árbol quieto.
- Dos pestañas WebGL a la vez tumban el contexto (`Context Lost`).

## ESTADO (actualizar en cada commit)
- Último commit: ver `git log -1` (12 nov 2026). En marcha: REDISEÑO DEL MARGEN IZQUIERDO del laboratorio (el usuario lo ve "aglomerado y feo"): workflow de diseño con tres maquetas (`historia`, `instrumento`, `editorial`) y una síntesis en el scratchpad (`margen/propuesta-*.html`); mirarlas en pantalla, elegir e implementar.
- Hecho: poda del GLB, encuadre por región (+ guardián que solo sigue lo que se mueve, coronilla cervical), cara y nuca, pantalla de carga por fases, sistema LÁMINA (49 ficheros a cero fijados en el test), lectura del gesto sobre el escenario (ángulo, regla del arco, etiquetas vivas), **demos de tests** (`demoTimeline.ts`: base primero; `audit-demo-path` sobre 65 demos; codo doble y press abdominal a 5°), **Neuro como carta de dermatomas** (piel sólida, raíces pintadas y rotuladas, encuadre frontal, lectura propia; regla: nunca cristal sobre el vacío), **margen izquierdo** (qué se estudia / por qué / cuánto; `RhythmReadout stageReads`), **ojos** (`rigEyes.ts`: elipsoide ajustado al borde MEDIDO de los párpados, hueco 0,5 mm; cuelga de `vert_C1`; se apaga con solo hueso), **piel de la cabeza** (`rigSkinMidline.ts` cierra coronilla, nariz y labio por la línea media, 24 vértices; la cabeza siempre sólida lleva su material con `depthWrite`, que quitaba la muesca negra del cervical; `agreeTriangleWinding` en la piel: la oreja ya no sale a manchas), **triángulos negros** (tabla `rigWindingBake` para músculo/hueso, 4.661 en 615 mallas, `npm run build-winding-bake` / `audit-winding-bake`; la fascia hundida se pone de acuerdo sola: 0 de 874.304 visibles al revés), **Tests y Neuro en LÁMINA** (demo de miotoma legible aunque su gesto no esté cargado: margen, escenario y etiqueta en español; revisión adversarial: 3 defectos reales arreglados), **Aprender en LÁMINA** (ruta de 7 pasos, Fundamentos, casos, evidencia; puente de tests al laboratorio; 65 ficheros fijados a cero cajas), **vídeo de carga en toda la app** (`LoaderVideo`: laboratorio, Explorar y esperas del escenario; decisión del usuario; dos ciclos sin costura, 1,24 MB sin audio; MEDIDO: 10,1 s de vídeo en 10,1 s de hilo bloqueado; `stretchForBlock` lo ralentiza si el bloqueo previsto no cabe; reloj común entre esperas encadenadas; el build lo publica por lista blanca con techo).
- Siguiente, en este orden:
  1. Rediseño del margen izquierdo (ver "En marcha"). Después, tandas LÁMINA 2b (`explorar-herramientas`, `lab-diseccion-compacto`) y 2c (landing/Pricing/Paywall del área `armazon-sitio`).
  2. Pedidos del agente de Aprender: `evidence.ts` (libros de `trackForRegion`; fuera de "estudios" lo que no es revista), `CitationRow` de SelectionPanel pulsable en táctil, enlaces profundos `?pestana=casos` (StudyView) y `?movimiento=` (MovementView), datos: `'gray'` → `'descriptive'`, unificar nombres e ids de pruebas entre la ruta y el laboratorio, guías de palpación de 5 regiones (contenido: no se inventa). Y una pasada de tildes en los datos (salieron "lata vacia", "una guia"): el primer escáner (Python) cayó por la regex de cadenas y no se llegó a medir; rehacerlo leyendo solo literales con espacios de `src/data`.
  3. Mirar en pantalla Schepelmann (3,9%) y rotación torácica sentada (1,4%): probable falso positivo del banco (tronco medido en reposo).
  3b. PEDIDO DEL USUARIO (12 nov), para después: en los tests, comprobar que TODOS los ligamentos, huesos y músculos están bien ubicados y presentes. Ha visto huecos en rodilla y cadera (zona glútea, rodilla) y sospecha lo mismo en las demás regiones: banco por región y por demo (presencia de cada estructura esperada + posición contra su hueso), no a ojo.
  4. Estructura evaluada INVISIBLE en los demos: RigOverlays la fuerza visible pero con profundidad normal, y la bolsa subacromial de Neer queda bajo el deltoides aunque el margen diga "Resaltado". Medir en los 65 demos qué fracción de cada estructura se ve desde la cámara del demo (rayos contra las mallas visibles) y, si hace falta, una pasada de rayos X (copia con `depthTest: false`, translúcida). `closeSkinMidline` mide 58 ms en dev con la máquina cargada: volver a medir en reposo.
