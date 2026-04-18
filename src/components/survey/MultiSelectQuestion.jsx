import { Check } from 'lucide-react'

export default function MultiSelectQuestion({ question, value = [], onChange }) {
  const selected = Array.isArray(value) ? value : []
  const atMax = question.maxSelections && selected.length >= question.maxSelections

  const toggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(v => v !== option))
    } else if (!atMax) {
      onChange([...selected, option])
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">{question.label}</h3>
        {question.description && (
          <p className="text-xs text-white/40 mt-1">{question.description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {question.options.map(option => {
          const isSelected = selected.includes(option)
          const isDisabled = atMax && !isSelected
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              disabled={isDisabled}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary/20 border-primary/50 text-white border'
                  : isDisabled
                    ? 'bg-white/[0.02] border border-white/5 text-white/25 cursor-not-allowed'
                    : 'bg-white/[0.04] border border-white/10 text-white/70 hover:bg-white/[0.08] hover:border-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                isSelected
                  ? 'bg-primary border-primary'
                  : 'border-white/20'
              }`}>
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              <span>{option}</span>
            </button>
          )
        })}
      </div>
      {question.maxSelections && (
        <p className="text-[11px] text-white/30">
          {selected.length} / {question.maxSelections} selected
        </p>
      )}
    </div>
  )
}
