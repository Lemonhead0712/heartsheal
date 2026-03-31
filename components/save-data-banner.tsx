"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Cloud, X, ChevronDown, ChevronUp, LogOut, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

export function SaveDataBanner() {
  const { user, signIn, signUp, signOut, isLoading } = useAuth()

  const [expanded, setExpanded]   = useState(false)
  const [authMode, setAuthMode]   = useState<"signin" | "signup">("signup")
  const [email, setEmail]         = useState("")
  const [password, setPassword]   = useState("")
  const [showPass, setShowPass]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [working, setWorking]     = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Signed in — show a minimal synced pill, no banner
  if (user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium w-fit mx-auto mb-4"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Synced to cloud · {user.email}
        <button
          onClick={() => signOut()}
          title="Sign out"
          className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
        >
          <LogOut className="w-3 h-3" />
        </button>
      </motion.div>
    )
  }

  // Dismissed — gone
  if (dismissed || isLoading) return null

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError("Please enter email and password."); return }
    setWorking(true)
    setError(null)
    const fn = authMode === "signin" ? signIn : signUp
    const { error: err } = await fn(email.trim(), password)
    setWorking(false)
    if (err) {
      setError(err)
    } else {
      setExpanded(false)
      setEmail(""); setPassword("")
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden"
      >
        {/* Collapsed row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Cloud className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight">
              Save your data to the cloud
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
              Create a free account to keep your progress safe
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              {expanded ? "Cancel" : "Sign up"}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded form */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Tab switcher */}
                <div className="flex gap-1 p-1 rounded-xl bg-muted/50">
                  {(["signup", "signin"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setAuthMode(m); setError(null) }}
                      className={cn(
                        "flex-1 text-xs py-1.5 rounded-lg font-medium transition-all",
                        authMode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
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
                  className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />

                {/* Password */}
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Password"
                    className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={working}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {working ? "Please wait…" : authMode === "signup" ? "Create Account & Sync" : "Sign In & Sync"}
                </button>

                <p className="text-[11px] text-muted-foreground text-center">
                  Your data is private and never shared.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
