// @vitest-environment jsdom
import { limparCachePublico } from './data/publicJson'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from './AppRoutes'
import { HistoricoContext } from './features/historico/hooks/context'
import type { HistoricoAcademico } from './features/historico/models/types'
import { ThemeContext } from './theme/theme'
import { ofertaSintetica } from './features/horarios/fixtures.test-utils'
import { gerarIdTurma, gerarStorageKey } from './features/horarios/selecao'
import { turma, tentativa } from './features/recomendacoes/fixtures.test-utils'
import { exportarHorarioCsv } from './utils/exportarCsv'
import { exportarHorarioPdf } from './utils/exportarPdf'

vi.mock('./utils/exportarCsv', () => ({ exportarHorarioCsv: vi.fn() }))
vi.mock('./utils/exportarPdf', () => ({ exportarHorarioPdf: vi.fn() }))
let dados = ofertaSintetica()

beforeEach(() => {
  limparCachePublico()
  localStorage.clear()
  dados = ofertaSintetica()
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('cursos-atual') ? dados.oferta
    : url.includes('index.json') ? dados.indice : dados.curriculo })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks() })

function montar(perfil: HistoricoAcademico | null = null, tema: 'light' | 'dark' = 'light') {
  return render(<ThemeContext value={{ preference: tema, resolvedTheme: tema, setPreference: vi.fn() }}>
    <HistoricoContext value={{ perfil, carregando: false, salvo: false, erro: null, confirmar: vi.fn(), apagar: vi.fn() }}>
      <MemoryRouter><AppRoutes /></MemoryRouter>
    </HistoricoContext>
  </ThemeContext>)
}
const painel = () => within(screen.getByRole('tabpanel'))
const horario = () => within(screen.getByRole('heading', { name: 'Meu horário' }).closest('section')!)
const card = (codigo: string, numero = '01') => painel().getByRole('article', { name: new RegExp(`^${codigo} — .* · turma ${numero}$`) })
async function aba(nome: string) { await userEvent.click(screen.getByRole('tab', { name: nome })) }
async function carregar(perfil: HistoricoAcademico | null = null) {
  const view = montar(perfil)
  await screen.findByRole('tab', { name: 'Meu curso' })
  await aba('Equivalentes')
  await screen.findByLabelText('Estrutura curricular de referência')
  await aba('Meu curso')
  return view
}
async function adicionar(codigo: string) { await userEvent.click(within(card(codigo)).getByRole('button', { name: 'Adicionar ao horário' })) }

