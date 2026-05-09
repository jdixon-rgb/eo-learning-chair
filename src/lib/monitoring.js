import * as Sentry from '@sentry/react'

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV || 'development',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  })
}

// Report a silently-handled error to Sentry with consistent tagging.
//
// Use this in catch blocks where the app gracefully recovers (e.g. a
// fetch failed but we showed cached data plus a user-visible banner)
// but where we still want telemetry on the failure so we don't only
// learn about incidents from chairs emailing us. The 2026-05-09
// incident — events/saps fetches breaking on prod for hours — left
// zero trace in Sentry because every catch block was console.warn-only.
//
// Args:
//   label: short human-readable identifier ("fetch:events",
//     "write:saps", "upload:lifeline-photo"). Becomes a Sentry tag
//     for filtering/aggregation.
//   err: the error object — either a thrown Error or a PostgREST
//     response.error. Both are normalized to a Sentry-ingestible Error.
//   context: optional metadata (chapter_id, fiscal_year, label-specific
//     fields). String values become tags; everything goes to extra.
//
// Always logs to console (for local dev visibility) and additionally
// dispatches to Sentry when the SDK is initialized.
export function captureSilentError(label, err, context = {}) {
  // Local-dev visibility never goes away — Sentry is for prod telemetry,
  // console is for the developer right in front of the failure.
  // eslint-disable-next-line no-console
  console.warn(`[${label}]`, err, context)

  // No DSN means Sentry was never init'd (offline dev, tests). Skip.
  if (!import.meta.env.VITE_SENTRY_DSN) return

  // Normalize: PostgREST returns a plain object, not an Error. Wrap so
  // Sentry's stack-trace / dedup logic has something coherent to work
  // with. Preserve the original object as `cause` for inspection.
  let errorObj
  if (err instanceof Error) {
    errorObj = err
  } else if (err && (err.message || err.details)) {
    errorObj = new Error(`${label}: ${err.message || err.details || JSON.stringify(err)}`)
    errorObj.cause = err
  } else {
    errorObj = new Error(`${label}: unknown error`)
    errorObj.cause = err
  }

  // Tags must be string-typed and bounded in number; extras can be
  // anything. Move string-valued context entries into tags for
  // filtering, leave structured data in extras.
  const tags = { label }
  for (const [k, v] of Object.entries(context)) {
    if (typeof v === 'string' && v.length < 200) tags[k] = v
  }

  Sentry.captureException(errorObj, { tags, extra: context })
}
