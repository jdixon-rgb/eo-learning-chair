// Vercel Serverless Function — Constitution PDF Parser
// Accepts a base64-encoded PDF, asks Claude to extract a forum
// constitution's title, preamble, and numbered sections, and returns
// structured JSON the client can drop into a draft constitution.
//
// Required env var: ANTHROPIC_API_KEY (already configured in Vercel).
//
// Body shape:    { pdfBase64: string, fileName?: string }
// Success shape: { title: string, preamble: string, sections: [{heading, body}] }
// Error shape:   { error: string }

const SYSTEM_INSTRUCTIONS = `You are extracting the structure of a forum or chapter constitution from a PDF.

Return ONLY a JSON object with this exact shape — no markdown fences, no commentary:
{
  "title": "string (the constitution's title; empty string if none)",
  "preamble": "string (any opening text that precedes the first numbered or headed section; empty string if none)",
  "sections": [
    { "heading": "string", "body": "string" }
  ]
}

Rules:
- Each top-level section, article, or numbered clause becomes one entry in the sections array, in document order.
- Drop the leading numbering or label from the heading (e.g. "Article I: Mission" → "Mission"; "1. Confidentiality" → "Confidentiality"; "Section A — Membership" → "Membership"). Numbering will be re-applied when the constitution is rendered.
- Preserve paragraph breaks inside body text using \\n\\n between paragraphs. Do not use markdown for bold or italic.
- If the document has nested subsections, fold them into the parent body using the original sub-heading as a line followed by its text. Separate sub-blocks with blank lines. Don't flatten subsections into separate top-level sections unless they are clearly co-equal articles.
- Use the document's actual wording. Do not paraphrase, summarize, rewrite, or add anything that isn't in the document.
- If the document doesn't look like a constitution (it's a meeting agenda, a flyer, an article, etc.), return: { "title": "", "preamble": "", "sections": [] }`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pdfBase64 } = req.body || {}
  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    return res.status(400).json({ error: 'pdfBase64 is required' })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured.' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
            { type: 'text', text: SYSTEM_INSTRUCTIONS },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Claude API error:', response.status, errText)
      return res.status(502).json({ error: `Claude API error: ${response.status}` })
    }

    const data = await response.json()
    const text = (data?.content?.[0]?.text || '').trim()
    const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (err) {
      console.error('Failed to parse Claude JSON:', err.message, cleaned.slice(0, 200))
      return res.status(502).json({ error: 'Model returned non-JSON output.' })
    }

    const sections = Array.isArray(parsed.sections) ? parsed.sections : []
    const cleanSections = sections
      .filter(s => s && (s.heading || s.body))
      .map(s => ({ heading: String(s.heading || '').trim(), body: String(s.body || '').trim() }))

    return res.status(200).json({
      title: String(parsed.title || '').trim(),
      preamble: String(parsed.preamble || '').trim(),
      sections: cleanSections,
    })
  } catch (err) {
    console.error('Constitution parse error:', err)
    return res.status(500).json({ error: `Failed to parse constitution: ${err.message}` })
  }
}
