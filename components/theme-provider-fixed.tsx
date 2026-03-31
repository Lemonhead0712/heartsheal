"use client"

import type React from "react"
import { ThemeProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProviderFixed({ children, ...props }: ThemeProviderProps) {
  return <ThemeProvider {...props}>{children}</ThemeProvider>
}
