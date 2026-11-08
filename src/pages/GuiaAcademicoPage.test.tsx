// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AppRoutes from '../AppRoutes'
import GuiaAcademicoPage from './GuiaAcademicoPage'
import ResumoHistorico from '../features/historico/components/ResumoHistorico'
import { novoHistorico } from '../features/historico/models/types'
import { ThemeContext } from '../theme/theme'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

function montar(rota = '/guia-academico', tema: 'light' | 'dark' = 'light') {
  return render(<ThemeContext value={{ preference: tema, resolvedTheme: tema, setPreference: vi.fn() }}>
    <MemoryRouter initialEntries={[rota]}><AppRoutes /></MemoryRouter>
  </ThemeContext>)
}

describe('guia público', () => {
  it.each(['light', 'dark'] as const)('abre a rota no tema %s sem perfil, PDF, rede ou IndexedDB', tema => {
    const fetch = vi.fn(() => { throw new Error('Rede bloqueada') })
    const open = vi.fn(() => { throw new Error('IndexedDB bloqueado') })
    vi.stubGlobal('fetch', fetch)
    vi.stubGlobal('indexedDB', { open })
    montar('/guia-academico', tema)
    expect(screen.getByRole('heading', { level: 1, name: 'Guia Acadêmico da UFCA' })).toBeTruthy()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(document.querySelectorAll('footer')).toHaveLength(1)
    expect(screen.getByLabelText('Tema')).toBeTruthy()
    expect(screen.queryByLabelText('Selecionar PDF')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Índices oficiais de rendimento acadêmico' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Outras informações acadêmicas' })).toBeTruthy()
  })

  it('tem acesso pela página principal e mantém âncoras válidas', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('cursos-atual')
      ? { periodo: '2026.2', cursos: [{ id: 'exemplo', nome: 'Curso de exemplo', quantidade_turmas: 0, turmas: [] }] }
      : { cursos: [] } })))
    montar('/')
    await userEvent.click(await screen.findByRole('link', { name: 'Entenda seus índices acadêmicos' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Guia Acadêmico da UFCA' })).toBeTruthy()
    for (const link of screen.getAllByRole('link').filter(a => a.getAttribute('href')?.startsWith('#'))) {
      expect(document.getElementById(link.getAttribute('href')!.slice(1))).toBeTruthy()
    }
    expect(screen.getAllByRole('link', { name: /^Entender melhor/ })).toHaveLength(5)
  })

  it('foca a explicação ao chegar de outra rota e permite abrir fórmula e dúvida', async () => {
    montar('/guia-academico#mc')
    const titulo = screen.getByRole('heading', { name: 'MC — Média de Conclusão' })
    expect(document.activeElement).toBe(titulo)
    const formula = screen.getByText('Como é calculado? Ver fórmula e detalhes técnicos de MC')
    expect(formula.closest('details')?.open).toBe(false)
    // O jsdom não implementa a ativação nativa de summary por teclado.
    // Enter e Espaço são conferidos no navegador real.
    await userEvent.click(formula)
    expect(formula.closest('details')?.open).toBe(true)
    const artigo = titulo.closest('article')!
    expect(within(artigo).getByText(/MC = Σ/)).toBeTruthy()
    const duvida = within(artigo).getByText('Uma reprovação diminui diretamente minha MC?')
    await userEvent.click(duvida)
    expect(duvida.closest('details')?.open).toBe(true)
    const conteudo = artigo.textContent!
    expect(conteudo.indexOf('O que significa?')).toBeLessThan(conteudo.indexOf('Como funciona?'))
    expect(conteudo.indexOf('Como funciona?')).toBeLessThan(conteudo.indexOf('Como é calculado?'))
  })

  it('preserva valores extraídos e explica inclusive os nulos, sem dados pessoais na URL', async () => {
    const perfil = novoHistorico()
    perfil.indicesOficiais = { mc: 8.4321, mcn: null, iech: 0, iepl: 0.9876, iea: 6.1234 }
    const anterior = structuredClone(perfil)
    const alterar = vi.fn()
    render(<MemoryRouter initialEntries={['/resumo']}><Routes>
      <Route path="/resumo" element={<ResumoHistorico perfil={perfil} alterar={alterar} />} />
      <Route path="/guia-academico" element={<GuiaAcademicoPage />} />
    </Routes></MemoryRouter>)
    const lista = document.querySelector('.historico-indices')!
    expect(within(lista as HTMLElement).getByText('8.4321')).toBeTruthy()
    expect(within(lista as HTMLElement).getByText('Não identificado')).toBeTruthy()
    expect(within(lista as HTMLElement).getByText('0')).toBeTruthy()
    for (const id of ['mc', 'mcn', 'iech', 'iepl', 'iea']) {
      const link = screen.getByRole('link', { name: `Entenda este índice: ${id.toUpperCase()}` })
      expect(link.getAttribute('href')).toBe(`/guia-academico#${id}`)
    }
    await userEvent.click(screen.getByRole('link', { name: 'Entenda este índice: MCN' }))
    expect(document.activeElement?.id).toBe('mcn')
    expect(alterar).not.toHaveBeenCalled()
    expect(perfil).toEqual(anterior)
  })
})
