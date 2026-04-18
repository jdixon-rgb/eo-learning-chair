// Vercel Serverless Function -- Science of Scaling Coach
// Accepts a step ("audit" | "floor" | "blueprint") and user context, calls Claude,
// returns the coaching text. Keeps the Anthropic API key server-side.
//
// Required env var: ANTHROPIC_API_KEY

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1200

function formatCurrency(n, unit) {
  const v = Number(n) || 0
  if (unit === '$') {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
    return `$${v.toLocaleString()}`
  }
  return `${v.toLocaleString()} ${unit}`.trim()
}

function buildContext({ form, goalX }) {
  const unit = form.unit || ''
  const current = formatCurrency(form.currentValue, unit)
  const goal = formatCurrency(Number(form.currentValue) * Number(goalX), unit)
  return `BUSINESS: ${form.business || '(not provided)'}
WHAT THEY SELL: ${form.whatYouSell || '(not provided)'}
PRIMARY METRIC: ${form.metric}
CURRENT VALUE: ${current}
IMPOSSIBLE GOAL (${goalX}x): ${goal}
CURRENT PATHWAYS (how they get ${form.metric}): ${form.currentPathways || '(not provided)'}
CURRENT ACTIVITIES (what they're doing day-to-day): ${form.currentActivities || '(not provided)'}`
}

const SYSTEM_PROMPTS = {
  audit: `You are a Science of Scaling coach. Your job is a Power Law Audit.

Given the founder's context, produce three short sections in plain prose (no preamble):

1. **Power-Law Leverage (the 1-2 activities with true 10x/100x upside)** — name them specifically and explain why they compound.
2. **Linear Traps (what will never scale)** — name the activities that look productive but are linear-return work.
3. **Missing Plays** — 2-3 specific power-law opportunities they are probably missing: strategic partnerships, white-labeling, distribution deals, licensing, platform leverage. Be concrete to their business, not generic.

Write tight. ~250 words total. Use markdown headers (##) and short bullets.`,

  floor: `You are a Science of Scaling coach channeling the Elon Musk framing: "You are optimizing things that shouldn't exist."

Given the founder's context and their impossible goal, produce two sections:

1. **Eliminate (stop optimizing what shouldn't exist)** — specific activities, clients, offers, and mindsets to cut. Be blunt. Name the categories in their business.
2. **Double Down (the 2-3 things that deserve all their energy)** — what to concentrate on to operate from the ${'${goal}'} floor, not the ${'${current}'} floor.

Write tight. ~250 words. Markdown headers and bullets. No warm-up.`,

  blueprint: `You are a Science of Scaling coach. Write a concrete 90-day sprint blueprint.

Given the founder's context and impossible goal, produce:

1. **The One Power-Law Move (Month 1)** — the single biggest leverage action. One paragraph, specific.
2. **The Hire or Partner You Need** — specific role or partner, modeled after examples like Rob bringing in the Little Caesars CFO to run ops. Name the archetype and why.
3. **The Impossible-Goal Conversation (This Week)** — who they must have it with, and the one question to ask.
4. **3 Weekly Numbers to Track** — crisp, named metrics, not vanity numbers.

Write tight. ~300 words. Markdown headers. Actionable, not abstract.`,
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { step, form, goalX } = req.body || {}
  if (!SYSTEM_PROMPTS[step]) {
    return res.status(400).json({ error: `Unknown step: ${step}` })
  }
  if (!form || !form.currentValue) {
    return res.status(400).json({ error: 'form.currentValue is required' })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured.' })
  }

  const context = buildContext({ form, goalX })
  const system = SYSTEM_PROMPTS[step]
    .replace('${goal}', formatCurrency(Number(form.currentValue) * Number(goalX), form.unit))
    .replace('${current}', formatCurrency(form.currentValue, form.unit))

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: 'user', content: context }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Claude API error:', response.status, errText)
      return res.status(502).json({ error: `Claude API error: ${response.status}` })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    return res.status(200).json({ text })
  } catch (err) {
    console.error('Scaling coach error:', err)
    return res.status(500).json({ error: `Failed to generate: ${err.message}` })
  }
}
