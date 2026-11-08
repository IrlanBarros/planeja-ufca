import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import App from '../App'
import CurriculoPage from '../pages/CurriculoPage'
import { ThemeContext } from '../theme/theme'
import type { ThemePreference } from '../theme/theme'
import AppLayout from './AppLayout'
import Footer from './Footer'
import HistoricoProvider from '../features/historico/hooks/HistoricoProvider'

afterEach(() => vi.useRealTimers())

describe('rodapé compartilhado', () => {
  it.each([
    [2025, '2026'],
    [2026, '2026'],
    [2027, '2026–2027'],
  ])('mantém o ano inicial em %i', (year, expected) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(year, 6, 1))
    const markup = renderToStaticMarkup(<MemoryRouter><Footer /></MemoryRouter>)
    expect(markup).toContain(`© ${expected} Irlan Barros`)
    expect(markup).toContain('Autoria e desenvolvimento')
    expect(markup).toContain('Licença MIT')
    expect(markup).toContain('Projeto independente, não oficial da Universidade Federal do Cariri.')
    expect(markup).toContain('<footer')
  })

  it.each([
    ['/', 'Carregando turmas...'],
    ['/curriculo', 'Escolha seu curso'],
    ['/curriculo?curso=32652294', 'Carregando estrutura'],
  ])('mostra um único rodapé e seletor em %s, inclusive durante carregamento/erro', (route, content) => {
    const markup = renderToStaticMarkup(
      <ThemeContext value={{ preference: 'system', resolvedTheme: 'light', setPreference: vi.fn() }}>
        <HistoricoProvider><MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<App />} />
              <Route path="/curriculo" element={<CurriculoPage />} />
            </Route>
          </Routes>
        </MemoryRouter></HistoricoProvider>
      </ThemeContext>,
    )
    expect(markup).toContain(content)
    expect(markup.match(/<footer/g)).toHaveLength(1)
    expect(markup.match(/<main/g)).toHaveLength(1)
    expect(markup.match(/id="theme-preference"/g)).toHaveLength(1)
    expect(markup).toContain('for="theme-preference"')
    expect(markup.indexOf('<footer')).toBeGreaterThan(markup.indexOf('</main>'))
  })

  it.each(['light', 'dark', 'system'] as ThemePreference[])('identifica a opção ativa %s', (preference) => {
    const markup = renderToStaticMarkup(
      <ThemeContext value={{ preference, resolvedTheme: 'light', setPreference: vi.fn() }}>
        <MemoryRouter><AppLayout /></MemoryRouter>
      </ThemeContext>,
    )
    expect(markup).toContain(`<option value="${preference}" selected=""`)
  })
})
