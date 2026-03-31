"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Mood = {
  id: string
  label: string
  emoji: string
}

const moods: Mood[] = [
  { id: "grief",     label: "Grieving",   emoji: "🕊️" },
  { id: "sad",       label: "Sad",        emoji: "💧" },
  { id: "anxious",   label: "Anxious",    emoji: "🌀" },
  { id: "angry",     label: "Angry",      emoji: "🔥" },
  { id: "lost",      label: "Lost",       emoji: "🌫️" },
  { id: "hopeful",   label: "Hopeful",    emoji: "🌱" },
  { id: "numb",      label: "Numb",       emoji: "❄️" },
  { id: "grateful",  label: "Grateful",   emoji: "✨" },
]

interface Props {
  onPromptSelect?: (prompt: string) => void
}

export function AiJournalPrompt({ onPromptSelect }: Props) {
  const [expanded, setExpanded]       = useState(false)
  const [selectedMood, setMood]       = useState<Mood | null>(null)
  const [prompt, setPrompt]           = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const generatePrompt = async (mood: Mood) => {
    setMood(mood)
    setIsLoading(true)
    setError(null)
    setPrompt(null)

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: `You generate compassionate, trauma-informed journaling prompts for people healing from loss, grief, or emotional pain. 
          
          Rules:
          - The prompt should be a single, open-ended question or gentle invitation to reflect
          - Never more than 2 sentences
          - Warm, non-judgmental, and emotionally attuned to the mood
          - Avoid toxic positivity or pressure to feel a certain way
          - Ground the prompt in the present moment or the person's inner experience
          - Output ONLY the prompt itself, no preamble, no quotes`,
          messages: [
            {
              role: "user",
              content: `Generate a unique journaling prompt for someone who is feeling: ${mood.label} (${mood.id}). Make it gentle and specific to this emotional state.`
            }
          ]
        }),
      })

      if (!response.ok) throw new Error("Failed to generate prompt")
      const data = await response.json()
      const text = data.content?.[0]?.text?.trim()
      if (text) {
        setPrompt(text)
      } else {
        throw new Error("Empty response")
      }
    } catch (err) {
      setError("Couldn't generate a prompt. Try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUsePrompt = () => {
    if (prompt && onPromptSelect) {
      onPromptSelect(prompt)
    }
  }

  return (
    <div className="rounded-2xl border border-primary/15 overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-rose-50/80 to-primary/5 dark:from-rose-900/20 dark:to-primary/10 text-left group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">AI Journal Prompt</p>
            <p className="text-xs text-muted-foreground">Get a personalized prompt based on how you feel</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 py-5 bg-card border-t border-border/40 space-y-5">
              {/* Mood selector */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">How are you feeling right now?</p>
                <div className="grid grid-cols-4 gap-2">
                  {moods.map((mood) => (
                    <button
                      key={mood.id}
                      onClick={() => generatePrompt(mood)}
                      disabled={isLoading}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all duration-200",
                        selectedMood?.id === mood.id
                          ? "border-primary/40 bg-primary/8 text-primary"
                          : "border-border/50 hover:border-primary/25 hover:bg-primary/4 text-muted-foreground hover:text-foreground",
                        isLoading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="text-lg leading-none">{mood.emoji}</span>
                      <span className="text-[10px] font-medium leading-tight">{mood.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generated prompt */}
              <AnimatePresence mode="wait">
                {isLoading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 py-3 px-4 rounded-xl bg-muted/50"
                  >
                    <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Crafting your prompt…</span>
                  </motion.div>
                )}

                {error && !isLoading && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-destructive bg-destructive/8 rounded-xl px-4 py-3"
                  >
                    {error}
                  </motion.div>
                )}

                {prompt && !isLoading && (
                  <motion.div
                    key={prompt}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-3"
                  >
                    <div className="relative px-5 py-4 rounded-xl bg-gradient-to-br from-primary/5 to-rose-50/60 dark:from-primary/10 dark:to-rose-900/15 border border-primary/15">
                      <span className="absolute top-2 left-3 font-serif text-4xl leading-none text-primary/15 select-none" aria-hidden>❝</span>
                      <p className="font-serif text-base text-foreground/85 leading-relaxed italic pl-3 pt-1">
                        {prompt}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleUsePrompt}
                        size="sm"
                        className="rounded-xl flex-1 text-xs"
                      >
                        Use This Prompt
                      </Button>
                      <Button
                        onClick={() => selectedMood && generatePrompt(selectedMood)}
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-xs gap-1.5"
                      >
                        <RefreshCw className="w-3 h-3" />
                        New Prompt
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
