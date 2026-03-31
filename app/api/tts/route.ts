import { NextResponse } from "next/server"

// ElevenLabs "Rachel" — calm, warm, empathetic female voice
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 })

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "TTS not configured" }, { status: 503 })
    }

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
          text,
          model_id: "eleven_turbo_v2",
          voice_settings: {
            stability: 0.75,        // consistent, calm
            similarity_boost: 0.85, // natural warmth
            style: 0.2,             // subtle expression
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
