export default function ScaleQuestion({ question, value, onChange }) {
  const min = question.min || 1
  const max = question.max || 5
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{question.label}</h3>
        {question.description && (
          <p className="text-xs text-muted-foreground/80 mt-1">{question.description}</p>
        )}
      </div>
      <div className="flex items-center justify-center gap-3 py-4">
        {points.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-12 h-12 rounded-full border-2 text-sm font-bold transition-all cursor-pointer ${
              value === n
                ? 'bg-primary border-primary text-foreground scale-110'
                : 'border-foreground/30 text-muted-foreground hover:border-foreground/50 hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {question.labels && (
        <div className="flex justify-between text-[11px] text-muted-foreground/70 px-2">
          <span>{question.labels[0]}</span>
          <span>{question.labels[1]}</span>
        </div>
      )}
    </div>
  )
}
