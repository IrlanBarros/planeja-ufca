import { describe, expect, it } from 'vitest'
import { gerarHorarioPdf } from './exportarPdf'
import { turmaTeste } from './turmaTeste'

describe('PDF com salas', () => {
  it('gera grade e relação com os locais dos encontros, sem consultas externas', () => {
    const turma = turmaTeste({ sala: 'Texto geral' })
    turma.horarios[0].sala = 'SALA A'
    turma.horarios[1].sala = 'LAB B'
    const pdf = gerarHorarioPdf([turma], '2026.2', 'Curso')!
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
})
