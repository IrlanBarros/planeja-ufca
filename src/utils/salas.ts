import type { Horario, Turma } from '../types'

export function obterSala(turma: Turma, horario?: Horario) {
  const sala = horario?.sala === undefined ? turma.sala : horario.sala
  return sala?.replace(/\s+/g, ' ').trim() || null
}

export function possuiSalasPorEncontro(turma: Turma) {
  return turma.horarios.some((horario) => horario.sala !== undefined)
}

export function descreverSalas(turma: Turma): string[] {
  if (!possuiSalasPorEncontro(turma)) {
    return [`Sala: ${obterSala(turma) ?? 'Não informada'}`]
  }

  return turma.horarios.map((horario) =>
    `${horario.dia_nome}, ${horario.inicio}–${horario.fim} — Sala: ${obterSala(turma, horario) ?? 'Não informada'}`,
  )
}
