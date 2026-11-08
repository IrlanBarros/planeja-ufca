import { describe, expect, it } from 'vitest'
import { componente, tentativa } from '../../recomendacoes/fixtures.test-utils'
import { dadosCurriculoTeste, exportacaoTeste } from '../fixtures.test-utils'
import { prepararExportacao, nomeArquivoCurriculo } from '../services/prepararExportacao'
import { gerarCurriculoCsv } from './exportarCurriculoCsv'
import { gerarCurriculoPdf } from './exportarCurriculoPdf'

describe('modelo de exportação e privacidade', () => {
  it.each(['original', 'progresso'] as const)('contém uma linha por exigência no modo %s, sem duplicar tentativas/equivalências', modo => {
    const d = dadosCurriculoTeste()
    d.perfil.componentesCursados.push(tentativa('ABC0001', 'APR', '2026.1'))
    d.estrutura.componentes.push(d.estrutura.componentes[0])
    const m = prepararExportacao({ ...d, modo })
    expect(m.linhas).toHaveLength(6)
    expect(m.linhas.filter(l => l.componente.codigo === 'ABC0002')).toHaveLength(1)
    expect(m.linhas.find(l => l.componente.tipo === 'optativa')).toBeTruthy()
    expect(m.linhas.find(l => l.componente.nivel === null && l.componente.tipo === 'obrigatoria')).toBeTruthy()
  })
  it('original independe do histórico e ignora todos os dados individuais', () => {
    const d = dadosCurriculoTeste()
    const comPerfil = prepararExportacao({ ...d, modo: 'original' })
    const semPerfil = prepararExportacao({ ...d, perfil: null, modo: 'original' })
    expect(comPerfil).toEqual(semPerfil)
    expect(comPerfil.indicadores).toEqual([]); expect(comPerfil.emitidoEm).toBeNull()
    expect(comPerfil.linhas.every(l => !l.situacao)).toBe(true)
  })
  it.each(['sem-perfil', 'curso', 'matriz', 'ambiguo', 'nome-ambiguo', 'id-interno'])('recusa progresso inseguro: %s', caso => {
    const d = dadosCurriculoTeste()
    if (caso === 'curso') d.perfil.curso.idCurso = 'outro'
    if (caso === 'matriz') d.perfil.curso.estruturaCurricular = 'AB002'
    if (caso === 'id-interno') d.perfil.curso.estruturaCurricular = d.estrutura.id
    if (caso === 'ambiguo') d.estruturas.push({ ...d.estrutura, id: 'duplicada' })
    if (caso === 'nome-ambiguo') { d.perfil.curso.idCurso = null; d.cursos.push({ ...d.curso, id: 'outro' }) }
    expect(() => prepararExportacao({ ...d, perfil: caso === 'sem-perfil' ? null : d.perfil, modo: 'progresso' })).toThrow(/compatível/)
  })
  it('ambiguidade da matriz exige confirmação explícita de ID candidato', () => {
    const d = dadosCurriculoTeste(); d.estruturas.push({ ...d.estrutura, id: 'duplicada' })
    expect(() => prepararExportacao({ ...d, modo: 'progresso', estruturaConfirmada: 'fora' })).toThrow()
    expect(prepararExportacao({ ...d, modo: 'progresso', estruturaConfirmada: d.estrutura.id }).modo).toBe('progresso')
  })
  it.each(['original', 'progresso'] as const)('não transporta identificadores, nomes privados, correções ou trechos do perfil (%s)', modo => {
    const d = dadosCurriculoTeste()
    d.perfil.curso.nome = 'NOME_PRIVADO'
    d.perfil.componentesCursados[0].nome = 'CPF_PRIVADO'
    d.perfil.validacao.advertencias = ['MATRICULA_PRIVADA']
    d.perfil.correcoes = [{ campo: 'NOME_PRIVADO', valorOriginal: 'SEGREDO_PRIVADO' }]
    const m = prepararExportacao({ ...d, modo })
    const conteudo = [JSON.stringify(m), gerarCurriculoCsv(m), gerarCurriculoPdf(m).output()].join('\n')
    for (const privado of ['NOME_PRIVADO', 'CPF_PRIVADO', 'MATRICULA_PRIVADA', 'SEGREDO_PRIVADO']) expect(conteudo).not.toContain(privado)
  })
  it('normaliza os nomes dos quatro arquivos', () => {
    const d = dadosCurriculoTeste(); d.curso = { ...d.curso, nome: 'Ciência / da Computação ?' }
    for (const modo of ['original', 'progresso'] as const) for (const extensao of ['pdf', 'csv'] as const) {
      const m = prepararExportacao({ ...d, modo })
      expect(nomeArquivoCurriculo(m, extensao)).toBe(`planeja-ufca-${modo === 'original' ? 'estrutura-curricular' : 'meu-progresso'}-ciencia-da-computacao-AB001.${extensao}`)
    }
  })
})

