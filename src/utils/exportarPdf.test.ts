import { describe, expect, it } from 'vitest'
import { gerarHorarioPdf } from './exportarPdf'
import { turmaTeste } from './turmaTeste'
import { gerarIdTurma } from '../features/horarios/selecao'

describe('PDF com salas', () => {
  it('gera grade e relação com os locais dos encontros, sem consultas externas', () => {
    const turma = turmaTeste({ sala: 'Texto geral' })
    turma.horarios[0].sala = 'SALA A'
    turma.horarios[1].sala = 'LAB B'
    const pdf = gerarHorarioPdf([turma], '2026.2', 'Curso')!
    expect(pdf.output()).toContain('Projeta UFCA')
    expect(pdf.output()).not.toContain('Seu Horario - UFCA')
    expect(pdf.getNumberOfPages()).toBe(2)
    const paginas = pdf.internal.pages as unknown as string[][]
    expect(paginas[1].join('\n')).toContain('Sala: SALA A')
    expect(paginas[1].join('\n')).toContain('Sala: LAB B')
    expect(paginas[2].join('\n')).toContain('Sala: SALA A')
    expect(paginas[2].join('\n')).toContain('Sala: LAB B')
    expect(pdf.output()).not.toContain('Texto geral')
  })

  it.each([undefined, null, ''])('exporta dados anteriores e sala indisponível %s', (sala) => {
    const pdf = gerarHorarioPdf([turmaTeste({ sala })], '2026.2', 'Curso')!
    expect(pdf.getNumberOfPages()).toBe(2)
    expect(pdf.output()).toContain('Sala: N')
    expect(pdf.output()).not.toContain('undefined')
    expect(pdf.output()).not.toContain('Sala: null')
  })

  it('pagina locais extensos sem descartar o fim do texto', () => {
    const sala = 'Laboratorio de materiais e ciencias '.repeat(600) + 'FIM_DO_LOCAL'
    const pdf = gerarHorarioPdf([
      turmaTeste({ sala, disciplina: 'Disciplina extensa '.repeat(25) }),
      turmaTeste({ codigo: 'CC0002', horarios: [], sala: 'Sala final' }),
    ], '2026.2', 'Curso')!
    expect(pdf.getNumberOfPages()).toBeGreaterThan(2)
    expect(pdf.output()).toContain('FIM_DO_LOCAL')
    expect(pdf.output()).toContain('Sala final')
    expect((pdf.internal.pages as unknown as string[][])[1].join('\n')).toContain('...')
  })

  it('inclui o local em blocos de meia hora e uma hora', () => {
    const turma = turmaTeste({ sala: 'A' })
    turma.horarios[0].fim = '14:30'
    turma.horarios[1].fim = '15:00'
    const pdf = gerarHorarioPdf([turma], '2026.2', 'Curso')!
    expect((pdf.internal.pages as unknown as string[][])[1].join('\n').match(/Sala: A/g)).toHaveLength(2)
  })

  it('não gera PDF sem seleção', () => {
    expect(gerarHorarioPdf([], '2026.2', 'Curso')).toBeNull()
  })

  it('exporta grade e relação de vários cursos com origens e procedência desconhecida', () => {
    const principal = turmaTeste({ sala: 'Sala P' })
    const externa = turmaTeste({ codigo: 'EM0010', disciplina: 'Algebra', sala: 'Lab externo' })
    const desconhecida = turmaTeste({ codigo: 'SEMORIGEM', horarios: [], sala: 'Sala final' })
    const procedencias = new Map([
      [gerarIdTurma(principal), [{ id: 'cc', nome: 'Computacao' }]],
      [gerarIdTurma(externa), [{ id: 'em', nome: 'Materiais' }, { id: 'adm', nome: 'Administracao' }]],
    ])
    const pdf = gerarHorarioPdf([principal, externa, desconhecida], '2026.2', 'Computacao', procedencias)!
    const grade = (pdf.internal.pages as unknown as string[][])[1].join('\n')
    expect(grade).toContain('CC0024'); expect(grade).toContain('EM0010')
    const texto = pdf.output()
    expect(texto).toContain('Curso de oferta: Materiais \\(em\\) / Administracao \\(adm\\)')
    expect(texto).toContain('Lab externo'); expect(texto).toContain('Sala final')
    expect(texto).toContain('SEMORIGEM')
    expect(texto).not.toContain('undefined')
    expect(texto).not.toContain('Curso de oferta: null')
  })

  it('pagina cursos associados extensos sem perder a última turma', () => {
    const turma = turmaTeste()
    const procedencias = new Map([[gerarIdTurma(turma), [{ id: 'origem', nome: 'Agrupamento publico '.repeat(800) + 'FIM_DOS_CURSOS' }]]])
    const pdf = gerarHorarioPdf([turma, turmaTeste({ codigo: 'ULTIMA', horarios: [] })], '2026.2', 'Curso', procedencias)!
    expect(pdf.getNumberOfPages()).toBeGreaterThan(2)
    expect(pdf.output()).toContain('FIM_DOS_CURSOS')
    expect(pdf.output()).toContain('ULTIMA')
  })
})
