// src/components/LegalScreen.tsx
//
// Legal hub: the customer-facing policies a paid product needs once it collects
// email (PII) + payments + analytics. Four tabs:
//   - Terminos     : terms of service
//   - Privacidad   : privacy policy (Supabase / Stripe / PostHog as processors)
//   - Reembolsos   : cancellation + refund policy
//   - Aviso medico : the existing educational disclaimer (reused)
//
// Two exports:
//   - <LegalScreen defaultTab /> : the tabbed content (used inside App's overlay).
//   - <LegalModal open defaultTab onClose /> : a self-contained modal (used on the
//     marketing landing + the auth modal, which have no access to App's overlay).
//
// NOTE (legal): this is reasonable, plain-language TEMPLATE copy, NOT legal
// advice. Before charging real money at scale, have a lawyer review the wording,
// the governing law, and whether an explicit clickwrap acceptance is required in
// your jurisdiction. Update CONTACT and GOVERNING_LAW below with your real data.
//
// UI strings Spanish (LATAM). No `any`. English comments.

import { useState } from 'react';
import { MedicalDisclaimerScreen } from './MedicalDisclaimer';

// TODO: reemplaza por tu correo de soporte y tu jurisdiccion reales.
const CONTACT = 'soporte@anatris.app';
const GOVERNING_LAW = 'las leyes de tu pais de residencia';
const LAST_UPDATED = '27 de julio de 2026';

export type LegalTab = 'terminos' | 'privacidad' | 'reembolsos' | 'aviso';

const TABS: { id: LegalTab; label: string }[] = [
  { id: 'terminos', label: 'Términos' },
  { id: 'privacidad', label: 'Privacidad' },
  { id: 'reembolsos', label: 'Reembolsos' },
  { id: 'aviso', label: 'Aviso médico' },
];

