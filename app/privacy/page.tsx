import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, Shield } from "lucide-react"

export const metadata: Metadata = { title: "Privacy Policy" }

const sections = [
  {
    title: "What data we collect",
    body: `When you use Haven without an account, all data (emotion logs, journal entries, quiz results) is stored only on your device using your browser's local storage. Nothing is sent to our servers.

When you create a free account, your data is synced to Supabase (our secure cloud database) so you can access it across devices. We store your email address and the content you choose to save.

When you use the Haven AI Companion, your messages are sent to Anthropic's Claude API to generate responses. These messages are not stored by Haven and are subject to Anthropic's privacy policy.`,
  },
  {
    title: "How we use your data",
    body: `We use your data solely to provide the Haven service to you. We do not sell your data, share it with advertisers, or use it for any purpose beyond operating the app.

Your emotional health data is deeply personal. We treat it with the utmost care and will never use it to build advertising profiles or share it with third parties without your explicit consent.`,
  },
  {
    title: "Data storage and security",
    body: `Account data is stored in Supabase, which uses industry-standard encryption at rest and in transit. Your password is never stored in plain text.

Guest data lives only in your browser's local storage and never leaves your device unless you choose to create an account.`,
  },
  {
    title: "Your rights",
    body: `You can export all your data at any time from Settings → Export Backup.

You can delete all locally stored data from Settings → Delete All My Data.

To request full account deletion (including cloud-synced data), contact us at support@haven.app. We will process your request within 30 days.

If you are located in the European Economic Area, you have the right to access, rectify, port, and erase your data under GDPR.`,
  },
  {
    title: "Cookies and tracking",
    body: `Haven does not use advertising cookies or third-party tracking. We collect anonymous, aggregated usage statistics (page views, performance) with no personal data attached.`,
  },
  {
    title: "Children's privacy",
    body: `Haven is not directed at children under 13. We do not knowingly collect data from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.`,
  },
  {
    title: "Changes to this policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the date below and, where appropriate, by email. Continued use of Haven after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: "Contact",
    body: `Questions about this Privacy Policy? Reach us at support@haven.app.`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-page-gradient">
      <div className="max-w-2xl mx-auto px-4 py-10">

        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm mb-8">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 2026</p>

        <p className="text-sm text-muted-foreground leading-relaxed mb-10">
          Haven is built on the belief that your emotional health data belongs to you alone. This policy explains what we collect, why, and how you stay in control.
        </p>

        <div className="space-y-8">
          {sections.map(({ title, body }) => (
            <div key={title} className="glass-card rounded-2xl p-6">
              <h2 className="font-semibold text-foreground mb-3">{title}</h2>
              {body.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3 last:mb-0">{para}</p>
              ))}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-10">
          &copy; {new Date().getFullYear()} Haven. All rights reserved.
        </p>
      </div>
    </div>
  )
}
