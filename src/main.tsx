// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { RecoveryGate } from './components/account/SetPasswordModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { applyAccessFromUrl } from './auth/devAccess';
import { initAnalytics } from './lib/analytics';
import './index.css';

// Owner "all-access" unlock via ?acceso=<code>. Runs before render so the
// entitlement is correct on first paint. No-op for normal visitors.
applyAccessFromUrl();

// Funnel analytics (PostHog). No-op unless VITE_POSTHOG_KEY is set.
initAnalytics();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary variant="page" label="la aplicación">
      <AuthProvider>
        <App />
        <RecoveryGate />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
