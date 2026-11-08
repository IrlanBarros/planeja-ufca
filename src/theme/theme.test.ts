import html from '../../index.html?raw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  subscribeToSystemTheme,
  systemPrefersDark,
  THEME_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
} from './theme'

const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)![1]
const runBootstrap = new Function('localStorage', 'window', 'document', bootstrap)

function browserEnvironment(saved: string | null, dark: boolean, blocked = false) {
  const listeners = new Set<() => void>()
  const media = {
    matches: dark,
    addEventListener: vi.fn((_event: string, callback: () => void) => listeners.add(callback)),
    removeEventListener: vi.fn((_event: string, callback: () => void) => listeners.delete(callback)),
  }
  const storage = {
    getItem: vi.fn<(chave: string) => string | null>(() => {
      if (blocked) throw new Error('SecurityError')
      return saved
    }),
    setItem: vi.fn<(chave: string, valor: string) => void>(() => {
      if (blocked) throw new Error('SecurityError')
    }),
  }
  const browserWindow = { matchMedia: vi.fn(() => media) }
  const browserDocument = { documentElement: { dataset: { theme: '' }, style: { colorScheme: '' } } }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', browserWindow)
  vi.stubGlobal('document', browserDocument)
  return { media, listeners, storage, browserWindow, browserDocument }
}

afterEach(() => vi.unstubAllGlobals())

describe('preferência de tema e primeiro quadro', () => {
  it.each(['light', 'dark', 'system'] as const)('migra %s uma única vez e mantém bootstrap e React de acordo', value => {
    const env = browserEnvironment(null, true)
    const dados = new Map<string, string>([[LEGACY_THEME_STORAGE_KEY, value]])
    env.storage.getItem.mockImplementation(chave => dados.get(chave) ?? null)
    env.storage.setItem.mockImplementation((chave, valor) => { dados.set(chave, valor) })
    runBootstrap(env.storage, env.browserWindow, env.browserDocument)
    expect(dados.get(THEME_STORAGE_KEY)).toBe(value)
    expect(readThemePreference()).toBe(value)
    expect(env.storage.setItem).toHaveBeenCalledTimes(1)
    expect(env.browserDocument.documentElement.dataset.theme).toBe(value === 'system' ? 'dark' : value)
    expect(dados.get(LEGACY_THEME_STORAGE_KEY)).toBe(value)
  })
  it('prioriza nova chave até quando inválida e tolera falha ao migrar', () => {
    const env = browserEnvironment(null, false)
    env.storage.getItem.mockImplementation(chave => chave === THEME_STORAGE_KEY ? 'light' : 'dark')
    expect(readThemePreference()).toBe('light')
    env.storage.getItem.mockImplementation(chave => chave === THEME_STORAGE_KEY ? 'inválido' : 'dark')
    expect(readThemePreference()).toBe('system')
    env.storage.getItem.mockImplementation(chave => chave === THEME_STORAGE_KEY ? null : 'dark')
    env.storage.setItem.mockImplementation(() => { throw new Error('quota') })
    expect(readThemePreference()).toBe('dark')
    runBootstrap(env.storage, env.browserWindow, env.browserDocument)
    expect(env.browserDocument.documentElement.dataset.theme).toBe('dark')
  })
  it.each([
    ['light', true, 'light', 'light'],
    ['dark', false, 'dark', 'dark'],
    ['system', true, 'system', 'dark'],
    ['system', false, 'system', 'light'],
    [null, true, 'system', 'dark'],
    [null, false, 'system', 'light'],
    ['invalid', true, 'system', 'dark'],
    ['', false, 'system', 'light'],
  ] as const)('armazenamento %s, sistema escuro %s: %s / %s', (saved, dark, preference, resolved) => {
    const env = browserEnvironment(saved, dark)
    expect(readThemePreference()).toBe(preference)
    expect(resolveTheme(readThemePreference(), systemPrefersDark())).toBe(resolved)
    // O script real do HTML deve chegar ao mesmo resultado, antes de o React carregar.
    runBootstrap(env.storage, env.browserWindow, env.browserDocument)
    expect(env.browserDocument.documentElement.dataset.theme).toBe(resolved)
    expect(env.browserDocument.documentElement.style.colorScheme).toBe(resolved)
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('<body>'))
  })

  it('tolera falhas de leitura e escrita, inclusive no bootstrap', () => {
    const env = browserEnvironment(null, true, true)
    expect(readThemePreference()).toBe('system')
    expect(() => saveThemePreference('dark')).not.toThrow()
    runBootstrap(env.storage, env.browserWindow, env.browserDocument)
    expect(env.browserDocument.documentElement.dataset.theme).toBe('dark')
    expect(() => applyTheme('light')).not.toThrow()
    expect(env.browserDocument.documentElement.dataset.theme).toBe('light')
  })

  it.each(['light', 'dark', 'system'] as const)('persiste %s usando somente a chave específica', (value) => {
    const { storage } = browserEnvironment(null, false)
    saveThemePreference(value)
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(THEME_STORAGE_KEY, value)
  })

  it('acompanha mudanças do sistema e remove o listener ao desmontar', () => {
    const { media, listeners } = browserEnvironment(null, false)
    const onChange = vi.fn()
    const unsubscribe = subscribeToSystemTheme(onChange)
    expect(systemPrefersDark()).toBe(false)
    media.matches = true
    listeners.forEach((listener) => listener())
    expect(onChange).toHaveBeenCalledOnce()
    expect(resolveTheme('system', systemPrefersDark())).toBe('dark')
    expect(resolveTheme('light', systemPrefersDark())).toBe('light')
    media.matches = false
    listeners.forEach((listener) => listener())
    expect(resolveTheme('system', systemPrefersDark())).toBe('light')
    expect(resolveTheme('dark', systemPrefersDark())).toBe('dark')
    unsubscribe()
    expect(listeners.size).toBe(0)
    expect(media.removeEventListener).toHaveBeenCalledWith('change', onChange)
  })

  it('usa claro se matchMedia não estiver disponível', () => {
    const env = browserEnvironment(null, false)
    vi.stubGlobal('window', {})
    expect(systemPrefersDark()).toBe(false)
    expect(() => subscribeToSystemTheme(vi.fn())()).not.toThrow()
    runBootstrap(env.storage, {}, env.browserDocument)
    expect(env.browserDocument.documentElement.dataset.theme).toBe('light')
  })
})
