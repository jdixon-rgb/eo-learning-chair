import { useState } from 'react'

const STEPS = [
  { id: 'foundation', label: 'Foundation' },
  { id: 'goal', label: 'Impossible Goal' },
  { id: 'audit', label: 'Power Law Audit' },
  { id: 'floor', label: 'Raise the Floor' },
  { id: 'blueprint', label: '90-Day Sprint' },
]

const METRICS = [
  { value: 'revenue', label: 'Revenue', unit: '$' },
  { value: 'clients', label: 'Clients', unit: 'clients' },
  { value: 'locations', label: 'Locations', unit: 'locations' },
  { value: 'units', label: 'Units Sold', unit: 'units' },
]

const MULTIPLIERS = [2, 5, 10, 25, 100]

function formatValue(v, unit) {
  const n = Number(v) || 0
  if (unit === '$') {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
    return `$${n.toLocaleString()}`
  }
  return `${n.toLocaleString()} ${unit}`
}

// Minimal markdown renderer for Claude's output.
// Handles: ## headers, bullet lists, **bold**, blank-line paragraphs.
function renderMarkdown(text) {
  if (!text) return null
  const blocks = text.split(/\n\n+/)
  return blocks.map((block, i) => {
    const trimmed = block.trim()
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={i} className="text-amber-400 text-lg font-semibold mt-4 mb-2 tracking-tight">
          {renderInline(trimmed.slice(3))}
        </h3>
      )
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={i} className="text-amber-400 text-xl font-semibold mt-4 mb-2">
          {renderInline(trimmed.slice(2))}
        </h2>
      )
    }
    const lines = trimmed.split('\n')
    if (lines.every(l => /^\s*[-*]\s/.test(l))) {
      return (
        <ul key={i} className="list-disc list-outside pl-6 space-y-1.5 my-2 text-slate-200">
          {lines.map((l, j) => (
            <li key={j}>{renderInline(l.replace(/^\s*[-*]\s/, ''))}</li>
          ))}
        </ul>
      )
    }
    return (
      <p key={i} className="text-slate-200 leading-relaxed my-2">
        {renderInline(trimmed)}
      </p>
    )
  })
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="text-white font-semibold">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  )
}

