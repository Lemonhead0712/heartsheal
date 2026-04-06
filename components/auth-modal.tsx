"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Eye, EyeOff, Cloud, CheckCircle2, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

type View = "auth" | "reset" | "reset-sent"

interface AuthModalProps {
  open: boolean
  onClose: () => void
  defaultMode?: "signin" | "signup"
}

export function AuthModal({ open, onClose, defaultMode = "signup" }: AuthModalProps) {
  const { signIn, signUp, resetPassword, user } = useAuth()
  const [mode, setMode]         = useState<"signin" | "signup">(defaultMode)
  const [view, setView]         = useState<View>("auth")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [working, setWorking]   = useState(false)
  const [done, setDone]         = useState(false)

  const reset = () => {
    setEmail(""); setPassword(""); setError(null); setWorking(false); setDone(false); setView("auth")
  }

  const handleClose = () => { reset(); onClose() }

  // Close as soon as Supabase confirms the user is authenticated
  useEffect(() => {
    if (user && open) {
      const t = setTimeout(handleClose, 900)
      return () => clearTimeout(t)
    }
  }, [user, open])

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return }
    setWorking(true); setError(null)
    const fn = mode === "signin" ? signIn : signUp
    const { error: err } = await fn(email.trim(), password)
    setWorking(false)
    if (err) { setError(err) }
    else { setDone(true); setTimeout(handleClose, mode === "signup" ? 5000 : 1800) }
  }

  const handleReset = async () => {
    if (!email.trim()) { setError("Please enter your email address."); return }
    setWorking(true); setError(null)
    const { error: err } = await resetPassword(email.trim())
    setWorking(false)
    if (err) { setError(err) }
    else { setView("reset-sent") }
  }

  const headerTitle = view === "reset" ? "Reset password"
    : view === "reset-sent" ? "Check your email"
    : mode === "signup" ? "Create your account"
    : "Welcome back"

  const headerSub = view === "reset" ? "We'll send a reset link to your email"
    : view === "reset-sent" ? "A reset link is on its way"
    : mode === "signup" ? "Free — sync your data across devices"
    : "Sign in to access your data"

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-foreground/30 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-card border border-border/50 rounded-3xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {view === "reset" ? (
                    <button
                      onClick={() => { setView("auth"); setError(null) }}
                      className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Cloud className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold text-foreground text-base leading-tight">{headerTitle}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{headerSub}</p>
                  </div>
                </div>
                <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 pb-6">

                {/* ── Success after sign in / sign up ── */}
                {done && view === "auth" && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">
                      {mode === "signup" ? "Check your email!" : "Signed in!"}
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      {mode === "signup"
                        ? "We sent a confirmation link to your email. Click it to activate your account."
                        : "Your data is now syncing to the cloud."}
                    </p>
                  </motion.div>
                )}

                {/* ── Reset sent confirmation ── */}
                {view === "reset-sent" && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">Reset link sent!</p>
                    <p className="text-xs text-muted-foreground text-center">
                      Check <span className="font-medium text-foreground">{email}</span> for a link to reset your password.
                    </p>
                    <button
                      onClick={() => { setView("auth"); setError(null) }}
                      className="mt-2 text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      Back to sign in
                    </button>
                  </motion.div>
                )}

                {/* ── Forgot password form ── */}
                {view === "reset" && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleReset()}
                      placeholder="Email address"
                      className="w-full rounded-xl border border-border/50 bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
                    />
                    {error && <p className="text-xs text-destructive mb-3">{error}</p>}
                    <button
                      onClick={handleReset}
                      disabled={working}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {working ? "Sending…" : "Send Reset Link"}
                    </button>
                  </motion.div>
                )}

                {/* ── Main auth form ── */}
                {view === "auth" && !done && (
                  <>
                    {/* Tab switcher */}
                    <div className="flex gap-1 p-1 rounded-xl bg-muted/50 mb-4">
                      {(["signup", "signin"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => { setMode(m); setError(null) }}
                          className={cn(
                            "flex-1 text-xs py-2 rounded-lg font-semibold transition-all",
                            mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {m === "signup" ? "Create Account" : "Sign In"}
                        </button>
                      ))}
                    </div>

                    {/* Email */}
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full rounded-xl border border-border/50 bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2.5"
                    />

                    {/* Password */}
                    <div className="relative mb-1">
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        placeholder="Password"
                        className="w-full rounded-xl border border-border/50 bg-background px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Forgot password — only shown on sign in */}
                    {mode === "signin" && (
                      <div className="flex justify-end mb-3">
                        <button
                          type="button"
                          onClick={() => { setView("reset"); setError(null) }}
                          className="text-[11px] text-primary/70 hover:text-primary transition-colors font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {mode === "signup" && <div className="mb-4" />}

                    {error && <p className="text-xs text-destructive mb-3">{error}</p>}

                    <button
                      onClick={handleSubmit}
                      disabled={working}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {working ? "Please wait…" : mode === "signup" ? "Create Account & Sync Data" : "Sign In & Sync Data"}
                    </button>

                    <p className="text-[11px] text-muted-foreground text-center mt-3">
                      Your data is private and never shared.
                    </p>
                  </>
                )}

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
