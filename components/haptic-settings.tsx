"use client"

import { useState, useEffect } from "react"
import { Vibrate } from "lucide-react"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "heartsheal_haptic_enabled"

interface HapticSettingsProps {
  className?: string
}

export function HapticSettings({ className }: HapticSettingsProps) {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setEnabled(stored === "true")
    }
  }, [])

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  const supported =
    typeof window !== "undefined" && "vibrate" in navigator

  return (
    <div className={cn("glass-card rounded-2xl p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Vibrate className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Haptic Feedback</p>
            <p className="text-xs text-muted-foreground">
              {supported ? "Vibration on interactions" : "Not supported on this device"}
            </p>
          </div>
        </div>

        <button
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle haptic feedback"
          onClick={toggle}
          disabled={!supported}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
            enabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
              enabled ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
    </div>
  )
}
