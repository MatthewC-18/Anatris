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
- Último commit: `c2db43f` (11 nov 2026). En marcha: workflow LÁMINA tanda 2a (`lab-tests-neuro`, `aprender`).
- Hecho: poda del GLB, encuadre por región (+ guardián que solo sigue lo que se mueve, coronilla cervical), cara y nuca, pantalla de carga por fases, sistema LÁMINA (49 ficheros a cero fijados en el test), lectura del gesto sobre el escenario (ángulo, regla del arco, etiquetas vivas), **demos de tests** (`demoTimeline.ts`: base primero; `audit-demo-path` sobre 65 demos; codo doble y press abdominal a 5°), **Neuro como carta de dermatomas** (piel sólida, raíces pintadas y rotuladas, encuadre frontal, lectura propia; regla: nunca cristal sobre el vacío), **margen izquierdo** (qué se estudia / por qué / cuánto; `RhythmReadout stageReads`), **ojos** (`rigEyes.ts`: elipsoide ajustado al borde MEDIDO de los párpados, hueco 0,5 mm; cuelga de `vert_C1`; se apaga con solo hueso).
- Siguiente, en este orden:
  1. Revisar y confirmar la tanda 2a; luego 2b (`explorar-herramientas`, `lab-diseccion-compacto`) y 2c (landing/Pricing/Paywall del área `armazon-sitio`).
  2. Mirar en pantalla Schepelmann (3,9%) y rotación torácica sentada (1,4%): probable falso positivo del banco (tronco medido en reposo).
  3. Piel de la cabeza abierta (medido con el rig, aristas sin vecino): coronilla entre `Parietal_region` y `_3` (2 a 7 mm, se ve en el laboratorio cervical), punta de la nariz (1,1 mm) y filtrum (2,5 mm) en la línea media. Idea: soldar en x=0 los pares espejo sin nada entre ellos (así no se cierran las narinas). Después, la oreja fragmentada.
  4. **Vídeo de carga** (`Downloads/gemini_generated_video_3e6e86f0.mp4`): ya evaluado. A favor: sigue reproduciéndose con el hilo bloqueado (3,07 s de vídeo en 3,07 s bloqueados); recodificado 960 px sin audio = 0,75 MB (era 7,3). En contra: estética HUD azul con partículas y paneles de datos falsos (lo que el producto quitó), costillas pintadas por encima del pectoral y la pared abdominal, trae audio, y no es el cuerpo del modelo. Recomendación: no sustituir la carga; si se usa, de fondo bajo la línea de fases o en la landing. Decide el usuario.
