import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import GradeSemanal from '../components/GradeSemanal'
import SalasTurma from '../components/SalasTurma'
import { descreverSalas, obterSala } from './salas'
import { turmaTeste } from './turmaTeste'
import { encontrarConflitos } from './conflitos'

describe('salas na interface', () => {
  it.each([undefined, null, '', ' \n '])('aceita sala indisponível %s e dados antigos', (sala) => {
    const turma = turmaTeste({ sala })
    expect(obterSala(turma)).toBeNull()
    expect(renderToStaticMarkup(<SalasTurma turma={turma} />)).toContain('Sala: Não informada')
    expect(renderToStaticMarkup(<GradeSemanal turmas={[turma]} />)).toContain('Sala: Não informada')
  })

  it('mostra o local geral uma única vez nos cards e na lista selecionada', () => {
    const turma = turmaTeste({ sala: ' Laboratório\u00a0 de Física - Bloco B ' })
    expect(descreverSalas(turma)).toEqual(['Sala: Laboratório de Física - Bloco B'])
    const html = renderToStaticMarkup(<SalasTurma turma={turma} />)
    expect(html).toContain('Sala: Laboratório de Física - Bloco B')
    expect(html.match(/Sala:/g)).toHaveLength(1)
  })

  it('prioriza o encontro, sem herdar uma sala quando o local é explicitamente nulo', () => {
    const turma = turmaTeste({ sala: 'Texto geral do SIGAA' })
    turma.horarios[0].sala = 'Sala A'
    turma.horarios[1].sala = null
    expect(descreverSalas(turma)).toEqual([
      'segunda-feira, 14:00–16:00 — Sala: Sala A',
      'quarta-feira, 14:00–16:00 — Sala: Não informada',
    ])
    const html = renderToStaticMarkup(<GradeSemanal turmas={[turma]} />)
    expect(html).toContain('segunda-feira, 14:00–16:00. Sala: Sala A')
    expect(html).toContain('quarta-feira, 14:00–16:00. Sala: Não informada')
    expect(html).not.toContain('Texto geral do SIGAA')
    expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(2)
    expect(html).toContain('<dialog')
  })

  it('aceita um encontro e protege nomes extensos e marcação HTML', () => {
    const turma = turmaTeste()
    turma.horarios = [turma.horarios[0]]
    turma.sala = 'Laboratório '.repeat(50) + '<script>alert(1)</script>'
    const html = renderToStaticMarkup(<SalasTurma turma={turma} />)
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(descreverSalas(turma)[0]).toContain(turma.sala)
  })

  it('salas diferentes não mudam o resultado dos conflitos', () => {
    const antiga = turmaTeste()
    const nova = turmaTeste({ codigo: 'CC0002', sala: 'Sala B' })
    nova.horarios[0].sala = 'Laboratório C'
    const antes = encontrarConflitos(nova, [antiga])
    antiga.sala = 'Sala A'
    expect(encontrarConflitos(nova, [antiga])).toEqual(antes)
    expect(antes).toHaveLength(2)
  })
})
