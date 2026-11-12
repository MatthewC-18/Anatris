// src/components/study/FlipCard.tsx
//
// LA TARJETA DE REPASO: el unico recuadro del modo Repasar.
//
// Aqui el recuadro ES el objeto (una tarjeta que se voltea), que es el caso que
// el sistema LAMINA deja pasar (docs/sistema-lamina.md, "cuando una caja esta
// justificada"). A cambio es UNA y limpia: un filo de 1 px, sin sombra, sin
// degradado y sin nada enmarcado dentro. La comparten el repaso espaciado
// (ReviewView) y el mazo libre (FlashcardsView), que antes llevaban cada uno su
// copia del mismo boton redondeado.
//
// DOS COSAS QUE CAMBIAN CON LA COPIA UNICA:
//
// 1. LA RESPUESTA SE ANADE, NO SUSTITUYE. Al voltear, la cara de delante
//    desaparecia entera y quedaba solo "ORIGEN: fosa supraespinosa...": se
//    calificaba el recuerdo de un musculo cuyo nombre ya no estaba en pantalla.
//    Ahora la pregunta se queda arriba y la respuesta aparece debajo, tras un
//    filo, como el reverso de una tarjeta de Anki.
//
// 2. LA PREGUNTA NO ES UNA PASTILLA. "¿Cuál es su origen?" iba en una capsula
//    con borde y fondo de acento, que es la firma de una etiqueta, no de la
//    frase mas importante de la tarjeta. Ahora es texto, en el acento.
//
// La tarjeta entera responde al clic (es un blanco de 256 px de alto para el
// pulgar), pero NO es el control: el boton "Mostrar respuesta" que cada vista
// pone debajo es el que recibe el foco y el teclado. Por eso el `div` no lleva
// `role="button"`: dentro hay una lista de definiciones, y un boton aplana su
// contenido para los lectores de pantalla.

import type { FlashcardFact } from '../../lib/studyEngine';

interface FlipCardProps {
  /** Rotulo de la esquina: que dato se pregunta ("Origen") o que es ("Músculo"). */
  kicker: string;
  /** Estado de la tarjeta en la agenda ("Nueva", "Repaso"). Opcional. */
  status?: string;
  /** El sujeto, en grande: el nombre del musculo. */
  front: string;
  /** Pista bajo el sujeto (el nombre en latin). */
  sub?: string;
  /** La pregunta concreta. Sin ella la tarjeta pide recordar la ficha entera. */
  prompt?: string;
  /** Lo que hay que recordar. Se ensena al voltear. */
  facts: FlashcardFact[];
  flipped: boolean;
  onFlip: () => void;
}

export function FlipCard({
  kicker,
  status,
  front,
  sub,
  prompt,
  facts,
  flipped,
  onFlip,
}: FlipCardProps) {
  return (
    <div
      onClick={onFlip}
      // caja-ok: la tarjeta de repaso es el objeto que se voltea
      className="flex min-h-[16rem] w-full cursor-pointer flex-col rounded border border-line bg-card px-5 py-4 transition-colors hover:border-fg3/60 sm:px-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="kicker">{kicker}</span>
        {status && <span className="tag">{status}</span>}
      </div>

      <div className="flex flex-1 flex-col justify-center py-5">
        <p className="font-display text-2xl font-semibold leading-tight text-fg">{front}</p>
        {sub && <p className="mt-1 text-sm italic text-fg3">{sub}</p>}
        {prompt && <p className="mt-4 text-[15px] font-medium leading-snug text-brand">{prompt}</p>}
      </div>

      {/* `aria-live`: al voltear, el lector de pantalla lee la respuesta sin que
          haya que ir a buscarla. */}
      <div aria-live="polite">
        {flipped ? (
          <>
            <div className="rule" />
            <dl className="flex flex-col gap-3 pb-1 pt-4">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="kicker">{f.label}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-fg">{f.value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="tag">Respuesta oculta</p>
        )}
      </div>
    </div>
  );
}
