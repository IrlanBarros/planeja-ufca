import type { EstruturaCurricular } from '../../../types'
import type { HistoricoAcademico, HorasOficiais } from '../../historico/models/types'
import { codigoEstruturaHistorico } from '../../historico/integracaoCurricular'
import { documentoDesatualizado } from '../../historico/validation/profile'
import { analisarSituacao } from '../../recomendacoes/services/situacaoCurricular'
import { elegibilidade } from '../../recomendacoes/services/elegibilidade'
import type { EstadoVisual, IndicadorProgresso, ProgressoCurricular, SituacaoVisual } from '../models/types'

const CATEGORIAS = [['total', 'Progresso geral'], ['obrigatorias', 'Obrigatórias'], ['optativas', 'Optativas'], ['complementares', 'Complementares']] as const

export function indicadorHoras(chave: IndicadorProgresso['chave'], rotulo: string, horas: HorasOficiais): IndicadorProgresso {
  const { exigida, integralizada, pendente } = horas
  const presentes = [exigida, integralizada, pendente].filter(v => v !== null)
  const invalidos = presentes.some(v => !Number.isFinite(v) || v < 0)
  const completos = exigida !== null && integralizada !== null && pendente !== null
  const inconsistente = invalidos || (completos && (integralizada > exigida || Math.abs(integralizada + pendente - exigida) > 0.01))
  const aviso = inconsistente ? 'Carga horária oficial inconsistente. Confira a tabela do histórico.' : !completos ? 'Carga horária oficial incompleta.' : exigida === 0 ? 'Sem carga horária exigida nesta categoria.' : null
  return {
    chave, rotulo,
    exigida: invalidos ? null : exigida, integralizada: invalidos ? null : integralizada, pendente: invalidos ? null : pendente,
    percentual: completos && !inconsistente && exigida > 0 ? integralizada / exigida * 100 : null,
    aviso,
  }
}

export function calcularProgresso(perfil: HistoricoAcademico, estrutura: EstruturaCurricular, cursoId: string, periodoReferencia: string | null, agora = new Date()): ProgressoCurricular {
  if (perfil.curso.idCurso !== cursoId || codigoEstruturaHistorico(perfil.curso.estruturaCurricular) !== estrutura.codigo) {
    throw new Error('Curso ou matriz incompatível com o histórico. O progresso não pode ser aplicado.')
  }
  const componentes = [...new Map(estrutura.componentes.map(c => [c.codigo, c])).values()]
  const academicas = analisarSituacao(perfil, componentes, periodoReferencia ?? '', agora)
  const situacoes = new Map<string, SituacaoVisual>()
  for (const componente of componentes) {
    const academica = academicas.get(componente.codigo)!
    const { preRequisitos, coRequisitos } = elegibilidade(componente, academicas)
    let estado: EstadoVisual
    let justificativa: string
    if (academica.cumprido) {
      estado = 'concluida'; justificativa = `Exigência cumprida: ${academica.origem}.`
    } else if (academica.estado === 'matriculado') {
      estado = 'cursando'; justificativa = `Matrícula registrada para ${periodoReferencia}, referência da oferta pública. Não comprova aprovação.`
    } else if (academica.estado === 'indeterminado') {
      estado = 'verificar'; justificativa = academica.advertencias.join(' ')
    } else if (preRequisitos.estado === 'indeterminado' || coRequisitos.estado === 'indeterminado') {
      estado = 'verificar'; justificativa = [preRequisitos, coRequisitos].filter(r => r.estado === 'indeterminado').map(r => r.descricao).join(' ')
    } else if (preRequisitos.estado === 'nao-satisfeito' || coRequisitos.estado === 'nao-satisfeito') {
      estado = 'bloqueada'; justificativa = [preRequisitos, coRequisitos].filter(r => r.estado === 'nao-satisfeito').map(r => r.descricao).join(' ')
    } else {
      estado = 'disponivel'; justificativa = 'Requisitos acadêmicos conhecidos satisfeitos. A existência de turma e vagas precisa ser consultada separadamente.'
    }
    situacoes.set(componente.codigo, { estado, justificativa, academica, preRequisitos, coRequisitos })
  }
  const indicadores = CATEGORIAS.map(([chave, rotulo]) => indicadorHoras(chave, rotulo, perfil.cargaHoraria[chave]))
  const avisos: string[] = []
  if (documentoDesatualizado(perfil.emitidoEm, agora) || [...academicas.values()].some(s => s.advertencias.some(a => a.startsWith('Matrícula antiga')))) {
    avisos.push('Seu histórico pode estar desatualizado. Algumas situações acadêmicas precisam de confirmação.')
  }
  if (!perfil.emitidoEm) avisos.push('Data de emissão do histórico indisponível. A atualidade das matrículas não pode ser confirmada.')
  if (!periodoReferencia) avisos.push('Período da oferta pública indisponível. Matrículas não serão apresentadas como cursando.')
  if (perfil.validacao.advertencias.length || perfil.validacao.camposNaoReconhecidos.length) avisos.push('A importação contém informações incompletas ou advertências. Confira os registros na página do histórico.')
  if (perfil.correcoes.length) avisos.push('O perfil contém correções manuais. São utilizados os dados conferidos pelo estudante.')
  const codigos = new Set(componentes.map(c => c.codigo))
  if (perfil.componentesCursados.some(t => !codigos.has(t.codigo)) || perfil.componentesPendentes.some(c => !codigos.has(c.codigo))) {
    avisos.push('Há componentes no histórico fora desta matriz. Eles não foram acrescentados nem associados por semelhança; a carga horária oficial foi preservada.')
  }
  if (componentes.length !== estrutura.componentes.length) avisos.push('Códigos repetidos na matriz foram contabilizados uma única vez. Confira os dados públicos.')
  const categorias = indicadores.slice(1)
  if (indicadores.every(i => !i.aviso) && (['exigida', 'integralizada', 'pendente'] as const).some(campo => Math.abs(categorias.reduce((n, i) => n + i[campo]!, 0) - indicadores[0][campo]!) > 0.01)) {
    indicadores[0] = { ...indicadores[0], percentual: null, aviso: 'O total oficial diverge da soma das categorias. Confirme a carga horária.' }
  }
  avisos.push(...indicadores.filter(i => i.aviso && i.percentual === null).map(i => `${i.rotulo}: ${i.aviso}`))
  avisos.push('A integralização da carga horária não garante o cumprimento de todas as exigências institucionais. Consulte a validação curricular oficial da UFCA.')
  return { situacoes, indicadores, avisos }
}
