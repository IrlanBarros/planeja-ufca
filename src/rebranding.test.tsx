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

describe('identidade pública Projeta UFCA', () => {
  it('mantém título, idioma, favicon e metadados sem antecipar um deploy não verificado', () => {
    expect(html).toContain('<title>Projeta UFCA</title>')
    expect(html).toContain('<html lang="pt-BR">')
    expect(html).toContain('name="application-name" content="Projeta UFCA"')
    expect(html).toContain('property="og:title" content="Projeta UFCA"')
    expect(html).toContain('href="/favicon.svg"')
    expect(html).not.toMatch(/rel="canonical"|property="og:url"/)
    expect(favicon).toContain('<title>Projeta UFCA')
    expect(pacote.name).toBe('projeta-ufca')
    expect(lock.name).toBe(pacote.name); expect(lock.packages[''].name).toBe(pacote.name)
  })
  it.each(['/', '/curriculo', '/historico', '/recomendacoes', '/guia-academico', '/privacidade'])('apresenta a nova marca em acesso direto a %s', rota => {
    const markup = renderToStaticMarkup(<ThemeContext value={{ preference: 'system', resolvedTheme: 'light', setPreference: vi.fn() }}>
      <HistoricoContext value={{ perfil: null, salvo: false, carregando: false, erro: null, confirmar: vi.fn(), apagar: vi.fn() }}>
        <MemoryRouter initialEntries={[rota]}><AppRoutes /></MemoryRouter>
      </HistoricoContext></ThemeContext>)
    expect(markup).toContain('Projeta UFCA')
    expect(markup).not.toMatch(/Seu Hor[áa]rio\s*(?:[-·]\s*)?UFCA/)
    expect(markup).toContain('Irlan Barros')
    expect(markup).toContain('Licença MIT')
    expect(markup).toContain('não oficial da Universidade Federal do Cariri')
  })
})
