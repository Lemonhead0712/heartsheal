"use client"

/**
 * Centralised localStorage keys for all HeartsHeal user data.
 * Import this wherever you read/write user data to keep keys consistent.
 */
export const STORAGE_KEYS = {
  emotionLogs:      "heartsHeal_emotionLogs",
  journalEntries:   "heartsHeal_journalEntries",
  quizResults:      "heartsHeal_quizResults",
  userName:         "heartsHeal_userName",
  voice:            "heartsHeal_voice",
  haptic:           "heartsHeal_haptic",
  welcomeSeen:      "heartsHeal_welcomeSeen",
  lastCheckin:      "heartsHeal_lastCheckin",
  lastSession:      "heartsHeal_lastSession",
  surveyResponses:  "heartsHeal_surveyResponses",
  breathingHistory: "heartsHeal_breathingHistory",
  weeklyNarrative:  "heartsHeal_weeklyNarrative",
  lossContext:      "heartsHeal_lossContext",
} as const

/** Read and parse a localStorage key safely. Returns null on error. */
export function readStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** Write a value to localStorage safely. */
export function writeStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error("Storage write failed:", key, e)
  }
}

/** Export ALL user data as a JSON blob download. */
export function exportUserData(): void {
  const data: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    version: 1,
  }
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    data[name] = readStorage(key)
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `heartsheal-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Import user data from a JSON file previously exported. Returns true on success. */
export async function importUserData(file: File): Promise<{ success: boolean; error?: string }> {
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (!data.version) return { success: false, error: "Invalid backup file." }

    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
      if (data[name] !== undefined && data[name] !== null) {
        writeStorage(key, data[name])
      }
    }
    return { success: true }
  } catch {
    return { success: false, error: "Could not read the backup file." }
  }
}

/** Wipe all HeartsHeal data from localStorage. */
export function clearAllData(): void {
  if (typeof window === "undefined") return
  for (const key of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(key)
  }
}