/** Tabbed legal content. Rendered inside a modal/overlay shell by the caller. */
export function LegalScreen({
  defaultTab = 'terminos',
}: {
  defaultTab?: LegalTab;
}) {
  const [tab, setTab] = useState<LegalTab>(defaultTab);

  return (
    <div className="flex min-h-0 flex-col">
      {/* Tab strip */}
      <div className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-line bg-card/95 px-4 py-2 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-brand-wash text-brand'
                : 'text-fg2 hover:text-fg'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {tab === 'terminos' && <TermsSection />}
        {tab === 'privacidad' && <PrivacySection />}
        {tab === 'reembolsos' && <RefundSection />}
        {tab === 'aviso' && <MedicalDisclaimerScreen />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Reusable text primitives
 * ------------------------------------------------------------------------ */
function Doc({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-fg">{title}</h1>
        <p className="mt-1 text-xs text-fg3">
          Última actualización: {LAST_UPDATED}
        </p>
      </header>
      <div className="flex flex-col gap-5 text-sm leading-relaxed text-fg2">
        {children}
      </div>
    </div>
  );
}

function Block({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-fg">{heading}</h2>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fg2">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------------------
 * Terms of service
 * ------------------------------------------------------------------------ */
function TermsSection() {
  return (
    <Doc title="Términos y condiciones">
      <p>
        Estos términos regulan el uso de Anatris (la “aplicación”), una herramienta
        educativa de estudio de anatomía y biomecánica para estudiantes y
        profesionales de la fisioterapia. Al usar la aplicación aceptas estos
        términos; si no estás de acuerdo, no la utilices.
      </p>

      <Block heading="1. Cuenta">
        <Bullets
          items={[
            'Para acceder a las funciones de cuenta debes registrarte con un correo válido.',
            'Eres responsable de mantener la confidencialidad de tus credenciales y de la actividad de tu cuenta.',
            'Debes tener la edad mínima legal en tu país para contratar; si eres menor, necesitas el consentimiento de un tutor.',
          ]}
        />
      </Block>

      <Block heading="2. Uso permitido">
        <Bullets
          items={[
            'La licencia es personal, intransferible y para fines educativos.',
            'No puedes revender, redistribuir, copiar masivamente ni hacer ingeniería inversa del contenido o del software.',
            'La aplicación no debe usarse para diagnosticar ni tratar pacientes reales (ver Aviso médico).',
          ]}
        />
      </Block>

      <Block heading="3. Suscripción y pagos">
        <Bullets
          items={[
            'Las funciones Premium requieren una suscripción de pago (mensual o anual).',
            'Los pagos se procesan de forma segura a través de Stripe; Anatris no almacena los datos de tu tarjeta.',
            'La suscripción se renueva automáticamente al final de cada periodo hasta que la canceles.',
            'Los precios pueden cambiar; te avisaremos con antelación razonable y el cambio no afecta el periodo ya pagado.',
          ]}
        />
      </Block>

      <Block heading="4. Cancelación">
        <p>
          Puedes cancelar cuando quieras desde “Gestionar suscripción” (portal de
          Stripe) dentro de la aplicación. Conservas el acceso Premium hasta el
          final del periodo ya pagado. Consulta la pestaña Reembolsos para más
          detalles.
        </p>
      </Block>

      <Block heading="5. Propiedad intelectual">
        <p>
          El contenido clínico, el software y los modelos 3D están protegidos y se
          ofrecen bajo licencia de uso, no de propiedad. Las atribuciones de
          terceros se listan en la sección “Créditos y licencias”.
        </p>
      </Block>

      <Block heading="6. Garantías y responsabilidad">
        <p>
          La aplicación se ofrece “tal cual”, con fines educativos. En la medida que
          permita la ley, no ofrecemos garantías sobre la exactitud del contenido ni
          asumimos responsabilidad por decisiones tomadas a partir de él. El uso es
          responsabilidad de la persona usuaria.
        </p>
      </Block>

      <Block heading="7. Cambios y ley aplicable">
        <p>
          Podemos actualizar estos términos; los cambios relevantes se anunciarán en
          la aplicación. Estos términos se rigen por {GOVERNING_LAW}. Para cualquier
          consulta, escríbenos a{' '}
          <a className="text-brand hover:underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>
          .
        </p>
      </Block>
    </Doc>
  );
}

/* ---------------------------------------------------------------------------
 * Privacy policy
 * ------------------------------------------------------------------------ */
function PrivacySection() {
  return (
    <Doc title="Política de privacidad">
      <p>
        Respetamos tu privacidad y recogemos el mínimo de datos necesario para
        prestar el servicio. Esta política explica qué datos tratamos, con qué fin
        y con quién.
      </p>

      <Block heading="1. Datos que tratamos">
        <Bullets
          items={[
            'Cuenta: tu correo electrónico y el estado de tu suscripción.',
            'Pagos: gestionados por Stripe. No almacenamos números de tarjeta; Stripe nos comparte un identificador de cliente y el estado del pago.',
            'Progreso de estudio: tu avance, rachas y resultados, para sincronizarlos entre tus dispositivos.',
            'Uso: eventos anónimos de navegación (analítica), solo si la analítica está habilitada.',
          ]}
        />
      </Block>

      <Block heading="2. Para qué los usamos">
        <Bullets
          items={[
            'Autenticarte y darte acceso a tu cuenta y tu contenido.',
            'Procesar la suscripción y la facturación.',
            'Sincronizar y conservar tu progreso.',
            'Entender el uso agregado para mejorar el producto.',
          ]}
        />
      </Block>

      <Block heading="3. Proveedores (encargados del tratamiento)">
        <p>Compartimos datos con proveedores que nos ayudan a operar:</p>
        <Bullets
          items={[
            'Supabase — autenticación y base de datos (cuenta y progreso).',
            'Stripe — procesamiento de pagos y suscripciones.',
            'PostHog — analítica de producto (si está habilitada).',
          ]}
        />
        <p className="text-fg2">
          Cada proveedor trata los datos según su propia política de privacidad. No
          vendemos tus datos personales.
        </p>
      </Block>

      <Block heading="4. Almacenamiento local">
        <p>
          Usamos el almacenamiento local del navegador para recordar preferencias
          (por ejemplo, que aceptaste el aviso o completaste el tutorial). No son
          cookies publicitarias.
        </p>
      </Block>

      <Block heading="5. Conservación y tus derechos">
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Puedes solicitar
          acceso, rectificación o eliminación de tus datos escribiéndonos a{' '}
          <a className="text-brand hover:underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>
          . Atenderemos tu solicitud según la normativa aplicable.
        </p>
      </Block>

      <Block heading="6. Menores">
        <p>
          La aplicación no está dirigida a menores de la edad mínima legal de tu
          país sin el consentimiento de un tutor.
        </p>
      </Block>

      <Block heading="7. Cambios">
        <p>
          Podemos actualizar esta política; anunciaremos los cambios relevantes en
          la aplicación. Ante cualquier duda, contáctanos en{' '}
          <a className="text-brand hover:underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>
          .
        </p>
      </Block>
    </Doc>
  );
}

/* ---------------------------------------------------------------------------
 * Refund / cancellation policy
 * ------------------------------------------------------------------------ */
function RefundSection() {
  return (
    <Doc title="Cancelación y reembolsos">
      <Block heading="Cómo cancelar">
        <p>
          Puedes cancelar tu suscripción en cualquier momento desde “Gestionar
          suscripción” en el menú de tu cuenta, que abre el portal seguro de Stripe.
          La cancelación detiene los cargos futuros; conservas el acceso Premium
          hasta el final del periodo que ya pagaste.
        </p>
      </Block>

      <Block heading="Reembolsos">
        <p>
          Queremos que estés conforme. Si algo salió mal —un cargo duplicado, un
          problema de acceso, o un cobro que no reconoces— escríbenos y lo
          resolvemos, incluido el reembolso cuando corresponda.
        </p>
        <p>
          Para suscripciones anuales, si nos contactas dentro de los 14 días
          siguientes al cobro y apenas has usado el servicio, podemos emitir un
          reembolso. Pasado ese plazo o para renovaciones, la cancelación evita
          cargos futuros pero el periodo en curso no suele ser reembolsable, salvo
          que la ley de tu país disponga lo contrario.
        </p>
      </Block>

      <Block heading="Contacto">
        <p>
          Para cualquier tema de facturación, escríbenos a{' '}
          <a className="text-brand hover:underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>{' '}
          e incluye el correo de tu cuenta.
        </p>
      </Block>
    </Doc>
  );
}

/* ---------------------------------------------------------------------------
 * Self-contained modal (for surfaces without App's overlay shell)
 * ------------------------------------------------------------------------ */
export function LegalModal({
  open,
  defaultTab = 'terminos',
  onClose,
}: {
  open: boolean;
  defaultTab?: LegalTab;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3">
          <span className="font-display text-sm font-semibold text-fg">Legal</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-fg3 transition-colors hover:text-fg"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <LegalScreen defaultTab={defaultTab} />
        </div>
      </div>
    </div>
  );
}
