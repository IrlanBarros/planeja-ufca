import type { ComponenteCurricular } from '../../../types'
import type { Dependencias, FatorPontuacao, PreferenciasPlanejamento, SituacaoCurricular } from '../models/types'

// Heurística da aplicação. Nenhum peso usa notas ou índices acadêmicos.
export const PESOS = {
  equilibrado: { obrigatoria: 80, desbloqueio: 25, direta: 5, indireta: 2, atraso: 4, oferta: 15, retomada: 6, compativel: 15, diaExistente: 2 },
  avanco: { obrigatoria: 110, desbloqueio: 40, direta: 7, indireta: 3, atraso: 6, oferta: 15, retomada: 6, compativel: 10, diaExistente: 0 },
  concentrar: { obrigatoria: 65, desbloqueio: 20, direta: 4, indireta: 1, atraso: 3, oferta: 15, retomada: 6, compativel: 20, diaExistente: 15 },
} as const
export const LIMITES_PRIORIDADE = { alta: 120, media: 65 } as const

export function pontuar(c: ComponenteCurricular, situacao: SituacaoCurricular, deps: Dependencias, preferencias: PreferenciasPlanejamento, nivelEstimado: number | null, ofertada: boolean, compativel: boolean, diasExistentes: number): FatorPontuacao[] {
  const p = PESOS[preferencias.estrategia]
  const fatores: FatorPontuacao[] = []
  const fator = (criterio: string, pontos: number, motivo: string) => { if (pontos) fatores.push({ criterio, pontos, motivo }) }
  fator('obrigatoriedade', c.tipo === 'obrigatoria' ? p.obrigatoria : 0, 'Exigência obrigatória ainda não cumprida.')
  fator('desbloqueio', deps.desbloqueios.length * p.desbloqueio, `${deps.desbloqueios.length} componente(s) ficariam com os requisitos acadêmicos conhecidos satisfeitos: ${deps.desbloqueios.join(', ')}.`)
  fator('dependentes-diretos', deps.diretas.length * p.direta, `${deps.diretas.length} dependente(s) direto(s): ${deps.diretas.join(', ')}. Outros requisitos podem continuar pendentes.`)
  fator('dependentes-indiretos', deps.indiretas.length * p.indireta, `${deps.indiretas.length} dependente(s) indireto(s), sem contar repetidos; não são desbloqueios imediatos.`)
  const atraso = nivelEstimado !== null && c.nivel !== null ? Math.max(0, nivelEstimado - c.nivel) : 0
  fator('periodo', atraso * p.atraso, `Nível ${c.nivel} anterior ao nível de planejamento estimado ${nivelEstimado}; estimativa pela entrada e oferta, sem descontar suspensões.`)
  fator('oferta', ofertada ? p.oferta : 0, 'Consta na oferta consultada; vagas em tempo real não são conhecidas.')
  fator('retomada', situacao.reprovacaoAnterior || situacao.trancamentoAnterior ? p.retomada : 0, 'Pendência já cursada anteriormente. Isso não estima capacidade ou aprovação.')
  fator('preferencias', compativel ? p.compativel : 0, 'Existe turma compatível com os dias, turnos e horário selecionado.')
  fator('concentracao', diasExistentes * p.diaExistente, `${diasExistentes} dia(s) de uma alternativa já aparecem no horário selecionado.`)
  return fatores
}
