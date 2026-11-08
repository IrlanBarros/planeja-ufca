import type { CursoIndiceCurriculo } from '../../types'
import { normalizar } from './parser/layout'
import type { HistoricoAcademico } from './models/types'

export function normalizarCurso(nome: string): string {
  return normalizar(nome)
    .replace(/\/[A-Z]{2,8}\s*-\s*(?:JUAZEIRO DO NORTE|CRATO|BARBALHA|BREJO SANTO|ICO)\b/g, '')
    .replace(/\s*-\s*(?:BACHARELADO|LICENCIATURA|PRESENCIAL|EAD|MTN|MT|TN|INTEGRAL|MATUTINO|VESPERTINO|NOTURNO)\b/g, '').replace(/\s+/g, ' ').trim()
}

/** O SIGAA pode acrescentar o ano de vigência ao código. Não é o ID interno. */
export function codigoEstruturaHistorico(valor: string | null): string | null {
  return valor?.trim().match(/^([A-Z]{2,12}\d{2,8})(?:\s*-\s*\d{4}\.[12])?$/)?.[1] ?? null
}
export function associarCurso(perfil: HistoricoAcademico, cursos: CursoIndiceCurriculo[]): HistoricoAcademico {
  const porId = cursos.find(c => c.id === perfil.curso.idCurso)
  const candidatos = cursos.filter(c => normalizarCurso(c.nome) === normalizarCurso(perfil.curso.nome ?? ''))
  const curso = porId ?? (candidatos.length === 1 ? candidatos[0] : null)
  return { ...perfil, curso: { ...perfil.curso, idCurso: curso?.id ?? null } }
}
