"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type ColorTheme = "midnight" | "ocean" | "forest" | "ember" | "blush" | "arctic"

const STORAGE_KEY = "heartsHeal_colorTheme"
const ALL_THEMES: ColorTheme[] = ["midnight", "ocean", "forest", "ember", "blush", "arctic"]

interface ColorThemeContextValue {
  colorTheme: ColorTheme
  setColorTheme: (t: ColorTheme) => void
}

const ColorThemeContext = createContext<ColorThemeContextValue>({
  colorTheme: "midnight",
  setColorTheme: () => {},
})

function applyTheme(t: ColorTheme) {
  if (typeof document === "undefined") return
  const el = document.documentElement
  ALL_THEMES.forEach((name) => el.classList.remove(`theme-${name}`))
  if (t !== "midnight") el.classList.add(`theme-${t}`)
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("midnight")

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorTheme | null
    const theme = saved && ALL_THEMES.includes(saved) ? saved : "midnight"
    applyTheme(theme)
    setColorThemeState(theme)
  }, [])

  const setColorTheme = (t: ColorTheme) => {
    localStorage.setItem(STORAGE_KEY, t)
    applyTheme(t)
    setColorThemeState(t)
  }

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  )
}

export const useColorTheme = () => useContext(ColorThemeContext)
