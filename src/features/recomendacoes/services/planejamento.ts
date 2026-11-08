import type { EstruturaCurricular, Turma } from '../../../types'
import type { HistoricoAcademico } from '../../historico/models/types'
import type { PreferenciasPlanejamento, Recomendacao } from '../models/types'
import { gerarIdTurma, validarAdicao } from '../../horarios/selecao'
import { analisarSituacao } from './situacaoCurricular'
import { cargaDaTurma, duplicaExigencia, exigenciasParaCodigo } from './elegibilidade'
import { motivosIncompatibilidade } from './disponibilidade'
import { avaliarCoRequisitos } from './requisitos'

/** Validação acadêmica de uma inclusão explícita; nunca substitui escolhas existentes. */
export function validarInclusao(novas: Turma[], selecionadas: Turma[], perfil: HistoricoAcademico, estrutura: EstruturaCurricular, periodo: string, preferencias: PreferenciasPlanejamento, itens: Recomendacao[]): string | null {
  const erroHorario = validarAdicao(novas, selecionadas, periodo)
  if (erroHorario) return erroHorario
  const contexto = [...selecionadas]
  const situacoes = analisarSituacao(perfil, estrutura.componentes, periodo)
  const simultaneos = new Set([...selecionadas, ...novas].flatMap(t => [...exigenciasParaCodigo(t.codigo, estrutura.componentes)]))
  for (const turma of novas) {
    const item = itens.find(i => i.preRequisitos.estado === 'satisfeito'
      && !['indeterminado', 'matriculado'].includes(i.situacao.estado)
      && avaliarCoRequisitos(i.componente, situacoes, simultaneos).avaliacao.estado === 'satisfeito'
      && i.ofertas.some(o => o.confirmada && gerarIdTurma(o.turma) === gerarIdTurma(turma)))
    if (!item) return 'A inclusão depende de confirmação acadêmica ou matrícula conjunta no correquisito.'
    if (duplicaExigencia(turma, contexto, estrutura.componentes)) return 'Esta exigência já está contemplada por uma turma ou equivalente no horário.'
    const motivos = motivosIncompatibilidade(turma, preferencias, contexto)
    if (motivos.length) return motivos.join(' ')
    contexto.push(turma)
  }
  const cargas = contexto.map(t => cargaDaTurma(t, estrutura.componentes))
  if (cargas.includes(null)) return 'Confirme a carga horária das turmas selecionadas antes de incluir recomendações.'
  if (!Number.isFinite(preferencias.cargaHoraria) || cargas.reduce<number>((n, c) => n + (c ?? 0), 0) > preferencias.cargaHoraria) return 'A inclusão excede a carga horária pretendida. Revise suas preferências.'
  return null
}
