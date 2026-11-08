// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { limparCachePublico } from '../data/publicJson'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter } from 'react-router-dom'
import AppRoutes from '../AppRoutes'
import HistoricoProvider from '../features/historico/hooks/HistoricoProvider'
import { HistoricoContext } from '../features/historico/hooks/context'
import { salvarPerfil, lerPerfil } from '../features/historico/storage/indexedDb'
import { importarPdf } from '../features/historico/parser/importarPdf'
import { ThemeContext } from '../theme/theme'
import { dadosCurriculoTeste } from '../features/curriculo/fixtures.test-utils'
import { exportarCurriculoCsv } from '../features/curriculo/exportacao/exportarCurriculoCsv'
import { exportarCurriculoPdf } from '../features/curriculo/exportacao/exportarCurriculoPdf'
import { tentativa } from '../features/recomendacoes/fixtures.test-utils'

vi.mock('../features/historico/parser/importarPdf', async original => ({ ...await original<typeof import('../features/historico/parser/importarPdf')>(), importarPdf: vi.fn() }))
vi.mock('../features/curriculo/exportacao/exportarCurriculoCsv', () => ({ exportarCurriculoCsv: vi.fn() }))
vi.mock('../features/curriculo/exportacao/exportarCurriculoPdf', () => ({ exportarCurriculoPdf: vi.fn() }))
let dados = dadosCurriculoTeste()

beforeEach(() => {
  limparCachePublico()
  globalThis.indexedDB = new IDBFactory(); localStorage.clear()
  dados = dadosCurriculoTeste()
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(dados.agora)
  vi.mocked(importarPdf).mockResolvedValue(dados.perfil)
  vi.mocked(exportarCurriculoCsv).mockReset(); vi.mocked(exportarCurriculoPdf).mockReset()
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('index.json') ? { cursos: dados.cursos } : url.includes('cursos-atual') ? dados.oferta : { curso_id: 'curso', estruturas: dados.estruturas } })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })

function montar(rota = '/curriculo?curso=curso', tema: 'light' | 'dark' | 'system' = 'light') {
  return render(<ThemeContext value={{ preference: tema, resolvedTheme: tema === 'dark' ? 'dark' : 'light', setPreference: vi.fn() }}><HistoricoProvider><MemoryRouter initialEntries={[rota]}><AppRoutes /></MemoryRouter></HistoricoProvider></ThemeContext>)
}
async function carregarPerfil(rota = '/curriculo?curso=curso') {
  await salvarPerfil(dados.perfil); montar(rota)
  await screen.findByLabelText('Estrutura')
  await waitFor(() => expect((screen.getByRole('button', { name: 'Meu progresso' }) as HTMLButtonElement).disabled).toBe(false))
}
async function verProgresso() {
  await userEvent.click(screen.getByRole('button', { name: 'Meu progresso' }))
  await screen.findByRole('heading', { name: 'Progresso da graduação' })
}

