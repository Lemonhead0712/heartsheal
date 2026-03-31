"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/* ─────────────────────────────────────────
   Pre-TTS text cleaning
   Strips markdown/symbols so spoken output sounds natural
───────────────────────────────────────── */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")   // *italic*, **bold**, ***both***
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")      // _italic_, __bold__
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")      // `code`, ```block```
    .replace(/#{1,6}\s+/g, "")                  // ## headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")    // [link text](url) → link text
    .replace(/!?\[([^\]]*)\]\([^)]+\)/g, "$1")  // ![img](url) → alt text
    .replace(/^[-*+]\s+/gm, "")                 // bullet points
    .replace(/^\d+\.\s+/gm, "")                 // numbered lists
    .replace(/>{1,}\s*/gm, "")                  // > blockquotes
    .replace(/---+/g, ".")                       // horizontal rules → pause
    .replace(/\n{2,}/g, " … ")                  // paragraph breaks → natural pause
    .replace(/\n/g, " ")                         // remaining newlines → space
    .replace(/\s{2,}/g, " ")                     // collapse multiple spaces
    .trim()
}

/* ─────────────────────────────────────────
   Audio cache — avoid re-fetching identical phrases
───────────────────────────────────────── */
const audioCache = new Map<string, string>() // text → object URL

/* ─────────────────────────────────────────
   Best available browser voice (fallback)
───────────────────────────────────────── */
let cachedBrowserVoice: SpeechSynthesisVoice | null = null

function getBestVoice(): SpeechSynthesisVoice | null {
  if (cachedBrowserVoice) return cachedBrowserVoice
  if (typeof window === "undefined" || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const tests = [
    (v: SpeechSynthesisVoice) => /online.*natural|natural.*online/i.test(v.name) && v.lang.startsWith("en"),
    (v: SpeechSynthesisVoice) => /Aria|Jenny|Samantha|Karen|Moira/i.test(v.name),
    (v: SpeechSynthesisVoice) => /Google UK English Female/i.test(v.name),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("en") && /female|woman/i.test(v.name),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
  ]
  for (const test of tests) {
    const match = voices.find(test)
    if (match) { cachedBrowserVoice = match; return match }
  }
  return null
}

function speakBrowser(text: string, rate = 0.85, pitch = 0.92, onDone?: () => void, volume = 1) {
  if (typeof window === "undefined" || !window.speechSynthesis) { onDone?.(); return }
  window.speechSynthesis.cancel()

  // Split into sentences for more natural prosody — each utterance gets its own
  // pitch contour instead of one monotone blob
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (!sentences.length) { onDone?.(); return }

  const voice = getBestVoice()
  let i = 0

  const speakNext = () => {
    if (i >= sentences.length) { onDone?.(); return }
    const utt   = new SpeechSynthesisUtterance(sentences[i++])
    if (voice) utt.voice = voice
    utt.rate   = rate
    utt.pitch  = pitch
    utt.volume = volume
    utt.onend  = speakNext
    utt.onerror = () => onDone?.()
    window.speechSynthesis.speak(utt)
  }

  speakNext()
}

/* ─────────────────────────────────────────
   useTTS hook
───────────────────────────────────────── */
export function useTTS() {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem("heartsHeal_voice") !== "false"
  })
  const [voiceVolume, setVoiceVolumeState] = useState(0.85)
  const voiceVolumeRef = useRef(0.85)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const inflight    = useRef<AbortController | null>(null)

  /* Preload voices */
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    const load = () => { cachedBrowserVoice = null; getBestVoice() }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  const stopAudio = useCallback(() => {
    inflight.current?.abort()
    inflight.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  const speak = useCallback((text: string, opts?: { rate?: number; pitch?: number }): Promise<void> => {
    const cleaned = cleanForSpeech(text)
    if (!voiceEnabled || !cleaned) return Promise.resolve()
    stopAudio()
    setIsSpeaking(true)

    return new Promise<void>(async (resolve) => {
      const done = () => { setIsSpeaking(false); resolve() }

      /* ── Try ElevenLabs (with cache) ── */
      try {
        let url = audioCache.get(cleaned)

        if (!url) {
          const controller = new AbortController()
          inflight.current = controller

          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: cleaned }),
            signal: controller.signal,
          })

          if (res.ok) {
            const blob = await res.blob()
            url = URL.createObjectURL(blob)
            if (cleaned.length < 120) audioCache.set(cleaned, url)
          }
        }

        if (url) {
          const audio = new Audio(url)
          audio.volume = voiceVolumeRef.current
          audioRef.current = audio
          audio.onended = done
          audio.onerror = () => {
            audioCache.delete(cleaned)
            speakBrowser(cleaned, opts?.rate, opts?.pitch, done)
          }
          await audio.play()
          return
        }
      } catch (err: any) {
        if (err?.name === "AbortError") { done(); return }
      }

      /* ── Browser TTS fallback ── */
      speakBrowser(cleaned, opts?.rate, opts?.pitch, done, voiceVolumeRef.current)
    })
  }, [voiceEnabled, stopAudio])

  /* speakFast — browser TTS only, starts in <100ms. Use for voice conversation mode. */
  const speakFast = useCallback((text: string): Promise<void> => {
    const cleaned = cleanForSpeech(text)
    if (!voiceEnabled || !cleaned) return Promise.resolve()
    stopAudio()
    setIsSpeaking(true)
    return new Promise<void>((resolve) => {
      speakBrowser(cleaned, 0.88, 0.92, () => { setIsSpeaking(false); resolve() }, voiceVolumeRef.current)
    })
  }, [voiceEnabled, stopAudio])

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev
      localStorage.setItem("heartsHeal_voice", String(next))
      if (!next) stopAudio()
      return next
    })
  }, [stopAudio])

  const setVoiceVolume = useCallback((v: number) => {
    voiceVolumeRef.current = v
    setVoiceVolumeState(v)
    if (audioRef.current) audioRef.current.volume = v
  }, [])

  return { speak, speakFast, stop: stopAudio, isSpeaking, voiceEnabled, toggleVoice, voiceVolume, setVoiceVolume }
}

