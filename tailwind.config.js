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
      },
      colors: {
        // Accent — clinical cyan, used sparingly for active/selected state.
        accent: {
          DEFAULT: '#22d3ee', // cyan-400
          soft: '#67e8f9', // cyan-300
          deep: '#0891b2', // cyan-600
          glow: 'rgba(34, 211, 238, 0.15)',
        },
        // The near-black blue-tinted base surfaces.
        ink: {
          950: '#070b14',
          900: '#0b1120',
          850: '#0f1626',
          800: '#141d30',
          700: '#1c2740',
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
        'accent-glow': '0 0 0 1px rgba(34, 211, 238, 0.4), 0 0 24px rgba(34, 211, 238, 0.25)',
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