import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 })
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
