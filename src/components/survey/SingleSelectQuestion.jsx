export default function SingleSelectQuestion({ question, value, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">{question.label}</h3>
        {question.description && (
          <p className="text-xs text-white/40 mt-1">{question.description}</p>
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
                  ? 'bg-primary/20 border-primary/50 text-white border'
                  : 'bg-white/[0.04] border border-white/10 text-white/70 hover:bg-white/[0.08] hover:border-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected
                  ? 'border-primary'
                  : 'border-white/20'
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
