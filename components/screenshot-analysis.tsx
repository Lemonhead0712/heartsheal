"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, ImagePlus, Loader2, RefreshCw, Sparkles, Upload, WandSparkles } from "lucide-react"
import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/storage"
import { cn } from "@/lib/utils"

type AnalysisPatternType =
  | "avoidant"
  | "manipulative"
  | "breadcrumbing"
  | "healthy"
  | "dismissive"
  | "anxious"
  | "boundary-crossing"

type ScreenshotAnalysisResult = {
  patternType: AnalysisPatternType
  pattern: string
  emotional_impact: string
  exercise: string
  affirmation: string
}

type ScreenshotAnalysisHistoryItem = ScreenshotAnalysisResult & {
  id: string
  createdAt: string
  fileName: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const HISTORY_LIMIT = 5

const patternMeta: Record<
  AnalysisPatternType,
  { label: string; accent: string; badge: string; glow: string }
> = {
  avoidant: {
    label: "Avoidant Pattern",
    accent: "from-sky-500/15 to-cyan-500/10 border-sky-400/25",
    badge: "text-sky-300 bg-sky-500/10 border-sky-400/20",
    glow: "shadow-sky-500/10",
  },
  manipulative: {
    label: "Manipulative Pattern",
    accent: "from-rose-500/15 to-orange-500/10 border-rose-400/25",
    badge: "text-rose-300 bg-rose-500/10 border-rose-400/20",
    glow: "shadow-rose-500/10",
  },
  breadcrumbing: {
    label: "Breadcrumbing",
    accent: "from-amber-500/15 to-orange-500/10 border-amber-400/25",
    badge: "text-amber-300 bg-amber-500/10 border-amber-400/20",
    glow: "shadow-amber-500/10",
  },
  healthy: {
    label: "Healthy Dynamic",
    accent: "from-emerald-500/15 to-teal-500/10 border-emerald-400/25",
    badge: "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
    glow: "shadow-emerald-500/10",
  },
  dismissive: {
    label: "Dismissive Pattern",
    accent: "from-violet-500/15 to-slate-500/10 border-violet-400/25",
    badge: "text-violet-300 bg-violet-500/10 border-violet-400/20",
    glow: "shadow-violet-500/10",
  },
  anxious: {
    label: "Anxious Dynamic",
    accent: "from-fuchsia-500/15 to-rose-500/10 border-fuchsia-400/25",
    badge: "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-400/20",
    glow: "shadow-fuchsia-500/10",
  },
  "boundary-crossing": {
    label: "Boundary-Crossing",
    accent: "from-orange-500/15 to-red-500/10 border-orange-400/25",
    badge: "text-orange-300 bg-orange-500/10 border-orange-400/20",
    glow: "shadow-orange-500/10",
  },
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Could not read file"))
    }
    reader.onerror = () => reject(new Error("Could not read file"))
    reader.readAsDataURL(file)
  })
}

