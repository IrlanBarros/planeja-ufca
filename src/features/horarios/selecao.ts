import type { Turma } from '../../types'
import { encontrarConflitos } from '../../utils/conflitos'

// Os IDs permanecem estáveis, inclusive para turmas de outros cursos.
export function gerarIdTurma(turma: Turma) {
  return [turma.codigo, turma.turma, turma.docente, turma.horario_sigaa].join('|')
}
export function gerarStorageKey(periodo: string, cursoId: string) {
  return `projeta-ufca:${periodo}:${cursoId}:turmas`
}

export const PREFIXO_HORARIO = 'projeta-ufca:'
export const PREFIXO_HORARIO_LEGADO = 'seu-horario-ufca:'

export function validarIdsHorario(valor: unknown): string[] {
  if (!Array.isArray(valor) || valor.length > 5000 || !valor.every(id => typeof id === 'string' && id.length > 0 && id.length <= 4000)) {
    throw new Error('O horário salvo tem formato inválido. Os dados existentes foram preservados.')
  }
  return [...new Set(valor)]
}

export function lerIdsHorario(chave: string): string[] {
  try {
    const atual = localStorage.getItem(chave)
    // Até uma lista vazia na nova chave é uma escolha existente e tem prioridade.
    if (atual !== null) return validarIdsHorario(JSON.parse(atual))
    if (!chave.startsWith(PREFIXO_HORARIO)) return []
    const legado = localStorage.getItem(chave.replace(PREFIXO_HORARIO, PREFIXO_HORARIO_LEGADO))
    if (legado === null) return []
    const ids = validarIdsHorario(JSON.parse(legado))
    try { localStorage.setItem(chave, JSON.stringify(ids)) } catch { /* Recupera em memória. */ }
    return ids
  } catch { return [] }
}
export function validarAdicao(novas: Turma[], atuais: Turma[], periodo: string): string | null {
  const acumuladas = [...atuais]
  for (const turma of novas) {
    if (turma.periodo !== periodo) return 'A turma não pertence ao período consultado.'
    if (acumuladas.some(t => t.codigo === turma.codigo)) return `Já existe uma turma de ${turma.codigo} no horário. Remova-a antes de escolher outra.`
    const conflitos = encontrarConflitos(turma, acumuladas)
    if (conflitos.length) return conflitos.map(c => `Conflito com ${c.turma.codigo}, ${c.diaNome}, ${c.inicio}–${c.fim}.`).join(' ')
    acumuladas.push(turma)
  }
  return null
}
