import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { fetchCurrentBetaTerms } from '@/lib/betaTerms'

// Renders a constrained markdown subset (headings, paragraphs, bold/italic,
// ordered/unordered lists, horizontal rules). Used only for the beta terms
// content — not a general-purpose markdown renderer.
function TermsMarkdown({ source }) {
  if (!source) return null
  const lines = source.split('\n')
  const blocks = []
  let listBuf = null
  let listType = null

  const flushList = () => {
    if (!listBuf) return
    const items = listBuf.map((item, i) => (
      <li key={i} className="mb-1.5" dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
    ))
    blocks.push(
      listType === 'ol'
        ? <ol key={blocks.length} className="list-decimal pl-6 my-3 space-y-1 text-sm">{items}</ol>
        : <ul key={blocks.length} className="list-disc pl-6 my-3 space-y-1 text-sm">{items}</ul>
    )
    listBuf = null
    listType = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) { flushList(); continue }
    if (trimmed === '---') { flushList(); blocks.push(<hr key={blocks.length} className="my-4 border-border" />); continue }
    if (trimmed.startsWith('### ')) { flushList(); blocks.push(<h3 key={blocks.length} className="text-base font-semibold mt-4 mb-2">{trimmed.slice(4)}</h3>); continue }
    if (trimmed.startsWith('## ')) { flushList(); blocks.push(<h2 key={blocks.length} className="text-lg font-semibold mt-5 mb-2">{trimmed.slice(3)}</h2>); continue }
    if (trimmed.startsWith('# ')) { flushList(); blocks.push(<h1 key={blocks.length} className="text-xl font-bold mt-2 mb-3">{trimmed.slice(2)}</h1>); continue }
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
    if (olMatch) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; listBuf = [] }
      listBuf.push(olMatch[2])
      continue
    }
    if (trimmed.startsWith('- ')) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; listBuf = [] }
      listBuf.push(trimmed.slice(2))
      continue
    }
    flushList()
    blocks.push(<p key={blocks.length} className="text-sm my-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }} />)
  }
  flushList()
  return <div className="text-foreground">{blocks}</div>
}

// Inline formatting: **bold**, *italic*. Escapes HTML first.
function renderInline(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
}

/**
 * BetaTermsModal — renders the current beta terms in a dialog.
 *
 * Two modes:
 *   - Read-only (default): shows close button.
 *   - Acknowledgment: pass `onAcknowledge` callback to show "I Acknowledge" button.
 *     The button is disabled until the user scrolls to the bottom.
 */
export default function BetaTermsModal({ open, onOpenChange, onAcknowledge, blocking = false }) {
  const [terms, setTerms] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acking, setAcking] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setScrolledToBottom(false)
    fetchCurrentBetaTerms().then(t => {
      if (!cancelled) {
        setTerms(t)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [open])

  const handleScroll = (e) => {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setScrolledToBottom(true)
  }

  const handleAck = async () => {
    setAcking(true)
    await onAcknowledge?.()
    setAcking(false)
  }

  // Blocking mode: render outside Dialog primitive so the X close + backdrop click are disabled.
  if (blocking) {
    if (!open) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border bg-background shadow-xl">
          <div className="px-6 pt-6 pb-3 border-b">
            <h2 className="text-lg font-semibold">Please review the beta terms</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {terms ? `Version ${terms.version} · effective ${terms.effective_date}` : 'Loading…'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4" onScroll={handleScroll}>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading terms…
              </div>
            ) : (
              <TermsMarkdown source={terms?.content_md} />
            )}
          </div>
          <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground flex-1">
              {scrolledToBottom ? 'Click below to acknowledge.' : 'Scroll to the bottom to enable the acknowledgment button.'}
            </p>
            <Button
              onClick={handleAck}
              disabled={!scrolledToBottom || acking || loading}
            >
              {acking ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Recording…</>) : 'I Acknowledge'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Read-only mode: standard dialog with X close.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Beta Terms</DialogTitle>
          {terms && (
            <p className="text-xs text-muted-foreground">
              Version {terms.version} · effective {terms.effective_date}
            </p>
          )}
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading terms…
            </div>
          ) : (
            <TermsMarkdown source={terms?.content_md} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
