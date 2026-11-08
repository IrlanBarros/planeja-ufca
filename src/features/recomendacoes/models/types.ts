import type { ComponenteCurricular, Turma } from '../../../types'
import type { TentativaComponente } from '../../historico/models/types'

export type EstadoRegra = 'satisfeito' | 'nao-satisfeito' | 'indeterminado'
export interface AvaliacaoRegra {
  estado: EstadoRegra
  descricao: string
  codigo?: string
  operador?: 'E' | 'OU'
  partes?: AvaliacaoRegra[]
}
export interface SituacaoCurricular {
  codigo: string
  estado: 'concluido' | 'equivalencia' | 'pendente' | 'matriculado' | 'reprovado' | 'trancado' | 'cancelado' | 'indeterminado'
  cumprido: boolean
  origem: string | null
  tentativas: TentativaComponente[]
  reprovacaoAnterior: boolean
  trancamentoAnterior: boolean
  advertencias: string[]
}
export type Turno = 'manha' | 'tarde' | 'noite'
export interface PreferenciasPlanejamento {
  cargaHoraria: number
  dias: number[]
  turnos: Turno[]
  estrategia: 'equilibrado' | 'avanco' | 'concentrar'
}
export const PREFERENCIAS_INICIAIS: PreferenciasPlanejamento = {
  cargaHoraria: 320, dias: [2, 3, 4, 5, 6, 7], turnos: ['manha', 'tarde', 'noite'], estrategia: 'equilibrado',
}
export interface OfertaComponente {
  turma: Turma
  cursoId: string
  cursoNome: string
  origem: 'matriz' | 'outro-agrupamento' | 'equivalente'
  confirmada: boolean
  compativel: boolean
  motivos: string[]
}
export type CategoriaRecomendacao = 'recomendadas' | 'menor-prioridade' | 'requisitos' | 'sem-oferta' | 'confirmacao'
export interface Dependencias {
  diretas: string[]
  indiretas: string[]
  desbloqueios: string[]
}
export interface FatorPontuacao { criterio: string; pontos: number; motivo: string }
export interface Recomendacao {
  componente: ComponenteCurricular
  situacao: SituacaoCurricular
  preRequisitos: AvaliacaoRegra
  coRequisitos: AvaliacaoRegra
  correquisitosSimultaneos: string[]
  dependencias: Dependencias
  ofertas: OfertaComponente[]
  pontuacao: number
  fatores: FatorPontuacao[]
  prioridade: 'Alta' | 'Média' | 'Baixa'
  categoria: CategoriaRecomendacao
  justificativas: string[]
  advertencias: string[]
  fontes: string[]
}
export interface ResultadoRecomendacoes {
  itens: Recomendacao[]
  plano: Turma[]
  cargaPlanejada: number
  avisos: string[]
  pendentes: number
  elegiveis: number
  ofertados: number
}
