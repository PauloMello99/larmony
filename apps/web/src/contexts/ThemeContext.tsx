// Larmony is dark-mode only. ThemeContext is kept as a no-op stub so that
// existing imports (e.g. SettingsPage) don't break during migration.

import { createContext, useContext } from 'react'

interface ThemeContextValue {
  theme: 'dark'
  toggleTheme: () => void
  setTheme: (t: 'dark') => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: () => {}, setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext)
}
