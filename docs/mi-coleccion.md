# S7 — "Mi colección": el lugar donde el usuario deja su trabajo

Sesión del **2026-08-07**. Primera mitad de S7 del [plan maestro](plan-maestro-2026.md).

Hasta ahora la app no tenía **ningún sitio donde el usuario dejara rastro de su
propio trabajo**. Un profesional que no puede guardar nada consulta la
herramienta y se va: en un producto de referencia la retención viene del
contenido que el usuario **crea dentro**, no de cuánto contenido lee.

Y de paso resuelve un problema de negocio: era el primer motivo honesto para
crear una cuenta que **no tiene nada que ver con pagar**.

---

## 1. Qué hace

- **Guardar** un músculo o un test con un marcador, desde donde ya estás
  mirándolo (la ficha clínica y la fila del test ortopédico).
- **Una nota libre** por elemento.
- **Pestaña "Mi colección"** en *Estudiar*, con contador en vivo.
- **Se sincroniza entre dispositivos** si inicias sesión. Sin sesión, funciona
  igual en local.

Guardar **no exige cuenta**. Pedir registro antes de que alguien tenga un motivo
para que le importe es la forma más rápida de perderlo; dejar que construya
primero una colección es cómo se gana la cuenta.

---

## 2. Cómo está construido (y por qué así)

| Archivo | Papel |
|---|---|
| `src/lib/collection.ts` | Store puro: guardar, nota, borrar, listar, **merge** |
| `src/hooks/useCollection.ts` | Suscripción de módulo: todos los paneles se enteran del cambio |
| `src/components/SaveButton.tsx` | El marcador, idéntico en todas partes |
| `src/components/study/CollectionView.tsx` | La pestaña, con las notas editables |

### Sincronización gratis

La colección **viaja dentro del `StudySnapshot` que ya existía**
(`studyState.ts`), así que hereda toda la maquinaria de cuenta —pull, merge
monótono, push con debounce— **sin tabla nueva, sin endpoint nuevo y sin un modo
de fallo nuevo**. El campo es opcional, así que un snapshot escrito antes de que
la función existiera se fusiona sin borrar nada.

### Las bajas son lápidas, no ausencias

Es la decisión que evita el bug clásico de sincronización distribuida:

> El dispositivo A borra un elemento. El dispositivo B todavía lo tiene. El merge
> es una unión → **el elemento resucita.**

Por eso borrar escribe un `deletedAt` en vez de quitar la clave: así una baja es
una escritura como cualquier otra y se resuelve por recencia, igual que una
edición. Las lápidas se podan a los 90 días (solo en el merge, nunca en una
escritura local), para que el payload no crezca sin fin.

Hay **17 tests** sobre esta lógica, concentrados en el merge porque es donde se
pierde el trabajo de alguien, y el fallo es asimétrico: guardar de más molesta,
perder una nota escrita a mano no se recupera.

### Suscripción de módulo, no estado local

El marcador aparece en la ficha del músculo, en la fila del test y en el
contador de la pestaña. Con `useState` por componente, guardar desde un sitio
dejaría a los otros mostrando un icono mentiroso. `useCollection` es el mismo
patrón un-escritor/muchos-lectores que ya usa el laboratorio (`rigChannel`,
`layerChannel`), más el evento `storage` para que otra pestaña no quede
desincronizada.

### La etiqueta se guarda al guardar

`label` se denormaliza a propósito. El contenido de una región premium no se
carga hasta abrir esa región ([[entitlement-servidor]]), así que resolver el
nombre en el momento de pintar dejaría una colección llena de huecos.

---

## 3. Verificado en navegador

No solo compila:

1. Guardados 2 tests desde el panel del hombro → aparecen en `localStorage`, el
   marcador pasa a `aria-pressed="true"`.
2. La pestaña muestra **"Mi colección · 2"**; el contador se actualiza en vivo
   sin recargar.
3. Nota escrita y recargada la página → **persiste**.
4. Quitado un elemento → contador 2 → 1, y en almacenamiento queda
   `deleted: true`, no desaparecido: **la lápida funciona**.
5. Consola sin errores.

`npm test`: **150 tests** (antes 138). Typecheck limpio. Coste en la entrada:
**+0,6 KB gzip** (114,8 → 115,4).

---

## 4. Lo que NO se hizo, y por qué

**El bucle de vuelta con notificaciones push está pendiente**, deliberadamente.

Es la otra mitad de S7 y sigue siendo buena idea, pero requiere: claves VAPID,
una tabla de suscripciones, una edge function que envíe, un cron que la dispare,
y —lo importante— **cambiar el service worker** de `generateSW` a
`injectManifest` para poder añadir el handler `push`.

Ese último punto es el que aconseja no hacerlo ahora: el service worker es lo
más arriesgado que se puede tocar en una PWA. Un fallo ahí no da un error
visible, deja **contenido viejo cacheado** en los navegadores de los usuarios y
cuesta días en salir. A tres semanas de la fecha de los eAwards, con la demo
dependiendo de que la app cargue bien, no es el momento.

Además, dos límites reales que conviene saber antes de invertir en ello:

- En iOS, las notificaciones web **solo funcionan si la PWA está instalada** en
  la pantalla de inicio (iOS 16.4+). Buena parte del público no la tendrá.
- El permiso de notificaciones se pide una sola vez: si se pregunta en mal
  momento y el usuario dice que no, **no hay segunda oportunidad** en ese
  navegador.

**Recomendación:** hacerlo después del 1 de septiembre, y decidir el momento del
permiso con los datos de PostHog en la mano (por ejemplo, solo a quien ya ha
completado dos sesiones de repaso — a esa persona el recordatorio le sirve).

---

## 5. Siguiente paso natural

- Guardar también **movimientos** y **casos** (el tipo ya lo contempla:
  `CollectionKind` incluye `movement` y `case`); solo falta poner el `SaveButton`
  en esos dos sitios.
- Que pulsar un elemento de la colección **navegue** a su región y modo.
- Exportar la colección (las notas de un estudiante son justo lo que querría
  llevarse a un examen).
