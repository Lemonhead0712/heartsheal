import Link from "next/link"
import { Heart, CheckCircle2, ArrowLeft, Sparkles, Wind, BookHeart, BarChart3 } from "lucide-react"
import { PageContainer } from "@/components/page-container"

const freeFeatures = [
  { icon: Sparkles,  label: "Haven AI Companion",       desc: "Unlimited conversations with your AI healing companion" },
  { icon: BarChart3, label: "Emotional Log",             desc: "Unlimited emotion tracking and analytics" },
  { icon: Wind,      label: "Guided Breathing",          desc: "All breathing patterns, unlimited sessions" },
  { icon: BookHeart, label: "Thoughts Journal",          desc: "Unlimited journal entries and reflective quizzes" },
  { icon: Heart,     label: "Self-Compassion Practices", desc: "Full access to all healing exercises" },
]

export default function SubscriptionPage() {
  return (
    <PageContainer>
      <div className="min-h-screen bg-page-gradient">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-primary fill-primary/20" />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground mb-3">
              Haven is{" "}
              <span className="text-primary">Free Forever</span>
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
              Because healing shouldn't have a price tag. Every single feature is available to everyone, always — no subscription, no credit card, no limits.
            </p>
          </div>

          {/* Free badge */}
          <div className="glass-card rounded-2xl px-6 py-5 mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold text-sm mb-3">
              <CheckCircle2 className="w-4 h-4" />
              $0 / forever
            </div>
            <p className="text-sm text-muted-foreground">No trial periods. No hidden costs. No upsells.</p>
          </div>

          {/* Feature list */}
          <div className="space-y-3 mb-10">
            <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Everything included, always:</h2>
            {freeFeatures.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass-card-elevated rounded-xl px-4 py-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 ml-auto" />
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <Heart className="w-4 h-4" />
              Start Your Healing Journey
            </Link>
            <p className="text-xs text-muted-foreground mt-4">
              No account required. Your data stays on your device.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
