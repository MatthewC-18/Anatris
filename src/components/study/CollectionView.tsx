// src/components/study/CollectionView.tsx
//
// "Mi colección": lo que el usuario ha guardado, con una nota editable por
// elemento. Es la mitad de la retencion que le faltaba a la aplicacion: un sitio
// donde se acumula el trabajo PROPIO del usuario, no una cosa mas que leer.
//
// ERA UNA PILA DE TARJETAS, cada una con su borde redondeado y, dentro, otra
// caja para la nota: tarjeta dentro de tarjeta. En LAMINA es una LISTA partida
// por filos, y la nota es lo que el sistema llama una nota: texto con una regla
// a la izquierda, que se vuelve del color de la marca al escribir.
//
// LO QUE SE VE. Primero lo guardado en la region abierta, que es lo que casa
// con el resto del modo Repasar. Debajo, lo guardado en las DEMAS regiones:
// antes solo se daba su numero ("Y 3 elementos en otras regiones") y para leer
// una nota habia que adivinar en que region estaba e ir a buscarla. El nombre
// se guardo junto al elemento (ver lib/collection.ts), asi que se puede listar
// sin tener cargado el contenido de esa region.
//
// LA NOTA SE GUARDA AL SALIR DEL CAMPO, no en cada tecla: cada escritura toca
// localStorage y sube `updatedAt`, que la sincronizacion de la cuenta recoge y
// envia. Tecla a tecla, una frase serian cuarenta envios. Tambien se guarda al
// desmontar la fila: quitar del DOM un campo enfocado no dispara `blur`, y
// volver Atras con el navegador a media nota la perdia.

import { useEffect, useRef, useState } from 'react';
import { useCollection } from '../../hooks/useCollection';
import type { CollectionItem, CollectionKind } from '../../lib/collection';
import { REGIONS } from '../../data/regiones';
import { useAnatomyStore } from '../../store/anatomyStore';
import { formatRoute } from '../../lib/routing';
import { goToTestInLab } from '../../lib/caseEvidence';

const KIND_LABEL: Record<CollectionKind, string> = {
  muscle: 'Músculo',
  test: 'Test',
  movement: 'Movimiento',
  case: 'Caso',
};

/**
 * Cambia de modo (y de region, si hace falta) por el mismo canal que el boton
 * Atras del navegador: `App` escucha `popstate` y sincroniza region y modo. Es
 * el camino que ya usa lib/caseEvidence para abrir una prueba desde un caso.
 */
