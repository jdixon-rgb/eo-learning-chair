// Vercel Serverless Function — Venue Auto-Lookup
// Uses Claude API for venue details + Google Places API for photo & address verification
//
// Required env vars (set in Vercel dashboard):
//   ANTHROPIC_API_KEY   — Anthropic API key
//   GOOGLE_PLACES_API_KEY — Google Places API key (optional, for photo + address verification)

export default async function handler(req, res) {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, location } = req.body
  if (!name) return res.status(400).json({ error: 'Venue name is required' })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const googleKey = process.env.GOOGLE_PLACES_API_KEY

  if (!anthropicKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it in Vercel → Settings → Environment Variables.' })
  }

  let venueInfo = {}
  let imageUrl = null

  // ── Step 1: Claude AI lookup ──────────────────────────────
  try {
    const prompt = `Given the venue name "${name}"${location ? ` in or near ${location}` : ', likely in the Phoenix/Scottsdale, Arizona area'}, return a JSON object with these exact keys:
- "address" (full street address including city, state, zip)
- "city" (city name only)
- "state" (two-letter state abbreviation)
- "zip" (5-digit zip code)
- "description" (1-2 sentences describing the venue, its vibe, and what makes it special)
- "category" (exactly one of: "hotel", "restaurant", "museum", "outdoor", "private", "theater", "other")
- "capacity_estimate" (estimated max event capacity as a number, or null if unknown)

Return ONLY valid JSON. No markdown fences, no explanations.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const text = data.content[0].text.trim()
      // Strip markdown fences if present
      const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      venueInfo = JSON.parse(cleaned)
    } else {
      const err = await response.text()
      console.error('Claude API error:', response.status, err)
    }
  } catch (e) {
    console.error('Claude API error:', e.message)
  }

  // ── Step 2: Google Places lookup for photo + verification ─
  if (googleKey) {
    try {
      const searchQuery = encodeURIComponent(
        `${name}${venueInfo.city ? ` ${venueInfo.city} ${venueInfo.state || ''}` : location ? ` ${location}` : ' Arizona'}`
      )
      const placesRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${searchQuery}&inputtype=textquery&fields=photos,geometry,formatted_address&key=${googleKey}`
      )
      const placesData = await placesRes.json()

      if (placesData.candidates?.[0]) {
        const candidate = placesData.candidates[0]

        // Get photo URL — follow redirect to get the CDN URL (no API key exposed)
        if (candidate.photos?.[0]) {
          const photoRef = candidate.photos[0].photo_reference
          const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${googleKey}`
          try {
            const photoRes = await fetch(photoApiUrl, { redirect: 'manual' })
            imageUrl = photoRes.headers.get('location') || photoApiUrl
          } catch {
            imageUrl = photoApiUrl
          }
        }

        // Use Google's formatted address as verification
        if (candidate.formatted_address) {
          venueInfo.google_verified_address = candidate.formatted_address
        }

        // Get coordinates
        if (candidate.geometry?.location) {
          venueInfo.latitude = candidate.geometry.location.lat
          venueInfo.longitude = candidate.geometry.location.lng
        }
      }
    } catch (e) {
      console.error('Google Places API error:', e.message)
    }
  }

  return res.status(200).json({
    ...venueInfo,
    image_url: imageUrl,
    sources: {
      claude: true,
      google_places: !!googleKey,
    },
  })
}
