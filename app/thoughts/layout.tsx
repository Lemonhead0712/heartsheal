import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Thoughts Journal",
  description: "Reflect through guided journaling and self-compassion prompts tailored to your emotional state.",
}

export default function ThoughtsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
