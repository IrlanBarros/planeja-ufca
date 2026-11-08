import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { HorariosContext } from './context'

export default function HorariosProvider({ children }: { children: ReactNode }) {
  const [horarios, setHorarios] = useState<Record<string, string[]>>({})
  const atuais = useRef<Record<string, string[]>>({})
  function alterar(chave: string, iniciais: string[], operacao: (ids: string[]) => string[] | string) {
    const proximo = operacao(atuais.current[chave] ?? iniciais)
    if (typeof proximo === 'string') return proximo
    atuais.current = { ...atuais.current, [chave]: proximo }
    setHorarios(atuais.current)
    try { localStorage.setItem(chave, JSON.stringify(proximo)) }
    catch { /* O horário continua na sessão quando o armazenamento é bloqueado. */ }
    return null
  }
  return <HorariosContext value={{ horarios, alterar }}>{children}</HorariosContext>
}
