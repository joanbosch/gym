"use client"

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useSyncExternalStore } from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = Exclude<Theme, "system">

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const THEME_EVENT = "gym-theme-change"

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme, system: ResolvedTheme) {
  const resolved = theme === "system" ? system : theme
  document.documentElement.classList.toggle("dark", resolved === "dark")
  document.documentElement.style.colorScheme = resolved
}

function getThemeSnapshot(): `${Theme}:${ResolvedTheme}` {
  const storedTheme = localStorage.getItem("theme")
  const theme = isTheme(storedTheme) ? storedTheme : "system"
  return `${theme}:${systemTheme()}`
}

function getServerThemeSnapshot(): `${Theme}:${ResolvedTheme}` {
  return "system:light"
}

function subscribeToTheme(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  const handleStorage = (event: StorageEvent) => {
    if (event.key === "theme") onStoreChange()
  }

  media.addEventListener("change", onStoreChange)
  window.addEventListener("storage", handleStorage)
  window.addEventListener(THEME_EVENT, onStoreChange)
  return () => {
    media.removeEventListener("change", onStoreChange)
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(THEME_EVENT, onStoreChange)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot)
  const [theme, preferredTheme] = snapshot.split(":") as [Theme, ResolvedTheme]

  useLayoutEffect(() => applyTheme(theme, preferredTheme), [preferredTheme, theme])

  const setTheme = useCallback((nextTheme: Theme) => {
    localStorage.setItem("theme", nextTheme)
    applyTheme(nextTheme, systemTheme())
    window.dispatchEvent(new Event(THEME_EVENT))
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedTheme: theme === "system" ? preferredTheme : theme,
    setTheme,
  }), [preferredTheme, setTheme, theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme debe utilizarse dentro de ThemeProvider")
  return context
}
