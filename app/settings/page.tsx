"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import {
  ChevronLeft, Download, Upload, Trash2, User, Volume2,
  CheckCircle2, AlertTriangle, Database, Heart, Shield, Cloud, LogOut, Mail, Lock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"
import { exportUserData, importUserData, clearAllData, readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { useAuth } from "@/contexts/auth-context"

type Toast = { message: string; type: "success" | "error" }

export default function SettingsPage() {
  const [userName, setUserName]       = useState("")
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState("")
  const [voiceOn, setVoiceOn]         = useState(true)
  const [toast, setToast]             = useState<Toast | null>(null)
  const [confirmClear, setConfirmClear]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [stats, setStats]             = useState({ emotions: 0, journal: 0, quizzes: 0 })
  const fileRef = useRef<HTMLInputElement>(null)

  const { user, signIn, signUp, signOut } = useAuth()
  const [authMode, setAuthMode]   = useState<"signin" | "signup">("signin")
  const [email, setEmail]         = useState("")
  const [password, setPassword]   = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [showAuth, setShowAuth]   = useState(false)

  useEffect(() => {
    const name = readStorage<string>(STORAGE_KEYS.userName)
    if (name) { setUserName(name); setNameInput(name) }

    const voice = localStorage.getItem(STORAGE_KEYS.voice)
    setVoiceOn(voice !== "false")

    const emotions = readStorage<unknown[]>(STORAGE_KEYS.emotionLogs) ?? []
    const journal  = readStorage<unknown[]>(STORAGE_KEYS.journalEntries) ?? []
    const quizzes  = readStorage<unknown[]>(STORAGE_KEYS.quizResults) ?? []
    setStats({ emotions: emotions.length, journal: journal.length, quizzes: quizzes.length })
  }, [])

  const showToast = (message: string, type: Toast["type"]) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const saveName = () => {
    const trimmed = nameInput.trim()
    writeStorage(STORAGE_KEYS.userName, trimmed)
    setUserName(trimmed)
    setEditingName(false)
    showToast("Name saved", "success")
  }

  const toggleVoice = () => {
    const next = !voiceOn
    setVoiceOn(next)
    localStorage.setItem(STORAGE_KEYS.voice, String(next))
  }

  const handleExport = () => {
    exportUserData()
    showToast("Backup downloaded", "success")
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await importUserData(file)
    if (result.success) {
      showToast("Data restored successfully — refresh to see changes", "success")
      // Refresh stats
      const emotions = readStorage<unknown[]>(STORAGE_KEYS.emotionLogs) ?? []
      const journal  = readStorage<unknown[]>(STORAGE_KEYS.journalEntries) ?? []
      const quizzes  = readStorage<unknown[]>(STORAGE_KEYS.quizResults) ?? []
      setStats({ emotions: emotions.length, journal: journal.length, quizzes: quizzes.length })
    } else {
      showToast(result.error ?? "Import failed", "error")
    }
    e.target.value = ""
  }

  const handleAuth = async () => {
    if (!email || !password) return
    setAuthLoading(true)
    const fn = authMode === "signin" ? signIn : signUp
    const { error } = await fn(email, password)
    setAuthLoading(false)
    if (error) { showToast(error, "error") }
    else {
      showToast(authMode === "signin" ? "Signed in — your data will sync" : "Account created! Check your email to confirm.", "success")
      setShowAuth(false)
      setEmail(""); setPassword("")
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    if (!user) return
    setDeleting(true)
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      if (res.ok) {
        clearAllData()
        await signOut()
      } else {
        const { error } = await res.json()
        showToast(error ?? "Could not delete account. Contact support@heartsheal.app", "error")
        setConfirmDelete(false)
      }
    } catch {
      showToast("Could not delete account. Contact support@heartsheal.app", "error")
      setConfirmDelete(false)
    }
    setDeleting(false)
  }

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); return }
    clearAllData()
    setStats({ emotions: 0, journal: 0, quizzes: 0 })
    setUserName("")
    setConfirmClear(false)
    showToast("All data cleared", "success")
  }

  const container: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
  const item: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } } }

  return (
    <div className="bg-page-gradient">
      <motion.div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-5" variants={container} initial="hidden" animate="show">

        {/* Header */}
        <motion.div className="flex flex-col items-center mb-3" variants={item}>
          <Logo size="small" />
        </motion.div>
        <motion.div className="mb-5" variants={item}>
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-foreground mt-3 mb-1">Settings & Data</h1>
          <p className="text-muted-foreground text-sm">Your data lives on your device — private, always.</p>
        </motion.div>

        {/* Two-column grid — single col on mobile, side-by-side on desktop */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 lg:gap-8 items-start" variants={item}>

          {/* ── Main column: editable settings ── */}
          <div className="space-y-4 min-w-0">

            {/* Profile */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <h2 className="font-semibold text-sm text-foreground">Profile</h2>
              </div>
              {editingName ? (
                <div className="flex gap-2">
                  <input autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()} placeholder="Your name (optional)"
                    className="flex-1 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <Button onClick={saveName} size="sm" className="rounded-xl">Save</Button>
                  <Button onClick={() => setEditingName(false)} size="sm" variant="outline" className="rounded-xl">Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">{userName || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">Haven will use this to personalise your experience</p>
                  </div>
                  <button onClick={() => setEditingName(true)} className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                    {userName ? "Edit" : "Add name"}
                  </button>
                </div>
              )}
            </div>

            {/* Preferences */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Volume2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <h2 className="font-semibold text-sm text-foreground">Preferences</h2>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground font-medium">Voice responses</p>
                  <p className="text-xs text-muted-foreground">Haven reads responses aloud</p>
                </div>
                <button onClick={toggleVoice} className={cn("w-11 h-6 rounded-full transition-all duration-300 relative", voiceOn ? "bg-primary" : "bg-muted")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300", voiceOn ? "left-5" : "left-0.5")} />
                </button>
              </div>
            </div>

            {/* Account / Sync */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Cloud className="w-3.5 h-3.5 text-primary" />
                </div>
                <h2 className="font-semibold text-sm text-foreground">Account & Sync</h2>
              </div>
              {user ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Synced
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                    </div>
                    <Button onClick={signOut} variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
                      <LogOut className="w-3.5 h-3.5" /> Sign out
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Your data syncs automatically across all your devices.</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Create a free account to sync your data across devices and keep it safe in the cloud.</p>
                  {!showAuth ? (
                    <Button onClick={() => setShowAuth(true)} className="rounded-xl gap-2 text-sm w-full">
                      <Cloud className="w-4 h-4" /> Sign in or Create Account
                    </Button>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex gap-2 p-1 rounded-xl bg-muted/40 mb-3">
                        {(["signin", "signup"] as const).map((m) => (
                          <button key={m} onClick={() => setAuthMode(m)}
                            className={cn("flex-1 text-xs py-1.5 rounded-lg font-medium transition-all", authMode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
                            {m === "signin" ? "Sign In" : "Create Account"}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAuth} disabled={authLoading || !email || !password} className="flex-1 rounded-xl text-sm">
                          {authLoading ? "Please wait…" : authMode === "signin" ? "Sign In" : "Create Account"}
                        </Button>
                        <Button onClick={() => { setShowAuth(false); setEmail(""); setPassword("") }} variant="outline" className="rounded-xl text-sm">Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* ── Sidebar column: stats, data, privacy, danger ── */}
          <aside className="lg:sticky lg:top-[76px] lg:self-start space-y-4 min-w-0">

            {/* Stats overview */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Emotion Logs", value: stats.emotions, icon: "💗" },
                { label: "Journal Entries", value: stats.journal, icon: "📓" },
                { label: "Quizzes Taken", value: stats.quizzes, icon: "🧠" },
              ].map(({ label, value, icon }) => (
                <div key={label} className="glass-card rounded-2xl p-4 text-center">
                  <div className="text-xl mb-1">{icon}</div>
                  <div className="text-2xl font-bold text-foreground">{value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Data backup */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="w-3.5 h-3.5 text-primary" />
                </div>
                <h2 className="font-semibold text-sm text-foreground">Your Data</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4 ml-9">Export a backup anytime — import it on a new device to restore your history.</p>
              <div className="flex gap-3">
                <Button onClick={handleExport} variant="outline" className="flex-1 rounded-xl gap-2 text-sm">
                  <Download className="w-4 h-4" /> Export
                </Button>
                <Button onClick={() => fileRef.current?.click()} variant="outline" className="flex-1 rounded-xl gap-2 text-sm">
                  <Upload className="w-4 h-4" /> Import
                </Button>
                <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              </div>
            </div>

            {/* Privacy note */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <h2 className="font-semibold text-sm text-foreground">Privacy</h2>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {[
                  "All your data is stored only on this device",
                  "Nothing is sent to any server except AI requests to Anthropic (which are not stored)",
                  "No account, no tracking, no ads — ever",
                  "You can delete everything at any time",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Heart className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            {/* Danger zone */}
            <div className="glass-card rounded-2xl p-5 border border-destructive/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </div>
                <h2 className="font-semibold text-sm text-foreground">Danger Zone</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Permanently deletes all emotion logs, journal entries, and quiz results from this device. This cannot be undone.</p>
              <div className={cn("flex items-center", user && "mb-5")}>
                <Button onClick={handleClear} variant="outline"
                  className={cn("rounded-xl gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all", confirmClear && "bg-destructive text-white border-destructive")}>
                  <AlertTriangle className="w-4 h-4" />
                  {confirmClear ? "Tap again to confirm" : "Delete All My Data"}
                </Button>
                {confirmClear && (
                  <button onClick={() => setConfirmClear(false)} className="ml-3 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                )}
              </div>
              {user && (
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs text-muted-foreground mb-3">Permanently deletes your account and all cloud-synced data. This cannot be undone.</p>
                  <div className="flex items-center">
                    <Button onClick={handleDeleteAccount} disabled={deleting} variant="outline"
                      className={cn("rounded-xl gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all disabled:opacity-60", confirmDelete && "bg-destructive text-white border-destructive")}>
                      <Trash2 className="w-4 h-4" />
                      {deleting ? "Deleting…" : confirmDelete ? "Tap again to confirm" : "Delete My Account"}
                    </Button>
                    {confirmDelete && !deleting && (
                      <button onClick={() => setConfirmDelete(false)} className="ml-3 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </aside>

        </motion.div>

      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium shadow-lg z-50",
              toast.type === "success" ? "bg-emerald-500 text-white" : "bg-destructive text-white"
            )}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
