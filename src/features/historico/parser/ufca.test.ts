import { describe, expect, it } from 'vitest'
import { interpretarUfca } from './ufca'
import { cabecalhoTabela, el, linha, pagina, sintetico, tentativa } from './fixtures.test-utils'
import { numeroOficial, reconstruirLinhas } from './layout'
import { associarCurso, normalizarCurso } from '../integracaoCurricular'
import { documentoDesatualizado, validarHistorico } from '../validation/profile'
import { SITUACOES } from '../validation/profile'

describe('parser posicional de históricos UFCA sintéticos', () => {
  it('extrai vínculo, índices e horas oficiais sem recalcular', () => {
    const h = interpretarUfca(sintetico())
    expect(h.emitidoEm).toBe('2026-08-15')
    expect(h.curso.estruturaCurricular).toBe('AB001 - 2020.1')
    expect(h.vinculo).toMatchObject({ situacao: 'ATIVO', periodoIngresso: '2020.1', periodoAtual: '8', prazoPadrao: '2026.2', prazoMaximo: '2028.2' })
    expect(h.indicesOficiais).toEqual({ mc: 8.1234, mcn: 400.1234, iech: 0.7, iepl: 0.8, iea: 4.55 })
    expect(h.cargaHoraria.total).toEqual({ exigida: 1500, integralizada: 720, pendente: 780 })
    expect(h.atividadesAutonomas).toEqual([{ categoria: 'EXTENSÃO SINTÉTICA', cargaHoraria: 120 }])
  })
  it('preserva tentativas, situações desconhecidas e marcadores sem classificar', () => {
    const h = interpretarUfca(sintetico())
    expect(h.componentesCursados).toHaveLength(5)
    expect(h.componentesCursados.filter(c => c.codigo === 'ABC0001')).toHaveLength(2)
    expect(h.componentesCursados.map(c => c.situacao)).toEqual(['REP', 'APR', 'TRANC', 'MATR', 'NOVO'])
    expect(h.componentesCursados[1].tipo).toBe('equivalente a obrigatório')
    expect(h.componentesCursados[2].marcadores).toEqual(['*'])
    expect(h.componentesCursados[3]).toMatchObject({ tipo: 'eletivo', media: null, frequencia: null })
    expect(h.componentesCursados[4].tipo).toBe('equivalente a optativo')
    expect(h.validacao.advertencias.join(' ')).toContain('situação desconhecida')
  })
  it('mantém direção das equivalências e pendências entre páginas', () => {
    const h = interpretarUfca(sintetico())
    expect(h.componentesPendentes).toEqual([
      { codigo: 'ABC0003', nome: 'DISCIPLINA SINTÉTICA', cargaHoraria: 64, observacao: 'Matriculado' },
      { codigo: 'ABC0005', nome: 'DISCIPLINA PENDENTE', cargaHoraria: 96, observacao: null },
    ])
    expect(h.equivalencias).toEqual([{ codigoExigido: 'ABC0006', nomeExigido: 'NOME EXIGIDO', codigoUtilizado: 'ABC0001', nomeUtilizado: 'NOME CURSADO' }])
  })
  it('exclui docentes e identificadores pessoais da estrutura final', () => {
    const h = interpretarUfca(sintetico())
    const json = JSON.stringify(h)
    for (const trecho of ['Docente Inventado', 'PESSOA FICTÍCIA', '000.000.000-00', 'FICTICIA', 'CPF:', 'Matrícula:']) expect(json).not.toContain(trecho)
    expect(h.componentesCursados.every(c => c.nome === 'TÓPICOS SINTÉTICOS')).toBe(true)
  })
  it('reconstrói título extenso em mais de uma linha e não desloca a nota', () => {
    const pages = sintetico()
    pages[0].elementos.push(el('NOME EXTENSO COM CONTINUAÇÃO', 170, 300, 6))
    const h = interpretarUfca(pages)
    expect(h.componentesCursados[0].nome).toBe('NOME EXTENSO COM CONTINUAÇÃO TÓPICOS SINTÉTICOS')
    expect(h.componentesCursados[0].media).toBe(8.7)
  })
  it('continua tabela sem repetir cabeçalho e avisa sobre colunas incertas', () => {
    const pages = sintetico()
    pages.splice(1, 0, pagina(2, [...tentativa(90, 'ABC0099', 'REPF', '', '2025.2')]))
    expect(interpretarUfca(pages).componentesCursados).toHaveLength(6)
    expect(interpretarUfca(pages).validacao.advertencias.join(' ')).toContain('cabeçalho de colunas ausente')
  })
  it('registra dados ausentes e não inventa valores', () => {
    const pages = sintetico().slice(0, 1)
    pages[0].elementos = pages[0].elementos.filter(e => !e.texto.startsWith('MC:') && e.texto !== '8.7' && !e.texto.startsWith('Estrutura Curricular:'))
    const h = interpretarUfca(pages)
    expect(h.indicesOficiais.mc).toBeNull()
    expect(h.curso.estruturaCurricular).toBeNull()
    expect(h.componentesCursados[0].media).toBeNull()
    expect(h.validacao.advertencias.length).toBeGreaterThan(0)
  })
  it('avisa sobre códigos órfãos e não transforma legenda em disciplinas', () => {
    const pages = sintetico()
    pages[0].elementos.push(el('ABC9999', 130, 450))
    const h = interpretarUfca(pages)
    expect(h.validacao.camposNaoReconhecidos.join(' ')).toContain('códigos sem período')
    expect(h.componentesCursados).toHaveLength(5)
  })
  it('rejeita documento alheio, sem texto ou sem tabela reconhecida', () => {
    expect(() => interpretarUfca([pagina(1, [])])).toThrow('não possui texto extraível')
    expect(() => interpretarUfca([pagina(1, [linha('Outro PDF', 20)])])).toThrow('não foi reconhecido')
    expect(() => interpretarUfca([pagina(1, sintetico()[0].elementos.filter(e => e.y < 260))])).toThrow('tabela de componentes')
  })
  it('não pressupõe três páginas nem elimina possíveis duplicações', () => {
    const pages = sintetico().slice(0, 1)
    pages.push(pagina(2, [linha('Componentes Curriculares Cursados/Cursando', 40), ...cabecalhoTabela(60), ...tentativa(90, 'ABC0001', 'REP')]))
    const h = interpretarUfca(pages)
    expect(h.componentesCursados).toHaveLength(5)
    expect(validarHistorico(h).join(' ')).toContain('possível duplicação')
  })
  it('associa só curso inequívoco, normaliza acentos e preserva matriz', () => {
    const h = interpretarUfca(sintetico())
    const c = { id: '1', nome: 'CURSO SINTETICO', modalidade: 'Presencial', disponivel: true, arquivo: '1.json' }
    expect(normalizarCurso(h.curso.nome!)).toBe('CURSO SINTETICO')
    expect(associarCurso(h, [c]).curso.idCurso).toBe('1')
    expect(associarCurso(h, [c, { ...c, id: '2' }]).curso.idCurso).toBeNull()
    expect(associarCurso(h, []).curso.estruturaCurricular).toBe(h.curso.estruturaCurricular)
  })
  it('sinaliza documento de semestre anterior sem alterar o histórico', () => {
    expect(documentoDesatualizado('2026-05-18', new Date('2026-11-07T12:00:00-03:00'))).toBe(true)
    expect(documentoDesatualizado('2026-08-15', new Date('2026-11-07T12:00:00-03:00'))).toBe(false)
    expect(documentoDesatualizado(null)).toBe(false)
  })
  it('normaliza decimais e recusa valores inventados', () => {
    expect(numeroOficial('93,8')).toBe(93.8)
    expect(numeroOficial('--')).toBeNull()
    expect(numeroOficial('8.7h')).toBe(8.7)
    expect(numeroOficial('nota: 7')).toBeNull()
    expect(reconstruirLinhas([el('B', 60, 10), el('A', 30, 10)])[0].texto).toBe('A B')
  })
  it.each([...SITUACOES])('preserva a situação %s sem alterar a tentativa', situacao => {
    const pages = sintetico().slice(0, 1)
    pages[0].elementos = pages[0].elementos.filter(e => e.y < 300).concat(tentativa(310, 'ABC0001', situacao))
    expect(interpretarUfca(pages).componentesCursados[0].situacao).toBe(situacao)
  })
  it('preserva marcador desconhecido e sinaliza valor numérico não reconhecido', () => {
    const pages = sintetico().slice(0, 1)
    pages[0].elementos = pages[0].elementos.filter(e => e.y < 300).concat(tentativa(310, 'ABC0001', 'APR', '!'))
    pages[0].elementos.find(e => e.texto === '8.7')!.texto = '???'
    const h = interpretarUfca(pages)
    expect(h.componentesCursados[0]).toMatchObject({ marcadores: ['!'], tipo: 'desconhecido', media: null })
    expect(h.validacao.camposNaoReconhecidos.join(' ')).toContain('numérico não reconhecido')
    expect(h.validacao.advertencias.join(' ')).toContain('marcador de tipo desconhecido')
  })
  it('reconhece equivalência dividida entre páginas sem anexar rodapé ao nome', () => {
    const pages = sintetico()
    pages[2].elementos = pages[2].elementos.filter(e => !e.texto.startsWith('Cumpriu'))
    pages[2].elementos.push(linha('Cumpriu ABC0006 - NOME EXIGIDO (64h)', 160))
    pages.push(pagina(4, [linha('Histórico Escolar - Emitido em: 15/08/2026', 40), linha('através de ABC0001 - NOME CURSADO (64h)', 100), linha('Código de verificação: SEGREDO FICTÍCIO', 800)]))
    expect(interpretarUfca(pages).equivalencias).toEqual([{ codigoExigido: 'ABC0006', nomeExigido: 'NOME EXIGIDO', codigoUtilizado: 'ABC0001', nomeUtilizado: 'NOME CURSADO' }])
  })
})
