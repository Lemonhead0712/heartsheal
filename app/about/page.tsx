import { PageContainer } from "@/components/page-container"
import Link from "next/link"
import { ArrowLeft, Heart, Sparkles, Wind, BookHeart, BarChart3 } from "lucide-react"

const features = [
  { icon: Sparkles, title: "Haven AI Companion", description: "A compassionate, trauma-informed AI that listens, reflects, and gently guides you through your feelings — available anytime, without judgment." },
  { icon: BarChart3, title: "Emotional Log", description: "Track your emotional patterns day by day. Awareness is the first step toward healing." },
  { icon: Wind, title: "Guided Breathing", description: "Multiple breathing techniques grounded in science — from box breathing to 4-7-8 — to calm your nervous system in moments of overwhelm." },
  { icon: BookHeart, title: "Thoughts Journal", description: "AI-personalized journal prompts and reflective quizzes that meet you where you are emotionally." },
]

export default function AboutPage() {
  return (
    <PageContainer>
      <div className="min-h-screen bg-page-gradient">
        <div className="container max-w-3xl px-4 py-6 md:py-12">
          <div className="mb-8 flex items-center">
            <Link
              href="/"
              className="mr-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 md:hidden"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="font-serif text-2xl font-bold tracking-tight md:text-4xl text-foreground">
              About Haven ♥
            </h1>
          </div>

          <div className="space-y-8">

            {/* Mission statement */}
            <div className="glass-card rounded-2xl px-6 py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Heart className="w-4.5 h-4.5 text-primary" />
                </div>
                <h2 className="font-serif text-xl font-semibold text-foreground">Our Purpose</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Haven was born from a simple but powerful idea: that emotional healing deserves its own
                gentle space — a place without pressure, without judgment, and filled with hope.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether you're grieving the death of someone you loved, navigating heartbreak, recovering from
                divorce, coping with job loss, feeling estranged from family, or simply carrying that hollow ache
                of loneliness — <strong className="text-foreground font-semibold">you belong here.</strong> Every loss
                is valid. Every feeling deserves space.
              </p>
            </div>

            {/* Who it's for */}
            <div>
              <h2 className="font-serif text-xl font-semibold text-foreground mb-4">Who Haven is For</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["Grief & Loss", "Heartbreak", "Divorce", "Job Loss", "Loneliness", "Family Pain", "Identity Shifts", "Trauma"].map((label) => (
                  <div key={label} className="glass-card rounded-xl px-3 py-2.5 text-center">
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                No grief is "too small." If it hurts, it matters. Haven is here for all of it.
              </p>
            </div>

            {/* Features */}
            <div>
              <h2 className="font-serif text-xl font-semibold text-foreground mb-4">Your Healing Tools</h2>
              <div className="space-y-3">
                {features.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="glass-card-elevated rounded-xl px-5 py-4 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground mb-1">{title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Haven AI disclaimer */}
            <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-900/10 px-5 py-4">
              <p className="text-sm font-semibold text-foreground mb-1">A note about Haven AI</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Haven is an AI-powered emotional support companion designed to listen, reflect, and offer gentle
                guidance. Haven is <em>not</em> a licensed therapist or mental health professional, and conversations
                with Haven are not a substitute for professional care. If you are in crisis, please reach out to
                the <a href="tel:988" className="text-primary font-semibold underline underline-offset-2">988 Suicide & Crisis Lifeline</a> or
                text HOME to <span className="text-primary font-semibold">741741</span>.
              </p>
            </div>

            {/* About creator */}
            <div>
              <h2 className="font-serif text-xl font-semibold text-foreground mb-3">About the Creator</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Haven was envisioned, designed, and developed by <strong className="text-foreground">Lamar Newsome</strong>.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Driven by personal experiences with grief, emotional loss, and the search for meaning after hardship,
                Lamar wanted to create more than just an app — a companion for healing. Every feature was built with
                intention: to make healing more accessible, one mindful moment at a time.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Haven reflects both a technical effort and a deep emotional purpose.
              </p>
            </div>

            {/* Closing */}
            <div className="glass-card rounded-2xl px-6 py-6 text-center">
              <p className="font-serif text-lg text-foreground/80 italic mb-3">
                "Thank you for trusting Haven with a piece of your path."
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You are not alone. Healing is always possible —<br />
                one breath, one thought, one step at a time.
              </p>
            </div>

          </div>
        </div>
      </div>
    </PageContainer>
  )
}
