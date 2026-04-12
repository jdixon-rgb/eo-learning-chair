// Tiny toast state hook — ported from lifeline.ourchapteros.com.
// The consumer renders <Toaster toasts={toasts} dismiss={dismiss} /> and
// calls toast('Saved.', 'success') to push a new entry. Each toast
// auto-dismisses after 4 seconds.

import { useCallback, useState } from 'react'

let toastCount = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'default') => {
    toastCount += 1
    const id = String(toastCount)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}
