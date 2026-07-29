# Backend de Anatris — Supabase + Stripe

Esta carpeta contiene el código **desplegable** que activa la autenticación y la
suscripción reales. **No forma parte del build de la app** (Vite solo compila
`src/`); son funciones Deno + SQL que se despliegan en tu proyecto Supabase.

Mientras no configures esto, la app funciona en **modo demo** con un backend
simulado (mock) en `localStorage`, así que puedes desarrollar y probar todo el
embudo (registro → muro de pago → "suscribirme" → premium) sin cuentas.

> **Prueba end-to-end (tarjeta 4242…) y paso a producción:** ver
> [`GO-LIVE.md`](./GO-LIVE.md).

## Arquitectura

```
Frontend (src/auth)                Supabase                     Stripe
─────────────────────              ──────────────────────       ──────────────
useAuth() / useEntitlement()       Auth (correo+contraseña)
  │                                tabla public.subscriptions
  ├─ signIn/signUp ───────────────▶ Supabase Auth
  ├─ startCheckout(interval,cur) ─▶ fn create-checkout ────────▶ Checkout Session
  │                                                              (redirección)
  │                                 fn stripe-webhook  ◀──────── customer.subscription.*
  │                                   └─ upsert subscriptions
  └─ fetchSubscription ◀──────────── select subscriptions (RLS: dueño)
```

El **webhook es la única fuente de verdad**: el frontend nunca escribe el estado
de la suscripción, solo lo lee (protegido por Row Level Security). Al volver de
Stripe (`/?checkout=success`) la app hace *polling* de la suscripción unos
segundos hasta que el webhook la escribe, y desbloquea premium sin recargar.

---

## Puesta en marcha (haz esto TÚ en las consolas)

