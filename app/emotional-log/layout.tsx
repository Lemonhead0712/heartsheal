import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Emotional Log",
  description: "Track your emotional patterns day by day. Awareness is the first step toward healing.",
}

export default function EmotionalLogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
