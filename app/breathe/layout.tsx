import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Guided Breathing",
  description: "Breathing techniques grounded in science to calm your nervous system and find clarity.",
}

export default function BreatheLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
