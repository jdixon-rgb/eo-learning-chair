import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { initMonitoring } from './lib/monitoring.js'

initMonitoring()

// Orange favicon on staging makes it visually distinct from prod tabs.
if (import.meta.env.VITE_APP_ENV === 'staging') {
  const link = document.querySelector('link[rel="icon"]')
  if (link) link.href = '/favicon-staging.svg'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
