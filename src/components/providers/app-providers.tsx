"use client"

import { ThemeProvider } from "@/components/providers/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        {children}
        <Toaster richColors position="top-center" />
        <ServiceWorkerRegister />
      </TooltipProvider>
    </ThemeProvider>
  )
}
