"use client"

import { createContext, useContext, useRef, useState, useCallback } from "react"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"

// ── Types ─────────────────────────────────────────────────────────────────────
export type StepId     = "emotion-checkin" | "breathe" | "journal" | "insights"
export type StepStatus = "not_started" | "completed" | "skipped"
export type Phase      = "intro" | "guided" | "minimized" | "complete"

export type GuidedStep = { id: StepId; status: StepStatus }

export type GuidedSessionState = {
  triggered: boolean
  phase: Phase
  steps: GuidedStep[]
}

type GuidedSessionContextValue = {
  // Read
  phase:             Phase
  steps:             GuidedStep[]
  currentStepIndex:  number
  isVisible:         boolean
  isMinimized:       boolean
  isComplete:        boolean
  hasTriggered:      boolean

  // Write
  markStepComplete:     (id: StepId) => void
  markStepSkipped:      (id: StepId) => void
  minimize:             () => void
  restore:              () => void
  dismiss:              () => void
  advancePhaseToGuided: () => void
  startSession:         () => void
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const STEP_IDS: StepId[] = ["emotion-checkin", "breathe", "journal", "insights"]

const DEFAULT_STEPS: GuidedStep[] = STEP_IDS.map((id) => ({
  id,
  status: "not_started",
}))

const DEFAULT_CTX: GuidedSessionContextValue = {
  phase:             "complete",
  steps:             [],
  currentStepIndex:  0,
  isVisible:         false,
  isMinimized:       false,
  isComplete:        true,
  hasTriggered:      false,
  markStepComplete:  () => {},
  markStepSkipped:   () => {},
  minimize:          () => {},
  restore:           () => {},
  dismiss:           () => {},
  advancePhaseToGuided: () => {},
  startSession:      () => {},
}

// ── Context ───────────────────────────────────────────────────────────────────
const GuidedSessionContext = createContext<GuidedSessionContextValue>(DEFAULT_CTX)

export function useGuidedSession(): GuidedSessionContextValue {
  return useContext(GuidedSessionContext)
}

// ── Build a fresh intro session ───────────────────────────────────────────────
function buildFreshSession(): GuidedSessionState {
  return {
    triggered: true,
    phase: "intro",
    steps: DEFAULT_STEPS.map((s) => ({ ...s })),
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function GuidedSessionProvider({ children }: { children: React.ReactNode }) {

  // ── Synchronous init from localStorage ─────────────────────────────────────
  // Runs in the same render cycle as the first paint — Haven is visible
  // from frame one for new users, no async delay or flash of the home page.
  // SSR: `typeof window === "undefined"` → returns null (overlay hidden on server).
  const [state, setStateRaw] = useState<GuidedSessionState | null>(() => {
    if (typeof window === "undefined") return null

    const existing = readStorage<GuidedSessionState>(STORAGE_KEYS.guidedSession)

    // Returning visitor — restore whatever state they left off at
    if (existing?.triggered) return existing

    // First visit — open Haven immediately
    const fresh = buildFreshSession()
    writeStorage(STORAGE_KEYS.guidedSession, fresh)
    return fresh
  })

  const stateRef = useRef<GuidedSessionState | null>(state)

  const setState = useCallback((s: GuidedSessionState) => {
    stateRef.current = s
    setStateRaw(s)
  }, [])

  const persist = useCallback((s: GuidedSessionState) => {
    writeStorage(STORAGE_KEYS.guidedSession, s)
    setState(s)
  }, [setState])

  // ── Mutation helpers ──────────────────────────────────────────────────────
  const mutate = useCallback((updater: (prev: GuidedSessionState) => GuidedSessionState) => {
    const prev = stateRef.current
    if (!prev) return
    persist(updater(prev))
  }, [persist])

  const checkAllDone = (steps: GuidedStep[]): Phase =>
    steps.every((s) => s.status !== "not_started") ? "complete" : stateRef.current?.phase ?? "guided"

  const markStepComplete = useCallback((id: StepId) => {
    mutate((prev) => {
      const steps = prev.steps.map((s) => s.id === id ? { ...s, status: "completed" as StepStatus } : s)
      return { ...prev, steps, phase: checkAllDone(steps) }
    })
  }, [mutate]) // eslint-disable-line react-hooks/exhaustive-deps

  const markStepSkipped = useCallback((id: StepId) => {
    mutate((prev) => {
      const steps = prev.steps.map((s) => s.id === id ? { ...s, status: "skipped" as StepStatus } : s)
      return { ...prev, steps, phase: checkAllDone(steps) }
    })
  }, [mutate]) // eslint-disable-line react-hooks/exhaustive-deps

  const minimize             = useCallback(() => mutate((p) => ({ ...p, phase: "minimized" })), [mutate])
  const restore              = useCallback(() => mutate((p) => ({ ...p, phase: "guided" })), [mutate])
  const dismiss              = useCallback(() => mutate((p) => ({ ...p, phase: "complete" })), [mutate])
  const advancePhaseToGuided = useCallback(() => mutate((p) => ({ ...p, phase: "guided" })), [mutate])
  const startSession         = useCallback(() => persist(buildFreshSession()), [persist])

  // ── Derived values ────────────────────────────────────────────────────────
  const phase            = state?.phase ?? "complete"
  const steps            = state?.steps ?? []
  const currentStepIndex = steps.findIndex((s) => s.status === "not_started")
  const isVisible        = phase === "intro" || phase === "guided"
  const isMinimized      = phase === "minimized"
  const isComplete       = phase === "complete" || state === null
  const hasTriggered     = state?.triggered ?? false

  const value: GuidedSessionContextValue = {
    phase,
    steps,
    currentStepIndex: currentStepIndex === -1 ? steps.length : currentStepIndex,
    isVisible,
    isMinimized,
    isComplete,
    hasTriggered,
    markStepComplete,
    markStepSkipped,
    minimize,
    restore,
    dismiss,
    advancePhaseToGuided,
    startSession,
  }

  return (
    <GuidedSessionContext.Provider value={value}>
      {children}
    </GuidedSessionContext.Provider>
  )
}
