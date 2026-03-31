"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"

export type EmotionEntry = {
  id: string
  emotion: string
  emoji: string
  intensity: number
  notes: string
  timestamp: string
}

type AddEntryInput = {
  emotion: string
  emoji: string
  intensity: number
  notes: string
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

export function useEmotionLogs() {
  const [entries, setEntries]     = useState<EmotionEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const userId = await getCurrentUserId()
      if (userId) {
        const { data, error: err } = await supabase
          .from("emotion_logs")
          .select("*")
          .eq("user_id", userId)
          .order("timestamp", { ascending: false })
        if (err) throw err
        const mapped: EmotionEntry[] = (data ?? []).map((r) => ({
          id: r.id, emotion: r.emotion, emoji: r.emoji ?? "😶",
          intensity: r.intensity ?? 5, notes: r.notes ?? "", timestamp: r.timestamp,
        }))
        setEntries(mapped)
        writeStorage(STORAGE_KEYS.emotionLogs, mapped)
      } else {
        setEntries(readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs) ?? [])
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load entries")
      setEntries(readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs) ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addEntry = useCallback(async (input: AddEntryInput): Promise<boolean> => {
    const entry: EmotionEntry = {
      id: crypto.randomUUID(), emotion: input.emotion, emoji: input.emoji,
      intensity: input.intensity, notes: input.notes, timestamp: new Date().toISOString(),
    }
    setEntries((prev) => [entry, ...prev])
    const current = readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs) ?? []
    writeStorage(STORAGE_KEYS.emotionLogs, [entry, ...current])
    try {
      const userId = await getCurrentUserId()
      if (userId) {
        await supabase.from("emotion_logs").insert({
          id: entry.id, user_id: userId, emotion: entry.emotion,
          emoji: entry.emoji, intensity: entry.intensity, notes: entry.notes, timestamp: entry.timestamp,
        })
      }
    } catch {}
    return true
  }, [])

  const deleteEntry = useCallback(async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    writeStorage(STORAGE_KEYS.emotionLogs, (readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs) ?? []).filter((e) => e.id !== id))
    try {
      const userId = await getCurrentUserId()
      if (userId) await supabase.from("emotion_logs").delete().eq("id", id).eq("user_id", userId)
    } catch {}
  }, [])

  return { entries, isLoading, error, addEntry, deleteEntry, refresh: load }
}
