import { describe, expect, it } from 'vitest'
import { codigo, componente, e, ou, perfilSintetico, tentativa } from '../../recomendacoes/fixtures.test-utils'
import { gerarRecomendacoes } from '../../recomendacoes/services/recomendador'
import { PREFERENCIAS_INICIAIS } from '../../recomendacoes/models/types'
import { dadosCurriculoTeste } from '../fixtures.test-utils'
import { calcularProgresso, indicadorHoras } from './progressoCurricular'
import { agruparComponentes, prepararExportacao } from './prepararExportacao'
import type { HistoricoAcademico } from '../../historico/models/types'
import type { ComponenteCurricular } from '../../../types'

function classificar(perfil: HistoricoAcademico, componentes: ComponenteCurricular[] = [componente('A')], referencia: string | null = '2026.2') {
  const dados = dadosCurriculoTeste()
  return calcularProgresso(perfil, { ...dados.estrutura, componentes }, 'curso', referencia, dados.agora)
}

describe('camada visual que reutiliza o recomendador', () => {
  it.each(['APR', 'APRN', 'DISP', 'TRANS', 'INCORP', 'CUMP'])('%s é concluída verde', status => {
    const resultado = classificar(perfilSintetico([tentativa('A', status)]))
    expect(resultado.situacoes.get('A')?.estado).toBe('concluida')
  })
  it('usa o mesmo verde para equivalência da matriz e registro explícito, sem criar novo estado', () => {
    const p = perfilSintetico([tentativa('X', 'APR')])
    p.equivalencias = [{ codigoExigido: 'B', codigoUtilizado: 'X', nomeExigido: null, nomeUtilizado: null }]
    const s = classificar(p, [componente('A', { equivalencias_codigos: ['X'] }), componente('B')]).situacoes
    expect(s.get('A')?.estado).toBe('concluida'); expect(s.get('B')?.estado).toBe('concluida')
    expect(s.get('A')?.academica.estado).toBe('equivalencia'); expect(s.get('B')?.academica.origem).toContain('X')
  })
  it.each(['REP', 'REPF', 'TRANC', 'CANC'])('%s anterior usa os requisitos atuais: amarelo ou cinza', status => {
    const p = perfilSintetico([tentativa('A', status), tentativa('BASE', 'APR')])
    expect(classificar(p).situacoes.get('A')?.estado).toBe('disponivel')
    const cs = [componente('A', { pre_requisitos_regra: codigo('B') }), componente('B')]
    expect(classificar(p, cs).situacoes.get('A')?.estado).toBe('bloqueada')
    p.componentesCursados.push(tentativa('B', 'APR'))
    expect(classificar(p, cs).situacoes.get('A')?.estado).toBe('disponivel')
  })
  it('confirma matrícula somente com período público e emissão atual', () => {
    const p = perfilSintetico([tentativa('A', 'MATR', '2026.2')])
    expect(classificar(p).situacoes.get('A')?.estado).toBe('cursando')
    for (const emissao of ['2025-10-01', null, 'inválida', '2027-01-01']) {
      p.emitidoEm = emissao
      expect(classificar(p).situacoes.get('A')?.estado).toBe('verificar')
    }
  })
  it.each(['2026.1', null])('matrícula antiga/sem período %s permanece neutra', periodo => {
    const p = perfilSintetico([tentativa('A', 'MATR', periodo)])
    const s = classificar(p).situacoes.get('A')!
    expect(s.estado).toBe('verificar'); expect(s.academica.cumprido).toBe(false)
  })
  it('sem oferta pública não confirma matrícula; preserva aprovações', () => {
    const p = perfilSintetico([tentativa('A', 'MATR', '2026.2'), tentativa('B', 'APR')])
    const resultado = classificar(p, [componente('A'), componente('B')], null)
    expect(resultado.situacoes.get('A')?.estado).toBe('verificar'); expect(resultado.situacoes.get('B')?.estado).toBe('concluida')
    expect(resultado.avisos.join(' ')).toContain('Período da oferta pública indisponível')
  })
  it.each(['2025.2', '2027.1'])('uma oferta antiga ou futura %s não confirma andamento no documento atual', referencia => {
    const p = perfilSintetico([tentativa('A', 'MATR', referencia)])
    expect(classificar(p, [componente('A')], referencia).situacoes.get('A')?.estado).toBe('verificar')
  })
  it('avalia expressões compostas E/OU pela árvore compartilhada', () => {
    const cs = ['A', 'B', 'C'].map(c => componente(c))
    cs.push(componente('D', { pre_requisitos_regra: ou(e(codigo('A'), codigo('B')), codigo('C')) }))
    const p = perfilSintetico([tentativa('C', 'APRN')])
    expect(classificar(p, cs).situacoes.get('D')?.estado).toBe('disponivel')
    p.componentesCursados = [tentativa('BASE', 'APR')]
    expect(classificar(p, cs).situacoes.get('D')?.estado).toBe('bloqueada')
  })
  it('regras sem árvore e históricos incompletos não viram bloqueio', () => {
    const c = componente('A', { pre_requisitos_expressao: 'B OU C', pre_requisitos_codigos: ['B', 'C'] })
    expect(classificar(perfilSintetico(), [c]).situacoes.get('A')?.estado).toBe('verificar')
    expect(classificar(perfilSintetico([])).situacoes.get('A')?.estado).toBe('verificar')
    expect(classificar(perfilSintetico([tentativa('A', null)])).situacoes.get('A')?.estado).toBe('verificar')
  })
  it('exibe matrícula conjunta como condição, sem liberar plenamente o componente', () => {
    const cs = [componente('A', { co_requisitos_codigos: ['B'], co_requisitos_expressao: 'B' }), componente('B')]
    const p = perfilSintetico()
    const s = classificar(p, cs).situacoes.get('A')!
    expect(s.estado).toBe('bloqueada'); expect(s.justificativa).toContain('matrícula conjunta')
    p.componentesCursados.push(tentativa('B', 'MATR', '2026.2'))
    expect(classificar(p, cs).situacoes.get('A')?.estado).toBe('disponivel')
  })
  it('recusa outro curso e outra matriz', () => {
    const p = perfilSintetico(); p.curso.idCurso = 'outro'
    expect(() => classificar(p)).toThrow(/incompatível/)
    p.curso.idCurso = 'curso'; p.curso.estruturaCurricular = 'AB002'
    expect(() => classificar(p)).toThrow(/incompatível/)
  })
  it('não diverge dos cumprimentos e da referência temporal do recomendador', () => {
    const d = dadosCurriculoTeste(); d.perfil.emitidoEm = '2020-01-01'
    const progresso = calcularProgresso(d.perfil, d.estrutura, 'curso', d.oferta.periodo, d.agora)
    const rec = gerarRecomendacoes({ ...d, cursoId: 'curso', preferencias: PREFERENCIAS_INICIAIS })
    for (const [codigo, s] of progresso.situacoes) {
      const r = rec.itens.find(r => r.componente.codigo === codigo)
      if (s.estado === 'concluida') expect(r).toBeUndefined()
      else expect(r?.situacao.estado).toBe(s.academica.estado)
    }
    expect(progresso.situacoes.get('ABC0003')?.estado).toBe('verificar')
  })
})

