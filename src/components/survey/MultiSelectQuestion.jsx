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
        <h3 className="text-sm font-semibold text-foreground">{question.label}</h3>
        {question.description && (
          <p className="text-xs text-muted-foreground/80 mt-1">{question.description}</p>
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
                  ? 'bg-primary/20 border-primary/50 text-foreground border'
                  : isDisabled
                    ? 'bg-muted/30 border border-border/60 text-muted-foreground/60 cursor-not-allowed'
                    : 'bg-muted/40 border border-border text-foreground/80 hover:bg-muted/60 hover:border-foreground/30'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                isSelected
                  ? 'bg-primary border-primary'
                  : 'border-foreground/30'
              }`}>
                {isSelected && <Check className="h-3 w-3 text-foreground" />}
              </div>
              <span>{option}</span>
            </button>
          )
        })}
      </div>
      {question.maxSelections && (
        <p className="text-[11px] text-muted-foreground/70">
          {selected.length} / {question.maxSelections} selected
        </p>
      )}
    </div>
  )
}