> Requisito: [Stripe CLI](https://stripe.com/docs/stripe-cli) opcional, y la
> [Supabase CLI](https://supabase.com/docs/guides/cli): `npm i -g supabase`.

### 1. Crea el proyecto Supabase y conéctalo a la app

1. En <https://supabase.com/dashboard> crea un proyecto. Apunta la contraseña de
   la base de datos.
2. **Project Settings → API**. Copia **Project URL** y la clave **anon public**
   (sirve también la nueva clave `sb_publishable_…`).
3. En la raíz del repo, copia `.env.example` a `.env` y rellena:
   ```
   VITE_SUPABASE_URL=https://TU-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=TU_ANON_O_PUBLISHABLE_KEY
   ```
   Con esto la app deja el mock y usa Supabase automáticamente.

### 2. Crea las tablas (RLS incluido)

En **SQL Editor** pega y ejecuta el contenido de [`schema.sql`](./schema.sql).
Crea `subscriptions` (solo la escribe el webhook; el dueño la lee) y
`study_state` (el dueño lee/escribe su fila). Verifica en **Table Editor** que
ambas tienen el candado *RLS enabled*.

### 3. (Opcional) Auth: registro sin confirmación de correo

Para el lanzamiento más simple, en **Authentication → Sign In / Providers →
Email** desactiva **"Confirm email"**. Así `signUp` inicia sesión al instante y
el embudo sigue directo al checkout. Si lo dejas activado, el usuario debe
confirmar por correo antes de entrar (la app ya muestra ese aviso).

### 4. Stripe: producto y DOS precios (mensual + anual) multi-moneda

En <https://dashboard.stripe.com> con el interruptor en **Test mode**:

1. **Product catalog → Add product** → nombre "Anatris Premium".
2. Añade el **precio MENSUAL** (recurring, Monthly). Moneda base **USD 7.99**.
   Pulsa **"Add another currency"** y añade:
   | Moneda | Importe |
   |--------|---------|
   | USD    | 7.99    |
   | EUR    | 6.99    |
   | MXN    | 149     |
   | COP    | 19.900  |
   Guarda y copia el **`price_…`** → será `STRIPE_PRICE_PREMIUM_MONTHLY`.
3. Añade un segundo precio **ANUAL** (recurring, Yearly) al mismo producto, con
   las mismas 4 monedas:
   | Moneda | Importe   |
   |--------|-----------|
   | USD    | 59        |
   | EUR    | 54        |
   | MXN    | 1.190     |
   | COP    | 159.000   |
   Copia el **`price_…`** → será `STRIPE_PRICE_PREMIUM_ANNUAL`.

> Estos importes deben coincidir con `src/lib/pricing.ts` (lo que muestra la app
> es lo que Stripe cobra). Si cambias precios, cámbialos en los dos sitios.

### 5. Enlaza la CLI y pon los secretos (las claves las pones TÚ)

```bash
supabase login
supabase link --project-ref TU-REF
```

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_TU_CLAVE_SECRETA \
  STRIPE_PRICE_PREMIUM_MONTHLY=price_MENSUAL \
  STRIPE_PRICE_PREMIUM_ANNUAL=price_ANUAL
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase solo; no los
pongas. `STRIPE_WEBHOOK_SECRET` lo añadirás en el paso 7.

### 6. Despliega las tres funciones

```bash
supabase functions deploy create-checkout
supabase functions deploy billing-portal
supabase functions deploy stripe-webhook --no-verify-jwt
```

`stripe-webhook` va con `--no-verify-jwt` porque Stripe la llama **sin** JWT de
Supabase; su seguridad es la **verificación de firma** con `whsec_…`.

### 7. Registra el webhook en Stripe

1. **Developers → Webhooks → Add endpoint**. URL:
   ```
   https://TU-REF.supabase.co/functions/v1/stripe-webhook
   ```
2. Suscríbete a estos eventos:
   ```
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   ```
3. Copia el **Signing secret** (`whsec_…`) y guárdalo como secreto:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_TU_SECRETO
   ```
4. **Vuelve a desplegar el webhook** para que tome el secreto nuevo:
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```

Listo. Sigue [`GO-LIVE.md`](./GO-LIVE.md) para la prueba con tarjeta 4242… .

---

## Qué se auditó / arregló en el código

- **CORS de las funciones**: `create-checkout` y `billing-portal` ahora permiten
  todos los headers que envía `supabase.functions.invoke`
  (`authorization, x-client-info, apikey, content-type`) + `POST, OPTIONS`. Antes
  faltaban `apikey`/`x-client-info` y el *preflight* del navegador fallaba.
- **Mensual y anual**: `create-checkout` acepta `interval` y elige entre
  `STRIPE_PRICE_PREMIUM_MONTHLY` / `_ANNUAL` (con *fallback* al antiguo
  `STRIPE_PRICE_PREMIUM`).
- **Multi-moneda**: `create-checkout` acepta `currency` y la pasa a Checkout
  (para precios con `currency_options`).
- **Webhook robusto**: re-consulta la suscripción a Stripe (fuente de verdad e
  inmune a orden de entrega), lee `current_period_end` aunque la API nueva lo
  mueva a los *items*, recupera el `supabase_user_id` desde la metadata del
  cliente si falta en la suscripción, y devuelve 500 ante error de BD para que
  Stripe reintente. Reprocesar un evento es idempotente (mismo estado final).
- **Cliente de Stripe idempotente**: `customers.create` usa `idempotencyKey` por
  usuario para no duplicar clientes ante doble clic.
- **Regreso del checkout**: la app detecta `/?checkout=success`, hace *polling*
  de la suscripción y desbloquea premium sin recargar; limpia el parámetro.
- **Firma del webhook** y **RLS** (dueño lee `subscriptions`; nadie escribe desde
  el cliente): revisados, correctos.

## Política de acceso (free vs premium)

Se define en `src/auth/entitlements.ts`. Hoy: **Hombro y Fundamentos gratis**, el
resto premium. Cambiar el plan gratuito es editar `FREE_REGIONS`.
