import React from "react"
import { ThemeProvider } from "next-themes"
import { QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/features/auth"
import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { queryClient } from "@/infrastructure/query/query-client"

interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    // Tema dark-only (decisão do Design System 2026-07-10): `forcedTheme`
    // mantém a classe `.dark` no <html> sem toggle nem preferência do SO.
    <ThemeProvider attribute="class" forcedTheme="dark" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
