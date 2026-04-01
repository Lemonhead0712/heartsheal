"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronDown, HelpCircle, Shield, Sparkles, Heart, BarChart3 } from "lucide-react"
import { PageContainer } from "@/components/page-container"
import { cn } from "@/lib/utils"

type FAQItem = { q: string; a: string }
type FAQSection = { icon: React.ElementType; title: string; color: string; items: FAQItem[] }

const sections: FAQSection[] = [
  {
    icon: HelpCircle,
    title: "General",
    color: "bg-primary/10 text-primary",
    items: [
      {
        q: "What is HeartsHeal?",
        a: "HeartsHeal is a free emotional wellness app designed to support you through grief, heartbreak, loss, and life transitions. It gives you tools to track your emotions, journal, practise guided breathing, and talk with Haven — a compassionate AI companion — all in one calm, private space.",
      },
      {
        q: "Is HeartsHeal completely free?",
        a: "Yes. Every core feature — Haven AI, the Emotional Log, Guided Breathing, and the Thoughts Journal — is free to use. Creating an account to sync your data across devices is also free. There are no hidden fees or paywalls on the tools that matter most.",
      },
      {
        q: "Who is HeartsHeal for?",
        a: "HeartsHeal is for anyone navigating emotional pain — grief and loss, heartbreak, divorce, job loss, loneliness, family estrangement, identity shifts, or trauma. No loss is too small. If it hurts, it matters, and you belong here.",
      },
      {
        q: "Do I need to create an account to use HeartsHeal?",
        a: "No. You can use every feature without signing up. All your data is stored locally on your device. Creating a free account simply lets you sync your data across multiple devices and keeps it safe in the cloud.",
      },
    ],
  },
  {
    icon: Sparkles,
    title: "Haven AI Companion",
    color: "bg-rose-100 text-rose-500 dark:bg-rose-900/40 dark:text-rose-400",
    items: [
      {
        q: "What is Haven?",
        a: "Haven is HeartsHeal's AI companion — a compassionate, non-judgmental presence that listens to what you're carrying and gently holds space for your feelings. Haven can also speak responses aloud and listen to your voice, making conversations feel more natural and human.",
      },
      {
        q: "Is Haven a licensed therapist or mental health professional?",
        a: "No. Haven is an AI-powered emotional support tool and is not a substitute for professional mental health care. Haven is designed to listen, reflect, and offer gentle encouragement — not to diagnose, treat, or provide clinical therapy. If you are in crisis, please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988.",
      },
      {
        q: "Are my Haven conversations stored or shared?",
        a: "No. Your Haven conversations are sent to Anthropic's Claude API to generate responses and are not stored by HeartsHeal. Anthropic processes messages according to their own privacy policy. HeartsHeal does not retain, read, or share your conversation content.",
      },
      {
        q: "Can Haven remember previous conversations?",
        a: "Each Haven session currently starts fresh. Haven reads your recent emotional log entries and your name (if set) to personalise responses, but does not retain full conversation history between sessions. This is an area we are actively improving.",
      },
    ],
  },
  {
    icon: Shield,
    title: "Privacy & Your Data",
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    items: [
      {
        q: "Is my emotional data private?",
        a: "Absolutely. When you use HeartsHeal without an account, everything stays on your device in local storage — nothing is sent to any server. If you create an account, your data is synced to Supabase, our secure cloud database, using industry-standard encryption. We never sell your data or use it for advertising.",
      },
      {
        q: "How do I sync my data across devices?",
        a: "Create a free account in Settings → Account & Sync (or via the Sign In button in the top nav). Once signed in, your emotional logs, journal entries, and quiz results sync automatically across any device where you sign in with the same account.",
      },
      {
        q: "How do I export or back up my data?",
        a: "Go to Settings → Your Data → Export. This downloads a JSON file of all your local data that you can keep as a backup or import on a new device using the Import button in the same section.",
      },
      {
        q: "How do I delete all my data?",
        a: "Go to Settings → Danger Zone → Delete All My Data to permanently clear all locally stored data from your device. If you have an account and want your cloud data deleted as well, use the Delete My Account option (available when signed in) or contact us at support@heartsheal.app.",
      },
    ],
  },
  {
    icon: BarChart3,
    title: "Features",
    color: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
    items: [
      {
        q: "What is the Emotional Log?",
        a: "The Emotional Log lets you record how you're feeling moment to moment — choose an emotion, pick an emoji, rate the intensity, and add notes. Over time your logs build a picture of your emotional patterns, shown in the analytics panel, so you can better understand yourself.",
      },
      {
        q: "What is the Thoughts Journal?",
        a: "The Thoughts Journal is a private space to write freely or respond to guided prompts. Haven AI can suggest personalised prompts based on your recent entries. You can also take self-compassion quizzes to deepen self-awareness.",
      },
      {
        q: "What breathing techniques does HeartsHeal offer?",
        a: "The Guided Breathing section includes Box Breathing (4-4-4-4), 4-7-8 Breathing, Relaxing Breath, Equal Breathing, and more. Each technique is paired with a gentle animation, optional ambient sounds, and can be read aloud by Haven's voice.",
      },
    ],
  },
  {
    icon: Heart,
    title: "Crisis & Support",
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    items: [
      {
        q: "What should I do if I'm in crisis right now?",
        a: "Please reach out immediately. Call or text 988 (Suicide & Crisis Lifeline) — available 24/7. You can also text HOME to 741741 for the Crisis Text Line. HeartsHeal and Haven are not crisis services and cannot provide emergency support.",
      },
      {
        q: "How do I contact HeartsHeal support?",
        a: "Email us at support@heartsheal.app. We aim to respond within 2 business days. For urgent mental health needs, please use the crisis resources above rather than waiting for a support response.",
      },
      {
        q: "Is HeartsHeal suitable for children?",
        a: "HeartsHeal is intended for users aged 13 and older. We do not knowingly collect data from children under 13. If you believe a child has provided personal information, please contact us at support@heartsheal.app and we will delete it promptly.",
      },
    ],
  },
]

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="glass-card rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <span className="text-sm font-semibold text-foreground leading-snug">{item.q}</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200",
                open === i && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                  {item.a}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

export default function FAQPage() {
  return (
    <PageContainer>
      <div className="max-w-3xl px-0 py-6 md:py-10">

        <Link
          href="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm mb-8"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Frequently Asked Questions</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10 ml-12">
          Everything you need to know about HeartsHeal.
        </p>

        <div className="space-y-8">
          {sections.map(({ icon: Icon, title, color, items }) => (
            <section key={title}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", color)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <h2 className="font-semibold text-base text-foreground">{title}</h2>
              </div>
              <FAQAccordion items={items} />
            </section>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-12 rounded-2xl bg-primary/5 border border-primary/15 px-6 py-6 text-center">
          <p className="font-semibold text-sm text-foreground mb-1">Still have a question?</p>
          <p className="text-xs text-muted-foreground mb-4">
            We're here to help. Send us a message and we'll get back to you within 2 business days.
          </p>
          <a
            href="mailto:support@heartsheal.app"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
          >
            Contact Support
          </a>
        </div>

      </div>
    </PageContainer>
  )
}
