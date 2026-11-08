import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from './AppRoutes'
import { ThemeContext } from './theme/theme'
import { HistoricoContext } from './features/historico/hooks/context'
import html from '../index.html?raw'
import favicon from '../public/favicon.svg?raw'
import pacote from '../package.json'
import lock from '../package-lock.json'

describe('identidade pública Planeja UFCA', () => {
  it('mantém idioma, favicon e identidade no template, reservando metadados por rota ao React', () => {
    expect(html).toContain('<html lang="pt-BR">')
    expect(html).toContain('name="application-name" content="Planeja UFCA"')
    expect(html).not.toMatch(/<title>|name="description"|property="og:title"/)
    expect(html).toContain('href="/favicon.svg"')
    expect(html).not.toMatch(/rel="canonical"|property="og:url"/)
    expect(favicon).toContain('<title>Planeja UFCA')
    expect(pacote.name).toBe('planeja-ufca')
    expect(lock.name).toBe(pacote.name); expect(lock.packages[''].name).toBe(pacote.name)
  })
  it.each(['/', '/curriculo', '/historico', '/recomendacoes', '/guia-academico', '/privacidade'])('apresenta a nova marca em acesso direto a %s', rota => {
    const markup = renderToStaticMarkup(<ThemeContext value={{ preference: 'system', resolvedTheme: 'light', setPreference: vi.fn() }}>
      <HistoricoContext value={{ perfil: null, salvo: false, carregando: false, erro: null, confirmar: vi.fn(), apagar: vi.fn() }}>
        <MemoryRouter initialEntries={[rota]}><AppRoutes /></MemoryRouter>
      </HistoricoContext></ThemeContext>)
    expect(markup).toContain('Planeja UFCA')
    expect(markup).not.toMatch(/Seu Hor[áa]rio\s*(?:[-·]\s*)?UFCA|Projeta UFCA/)
    expect(markup).toContain('Irlan Barros')
    expect(markup).toContain('Licença MIT')
    expect(markup).toContain('não oficial da Universidade Federal do Cariri')
  })
})
