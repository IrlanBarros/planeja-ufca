import type { ComponenteCurricular } from '../../../types'
import type { Dependencias, SituacaoCurricular } from '../models/types'
import { avaliarCoRequisitos, avaliarPreRequisitos, codigosRegra } from './requisitos'

export function analisarDependencias(codigo: string, componentes: ComponenteCurricular[], situacoes: Map<string, SituacaoCurricular>): Dependencias {
  const pendentes = componentes.filter(c => !situacoes.get(c.codigo)?.cumprido && c.codigo !== codigo)
  const diretas = pendentes.filter(c => codigosRegra(c.pre_requisitos_regra).includes(codigo)).map(c => c.codigo)
  const visitados = new Set([codigo])
  const fila = [...diretas]
  for (let i = 0; i < fila.length; i++) {
    const atual = fila[i]
    if (visitados.has(atual)) continue
    visitados.add(atual)
    for (const c of pendentes) {
      if (!visitados.has(c.codigo) && codigosRegra(c.pre_requisitos_regra).includes(atual)) fila.push(c.codigo)
    }
  }
  const desbloqueios = pendentes.filter(c => {
    if (['indeterminado', 'matriculado'].includes(situacoes.get(c.codigo)?.estado ?? 'indeterminado')) return false
    return avaliarPreRequisitos(c, situacoes).estado !== 'satisfeito'
      && avaliarPreRequisitos(c, situacoes, new Set([codigo])).estado === 'satisfeito'
      && avaliarCoRequisitos(c, situacoes, new Set([codigo])).avaliacao.estado === 'satisfeito'
  }).map(c => c.codigo)
  return { diretas: [...new Set(diretas)].sort(), indiretas: [...visitados].filter(c => c !== codigo && !diretas.includes(c)).sort(), desbloqueios: desbloqueios.sort() }
}
