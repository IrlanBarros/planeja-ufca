import type { ComponenteCurricular, RegraRequisito } from '../../../types'
import type { AvaliacaoRegra, SituacaoCurricular } from '../models/types'
import { alternativasSeguras } from './equivalencias'

export const indeterminado = (descricao: string): AvaliacaoRegra => ({ estado: 'indeterminado', descricao })
export const satisfeito = (descricao: string): AvaliacaoRegra => ({ estado: 'satisfeito', descricao })

function arvoreValida(regra: RegraRequisito | null, caminho = new Set<RegraRequisito>()): boolean {
  if (!regra || typeof regra !== 'object' || caminho.has(regra) || caminho.size > 100) return false
  if ('codigo' in regra) return typeof regra.codigo === 'string' && !!regra.codigo && !('operador' in regra)
  const proximo = new Set(caminho).add(regra)
  return ['E', 'OU'].includes(regra.operador) && arvoreValida(regra.esquerda, proximo) && arvoreValida(regra.direita, proximo)
}

export function codigosRegra(regra: RegraRequisito | null, vistos = new Set<RegraRequisito>()): string[] {
  if (!vistos.size && !arvoreValida(regra)) return []
  if (!regra || typeof regra !== 'object' || vistos.has(regra)) return []
  vistos.add(regra)
  if ('codigo' in regra) return typeof regra.codigo === 'string' && regra.codigo ? [regra.codigo] : []
  return [...new Set([...codigosRegra(regra.esquerda, vistos), ...codigosRegra(regra.direita, vistos)])]
}

export function avaliarRegra(regra: RegraRequisito | null, situacoes: Map<string, SituacaoCurricular>, simulados = new Set<string>(), caminho = new Set<RegraRequisito>()): AvaliacaoRegra {
  if (!caminho.size && !arvoreValida(regra)) return indeterminado('Árvore de requisitos ausente, inválida ou circular.')
  if (!regra || typeof regra !== 'object' || caminho.has(regra) || caminho.size > 100) return indeterminado('Árvore de requisitos ausente, inválida ou circular.')
  const proximo = new Set(caminho).add(regra)
  if ('codigo' in regra && typeof regra.codigo === 'string' && regra.codigo) {
    const s = situacoes.get(regra.codigo)
    const estado = simulados.has(regra.codigo) || s?.cumprido ? 'satisfeito' : !s || ['indeterminado', 'matriculado'].includes(s.estado) ? 'indeterminado' : 'nao-satisfeito'
    return { estado, codigo: regra.codigo, descricao: `${regra.codigo}: ${estado === 'satisfeito' ? 'cumprido' : estado === 'indeterminado' ? 'cumprimento não confirmado' : 'pendente'}` }
  }
  if (!('operador' in regra) || !['E', 'OU'].includes(regra.operador)) return indeterminado('Operador de requisito não reconhecido.')
  const partes = [avaliarRegra(regra.esquerda, situacoes, simulados, proximo), avaliarRegra(regra.direita, situacoes, simulados, proximo)]
  const estados = partes.map(p => p.estado)
  const estado = regra.operador === 'E'
    ? estados.includes('nao-satisfeito') ? 'nao-satisfeito' : estados.every(e => e === 'satisfeito') ? 'satisfeito' : 'indeterminado'
    : estados.includes('satisfeito') ? 'satisfeito' : estados.every(e => e === 'nao-satisfeito') ? 'nao-satisfeito' : 'indeterminado'
  return { estado, operador: regra.operador, partes, descricao: `(${partes[0].descricao}) ${regra.operador} (${partes[1].descricao})` }
}

export function avaliarPreRequisitos(c: ComponenteCurricular, situacoes: Map<string, SituacaoCurricular>, simulados = new Set<string>()): AvaliacaoRegra {
  if (!c.pre_requisitos_regra) return c.pre_requisitos_expressao || c.pre_requisitos_codigos.length ? indeterminado('Pré-requisito registrado sem árvore válida; confirme a regra institucional.') : satisfeito('Sem pré-requisitos registrados na matriz.')
  const folhas = codigosRegra(c.pre_requisitos_regra)
  if (c.pre_requisitos_codigos.some(codigo => !folhas.includes(codigo))) return indeterminado('A árvore não representa todos os códigos de pré-requisito registrados.')
  return avaliarRegra(c.pre_requisitos_regra, situacoes, simulados)
}

export function avaliarCoRequisitos(c: ComponenteCurricular, situacoes: Map<string, SituacaoCurricular>, simultaneos = new Set<string>()) {
  const alternativas = alternativasSeguras(c.co_requisitos_expressao, c.co_requisitos_codigos)
  if (!alternativas) return { avaliacao: indeterminado('Correquisito sem interpretação lógica segura; confirme a regra institucional.'), alternativas: [] as string[] }
  if (!alternativas.length) return { avaliacao: satisfeito('Sem correquisitos registrados na matriz.'), alternativas: [] as string[] }
  if (alternativas.some(codigo => situacoes.get(codigo)?.cumprido || situacoes.get(codigo)?.estado === 'matriculado' || simultaneos.has(codigo))) return { avaliacao: satisfeito(`Correquisito cumprido ou com matrícula concomitante no período/plano: ${alternativas.join(' OU ')}.`), alternativas: [] as string[] }
  if (alternativas.some(codigo => !situacoes.has(codigo) || ['indeterminado', 'matriculado'].includes(situacoes.get(codigo)!.estado))) return { avaliacao: indeterminado(`Confirme o cumprimento ou matrícula concomitante de ${alternativas.join(' OU ')}.`), alternativas: [] as string[] }
  return { avaliacao: { estado: 'nao-satisfeito' as const, descricao: `Exige matrícula conjunta em ${alternativas.join(' OU ')} ou aprovação anterior.` }, alternativas }
}
