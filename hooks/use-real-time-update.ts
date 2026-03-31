"use client"

import { useState, useEffect } from "react"

/**
 * Returns the current Date and updates it on the given interval (ms).
 */
export function useRealTimeUpdate(intervalMs: number): Date {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
