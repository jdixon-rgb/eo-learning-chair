import { UserCheck } from 'lucide-react'

export default function PairingsPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pairings</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Navigator-to-new-member assignments. Coming next.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">
        Pairing management is the next slice. For now, add Navigators on the Navigators page so they're ready to be paired.
      </div>
    </div>
  )
}
