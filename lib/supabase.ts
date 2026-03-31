import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

export const supabase = createClient(url, key)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; name: string | null; created_at: string }
        Insert: { id: string; name?: string | null }
        Update: { name?: string | null }
      }
      emotion_logs: {
        Row: { id: string; user_id: string; emotion: string; emoji: string | null; intensity: number | null; notes: string | null; timestamp: string }
        Insert: { user_id: string; emotion: string; emoji?: string | null; intensity?: number | null; notes?: string | null; timestamp?: string }
      }
      journal_entries: {
        Row: { id: string; user_id: string; prompt: string | null; entry: string; date: string }
        Insert: { user_id: string; prompt?: string | null; entry: string; date?: string }
      }
      quiz_results: {
        Row: { id: string; user_id: string; type: string; score: number | null; category_scores: any; date: string }
        Insert: { user_id: string; type: string; score?: number | null; category_scores?: any; date?: string }
      }
    }
  }
}