export function ScreenshotAnalysis() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScreenshotAnalysisResult | null>(null)
  const [history, setHistory] = useState<ScreenshotAnalysisHistoryItem[]>([])

  useEffect(() => {
    const saved = readStorage<ScreenshotAnalysisHistoryItem[]>(STORAGE_KEYS.screenshotAnalyses) ?? []
    setHistory(saved.slice(0, HISTORY_LIMIT))
  }, [])

  const selectFile = async (file: File | null) => {
    setError("")
    setResult(null)

    if (!file) {
      setSelectedFile(null)
      setPreviewUrl("")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Please choose an image under 5MB.")
      return
    }

    try {
      const dataUrl = await readAsDataUrl(file)
      setSelectedFile(file)
      setPreviewUrl(dataUrl)
    } catch {
      setError("Haven couldn't read that image. Please try another screenshot.")
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile || !previewUrl) {
      setError("Choose a screenshot before analyzing.")
      return
    }

    const [, base64 = ""] = previewUrl.split(",")
    if (!base64) {
      setError("That screenshot couldn't be prepared for analysis.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: selectedFile.type || "image/png",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Analysis failed")
      }

      const nextResult = data as ScreenshotAnalysisResult
      setResult(nextResult)

      const nextHistory: ScreenshotAnalysisHistoryItem[] = [
        {
          ...nextResult,
          id: `${Date.now()}`,
          createdAt: new Date().toISOString(),
          fileName: selectedFile.name,
        },
        ...history,
      ].slice(0, HISTORY_LIMIT)

      setHistory(nextHistory)
      writeStorage(STORAGE_KEYS.screenshotAnalyses, nextHistory)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewUrl("")
    setResult(null)
    setError("")
    if (inputRef.current) inputRef.current.value = ""
  }

  const currentMeta = result ? patternMeta[result.patternType] : null

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[28px] p-5 md:p-6 overflow-hidden relative"
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-violet-500/10 via-amber-400/10 to-rose-500/10 pointer-events-none" />

        <div className="relative flex flex-col gap-5">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">
              <Sparkles className="w-3.5 h-3.5" />
              Claude Vision Analysis
            </span>
            <div>
              <h2 className="font-serif text-2xl md:text-3xl text-foreground">Read the emotional pattern beneath the messages</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                Upload a conversation screenshot and Haven will reflect the dynamic back to you with emotional context, a grounding exercise, and one healing affirmation to hold onto.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <label
                htmlFor="screenshot-upload"
                className="block rounded-[24px] border border-dashed border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/35 hover:bg-primary/5 cursor-pointer"
              >
                <input
                  ref={inputRef}
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => void selectFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-col items-center justify-center text-center gap-3 min-h-[220px]">
                  {previewUrl ? (
                    <>
                      <div className="rounded-[22px] overflow-hidden border border-border/50 bg-background/60 max-h-[380px]">
                        <img src={previewUrl} alt="Conversation screenshot preview" className="block max-h-[380px] w-auto object-contain" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{selectedFile?.name}</p>
                        <p className="text-xs text-muted-foreground">Tap to replace this screenshot</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-primary">
                        <ImagePlus className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Drop in a conversation screenshot</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP up to 5MB. The image is sent directly for analysis only when you tap analyze.</p>
                      </div>
                    </>
                  )}
                </div>
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card/60 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <Upload className="w-4 h-4" />
                  {previewUrl ? "Choose another screenshot" : "Upload screenshot"}
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!previewUrl || loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                  {loading ? "Analyzing..." : "Analyze with Haven"}
                </button>
              </div>

              {(previewUrl || result || error) && (
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Start over
                </button>
              )}

              {error && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-[24px] border border-border/40 bg-card/40 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">What Haven looks for</p>
                <div className="grid gap-2">
                  {[
                    "Mixed signals and emotional inconsistency",
                    "Moments where your needs were minimized",
                    "Signs of care, clarity, and healthy repair",
                    "A healing exercise matched to the pattern",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-foreground/85">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 px-4 py-4">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-200 mb-1">A gentle note</p>
                <p className="text-xs leading-relaxed text-amber-800/80 dark:text-amber-100/80">
                  This is reflective emotional guidance, not clinical diagnosis. If a screenshot brings up fear, coercion, or threats, prioritize real-world support and safety first.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {result && currentMeta && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-[28px] border bg-gradient-to-br p-5 md:p-6 shadow-[0_18px_50px_-20px] glass-card",
            currentMeta.accent,
            currentMeta.glow
          )}
        >
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", currentMeta.badge)}>
              {currentMeta.label}
            </span>
            <span className="text-xs text-muted-foreground">
              Haven reflected this from your screenshot just now
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-background/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Pattern noticed</p>
              <p className="text-sm leading-relaxed text-foreground/90">{result.pattern}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-background/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Emotional impact</p>
              <p className="text-sm leading-relaxed text-foreground/90">{result.emotional_impact}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-background/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Healing exercise</p>
              <p className="text-sm leading-relaxed text-foreground/90">{result.exercise}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-background/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Affirmation</p>
              <p className="text-sm leading-relaxed text-foreground/90">{result.affirmation}</p>
            </div>
          </div>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card rounded-[28px] p-5 md:p-6"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-serif text-xl text-foreground">Recent reflections</p>
            <p className="text-sm text-muted-foreground">The last {HISTORY_LIMIT} screenshot analyses stay here on this device for quick revisits.</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="rounded-2xl border border-border/40 bg-card/30 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No screenshot reflections yet. Your next upload will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const meta = patternMeta[item.patternType]
              return (
                <div key={item.id} className="rounded-2xl border border-border/40 bg-card/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", meta.badge)}>
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{item.fileName}</p>
                  <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3">{item.pattern}</p>
                  <p className="text-xs text-primary/85 mt-3">Exercise: {item.exercise}</p>
                </div>
              )
            })}
          </div>
        )}
      </motion.section>
    </div>
  )
}
