import { describe, expect, it } from 'vitest'
import { catalogarOferta, correspondeBusca, correspondenciasCurriculares, descreverProcedencia, pertenceAoCurso, rotuloCurso } from './catalogo'
import { ofertaSintetica } from './fixtures.test-utils'
import { componente, turma } from '../recomendacoes/fixtures.test-utils'
import { alternativasSeguras, cumprimentos, equivalentesCurriculares } from '../recomendacoes/services/equivalencias'
import { resolverReferencia } from './referenciaCurricular'
import { cargaDaTurma, duplicaExigencia } from '../recomendacoes/services/elegibilidade'
import { localizarOfertas } from '../recomendacoes/services/disponibilidade'
import { gerarRecomendacoes } from '../recomendacoes/services/recomendador'
import { gerarIdTurma, validarAdicao } from './selecao'

describe('catálogo global com procedência', () => {
  it('deduplica a turma física, conserva todos os IDs dos cursos e todas as turmas do componente', () => {
    const { oferta } = ofertaSintetica()
    const itens = catalogarOferta(oferta)
    expect(itens).toHaveLength(9)
    expect(itens.filter(i => i.turma.codigo === 'EM0010')).toHaveLength(2)
    const compartilhada = itens.find(i => i.turma.codigo === 'COMPARTILHADA')!
    expect(compartilhada.cursos.map(c => c.id)).toEqual(['adm1', 'adm2'])
    expect(compartilhada.divergente).toBe(false)
    expect(pertenceAoCurso(compartilhada, 'adm2')).toBe(true)
    expect(pertenceAoCurso(compartilhada, 'curso')).toBe(false)
    expect(rotuloCurso(compartilhada.cursos[0], oferta.cursos)).toBe('ADMINISTRAÇÃO (adm1)')
    expect(descreverProcedencia(compartilhada.turma)).toBe('')
  })
  it('expõe divergências de local/horário sem mudar o ID ou duplicar a turma', () => {
    const { oferta } = ofertaSintetica()
    oferta.cursos[3].turmas = [{ ...oferta.cursos[3].turmas[0], sala: 'Local divergente' }]
    const item = catalogarOferta(oferta).find(i => i.turma.codigo === 'COMPARTILHADA')!
    expect(item.divergente).toBe(true)
    expect(item.id).toBe(gerarIdTurma(oferta.cursos[2].turmas[2]))
    expect(item.cursos).toHaveLength(2)
  })
  it('distingue sala ausente (herdada) de sala explicitamente desconhecida no encontro', () => {
    const { oferta } = ofertaSintetica()
    const compartilhada = oferta.cursos[3].turmas[0]
    compartilhada.sala = 'Sala geral'
    oferta.cursos[3].turmas = [{ ...compartilhada, horarios: compartilhada.horarios.map(h => ({ ...h, sala: null })) }]
    expect(catalogarOferta(oferta).find(i => i.turma.codigo === 'COMPARTILHADA')?.divergente).toBe(true)
  })
  it.each(['em0010', 'algebra linear', 'JOAO', 'engenharia de materiais'])('busca código, disciplina, docente e curso sem acentuação: %s', busca => {
    const { oferta } = ofertaSintetica()
    expect(catalogarOferta(oferta).filter(i => correspondeBusca(i, busca)).some(i => i.turma.codigo === 'EM0010')).toBe(true)
  })
  it('não encontra código inexistente nem cria ofertas para curso vazio', () => {
    const itens = catalogarOferta(ofertaSintetica().oferta)
    expect(itens.filter(i => correspondeBusca(i, 'inexistente'))).toEqual([])
    expect(itens.filter(i => pertenceAoCurso(i, 'vazio'))).toEqual([])
  })
})

