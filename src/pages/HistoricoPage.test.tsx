// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import HistoricoPage from './HistoricoPage'
import PrivacidadePage from './PrivacidadePage'
import HistoricoProvider from '../features/historico/hooks/HistoricoProvider'
import { lerPerfil, salvarPerfil } from '../features/historico/storage/indexedDb'
import { interpretarUfca } from '../features/historico/parser/ufca'
import { sintetico } from '../features/historico/parser/fixtures.test-utils'
import { importarPdf } from '../features/historico/parser/importarPdf'
import { ThemeContext } from '../theme/theme'
import AppLayout from '../components/AppLayout'
import GuiaAcademicoPage from './GuiaAcademicoPage'

vi.mock('../features/historico/parser/importarPdf', async importOriginal => ({ ...await importOriginal<typeof import('../features/historico/parser/importarPdf')>(), importarPdf: vi.fn() }))
const mockImportar = vi.mocked(importarPdf)
const perfil = () => interpretarUfca(sintetico())

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  localStorage.clear()
  mockImportar.mockReset().mockImplementation(async () => perfil())
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ cursos: [] }) })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

function montar() {
  return render(<ThemeContext value={{ preference: 'system', resolvedTheme: 'light', setPreference: vi.fn() }}><HistoricoProvider><MemoryRouter initialEntries={['/historico']}><Routes><Route element={<AppLayout />}><Route path="/historico" element={<HistoricoPage />} /><Route path="/" element={<main><h1>Horários públicos</h1><Link to="/historico">Abrir perfil</Link></main>} /><Route path="/privacidade" element={<PrivacidadePage />} /><Route path="/guia-academico" element={<GuiaAcademicoPage />} /></Route></Routes></MemoryRouter></HistoricoProvider></ThemeContext>)
}
async function iniciar(autorizar = true) {
  await userEvent.click(await screen.findByRole('button', { name: 'Importar histórico acadêmico' }))
  if (autorizar) await userEvent.click(screen.getByRole('button', { name: 'Autorizar processamento local' }))
}
async function selecionar() {
  const input = screen.getByLabelText('Selecionar PDF')
  await userEvent.upload(input, new File(['%PDF-SINTETICO'], 'exemplo.pdf', { type: 'application/pdf' }))
  await userEvent.click(screen.getByRole('button', { name: 'Analisar PDF neste navegador' }))
  await screen.findByRole('heading', { name: 'Confira o histórico antes de usar' })
}

