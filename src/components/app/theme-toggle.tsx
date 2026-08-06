"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/providers/theme-provider"

const subscribe = () => () => undefined

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)
  const isDark = resolvedTheme === "dark"
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={mounted && isDark ? "Activar modo claro" : "Activar modo oscuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
    </Button>
  )
}
