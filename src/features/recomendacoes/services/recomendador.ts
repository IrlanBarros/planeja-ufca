import type { DadosCursos, EstruturaCurricular, Turma } from '../../../types'
import type { HistoricoAcademico } from '../../historico/models/types'
import type { PreferenciasPlanejamento, Recomendacao, ResultadoRecomendacoes } from '../models/types'
import { documentoDesatualizado } from '../../historico/validation/profile'
import { codigoEstruturaHistorico } from '../../historico/integracaoCurricular'
import { analisarSituacao } from './situacaoCurricular'
import { analisarDependencias } from './dependencias'
import { localizarOfertas, motivosIncompatibilidade } from './disponibilidade'
import { cargaDaTurma, duplicaExigencia, elegibilidade, exigenciasParaCodigo, podePlanejar } from './elegibilidade'
import { LIMITES_PRIORIDADE, pontuar } from './pontuacao'
import { avaliarCoRequisitos } from './requisitos'

function indicePeriodo(periodo: string | null) {
  const m = /^(\d{4})\.([12])$/.exec(periodo ?? '')
  return m ? Number(m[1]) * 2 + Number(m[2]) : null
}

export function gerarRecomendacoes({ perfil, estrutura, oferta, cursoId, preferencias, selecionadas = [], agora }: {
  perfil: HistoricoAcademico; estrutura: EstruturaCurricular; oferta: DadosCursos; cursoId: string
  preferencias: PreferenciasPlanejamento; selecionadas?: Turma[]; agora: Date
}): ResultadoRecomendacoes {
  const componentes = [...new Map(estrutura.componentes.map(c => [c.codigo, c])).values()]
  const situacoes = analisarSituacao(perfil, componentes, oferta.periodo, agora)
  const avisos = [...perfil.validacao.advertencias, ...perfil.validacao.camposNaoReconhecidos]
  if (estrutura.codigo !== codigoEstruturaHistorico(perfil.curso.estruturaCurricular) || cursoId !== perfil.curso.idCurso) {
    return { itens: [], plano: [], cargaPlanejada: 0, avisos: ['Curso ou código da estrutura não corresponde ao perfil confirmado.'], pendentes: 0, elegiveis: 0, ofertados: 0 }
  }
  if (documentoDesatualizado(perfil.emitidoEm, agora) || perfil.componentesCursados.some(t => t.situacao === 'MATR' && t.periodo !== oferta.periodo)) avisos.push('Histórico potencialmente desatualizado. As situações refletem a data do documento; atualize matrículas antigas antes de planejar componentes afetados.')
  if (!perfil.emitidoEm) avisos.push('Data de emissão não identificada: confirme a atualidade dos dados acadêmicos.')
  if (perfil.correcoes.length) avisos.push('Este perfil contém correções manuais. As recomendações usam os valores conferidos pelo estudante.')
  const pendenciasExternas = [...new Set(perfil.componentesPendentes.map(c => c.codigo))].filter(codigo => !componentes.some(c => c.codigo === codigo))
  if (pendenciasExternas.length) avisos.push(`Exigências do histórico fora da matriz disponível: ${pendenciasExternas.join(', ')}. Não são recomendações de disciplinas; consulte a coordenação.`)
  const entrada = indicePeriodo(perfil.vinculo.periodoIngresso), atual = indicePeriodo(oferta.periodo)
  const nivelEstimado = entrada !== null && atual !== null && atual >= entrada ? atual - entrada + 1 : null
  const diasSelecionados = new Set(selecionadas.flatMap(t => t.horarios.map(h => h.dia)))
  const simultaneosSelecionados = new Set(selecionadas.flatMap(t => [...exigenciasParaCodigo(t.codigo, componentes)]))
  const itens: Recomendacao[] = componentes.filter(c => !situacoes.get(c.codigo)!.cumprido && (c.tipo === 'obrigatoria' || perfil.cargaHoraria.optativas.pendente !== 0)).map(c => {
    const situacao = situacoes.get(c.codigo)!
    const requisitos = elegibilidade(c, situacoes, simultaneosSelecionados)
    const dependencias = analisarDependencias(c.codigo, componentes, situacoes)
    const ofertas = localizarOfertas(c, perfil, oferta, cursoId, preferencias, selecionadas).map(o => {
      if (duplicaExigencia(o.turma, selecionadas, componentes) && !o.motivos.some(m => m.includes('já está'))) return { ...o, compativel: false, motivos: [...o.motivos, 'O horário já contempla esta exigência por um componente equivalente.'] }
      return o
    })
    const confirmadas = ofertas.filter(o => o.confirmada)
    const compativeis = ofertas.filter(o => o.compativel)
    const fatores = pontuar(c, situacao, dependencias, preferencias, nivelEstimado, !!confirmadas.length, !!compativeis.length, Math.max(0, ...compativeis.map(o => new Set(o.turma.horarios.filter(h => diasSelecionados.has(h.dia)).map(h => h.dia)).size)))
    const pontuacao = fatores.reduce((n, f) => n + f.pontos, 0)
    const categoria = ['indeterminado', 'matriculado'].includes(situacao.estado) || requisitos.preRequisitos.estado === 'indeterminado' || requisitos.coRequisitos.estado === 'indeterminado' ? 'confirmacao'
      : requisitos.preRequisitos.estado !== 'satisfeito' || requisitos.coRequisitos.estado !== 'satisfeito' ? 'requisitos'
      : !confirmadas.length ? ofertas.length ? 'confirmacao' : 'sem-oferta' : 'menor-prioridade'
    return {
      componente: c, situacao, ...requisitos, dependencias, ofertas, pontuacao, fatores,
      prioridade: pontuacao >= LIMITES_PRIORIDADE.alta ? 'Alta' : pontuacao >= LIMITES_PRIORIDADE.media ? 'Média' : 'Baixa', categoria,
      justificativas: [...fatores.map(f => f.motivo), `Pré-requisitos: ${requisitos.preRequisitos.descricao}`, `Correquisitos: ${requisitos.coRequisitos.descricao}`],
      advertencias: [...situacao.advertencias, ...(ofertas.length && !compativeis.length ? ['Nenhuma alternativa compatível com as preferências e o horário atual.'] : [])],
      fontes: [`Histórico emitido em ${perfil.emitidoEm ?? 'data desconhecida'}`, `Matriz ${estrutura.codigo} (ID ${estrutura.id})`, `Oferta pública ${oferta.periodo}`],
    }
  })
  itens.sort((a, b) => b.pontuacao - a.pontuacao || (a.componente.nivel ?? Infinity) - (b.componente.nivel ?? Infinity) || a.componente.codigo.localeCompare(b.componente.codigo))
  const plano: Turma[] = []
  const componentesPlanejados = new Set<string>()
  const cargas = selecionadas.map(t => cargaDaTurma(t, componentes))
  let cargaPlanejada = cargas.reduce<number>((n, c) => n + (c ?? 0), 0)
  if (cargas.includes(null)) avisos.push('Carga horária de uma turma selecionada não identificada na matriz. O plano automático depende dessa confirmação.')
  if (!Number.isFinite(preferencias.cargaHoraria) || preferencias.cargaHoraria < 0) avisos.push('Informe uma carga horária pretendida válida.')

  // Busca gulosa limitada por componente. Reavalia todos os horários alternativos,
  // sem promover disciplinas do mesmo plano a pré-requisitos já aprovados.
  function montarGrupo(item: Recomendacao, base: Turma[], caminho = new Set<string>()): { turmas: Turma[]; componentes: string[] } | null {
    if (caminho.has(item.componente.codigo)) return { turmas: [], componentes: [] } // correquisitos recíprocos no mesmo pacote
    if (!podePlanejar(item)) return null
    const proximos = new Set(caminho).add(item.componente.codigo)
    const dias = new Set(base.flatMap(t => t.horarios.map(h => h.dia)))
    const alternativas = [...item.ofertas].sort((a, b) => preferencias.estrategia === 'concentrar' ? new Set(a.turma.horarios.filter(h => !dias.has(h.dia)).map(h => h.dia)).size - new Set(b.turma.horarios.filter(h => !dias.has(h.dia)).map(h => h.dia)).size : 0)
    for (const o of alternativas) {
      if (!o.confirmada || motivosIncompatibilidade(o.turma, preferencias, base).length || duplicaExigencia(o.turma, base, componentes)) continue
      let pacote = [o.turma]
      const codigosPacote = [item.componente.codigo]
      const simultaneos = new Set([...base, ...pacote].flatMap(t => [...exigenciasParaCodigo(t.codigo, componentes)]))
      if (avaliarCoRequisitos(item.componente, situacoes, simultaneos).avaliacao.estado !== 'satisfeito') {
        let conjunto: ReturnType<typeof montarGrupo> = null
        for (const codigo of item.correquisitosSimultaneos) {
          const co = itens.find(i => i.componente.codigo === codigo)
          if (co) conjunto = montarGrupo(co, [...base, ...pacote], proximos)
          if (conjunto) break
        }
        if (!conjunto) continue
        pacote = [...pacote, ...conjunto.turmas]
        codigosPacote.push(...conjunto.componentes)
      }
      const ch = pacote.reduce((n, t) => n + (cargaDaTurma(t, componentes) ?? Infinity), 0)
      const chBase = base.reduce((n, t) => n + (cargaDaTurma(t, componentes) ?? Infinity), 0)
      if (ch + chBase <= preferencias.cargaHoraria) return { turmas: pacote, componentes: codigosPacote }
    }
    return null
  }
  if (!cargas.includes(null) && Number.isFinite(preferencias.cargaHoraria)) for (const item of itens) {
    if (componentesPlanejados.has(item.componente.codigo)) continue
    const grupo = montarGrupo(item, [...selecionadas, ...plano])
    if (!grupo) continue
    plano.push(...grupo.turmas)
    grupo.componentes.forEach(codigo => componentesPlanejados.add(codigo))
    cargaPlanejada += grupo.turmas.reduce((n, t) => n + (cargaDaTurma(t, componentes) ?? 0), 0)
  }
  for (const item of itens) {
    if (componentesPlanejados.has(item.componente.codigo)) {
      item.categoria = 'recomendadas'
      if (item.coRequisitos.estado !== 'satisfeito') item.advertencias.push('Recomendada somente com matrícula conjunta no correquisito indicado no plano. Adicione o conjunto completo.')
    } else if (podePlanejar(item) && item.ofertas.some(o => o.compativel) && item.categoria !== 'sem-oferta') {
      item.advertencias.push('Fora do conjunto sugerido por carga horária, conflito entre sugestões ou necessidade de correquisito. Você pode revisar as alternativas.')
    }
  }
  return { itens, plano, cargaPlanejada, avisos: [...new Set(avisos)],
    pendentes: itens.filter(i => i.componente.tipo === 'obrigatoria').length,
    elegiveis: itens.filter(i => podePlanejar(i) && i.coRequisitos.estado === 'satisfeito').length,
    ofertados: itens.filter(i => i.ofertas.some(o => o.confirmada)).length }
}
