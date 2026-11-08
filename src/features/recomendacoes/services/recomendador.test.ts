import { describe, expect, it } from 'vitest'
import { codigo, componente, entrada, perfilSintetico, tentativa, turma } from '../fixtures.test-utils'
import { gerarRecomendacoes } from './recomendador'
import { PESOS, pontuar } from './pontuacao'
import { analisarSituacao } from './situacaoCurricular'
import { encontrarConflitos } from '../../../utils/conflitos'
import { validarAdicao, gerarIdTurma, gerarStorageKey } from '../../horarios/selecao'
import { validarInclusao } from './planejamento'

describe('recomendador determinístico', () => {
  it('ordena obrigatórias e desbloqueios, com pesos explícitos e desempate por nível/código', () => {
    const x = entrada([componente('OPT', { tipo: 'optativa' }), componente('B'), componente('A'), componente('C', { pre_requisitos_regra: codigo('A') })], ['OPT', 'B', 'A', 'C'].map((c, i) => turma(c, i + 2)))
    const r = gerarRecomendacoes(x)
    expect(r.itens[0].componente.codigo).toBe('A')
    expect(r.itens.find(i => i.componente.codigo === 'A')?.dependencias.desbloqueios).toEqual(['C'])
    expect(r.itens.findIndex(i => i.componente.codigo === 'B')).toBeLessThan(r.itens.findIndex(i => i.componente.codigo === 'OPT'))
    expect(gerarRecomendacoes(x)).toEqual(r)
    const s = analisarSituacao(x.perfil, x.estrutura.componentes, x.oferta.periodo).get('A')!
    const fs = pontuar(x.estrutura.componentes[2], s, { diretas: [], indiretas: [], desbloqueios: [] }, { ...x.preferencias, estrategia: 'avanco' }, 3, true, true, 0)
    expect(fs.reduce((n, f) => n + f.pontos, 0)).toBe(PESOS.avanco.obrigatoria + 2 * PESOS.avanco.atraso + PESOS.avanco.oferta + PESOS.avanco.compativel)
    expect(r.itens[0].justificativas.join(' ')).toContain('C')
  })
  it('separa cumpridas, bloqueadas, sem oferta, indeterminadas e matrícula antiga', () => {
    const p = perfilSintetico([tentativa('APROVADA', 'APR'), tentativa('ANTIGA', 'MATR', '2026.1')])
    const x = entrada([componente('APROVADA'), componente('BLOQUEADA', { pre_requisitos_regra: codigo('PENDENTE') }), componente('PENDENTE'), componente('AMBIGUA', { pre_requisitos_expressao: 'APROVADA' }), componente('ANTIGA')], [turma('APROVADA'), turma('BLOQUEADA'), turma('AMBIGUA'), turma('ANTIGA')], p)
    const r = gerarRecomendacoes(x)
    expect(r.itens.some(i => i.componente.codigo === 'APROVADA')).toBe(false)
    expect(r.itens.find(i => i.componente.codigo === 'BLOQUEADA')?.categoria).toBe('requisitos')
    expect(r.itens.find(i => i.componente.codigo === 'PENDENTE')?.categoria).toBe('sem-oferta')
    expect(r.itens.find(i => i.componente.codigo === 'AMBIGUA')?.categoria).toBe('confirmacao')
    expect(r.itens.find(i => i.componente.codigo === 'ANTIGA')?.categoria).toBe('confirmacao')
    expect(r.avisos.join(' ')).toContain('desatualizado'); expect(r.plano).toEqual([])
  })
  it('não gera personalização para matriz/curso divergente nem escolhe o ID pelo código', () => {
    const x = entrada(); x.estrutura.codigo = 'OUTRA'
    expect(gerarRecomendacoes(x).itens).toEqual([])
    x.estrutura.codigo = 'AB001'; x.cursoId = 'outro'
    expect(gerarRecomendacoes(x).plano).toEqual([])
  })
  it('busca todas as alternativas, respeitando conflitos, dias, turnos e a carga total existente', () => {
    const x = entrada([componente('A'), componente('B'), componente('EXISTENTE')], [turma('A'), turma('A', 3, '08:00', '10:00', '02'), turma('B', 4)])
    x.selecionadas = [turma('EXISTENTE')]; x.preferencias.cargaHoraria = 128
    const r = gerarRecomendacoes(x)
    expect(r.plano).toHaveLength(1); expect(r.plano[0].turma).toBe('02'); expect(r.cargaPlanejada).toBe(128)
    expect(encontrarConflitos(r.plano[0], x.selecionadas)).toEqual([])
    x.preferencias.dias = [2]; expect(gerarRecomendacoes(x).plano).toEqual([])
    x.preferencias.dias = [2, 3, 4]; x.preferencias.turnos = ['noite']; expect(gerarRecomendacoes(x).plano).toEqual([])
  })
  it('não trata horários ausentes, inválidos ou que cruzam um turno indisponível como compatíveis', () => {
    const t = turma('A'); t.horarios = []
    const x = entrada([componente('A')], [t]); expect(gerarRecomendacoes(x).plano).toEqual([])
    t.horarios = [{ dia: 2, dia_nome: 'Segunda', inicio: '08:99', fim: '10:00' }]
    expect(gerarRecomendacoes(x).plano).toEqual([])
    x.oferta.cursos[0].turmas = [turma('A', 2, '11:00', '13:00')]; x.preferencias.turnos = ['manha']
    expect(gerarRecomendacoes(x).plano).toEqual([])
  })
  it('prefere dias já usados em concentrar horários, reavaliando entre sugestões', () => {
    const x = entrada([componente('A'), componente('B')], [turma('A', 2), turma('B', 3), turma('B', 2, '10:00', '12:00', '02')])
    x.preferencias.estrategia = 'concentrar'
    const r = gerarRecomendacoes(x)
    expect(r.plano).toHaveLength(2); expect(r.plano.every(t => t.horarios[0].dia === 2)).toBe(true)
  })
  it('não utiliza o mesmo plano como aprovação de um pré-requisito', () => {
    const x = entrada([componente('A'), componente('B', { pre_requisitos_regra: codigo('A') })], [turma('A', 2), turma('B', 3)])
    expect(gerarRecomendacoes(x).plano.map(t => t.codigo)).toEqual(['A'])
  })
  it('inclui correquisitos juntos, inclusive recíprocos, e rejeita pacote conflitante ou acima da carga', () => {
    const cs = [componente('A', { co_requisitos_codigos: ['B'], co_requisitos_expressao: 'B' }), componente('B', { co_requisitos_codigos: ['A'], co_requisitos_expressao: 'A' })]
    const x = entrada(cs, [turma('A', 2), turma('B', 3)])
    const r = gerarRecomendacoes(x)
    expect(r.plano.map(t => t.codigo)).toEqual(['A', 'B']); expect(r.itens.every(i => i.categoria === 'recomendadas')).toBe(true)
    expect(validarInclusao([r.plano[0]], [], x.perfil, x.estrutura, x.oferta.periodo, x.preferencias, r.itens)).toContain('matrícula conjunta')
    expect(validarInclusao(r.plano, [], x.perfil, x.estrutura, x.oferta.periodo, x.preferencias, r.itens)).toBeNull()
    x.preferencias.cargaHoraria = 64; expect(gerarRecomendacoes(x).plano).toEqual([])
    x.preferencias.cargaHoraria = 128; x.oferta.cursos[0].turmas = [turma('A'), turma('B')]; expect(gerarRecomendacoes(x).plano).toEqual([])
    x.oferta.cursos[0].turmas = [turma('A')]; expect(gerarRecomendacoes(x).plano).toEqual([])
  })
  it('aceita correquisito já escolhido, com aprovação anterior ou alternativa OU', () => {
    const x = entrada([componente('A', { co_requisitos_codigos: ['B', 'C'], co_requisitos_expressao: '( B OU C )' }), componente('B'), componente('C')], [turma('A', 3)])
    x.selecionadas = [turma('B')]
    expect(gerarRecomendacoes(x).plano.map(t => t.codigo)).toEqual(['A'])
    x.selecionadas = []; x.perfil.componentesCursados.push(tentativa('C', 'APR'))
    expect(gerarRecomendacoes(x).plano.map(t => t.codigo)).toEqual(['A'])
  })
  it('considera equivalentes e o mesmo código em outro curso, sem duplicar exigências', () => {
    const x = entrada([componente('A', { equivalencias_codigos: ['X'] }), componente('X')], [turma('A')])
    x.oferta.cursos.push({ ...x.oferta.cursos[0], id: 'outro', nome: 'OUTRO CURSO', turmas: [turma('X', 3), turma('A', 4, '08:00', '10:00', '02'), turma('SEM-RELACAO', 5)] })
    const r = gerarRecomendacoes(x)
    expect(r.itens.find(i => i.componente.codigo === 'A')?.ofertas.map(o => o.origem)).toEqual(expect.arrayContaining(['matriz', 'outro-agrupamento', 'equivalente']))
    expect(r.plano).toHaveLength(1); expect(r.plano.some(t => t.codigo === 'SEM-RELACAO')).toBe(false)
    x.selecionadas = [turma('X', 3)]; expect(gerarRecomendacoes(x).plano).toEqual([])
    x.selecionadas = []; x.perfil.componentesCursados.push(tentativa('X', 'APR')); expect(gerarRecomendacoes(x).itens).toEqual([])
  })
  it('sinaliza equivalência ambígua, carga desconhecida e exigência administrativa fora da matriz', () => {
    const x = entrada([componente('A', { equivalencias_codigos: ['X', 'Y'], equivalencias_expressao: 'X E Y' })], [turma('X')])
    const r = gerarRecomendacoes(x); expect(r.itens[0].categoria).toBe('confirmacao'); expect(r.plano).toEqual([])
    x.selecionadas = [turma('FORA')]; x.perfil.componentesPendentes.push({ codigo: 'ENADE', nome: null, cargaHoraria: 0, observacao: null })
    expect(gerarRecomendacoes(x).avisos.join(' ')).toContain('Carga horária'); expect(gerarRecomendacoes(x).avisos.join(' ')).toContain('ENADE')
  })
  it('atribui uma oferta equivalente só à exigência planejada sem promover outra bloqueada', () => {
    const x = entrada([componente('A', { equivalencias_codigos: ['X'] }), componente('B', { equivalencias_codigos: ['X'], pre_requisitos_regra: codigo('PENDENTE') }), componente('PENDENTE')], [turma('X')])
    const r = gerarRecomendacoes(x)
    expect(r.plano.map(t => t.codigo)).toEqual(['X'])
    expect(r.itens.filter(i => i.categoria === 'recomendadas').map(i => i.componente.codigo)).toEqual(['A'])
    expect(r.itens.find(i => i.componente.codigo === 'B')?.categoria).toBe('requisitos')
    x.estrutura.componentes[1].pre_requisitos_regra = null
    expect(gerarRecomendacoes(x).itens.filter(i => i.categoria === 'recomendadas')).toHaveLength(1)
    x.estrutura.componentes[0].pre_requisitos_regra = codigo('PENDENTE')
    x.estrutura.componentes[1].tipo = 'optativa'
    const alternativo = gerarRecomendacoes(x)
    expect(alternativo.itens.findIndex(i => i.componente.codigo === 'A')).toBeLessThan(alternativo.itens.findIndex(i => i.componente.codigo === 'B'))
    expect(validarInclusao(alternativo.plano, [], x.perfil, x.estrutura, x.oferta.periodo, x.preferencias, alternativo.itens)).toBeNull()
  })
  it('não utiliza índices e notas para alterar recomendações', () => {
    const x = entrada(); const antes = gerarRecomendacoes(x)
    x.perfil.indicesOficiais = { mc: 0, mcn: 0, iea: 0, iech: 0, iepl: 0 }; x.perfil.componentesCursados[0].media = 0
    expect(gerarRecomendacoes(x)).toEqual(antes)
  })
})

describe('contrato compartilhado dos horários', () => {
  it('mantém identificadores, chaves legadas e impede duplicações/conflitos sem substituir', () => {
    const a = turma('A'), b = turma('B')
    expect(gerarIdTurma(a)).toBe('A|01|Docente sintético|2-08:00-10:00')
    expect(gerarStorageKey('2026.2', 'curso')).toBe('planeja-ufca:2026.2:curso:turmas')
    expect(validarAdicao([a], [a], '2026.2')).toContain('Já existe')
    expect(validarAdicao([b], [a], '2026.2')).toContain('Conflito com A')
    expect(validarAdicao([turma('B', 3)], [a], '2026.2')).toBeNull()
    expect(validarAdicao([a], [], '2027.1')).toContain('período')
    expect([a]).toEqual([a])
  })
})