describe('abas integradas à seleção existente', () => {
  it('informa falha da exportação em PDF e permite tentar novamente', async () => {
    await carregar(); await adicionar('CC0001')
    vi.mocked(exportarHorarioPdf).mockImplementationOnce(() => { throw new Error('Falha ao gerar PDF') })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Não foi possível gerar o PDF. Confira sua conexão e tente novamente.')
    await userEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(exportarHorarioPdf).toHaveBeenCalledTimes(2)
  })
  it.each(['light', 'dark'] as const)('mantém Meu curso como padrão, cards e optativas no tema %s', async tema => {
    montar(null, tema)
    await screen.findByRole('tab', { name: 'Meu curso' })
    expect(screen.getByRole('tab', { name: 'Meu curso' }).getAttribute('aria-selected')).toBe('true')
    expect(painel().getAllByRole('article')).toHaveLength(2)
    await waitFor(() => expect(within(card('CC0003')).getByText('Optativa')).toBeTruthy())
    expect(painel().queryByRole('article', { name: /^ADM0001/ })).toBeNull()
    expect(screen.getByLabelText('Tema')).toBeTruthy()
  })
  it('oferece tablist, painéis associados, foco e navegação por setas, Home e End', async () => {
    await carregar()
    const tabs = screen.getAllByRole('tab')
    expect(screen.getByRole('tablist', { name: 'Origem das turmas' })).toBeTruthy()
    tabs[0].focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tabs[1])
    expect(screen.getByRole('tabpanel').id).toBe(tabs[1].getAttribute('aria-controls'))
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tabs[1].id)
    expect(tabs[0].tabIndex).toBe(-1)
    await userEvent.keyboard('{End}')
    expect(document.activeElement).toBe(tabs[2])
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tabs[0])
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(tabs[2])
    await userEvent.keyboard('{Home}')
    expect(document.activeElement).toBe(tabs[0])
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  })
  it('adiciona três origens, exporta, navega, recupera e remove sem alterar chaves ou outros IDs', async () => {
    const view = await carregar()
    await adicionar('CC0001')
    await aba('Equivalentes')
    const seletor = screen.getByLabelText('Estrutura curricular de referência')
    await userEvent.selectOptions(seletor, 'antiga')
    expect(painel().queryByRole('article', { name: /^EM0010/ })).toBeNull()
    await userEvent.selectOptions(seletor, 'id-interno')
    await adicionar('EM0010')
    await aba('Outros cursos')
    await userEvent.selectOptions(screen.getByLabelText('Curso de oferta'), 'adm1')
    await adicionar('ADM0001')
    expect(horario().getByText('3 turma(s) selecionada(s).')).toBeTruthy()
    expect(horario().getByText(/Curso de oferta: ENGENHARIA DE MATERIAIS \(materiais\)/)).toBeTruthy()
    expect(horario().getAllByText(/Lab;/)).toHaveLength(2)
    expect((screen.getByLabelText('Curso') as HTMLSelectElement).value).toBe('curso')
    const chave = gerarStorageKey('2026.2', 'curso')
    const ids = [dados.oferta.cursos[0].turmas[0], dados.oferta.cursos[1].turmas[0], dados.oferta.cursos[2].turmas[0]].map(gerarIdTurma)
    expect(JSON.parse(localStorage.getItem(chave)!)).toEqual(ids)
    expect(localStorage.length).toBe(1)
    await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }))
    for (const exportar of [exportarHorarioCsv, exportarHorarioPdf]) {
      const [turmas, periodo, curso, procedencias] = vi.mocked(exportar).mock.calls[0]
      expect(turmas.map(gerarIdTurma)).toEqual(ids)
      expect(periodo).toBe('2026.2'); expect(curso).toBe('CIÊNCIA DA COMPUTAÇÃO')
      expect(procedencias?.get(ids[1])).toEqual([{ id: 'materiais', nome: 'ENGENHARIA DE MATERIAIS' }])
    }
    await userEvent.click(screen.getByRole('link', { name: 'Entenda seus índices acadêmicos' }))
    await userEvent.click(await screen.findByRole('link', { name: '← Voltar aos horários' }))
    await screen.findByText('3 turma(s) selecionada(s).')
    view.unmount()
    montar()
    await screen.findByText('3 turma(s) selecionada(s).')
    const externa = horario().getByText('ADM0001 — Componente ADM0001').closest('.selecionada')!
    await userEvent.click(within(externa as HTMLElement).getByRole('button', { name: 'Remover' }))
    expect(JSON.parse(localStorage.getItem(chave)!)).toEqual(ids.slice(0, 2))
    expect(horario().getByText('2 turma(s) selecionada(s).')).toBeTruthy()
    expect(painel().queryByRole('article', { name: /^EM0010/ })).toBeNull()
  })
  it('bloqueia conflitos entre cursos e limpa aviso, busca e filtros ao mudar de aba', async () => {
    await carregar(); await adicionar('CC0001'); await aba('Outros cursos')
    const conflitante = card('ADMCONFLITO')
    expect(within(conflitante).getByText(/Conflita com/)).toBeTruthy()
    await userEvent.click(within(conflitante).getByRole('button', { name: 'Indisponível por conflito' }))
    expect(screen.getByText('Conflito de horário', { selector: '.aviso-conflito strong' })).toBeTruthy()
    expect(horario().getByText('1 turma(s) selecionada(s).')).toBeTruthy()
    await userEvent.click(painel().getByRole('button', { name: 'Com conflito' }))
    expect(painel().getAllByRole('article')).toHaveLength(1)
    await userEvent.type(painel().getByRole('searchbox'), 'ADMCONFLITO')
    await aba('Meu curso')
    expect(document.querySelector('.aviso-conflito')).toBeNull()
    expect((painel().getByRole('searchbox') as HTMLInputElement).value).toBe('')
    expect(painel().getByRole('button', { name: 'Todas' }).getAttribute('aria-pressed')).toBe('true')
  })
  it('impede segunda turma do mesmo código, sem substituir a selecionada', async () => {
    await carregar(); await aba('Equivalentes'); await adicionar('EM0010')
    await userEvent.click(within(card('EM0010', '02')).getByRole('button', { name: 'Adicionar ao horário' }))
    expect(screen.getByRole('alert').textContent).toContain('Já existe uma turma de EM0010')
    expect(JSON.parse(localStorage.getItem(gerarStorageKey('2026.2', 'curso'))!)).toEqual([gerarIdTurma(dados.oferta.cursos[1].turmas[0])])
  })
  it('mantém horários anteriores ao trocar curso principal e não duplica turma compartilhada', async () => {
    await carregar(); await aba('Outros cursos'); await adicionar('COMPARTILHADA')
    const chave = gerarStorageKey('2026.2', 'curso'), salvo = localStorage.getItem(chave)
    await userEvent.selectOptions(screen.getByLabelText('Curso'), 'adm2')
    expect(horario().getByText('Nenhuma turma selecionada.')).toBeTruthy()
    expect(painel().getAllByRole('article')).toHaveLength(1)
    await adicionar('COMPARTILHADA')
    expect(localStorage.getItem(chave)).toBe(salvo)
    await userEvent.selectOptions(screen.getByLabelText('Curso'), 'curso')
    expect(horario().getByText('1 turma(s) selecionada(s).')).toBeTruthy()
    await aba('Outros cursos')
    expect(painel().getAllByRole('article', { name: /^COMPARTILHADA/ })).toHaveLength(1)
    expect(within(card('COMPARTILHADA')).getByText(/ADMINISTRAÇÃO \(adm1\) \/ ADMINISTRAÇÃO \(adm2\)/)).toBeTruthy()
  })
})

