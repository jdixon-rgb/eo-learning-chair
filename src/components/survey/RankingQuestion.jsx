import { ArrowUp, ArrowDown, GripVertical } from 'lucide-react'

export default function RankingQuestion({ question, value, onChange }) {
  // Initialize with default order if no value
  const items = Array.isArray(value) && value.length > 0
    ? value
    : question.options

  const moveUp = (index) => {
    if (index === 0) return
    const next = [...items]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    onChange(next)
  }

  const moveDown = (index) => {
    if (index === items.length - 1) return
    const next = [...items]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">{question.label}</h3>
        {question.description && (
          <p className="text-xs text-white/40 mt-1">{question.description}</p>
        )}
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={item}
            className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5"
          >
            <GripVertical className="h-4 w-4 text-white/20 shrink-0" />
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <span className="flex-1 text-sm text-white/80">{item}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  idx === 0
                    ? 'text-white/10 cursor-not-allowed'
                    : 'text-white/40 hover:text-white hover:bg-white/10'
                }`}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveDown(idx)}
                disabled={idx === items.length - 1}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  idx === items.length - 1
                    ? 'text-white/10 cursor-not-allowed'
                    : 'text-white/40 hover:text-white hover:bg-white/10'
                }`}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
