import type React from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  bare?: boolean
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("bg-page-gradient", className)}>
      <div className="mx-auto w-full max-w-2xl md:max-w-4xl px-4 md:px-8 py-5">{children}</div>
    </div>
  )
}
