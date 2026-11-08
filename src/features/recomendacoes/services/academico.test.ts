import { describe, expect, it } from 'vitest'
import type { RegraRequisito, RegraRequisitoOperador } from '../../../types'
import { codigo, componente, e, ou, perfilSintetico, tentativa } from '../fixtures.test-utils'
import { analisarSituacao } from './situacaoCurricular'
import { avaliarCoRequisitos, avaliarPreRequisitos, avaliarRegra } from './requisitos'
import { analisarDependencias } from './dependencias'
import { cumprimentos } from './equivalencias'

describe('situação curricular e tentativas', () => {
  it.each([['APR', 'concluido'], ['APRN', 'concluido'], ['DISP', 'concluido'], ['TRANS', 'concluido'], ['INCORP', 'concluido'], ['CUMP', 'concluido'], ['REP', 'reprovado'], ['REPF', 'reprovado'], ['REPMF', 'reprovado'], ['REPN', 'reprovado'], ['REPNF', 'reprovado'], ['TRANC', 'trancado'], ['CANC', 'cancelado'], ['NOVO', 'indeterminado'], ['REC', 'indeterminado'], ['PARCCUMP', 'indeterminado']])('%s resulta em %s, preservando o registro', (status, esperado) => {
    const p = perfilSintetico([tentativa('A', status)])
    const s = analisarSituacao(p, [componente('A')], '2026.2').get('A')!
    expect(s.estado).toBe(esperado); expect(s.tentativas).toEqual(p.componentesCursados)
  })
  it('preserva reprovação, aprovação e matrícula posterior sem perder a conclusão', () => {
    const p = perfilSintetico([tentativa('A', 'REP'), tentativa('A', 'APR', '2026.1'), tentativa('A', 'MATR', '2026.2')])
    const s = analisarSituacao(p, [componente('A')], '2026.2').get('A')!
    expect(s.cumprido).toBe(true); expect(s.reprovacaoAnterior).toBe(true); expect(s.tentativas).toHaveLength(3)
  })
  it.each([['2026.2', 'matriculado'], ['2026.1', 'indeterminado'], [null, 'indeterminado']])('matrícula %s não vira aprovação', (periodo, estado) => {
    const s = analisarSituacao(perfilSintetico([tentativa('A', 'MATR', periodo)]), [componente('A')], '2026.2').get('A')!
    expect(s.estado).toBe(estado); expect(s.cumprido).toBe(false)
  })
  it('não supõe a situação em histórico vazio, desconhecido ou contraditório', () => {
    expect(analisarSituacao(perfilSintetico([]), [componente('A')], '2026.2').get('A')?.estado).toBe('indeterminado')
    const p = perfilSintetico([tentativa('A', null)])
    expect(analisarSituacao(p, [componente('A')], '2026.2').get('A')?.estado).toBe('indeterminado')
    p.componentesCursados = [tentativa('A', 'APR')]; p.componentesPendentes = [{ codigo: 'A', nome: null, cargaHoraria: null, observacao: null }]
    expect(analisarSituacao(p, [componente('A')], '2026.2').get('A')?.cumprido).toBe(false)
  })
})

describe('equivalências direcionais', () => {
  it('reconhece o registro explícito, preserva a reprovação e satisfaz pré-requisitos', () => {
    const p = perfilSintetico([tentativa('A', 'REP'), tentativa('X', 'APR')])
    p.equivalencias = [{ codigoExigido: 'A', codigoUtilizado: 'X', nomeExigido: null, nomeUtilizado: null }]
    const s = analisarSituacao(p, [componente('A')], '2026.2')
    expect(s.get('A')?.estado).toBe('equivalencia'); expect(s.get('A')?.tentativas).toHaveLength(2)
    expect(avaliarRegra(codigo('A'), s).estado).toBe('satisfeito')
  })
  it('usa equivalência na matriz, preservando origem, sem simetria ou transitividade', () => {
    const componentes = [componente('A', { equivalencias_codigos: ['B'] }), componente('B', { equivalencias_codigos: ['C'] }), componente('C')]
    const s = cumprimentos(perfilSintetico([tentativa('C', 'APR')]), componentes)
    expect(s.has('B')).toBe(true); expect(s.has('A')).toBe(false)
    const reverso = cumprimentos(perfilSintetico([tentativa('A', 'APR')]), componentes)
    expect(reverso.has('B')).toBe(false)
    expect(s.get('B')).toContain('matriz')
  })
  it('não reduz equivalência conjuntiva ou ambígua a uma lista OU', () => {
    const p = perfilSintetico([tentativa('X', 'APR')])
    for (const expressao of ['X E Y', null]) {
      const s = analisarSituacao(p, [componente('A', { equivalencias_codigos: ['X', 'Y'], equivalencias_expressao: expressao })], '2026.2').get('A')!
      expect(s.cumprido).toBe(false); expect(s.estado).toBe('indeterminado')
    }
  })
  it('não equipara componentes pelo nome ou carga horária', () => {
    const s = cumprimentos(perfilSintetico([tentativa('X', 'APR')]), [componente('A', { nome: 'Componente X' })])
    expect(s.has('A')).toBe(false)
  })
})

