"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, Send, Heart, Sparkles, RefreshCw, AlertCircle, Mic, MicOff, Volume2, VolumeX, Square, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PageContainer } from "@/components/page-container"
import { cn } from "@/lib/utils"
import { useTTS, useSTT } from "@/hooks/use-speech"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import type { EmotionEntry } from "@/hooks/use-emotion-logs"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

type LossType = {
  id: string
  label: string
  emoji: string
  description: string
}

const lossTypes: LossType[] = [
  { id: "grief",    label: "Losing Someone",    emoji: "🕊️", description: "Death of a loved one, pet, or someone close" },
  { id: "breakup",  label: "Heartbreak",         emoji: "💔", description: "Breakup, divorce, or relationship ending" },
  { id: "job",      label: "Career Loss",         emoji: "🌱", description: "Job loss, career change, or professional setback" },
  { id: "family",   label: "Family Estrangement", emoji: "🌿", description: "Distance from family or friendship fading" },
  { id: "identity", label: "Identity Shift",      emoji: "🦋", description: "Loss of self, purpose, health, or a life chapter" },
  { id: "other",    label: "Something Else",      emoji: "💜", description: "Whatever brought you here — it's valid" },
]

const SYSTEM_PROMPT = `You are Haven, a compassionate healing companion inside HeartsHeal — an app for people navigating grief, loss, heartbreak, and emotional pain.

Core principles:
- Lead with empathy and validation before any advice
- Never minimise someone's pain or rush their healing
- Use warm, gentle, human language — never clinical or robotic
- Reflect feelings back to show you truly heard them
- Ask only one thoughtful question at a time
- If someone expresses thoughts of self-harm, compassionately share crisis resources: 988 Lifeline, or text HOME to 741741

Tone: Like a wise, caring friend who has known loss themselves. Honest but never harsh.

Keep responses to 2-3 short sentences unless the person clearly needs more. Always end with either a gentle question or a brief reflection.`

// Tighter prompt for voice — responses must be spoken aloud, not read
const VOICE_SYSTEM_PROMPT = `You are Haven, a warm and compassionate voice companion inside HeartsHeal.

You are speaking aloud in a real-time voice conversation. This means:
- Respond in 1-3 natural spoken sentences MAX. Never longer.
- Never use bullet points, asterisks, markdown, or lists — only plain conversational speech
- Sound like a caring friend speaking softly, not a written response
- Ask one short, gentle question to keep the conversation going
- If someone mentions self-harm, warmly say: "Please reach out to the 988 Lifeline — you deserve real support right now."

Tone: Warm, unhurried, human. Like sitting with someone who truly cares.`

function buildMessages(messages: Message[], lossContext: string, sessionMemory?: string, recentEmotions?: string) {
  const contextParts: string[] = []
  if (lossContext) contextParts.push(`The person has indicated they are dealing with: ${lossContext}. Honor this context throughout the conversation.`)
  if (sessionMemory) contextParts.push(`Previous session memory: ${sessionMemory}\nUse this gently — let it inform your care without forcing references.`)
  if (recentEmotions) contextParts.push(`Recent emotional context from user's tracking (last 5 logs): ${recentEmotions}\nLet this inform your sensitivity. Do not explicitly mention these unless the user brings it up.`)

  const contextMsg = contextParts.join("\n\n")
  // Keep only the last 20 messages to prevent token runaway on long sessions
  const recent = messages.slice(-20)

  return [
    ...(contextMsg ? [{ role: "user" as const, content: contextMsg }, { role: "assistant" as const, content: "Thank you for sharing that with me. I'm here, and I'm listening. Take whatever space you need." }] : []),
    ...recent.map((m) => ({ role: m.role, content: m.content })),
  ]
}

const starterPrompts = [
  "I don't know how to stop feeling so empty inside.",
  "Everyone keeps telling me to move on but I can't.",
  "I feel guilty for still being sad about this.",
  "I just need someone to talk to right now.",
]

