import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Bell, Check } from 'lucide-react'

export default function SAPAnnouncementsPage() {
  const { user, isPreviewingOtherUser } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // PRIVACY GUARD: never fetch another user's notifications during impersonation
    if (isPreviewingOtherUser || !isSupabaseConfigured() || !user) {
      setLoading(false)
      return
    }

    async function fetchNotifications() {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setNotifications(data)
      setLoading(false)
    }

    fetchNotifications()
  }, [user])

  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    if (isSupabaseConfigured()) {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-white/40">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-sm text-white/50 mt-1">Messages from your EO chapter</p>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <Bell className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/40">No announcements yet.</p>
          <p className="text-xs text-white/20 mt-1">You'll see messages from the chapter here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 transition-colors ${
                n.is_read
                  ? 'border-white/5 bg-white/[0.02]'
                  : 'border-indigo-500/20 bg-indigo-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${n.is_read ? 'text-white/60' : ''}`}>{n.title}</h3>
                  <p className={`text-sm mt-1 ${n.is_read ? 'text-white/30' : 'text-white/60'}`}>{n.body}</p>
                  <p className="text-[10px] text-white/20 mt-2">
                    {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:bg-white/10 hover:text-green-400 transition-colors cursor-pointer shrink-0"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
