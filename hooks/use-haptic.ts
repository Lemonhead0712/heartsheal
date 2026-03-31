"use client"

import { useCallback } from "react"

interface UseHapticReturn {
  triggerHaptic: (pattern?: number | number[]) => void
}

export function useHaptic(): UseHapticReturn {
  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern)
      } catch {
        // vibrate not supported or permission denied — ignore silently
      }
    }
  }, [])

  return { triggerHaptic }
}
