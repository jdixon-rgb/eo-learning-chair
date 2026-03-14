import { Link } from 'react-router-dom'
import { MessageSquarePlus } from 'lucide-react'

export default function FloatingFeedback() {
  return (
    <Link
      to="/feedback"
      className="fixed bottom-6 right-6 z-40 bg-eo-blue text-white p-3 rounded-full shadow-lg hover:bg-eo-blue/90 transition-all hover:scale-105 active:scale-95 md:hidden"
      aria-label="Send feedback"
    >
      <MessageSquarePlus className="w-5 h-5" />
    </Link>
  )
}
