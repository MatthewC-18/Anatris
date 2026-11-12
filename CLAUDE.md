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
- Último commit: `be14d1c` (11 nov 2026).
- Hecho esta sesión: poda del GLB (−14%), encuadre por región, cara y nuca, pantalla de carga por fases, sistema LÁMINA + armazón, lectura del gesto sobre el escenario (ángulo, regla del arco, etiquetas vivas), primera tanda LÁMINA por áreas (sin revisar en pantalla).
- En curso / siguiente, en este orden:
  1. **Regresión:** la lista de raíces de Neuro queda en 47 px en el margen de escritorio; revisar Tests igual (1366×768).
  2. **Demos de tests:** los `components` se mantienen fijos durante todo el barrido → el antebrazo y la mano del examinador atraviesan el tórax (visto en Hawkins-Kennedy). Medir todas las demos (también miotomas) muestreando el recorrido entero y sacar la línea de tiempo a una función pura compartida.
  3. **Neuro como carta de dermatomas** sobre el cuerpo (canales ya listos: `rootCalloutChannel`, `neuroSkinChannel.picked`).
  4. **Margen izquierdo:** quitar lo que ya duplica la lectura del escenario (ángulo, fase) antes de rediseñarlo. Enseñar captura al usuario en cada hito.
  5. Segunda tanda LÁMINA (RomPanel, CaseView, EvidenceScreen, OrthopedicTestsPanel, NeuroPanel, ConceptStage, landing/Pricing/Paywall), de dos en dos.
  6. Al final: valorar `Downloads/gemini_generated_video_3e6e86f0.mp4` como pantalla de carga (ffprobe, marca de agua, errores anatómicos, peso frente al modelo, si sigue con el hilo bloqueado). Decide el usuario.