describe('equivalências conservadoras e direcionais', () => {
  it.each([
    ['X', ['X'], ['X']], ['( X ) OU ( Y )', ['X', 'Y'], ['X', 'Y']],
    ['(X OU (Y OU Z))', ['X', 'Y', 'Z'], ['X', 'Y', 'Z']],
    ['X E Y', ['X', 'Y'], null], ['( X E Y ) OU Z', ['X', 'Y', 'Z'], null],
    ['X OU (Y E Z)', ['X', 'Y', 'Z'], null], ['X OU Y', ['X', 'Y', 'Z'], null],
    ['(X OU Y', ['X', 'Y'], null], ['X OU Y)', ['X', 'Y'], null],
    ['X Y', ['X', 'Y'], null], ['X OU', ['X'], null], [null, ['X', 'Y'], null], [null, ['X'], ['X']],
  ])('interpreta %s sem transformar conjuntos ou dados inválidos em alternativas individuais', (expressao, codigos, esperado) => {
    expect(alternativasSeguras(expressao, codigos)).toEqual(esperado)
  })
  it('identifica equivalência individual e mesmo componente; não inventa simetria, transitividade ou semelhança', () => {
    const { estrutura } = ofertaSintetica()
    expect(correspondenciasCurriculares(turma('EM0010'), estrutura)[0]).toMatchObject({ tipo: 'equivalente', componente: { codigo: 'CC0063' } })
    expect(correspondenciasCurriculares(turma('CC0003'), estrutura)[0].tipo).toBe('mesmo-componente')
    expect(correspondenciasCurriculares({ ...turma('ZZZ'), disciplina: 'Álgebra Linear' }, estrutura)).toEqual([])
    estrutura.componentes = [componente('A', { equivalencias_codigos: ['B'] }), componente('B', { equivalencias_codigos: ['C'] })]
    expect(correspondenciasCurriculares(turma('A'), estrutura).map(c => c.componente.codigo)).toEqual(['A'])
    expect(correspondenciasCurriculares(turma('C'), estrutura).map(c => c.componente.codigo)).toEqual(['B'])
  })
  it('registros do histórico comprovam cumprimento, sem autorizar automaticamente ofertas futuras', () => {
    const dados = ofertaSintetica()
    const c = componente('PASSADA')
    dados.perfil.equivalencias = [{ codigoExigido: c.codigo, codigoUtilizado: 'EM0010', nomeExigido: null, nomeUtilizado: null }]
    expect(cumprimentos(dados.perfil, [c]).has(c.codigo)).toBe(true)
    expect(equivalentesCurriculares(c)).toEqual([])
    const ofertas = localizarOfertas(c, dados.perfil, dados.oferta, 'curso', dados.preferencias, [])
    expect(ofertas).toHaveLength(2)
    expect(ofertas.every(o => !o.confirmada && o.motivos.some(m => m.includes('neste contexto')))).toBe(true)
    expect(duplicaExigencia(turma('EM0010'), [turma('PASSADA')], [c])).toBe(false)
  })
  it('adverte sobre duplicação comprovada sem associar componentes externos arbitrários', () => {
    const { estrutura } = ofertaSintetica()
    expect(duplicaExigencia(turma('EM0010'), [turma('CC0063')], estrutura.componentes)).toBe(true)
    expect(duplicaExigencia(turma('EM0010'), [turma('MC0006')], estrutura.componentes)).toBe(true)
    expect(duplicaExigencia(turma('ADM0001'), [turma('CC0063')], estrutura.componentes)).toBe(false)
  })
})

