-- Anatris — esquema de suscripciones para Supabase.
-- Ejecutar en el SQL Editor del proyecto (o vía `supabase db push`).
--
-- Modelo: una fila por usuario con su estado de suscripción, escrita SOLO por
-- el webhook de Stripe (service role) y legible por su dueño mediante RLS. El
-- frontend lee esta tabla a través de supabaseProvider.fetchSubscription().

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  plan                   text,                       -- 'premium' | null
  status                 text not null default 'none',
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

-- Búsqueda rápida por el cliente de Stripe (la usa el webhook).
create index if not exists subscriptions_stripe_customer_idx
  on public.subscriptions (stripe_customer_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: cada usuario solo ve SU fila. Nadie puede escribir desde
-- el cliente; las escrituras llegan del webhook con la service role key, que
-- evita RLS por diseño.
-- ---------------------------------------------------------------------------
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- (Sin políticas de insert/update/delete: el cliente NUNCA escribe aquí.)

-- ===========================================================================
-- study_state — progreso de estudio sincronizado por cuenta.
-- ===========================================================================
-- Modelo: una fila por usuario con un snapshot JSON de TODO su progreso de
-- estudio (programación SRS, racha, progreso por región). A diferencia de
-- subscriptions, AQUÍ el cliente sí escribe: cada dispositivo hace upsert de su
-- estado fusionado (merge monótono en el cliente, ver lib/studyState.ts), así
-- que RLS permite al dueño leer y escribir SOLO su propia fila.

create table if not exists public.study_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.study_state enable row level security;

drop policy if exists "study_state_select_own" on public.study_state;
create policy "study_state_select_own"
  on public.study_state
  for select
  using (auth.uid() = user_id);

drop policy if exists "study_state_insert_own" on public.study_state;
create policy "study_state_insert_own"
  on public.study_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "study_state_update_own" on public.study_state;
create policy "study_state_update_own"
  on public.study_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
