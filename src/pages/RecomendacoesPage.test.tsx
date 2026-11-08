// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '../AppRoutes'
import HistoricoProvider from '../features/historico/hooks/HistoricoProvider'
import { salvarPerfil } from '../features/historico/storage/indexedDb'
import { importarPdf } from '../features/historico/parser/importarPdf'
import { ThemeContext } from '../theme/theme'
import { componente, entrada, turma } from '../features/recomendacoes/fixtures.test-utils'
import { gerarIdTurma, gerarStorageKey } from '../features/horarios/selecao'
import { identificarCurso } from '../features/recomendacoes/hooks/useRecomendacoes'
import { codigo } from '../features/recomendacoes/fixtures.test-utils'
import { associarCurso, codigoEstruturaHistorico } from '../features/historico/integracaoCurricular'

vi.mock('../features/historico/parser/importarPdf', async importOriginal => ({ ...await importOriginal<typeof import('../features/historico/parser/importarPdf')>(), importarPdf: vi.fn() }))
let dados = entrada([componente('ABC0001'), componente('ABC0002', { pre_requisitos_regra: codigo('ABC0001') }), componente('ABC0003')], [turma('ABC0001'), turma('ABC0002', 3), turma('ABC0003', 4)])
const curso = { id: 'curso', nome: 'CURSO SINTÉTICO', modalidade: 'Presencial', disponivel: true, arquivo: 'curso.json' }

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory(); localStorage.clear()
  dados = entrada([componente('ABC0001'), componente('ABC0002', { pre_requisitos_regra: codigo('ABC0001') }), componente('ABC0003')], [turma('ABC0001'), turma('ABC0002', 3), turma('ABC0003', 4)])
  vi.mocked(importarPdf).mockResolvedValue(dados.perfil)
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('index.json') ? { cursos: [curso] } : url.includes('cursos-atual') ? dados.oferta : { curso_id: 'curso', estruturas: [dados.estrutura] } })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

function montar(rota = '/recomendacoes', tema: 'light' | 'dark' | 'system' = 'light') {
  return render(<ThemeContext value={{ preference: tema, resolvedTheme: tema === 'dark' ? 'dark' : 'light', setPreference: vi.fn() }}><HistoricoProvider><MemoryRouter initialEntries={[rota]}><AppRoutes /></MemoryRouter></HistoricoProvider></ThemeContext>)
}
async function carregar() { await salvarPerfil(dados.perfil); montar(); await screen.findByRole('heading', { name: 'Seu planejamento acadêmico' }) }

