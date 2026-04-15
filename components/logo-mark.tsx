"use client"
import { useId } from "react"
import { cn } from "@/lib/utils"

export function HavenMark({ className }: { className?: string }) {
  const uid = useId()
  const gradId = `haven-bg-${uid.replace(/:/g, "")}`
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "var(--orb-from, #6366F1)" }} />
          <stop offset="100%" style={{ stopColor: "var(--orb-to, #8B5CF6)" }} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="40" height="40" rx="9" fill={`url(#${gradId})`} />
      <line
        x1="13" y1="9" x2="13" y2="31"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.95"
      />
      <path
        d="M 13 20 C 13 13 27 13 27 20 L 27 31"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        fill="none" strokeOpacity="0.95"
      />
      <circle cx="27" cy="9" r="2" fill="white" fillOpacity="0.9" />
    </svg>
  )
}
