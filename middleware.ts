import { NextRequest, NextResponse } from "next/server"

// In-memory store: ip -> { count, resetAt }
// Note: resets on cold start (acceptable for testing phase)
const store = new Map<string, { count: number; resetAt: number }>()

const LIMITS: Record<string, number> = {
  "/api/ai":  10, // 10 requests per minute
  "/api/tts": 20, // 20 requests per minute
}

const WINDOW_MS = 60_000 // 1 minute

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Find matching route prefix
  const limitKey = Object.keys(LIMITS).find((k) => pathname.startsWith(k))
  if (!limitKey) return NextResponse.next()

  const limit = LIMITS[limitKey]
  const ip = getIP(req)
  const key = `${ip}:${limitKey}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return NextResponse.next()
  }

  if (entry.count >= limit) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      }
    )
  }

  entry.count++
  return NextResponse.next()
}

export const config = {
  matcher: ["/api/ai/:path*", "/api/tts/:path*"],
}
