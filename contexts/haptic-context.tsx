"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"

type HapticIntensity = "light" | "medium" | "heavy"

const INTENSITY_MS: Record<HapticIntensity, number> = {
  light: 8,
  medium: 15,
  heavy: 25,
}

interface HapticSettings {
  enabled: boolean
}

interface HapticContextValue {
  haptic: (intensity?: HapticIntensity) => void
  settings: HapticSettings
  setSettings: (s: HapticSettings) => void
}

const HapticContext = createContext<HapticContextValue>({
  haptic: () => {},
  settings: { enabled: true },
  setSettings: () => {},
})

const STORAGE_KEY = "heartsheal_haptic_enabled"

export function HapticProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<HapticSettings>({ enabled: true })

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setSettingsState({ enabled: stored === "true" })
    }
  }, [])

  const setSettings = useCallback((s: HapticSettings) => {
    setSettingsState(s)
    localStorage.setItem(STORAGE_KEY, String(s.enabled))
  }, [])

  const haptic = useCallback(
    (intensity: HapticIntensity = "light") => {
      if (!settings.enabled) return
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(INTENSITY_MS[intensity])
        } catch {
          // Not supported — ignore
        }
      }
    },
    [settings.enabled],
  )

  return (
    <HapticContext.Provider value={{ haptic, settings, setSettings }}>
      {children}
    </HapticContext.Provider>
  )
}

export function useHapticContext(): HapticContextValue {
  return useContext(HapticContext)
}
