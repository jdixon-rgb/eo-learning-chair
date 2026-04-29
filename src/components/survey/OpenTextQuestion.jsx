export default function OpenTextQuestion({ question, value = '', onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{question.label}</h3>
        {question.description && (
          <p className="text-xs text-muted-foreground/80 mt-1">{question.description}</p>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder || 'Type your answer...'}
        rows={4}
        className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
      />
    </div>
  )
}
