/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Display font for headings / logo — geometric, technical.
        display: ['Sora', 'system-ui', 'sans-serif'],
        // Body font for UI — clinical legibility with character.
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        // Monospace for measurements / coordinates / codes.
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        // Editorial serif, used ONLY by the public site (landing, pricing,
        // legal). A health product is judged on sobriety before it is judged on
        // features, and a journal-grade serif carries that in a way no amount of
        // copy does. The product UI stays on the sans/mono instrument voice, so
        // the two never compete inside the same screen.
        serif: ['"Source Serif 4"', 'Georgia', '"Times New Roman"', 'serif'],
      },
      colors: {
        // ------------------------------------------------------------------
        // SLATE, OVERRIDDEN
        // ------------------------------------------------------------------
        // The UI is painted in `slate` in over a thousand places, and Tailwind's
        // slate is not a grey: slate-900 is hsl(222, 47%, 11%), a saturated
        // navy. Navy surfaces under a cyan accent is the single most recognisable
        // "generated dashboard" combination on the web, and it was the thing
        // that read as machine-made here -- "ese azul de fondo es muy de IA".
        //
        // There is also a clinical reason, and it is the stronger one. This app
        // is a lit stage for a BODY. A blue surround shifts how every skin,
        // muscle and bone colour in front of it is perceived; medical
        // illustrators and photographers mount work on neutral grey for exactly
        // that reason. A navy stage quietly lies about the tissue.
        //
        // So slate is redefined here as a near-neutral graphite: same lightness
        // ladder (every existing contrast pairing survives), saturation cut from
        // ~45% to ~8%, keeping a trace of cool so it reads as graphite and not
        // as mud. Overriding the ramp rather than rewriting 1018 class names
        // means no screen can be missed and the change is one commit to undo.
        slate: {
          50: '#f9fafb',
          100: '#f1f2f4',
          200: '#e3e5e8',
          300: '#c8cbd0',
          400: '#979ba3',
          500: '#6b7079',
          600: '#525761',
          700: '#3c4048',
          800: '#24272d',
          900: '#16181c',
          950: '#0b0c0f',
        },
        // ------------------------------------------------------------------
        // SEMANTIC SURFACE / TEXT TOKENS
        // ------------------------------------------------------------------
        // Resolved from CSS variables set by a theme scope (`.theme-paper` for
        // the public site, `.theme-ink` for the product; see index.css). This
        // exists because Pricing and Paywall render in BOTH worlds: hard-coded
        // `slate-800` borders made the pricing table unreadable the moment the
        // landing turned light. Anything that has to survive both surfaces must
        // be written in these tokens, never in raw slate/ink values.
        page: 'rgb(var(--c-page) / <alpha-value>)',
        card: 'rgb(var(--c-card) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        fg2: 'rgb(var(--c-fg2) / <alpha-value>)',
        fg3: 'rgb(var(--c-fg3) / <alpha-value>)',
        // Brand: deep clinical blue on paper, the app's cyan on ink. Same token,
        // so a button written once reads correctly on either surface.
        brand: {
          // `brand` is the readable accent for text and icons on this surface;
          // `brand-fill` is what a solid button is painted with. They differ on
          // ink on purpose — see the note on --c-brand-fill in index.css.
          DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)',
          fill: 'rgb(var(--c-brand-fill) / <alpha-value>)',
          deep: 'rgb(var(--c-brand-deep) / <alpha-value>)',
          wash: 'rgb(var(--c-brand-wash) / <alpha-value>)',
          on: 'rgb(var(--c-brand-on) / <alpha-value>)',
        },
        // Accent — used sparingly for active/selected state.
        //
        // Was Tailwind's cyan-400 (#22d3ee). That exact value, on a navy
        // surface, is the other half of the generated-dashboard look, and at
        // 85% saturation it also out-shouted the muscle-role colours, which are
        // the ones that actually carry meaning here. Same family, pulled back
        // to an instrument readout rather than a neon sign: colour in this app
        // should mean something, and spending the loudest one on chrome is what
        // made it look authored by nobody.
        accent: {
          DEFAULT: '#4fb6c7',
          soft: '#86d2de',
          deep: '#2b8495',
          glow: 'rgba(79, 182, 199, 0.15)',
        },
        // The near-black base surfaces. Neutral graphite, not navy — see the
        // note on `slate` above; these are the same ramp carried further down.
        ink: {
          950: '#0b0c0f',
          900: '#0f1114',
          850: '#14161a',
          800: '#1b1e22',
          700: '#272b31',
        },
        // Clinical green — a second accent for "go / healthy / range achieved".
        // Paired with the cyan accent it gives the palette a physiotherapy
        // (movement + health) identity instead of a generic single-accent dark UI.
        clinical: {
          DEFAULT: '#10b981', // emerald-500
          soft: '#34d399', // emerald-400
          deep: '#059669', // emerald-600
          glow: 'rgba(16, 185, 129, 0.15)',
        },
        // Muscle-role colors — the app's clinical language for "who does what"
        // in a movement (prime mover / assistant / stabilizer). Centralized here
        // so badges, legends and 3D markers stay in sync across the app.
        role: {
          prime: '#f59e0b', // amber-500  — agonista / motor principal
          assist: '#38bdf8', // sky-400    — asistente
          stabilize: '#a78bfa', // violet-400 — estabilizador
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'accent-glow': '0 0 0 1px rgba(79, 182, 199, 0.42), 0 0 24px rgba(79, 182, 199, 0.22)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};