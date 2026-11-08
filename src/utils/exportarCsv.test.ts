import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportarHorarioCsv } from './exportarCsv'
import { turmaTeste } from './turmaTeste'
import { gerarIdTurma } from '../features/horarios/selecao'

afterEach(() => vi.unstubAllGlobals())

function prepararDownload() {
  const link = { href: '', download: '', click: vi.fn() }
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:horario')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
  vi.stubGlobal('document', {
    createElement: vi.fn(() => link),
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
  })
  return { link, createObjectURL, revokeObjectURL }
}

describe('CSV com salas', () => {
  it('exporta uma sala por encontro e mantém BOM, separador, escape e nome', async () => {
    const { link, createObjectURL, revokeObjectURL } = prepararDownload()
    const turma = turmaTeste({ sala: 'Sala geral' })
    turma.horarios[0].sala = 'Lab; "Física" - Bloco B'
    turma.horarios[1].sala = 'Sala C'
    exportarHorarioCsv([turma], '2026.2', 'Ciência da Computação')
    const blob = createObjectURL.mock.calls[0][0] as Blob
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([239, 187, 191])
    const csv = await blob.text()
    const linhas = csv.split('\n')
    expect(linhas[0]).toBe('Código;Disciplina;Turma;Docente;Dia;Início;Fim;Horário SIGAA;Sala')
    expect(linhas[1]).toContain(';segunda-feira;14:00;16:00;24T46;"Lab; ""Física"" - Bloco B"')
    expect(linhas[2]).toContain(';quarta-feira;14:00;16:00;24T46;Sala C')
    expect(link.download).toBe('planeja-ufca-horario-ciencia-da-computacao-2026.2.csv')
    expect(link.click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:horario')
  })

  it('deixa sala vazia para JSON antigo, vazio, nulo e encontro sem local', async () => {
    const { createObjectURL } = prepararDownload()
    const turmas = [undefined, null, ''].map((sala) => turmaTeste({ sala }))
    const parcial = turmaTeste({ sala: 'Sala geral' })
    parcial.horarios.forEach((h) => { h.sala = null })
    exportarHorarioCsv([...turmas, parcial], '2026.2', 'Curso')
    const csv = await (createObjectURL.mock.calls[0][0] as Blob).text()
    expect(csv.split('\n').slice(1)).toHaveLength(8)
    expect(csv.split('\n').slice(1).every((linha) => linha.endsWith(';'))).toBe(true)
  })

  it('preserva a linha de turma sem horário e sua localização geral', async () => {
    const { createObjectURL } = prepararDownload()
    exportarHorarioCsv([turmaTeste({ horarios: [], sala: 'Sala A' })], '2026.2', 'Curso')
    const csv = await (createObjectURL.mock.calls[0][0] as Blob).text()
    expect(csv.split('\n')).toHaveLength(2)
    expect(csv).toContain(';;;;24T46;Sala A')
  })

  it('não baixa arquivos quando não há seleção', () => {
    const { createObjectURL } = prepararDownload()
    exportarHorarioCsv([], '2026.2', 'Curso')
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('acrescenta procedência confiável ao final, com turmas de vários cursos e escape', async () => {
    const { createObjectURL } = prepararDownload()
    const principal = turmaTeste({ sala: 'Sala P' })
    const externa = turmaTeste({ codigo: 'EM0010', horarios: [], sala: 'Lab externo' })
    const desconhecida = turmaTeste({ codigo: 'SEMORIGEM', horarios: [], sala: 'Sala desconhecida' })
    const procedencias = new Map([
      [gerarIdTurma(principal), [{ id: 'cc', nome: 'Computação' }]],
      [gerarIdTurma(externa), [{ id: 'em', nome: 'Materiais; "Integral"' }, { id: 'outro', nome: 'Outro agrupamento' }]],
    ])
    exportarHorarioCsv([principal, externa, desconhecida], '2026.2', 'Computação', procedencias)
    const blob = createObjectURL.mock.calls[0][0]
    expect([...new Uint8Array(await blob.arrayBuffer()).slice(0, 3)]).toEqual([239, 187, 191])
    const linhas = (await blob.text()).split('\n')
    expect(linhas).toHaveLength(5)
    expect(linhas[0]).toBe('Código;Disciplina;Turma;Docente;Dia;Início;Fim;Horário SIGAA;Sala;Curso de oferta')
    expect(linhas[1]).toContain(';segunda-feira;14:00;16:00;24T46;Sala P;Computação (cc)')
    expect(linhas[3]).toContain('EM0010;Redes de Computadores;01;')
    expect(linhas[3]).toContain(';Lab externo;"Materiais; ""Integral"" (em) / Outro agrupamento (outro)"')
    expect(linhas[4]).toContain(';Sala desconhecida;')
    expect(linhas.join('\n')).not.toContain('undefined')
  })
})
