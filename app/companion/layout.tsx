import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Haven AI Companion",
  description: "Talk to Haven, your compassionate AI companion for emotional healing and support.",
}

export default function CompanionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
