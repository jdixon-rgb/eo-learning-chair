import { useState } from 'react'
import { useSAPContact } from '@/lib/useSAPContact'
import { useSAPStore } from '@/lib/sapStore'
import { Users, CheckCircle2, XCircle, Clock, MessageSquare } from 'lucide-react'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock },
  contacted: { label: 'Contacted', color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'text-white/30', bg: 'bg-white/5', icon: XCircle },
}

export default function SAPLeadsPage() {
  const { partner } = useSAPContact()
  const { connectRequestsForSAP, updateConnectRequest } = useSAPStore()
  const [filter, setFilter] = useState('all')

  const requests = partner ? connectRequestsForSAP(partner.id) : []
  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-white/50 mt-1">
          Members who want to connect with {partner?.name || 'your organization'}
          {pendingCount > 0 && <span className="text-amber-400 ml-1">({pendingCount} pending)</span>}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'pending', label: 'Pending' },
          { id: 'contacted', label: 'Contacted' },
          { id: 'closed', label: 'Closed' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-indigo-600 text-white'
                : 'text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.id === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <Users className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/40">
            {requests.length === 0
              ? 'No connect requests yet. Members can reach out from the Vendor Exchange.'
              : 'No requests match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(req => {
            const config = STATUS_CONFIG[req.status]
            const StatusIcon = config.icon
            return (
              <div key={req.id} className={`rounded-xl border border-white/10 p-4 ${req.status === 'pending' ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-white/[0.02]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{req.member_name || 'EO Member'}</h3>
                      {req.member_company && (
                        <span className="text-xs text-white/40">{req.member_company}</span>
                      )}
                    </div>
                    {req.message && (
                      <div className="flex items-start gap-1.5 mt-2 text-xs text-white/60">
                        <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                        <p>{req.message}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-white/20 mt-2">
                      {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>
                </div>
                {req.status === 'pending' && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-white/5">
                    <button
                      onClick={() => updateConnectRequest(req.id, { status: 'contacted' })}
                      className="text-xs text-green-400 hover:text-green-300 cursor-pointer"
                    >
                      Mark Contacted
                    </button>
                    <button
                      onClick={() => updateConnectRequest(req.id, { status: 'closed' })}
                      className="text-xs text-white/30 hover:text-white/60 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                )}
                {req.status === 'contacted' && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-white/5">
                    <button
                      onClick={() => updateConnectRequest(req.id, { status: 'closed' })}
                      className="text-xs text-white/30 hover:text-white/60 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
