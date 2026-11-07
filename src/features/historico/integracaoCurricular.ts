import type { CursoIndiceCurriculo } from '../../types'
import { normalizar } from './parser/layout'
import type { HistoricoAcademico } from './models/types'

export function normalizarCurso(nome: string): string {
  return normalizar(nome).replace(/\s*-\s*(?:BACHARELADO|LICENCIATURA|PRESENCIAL|EAD|MTN|MT|TN|INTEGRAL|MATUTINO|VESPERTINO|NOTURNO)\b/g, '').replace(/\s+/g, ' ').trim()
}
export function associarCurso(perfil: HistoricoAcademico, cursos: CursoIndiceCurriculo[]): HistoricoAcademico {
  const porId = cursos.find(c => c.id === perfil.curso.idCurso)
  const candidatos = cursos.filter(c => normalizarCurso(c.nome) === normalizarCurso(perfil.curso.nome ?? ''))
  const curso = porId ?? (candidatos.length === 1 ? candidatos[0] : null)
  return { ...perfil, curso: { ...perfil.curso, idCurso: curso?.id ?? null } }
}