describe('consulta curricular e catálogo externo', () => {
  it('consulta equivalências sem histórico, oferece matrizes e distingue o mesmo código', async () => {
    await carregar(); await aba('Equivalentes')
    expect(painel().getByText(/Sugestão inicial/)).toBeTruthy()
    expect(within(card('EM0010')).getByText('Equivalente curricular')).toBeTruthy()
    expect(within(card('EM0010')).getByText(/CC0063 — Álgebra Linear/)).toBeTruthy()
    expect(within(card('EM0010')).queryByText('Optativa')).toBeNull()
    expect(within(card('CC0003')).getByText('Mesmo componente')).toBeTruthy()
    expect(within(card('CC0003')).getByText('Optativa')).toBeTruthy()
    expect(painel().getAllByRole('article')).toHaveLength(3)
    expect(painel().queryByRole('article', { name: /^X —/ })).toBeNull()
    expect(painel().getByText(/regra\(s\) composta\(s\)/)).toBeTruthy()
  })
  it('não repete em abas externas a turma física também associada ao curso principal', async () => {
    dados.oferta.cursos[1].turmas.push(dados.oferta.cursos[0].turmas[0])
    await carregar()
    expect(painel().getAllByRole('article', { name: /^CC0001/ })).toHaveLength(1)
    await aba('Equivalentes')
    expect(painel().queryByRole('article', { name: /^CC0001/ })).toBeNull()
    await aba('Outros cursos')
    await userEvent.type(painel().getByRole('searchbox'), 'CC0001')
    expect(painel().getByText('Nenhuma turma encontrada')).toBeTruthy()
  })
  it('mantém um só card quando uma turma atende múltiplas exigências', async () => {
    dados.estrutura.componentes[0].equivalencias_codigos = ['EM0010']
    await carregar(); await aba('Equivalentes')
    expect(painel().getAllByRole('article', { name: /^EM0010/ })).toHaveLength(2)
    expect(within(card('EM0010')).getByText(/CC0001 — Componente CC0001/)).toBeTruthy()
    expect(within(card('EM0010')).getByText(/CC0063 — Álgebra Linear/)).toBeTruthy()
  })
  it('identifica duplicação acadêmica comprovada sem bloquear disciplina externa arbitrária', async () => {
    dados.oferta.cursos[0].turmas.push(turma('CC0063', 5, '12:00', '14:00'))
    await carregar(); await adicionar('CC0063'); await aba('Equivalentes')
    expect(within(card('EM0010')).getByText(/Possível duplicação acadêmica/)).toBeTruthy()
    await aba('Outros cursos')
    expect(within(card('ADM0001')).queryByText(/Possível duplicação acadêmica/)).toBeNull()
    await adicionar('ADM0001')
    expect(horario().getByText('2 turma(s) selecionada(s).')).toBeTruthy()
  })
  it('não inclui turma com metadados divergentes entre agrupamentos', async () => {
    dados.oferta.cursos[3].turmas = [{ ...dados.oferta.cursos[3].turmas[0], sala: 'Divergente' }]
    await carregar(); await aba('Outros cursos')
    const divergente = card('COMPARTILHADA')
    expect(within(divergente).getByText(/divergem entre agrupamentos/)).toBeTruthy()
    await userEvent.click(within(divergente).getByRole('button', { name: 'Dados divergentes' }))
    expect(horario().getByText('Nenhuma turma selecionada.')).toBeTruthy()
  })
  it('mantém a matriz do histórico compatível e indica cumprimento sem bloquear consulta manual', async () => {
    dados.perfil.componentesCursados.push(tentativa('CC0063', 'APR'))
    await carregar(dados.perfil); await aba('Equivalentes')
    expect(painel().getByText(/Matriz vinculada ao histórico/)).toBeTruthy()
    expect(within(screen.getByLabelText('Estrutura curricular de referência')).getAllByRole('option')).toHaveLength(1)
    expect(within(card('EM0010')).getByText(/Já cumprida/)).toBeTruthy()
    await adicionar('EM0010')
    expect(horario().getByText('1 turma(s) selecionada(s).')).toBeTruthy()
  })
  it('ignora dados individualizados de outro curso', async () => {
    dados.perfil.curso.idCurso = 'materiais'
    dados.perfil.componentesCursados.push(tentativa('CC0063', 'APR'))
    await carregar(dados.perfil); await aba('Equivalentes')
    expect(painel().getByText(/Sugestão inicial/)).toBeTruthy()
    expect(painel().queryByText(/Já cumprida/)).toBeNull()
  })
  it('não troca matriz ausente do histórico por sugestão e mantém acesso externo', async () => {
    dados.perfil.curso.estruturaCurricular = 'AB999'
    montar(dados.perfil)
    await screen.findByRole('tab', { name: 'Equivalentes' }); await aba('Equivalentes')
    expect(await screen.findByText(/A matriz AB999 do histórico não foi encontrada/)).toBeTruthy()
    expect(screen.queryByLabelText('Estrutura curricular de referência')).toBeNull()
    await aba('Outros cursos'); await adicionar('ADM0001')
    expect(horario().getByText('1 turma(s) selecionada(s).')).toBeTruthy()
  })
  it.each(['indisponivel', 'erro'])('mantém Outros cursos sem currículo público: %s', async motivo => {
    if (motivo === 'indisponivel') dados.indice.cursos[0].disponivel = false
    else {
      const anterior = vi.mocked(fetch).getMockImplementation()!
      limparCachePublico(); vi.stubGlobal('fetch', vi.fn(async (url, options) => String(url).includes('curriculos') ? { ok: false } : anterior(url, options)))
    }
    montar(); await screen.findByRole('tab', { name: 'Equivalentes' }); await aba('Equivalentes')
    await screen.findByText(motivo === 'erro' ? /Falha ao consultar/ : /estrutura curricular não está disponível/)
    await aba('Outros cursos'); await adicionar('ADM0001')
    expect(horario().getByText('1 turma(s) selecionada(s).')).toBeTruthy()
  })
  it.each(['EM0010', 'algebra', 'joao', 'engenharia de materiais'])('busca externa inclui equivalentes por %s', async termo => {
    await carregar(); await aba('Outros cursos')
    expect(painel().queryByRole('article', { name: /^EM0010/ })).toBeNull()
    await userEvent.type(painel().getByRole('searchbox'), termo)
    expect(card('EM0010')).toBeTruthy()
  })
  it('filtra por IDs de cursos homônimos, curso vazio e ausência de resultado', async () => {
    await carregar(); await aba('Outros cursos')
    const seletor = screen.getByLabelText('Curso de oferta')
    expect(within(seletor).getByRole('option', { name: 'ADMINISTRAÇÃO (adm1)' }).getAttribute('value')).toBe('adm1')
    expect(within(seletor).getByRole('option', { name: 'ADMINISTRAÇÃO (adm2)' }).getAttribute('value')).toBe('adm2')
    await userEvent.selectOptions(seletor, 'adm2')
    expect(painel().getAllByRole('article')).toHaveLength(1)
    await userEvent.selectOptions(seletor, 'vazio')
    expect(painel().getByText('Nenhuma turma encontrada')).toBeTruthy()
    await userEvent.selectOptions(seletor, '')
    await userEvent.type(painel().getByRole('searchbox'), 'não existe')
    expect(painel().getByText('Nenhuma turma encontrada')).toBeTruthy()
  })
  it('aplica Disponíveis e Selecionadas dentro da aba sem confundir vagas', async () => {
    await carregar(); await aba('Outros cursos'); await adicionar('ADM0001')
    await userEvent.click(painel().getByRole('button', { name: 'Selecionadas' }))
    expect(painel().getAllByRole('article')).toHaveLength(1)
    await aba('Meu curso')
    await userEvent.click(painel().getByRole('button', { name: 'Selecionadas' }))
    expect(painel().getByText('Nenhuma turma encontrada')).toBeTruthy()
    await aba('Outros cursos'); await userEvent.click(painel().getByRole('button', { name: 'Disponíveis' }))
    expect(painel().queryByRole('article', { name: /^ADM0001/ })).toBeNull()
    expect(painel().getByText(/não confirma vagas livres/)).toBeTruthy()
  })
  it('limita cards, permite exibir todos e reinicia o limite ao buscar', async () => {
    dados.oferta.cursos[2].turmas.push(...Array.from({ length: 30 }, (_, i) => turma(`EXTRA${i}`, 6)))
    await carregar(); await aba('Outros cursos')
    expect(painel().getAllByRole('article')).toHaveLength(24)
    await userEvent.click(painel().getByRole('button', { name: /Mostrar mais turmas/ }))
    expect(painel().getAllByRole('article').length).toBeGreaterThan(24)
    fireEvent.change(painel().getByRole('searchbox'), { target: { value: 'EXTRA' } })
    expect(painel().getAllByRole('article')).toHaveLength(24)
  })
  it('só consulta dados públicos por GET sem transmitir perfil', async () => {
    await carregar(dados.perfil); await aba('Equivalentes')
    for (const [url, options] of vi.mocked(fetch).mock.calls) {
      expect(String(url).startsWith('/data/')).toBe(true)
      expect(options?.body).toBeUndefined(); expect(options?.method).toBeUndefined()
    }
    expect(localStorage.length).toBe(0)
  })
})
