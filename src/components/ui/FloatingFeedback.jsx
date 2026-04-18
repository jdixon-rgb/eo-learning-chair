import { Link } from 'react-router-dom'
import { MessageSquarePlus } from 'lucide-react'

// Floating "Send Feedback" button — visible on every authenticated page,
// desktop + mobile. Clicks route to /feedback which persists to the
// platform_feedback Supabase table (super-admin triage surface).
export default function FloatingFeedback() {
  return (
    <Link
      to="/feedback"
      className="fixed bottom-6 right-6 z-40 bg-primary text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
      aria-label="Send feedback"
    >
      <MessageSquarePlus className="w-5 h-5" />
      <span className="hidden sm:inline text-sm font-medium">Feedback</span>
    </Link>
  )
}
