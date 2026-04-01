import Link from "next/link"
import { Heart, Home, Sparkles } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-page-gradient flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full">

        {/* Logo mark */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary fill-primary/20" />
          </div>
        </div>

        {/* Heading */}
        <p className="text-sm font-semibold text-primary/70 tracking-widest uppercase mb-2">404</p>
        <h1 className="font-serif text-3xl font-semibold text-foreground mb-3">
          Page not found
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          This page doesn't exist, but your healing journey does.
          Let's get you back somewhere safe.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            href="/companion"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border/60 text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            Talk to Haven
          </Link>
        </div>

      </div>
    </div>
  )
}
