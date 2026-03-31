"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export type JournalEntry = {
  id: string
  prompt: string | null
  entry: string
  date: string
}

const LS_KEY = "heartsHeal_journalEntries"

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

function lsRead(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function lsWrite(entries: JournalEntry[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(entries)) } catch {}
}

export function useJournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const userId = await getCurrentUserId()
      if (userId) {
        const { data, error } = await supabase
          .from("journal_entries")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false })
        if (error) throw error
        const mapped: JournalEntry[] = (data ?? []).map((r) => ({
          id: r.id,
          prompt: r.prompt ?? null,
          entry: r.entry,
          date: r.date,
        }))
        setEntries(mapped)
        lsWrite(mapped)
      } else {
        setEntries(lsRead())
      }
    } catch {
      setEntries(lsRead())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addEntry = useCallback(async (input: { prompt: string | null; entry: string }): Promise<void> => {
    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      prompt: input.prompt,
      entry: input.entry,
      date: new Date().toISOString(),
    }
    setEntries((prev) => [newEntry, ...prev])
    const current = lsRead()
    lsWrite([newEntry, ...current])
    try {
      const userId = await getCurrentUserId()
      if (userId) {
        await supabase.from("journal_entries").insert({
          id: newEntry.id,
          user_id: userId,
          prompt: newEntry.prompt,
          entry: newEntry.entry,
          date: newEntry.date,
        })
      }
    } catch {}
  }, [])

  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    lsWrite(lsRead().filter((e) => e.id !== id))
    try {
      const userId = await getCurrentUserId()
      if (userId) {
        await supabase.from("journal_entries").delete().eq("id", id).eq("user_id", userId)
      }
    } catch {}
  }, [])

  return { entries, isLoading, addEntry, deleteEntry }
}
