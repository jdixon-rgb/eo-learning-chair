export default function ScaleQuestion({ question, value, onChange }) {
  const min = question.min || 1
  const max = question.max || 5
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">{question.label}</h3>
        {question.description && (
          <p className="text-xs text-white/40 mt-1">{question.description}</p>
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
                ? 'bg-eo-blue border-eo-blue text-white scale-110'
                : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {question.labels && (
        <div className="flex justify-between text-[11px] text-white/30 px-2">
          <span>{question.labels[0]}</span>
          <span>{question.labels[1]}</span>
        </div>
      )}
    </div>
  )
}
