import type { ComponenteCurricular } from '../../../types'
import type { HorasOficiais } from '../../historico/models/types'
import type { AvaliacaoRegra, SituacaoCurricular } from '../../recomendacoes/models/types'

export type ModoCurriculo = 'original' | 'progresso'
export type EstadoVisual = 'concluida' | 'cursando' | 'disponivel' | 'bloqueada' | 'verificar'
export const ROTULOS_ESTADO: Record<EstadoVisual, string> = {
  concluida: 'Concluída', cursando: 'Cursando', disponivel: 'Disponível', bloqueada: 'Bloqueada', verificar: 'Situação a verificar',
}
export const EXPLICACOES_ESTADO: Record<EstadoVisual, string> = {
  concluida: 'Exigência cumprida, inclusive por equivalência reconhecida.',
  cursando: 'Matrícula registrada no período de referência; sem aprovação comprovada.',
  disponivel: 'Requisitos acadêmicos conhecidos satisfeitos; não confirma turma ou vaga.',
  bloqueada: 'Requisitos conhecidos pendentes, incluindo eventual matrícula conjunta.',
  verificar: 'Dados ausentes, antigos ou ambíguos precisam de confirmação.',
}
export interface SituacaoVisual {
  estado: EstadoVisual
  justificativa: string
  academica: SituacaoCurricular
  preRequisitos: AvaliacaoRegra
  coRequisitos: AvaliacaoRegra
}
export interface IndicadorProgresso extends HorasOficiais {
  chave: 'total' | 'obrigatorias' | 'optativas' | 'complementares'
  rotulo: string
  percentual: number | null
  aviso: string | null
}
export interface ProgressoCurricular {
  situacoes: Map<string, SituacaoVisual>
  indicadores: IndicadorProgresso[]
  avisos: string[]
}
/** Projeção explícita: não transporta perfil, tentativas ou identificadores pessoais. */
export interface LinhaExportacaoCurriculo {
  componente: ComponenteCurricular
  situacao?: { estado: EstadoVisual; rotulo: string; detalhes: string }
}
export interface ExportacaoCurriculo {
  modo: ModoCurriculo
  curso: { id: string; nome: string }
  estrutura: { id: string; codigo: string; ano: number }
  geradoEm: string
  emitidoEm: string | null
  periodoReferencia: string | null
  linhas: LinhaExportacaoCurriculo[]
  indicadores: IndicadorProgresso[]
  avisos: string[]
}
