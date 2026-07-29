/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase (optional; app runs in mock/demo mode without them). */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** PostHog funnel analytics (optional; analytics is off when unset). */
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