describe('árvores E/OU com três estados', () => {
  const matriz = ['A', 'B', 'C'].map(c => componente(c))
  it.each([['E', [], 'nao-satisfeito'], ['E', ['A'], 'nao-satisfeito'], ['E', ['B'], 'nao-satisfeito'], ['E', ['A', 'B'], 'satisfeito'], ['OU', [], 'nao-satisfeito'], ['OU', ['A'], 'satisfeito'], ['OU', ['B'], 'satisfeito'], ['OU', ['A', 'B'], 'satisfeito']])('%s com %j => %s', (op, aprovados, esperado) => {
    const s = analisarSituacao(perfilSintetico([tentativa('BASE', 'APR'), ...aprovados.map(c => tentativa(c, 'APR'))]), matriz, '2026.2')
    expect(avaliarRegra((op === 'E' ? e : ou)(codigo('A'), codigo('B')), s).estado).toBe(esperado)
  })
  it.each([[['A', 'B'], 'satisfeito'], [['C'], 'satisfeito'], [['A'], 'nao-satisfeito'], [[], 'nao-satisfeito']])('(A E B) OU C com %j => %s', (aprovados, esperado) => {
    const s = analisarSituacao(perfilSintetico([tentativa('BASE', 'APR'), ...aprovados.map(c => tentativa(c, 'APR'))]), matriz, '2026.2')
    expect(avaliarRegra(ou(e(codigo('A'), codigo('B')), codigo('C')), s).estado).toBe(esperado)
  })
  it('propaga incerteza sem exigir todas as alternativas OU', () => {
    const s = analisarSituacao(perfilSintetico([tentativa('A', 'APR'), tentativa('B', 'MATR', '2026.1')]), matriz, '2026.2')
    expect(avaliarRegra(e(codigo('A'), codigo('B')), s).estado).toBe('indeterminado')
    expect(avaliarRegra(ou(codigo('A'), codigo('B')), s).estado).toBe('satisfeito')
    expect(avaliarRegra(codigo('FORA'), s).estado).toBe('indeterminado')
  })
  it('exige árvore válida quando há expressão, lista, ciclos ou operador inválido', () => {
    const s = analisarSituacao(perfilSintetico(), matriz, '2026.2')
    expect(avaliarPreRequisitos(componente('X'), s).estado).toBe('satisfeito')
    expect(avaliarPreRequisitos(componente('X', { pre_requisitos_expressao: 'A OU B' }), s).estado).toBe('indeterminado')
    expect(avaliarPreRequisitos(componente('X', { pre_requisitos_codigos: ['A'] }), s).estado).toBe('indeterminado')
    expect(avaliarRegra({ operador: 'X' } as unknown as RegraRequisito, s).estado).toBe('indeterminado')
    const ciclo = e(codigo('A'), codigo('B')) as RegraRequisitoOperador; ciclo.direita = ciclo
    expect(avaliarRegra(ciclo, s).estado).toBe('indeterminado')
  })
  it('correquisitos simples aceitam conclusão ou concomitância, mas listas ambíguas não viram E', () => {
    const s = analisarSituacao(perfilSintetico(), matriz, '2026.2')
    const c = componente('X', { co_requisitos_expressao: 'A', co_requisitos_codigos: ['A'] })
    expect(avaliarCoRequisitos(c, s).alternativas).toEqual(['A'])
    expect(avaliarCoRequisitos(c, s, new Set(['A'])).avaliacao.estado).toBe('satisfeito')
    expect(avaliarCoRequisitos({ ...c, co_requisitos_codigos: ['A', 'B'], co_requisitos_expressao: null }, s).avaliacao.estado).toBe('indeterminado')
    const matriculado = analisarSituacao(perfilSintetico([tentativa('A', 'MATR', '2026.2')]), matriz, '2026.2')
    expect(avaliarCoRequisitos(c, matriculado).avaliacao.estado).toBe('satisfeito')
    expect(avaliarRegra(codigo('A'), matriculado).estado).toBe('indeterminado')
  })
})

describe('dependentes e desbloqueios efetivos', () => {
  it('diferencia E, OU, dependentes indiretos, requisitos adicionais e concluídos', () => {
    const cs = [componente('A'), componente('B', { pre_requisitos_regra: codigo('A') }), componente('C', { pre_requisitos_regra: codigo('B') }), componente('D', { pre_requisitos_regra: e(codigo('A'), codigo('X')) }), componente('E', { pre_requisitos_regra: ou(codigo('A'), codigo('BASE')) }), componente('F', { pre_requisitos_regra: codigo('A') }), componente('X')]
    const s = analisarSituacao(perfilSintetico([tentativa('BASE', 'APR'), tentativa('F', 'APR')]), cs, '2026.2')
    const d = analisarDependencias('A', cs, s)
    expect(d.diretas).toEqual(['B', 'D', 'E']); expect(d.indiretas).toEqual(['C']); expect(d.desbloqueios).toEqual(['B'])
  })
  it('termina com ciclos e caminhos compartilhados sem duplicações', () => {
    const cs = [componente('A', { pre_requisitos_regra: codigo('C') }), componente('B', { pre_requisitos_regra: codigo('A') }), componente('C', { pre_requisitos_regra: ou(codigo('A'), codigo('B')) })]
    const d = analisarDependencias('A', cs, analisarSituacao(perfilSintetico(), cs, '2026.2'))
    expect(d.diretas).toEqual(['B', 'C']); expect(d.indiretas).toEqual([]); expect(d.desbloqueios).toEqual(['B', 'C'])
  })
})