describe('indicadores oficiais e organização da matriz', () => {
  it('usa horas oficiais para geral, obrigatórias, optativas e complementares', () => {
    const d = dadosCurriculoTeste()
    const r = calcularProgresso(d.perfil, d.estrutura, 'curso', d.periodoReferencia, d.agora)
    expect(r.indicadores.map(i => i.percentual)).toEqual([50, 50, 20, 80])
    expect([...r.situacoes.values()].filter(s => s.estado === 'concluida')).toHaveLength(2)
    expect(r.indicadores[0].percentual).not.toBe(2 / d.estrutura.componentes.length * 100)
  })
  it.each([
    { exigida: null, integralizada: 10, pendente: 90 }, { exigida: 100, integralizada: 120, pendente: 0 },
    { exigida: 100, integralizada: 50, pendente: 10 }, { exigida: 100, integralizada: -1, pendente: 101 },
    { exigida: 0, integralizada: 0, pendente: 0 }, { exigida: NaN, integralizada: 0, pendente: 0 },
  ])('não inventa percentual para valores incompletos/inconsistentes %j', horas => {
    expect(indicadorHoras('total', 'Geral', horas).percentual).toBeNull()
  })
  it('detecta divergência entre totais e categorias oficiais', () => {
    const d = dadosCurriculoTeste(); d.perfil.cargaHoraria.total = { exigida: 800, integralizada: 400, pendente: 400 }
    const r = calcularProgresso(d.perfil, d.estrutura, 'curso', d.periodoReferencia, d.agora)
    expect(r.indicadores[0].percentual).toBeNull(); expect(r.indicadores[0].aviso).toContain('diverge')
  })
  it('equivalências e tentativas repetidas contam uma exigência; optativas não alteram horas', () => {
    const d = dadosCurriculoTeste()
    d.perfil.componentesCursados.push(tentativa('ABC0001', 'APR', '2026.1'))
    d.estrutura.componentes.push(d.estrutura.componentes[0], ...Array.from({ length: 40 }, (_, i) => componente(`OP${i}`, { tipo: 'optativa' })))
    const r = calcularProgresso(d.perfil, d.estrutura, 'curso', d.periodoReferencia, d.agora)
    expect([...r.situacoes.values()].filter(s => s.estado === 'concluida')).toHaveLength(2)
    expect(r.indicadores[2]).toMatchObject({ exigida: 100, percentual: 20 })
  })
  it('preserva obrigatórias sem nível e optativas sem inserir componentes externos', () => {
    const d = dadosCurriculoTeste(); const original = prepararExportacao({ ...d, modo: 'original' })
    const grupos = agruparComponentes(original.linhas)
    expect(grupos.map(g => g.titulo)).toEqual(['1º período', '2º período', 'Outros componentes obrigatórios', 'Optativas'])
    expect(grupos[2].linhas[0].componente.codigo).toBe('ABC0005')
    expect(original.linhas.some(l => l.componente.codigo === 'XYZ0001')).toBe(false)
  })
})