// Per-loss opening prompts — emotionally tuned for each experience
const openingPrompts: Record<string, string> = {
  grief: `Greet the user with deep gentleness. Acknowledge the weight of losing someone — that grief is love with nowhere to go, and that there is no right way to grieve. Ask one soft, open question that invites them to share who or what they lost, only if they're ready. 2-3 spoken sentences.`,
  breakup: `Greet the user with warmth. Acknowledge that heartbreak is one of the most disorienting pains — it's not just losing a person, it's losing a future you imagined. Let them know this is a safe place to feel all of it. Ask one gentle question about how they're doing right now, today. 2-3 spoken sentences.`,
  job: `Greet the user with understanding. Acknowledge that losing a job can shake your sense of identity and security all at once — it's so much more than a paycheck. Let them know their feelings are completely valid. Ask one open question about what they're carrying most right now. 2-3 spoken sentences.`,
  family: `Greet the user with care. Acknowledge how painful distance from family or a close friend can be — it can feel like a quiet grief that others don't always understand. Let them know they don't have to carry it alone here. Ask one gentle question to invite them to share more. 2-3 spoken sentences.`,
  identity: `Greet the user with compassion. Acknowledge that losing a sense of self — whether through illness, a life change, or simply feeling like a stranger to yourself — is a profound and often lonely experience. Let them know this is a space without judgment. Ask one soft question about what feels most lost right now. 2-3 spoken sentences.`,
  other: `Greet the user warmly and without assumptions. Let them know that whatever brought them here is valid — they don't need to label it or explain it. Haven is simply here to listen. Ask one open, gentle question that invites them to share whatever is on their heart. 2-3 spoken sentences.`,
}

