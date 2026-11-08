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

const subscribeToHydration = () => () => {}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false)
  const [preference, setThemePreference] = useState(readThemePreference)
  const prefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    systemPrefersDark,
    () => false,
  )
  const resolvedTheme = resolveTheme(preference, prefersDark)

  useLayoutEffect(() => {
    // O bootstrap do HTML já aplicou a preferência antes do primeiro quadro.
    if (hydrated) applyTheme(resolvedTheme)
  }, [resolvedTheme, hydrated])

  function setPreference(value: ThemePreference) {
    saveThemePreference(value)
    setThemePreference(value)
  }

  return (
    <ThemeContext value={{ preference: hydrated ? preference : 'system', resolvedTheme, setPreference }}>
      {children}
    </ThemeContext>
  )
}
