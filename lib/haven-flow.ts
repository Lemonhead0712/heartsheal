/**
 * Haven Navigation Flow
 *
 * Computes an AI-style personalised sequence of healing tools based on the
 * user's current emotional state, then persists the flow in localStorage so
 * every tool page can read, advance, and clear it.
 */

export type FlowTool = "breathe" | "burn" | "journal" | "analyze"

// Flow-specific routes — separate from standalone pages
export const TOOL_HREFS: Record<FlowTool, string> = {
  breathe: "/flow/breathe",
  burn:    "/flow/burn",
  journal: "/flow/journal",
  analyze: "/flow/analyze",
}

// Standalone page routes — for direct/dashboard access
export const STANDALONE_HREFS: Record<FlowTool, string> = {
  breathe: "/breathe",
  burn:    "/burn",
  journal: "/thoughts",
  analyze: "/analyze",
}

export const TOOL_LABELS: Record<FlowTool, string> = {
  breathe: "Breathing",
  burn:    "Burn Letter",
  journal: "Journal",
  analyze: "Analyze",
}

export interface HavenFlowState {
  sequence:     FlowTool[]
  currentIndex: number
  sessionId:    string
  emotion?:     string
  intensity?:   number
}

const STORAGE_KEY = "haven_flow"

// ── Sequencer ─────────────────────────────────────────────────────────────────

function computeFlowSequence(
  emotion?:   string,
  intensity?: number,
  lossType?:  string,
): FlowTool[] {
  const em  = (emotion ?? "").toLowerCase()
  const hi  = typeof intensity === "number" && intensity >= 7
  const mid = typeof intensity === "number" && intensity >= 4 && intensity < 7

  // Acute grief / high-intensity sadness → ground first, then release, reflect, analyse
  if (hi && (em.includes("grief") || em.includes("loss") || em.includes("sad") || lossType)) {
    return ["breathe", "burn", "journal", "analyze"]
  }

  // Anger / frustration → release first, then calm, then reflect
  if (em.includes("anger") || em.includes("angry") || em.includes("frustrat") || em.includes("rage")) {
    return ["burn", "breathe", "journal", "analyze"]
  }

  // Anxiety / panic → calm first, then write, then pattern insight
  if (em.includes("anxi") || em.includes("panic") || em.includes("worry") || em.includes("worr") || em.includes("stress")) {
    return ["breathe", "journal", "analyze", "burn"]
  }

  // Medium-intensity sadness / grief → release, then ground, then reflect
  if (mid && (em.includes("sad") || em.includes("grief") || em.includes("loss") || em.includes("heartbreak"))) {
    return ["burn", "breathe", "journal", "analyze"]
  }

  // Numb / disconnected → writing unlocks feeling
  if (em.includes("numb") || em.includes("empty") || em.includes("detach")) {
    return ["journal", "breathe", "analyze", "burn"]
  }

  // Hopeful / calm → light touch, no burn needed up front
  if (em.includes("hopeful") || em.includes("calm") || em.includes("grateful") || em.includes("okay")) {
    return ["breathe", "journal", "analyze", "burn"]
  }

  // Default
  return ["breathe", "journal", "burn", "analyze"]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function startHavenFlow(
  emotion?:   string,
  intensity?: number,
  lossType?:  string,
): HavenFlowState {
  const sequence = computeFlowSequence(emotion, intensity, lossType)
  const state: HavenFlowState = {
    sequence,
    currentIndex: 0,
    sessionId:    Date.now().toString(),
    emotion,
    intensity,
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
    return raw ? (JSON.parse(raw) as HavenFlowState) : null
  } catch {
    return null
  }
}

/**
 * Advance one step in the active flow.
 * Returns the next FlowTool, or null when the sequence is exhausted
 * (caller should navigate to /insights in that case).
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

export function clearHavenFlow(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY)
  }
}
