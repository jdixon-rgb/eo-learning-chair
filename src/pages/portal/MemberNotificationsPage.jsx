import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Bell, CheckCheck, Calendar, Megaphone, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const TYPE_ICONS = {
  event_update: Calendar,
  announcement: Megaphone,
  general: Info,
}

const TYPE_COLORS = {
  event_update: 'text-primary',
  announcement: 'text-warm',
  general: 'text-purple-400',
}

// Mock notifications for dev mode
const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'announcement',
    title: 'Welcome to EO Arizona!',
    body: 'Your member portal is now live. Explore the calendar, complete your learning preferences survey, and stay tuned for event updates.',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '2',
    type: 'event_update',
    title: 'August Kickoff Event Announced',
    body: 'Mark your calendars — the August Kickoff Learning Event has been confirmed. Full details will be revealed 2 months before the event.',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
]

export default function MemberNotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!isSupabaseConfigured() || !user) {
      setNotifications(MOCK_NOTIFICATIONS)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setNotifications(data)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    if (isSupabaseConfigured() && supabase) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    }
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    if (isSupabaseConfigured() && supabase && user) {
      await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', user.id).eq('is_read', false)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-purple-400" />
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge className="bg-warm text-white text-xs">{unreadCount} new</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <Bell className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">No notifications yet</p>
          <p className="text-xs text-white/30 mt-1">You'll be notified about events and chapter updates</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = TYPE_ICONS[n.type] || Info
            const iconColor = TYPE_COLORS[n.type] || 'text-white/50'

            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={`rounded-xl border p-4 transition-all cursor-pointer ${
                  n.is_read
                    ? 'border-white/5 bg-white/[0.02]'
                    : 'border-white/15 bg-white/[0.06] hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${n.is_read ? 'text-white/60' : 'text-white'}`}>
                        {n.title}
                      </h3>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-warm shrink-0" />}
                    </div>
                    <p className={`text-sm mt-1 leading-relaxed ${n.is_read ? 'text-white/30' : 'text-white/60'}`}>
                      {n.body}
                    </p>
                    <p className="text-[11px] text-white/25 mt-2">{formatTime(n.created_at)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