function Spinner() {
  return (
    <div className="flex gap-1.5 items-center justify-center py-8">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function StepIndicator({ step, goTo }) {
  return (
    <div className="flex items-center justify-between max-w-3xl mx-auto mb-10 px-2">
      {STEPS.map((s, i) => {
        const active = i === step
        const done = i < step
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => (done ? goTo(i) : null)}
              disabled={!done && !active}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border-[3px] transition-all ${
                  active
                    ? 'bg-white border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                    : done
                    ? 'bg-amber-500 border-amber-500'
                    : 'bg-slate-800 border-slate-700'
                }`}
              />
              <span
                className={`text-[10px] uppercase tracking-wider ${
                  active ? 'text-amber-400' : done ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-5 ${done ? 'bg-amber-500/60' : 'bg-slate-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ScalingCoachPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    business: '',
    whatYouSell: '',
    metric: 'revenue',
    unit: '$',
    currentValue: '',
    currentPathways: '',
    currentActivities: '',
  })
  const [goalX, setGoalX] = useState(10)
  const [ai, setAi] = useState({ audit: '', floor: '', blueprint: '' })
  const [loading, setLoading] = useState({ audit: false, floor: false, blueprint: false })
  const [err, setErr] = useState({ audit: '', floor: '', blueprint: '' })

  const metric = METRICS.find(m => m.value === form.metric) || METRICS[0]
  const numericValue = parseFloat(String(form.currentValue).replace(/,/g, '')) || 0
  const goalValue = numericValue * goalX

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setMetric(value) {
    const m = METRICS.find(x => x.value === value)
    setForm(f => ({ ...f, metric: value, unit: m?.unit || '' }))
  }

  async function callCoach(stepName) {
    setLoading(l => ({ ...l, [stepName]: true }))
    setErr(e => ({ ...e, [stepName]: '' }))
    try {
      const res = await fetch('/api/scaling/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepName, form, goalX }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setAi(a => ({ ...a, [stepName]: data.text || '' }))
    } catch (e) {
      setErr(er => ({ ...er, [stepName]: e.message }))
    } finally {
      setLoading(l => ({ ...l, [stepName]: false }))
    }
  }

  const foundationReady =
    form.business.trim() &&
    form.whatYouSell.trim() &&
    numericValue > 0 &&
    form.currentPathways.trim() &&
    form.currentActivities.trim()

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-10 text-center">
          <div className="inline-block text-[10px] uppercase tracking-[0.3em] text-amber-500 mb-2">
            The Science of Scaling
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            The <span className="text-amber-400">10x</span> Coach
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-lg mx-auto">
            Five steps to identify what to kill, what to double down on, and the one power-law
            move to make in the next 90 days.
          </p>
        </header>

        <StepIndicator step={step} goTo={setStep} />

        {/* STEP 1: Foundation */}
        {step === 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-1">Your Foundation</h2>
            <p className="text-slate-400 text-sm mb-6">
              The coach needs real numbers and real context. Vague inputs get vague coaching.
            </p>

            <div className="space-y-5">
              <Field label="What's your business?">
                <textarea
                  className={inputCls}
                  rows={2}
                  placeholder="e.g. B2B consulting firm helping mid-market SaaS scale ops"
                  value={form.business}
                  onChange={e => update('business', e.target.value)}
                />
              </Field>

              <Field label="What do you sell, specifically?">
                <textarea
                  className={inputCls}
                  rows={2}
                  placeholder="e.g. 6-month fractional COO engagements, $25K/mo retainers"
                  value={form.whatYouSell}
                  onChange={e => update('whatYouSell', e.target.value)}
                />
              </Field>

              <Field label="Primary metric you want to scale">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {METRICS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setMetric(m.value)}
                      className={`py-2.5 px-3 rounded-lg text-sm border transition-all ${
                        form.metric === m.value
                          ? 'bg-amber-500 border-amber-500 text-slate-950 font-semibold'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={`Current ${metric.label.toLowerCase()} (annual)`}>
                <div className="flex items-center gap-2">
                  {metric.unit === '$' && (
                    <span className="text-slate-500 text-lg">$</span>
                  )}
                  <input
                    className={inputCls}
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 1,200,000"
                    value={form.currentValue}
                    onChange={e => update('currentValue', e.target.value.replace(/[^0-9.,]/g, ''))}
                  />
                  {metric.unit !== '$' && (
                    <span className="text-slate-500 text-sm whitespace-nowrap">{metric.unit}</span>
                  )}
                </div>
              </Field>

              <Field label={`How do you currently get ${form.metric}?`}>
                <textarea
                  className={inputCls}
                  rows={3}
                  placeholder="e.g. LinkedIn outreach, warm referrals, one key enterprise account (40% of rev)"
                  value={form.currentPathways}
                  onChange={e => update('currentPathways', e.target.value)}
                />
              </Field>

              <Field label="What are you doing day-to-day right now? (list it all)">
                <textarea
                  className={inputCls}
                  rows={4}
                  placeholder="e.g. sales calls, delivery, content on LinkedIn, hiring, weekly partner check-ins, podcast interviews..."
                  value={form.currentActivities}
                  onChange={e => update('currentActivities', e.target.value)}
                />
              </Field>
            </div>

            <NavRow>
              <div />
              <button
                disabled={!foundationReady}
                onClick={() => setStep(1)}
                className={primaryBtn(foundationReady)}
              >
                Next: Impossible Goal →
              </button>
            </NavRow>
          </section>
        )}

        {/* STEP 2: Impossible Goal */}
        {step === 1 && (
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-1">Set Your Impossible Goal</h2>
            <p className="text-slate-400 text-sm mb-6">
              The multiplier is the point. A 2x goal lets you keep doing what you're doing.
              A 10x goal eliminates 99% of your current pathways — which is the whole idea.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 mb-6">
              <div className="text-slate-500 text-xs uppercase tracking-wider">Current</div>
              <div className="text-3xl md:text-4xl font-bold text-slate-300 mt-1">
                {formatValue(numericValue, metric.unit)}
              </div>
              <div className="h-px bg-slate-800 my-5" />
              <div className="text-amber-500 text-xs uppercase tracking-wider">
                Impossible Goal ({goalX}x)
              </div>
              <div className="text-4xl md:text-5xl font-bold text-amber-400 mt-1">
                {formatValue(goalValue, metric.unit)}
              </div>
            </div>

            <Field label="Pick your multiplier">
              <div className="grid grid-cols-5 gap-2">
                {MULTIPLIERS.map(m => (
                  <button
                    key={m}
                    onClick={() => setGoalX(m)}
                    className={`py-3 rounded-lg font-bold text-lg border transition-all ${
                      goalX === m
                        ? 'bg-amber-500 border-amber-500 text-slate-950'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </Field>

            <p className="text-slate-400 text-sm mt-5 italic border-l-2 border-amber-500 pl-4">
              This goal eliminates 99% of your current pathways. That's the point.
            </p>

            <NavRow>
              <button onClick={() => setStep(0)} className={secondaryBtn}>← Back</button>
              <button onClick={() => setStep(2)} className={primaryBtn(true)}>
                Next: Power Law Audit →
              </button>
            </NavRow>
          </section>
        )}

        {/* STEP 3: Power Law Audit */}
        {step === 2 && (
          <AIStep
            title="Power Law Audit"
            description="Claude analyzes your activities to find true 10x leverage, flag the linear traps, and name the power-law plays you're probably missing."
            ai={ai.audit}
            loading={loading.audit}
            err={err.audit}
            onRun={() => callCoach('audit')}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextLabel="Next: Raise the Floor →"
          />
        )}

        {/* STEP 4: Raise the Floor */}
        {step === 3 && (
          <AIStep
            title="Raise the Floor"
            description='Elon: "You are optimizing things that shouldn\u0027t exist." Claude names what to eliminate and what to double down on to operate from your impossible-goal floor.'
            ai={ai.floor}
            loading={loading.floor}
            err={err.floor}
            onRun={() => callCoach('floor')}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextLabel="Next: 90-Day Sprint →"
          />
        )}

        {/* STEP 5: Blueprint */}
        {step === 4 && (
          <AIStep
            title="90-Day Sprint Blueprint"
            description="The one power-law move for month 1, the key hire or partner, the conversation to have this week, and 3 numbers to track."
            ai={ai.blueprint}
            loading={loading.blueprint}
            err={err.blueprint}
            onRun={() => callCoach('blueprint')}
            onBack={() => setStep(3)}
            onNext={null}
            nextLabel=""
          />
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-sm'

function primaryBtn(enabled) {
  return `px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
    enabled
      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
  }`
}

const secondaryBtn =
  'px-5 py-2.5 rounded-lg font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-all'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">{label}</label>
      {children}
    </div>
  )
}

function NavRow({ children }) {
  return <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-800">{children}</div>
}

function AIStep({ title, description, ai, loading, err, onRun, onBack, onNext, nextLabel }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8">
      <h2 className="text-xl font-semibold mb-1">{title}</h2>
      <p className="text-slate-400 text-sm mb-6">{description}</p>

      {!ai && !loading && (
        <button onClick={onRun} className="w-full bg-amber-500 text-slate-950 font-semibold py-3 rounded-lg hover:bg-amber-400 transition-all">
          Run {title} →
        </button>
      )}

      {loading && (
        <div className="py-4">
          <Spinner />
          <p className="text-center text-slate-500 text-sm">Claude is thinking…</p>
        </div>
      )}

      {err && (
        <div className="bg-red-950/40 border border-red-900 text-red-300 rounded-lg p-4 text-sm">
          <div className="font-semibold mb-1">Error</div>
          <div className="text-red-200/80">{err}</div>
          <button onClick={onRun} className="mt-3 text-red-300 underline text-xs">Try again</button>
        </div>
      )}

      {ai && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-5">
          {renderMarkdown(ai)}
          <button onClick={onRun} className="mt-4 text-xs text-slate-500 hover:text-amber-400 underline">
            Regenerate
          </button>
        </div>
      )}

      <NavRow>
        <button onClick={onBack} className={secondaryBtn}>← Back</button>
        {onNext && (
          <button onClick={onNext} className={primaryBtn(!!ai)}>
            {nextLabel}
          </button>
        )}
      </NavRow>
    </section>
  )
}
