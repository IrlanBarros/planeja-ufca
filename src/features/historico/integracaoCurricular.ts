import type { CursoIndiceCurriculo, EstruturaCurricular } from '../../types'
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
  const { curso } = identificarCurso(perfil, cursos)
  return { ...perfil, curso: { ...perfil.curso, idCurso: curso?.id ?? perfil.curso.idCurso } }
}

/** Um ID informado nunca é substituído por uma associação pelo nome. */
export function identificarCurso(perfil: HistoricoAcademico, cursos: CursoIndiceCurriculo[], confirmado: string | null = null) {
  if (perfil.curso.idCurso) return { curso: cursos.find(c => c.id === perfil.curso.idCurso), candidatos: [] }
  const candidatos = cursos.filter(c => normalizarCurso(c.nome) === normalizarCurso(perfil.curso.nome ?? ''))
  return { curso: candidatos.length === 1 ? candidatos[0] : candidatos.find(c => c.id === confirmado), candidatos }
}

export function identificarEstrutura(perfil: HistoricoAcademico, estruturas: EstruturaCurricular[], confirmado: string | null = null) {
  const candidatas = estruturas.filter(e => e.codigo === codigoEstruturaHistorico(perfil.curso.estruturaCurricular))
  return { estrutura: candidatas.length === 1 ? candidatas[0] : candidatas.find(e => e.id === confirmado), candidatas }
}

export function urlProgressoCurricular(cursoId: string, estruturaId: string) {
  return `/curriculo?${new URLSearchParams({ curso: cursoId, estrutura: estruturaId, modo: 'progresso' })}`
}
