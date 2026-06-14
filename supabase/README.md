# Backend de Anatris — Supabase + Stripe

Esta carpeta contiene el código **desplegable** que activa la autenticación y la
suscripción reales. **No forma parte del build de la app** (Vite solo compila
`src/`); son funciones Deno + SQL que se despliegan en tu proyecto Supabase.

Mientras no configures esto, la app funciona en **modo demo** con un backend
simulado (mock) en `localStorage`, así que puedes desarrollar y probar todo el
embudo (registro → muro de pago → "suscribirme" → premium) sin cuentas.

## Arquitectura

```
Frontend (src/auth)                Supabase                     Stripe
─────────────────────              ──────────────────────       ──────────────
useAuth() / useEntitlement()       Auth (correo+contraseña)
  │                                tabla public.subscriptions
  ├─ signIn/signUp ───────────────▶ Supabase Auth
  ├─ startCheckout ───────────────▶ fn create-checkout ────────▶ Checkout Session
  │                                                              (redirección)
  │                                 fn stripe-webhook  ◀──────── customer.subscription.*
  │                                   └─ upsert subscriptions
  └─ fetchSubscription ◀──────────── select subscriptions (RLS: dueño)
```

El **webhook es la única fuente de verdad**: el frontend nunca escribe el estado
de la suscripción, solo lo lee (protegido por Row Level Security).

## Puesta en marcha

1. **Crea un proyecto en Supabase** y copia en tu `.env` (ver `.env.example`):
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
   Con eso, la app deja el mock y usa Supabase automáticamente.

2. **Crea la tabla** ejecutando `schema.sql` en el SQL Editor.

3. **Crea el producto/precio en Stripe** (modo suscripción) y guarda el
   `price_...`.

4. **Configura los secretos** de las funciones:
   ```bash
   supabase secrets set \
     STRIPE_SECRET_KEY=sk_live_... \
     STRIPE_PRICE_PREMIUM=price_... \
     STRIPE_WEBHOOK_SECRET=whsec_...
   ```

5. **Despliega las funciones**:
   ```bash
   supabase functions deploy create-checkout
   supabase functions deploy billing-portal
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```

6. **Registra el webhook en Stripe** apuntando a la URL de `stripe-webhook` y
   suscríbete a los eventos `customer.subscription.created/updated/deleted`.
   Copia el `whsec_...` resultante al secreto `STRIPE_WEBHOOK_SECRET`.

## Política de acceso (free vs premium)

Se define en `src/auth/entitlements.ts`. Hoy: **Hombro y Fundamentos gratis**, el
resto premium. Cambiar el plan gratuito es editar `FREE_REGIONS`.
