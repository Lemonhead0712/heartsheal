/**
 * Haven Navigation Flow
 *
 * Computes a fixed healing sequence, persists state in localStorage, and
 * carries a growing conversation log so Haven's responses are contextually
 * aware across every exercise in the session.
 */

export type FlowTool = "breathe" | "journal" | "burn" | "quiz" | "survey" | "analyze"

export type FlowMessage = { role: "user" | "assistant"; content: string }

export const TOOL_HREFS: Record<FlowTool, string> = {
  breathe: "/breathe",
  journal: "/thoughts",
  burn:    "/burn",
  quiz:    "/self-discovery",
  survey:  "/wellbeing",
  analyze: "/analyze",
}

export const TOOL_LABELS: Record<FlowTool, string> = {
  breathe: "Breathing",
  journal: "Journal",
  burn:    "Burn Letter",
  quiz:    "Self-Discovery",
  survey:  "Wellbeing Check",
  analyze: "Analyze",
}

export interface HavenFlowState {
  sequence:        FlowTool[]
  currentIndex:    number
  sessionId:       string
  emotion?:        string
  intensity?:      number
  conversationLog: FlowMessage[]   // persisted across all exercises
}

const STORAGE_KEY = "haven_flow"

// ── Dynamic sequence — tailored to emotion and intensity ──────────────────────

function computeFlowSequence(emotion?: string, intensity?: number): FlowTool[] {
  const level = intensity ?? 5

  // High-release emotions (anger, grief) — prioritise physical release + processing
  if (emotion === "Angry" || emotion === "Grief") {
    if (level >= 7) return ["breathe", "burn", "journal", "quiz", "survey", "analyze"]
    if (level >= 4) return ["breathe", "burn", "journal", "survey"]
    return ["breathe", "journal", "survey"]
  }

  // Anxiety — lead with calm, then reflection
  if (emotion === "Anxious") {
    if (level >= 7) return ["breathe", "journal", "burn", "survey", "analyze"]
    if (level >= 4) return ["breathe", "journal", "survey"]
    return ["breathe", "journal"]
  }

  // Numb / Sad — gentle grounding before expression
  if (emotion === "Numb" || emotion === "Sad") {
    if (level >= 7) return ["breathe", "journal", "burn", "survey", "analyze"]
    if (level >= 4) return ["breathe", "journal", "burn", "survey"]
    return ["breathe", "journal", "survey"]
  }

  // Positive emotions — reflective, insight-focused
  if (emotion === "Calm" || emotion === "Hopeful" || emotion === "Grateful") {
    if (level >= 7) return ["journal", "quiz", "survey", "analyze"]
    return ["journal", "quiz", "survey"]
  }

  // Default by intensity tier
  if (level >= 8) return ["breathe", "journal", "burn", "quiz", "survey", "analyze"]
  if (level >= 5) return ["breathe", "journal", "burn", "survey"]
  return ["breathe", "journal", "survey"]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function startHavenFlow(
  emotion?:   string,
  intensity?: number,
  _lossType?: string,   // kept for API compat, no longer affects sequence
): HavenFlowState {
  const state: HavenFlowState = {
    sequence:        computeFlowSequence(emotion, intensity),
    currentIndex:    0,
    sessionId:       Date.now().toString(),
    emotion,
    intensity,
    conversationLog: [],
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
  return state
}

export function readHavenFlow(): HavenFlowState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as HavenFlowState
    // Back-compat: ensure conversationLog exists
    if (!parsed.conversationLog) parsed.conversationLog = []
    return parsed
  } catch {
    return null
  }
}

/**
 * Advance one step. Returns the next FlowTool, or null when exhausted
 * (caller should navigate to /insights?flow=done).
 */
export function advanceHavenFlow(): FlowTool | null {
  const state = readHavenFlow()
  if (!state) return null

  const nextIndex = state.currentIndex + 1
  if (nextIndex >= state.sequence.length) {
    clearHavenFlow()
    return null
  }

  const updated: HavenFlowState = { ...state, currentIndex: nextIndex }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated.sequence[nextIndex]
}

/**
 * Append a message to the persistent conversation log.
 * Called by HavenFlowGuide after every user/assistant exchange.
 */
export function appendFlowMessage(role: "user" | "assistant", content: string): void {
  const state = readHavenFlow()
  if (!state) return
  const updated: HavenFlowState = {
    ...state,
    conversationLog: [...state.conversationLog, { role, content }],
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function clearHavenFlow(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY)
  }
}
