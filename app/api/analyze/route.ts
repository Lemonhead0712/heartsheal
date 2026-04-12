import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { imageBase64, mimeType } = await req.json()

  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: "Missing image data" }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 503 })

  const body = {
    model: "claude-sonnet-4-5",
    max_tokens: 700,
    system: `You are a compassionate emotional intelligence coach specializing in helping people heal from difficult relationships and communication patterns.

Analyze the provided screenshot of a text conversation and return ONLY valid JSON — no preamble, no markdown fences, no explanation outside the JSON.

Return this exact shape:
{
  "patternType": "one of exactly: avoidant | manipulative | breadcrumbing | healthy | dismissive | anxious | boundary-crossing",
  "pattern": "2-3 warm sentences describing what communication pattern you observed and why it can feel confusing or painful to receive",
  "emotional_impact": "1-2 sentences on how this pattern likely affected the person receiving these messages emotionally — validate their experience",
  "exercise": "A specific 2-minute healing exercise (breathing technique, grounding method, or journaling prompt) that directly addresses healing from this specific pattern",
  "affirmation": "A single warm, specific affirmation sentence for someone healing from this interaction — something they can hold onto"
}

Guidelines:
- Be warm and non-judgmental toward both people in the conversation
- Focus entirely on the user's healing journey, not on diagnosing or blaming the other person
- If the conversation is healthy, celebrate it — not every relationship is toxic
- If the image is not a conversation screenshot, return patternType: "healthy" and gently note you couldn't detect a clear pattern`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType, data: imageBase64 },
          },
          {
            type: "text",
            text: "Please analyze the emotional patterns in this conversation screenshot and return the JSON as specified.",
          },
        ],
      },
    ],
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("Anthropic error:", err)
      return NextResponse.json({ error: "Analysis failed" }, { status: 502 })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text?.trim() ?? ""

    // Strip markdown fences if Claude wraps them anyway
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim()
    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch (e) {
    console.error("Analyze route error:", e)
    return NextResponse.json({ error: "Could not parse analysis" }, { status: 500 })
  }
}
