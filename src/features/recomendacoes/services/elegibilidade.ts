import type { ComponenteCurricular, Turma } from '../../../types'
import type { HistoricoAcademico } from '../../historico/models/types'
import type { Recomendacao, SituacaoCurricular } from '../models/types'
import { equivalentesPermitidos } from './equivalencias'
import { avaliarCoRequisitos, avaliarPreRequisitos } from './requisitos'

export function elegibilidade(c: ComponenteCurricular, situacoes: Map<string, SituacaoCurricular>, simultaneos = new Set<string>()) {
  const preRequisitos = avaliarPreRequisitos(c, situacoes)
  const co = avaliarCoRequisitos(c, situacoes, simultaneos)
  return { preRequisitos, coRequisitos: co.avaliacao, correquisitosSimultaneos: co.alternativas }
}
export function exigenciasParaCodigo(codigo: string, componentes: ComponenteCurricular[], perfil: HistoricoAcademico): Set<string> {
  return new Set([codigo, ...componentes.filter(c => equivalentesPermitidos(c, perfil).includes(codigo)).map(c => c.codigo)])
}
export function duplicaExigencia(turma: Turma, selecionadas: Turma[], componentes: ComponenteCurricular[], perfil: HistoricoAcademico): boolean {
  const novas = exigenciasParaCodigo(turma.codigo, componentes, perfil)
  return selecionadas.some(t => [...exigenciasParaCodigo(t.codigo, componentes, perfil)].some(c => novas.has(c)))
}
export function cargaDaTurma(turma: Turma, componentes: ComponenteCurricular[], perfil: HistoricoAcademico): number | null {
  const direto = componentes.find(c => c.codigo === turma.codigo)
  if (direto) return direto.carga_horaria
  const cargas = new Set(componentes.filter(c => equivalentesPermitidos(c, perfil).includes(turma.codigo)).map(c => c.carga_horaria))
  return cargas.size === 1 ? [...cargas][0] : null
}
export function podePlanejar(item: Recomendacao) {
  return !item.situacao.cumprido && !['matriculado', 'indeterminado'].includes(item.situacao.estado)
    && item.preRequisitos.estado === 'satisfeito'
    && item.coRequisitos.estado !== 'indeterminado'
}
