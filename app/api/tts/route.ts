import { NextResponse } from "next/server"

// OpenAI "nova" — warm, natural, female voice (same engine as ChatGPT voice)
const VOICE = "nova"

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    if (!text || typeof text !== "string") return NextResponse.json({ error: "No text provided" }, { status: 400 })
    if (text.length > 2000) return NextResponse.json({ error: "Text too long" }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "TTS not configured" }, { status: 503 })
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",       // highest quality OpenAI TTS model
        input: text,
        voice: VOICE,
        speed: 0.95,             // slightly unhurried, warm conversational pace
        response_format: "mp3",
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error(`OpenAI TTS ${response.status}:`, err)
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
