export default function OpenTextQuestion({ question, value = '', onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">{question.label}</h3>
        {question.description && (
          <p className="text-xs text-white/40 mt-1">{question.description}</p>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder || 'Type your answer...'}
        rows={4}
        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-eo-blue/50 focus:ring-1 focus:ring-eo-blue/30 transition-colors"
      />
    </div>
  )
}