function goTo(region: string, mode: 'explore' | 'movement'): void {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', formatRoute({ region, mode }));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Abre el elemento guardado alli donde vive. Devuelve null para los tipos que
 * todavia no tienen a donde ir, y entonces la fila no ensena el boton.
 */
function openerFor(item: CollectionItem): { label: string; open: () => void } | null {
  if (item.kind === 'muscle') {
    return {
      label: 'Ver en el atlas',
      open: () => {
        // Primero la seleccion y despues el modo: el atlas se monta ya con el
        // musculo elegido y abre su ficha.
        useAnatomyStore.getState().selectMuscle(item.id);
        goTo(item.region, 'explore');
      },
    };
  }
  if (item.kind === 'test') {
    return { label: 'Abrir el test', open: () => goToTestInLab(item.region, item.id) };
  }
  return null;
}

export function CollectionView({ region }: { region: string }) {
  const { items, remove, save, setNote } = useCollection(region);
  const all = useCollection();
  const elsewhere = all.items.filter((i) => i.region !== region);
  const regionName = REGIONS[region]?.name ?? 'esta región';

  // EL ULTIMO QUITADO, PARA DESHACERLO. La equis borra tambien la nota, y un
  // toque de mas sobre una fila se llevaba un parrafo escrito a mano sin
  // preguntar. La lapida conserva la nota (lib/collection.ts), asi que
  // deshacer la devuelve entera.
  const [removed, setRemoved] = useState<CollectionItem | null>(null);
  const handleRemove = (item: CollectionItem) => {
    remove(item.key);
    setRemoved(item);
  };
  const undo = () => {
    if (!removed) return;
    save({ kind: removed.kind, region: removed.region, id: removed.id, label: removed.label });
    setRemoved(null);
  };

  const undoLine = removed && (
    <p className="note mb-5 flex flex-wrap items-center gap-x-3 gap-y-1" role="status">
      <span>
        Quitaste <span className="text-fg">{removed.label}</span> de tu colección.
      </span>
      <button type="button" onClick={undo} className="btn btn-quiet btn-sm text-brand">
        Deshacer
      </button>
    </p>
  );

  if (all.count === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        {undoLine}
        <p className="kicker">Mi colección</p>
        <p className="mt-2 font-display text-xl font-semibold text-fg">
          Aún no has guardado nada
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-fg2">
          Aquí se junta lo que guardas mientras trabajas, con tus notas. Se guarda
          en este dispositivo y, si inicias sesión, te sigue a los demás.
        </p>
        <HowToSave region={region} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      {undoLine}

      <section>
        <div className="sec-head">
          <h2 className="kicker">En {regionName}</h2>
          <span className="sec-rule" />
          <span className="num text-[11px] text-fg3">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <>
            <p className="max-w-md text-sm leading-relaxed text-fg2">
              No tienes nada guardado en esta región.
            </p>
            <HowToSave region={region} />
          </>
        ) : (
          <ul>
            {items.map((item) => (
              <CollectionRow
                key={item.key}
                item={item}
                onRemove={() => handleRemove(item)}
                onNote={(note) => setNote(item.key, note)}
              />
            ))}
          </ul>
        )}
      </section>

      {elsewhere.length > 0 && (
        <section className="mt-8">
          <div className="sec-head">
            <h2 className="kicker">En otras regiones</h2>
            <span className="sec-rule" />
            <span className="num text-[11px] text-fg3">{elsewhere.length}</span>
          </div>
          <ul>
            {elsewhere.map((item) => (
              <CollectionRow
                key={item.key}
                item={item}
                showRegion
                onRemove={() => handleRemove(item)}
                onNote={(note) => setNote(item.key, note)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Como se llena la coleccion, con la salida puesta. El estado vacio decia
 * "pulsa el marcador junto a un músculo o a un test" sin decir DONDE estan ese
 * musculo y ese test, y sin un solo boton: un callejon. El marcador vive en la
 * ficha del musculo (modo Explorar) y en cada test del laboratorio (modo
 * Movimiento, pestana Tests).
 */
function HowToSave({ region }: { region: string }) {
  return (
    <div className="mt-6">
      <div className="sec-head">
        <span className="kicker">Cómo se guarda</span>
        <span className="sec-rule" />
      </div>
      <ol className="flex max-w-md flex-col gap-2 text-sm leading-relaxed text-fg2">
        <li className="flex gap-3">
          <span className="num shrink-0 text-xs leading-6 text-fg3">1</span>
          <span>
            En <span className="text-fg">Explorar</span>, elige un músculo y pulsa el
            marcador que hay junto a su nombre.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="num shrink-0 text-xs leading-6 text-fg3">2</span>
          <span>
            En <span className="text-fg">Movimiento</span>, abre la pestaña Tests y
            pulsa el marcador del test que quieras tener a mano.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="num shrink-0 text-xs leading-6 text-fg3">3</span>
          <span>Vuelve aquí para escribirle una nota.</span>
        </li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => goTo(region, 'explore')} className="btn btn-line">
          Ir a Explorar
        </button>
        <button type="button" onClick={() => goTo(region, 'movement')} className="btn btn-quiet">
          Ir a Movimiento
        </button>
      </div>
    </div>
  );
}

function CollectionRow({
  item,
  showRegion = false,
  onRemove,
  onNote,
}: {
  item: CollectionItem;
  /** En la lista de "otras regiones", la region va junto al tipo. */
  showRegion?: boolean;
  onRemove: () => void;
  onNote: (note: string) => void;
}) {
  const [draft, setDraft] = useState(item.note);
  const lastSaved = useRef(item.note);
  const opener = openerFor(item);

  // Adopt an externally changed note (another device's sync, another tab)
  // WITHOUT clobbering what the user is typing right now.
  useEffect(() => {
    if (item.note !== lastSaved.current && draft === lastSaved.current) {
      setDraft(item.note);
      lastSaved.current = item.note;
    }
  }, [item.note, draft]);

  function commit() {
    if (draft === lastSaved.current) return;
    lastSaved.current = draft;
    onNote(draft);
  }

  // Guardar tambien al desmontar (ver la cabecera). Las refs evitan que el
  // efecto de limpieza se registre de nuevo en cada tecla.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const onNoteRef = useRef(onNote);
  onNoteRef.current = onNote;
  useEffect(
    () => () => {
      if (draftRef.current !== lastSaved.current) onNoteRef.current(draftRef.current);
    },
    [],
  );

  return (
    <li className="border-b border-line/75 py-4 first:pt-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tag">
            {KIND_LABEL[item.kind]}
            {showRegion && ` · ${REGIONS[item.region]?.name ?? item.region}`}
          </p>
          <p className="mt-1 font-display text-[15px] font-semibold leading-snug text-fg">
            {item.label}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {opener && (
            <button type="button" onClick={opener.open} className="btn btn-quiet btn-sm">
              {opener.label}
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar ${item.label} de mi colección`}
            title="Quitar de mi colección"
            className="btn btn-quiet btn-icon btn-sm"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* 16 px en el telefono a proposito: por debajo de eso iOS amplia la
          pagina al enfocar un campo y hay que deshacer el zoom a mano. */}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        rows={draft ? 3 : 1}
        placeholder="Tu nota…"
        aria-label={`Nota sobre ${item.label}`}
        className="mt-3 block w-full resize-y border-0 border-l-2 border-line bg-transparent py-0.5 pl-3 pr-0 text-base leading-relaxed text-fg2 placeholder:text-fg3 focus:border-brand focus:text-fg focus:outline-none focus:ring-0 sm:text-sm"
      />
    </li>
  );
}
