import type { Turma } from '../../types'
import { encontrarConflitos } from '../../utils/conflitos'

// Contrato legado: não alterar os IDs nem as chaves dos horários existentes.
export function gerarIdTurma(turma: Turma) {
  return [turma.codigo, turma.turma, turma.docente, turma.horario_sigaa].join('|')
}
export function gerarStorageKey(periodo: string, cursoId: string) {
  return `seu-horario-ufca:${periodo}:${cursoId}:turmas`
}
export function lerIdsHorario(chave: string): string[] {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(chave) ?? '[]')
    return Array.isArray(valor) && valor.every(id => typeof id === 'string') ? [...new Set(valor)] : []
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