export default function CompanionPage() {
  const [phase, setPhase]               = useState<"intro" | "select" | "chat">("intro")
  const [selectedLoss, setSelectedLoss] = useState<LossType | null>(null)
  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState("")
  const [isLoading, setIsLoading]       = useState(false)
  const [isStarting, setIsStarting]     = useState(false) // true while opening message loads
  const [error, setError]               = useState<string | null>(null)
  const [hasName, setHasName]           = useState("")
  const [voiceConversation, setVoiceConversation] = useState(false)
  const [showEndModal, setShowEndModal]   = useState(false)
  const [isSavingSession, setIsSavingSession] = useState(false)

  const sessionMemoryRef  = useRef<string>("")   // summary from last session
  const recentEmotionsRef = useRef<string>("")   // recent emotion log context string
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef     = useRef<HTMLTextAreaElement>(null)
  const messagesRef     = useRef<Message[]>([])
  const selectedLossRef = useRef<LossType | null>(null)
  const voiceConvRef    = useRef(false)
  const isLoadingRef    = useRef(false)
  const isSpeakingRef      = useRef(false) // true while Haven's TTS is playing
  const prevSpeakingRef    = useRef(false)
  const startListeningRef  = useRef<() => void>(() => {})
  const stopListeningRef   = useRef<() => void>(() => {})
  const ttsGenRef          = useRef(0)    // incremented on each send to cancel stale drain loops
  const voiceBufferRef     = useRef("")   // accumulated transcript while user is still speaking
  const voiceTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null) // patience timer

  // Keep refs in sync so async callbacks always see latest values
  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { selectedLossRef.current = selectedLoss }, [selectedLoss])
  useEffect(() => { voiceConvRef.current = voiceConversation }, [voiceConversation])
  useEffect(() => { isLoadingRef.current = isLoading }, [isLoading])

  const { speak, speakFast, prefetch, stop, isSpeaking, voiceEnabled, toggleVoice } = useTTS()

  // ── Core AI caller (non-streaming, used for opening message) ───
  const callClaude = useCallback(async (
    currentMessages: Message[],
    lossContext: string,
    overrideUserMsg?: string
  ): Promise<string | null> => {
    try {
      const messagesToSend = overrideUserMsg
        ? [...buildMessages(currentMessages, lossContext, sessionMemoryRef.current, recentEmotionsRef.current), { role: "user" as const, content: overrideUserMsg }]
        : buildMessages(currentMessages, lossContext, sessionMemoryRef.current, recentEmotionsRef.current)

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: messagesToSend,
        }),
      })
      if (!response.ok) throw new Error("API error")
      const data = await response.json()
      return data.content?.[0]?.text ?? null
    } catch {
      setError("Something went wrong. Please try again.")
      return null
    }
  }, [])

  // ── Non-streaming AI caller — works reliably on all serverless platforms ──
  const callClaudeStreaming = useCallback(async (
    currentMessages: Message[],
    lossContext: string,
    onChunk: (partial: string) => void,
    voiceMode = false,
  ): Promise<string | null> => {
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: voiceMode ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6",
          max_tokens: voiceMode ? 200 : 1000,
          system: voiceMode ? VOICE_SYSTEM_PROMPT : SYSTEM_PROMPT,
          messages: buildMessages(currentMessages, lossContext, sessionMemoryRef.current, recentEmotionsRef.current),
        }),
      })
      if (!response.ok) throw new Error("API error")
      const data = await response.json()
      const text = data.content?.[0]?.text ?? null
      if (text) onChunk(text)
      return text
    } catch {
      setError("Something went wrong. Please try again.")
      return null
    }
  }, [])

  // ── Shared send logic (used by both text and voice paths) ───────
  const sendContent = useCallback(async (text: string, currentMessages: Message[], isVoiceMode = false) => {
    // 1. Hard stop: silence mic AND any current speech BEFORE doing anything
    stopListeningRef.current()
    stop()
    isSpeakingRef.current = false

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    }
    const newMessages = [...currentMessages, userMsg]
    setMessages(newMessages)
    setIsLoading(true)
    setError(null)

    const replyId = (Date.now() + 1).toString()
    setMessages((prev) => [...prev, { id: replyId, role: "assistant", content: "…", timestamp: new Date() }])

    // ── Sentence-level TTS queue (voice mode only) ──
    const myGen = ++ttsGenRef.current
    const ttsQueue: string[] = []
    let ttsStreamDone = false
    let ttsConsumed = 0
    let drainStarted = false

    const drainTTS = async () => {
      while (myGen === ttsGenRef.current && (!ttsStreamDone || ttsQueue.length > 0)) {
        if (ttsQueue.length > 0) {
          const sentence = ttsQueue.shift()!
          if (myGen === ttsGenRef.current) {
            stopListeningRef.current()
            await speak(sentence)
          }
        } else {
          await new Promise<void>((r) => setTimeout(r, 20))
        }
      }
    }

    const reply = await callClaudeStreaming(
      newMessages,
      selectedLossRef.current?.description ?? "",
      (partial) => {
        setIsLoading(false)
        setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, content: partial } : m))
        if (isVoiceMode) {
          const newText = partial.slice(ttsConsumed)
          const matches = [...newText.matchAll(/(.{20,}?[.!?…])\s/g)]
          for (const m of matches) {
            ttsQueue.push(m[1].trim())
            ttsConsumed += m[0].length
          }
          // Prefetch ALL queued sentences in parallel — since onChunk fires once with the
          // full response, the entire queue is ready here and can all be fetched concurrently
          ttsQueue.forEach((s) => prefetch(s))
          if (ttsQueue.length >= 1 && !drainStarted) {
            drainStarted = true
            isSpeakingRef.current = true
            drainTTS().then(() => { isSpeakingRef.current = false })
          }
        }
      },
      isVoiceMode,
    )

    setIsLoading(false)
    if (reply) {
      setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, content: reply } : m))
      if (isVoiceMode) {
        // Flush any remainder not yet queued
        ttsStreamDone = true
        const remainder = reply.slice(ttsConsumed).trim()
        if (remainder) { prefetch(remainder); ttsQueue.push(remainder) }
        if (!drainStarted) {
          isSpeakingRef.current = true
          await drainTTS()
          isSpeakingRef.current = false
        } else {
          // Wait for the already-running drain loop to finish
          while (myGen === ttsGenRef.current && (ttsQueue.length > 0 || isSpeaking)) {
            await new Promise<void>((r) => setTimeout(r, 50))
          }
          isSpeakingRef.current = false
        }
      } else {
        // Text mode — sentence-level drain so audio starts on sentence 1
        // while sentences 2+ are already prefetching in parallel
        const textSentences = reply
          .split(/(?<=[.!?…])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 10)
        const toSpeak = textSentences.length > 0 ? textSentences : [reply]
        toSpeak.forEach((s) => prefetch(s))
        isSpeakingRef.current = true
        for (const s of toSpeak) {
          if (myGen !== ttsGenRef.current) break
          await speak(s)
        }
        isSpeakingRef.current = false
      }
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== replyId))
    }
  }, [callClaudeStreaming, isSpeaking, speak, speakFast, stop])

  // ── Full stop: cancel drain loop + audio + mic ──────────────────
  const stopHaven = useCallback(() => {
    ++ttsGenRef.current       // cancel any running drain loop
    isSpeakingRef.current = false
    if (voiceTimerRef.current) { clearTimeout(voiceTimerRef.current); voiceTimerRef.current = null }
    voiceBufferRef.current = ""
    stop()
  }, [stop])

  // ── STT handlers ────────────────────────────────────────────────
  const handleTranscript = useCallback((transcript: string) => {
    // Discard while Haven is speaking — prevents mic from picking up Haven's own voice
    if (isSpeakingRef.current) return

    if (voiceConvRef.current) {
      // Patience timer: accumulate transcript and wait 6s of silence before sending
      voiceBufferRef.current = voiceBufferRef.current
        ? voiceBufferRef.current + " " + transcript
        : transcript

      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current)
      voiceTimerRef.current = setTimeout(() => {
        const accumulated = voiceBufferRef.current.trim()
        voiceBufferRef.current = ""
        voiceTimerRef.current = null
        if (accumulated) sendContent(accumulated, messagesRef.current, true)
      }, 3000)
    } else {
      setInput((prev) => prev ? prev + " " + transcript : transcript)
      textareaRef.current?.focus()
    }
  }, [sendContent])

  const handleSttEnd = useCallback((hadResult: boolean) => {
    if (!voiceConvRef.current || isLoadingRef.current) return

    if (hadResult && voiceTimerRef.current) {
      // User spoke and patience timer is running — keep mic open so they can continue
      setTimeout(() => {
        if (voiceConvRef.current && voiceTimerRef.current) startListeningRef.current()
      }, 150)
    } else if (!hadResult && !voiceTimerRef.current) {
      // Silence with nothing buffered — restart to keep listening for new speech
      setTimeout(() => {
        if (voiceConvRef.current) startListeningRef.current()
      }, 100)
    }
    // If hadResult and no timer: message already sent, mic stays off until Haven responds
  }, [])

  const { status: sttStatus, startListening, stopListening } = useSTT(handleTranscript, handleSttEnd)

  // Wire up the refs once startListening/stopListening are available
  useEffect(() => { startListeningRef.current = startListening }, [startListening])
  useEffect(() => { stopListeningRef.current = stopListening }, [stopListening])

  // ── Auto-restart listening after Haven finishes speaking ────────
  useEffect(() => {
    const justFinishedSpeaking = prevSpeakingRef.current && !isSpeaking
    prevSpeakingRef.current = isSpeaking

    if (justFinishedSpeaking && voiceConvRef.current && !isLoadingRef.current) {
      setTimeout(() => {
        if (voiceConvRef.current && !isLoadingRef.current) startListeningRef.current()
      }, 500)
    }
  }, [isSpeaking])

  // ── Toggle voice conversation mode ──────────────────────────────
  const toggleVoiceConversation = useCallback(() => {
    setVoiceConversation((prev) => {
      const next = !prev
      if (next) {
        stopHaven()
        setTimeout(() => startListeningRef.current(), 100)
      } else {
        stopListening()
        stopHaven()
      }
      return next
    })
  }, [stopHaven, stopListening])

  // Immediately sends whatever the user has said so far, without waiting for silence timer
  const handleDoneSpeaking = useCallback(() => {
    stopListening()
    if (voiceTimerRef.current) {
      clearTimeout(voiceTimerRef.current)
      voiceTimerRef.current = null
    }
    const accumulated = voiceBufferRef.current.trim()
    voiceBufferRef.current = ""
    if (accumulated) sendContent(accumulated, messagesRef.current, true)
  }, [stopListening, sendContent])

  useEffect(() => {
    const name = localStorage.getItem("heartsHeal_userName")
    if (name) setHasName(name)

    // Load last session memory
    const lastSession = readStorage<{ summary: string; lossId: string; date: string }>(STORAGE_KEYS.lastSession)
    if (lastSession?.summary) sessionMemoryRef.current = lastSession.summary

    // Build recent emotion context string from last 5 logs
    const logs = readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs) ?? []
    if (logs.length > 0) {
      const recent = logs.slice(-5).map((l) => `${l.emotion} (${l.intensity}/10)`).join(", ")
      recentEmotionsRef.current = recent
    }

    // ── Auto-cleanup on navigation away ──
    return () => {
      ++ttsGenRef.current          // cancel all in-flight drain loops
      stop()                       // stop audio playback
      stopListeningRef.current()   // stop microphone
      if (voiceTimerRef.current) {
        clearTimeout(voiceTimerRef.current)
        voiceTimerRef.current = null
      }
      voiceBufferRef.current = ""

      // Auto-save minimal session note if user had a conversation
      const msgs = messagesRef.current
      const loss = selectedLossRef.current
      if (msgs.length >= 2 && loss) {
        const existing = readStorage<{ summary: string; lossId: string; date: string }>(STORAGE_KEYS.lastSession)
        // Only overwrite if this session had meaningful exchanges and no manual end was done
        if (!existing || existing.lossId !== loss.id || msgs.length > 4) {
          const userMessages = msgs.filter((m) => m.role === "user")
          const note = `${loss.label}: ${userMessages.length} exchange${userMessages.length !== 1 ? "s" : ""}. Left without ending session.`
          writeStorage(STORAGE_KEYS.lastSession, {
            lossId: loss.id,
            summary: note,
            date: new Date().toISOString(),
          })
        }
      }
    }
  }, [stop])

  // Scroll window to top whenever the chat phase mounts (prevents page from staying scrolled down)
  useEffect(() => {
    if (phase === "chat") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
    }
  }, [phase])

  useEffect(() => {
    const el = chatContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, isLoading])

  const startChat = async (loss: LossType) => {
    setSelectedLoss(loss)
    selectedLossRef.current = loss
    setPhase("chat")
    setIsStarting(true)
    setIsLoading(true)
    setError(null)

    const greetId = Date.now().toString()
    setMessages([{ id: greetId, role: "assistant", content: "…", timestamp: new Date() }])

    const openingPrompt = openingPrompts[loss.id] ??
      `Greet the user warmly, acknowledge what brought them here, and ask one gentle opening question. 2-3 spoken sentences.`

    // Sentence-level TTS drain — starts as soon as the first sentence lands from Claude
    const myGen = ++ttsGenRef.current
    const ttsQueue: string[] = []
    let ttsConsumed = 0
    let streamDone = false
    let overlayDismissed = false

    const drainOpening = async () => {
      while (myGen === ttsGenRef.current && (!streamDone || ttsQueue.length > 0)) {
        if (ttsQueue.length > 0) {
          const sentence = ttsQueue.shift()!
          if (myGen === ttsGenRef.current) {
            // Dismiss the overlay the moment first word is about to play
            if (!overlayDismissed) {
              overlayDismissed = true
              setIsStarting(false)
            }
            await speak(sentence)
          }
        } else {
          await new Promise<void>((r) => setTimeout(r, 30))
        }
      }
    }

    const openingMessage = await callClaudeStreaming(
      [{ id: "prompt", role: "user", content: openingPrompt, timestamp: new Date() }],
      loss.description,
      (partial) => {
        setMessages([{ id: greetId, role: "assistant", content: partial, timestamp: new Date() }])
        const newText = partial.slice(ttsConsumed)
        const matches = [...newText.matchAll(/(.{20,}?[.!?…])\s/g)]
        for (const m of matches) {
          ttsQueue.push(m[1].trim())
          ttsConsumed += m[0].length
        }
        // Prefetch all sentences in parallel as soon as they're known
        ttsQueue.forEach((s) => prefetch(s))
        // Kick off drain on first sentence
        if (ttsQueue.length >= 1 && myGen === ttsGenRef.current) {
          drainOpening()
        }
      },
      true, // Haiku — fast for a short greeting
    )

    streamDone = true
    setIsLoading(false)

    if (openingMessage) {
      setMessages([{ id: greetId, role: "assistant", content: openingMessage, timestamp: new Date() }])
      // Flush any remainder not yet queued
      const remainder = openingMessage.slice(ttsConsumed).trim()
      if (remainder) { prefetch(remainder); ttsQueue.push(remainder) }
    }

    // Fallback: if no sentences were extracted (very short message), speak it whole
    if (!overlayDismissed && openingMessage) {
      overlayDismissed = true
      speak(openingMessage)
      setTimeout(() => setIsStarting(false), 300)
    } else if (!overlayDismissed) {
      setIsStarting(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput("")
    await sendContent(text, messagesRef.current)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const exportTranscript = () => {
    if (!messages.length) return
    const header = `Haven Session — ${new Date().toLocaleDateString()}\nLoss type: ${selectedLoss?.label ?? "Unknown"}\n${"─".repeat(40)}\n\n`
    const body = messages.map((m) =>
      `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.role === "user" ? "You" : "Haven"}:\n${m.content}`
    ).join("\n\n")
    const blob = new Blob([header + body], { type: "text/plain" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `haven-session-${new Date().toLocaleDateString().replace(/\//g, "-")}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const confirmEndSession = async () => {
    // Save a session summary for Haven's memory on next visit
    if (messages.length >= 2 && selectedLoss) {
      setIsSavingSession(true)
      const summary = await callClaude(
        messagesRef.current,
        selectedLoss.description,
        `One or two sentences, max 40 words. Note: loss type, main emotions expressed, where they ended emotionally. Memory note only — no transcript, no filler.`
      )
      if (summary) {
        writeStorage(STORAGE_KEYS.lastSession, { lossId: selectedLoss.id, summary, date: new Date().toISOString() })
        sessionMemoryRef.current = summary
      }
      setIsSavingSession(false)
    }
    setShowEndModal(false)
    stopHaven()
    stopListening()
    setVoiceConversation(false)
    setPhase("select")
    setMessages([])
    setSelectedLoss(null)
    setInput("")
    setError(null)
  }

  const resetChat = () => {
    if (messages.length > 0) {
      setShowEndModal(true)
    } else {
      stopHaven()
      stopListening()
      setVoiceConversation(false)
      setPhase("select")
      setSelectedLoss(null)
      setInput("")
      setError(null)
    }
  }

  const toggleMic = () => {
    if (sttStatus === "listening") stopListening()
    else startListening()
  }

  // Derive voice conversation UI state
  const vcState: "listening" | "thinking" | "speaking" | "idle" =
    voiceConversation
      ? sttStatus === "listening" ? "listening"
      : isLoading ? "thinking"
      : isSpeaking ? "speaking"
      : "idle"
      : "idle"

  /* ── Intro phase ── */
  if (phase === "intro") {
    return (
      <PageContainer>
        <div className="bg-page-gradient flex flex-col">
          <div className="max-w-2xl mx-auto px-4 pt-8 pb-24 md:pb-12 flex flex-col items-center text-center">
            <Link href="/" className="self-start mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-rose-200 dark:from-primary/20 dark:to-rose-900/40 flex items-center justify-center shadow-lg">
                  <img src="/icon.png" alt="HeartsHeal" className="w-14 h-14 object-contain mix-blend-multiply dark:mix-blend-screen" />
                </div>
                <span className="absolute -bottom-1 -right-1 text-2xl">✨</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground mb-3">Meet Haven</h1>
              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-2">
                Your compassionate AI healing companion.
              </p>
              <p className="text-muted-foreground/80 text-sm leading-relaxed max-w-md mx-auto mb-6">
                Haven is here to listen without judgment, hold space for your pain, and gently walk
                beside you through whatever loss you're carrying — whether it happened yesterday or years ago.
              </p>

              {/* Voice feature callout */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Volume2 className="w-3 h-3" /> Voice responses
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Mic className="w-3 h-3" /> Speak your thoughts
                </span>
              </div>

              <div className="glass-card rounded-2xl px-5 py-4 mb-8 text-left max-w-md mx-auto">
                <div className="flex gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Haven provides emotional support and is not a substitute for professional mental health care.
                    If you're in crisis, please reach out to the{" "}
                    <a href="tel:988" className="text-primary underline underline-offset-2">988 Lifeline</a>{" "}
                    or text HOME to <span className="text-primary font-medium">741741</span>.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setPhase("select")}
                size="lg"
                className="rounded-full px-8 gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Begin Your Conversation
              </Button>
            </motion.div>
          </div>
        </div>
      </PageContainer>
    )
  }

  /* ── Loss type selection ── */
  if (phase === "select") {
    return (
      <PageContainer>
        <div className="bg-page-gradient">
          <div className="max-w-2xl mx-auto px-4 pt-8 pb-24 md:pb-12">
            <button onClick={() => setPhase("intro")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="text-center mb-7 max-w-sm mx-auto">
                <p className="font-serif text-xl sm:text-2xl text-foreground mb-2 leading-snug">
                  Haven is here to listen.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No judgment. No rushing. Just a quiet space to say exactly what's on your heart.
                </p>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground mb-2">
                What brought you here today{hasName ? `, ${hasName}` : ""}?
              </h2>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                Choose what resonates most — Haven will tailor their support to your experience.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lossTypes.map((loss, i) => (
                  <motion.button
                    key={loss.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.4 }}
                    onClick={() => !isStarting && startChat(loss)}
                    disabled={isStarting}
                    className="text-left glass-card-elevated rounded-2xl p-4 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group disabled:opacity-50 disabled:cursor-wait"
                  >
                    <div className="text-2xl mb-2">{loss.emoji}</div>
                    <div className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">{loss.label}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{loss.description}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </PageContainer>
    )
  }

  /* ── Chat phase ── */
  return (
    <div className="relative flex flex-col h-screen bg-page-gradient">

      {/* ── Session-start overlay — visible while Haven prepares and speaks greeting ── */}
      <AnimatePresence>
        {isStarting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-page-gradient"
          >
            {/* Pulsing heart avatar */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="mb-6"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-rose-200 dark:from-primary/20 dark:to-rose-900/40 flex items-center justify-center shadow-xl">
                <img src="/icon.png" alt="HeartsHeal" className="w-14 h-14 object-contain mix-blend-multiply dark:mix-blend-screen" />
              </div>
            </motion.div>

            {/* Loss type chip */}
            {selectedLoss && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mb-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                {selectedLoss.emoji} {selectedLoss.label}
              </motion.div>
            )}

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="font-serif text-2xl font-semibold text-foreground mb-2"
            >
              Haven is here.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="text-sm text-muted-foreground"
            >
              Preparing a space just for you…
            </motion.p>

            <div className="flex gap-1.5 mt-8">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/50"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Closing ritual modal ── */}
      <AnimatePresence>
        {showEndModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm px-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="bg-card border border-border/40 rounded-3xl p-7 max-w-sm w-full shadow-xl text-center"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-rose-200 dark:from-primary/20 dark:to-rose-900/40 flex items-center justify-center mx-auto mb-5">
                <Heart className="w-6 h-6 text-primary fill-primary/40" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                You showed up for yourself.
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                That takes courage. Haven will remember this conversation for next time.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={exportTranscript}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border/60 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Download className="w-4 h-4" /> Save transcript
                </button>
                <button
                  onClick={() => setShowEndModal(false)}
                  className="w-full py-2.5 rounded-xl border border-border/60 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  Return to Haven
                </button>
                <button
                  onClick={confirmEndSession}
                  disabled={isSavingSession}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {isSavingSession ? "Saving…" : "End session"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="glass-nav border-b px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <button onClick={resetChat} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> End Session
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-rose-200 dark:from-primary/20 dark:to-rose-900/40 flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-primary fill-primary/30" />
          </div>
          <span className="font-medium text-sm text-foreground">Haven</span>
          {isSpeaking
            ? <span className="w-2 h-2 rounded-full bg-primary animate-pulse" title="Speaking…" />
            : <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          }
        </div>

        <div className="flex items-center gap-1">
          {/* Voice toggle */}
          <button
            onClick={toggleVoice}
            title={voiceEnabled ? "Mute Haven's voice" : "Unmute Haven's voice"}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              voiceEnabled ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {messages.length > 1 && (
            <button onClick={exportTranscript} title="Save transcript" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={resetChat} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Loss context chip */}
      {selectedLoss && (
        <div className="flex justify-center pt-3 pb-1 px-4 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {selectedLoss.emoji} {selectedLoss.label}
          </span>
        </div>
      )}

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start gap-2.5")}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/25 to-rose-200 dark:from-primary/20 dark:to-rose-900/40 flex items-center justify-center shrink-0 mt-1">
                  <Heart className="w-3.5 h-3.5 text-primary fill-primary/30" />
                </div>
              )}
              <div className={cn(
                "rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "glass-card rounded-bl-sm text-foreground/90"
              )}>
                {msg.content.split("\n").map((line, i) => (
                  <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                ))}
                {/* Re-read button for assistant messages */}
                {msg.role === "assistant" && (
                  <button
                    onClick={() => speak(msg.content)}
                    className="mt-2 text-[10px] text-primary/50 hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <Volume2 className="w-3 h-3" /> Read aloud
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading */}
        {isLoading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/25 to-rose-200 dark:from-primary/20 dark:to-rose-900/40 flex items-center justify-center shrink-0">
              <Heart className="w-3.5 h-3.5 text-primary fill-primary/30" />
            </div>
            <div className="glass-card rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="text-center text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</div>
        )}

        {messages.length === 1 && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-2">
            <p className="text-xs text-muted-foreground text-center mb-3">Need a place to start?</p>
            <div className="grid grid-cols-1 gap-2">
              {starterPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => { setInput(p); textareaRef.current?.focus() }}
                  className="text-left text-xs text-muted-foreground glass-card rounded-xl px-3 py-2 hover:border-primary/30 hover:text-foreground transition-all duration-200"
                >
                  "{p}"
                </button>
              ))}
            </div>
          </motion.div>
        )}

      </div>

      {/* Input area */}
      <div className="shrink-0 border-t bg-background/80 backdrop-blur-xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">

        {/* ── Voice conversation mode UI ── */}
        <AnimatePresence>
          {voiceConversation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="max-w-2xl mx-auto mb-3"
            >
              <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/15">
                {/* Animated state orb */}
                <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
                  {/* Outer pulse rings */}
                  {vcState === "listening" && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping" />
                      <span className="absolute inset-1 rounded-full bg-rose-400/15 animate-ping" style={{ animationDelay: "0.2s" }} />
                    </>
                  )}
                  {vcState === "speaking" && (
                    <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  )}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300",
                    vcState === "listening" ? "bg-rose-500" :
                    vcState === "thinking"  ? "bg-amber-500/80" :
                    vcState === "speaking"  ? "bg-primary" :
                    "bg-muted"
                  )}>
                    {vcState === "listening" && <Mic className="w-4 h-4 text-white" />}
                    {vcState === "thinking"  && (
                      <div className="flex gap-0.5">
                        {[0,1,2].map((i) => (
                          <span key={i} className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                        ))}
                      </div>
                    )}
                    {vcState === "speaking" && (
                      <div className="flex gap-0.5 items-center">
                        {[0,1,2,3].map((i) => (
                          <span key={i} className="w-0.5 rounded-full bg-white animate-pulse"
                            style={{ height: `${6 + (i % 2) * 6}px`, animationDelay: `${i * 100}ms` }} />
                        ))}
                      </div>
                    )}
                    {vcState === "idle" && <Mic className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Status text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {vcState === "listening" ? "Listening…" :
                     vcState === "thinking"  ? "Haven is thinking…" :
                     vcState === "speaking"  ? "Haven is speaking…" :
                     "Ready to listen"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {vcState === "listening" ? "Take your time — Haven waits for you to finish" :
                     vcState === "thinking"  ? "Preparing a response for you" :
                     vcState === "speaking"  ? "Speak anytime to interrupt Haven" :
                     "Starting up…"}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {vcState === "listening" && (
                    <button
                      onClick={handleDoneSpeaking}
                      title="Send message"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Send className="w-3 h-3" /> Send
                    </button>
                  )}
                  {isSpeaking && (
                    <button onClick={stopHaven} title="Stop speaking"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}
                  <button
                    onClick={toggleVoiceConversation}
                    title="End voice conversation"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <MicOff className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Standard status indicators (only when NOT in voice mode) ── */}
        {!voiceConversation && (
          <>
            <AnimatePresence>
              {isSpeaking && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="max-w-2xl mx-auto mb-2">
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-primary/8 border border-primary/15">
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <span className="flex gap-0.5">
                        {[0,1,2,3].map((i) => (
                          <span key={i} className="w-0.5 rounded-full bg-primary animate-pulse" style={{ height: `${8 + (i % 2) * 6}px`, animationDelay: `${i * 100}ms` }} />
                        ))}
                      </span>
                      Haven is speaking…
                    </div>
                    <button onClick={stopHaven} className="text-xs text-primary/70 hover:text-primary flex items-center gap-1">
                      <Square className="w-3 h-3 fill-current" /> Stop
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {sttStatus === "listening" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="max-w-2xl mx-auto mb-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Listening… speak now
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── Text input row (hidden when voice conversation active) ── */}
        <AnimatePresence>
          {!voiceConversation && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-2xl mx-auto flex gap-2 items-end"
            >
              {/* Single mic → starts plain STT fill */}
              {sttStatus !== "unsupported" && (
                <button
                  onClick={toggleMic}
                  disabled={isStarting}
                  title={sttStatus === "listening" ? "Stop recording" : "Speak your message"}
                  className={cn(
                    "w-11 h-11 rounded-xl shrink-0 flex items-center justify-center transition-all duration-200 border",
                    isStarting
                      ? "opacity-40 cursor-not-allowed bg-card border-border/60 text-muted-foreground"
                      : sttStatus === "listening"
                        ? "bg-rose-500 text-white border-rose-500 shadow-md"
                        : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30"
                  )}
                >
                  {sttStatus === "listening" ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => !isStarting && setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStarting}
                placeholder={isStarting ? "Haven is speaking — one moment…" : sttStatus === "listening" ? "Listening…" : "Share what's on your heart…"}
                className="min-h-[44px] max-h-36 resize-none rounded-2xl bg-card border-border/60 text-sm leading-relaxed focus-visible:ring-primary/30 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || isStarting}
                size="icon"
                className="w-11 h-11 rounded-xl shrink-0 shadow-sm"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Voice conversation toggle ── */}
        {sttStatus !== "unsupported" && !voiceConversation && (
          <div className="max-w-2xl mx-auto mt-2 flex justify-center">
            <button
              onClick={toggleVoiceConversation}
              disabled={isStarting}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-colors border",
                isStarting
                  ? "opacity-40 cursor-not-allowed text-primary/40 border-primary/10"
                  : "text-primary/70 hover:text-primary hover:bg-primary/8 border-primary/15 hover:border-primary/30"
              )}
            >
              <Mic className="w-3 h-3" />
              Start voice conversation
            </button>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground/50 mt-2 max-w-2xl mx-auto">
          Haven is an AI companion, not a licensed therapist. For emergencies, call 988.
        </p>
      </div>
    </div>
  )
}