describe('matriz pública e vínculo acadêmico', () => {
  it('sugere claramente a mais recente sem perfil e permite escolher outra por ID', () => {
    const { curriculo, indice } = ofertaSintetica()
    const inicial = resolverReferencia('curso', indice.cursos, curriculo, null, null)
    expect(inicial.estrutura?.id).toBe('id-interno')
    expect(inicial.mensagem).toContain('Sugestão inicial')
    expect(inicial.perfilCompativel).toBeUndefined()
    expect(resolverReferencia('curso', indice.cursos, curriculo, null, 'antiga').estrutura?.id).toBe('antiga')
  })
  it('usa somente a matriz do histórico compatível, mesmo que outra seja solicitada', () => {
    const { curriculo, indice, perfil } = ofertaSintetica()
    perfil.curso.estruturaCurricular = 'AB000'
    const r = resolverReferencia('curso', indice.cursos, curriculo, perfil, 'id-interno')
    expect(r.estrutura?.id).toBe('antiga')
    expect(r.opcoes).toHaveLength(1)
    expect(r.perfilCompativel).toBe(perfil)
  })
  it('não substitui a matriz ausente do histórico e exige confirmação de versões ambíguas', () => {
    const { curriculo, indice, perfil } = ofertaSintetica()
    perfil.curso.estruturaCurricular = 'AUSENTE'
    expect(resolverReferencia('curso', indice.cursos, curriculo, perfil, null).estrutura).toBeUndefined()
    perfil.curso.estruturaCurricular = 'AB001'
    curriculo.estruturas.push({ ...curriculo.estruturas[0], id: 'mesmo-codigo' })
    expect(resolverReferencia('curso', indice.cursos, curriculo, perfil, null).estrutura).toBeUndefined()
    expect(resolverReferencia('curso', indice.cursos, curriculo, perfil, 'mesmo-codigo').estrutura?.id).toBe('mesmo-codigo')
  })
  it('não usa perfil de outro curso nem arquivo curricular com ID incompatível', () => {
    const { curriculo, indice, perfil } = ofertaSintetica()
    perfil.curso.idCurso = 'materiais'
    const r = resolverReferencia('curso', indice.cursos, curriculo, perfil, null)
    expect(r.perfilCompativel).toBeUndefined()
    expect(r.mensagem).toContain('Sugestão inicial')
    curriculo.curso_id = 'incorreto'
    expect(resolverReferencia('curso', indice.cursos, curriculo, perfil, null).estrutura).toBeUndefined()
  })
  it('explica ausência de estruturas públicas', () => {
    const { curriculo, indice } = ofertaSintetica()
    curriculo.estruturas = []
    const r = resolverReferencia('curso', indice.cursos, curriculo, null, null)
    expect(r.estrutura).toBeUndefined()
    expect(r.mensagem).toContain('não está disponível')
  })
})

describe('seleção e planejador com ofertas externas', () => {
  it('preserva validações técnicas entre cursos, componente e turma física', () => {
    const { oferta } = ofertaSintetica()
    const primaria = oferta.cursos[0].turmas[0], externa = oferta.cursos[2].turmas[0], conflito = oferta.cursos[2].turmas[1]
    expect(validarAdicao([externa], [primaria], oferta.periodo)).toBeNull()
    expect(validarAdicao([conflito], [primaria], oferta.periodo)).toContain('Conflito')
    expect(validarAdicao([externa, externa], [], oferta.periodo)).toContain('Já existe')
    expect(validarAdicao([turma(externa.codigo, 6, '12:00', '14:00', '02')], [externa], oferta.periodo)).toContain('Já existe')
    expect(validarAdicao([{ ...externa, periodo: '2020.1' }], [], oferta.periodo)).toContain('período')
  })
  it.each([null, NaN, Infinity, -1, 0])('não inventa carga e mantém valores ausentes/inválidos fora do plano: %s', carga => {
    const dados = ofertaSintetica()
    const externa = dados.oferta.cursos[2].turmas[0]
    if (carga !== null) dados.estrutura.componentes.push(componente(externa.codigo, { carga_horaria: carga }))
    expect(cargaDaTurma(externa, dados.estrutura.componentes)).toBeNull()
    const resultado = gerarRecomendacoes({ ...dados, selecionadas: [externa] })
    expect(resultado.plano).toEqual([])
    expect(Number.isFinite(resultado.cargaPlanejada)).toBe(true)
    expect(resultado.avisos.join(' ')).toContain('Carga horária')
    expect(externa.codigo).toBe('ADM0001')
  })
})
