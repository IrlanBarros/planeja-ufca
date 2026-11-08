import { createContext, useContext } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'projeta-ufca:theme'
export const LEGACY_THEME_STORAGE_KEY = 'seu-horario-ufca:theme'
const SYSTEM_QUERY = '(prefers-color-scheme: dark)'

export function readThemePreference(): ThemePreference {
  try {
    const atual = localStorage.getItem(THEME_STORAGE_KEY)
    const value = atual ?? localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') {
      // Mesmo com a escrita bloqueada, a preferência legada vale nesta sessão.
      if (atual === null) saveThemePreference(value)
      return value
    }
  } catch {
    // A preferência continua funcionando em memória se o navegador bloquear o acesso.
  }
  return 'system'
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Persistência é opcional; a troca de tema não depende dela.
  }
}

export function systemPrefersDark() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia(SYSTEM_QUERY).matches
}

export function subscribeToSystemTheme(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const media = window.matchMedia(SYSTEM_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference
}

export function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme requer ThemeProvider')
  return context
}
