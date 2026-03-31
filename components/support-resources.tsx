"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, MessageSquare, Globe, ChevronDown, ChevronUp, Heart } from "lucide-react"

type Resource = {
  name: string
  description: string
  contact: string
  contactType: "phone" | "text" | "web"
  category: "crisis" | "grief" | "relationship" | "general"
}

const resources: Resource[] = [
  {
    name: "988 Suicide & Crisis Lifeline",
    description: "Free, confidential support 24/7 for people in distress",
    contact: "988",
    contactType: "phone",
    category: "crisis",
  },
  {
    name: "Crisis Text Line",
    description: "Text HOME to connect with a trained crisis counselor",
    contact: "741741",
    contactType: "text",
    category: "crisis",
  },
  {
    name: "GriefShare",
    description: "Support groups and resources for those dealing with grief and loss",
    contact: "griefshare.org",
    contactType: "web",
    category: "grief",
  },
  {
    name: "The Dougy Center",
    description: "Support for children, teens & families who've experienced a death",
    contact: "dougy.org",
    contactType: "web",
    category: "grief",
  },
  {
    name: "SAMHSA National Helpline",
    description: "Mental health & substance abuse treatment referrals, 24/7",
    contact: "1-800-662-4357",
    contactType: "phone",
    category: "general",
  },
  {
    name: "National Domestic Violence Hotline",
    description: "Support for those experiencing relationship abuse",
    contact: "1-800-799-7233",
    contactType: "phone",
    category: "relationship",
  },
]

const categoryLabels: Record<string, string> = {
  crisis: "🆘 Crisis Support",
  grief: "🕊️ Grief & Loss",
  relationship: "💔 Relationship Support",
  general: "🌿 General Mental Health",
}

export function SupportResources() {
  const [expanded, setExpanded] = useState(false)

  const grouped = resources.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {} as Record<string, Resource[]>)

  const contactIcon = (type: Resource["contactType"]) => {
    if (type === "phone") return <Phone className="w-3.5 h-3.5" />
    if (type === "text")  return <MessageSquare className="w-3.5 h-3.5" />
    return <Globe className="w-3.5 h-3.5" />
  }

  const contactHref = (r: Resource) => {
    if (r.contactType === "phone") return `tel:${r.contact.replace(/\D/g, "")}`
    if (r.contactType === "text")  return `sms:${r.contact}`
    return `https://${r.contact}`
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Support Resources</p>
            <p className="text-xs text-muted-foreground">Crisis lines, grief support & mental health help</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-border/40 pt-4">
              {(["crisis", "grief", "relationship", "general"] as const).map((cat) => {
                const items = grouped[cat]
                if (!items) return null
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wider">
                      {categoryLabels[cat]}
                    </p>
                    <div className="space-y-2">
                      {items.map((r) => (
                        <div key={r.name} className="glass-card rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-snug">{r.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.description}</p>
                          </div>
                          <a
                            href={contactHref(r)}
                            target={r.contactType === "web" ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                          >
                            {contactIcon(r.contactType)}
                            {r.contact}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
                If you're in immediate danger, please call <strong>911</strong> or your local emergency number.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
