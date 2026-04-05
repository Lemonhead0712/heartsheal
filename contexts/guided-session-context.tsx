"use client"

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
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
  currentStepIndex:  number         // index of first 'not_started' step; steps.length = all done
  isVisible:         boolean        // overlay open (intro or guided)
  isMinimized:       boolean        // orb visible, overlay hidden
  isComplete:        boolean

  // Write
  markStepComplete:     (id: StepId) => void
  markStepSkipped:      (id: StepId) => void
  minimize:             () => void
  restore:              () => void
  dismiss:              () => void
  advancePhaseToGuided: () => void
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
  markStepComplete:  () => {},
  markStepSkipped:   () => {},
  minimize:          () => {},
  restore:           () => {},
  dismiss:           () => {},
  advancePhaseToGuided: () => {},
}

// ── Context ───────────────────────────────────────────────────────────────────
const GuidedSessionContext = createContext<GuidedSessionContextValue>(DEFAULT_CTX)

export function useGuidedSession(): GuidedSessionContextValue {
  return useContext(GuidedSessionContext)
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function GuidedSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<GuidedSessionState | null>(null)
  const stateRef = useRef<GuidedSessionState | null>(null)

  // Sync ref so callbacks always close over latest state without stale closures
  const setState = useCallback((s: GuidedSessionState) => {
    stateRef.current = s
    setStateRaw(s)
  }, [])

  // Persist + set
  const persist = useCallback((s: GuidedSessionState) => {
    writeStorage(STORAGE_KEYS.guidedSession, s)
    setState(s)
  }, [setState])

  // ── Trigger logic (runs once on mount, SSR-safe) ──────────────────────────
  useEffect(() => {
    const welcomeSeen = readStorage<boolean>(STORAGE_KEYS.welcomeSeen)
    const existing    = readStorage<GuidedSessionState>(STORAGE_KEYS.guidedSession)

    // Onboarding hasn't finished — do nothing this visit
    if (!welcomeSeen) return

    // Already triggered before — restore prior state
    if (existing?.triggered) {
      setState(existing)
      return
    }

    // First-time trigger: delay further if DailyCheckin will also fire today
    const lastCheckin = readStorage<string>(STORAGE_KEYS.lastCheckin)
    const checkinWillFire = lastCheckin !== new Date().toDateString()
    const delay = checkinWillFire ? 5000 : 3000

    const timer = setTimeout(() => {
      const s: GuidedSessionState = {
        triggered: true,
        phase: "intro",
        steps: DEFAULT_STEPS.map((s) => ({ ...s })),
      }
      persist(s)
    }, delay)

    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutation helpers ──────────────────────────────────────────────────────
  const mutate = useCallback((updater: (prev: GuidedSessionState) => GuidedSessionState) => {
    const prev = stateRef.current
    if (!prev) return
    const next = updater(prev)
    persist(next)
  }, [persist])

  const checkAllDone = (steps: GuidedStep[]): Phase => {
    return steps.every((s) => s.status !== "not_started") ? "complete" : stateRef.current?.phase ?? "guided"
  }

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

  // ── Derived values ────────────────────────────────────────────────────────
  const phase            = state?.phase ?? "complete"
  const steps            = state?.steps ?? []
  const currentStepIndex = steps.findIndex((s) => s.status === "not_started")
  const isVisible        = phase === "intro" || phase === "guided"
  const isMinimized      = phase === "minimized"
  const isComplete       = phase === "complete" || state === null

  const value: GuidedSessionContextValue = {
    phase,
    steps,
    currentStepIndex: currentStepIndex === -1 ? steps.length : currentStepIndex,
    isVisible,
    isMinimized,
    isComplete,
    markStepComplete,
    markStepSkipped,
    minimize,
    restore,
    dismiss,
    advancePhaseToGuided,
  }

  return (
    <GuidedSessionContext.Provider value={value}>
      {children}
    </GuidedSessionContext.Provider>
  )
}