describe('currículo público e personalizado', () => {
  it('sem histórico mantém todos os grupos e exporta PDF/CSV originais por ação explícita', async () => {
    montar(); await screen.findByLabelText('Estrutura')
    expect((await screen.findByRole('link', { name: 'Importar meu histórico' })).getAttribute('href')).toBe('/historico')
    expect((screen.getByRole('button', { name: 'Meu progresso' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('region', { name: 'Outros componentes obrigatórios' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Optativas' })).toBeTruthy()
    expect(exportarCurriculoPdf).not.toHaveBeenCalled(); expect(exportarCurriculoCsv).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))
    await waitFor(() => expect(exportarCurriculoPdf).toHaveBeenCalledOnce())
    await userEvent.click(screen.getByRole('button', { name: 'Baixar CSV' }))
    expect(vi.mocked(exportarCurriculoCsv).mock.calls[0][0]).toMatchObject({ modo: 'original', indicadores: [], emitidoEm: null })
    expect(vi.mocked(exportarCurriculoPdf).mock.calls[0][0].linhas).toHaveLength(6)
    expect(await lerPerfil()).toBeNull()
  })
  it.each(['light', 'dark', 'system'] as const)('alterna os modos, preserva matriz e mostra barras/legenda/detalhes no tema %s', async tema => {
    await salvarPerfil(dados.perfil); montar('/curriculo?curso=curso', tema)
    await screen.findByLabelText('Estrutura')
    await waitFor(() => expect((screen.getByRole('button', { name: 'Meu progresso' }) as HTMLButtonElement).disabled).toBe(false))
    await verProgresso()
    expect(screen.getAllByRole('progressbar')).toHaveLength(4)
    expect(screen.getByRole('progressbar', { name: 'Progresso geral' }).getAttribute('value')).toBe('200')
    expect(screen.getByRole('region', { name: 'Legenda das situações' })).toBeTruthy()
    const resumo = screen.getByText('ABC0002 — Componente ABC0002').closest('summary')!
    resumo.focus(); expect(document.activeElement).toBe(resumo)
    // <summary> oferece o comportamento de teclado nativo, sem eventos de mouse em divs.
    await userEvent.click(resumo)
    expect(resumo.parentElement?.hasAttribute('open')).toBe(true)
    expect(within(resumo.parentElement!).getAllByText(/equivalência prevista na matriz/).length).toBeGreaterThan(0)
    expect(resumo.parentElement?.classList.contains('estado-concluida')).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Estrutura original' }))
    expect(screen.queryByRole('heading', { name: 'Progresso da graduação' })).toBeNull()
    expect((screen.getByLabelText('Estrutura') as HTMLSelectElement).value).toBe(dados.estrutura.id)
    expect(document.querySelectorAll('footer')).toHaveLength(1)
  })
  it('prefere a matriz exata do histórico em vez da mais recente e mantém consulta a outras', async () => {
    dados.estruturas.unshift({ ...dados.estrutura, id: 'mais-recente', codigo: 'AB002', ano_criacao: 2026 })
    await carregarPerfil()
    expect((screen.getByLabelText('Estrutura') as HTMLSelectElement).value).toBe(dados.estrutura.id)
    await verProgresso()
    await userEvent.selectOptions(screen.getByLabelText('Estrutura'), 'mais-recente')
    expect(screen.queryByRole('heading', { name: 'Progresso da graduação' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Meu progresso' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Esta estrutura é diferente/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Baixar CSV' }))
    expect(vi.mocked(exportarCurriculoCsv).mock.calls[0][0]).toMatchObject({ modo: 'original', estrutura: { codigo: 'AB002' } })
  })
  it.each(['curso', 'matriz', 'id-interno'])('não personaliza quando o vínculo é incompatível: %s', async caso => {
    if (caso === 'curso') dados.perfil.curso.idCurso = 'outro'
    else dados.perfil.curso.estruturaCurricular = caso === 'matriz' ? 'AB999' : dados.estrutura.id
    await salvarPerfil(dados.perfil); montar('/curriculo?curso=curso&modo=progresso')
    await screen.findByLabelText('Estrutura')
    await screen.findByText(/A consulta e a exportação originais continuam disponíveis/)
    expect((screen.getByRole('button', { name: 'Meu progresso' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Progresso da graduação' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))
    await waitFor(() => expect(exportarCurriculoPdf).toHaveBeenCalledOnce())
    expect(vi.mocked(exportarCurriculoPdf).mock.calls[0][0].modo).toBe('original')
  })
  it('explica ambiguidade e exige confirmação explícita de matriz', async () => {
    dados.estruturas.push({ ...dados.estrutura, id: 'duplicada' })
    await salvarPerfil(dados.perfil); montar('/curriculo?curso=curso&estrutura=duplicada&modo=progresso')
    await screen.findByLabelText('Estrutura')
    expect((screen.getByRole('button', { name: 'Meu progresso' }) as HTMLButtonElement).disabled).toBe(true)
    await userEvent.click(await screen.findByRole('button', { name: /Confirmar matriz AB001 · ID duplicada/ }))
    await verProgresso()
    expect((screen.getByLabelText('Estrutura') as HTMLSelectElement).value).toBe('duplicada')
  })
  it('a falha da oferta mantém a matriz e transforma a matrícula em situação a verificar', async () => {
    const anterior = vi.mocked(fetch).getMockImplementation()!
    vi.stubGlobal('fetch', vi.fn((url, opts) => String(url).includes('cursos-atual') ? Promise.reject(new Error('Sem oferta')) : anterior(url, opts)))
    await carregarPerfil(); await verProgresso()
    const card = screen.getByText('ABC0003 — Componente ABC0003').closest('details')!
    expect(card.classList.contains('estado-verificar')).toBe(true)
    expect(screen.getByText(/Período da oferta pública indisponível/)).toBeTruthy()
  })
  it('atualiza e remove indicadores imediatamente quando o contexto muda, sem recarregar dados públicos', async () => {
    let alterar: (perfil: typeof dados.perfil | null) => void = vi.fn()
    const { useState } = await import('react')
    function ContextoTeste() {
      const [perfil, setPerfil] = useState<typeof dados.perfil | null>(dados.perfil)
      alterar = setPerfil
      return <HistoricoContext value={{ perfil, salvo: false, carregando: false, erro: null, confirmar: vi.fn(), apagar: vi.fn() }}><MemoryRouter initialEntries={['/curriculo?curso=curso&modo=progresso']}><Link to="/curriculo">Limpar curso</Link><AppRoutes /></MemoryRouter></HistoricoContext>
    }
    render(<ThemeContext value={{ preference: 'light', resolvedTheme: 'light', setPreference: vi.fn() }}><ContextoTeste /></ThemeContext>)
    await screen.findByRole('heading', { name: 'Progresso da graduação' })
    const consultas = vi.mocked(fetch).mock.calls.length
    await act(async () => alterar({ ...dados.perfil, componentesCursados: [...dados.perfil.componentesCursados, tentativa('ABC0004', 'APR')] }))
    expect(screen.getByText('ABC0004 — Componente ABC0004').closest('details')?.classList.contains('estado-concluida')).toBe(true)
    await act(async () => alterar(null))
    expect(screen.queryByRole('heading', { name: 'Progresso da graduação' })).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull(); expect(screen.queryByRole('region', { name: 'Legenda das situações' })).toBeNull()
    expect(vi.mocked(fetch).mock.calls.length).toBe(consultas)
    await userEvent.click(screen.getByRole('link', { name: 'Limpar curso' }))
    expect(screen.queryByLabelText('Estrutura')).toBeNull()
  })
  it.each([false, true])('fluxo integrado: importa, navega, exporta progresso, apaga e retorna à matriz pública (salvo: %s)', async persistir => {
    montar('/historico')
    await userEvent.click(await screen.findByRole('button', { name: 'Importar histórico acadêmico' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar processamento local' }))
    await userEvent.upload(screen.getByLabelText('Selecionar PDF'), new File(['%PDF'], 'sintetico.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByRole('button', { name: 'Analisar PDF neste navegador' }))
    await screen.findByRole('heading', { name: 'Confira o histórico antes de usar' })
    await userEvent.click(screen.getByRole('button', { name: persistir ? 'Salvar neste dispositivo' : 'Usar somente nesta sessão' }))
    const link = await screen.findByRole('link', { name: 'Visualizar meu progresso curricular' })
    expect(link.getAttribute('href')).toContain('estrutura=id-interno')
    await userEvent.click(link)
    await screen.findByRole('heading', { name: 'Progresso da graduação' })
    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))
    await waitFor(() => expect(exportarCurriculoPdf).toHaveBeenCalledOnce())
    await userEvent.click(screen.getByRole('button', { name: 'Baixar CSV' }))
    expect(vi.mocked(exportarCurriculoPdf).mock.calls[0][0].modo).toBe('progresso')
    expect(vi.mocked(exportarCurriculoCsv).mock.calls[0][0].modo).toBe('progresso')
    expect(vi.mocked(exportarCurriculoCsv).mock.calls[0][0].indicadores[0].percentual).toBe(50)
    await userEvent.click(screen.getByRole('link', { name: 'Conferir ou atualizar meu histórico' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Apagar meus dados acadêmicos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão local' }))
    await screen.findByRole('heading', { name: 'Nenhum histórico importado' })
    expect(await lerPerfil()).toBeNull()
    await userEvent.click(screen.getByRole('link', { name: '← Voltar aos horários' }))
    await userEvent.click(await screen.findByRole('link', { name: 'Ver estrutura curricular' }))
    await screen.findByLabelText('Estrutura')
    expect((screen.getByRole('button', { name: 'Meu progresso' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('progressbar')).toBeNull()
    for (const [url, options] of vi.mocked(fetch).mock.calls) {
      expect(String(url).startsWith('/data/')).toBe(true); expect(options?.method).toBeUndefined(); expect(options?.body).toBeUndefined()
    }
  })
  it('abre a matriz vinculada a partir das recomendações', async () => {
    await salvarPerfil(dados.perfil); montar('/recomendacoes')
    await userEvent.click(await screen.findByRole('link', { name: 'Ver minha estrutura curricular' }))
    await screen.findByRole('heading', { name: 'Progresso da graduação' })
    expect((screen.getByLabelText('Estrutura') as HTMLSelectElement).value).toBe(dados.estrutura.id)
  })
  it('mostra falhas do catálogo e erro de exportação sem esconder a matriz pública', async () => {
    montar(); await screen.findByLabelText('Estrutura')
    vi.mocked(exportarCurriculoCsv).mockImplementationOnce(() => { throw new Error('Falha de download') })
    await userEvent.click(screen.getByRole('button', { name: 'Baixar CSV' }))
    expect(await screen.findByText(/Não foi possível gerar o arquivo/)).toBeTruthy()
    cleanup(); limparCachePublico(); vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Falha do catálogo') }))
    montar(); expect((await screen.findByRole('alert')).textContent).toContain('Falha do catálogo')
  })
})
