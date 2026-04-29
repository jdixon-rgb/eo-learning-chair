export default function SingleSelectQuestion({ question, value, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{question.label}</h3>
        {question.description && (
          <p className="text-xs text-muted-foreground/80 mt-1">{question.description}</p>
        )}
      </div>
      <div className="space-y-2">
        {question.options.map(option => {
          const isSelected = value === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary/20 border-primary/50 text-foreground border'
                  : 'bg-muted/40 border border-border text-foreground/80 hover:bg-muted/60 hover:border-foreground/30'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected
                  ? 'border-primary'
                  : 'border-foreground/30'
              }`}>
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </div>
              <span>{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
