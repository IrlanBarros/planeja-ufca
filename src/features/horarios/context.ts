import { createContext, useContext, useMemo } from 'react'
import type { Turma } from '../../types'
import { gerarIdTurma, gerarStorageKey, lerIdsHorario, validarAdicao } from './selecao'

interface EstadoHorarios {
  horarios: Record<string, string[]>
  alterar: (chave: string, iniciais: string[], operacao: (ids: string[]) => string[] | string) => string | null
}
export const HorariosContext = createContext<EstadoHorarios | null>(null)

export function useHorario(periodo: string, cursoId: string, oferta: Turma[]) {
  const contexto = useContext(HorariosContext)
  if (!contexto) throw new Error('Provedor de horários indisponível.')
  const chave = gerarStorageKey(periodo, cursoId)
  const salvos = useMemo(() => lerIdsHorario(chave), [chave])
  const ids = contexto.horarios[chave] ?? salvos
  const porId = new Map(oferta.map(t => [gerarIdTurma(t), t]))
  const selecionadas = ids.map(id => porId.get(id)).filter((t): t is Turma => !!t)
  function adicionar(novas: Turma[]) {
    return contexto!.alterar(chave, salvos, atuais => {
      const turmas = atuais.map(id => porId.get(id)).filter((t): t is Turma => !!t)
      const erro = validarAdicao(novas, turmas, periodo)
      return erro ?? [...atuais, ...novas.map(gerarIdTurma)]
    })
  }
  function remover(turma: Turma) {
    return contexto!.alterar(chave, salvos, atuais => atuais.filter(id => id !== gerarIdTurma(turma)))
  }
  return { selecionadas, adicionar, remover }
}
