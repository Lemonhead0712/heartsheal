"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle, Loader2, Heart } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Status = "loading" | "success" | "error"

export default function ConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    // supabase-js v2 automatically detects and processes the token
    // from the URL hash (#access_token=...) or query params (?code=...)
    // We just need to listen for the auth state change.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus("success")
        setMessage("Your email has been confirmed! Welcome to Haven.")
        setTimeout(() => router.replace("/"), 2500)
      }
    })

    // Also check if a session already exists (e.g. token was already processed)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus("success")
        setMessage("Your email has been confirmed! Welcome to Haven.")
        setTimeout(() => router.replace("/"), 2500)
      }
    })

    // Timeout fallback — if no session after 8s, show error
    const timeout = setTimeout(() => {
      setStatus((prev) => {
        if (prev === "loading") {
          setMessage("The confirmation link may have expired. Please sign up again or request a new link.")
          return "error"
        }
        return prev
      })
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm bg-card border border-border/50 rounded-3xl shadow-xl p-8 flex flex-col items-center text-center gap-5"
      >
        {/* Logo mark */}
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Heart className="w-7 h-7 text-primary fill-primary/30" />
        </div>

        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-1">Haven</p>
          <h1 className="text-xl font-bold text-foreground">Email Confirmation</h1>
        </div>

        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Confirming your account…</p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">Redirecting you now…</p>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
            <button
              onClick={() => router.replace("/")}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Back to Haven
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
