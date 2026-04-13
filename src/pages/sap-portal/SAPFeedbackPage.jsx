import { useState, useMemo } from 'react'
import { useSAPContact } from '@/lib/useSAPContact'
import { useSAPStore } from '@/lib/sapStore'
import { MessageSquare, Star, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SAPFeedbackPage() {
  const { contact, partner } = useSAPContact()
  const { chapterFeedback, addChapterFeedback } = useSAPStore()

  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Check if this contact already submitted
  const existing = useMemo(() => {
    if (!contact) return null
    return chapterFeedback.find(f => f.sap_contact_id === contact.id)
  }, [chapterFeedback, contact])

  const handleSubmit = () => {
    if (!rating || !contact || !partner) return
    addChapterFeedback({
      sap_contact_id: contact.id,
      sap_id: partner.id,
      rating,
      feedback_text: text,
      is_anonymous: isAnonymous,
    })
    setSubmitted(true)
  }

  if (!partner || !contact) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <MessageSquare className="h-8 w-8 text-white/20 mx-auto mb-2" />
        <p className="text-sm text-white/40">Your account needs to be linked to a partner first.</p>
      </div>
    )
  }

  if (existing || submitted) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Chapter Feedback</h1>
          <p className="text-sm text-white/50 mt-1">Thank you for your feedback</p>
        </div>
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center">
          <MessageSquare className="h-8 w-8 text-green-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-green-300">Feedback Received</h2>
          <p className="text-sm text-white/50 mt-2">
            Your feedback has been submitted{(existing || isAnonymous) ? '' : ` from ${partner.name}`}.
            {(existing?.is_anonymous || isAnonymous) && ' It was submitted anonymously.'}
          </p>
          <p className="text-xs text-white/30 mt-3">
            This goes directly to the Strategic Alliances Chair.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Chapter Feedback</h1>
        <p className="text-sm text-white/50 mt-1">Help us improve your experience as an SAP partner</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
        {/* Rating */}
        <div>
          <label className="text-sm font-medium text-white/70 block mb-2">
            How would you rate your experience with EO Arizona?
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(i)}
                className="p-0.5 cursor-pointer"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    i <= (hover || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Text feedback */}
        <div>
          <label className="text-sm font-medium text-white/70 block mb-2">
            What could we do to improve your experience and make the partnership more compelling?
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Your recommendations and feedback..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/30 resize-none"
            rows={5}
          />
        </div>

        {/* Anonymous toggle */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)}
            className="mt-1"
          />
          <div>
            <span className="text-sm font-medium text-white/70 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Submit anonymously
            </span>
            <p className="text-xs text-white/30 mt-0.5">
              Your name won't be attached — only your company will be identifiable. Feedback goes directly to the Strategic Alliances Chair.
            </p>
          </div>
        </label>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!rating}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30"
        >
          Submit Feedback
        </Button>
      </div>
    </div>
  )
}
