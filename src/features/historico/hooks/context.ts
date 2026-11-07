import { createContext, useContext } from 'react'
import type { HistoricoAcademico } from '../models/types'

export interface EstadoHistorico {
  perfil: HistoricoAcademico | null
  salvo: boolean
  carregando: boolean
  erro: string | null
  confirmar: (perfil: HistoricoAcademico, persistir: boolean, substituir: boolean) => Promise<void>
  apagar: () => Promise<void>
}
export const HistoricoContext = createContext<EstadoHistorico | null>(null)
export function useHistorico() {
  const value = useContext(HistoricoContext)
  if (!value) throw new Error('Provedor acadêmico indisponível.')
  return value
}