/* ─────────────────────────────────────────
   useSTT hook
───────────────────────────────────────── */
type STTStatus = "idle" | "listening" | "unsupported"

export function useSTT(
  onResult: (transcript: string) => void,
  onEnd?: (hadResult: boolean) => void,
) {
  const [status, setStatus] = useState<STTStatus>("idle")
  const recognitionRef      = useRef<any>(null)
  const onResultRef         = useRef(onResult)
  const onEndRef            = useRef(onEnd)
  const hadResultRef        = useRef(false)

  useEffect(() => { onResultRef.current = onResult }, [onResult])
  useEffect(() => { onEndRef.current = onEnd }, [onEnd])

  useEffect(() => {
    if (typeof window === "undefined") return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setStatus("unsupported"); return }
    const rec          = new SR()
    rec.continuous     = false
    rec.interimResults = false
    rec.lang           = "en-US"
    rec.onresult       = (e: any) => {
      const t = e.results[0]?.[0]?.transcript ?? ""
      if (t) { hadResultRef.current = true; onResultRef.current(t) }
    }
    rec.onend = () => {
      setStatus("idle")
      onEndRef.current?.(hadResultRef.current)
      hadResultRef.current = false
    }
    rec.onerror = () => {
      setStatus("idle")
      onEndRef.current?.(false)
      hadResultRef.current = false
    }
    recognitionRef.current = rec
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || status === "unsupported") return
    hadResultRef.current = false
    try { recognitionRef.current.start(); setStatus("listening") } catch {}
  }, [status])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setStatus("idle")
  }, [])

  return { status, startListening, stopListening }
}