describe('CSV tabular compatível com planilhas', () => {
  it.each(['original', 'progresso'] as const)('usa BOM UTF-8, separador ;, aspas e colunas consistentes (%s)', modo => {
    const m = exportacaoTeste(modo), csv = gerarCurriculoCsv(m)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(Array.from(new TextEncoder().encode(csv).slice(0, 3))).toEqual([239, 187, 191])
    const linhas = csv.slice(1).trimEnd().split('\r\n')
    expect(linhas).toHaveLength(7)
    const colunas = linhas[0].match(/"(?:[^"]|"")*"/g)!.length
    expect(linhas.every(l => l.match(/"(?:[^"]|"")*"/g)!.length === colunas)).toBe(true)
    for (const cabecalho of ['Código', 'Componente', 'Tipo', 'Período recomendado', 'Carga horária', 'Pré-requisitos', 'Correquisitos', 'Equivalências', 'Estrutura']) expect(linhas[0]).toContain(`"${cabecalho}"`)
    expect(csv).toContain('"Optativa"'); expect(csv).toContain('"ABC0005"')
    if (modo === 'progresso') {
      expect(linhas[0]).toContain('"Situação acadêmica"'); expect(csv).toContain('"Concluída"'); expect(csv).toContain('XYZ0001')
    } else { expect(csv).not.toContain('Situação acadêmica'); expect(csv).not.toContain('2026-10-01') }
  })
  it('preserva ponto e vírgula, aspas, acentos e quebras de linha dentro de campos', () => {
    const d = dadosCurriculoTeste(); d.estrutura.componentes[0].nome = 'Introdução; "Ciência"\r\nSegunda linha'
    const csv = gerarCurriculoCsv(prepararExportacao({ ...d, modo: 'original' }))
    expect(csv).toContain('"Introdução; ""Ciência""\nSegunda linha"')
  })
  it.each(['=1+1', '+SUM(1)', '-1+1', '@SUM(1)', '   =HYPERLINK("exemplo")', '\t=1+1', '\r=1+1', '\u0001=1+1'])('neutraliza fórmulas em campos textuais: %j', valor => {
    const m = exportacaoTeste(); m.linhas[0].componente = { ...m.linhas[0].componente, nome: valor }
    const linha = gerarCurriculoCsv(m).split('\r\n')[1]
    expect(linha).toContain(';"\'')
  })
})

describe('PDF completo, paginado e legível', () => {
  it.each(['original', 'progresso'] as const)('inclui períodos, optativas, componentes sem nível e nomes (%s)', modo => {
    const m = exportacaoTeste(modo), pdf = gerarCurriculoPdf(m), conteudo = pdf.output()
    for (const l of m.linhas) expect(conteudo).toContain(l.componente.codigo)
    expect(conteudo).toContain('Optativas'); expect(conteudo).toContain('Outros componentes obrigat')
    expect(conteudo).toContain('Planeja UFCA'); expect(conteudo).toContain('AB001')
    if (modo === 'original') { expect(conteudo).not.toContain('Histórico emitido'); expect(conteudo).not.toContain('Legenda das situa') }
    else {
      expect(conteudo).toContain('2026-10-01'); expect(conteudo).toContain('Legenda das situa'); expect(conteudo).toContain('50,0%')
      expect(conteudo).toContain('20,0%'); expect(conteudo).toContain('80,0%'); expect(conteudo).toContain('Situação:')
    }
  })
  it('pagina matriz grande e textos maiores que uma página sem perder o fim', () => {
    const d = dadosCurriculoTeste()
    d.estrutura.componentes.push(...Array.from({ length: 120 }, (_, i) => componente(`EXT${String(i).padStart(3, '0')}`, { nome: `Componente extenso ${i} `.repeat(8), nivel: i % 10 + 1, tipo: i > 80 ? 'optativa' : 'obrigatoria' })))
    d.estrutura.componentes[0].nome = 'Nome muito extenso com palavras '.repeat(1200) + 'FIM_DO_NOME'
    const m = prepararExportacao({ ...d, modo: 'progresso' }), pdf = gerarCurriculoPdf(m)
    expect(pdf.getNumberOfPages()).toBeGreaterThan(15)
    expect(pdf.output()).toContain('FIM_DO_NOME'); expect(pdf.output()).toContain('EXT119')
    const paginas = (pdf.internal.pages as unknown as string[][]).slice(1)
    paginas.forEach((p, i) => {
      const conteudo = p.join('\n')
      expect(conteudo).toContain('Planeja UFCA'); expect(conteudo).toContain(` ${i + 1} de ${pdf.getNumberOfPages()}`)
      expect(conteudo).toContain('AB001')
    })
  })
})
