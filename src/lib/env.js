// Tiny env helper. `VITE_APP_ENV` is set in Vercel per environment
// (production | staging | development). Inlined at build time.
export const isStaging = import.meta.env.VITE_APP_ENV === 'staging'
