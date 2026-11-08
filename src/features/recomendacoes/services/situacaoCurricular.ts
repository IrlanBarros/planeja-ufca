import type { ComponenteCurricular } from '../../../types'
import type { HistoricoAcademico } from '../../historico/models/types'
import type { SituacaoCurricular } from '../models/types'
import { CONCLUSOES, cumprimentos, equivalentesPermitidos } from './equivalencias'
import { documentoDesatualizado } from '../../historico/validation/profile'

const REPROVACOES = new Set(['REP', 'REPF', 'REPMF', 'REPN', 'REPNF'])
export function analisarSituacao(perfil: HistoricoAcademico, componentes: ComponenteCurricular[], periodo: string, agora = new Date()): Map<string, SituacaoCurricular> {
  const conclusoes = cumprimentos(perfil, componentes)
  const resultado = new Map<string, SituacaoCurricular>()
  const codigos = new Set([...componentes.map(c => c.codigo), ...perfil.componentesCursados.map(t => t.codigo), ...conclusoes.keys()])
  for (const codigo of codigos) {
    const c = componentes.find(c => c.codigo === codigo)
    const equivalentes = c ? equivalentesPermitidos(c, perfil) : []
    const tentativas = perfil.componentesCursados.filter(t => t.codigo === codigo || equivalentes.includes(t.codigo))
    const origem = conclusoes.get(codigo) ?? null
    const direto = perfil.componentesCursados.some(t => t.codigo === codigo && t.situacao && CONCLUSOES[t.situacao])
    const reprovacaoAnterior = tentativas.some(t => REPROVACOES.has(t.situacao ?? ''))
    const trancamentoAnterior = tentativas.some(t => t.situacao === 'TRANC')
    const matriculas = tentativas.filter(t => t.situacao === 'MATR')
    const pendente = perfil.componentesPendentes.find(c => c.codigo === codigo)
    const advertencias: string[] = []
    let estado: SituacaoCurricular['estado'] = origem ? direto ? 'concluido' : 'equivalencia' : 'pendente'
    if (!origem) {
      const equivalenciaAmbigua = c && c.equivalencias_codigos.some(codigo => perfil.componentesCursados.some(t => t.codigo === codigo && t.situacao && CONCLUSOES[t.situacao]))
      if (!perfil.componentesCursados.length || tentativas.some(t => !t.situacao || (!CONCLUSOES[t.situacao] && !REPROVACOES.has(t.situacao) && !['TRANC', 'CANC', 'MATR'].includes(t.situacao))) || equivalenciaAmbigua) {
        estado = 'indeterminado'
        advertencias.push('Situação ou equivalência insuficiente para comprovar o cumprimento; confirme os registros acadêmicos.')
      } else if (matriculas.length) {
        const emissao = perfil.emitidoEm ? new Date(`${perfil.emitidoEm}T12:00:00`) : null
        const referenciaValida = /^\d{4}\.[12]$/.test(periodo)
        const fimDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59)
        const documentoAtual = emissao && Number.isFinite(emissao.getTime()) && emissao <= fimDoDia && !documentoDesatualizado(perfil.emitidoEm, agora)
        const periodoEmissao = emissao ? `${emissao.getFullYear()}.${emissao.getMonth() >= 6 ? 2 : 1}` : null
        estado = referenciaValida && documentoAtual && periodo === periodoEmissao && matriculas.every(t => t.periodo === periodo) ? 'matriculado' : 'indeterminado'
        advertencias.push(estado === 'matriculado' ? 'Matrícula no período consultado; não comprova aprovação.' : 'Matrícula antiga, sem referência temporal ou em documento sem atualidade confirmada: confirme o resultado em um histórico atualizado. Não foi presumida aprovação.')
      } else if (pendente?.observacao?.toLowerCase().includes('matriculad')) {
        estado = 'indeterminado'
        advertencias.push('O histórico indica matrícula nesta exigência, mas o resultado não está confirmado.')
      } else if (reprovacaoAnterior) estado = 'reprovado'
      else if (trancamentoAnterior) estado = 'trancado'
      else if (tentativas.some(t => t.situacao === 'CANC')) estado = 'cancelado'
    }
    if (origem && pendente) {
      estado = 'indeterminado'
      advertencias.push('O histórico apresenta cumprimento e pendência para o mesmo código. Confirme a exigência antes de planejar.')
    }
    resultado.set(codigo, { codigo, estado, cumprido: !!origem && estado !== 'indeterminado', origem, tentativas, reprovacaoAnterior, trancamentoAnterior, advertencias })
  }
  return resultado
}
