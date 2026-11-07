import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  subscribeToSystemTheme,
  systemPrefersDark,
  ThemeContext,
} from './theme'
import type { ThemePreference } from './theme'

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setThemePreference] = useState(readThemePreference)
  const prefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    systemPrefersDark,
    () => false,
  )
  const resolvedTheme = resolveTheme(preference, prefersDark)

  useLayoutEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  function setPreference(value: ThemePreference) {
    saveThemePreference(value)
    setThemePreference(value)
  }

  return (
    <ThemeContext value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext>
  )
}
