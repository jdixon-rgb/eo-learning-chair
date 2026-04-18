import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bug, Lightbulb, Check, Send } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

const feedbackTypes = [
  { value: 'suggestion', label: 'Suggestion', icon: Lightbulb, desc: 'An idea to make things better' },
  { value: 'bug', label: 'Report Bug', icon: Bug, desc: "Something isn't working right" },
]

export default function FeedbackPage() {
  const { user, profile } = useAuth()
  const [type, setType] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async () => {
    if (!message.trim()) return
    setSending(true)
    setErrorMsg('')

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('platform_feedback').insert({
        user_id: user?.id ?? null,
        user_email: user?.email ?? profile?.email ?? null,
        chapter_id: profile?.chapter_id ?? null,
        feedback_type: type,
        message: message.trim(),
        url: typeof window !== 'undefined' ? window.location.href : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      if (error) {
        setErrorMsg(`Failed to submit: ${error.message}`)
        setSending(false)
        return
      }
    }

    setSending(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Thanks for your feedback!</h1>
          <p className="text-sm text-muted-foreground">We read every submission and use your input to improve this tool.</p>
          <Link
            to="/"
            className="inline-block px-6 py-2.5 rounded-xl font-medium text-sm bg-eo-blue text-white hover:bg-eo-blue/90 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Suggestion | Report Bug</h1>
          <p className="text-xs text-muted-foreground">Help us improve your experience</p>
        </div>
      </div>

      {/* Type Selection */}
      <div className="space-y-2">
        {feedbackTypes.map((ft) => {
          const Icon = ft.icon
          return (
            <button
              key={ft.value}
              onClick={() => setType(ft.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                type === ft.value
                  ? 'border-eo-blue/30 bg-eo-blue/5'
                  : 'border-border bg-card hover:border-border/80'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                type === ft.value ? 'bg-eo-blue/10 text-eo-blue' : 'bg-secondary text-muted-foreground'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-sm font-medium ${type === ft.value ? 'text-eo-blue' : 'text-foreground'}`}>
                  {ft.label}
                </p>
                <p className="text-xs text-muted-foreground">{ft.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Message */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <label htmlFor="feedback-msg" className="block text-sm font-medium text-foreground mb-2">
          Your Message
        </label>
        <textarea
          id="feedback-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            type === 'bug'
              ? 'Describe what happened, what you expected, and the steps to reproduce...'
              : 'Tell us your idea and how it would help...'
          }
          rows={5}
          className="w-full px-4 py-3 rounded-lg border border-border focus:border-eo-blue focus:ring-2 focus:ring-eo-blue/20 outline-none transition-all text-sm resize-none bg-background text-foreground"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!message.trim() || sending}
        className="w-full py-3 rounded-xl font-medium text-sm bg-eo-blue text-white hover:bg-eo-blue/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Send className="w-4 h-4" />
        {sending ? 'Sending…' : 'Submit'}
      </button>
      {errorMsg && (
        <p className="text-sm text-eo-pink text-center">{errorMsg}</p>
      )}
    </div>
  )
}
