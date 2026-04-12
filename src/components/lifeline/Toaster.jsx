import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// Toast container — renders all active toasts in the bottom-right.
// Ported from lifeline.ourchapteros.com. State lives in useToast;
// this component just renders whatever it's handed.

export function Toaster({ toasts, dismiss }) {
  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-center gap-3 rounded border px-4 py-3 shadow-lifeline-modal text-sm font-lifeline-body max-w-sm',
            {
              'bg-lifeline-card border-lifeline-border text-lifeline-ink':
                t.type === 'default' || !t.type,
              'bg-lifeline-positive-bg border-lifeline-positive-light text-lifeline-positive':
                t.type === 'success',
              'bg-lifeline-negative-bg border-lifeline-negative-light text-lifeline-negative':
                t.type === 'error',
            }
          )}
        >
          {t.type === 'success' && <CheckCircle className="h-4 w-4 shrink-0" />}
          {t.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0" />}
          {(t.type === 'default' || !t.type) && (
            <Info className="h-4 w-4 shrink-0 text-lifeline-ink-muted" />
          )}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="ml-2 rounded p-0.5 hover:bg-lifeline-paper-dark transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