describe('interface de planejamento', () => {
  it('permite acesso sem perfil, sem bloquear horários ou currículos', async () => {
    montar(); expect(await screen.findByRole('heading', { name: 'Comece pelo seu histórico' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Importar meu histórico acadêmico' }).getAttribute('href')).toBe('/historico')
    await userEvent.click(screen.getByRole('link', { name: 'Continuar consultando horários e currículos públicos' }))
    expect(await screen.findByRole('heading', { name: 'Meu horário' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Planejar meu próximo semestre' })).toBeTruthy()
  })
  it.each(['light', 'dark', 'system'] as const)('usa o layout compartilhado no tema %s', async tema => {
    await salvarPerfil(dados.perfil); montar('/recomendacoes', tema)
    await screen.findByRole('heading', { name: 'Seu planejamento acadêmico' })
    expect(screen.getByLabelText('Tema')).toBeTruthy(); expect(document.querySelectorAll('footer')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Recomendações para seu semestre' })).toBeTruthy()
  })
  it('apresenta categorias, fontes, critérios, tentativas e desatualização', async () => {
    dados.perfil.emitidoEm = '2020-01-01'; await carregar()
    expect(screen.getByText(/Histórico potencialmente desatualizado/)).toBeTruthy()
    expect(screen.getByText('Dependem de requisitos (1)')).toBeTruthy()
    const card = screen.getByRole('article', { name: 'ABC0001 — Componente ABC0001' })
    await userEvent.click(within(card).getByText('Por que esta disciplina foi recomendada ou classificada?'))
    expect(within(card).getByText(/Pontuação interna/)).toBeTruthy(); expect(within(card).getByText(/Matriz AB001 \(ID id-interno\)/)).toBeTruthy()
  })
  it('altera carga, dias, turnos e estratégia por ação explícita', async () => {
    await carregar()
    const input = screen.getByLabelText('Carga horária semestral pretendida (h)')
    fireEvent.change(input, { target: { value: '0' } })
    await userEvent.selectOptions(screen.getByLabelText('Estratégia de planejamento'), 'concentrar')
    await userEvent.click(screen.getByLabelText('Segunda')); await userEvent.click(screen.getByLabelText('Manhã'))
    await userEvent.click(screen.getByRole('button', { name: 'Gerar recomendações' }))
    expect(screen.getByText('Recomendadas agora (0)')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('atualizadas')
    expect(localStorage.length).toBe(0)
  })
  it('adiciona sem apagar o horário legado, mantém na página principal, remove e persiste', async () => {
    const existente = turma('ABC0003', 4)
    const key = gerarStorageKey('2026.2', 'curso'); localStorage.setItem(key, JSON.stringify([gerarIdTurma(existente)]))
    await carregar()
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar conjunto sugerido ao meu horário' }))
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(expect.arrayContaining([gerarIdTurma(existente), gerarIdTurma(dados.oferta.cursos[0].turmas[0])]))
    expect(JSON.parse(localStorage.getItem(key)!)).toHaveLength(2)
    await userEvent.click(screen.getByRole('link', { name: 'Ver e exportar meu horário' }))
    await screen.findByRole('heading', { name: 'Meu horário' })
    expect(screen.getByText('2 turma(s) selecionada(s).')).toBeTruthy()
    await userEvent.click(screen.getByRole('link', { name: 'Planejar meu próximo semestre' }))
    await screen.findByRole('heading', { name: 'Seu planejamento acadêmico' })
    await userEvent.click(screen.getByRole('button', { name: 'Remover ABC0001' }))
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual([gerarIdTurma(existente)])
  })
  it('integra equivalente de outro agrupamento ao horário do curso do estudante', async () => {
    dados.estrutura.componentes[0].equivalencias_codigos = ['XYZ0001']
    dados.oferta.cursos[0].turmas = []
    dados.oferta.cursos.push({ ...dados.oferta.cursos[0], id: 'outro', nome: 'OUTRO', turmas: [turma('XYZ0001')] })
    await carregar(); await userEvent.click(screen.getByRole('button', { name: 'Adicionar conjunto sugerido ao meu horário' }))
    await userEvent.click(screen.getByRole('link', { name: 'Ver e exportar meu horário' }))
    await screen.findByRole('heading', { name: 'Meu horário' })
    expect(screen.getByText('1 turma(s) selecionada(s).')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(gerarStorageKey('2026.2', 'curso'))!)[0]).toContain('XYZ0001')
  })
  it('não permite incluir turma conflitante e explica a escolha existente', async () => {
    localStorage.setItem(gerarStorageKey('2026.2', 'curso'), JSON.stringify([gerarIdTurma(turma('ABC0003'))]))
    dados.oferta.cursos[0].turmas[2] = turma('ABC0003')
    await carregar()
    await userEvent.click(screen.getByText('Disponíveis, mas com menor prioridade (2)'))
    const card = screen.getByRole('article', { name: 'ABC0001 — Componente ABC0001' })
    await userEvent.click(within(card).getByText('1 alternativa(s) de turma'))
    expect(within(card).getByText(/Conflito com ABC0003/)).toBeTruthy()
    expect((within(card).getByRole('button') as HTMLButtonElement).disabled).toBe(true)
  })
  it.each([false, true])('importa, planeja e invalida recomendações ao apagar perfil (salvo: %s)', async persistir => {
    montar('/historico')
    await userEvent.click(await screen.findByRole('button', { name: 'Importar histórico acadêmico' }))
    await userEvent.click(screen.getByRole('button', { name: 'Autorizar processamento local' }))
    await userEvent.upload(screen.getByLabelText('Selecionar PDF'), new File(['%PDF'], 'sintetico.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByRole('button', { name: 'Analisar PDF neste navegador' }))
    await screen.findByRole('heading', { name: 'Confira o histórico antes de usar' })
    await userEvent.click(screen.getByRole('button', { name: persistir ? 'Salvar neste dispositivo' : 'Usar somente nesta sessão' }))
    await userEvent.click(await screen.findByRole('link', { name: 'Planejar meu próximo semestre' }))
    await screen.findByRole('heading', { name: 'Seu planejamento acadêmico' })
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar conjunto sugerido ao meu horário' }))
    const horario = localStorage.getItem(gerarStorageKey('2026.2', 'curso'))
    await userEvent.click(screen.getByRole('link', { name: '← Voltar aos horários' }))
    await userEvent.click(await screen.findByRole('link', { name: 'Meu Histórico Acadêmico' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Apagar meus dados acadêmicos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão local' }))
    await screen.findByRole('heading', { name: 'Nenhum histórico importado' })
    await userEvent.click(screen.getByRole('link', { name: '← Voltar aos horários' }))
    await userEvent.click(await screen.findByRole('link', { name: 'Planejar meu próximo semestre' }))
    expect(await screen.findByRole('heading', { name: 'Comece pelo seu histórico' })).toBeTruthy()
    expect(localStorage.getItem(gerarStorageKey('2026.2', 'curso'))).toBe(horario)
  })
  it.each(['sem-curso', 'matriz-ausente', 'id-interno'])('interrompe recomendações com identificação insegura: %s', async motivo => {
    if (motivo === 'sem-curso') dados.perfil.curso.idCurso = 'nao-encontrado'
    else dados.perfil.curso.estruturaCurricular = motivo === 'id-interno' ? dados.estrutura.id : 'INEXISTENTE'
    await salvarPerfil(dados.perfil); montar()
    expect(await screen.findByRole('heading', { name: 'Confirme os dados do planejamento' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Seu planejamento acadêmico' })).toBeNull()
  })
  it('pede confirmação explícita para matrizes com o mesmo código', async () => {
    const fetchAnterior = vi.mocked(fetch).getMockImplementation()!
    vi.stubGlobal('fetch', vi.fn(async (url, options) => String(url).endsWith('curso.json') ? { ok: true, json: async () => ({ curso_id: 'curso', estruturas: [dados.estrutura, { ...dados.estrutura, id: 'outro-id' }] }) } : fetchAnterior(url, options)))
    await salvarPerfil(dados.perfil); montar()
    await userEvent.click(await screen.findByRole('button', { name: /Confirmar matriz AB001 · ID id-interno/ }))
    expect(await screen.findByRole('heading', { name: 'Seu planejamento acadêmico' })).toBeTruthy()
  })
  it('não associa por semelhança nem troca um ID inválido por um nome parecido', () => {
    const p = dados.perfil; p.curso.idCurso = 'invalido'
    expect(identificarCurso(p, [curso], null).curso).toBeUndefined()
    p.curso.idCurso = null
    expect(identificarCurso(p, [curso], null).curso?.id).toBe('curso')
    const candidatos = [curso, { ...curso, id: 'curso2' }]
    expect(identificarCurso(p, candidatos, null).curso).toBeUndefined()
    expect(identificarCurso(p, candidatos, 'curso2').curso?.id).toBe('curso2')
    p.curso.nome = 'CURSO SINTÉTICO PARECIDO'; expect(identificarCurso(p, [curso], null).curso).toBeUndefined()
  })
  it('reconhece qualificadores oficiais de unidade/campus e vigência, preservando o perfil bruto', async () => {
    dados.perfil.curso = { nome: 'CURSO SINTÉTICO/CCT - JUAZEIRO DO NORTE - BACHARELADO - PRESENCIAL - MTN', idCurso: null, estruturaCurricular: 'AB001 - 2020.1' }
    expect(associarCurso(dados.perfil, [curso]).curso.idCurso).toBe('curso')
    expect(codigoEstruturaHistorico('AB001 - 2020.1')).toBe('AB001')
    expect(codigoEstruturaHistorico('id-interno')).toBeNull()
    expect(codigoEstruturaHistorico('AB001 texto ambíguo')).toBeNull()
    await salvarPerfil(dados.perfil); montar()
    expect(await screen.findByRole('heading', { name: 'Seu planejamento acadêmico' })).toBeTruthy()
    expect(dados.perfil.curso.estruturaCurricular).toBe('AB001 - 2020.1')
  })
  it('apresenta falha de dados e só consulta catálogos públicos por GET', async () => {
    await carregar()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    for (const [url, options] of vi.mocked(fetch).mock.calls) {
      expect(String(url).startsWith('/data/')).toBe(true); expect(options?.body).toBeUndefined(); expect(options?.method).toBeUndefined()
    }
    cleanup(); vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rede') })); montar()
    expect((await screen.findByRole('alert')).textContent).toContain('Falha ao carregar')
  })
})
