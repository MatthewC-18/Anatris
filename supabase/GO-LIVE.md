# Anatris — Prueba end-to-end y paso a producción

Requisito: haber completado la puesta en marcha de [`README.md`](./README.md)
(proyecto Supabase + `.env` + `schema.sql` + producto y 2 precios en Stripe +
secretos + funciones desplegadas + webhook registrado), todo en **Test mode**.

---

## A. Prueba de extremo a extremo (modo TEST, tarjeta 4242…)

Ejecuta la app apuntando a Supabase real (con el `.env` del paso 1):

```bash
npm run build && npm run preview
```

> Truco: para observar el webhook en vivo en otra terminal:
> ```bash
> stripe listen --forward-to https://TU-REF.supabase.co/functions/v1/stripe-webhook
> ```
> (No es obligatorio: el webhook ya está registrado en el Dashboard.)

Tarjeta de prueba de Stripe: **`4242 4242 4242 4242`**, fecha futura, CVC
cualquiera, código postal cualquiera.

### Checklist

- [ ] **1. Backend real activo.** Abre la app. En el modal de login NO debe
      aparecer el texto "Modo demo". (Si aparece, el `.env` no está cargado.)
- [ ] **2. Registro.** Crea una cuenta (correo + contraseña 6+). Debes quedar
      con sesión iniciada (si desactivaste "Confirm email"). El menú de cuenta
      muestra tu correo y la insignia **Free**.
- [ ] **3. Muro de pago.** Entra a una región premium (p. ej. **Rodilla**).
      Debe verse el **Paywall** en lugar del contenido.
- [ ] **4. Checkout.** En **Planes** elige moneda y periodo (mensual/anual) y
      pulsa **Suscribirme** → redirige a **Stripe Checkout** con el importe y la
      moneda correctos. Paga con `4242…`.
- [ ] **5. Regreso + webhook.** Stripe te devuelve a `/?checkout=success`. En
      unos segundos, **sin recargar**, la insignia pasa a **Premium** y la
      región se desbloquea.
- [ ] **6. Base de datos.** En Supabase → Table Editor → `subscriptions`: tu
      fila tiene `plan = premium`, `status = active`, `stripe_customer_id`,
      `stripe_subscription_id` y `current_period_end` con fecha válida.
- [ ] **7. Webhook 200.** En Stripe → Developers → Webhooks → tu endpoint: los
      eventos `customer.subscription.*` responden **200** (sin reintentos rojos).
- [ ] **8. Portal de facturación.** Menú de cuenta → **Gestionar suscripción** →
      abre el **Customer Portal** de Stripe (métodos de pago, facturas,
      cancelar) y vuelve a la app.
- [ ] **9. Cancelación.** Cancela en el portal → el webhook actualiza la fila
      (`status = canceled`, `plan = null`) y, al refrescar, la región vuelve a
      mostrar el Paywall.
- [ ] **10. Persistencia.** Cierra sesión y vuelve a entrar: el estado premium
      se restaura desde `subscriptions` (RLS: solo tu fila).

### Si algo falla

| Síntoma | Causa probable | Dónde mirar |
|---------|----------------|-------------|
| El login dice "Modo demo" | `.env` no cargado | `VITE_SUPABASE_URL` / `_ANON_KEY` |
| "No se pudo iniciar el pago" | CORS o precio no configurado | `supabase functions logs create-checkout` |
| Checkout abre en la moneda equivocada | falta esa moneda en `currency_options` | Stripe → el precio |
| Pagué pero sigo en Free | webhook falla o secreto mal | `supabase functions logs stripe-webhook` + Stripe → Webhooks |
| Webhook responde 400 | firma incorrecta | vuelve a poner `STRIPE_WEBHOOK_SECRET` y re-despliega |

---

## B. Paso a producción (GO-LIVE)

Cuando la prueba en test pase de principio a fin:

- [ ] **1. Activa tu cuenta Stripe** (Activate account): datos del negocio y
      cuenta bancaria para cobrar de verdad.
- [ ] **2. Recrea el producto y los 2 precios en LIVE mode** (los objetos de test
      NO se migran). Añade las 4 monedas en cada precio, igual que en test. Copia
      los nuevos `price_…` **live**.
- [ ] **3. Webhook de producción.** Crea un endpoint nuevo en **live** apuntando a
      `https://TU-REF.supabase.co/functions/v1/stripe-webhook`, con los mismos 3
      eventos `customer.subscription.*`. Copia su `whsec_…` **live**.
- [ ] **4. Secretos live** en Supabase (sobrescriben los de test):
      ```bash
      supabase secrets set \
        STRIPE_SECRET_KEY=sk_live_TU_CLAVE \
        STRIPE_PRICE_PREMIUM_MONTHLY=price_LIVE_MENSUAL \
        STRIPE_PRICE_PREMIUM_ANNUAL=price_LIVE_ANUAL \
        STRIPE_WEBHOOK_SECRET=whsec_LIVE
      ```
- [ ] **5. Re-despliega** las tres funciones para tomar los secretos live:
      ```bash
      supabase functions deploy create-checkout
      supabase functions deploy billing-portal
      supabase functions deploy stripe-webhook --no-verify-jwt
      ```
- [ ] **6. Dominio.** En Supabase → Authentication → URL Configuration pon el
      **Site URL** y **Redirect URLs** de tu dominio de producción. El
      `success_url`/`cancel_url` del checkout usa el `origin` real, así que
      sirve el dominio final.
- [ ] **7. Build de producción** con el `.env` de producción
      (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` del proyecto; en live la
      anon key es la misma del proyecto). Publica la PWA.
- [ ] **8. Prueba real mínima.** Con una tarjeta real (o Stripe test clock si
      prefieres) haz una compra de verdad y confirma premium + factura. Puedes
      reembolsarte desde el Dashboard.
- [ ] **9. Portal de cliente en live.** Stripe → Settings → Billing → Customer
      portal: activa y configura (cancelaciones, actualización de método de pago,
      facturas).
- [ ] **10. Impuestos / facturación** (opcional pero recomendado): revisa Stripe
      Tax y los datos fiscales según tus mercados (MX/CO/UE).

> **Seguridad:** `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `whsec_…`
> viven SOLO en los secretos de Supabase — nunca en `.env` del frontend, nunca
> en el repo. En el navegador solo van `VITE_SUPABASE_URL`, la anon/publishable
> key y (si la usas) la publishable de PostHog.
