import { NextResponse } from "next/server"

// ElevenLabs "Rachel" — calm, warm, empathetic female voice
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

/**
 * Wraps plain text in SSML with:
 * - 90% speaking rate via <prosody rate="90%">
 * - Natural breathing pauses after punctuation via <break> tags
 * Enables warm, unhurried, conversational delivery.
 */
function prepareSSML(text: string): string {
  // Strip any existing HTML/SSML tags for safety, then escape XML chars
  const cleaned = text.replace(/<[^>]+>/g, "")
  const escaped = cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  const withBreaks = escaped
    // Sentence endings — thoughtful pause before continuing
    .replace(/([.!?])\s+/g, '$1<break time="450ms"/> ')
    // Comma / semicolon — brief breath
    .replace(/([,;])\s+/g, '$1<break time="200ms"/> ')
    // Em dash — a moment of thought
    .replace(/\s*—\s*/g, '<break time="300ms"/> ')
    // Ellipsis — contemplative pause
    .replace(/\.\.\.\s*/g, '<break time="500ms"/> ')

  return `<speak><prosody rate="90%">${withBreaks}</prosody></speak>`
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    if (!text || typeof text !== "string") return NextResponse.json({ error: "No text provided" }, { status: 400 })
    if (text.length > 2000) return NextResponse.json({ error: "Text too long" }, { status: 400 })

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "TTS not configured" }, { status: 503 })
    }

    const ssml = prepareSSML(text)

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: ssml,
          model_id: "eleven_multilingual_v2", // highest quality, most natural output
          enable_ssml_parsing: true,           // parse <break> and <prosody> tags
          voice_settings: {
            stability: 0.42,        // slightly lower for more natural pitch variation
            similarity_boost: 0.80, // keeps Rachel's warm character intact
            style: 0.25,            // warmth and expressiveness for empathetic delivery
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error(`ElevenLabs ${response.status}:`, err)
      // 429/529 = rate limited — client will fall back to browser TTS silently
      return NextResponse.json(
        { error: "TTS service error", code: response.status },
        { status: response.status }
      )
    }

    // Pipe audio body directly — client starts receiving bytes immediately
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("TTS route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