describe('fluxo de importação e privacidade na interface', () => {
  it.each([false, true])('consulta o guia e volta preservando o perfil (persistido: %s)', async persistir => {
    montar(); await iniciar(); await selecionar()
    await userEvent.click(screen.getByRole('button', { name: persistir ? 'Salvar neste dispositivo' : 'Usar somente nesta sessão' }))
    await screen.findByRole('heading', { name: 'Seu perfil acadêmico' })
    const antes = await lerPerfil()
    await userEvent.click(screen.getByRole('link', { name: 'Entenda este índice: IEA' }))
    expect(await screen.findByRole('heading', { name: 'IEA — Índice de Eficiência Acadêmica' })).toBeTruthy()
    expect(await lerPerfil()).toEqual(antes)
    await userEvent.click(screen.getByRole('link', { name: 'Consultar meu histórico acadêmico' }))
    await screen.findByRole('heading', { name: 'Seu perfil acadêmico' })
    expect(screen.getByText('8.1234')).toBeTruthy()
    expect(await lerPerfil()).toEqual(antes)
  })
  it('exige ação afirmativa, permite recusa e mantém acesso aos horários', async () => {
    montar(); await iniciar(false)
    expect(screen.queryByLabelText('Selecionar PDF')).toBeNull()
    expect(mockImportar).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Não autorizar' }))
    expect(await screen.findByRole('heading', { name: 'Nenhum histórico importado' })).toBeTruthy()
    await userEvent.click(screen.getByRole('link', { name: '← Voltar aos horários' }))
    expect(await screen.findByRole('heading', { name: 'Horários públicos' })).toBeTruthy()
  })
  it('confere, corrige e usa somente em memória durante a navegação', async () => {
    montar(); await iniciar(); await selecionar()
    expect(await lerPerfil()).toBeNull()
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'CURSO CORRIGIDO' } })
    expect(screen.getByText(/Correção manual \(extraído:/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Usar somente nesta sessão' }))
    expect(await screen.findByRole('heading', { name: 'Seu perfil acadêmico' })).toBeTruthy()
    expect(await lerPerfil()).toBeNull()
    await userEvent.click(screen.getByRole('link', { name: '← Voltar aos horários' }))
    await userEvent.click(screen.getByRole('link', { name: 'Abrir perfil' }))
    expect(await screen.findByText('CURSO CORRIGIDO')).toBeTruthy()
  })
  it('salva somente por escolha explícita e recupera em nova montagem', async () => {
    const view = montar(); await iniciar(); await selecionar()
    expect(await lerPerfil()).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar neste dispositivo' }))
    await screen.findByRole('heading', { name: 'Seu perfil acadêmico' })
    expect(await lerPerfil()).not.toBeNull()
    view.unmount(); montar()
    expect(await screen.findByRole('heading', { name: 'Seu perfil acadêmico' })).toBeTruthy()
    expect(screen.getByText('Salvo neste dispositivo (IndexedDB).')).toBeTruthy()
  })
  it('corrige uma tentativa e permite rejeitar outra sem fundir disciplinas', async () => {
    montar(); await iniciar(); await selecionar()
    await userEvent.click(screen.getByText('Componentes cursados ou em andamento · 5 registros'))
    await userEvent.click(screen.getByText('Corrigir ou rejeitar registro 1'))
    const editor = screen.getByText('Corrigir ou rejeitar registro 1').closest('details')!
    fireEvent.change(within(editor).getByLabelText('Média'), { target: { value: '6.5' } })
    await userEvent.click(screen.getByText('Corrigir ou rejeitar registro 1'))
    await userEvent.click(screen.getByText('Corrigir ou rejeitar registro 2'))
    const segundoEditor = screen.getByText('Corrigir ou rejeitar registro 2').closest('details')!
    await userEvent.click(within(segundoEditor).getByRole('button', { name: 'Rejeitar este registro' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar neste dispositivo' }))
    await screen.findByRole('heading', { name: 'Seu perfil acadêmico' })
    const h = await lerPerfil()
    expect(h?.componentesCursados).toHaveLength(4)
    expect(h?.componentesCursados[0].media).toBe(6.5)
    expect(h?.correcoes).toEqual(expect.arrayContaining([
      { campo: 'componentesCursados.p1-r1.media', valorOriginal: '8.7' },
      { campo: 'componentesCursados.p1-r2.rejeitado', valorOriginal: 'ABC0001' },
    ]))
  })
  it('solicita confirmação na substituição e alerta sobre documento mais antigo', async () => {
    const anterior = perfil(); anterior.emitidoEm = '2026-10-01'; await salvarPerfil(anterior)
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Importar versão atualizada' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar processamento local' }))
    await selecionar()
    expect(screen.getByText(/novo documento é mais antigo/)).toBeTruthy()
    const button = screen.getByRole('button', { name: 'Salvar neste dispositivo' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect((await lerPerfil())?.emitidoEm).toBe('2026-10-01')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Usar somente nesta sessão' }))
    await screen.findByRole('heading', { name: 'Seu perfil acadêmico' })
    expect(await lerPerfil()).toBeNull()
  })
  it('pede confirmação antes de excluir e preserva tema e horários', async () => {
    localStorage.setItem('tema', 'dark'); localStorage.setItem('horario:exemplo', '[1]')
    await salvarPerfil(perfil()); montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Apagar meus dados acadêmicos' }))
    expect(await lerPerfil()).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão local' }))
    await screen.findByRole('heading', { name: 'Nenhum histórico importado' })
    expect(await lerPerfil()).toBeNull()
    expect(localStorage.getItem('tema')).toBe('dark'); expect(localStorage.getItem('horario:exemplo')).toBe('[1]')
  })
  it('apresenta carregamento e permite cancelar sem ativar o resultado tardio', async () => {
    let resolver: (value: ReturnType<typeof perfil>) => void = () => {}
    mockImportar.mockImplementation(() => new Promise(resolve => { resolver = resolve }))
    montar(); await iniciar()
    await userEvent.upload(screen.getByLabelText('Selecionar PDF'), new File(['%PDF'], 'exemplo.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByRole('button', { name: 'Analisar PDF neste navegador' }))
    expect(screen.getByText('Iniciando leitura local…')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar importação' }))
    expect(mockImportar.mock.calls[0][2].aborted).toBe(true)
    await act(async () => resolver(perfil()))
    expect(screen.queryByRole('heading', { name: 'Confira o histórico antes de usar' })).toBeNull()
  })
  it('mostra falha de importação e permite tentar outro arquivo', async () => {
    mockImportar.mockRejectedValue(new Error('Documento não reconhecido.'))
    montar(); await iniciar()
    await userEvent.upload(screen.getByLabelText('Selecionar PDF'), new File(['%PDF'], 'exemplo.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByRole('button', { name: 'Analisar PDF neste navegador' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Documento não reconhecido')
    expect(screen.getByLabelText('Selecionar PDF')).toBeTruthy()
    expect(await lerPerfil()).toBeNull()
  })
  it('permite sessão quando IndexedDB está indisponível', async () => {
    vi.stubGlobal('indexedDB', undefined)
    montar(); await iniciar(); await selecionar()
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Usar somente nesta sessão' }))
    expect(await screen.findByRole('heading', { name: 'Seu perfil acadêmico' })).toBeTruthy()
  })
  it('apaga o perfil em memória mesmo quando o banco permanece inacessível', async () => {
    vi.stubGlobal('indexedDB', undefined)
    montar(); await iniciar(); await selecionar()
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Usar somente nesta sessão' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Apagar meus dados acadêmicos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão local' }))
    expect(await screen.findByRole('heading', { name: 'Nenhum histórico importado' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Seu perfil acadêmico' })).toBeNull()
    expect(screen.getAllByRole('alert').some(a => a.textContent?.includes('perfil em memória foi apagado'))).toBe(true)
  })
  it('expõe a política e somente busca o índice público por GET', async () => {
    montar(); await iniciar(false)
    await userEvent.click(screen.getByRole('link', { name: 'Leia a política de privacidade' }))
    expect(await screen.findByRole('heading', { name: 'Privacidade e dados locais' })).toBeTruthy()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    for (const [url, options] of vi.mocked(fetch).mock.calls) {
      expect(url).toBe('/data/curriculos/index.json')
      expect(options?.method).toBeUndefined(); expect(options?.body).toBeUndefined()
    }
  })
})
