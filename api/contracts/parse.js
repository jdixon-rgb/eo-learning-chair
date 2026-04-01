// Vercel Serverless Function -- Contract AI Parser
// Downloads a contract document from a signed URL, sends to Claude API,
// and extracts coordinator action items (logistics, AV, setup requirements).
//
// Required env vars (set in Vercel dashboard):
//   ANTHROPIC_API_KEY -- Anthropic API key (already configured for venue lookup)

export default async function handler(req, res) {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { signedUrl, fileName, mimeType } = req.body
  if (!signedUrl) return res.status(400).json({ error: 'signedUrl is required' })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured.' })
  }

  // Step 1: Download the file from the signed URL
  let fileBuffer
  try {
    const fileRes = await fetch(signedUrl)
    if (!fileRes.ok) {
      return res.status(502).json({ error: `Failed to download file: ${fileRes.status}` })
    }
    fileBuffer = Buffer.from(await fileRes.arrayBuffer())
  } catch (err) {
    return res.status(502).json({ error: `Failed to download file: ${err.message}` })
  }

  const base64Data = fileBuffer.toString('base64')

  // Step 2: Determine media type for Claude
  // Claude supports PDF natively as a document type; images as image type
  const isPdf = mimeType === 'application/pdf'
  const isImage = mimeType?.startsWith('image/')
  const isWord = mimeType?.includes('word') || mimeType?.includes('openxmlformats')

  // Build the content array for Claude
  const content = []

  if (isPdf) {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
    })
  } else if (isImage) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: mimeType, data: base64Data },
    })
  } else if (isWord) {
    // Word docs: send as document type (Claude handles docx)
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: mimeType, data: base64Data },
    })
  } else {
    return res.status(400).json({ error: `Unsupported file type: ${mimeType}` })
  }

  content.push({
    type: 'text',
    text: `You are analyzing a speaker contract for an EO (Entrepreneurs' Organization) chapter event.

Extract every specific logistical requirement, setup need, or deliverable that the event coordinator must arrange. Focus on:
- Stage/room setup requirements (lectern, podium, table, chair, staging)
- Audio/visual needs (microphone type, screens, projector, confidence monitor, recording)
- Electrical/power requirements
- Hospitality/green room requirements (food, beverages, temperature)
- Travel & transportation (airport pickup, hotel, ground transport)
- Timing requirements (load-in time, sound check, meet & greet)
- Materials (handouts, books, merch table space)
- Restrictions or prohibitions (no recording, no photography, dietary restrictions)
- Insurance or liability items
- Any other specific deliverable the venue/chapter must provide

For each item, provide:
- "text": A clear, actionable description of what needs to be done (imperative sentence)
- "category": One of: "AV/Tech", "Stage Setup", "Hospitality", "Travel", "Timing", "Materials", "Restrictions", "Insurance", "Other"

Return ONLY a JSON array. No markdown fences, no explanations. Example:
[{"text": "Provide wireless lavalier microphone", "category": "AV/Tech"}, {"text": "Set up lectern with reading light and power outlet", "category": "Stage Setup"}]

If the document is not a speaker contract or contains no actionable coordinator requirements, return an empty array: []`,
  })

  // Step 3: Call Claude API
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250627',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Claude API error:', response.status, errText)
      return res.status(502).json({ error: `Claude API error: ${response.status}` })
    }

    const data = await response.json()
    const text = data.content[0].text.trim()
    const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
    const items = JSON.parse(cleaned)

    // Add "done: false" to each item if not present
    const actionItems = (Array.isArray(items) ? items : []).map(item => ({
      text: item.text || '',
      category: item.category || 'Other',
      done: false,
    }))

    return res.status(200).json({ items: actionItems })
  } catch (err) {
    console.error('Contract parse error:', err)
    return res.status(500).json({ error: `Failed to parse contract: ${err.message}` })
  }
}
