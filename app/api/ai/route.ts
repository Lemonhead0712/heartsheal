import { NextResponse } from "next/server"

const MAX_MESSAGES = 60
const MAX_MESSAGE_CHARS = 6000

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 })
    }

    // Validate message array
    if (!Array.isArray(body.messages)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    if (body.messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: "Too many messages" }, { status: 400 })
    }
    for (const msg of body.messages) {
      // Skip length check for vision messages (image content blocks are inherently large)
      if (Array.isArray(msg.content) && msg.content.some((c: any) => c.type === "image")) continue
      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
      if (content.length > MAX_MESSAGE_CHARS) {
        return NextResponse.json({ error: "Message too long" }, { status: 400 })
      }
    }

    const isStreaming = body.stream === true

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Anthropic API error:", err)
      return NextResponse.json({ error: "AI service error" }, { status: response.status })
    }

    // Streaming — pass through the SSE body directly
    if (isStreaming && response.body) {
      return new Response(response.body, {
        headers: {
          "Content-Type":      "text/event-stream",
          "Cache-Control":     "no-cache",
          "X-Accel-Buffering": "no",
        },
      })
    }

    // Non-streaming — return JSON as before
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("AI route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
