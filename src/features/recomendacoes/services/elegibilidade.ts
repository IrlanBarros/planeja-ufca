import type { ComponenteCurricular, Turma } from '../../../types'
import type { Recomendacao, SituacaoCurricular } from '../models/types'
import { equivalentesCurriculares } from './equivalencias'
import { avaliarCoRequisitos, avaliarPreRequisitos } from './requisitos'

export function elegibilidade(c: ComponenteCurricular, situacoes: Map<string, SituacaoCurricular>, simultaneos = new Set<string>()) {
  const preRequisitos = avaliarPreRequisitos(c, situacoes)
  const co = avaliarCoRequisitos(c, situacoes, simultaneos)
  return { preRequisitos, coRequisitos: co.avaliacao, correquisitosSimultaneos: co.alternativas }
}
export function exigenciasParaCodigo(codigo: string, componentes: ComponenteCurricular[]): Set<string> {
  return new Set([codigo, ...componentes.filter(c => equivalentesCurriculares(c).includes(codigo)).map(c => c.codigo)])
}
export function duplicaExigencia(turma: Turma, selecionadas: Turma[], componentes: ComponenteCurricular[]): boolean {
  const novas = exigenciasParaCodigo(turma.codigo, componentes)
  return selecionadas.some(t => [...exigenciasParaCodigo(t.codigo, componentes)].some(c => novas.has(c)))
}
export function cargaDaTurma(turma: Turma, componentes: ComponenteCurricular[]): number | null {
  const direto = componentes.find(c => c.codigo === turma.codigo)
  if (direto) return Number.isFinite(direto.carga_horaria) && direto.carga_horaria > 0 ? direto.carga_horaria : null
  const cargas = new Set(componentes.filter(c => equivalentesCurriculares(c).includes(turma.codigo)).map(c => c.carga_horaria))
  const carga = cargas.size === 1 ? [...cargas][0] : null
  return carga !== null && Number.isFinite(carga) && carga > 0 ? carga : null
}
export function podePlanejar(item: Recomendacao) {
  return !item.situacao.cumprido && !['matriculado', 'indeterminado'].includes(item.situacao.estado)
    && item.preRequisitos.estado === 'satisfeito'
    && item.coRequisitos.estado !== 'indeterminado'
}
