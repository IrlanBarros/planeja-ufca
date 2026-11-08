import { describe, expect, it } from 'vitest'
import { indices } from './indices'
import { categoriasGlossario, notaLegenda, situacoesDisciplinas } from './glossario'
import { fontes, verificacaoNormativa } from './fontes'

describe('conteúdo do guia acadêmico', () => {
  it('cobre os cinco índices com explicação, fórmulas, exemplos e referências', () => {
    expect(indices.map(x => [x.sigla, x.nome, x.fonte.artigo])).toEqual([
      ['MC', 'Média de Conclusão', 110], ['MCN', 'Média de Conclusão Normalizada', 111],
      ['IECH', 'Índice de Eficiência em Carga Horária', 112],
      ['IEPL', 'Índice de Eficiência em Períodos Letivos', 113],
      ['IEA', 'Índice de Eficiência Acadêmica', 114],
    ])
    for (const x of indices) {
      expect(x.explicacao.length).toBeGreaterThanOrEqual(2)
      expect(x.finalidade).toBeTruthy()
      expect(x.formula).toContain('=')
      expect(x.leituraFormula).toBeTruthy()
      expect(x.variaveis.length).toBeGreaterThan(0)
      expect(x.exemplo.contexto).toBeTruthy()
      expect(x.exemplo.etapas.length).toBeGreaterThanOrEqual(2)
      expect(x.exemplo.conclusao).toBeTruthy()
      expect(x.fatores.length).toBeGreaterThan(0)
      expect(x.interpretacao.length).toBeGreaterThan(0)
      expect(x.detalhes.length).toBeGreaterThan(0)
      expect(x.duvidas.length).toBeGreaterThanOrEqual(4)
      expect(x.fonte.secao).toBeTruthy()
    }
    expect(verificacaoNormativa.data).toBe('2026-11-07')
    for (const f of Object.values(fontes)) expect(new URL(f.url).hostname).toMatch(/(^|\.)ufca\.edu\.br$/)
  })

  it('valida cada exemplo hipotético, sem usar dados de estudante', () => {
    const resultados = [
      (8 * 64 + 9 * 32) / (64 + 32),
      500 + 100 * ((8 - 7.5) / 0.5),
      128 / (128 + 64 + 64),
      1600 / (5 * 3200 / 8),
      8 * 0.8 * 0.9,
    ]
    indices.forEach((x, i) => expect(x.exemplo.resultado).toBeCloseTo(resultados[i], 10))
    expect(indices[0].exemplo.conclusao).toContain('8,33')
    expect(indices[1].exemplo.conclusao).toContain('600')
    expect(indices[2].exemplo.etapas.join(' ')).toContain('0,5')
    expect(indices[3].exemplo.etapas.join(' ')).toContain('0,8')
    expect(indices[4].exemplo.conclusao).toContain('5,76')
  })

  it('preserva limites e as ressalvas da normalização, sem prometer percentis', () => {
    expect(indices.find(x => x.id === 'mcn')?.limites).toEqual({ minimo: 0, maximo: 1000 })
    expect(indices.find(x => x.id === 'iech')?.limites).toEqual({ minimo: 0.3 })
    expect(indices.find(x => x.id === 'iepl')?.limites).toEqual({ minimo: 0.3, maximo: 1.1 })
    expect(indices.find(x => x.id === 'iea')?.limites).toEqual({})
    const mcn = indices.find(x => x.id === 'mcn')!
    expect(mcn.interpretacao.join(' ')).toContain('não é uma nota escolar nem necessariamente a mediana')
    expect(mcn.interpretacao.join(' ')).toContain('600 não significa estar entre os 60% melhores')
    expect(mcn.interpretacao.join(' ')).toContain('700 não significa estar entre os 30% melhores')
    expect(mcn.detalhes.join(' ')).toContain('superior a 100')
    expect(mcn.detalhes.join(' ')).toContain('centro com maior similaridade')
    expect(mcn.detalhes.join(' ')).toContain('não contém a distribuição')
    expect(indices.find(x => x.id === 'iech')?.detalhes[1]).toContain('Exclui aproveitados, cursados antes do início do curso, dispensados e cancelamentos')
    expect(indices.find(x => x.id === 'iepl')?.detalhes[1]).toContain('perfil inicial')
  })

  it('mantém os conceitos complementares e todos os códigos documentados separados dos índices', () => {
    expect(categoriasGlossario.map(c => c.id)).toEqual(['carga-horaria', 'estrutura-curricular', 'prazos-periodos'])
    expect(situacoesDisciplinas.map(s => s.codigo)).toEqual(['APR', 'APRN', 'REP', 'REPF', 'REPMF', 'REPN', 'REPNF', 'TRANC', 'MATR', 'CANC', 'DISP', 'TRANS', 'INCORP', 'CUMP', 'REC', 'PARCCUMP'])
    expect(notaLegenda).toContain('diferem dos critérios do art. 95')
    expect(notaLegenda).toContain('Códigos não documentados')
  })
})
