import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { HistoricoAcademico } from '../models/types'
import { apagarPerfil, lerPerfil, salvarPerfil } from '../storage/indexedDb'
import { decodificarPerfil } from '../storage/schema'
import { HistoricoContext } from './context'

export default function HistoricoProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<HistoricoAcademico | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    let ativo = true
    lerPerfil().then(p => { if (ativo) { setPerfil(p); setSalvo(!!p) } }).catch(e => { if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível recuperar o perfil.') }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  async function confirmar(novo: HistoricoAcademico, persistir: boolean, substituir: boolean) {
    if (carregando) throw new Error('Aguarde a leitura dos dados locais.')
    if ((perfil || erro) && !substituir) throw new Error('Confirme a substituição dos dados acadêmicos anteriores.')
    const permitido = decodificarPerfil(novo)
    if (persistir) await salvarPerfil(permitido)
    // Ao substituir por um perfil temporário, o antigo persistido também deve sair.
    let preservado = false
    if (!persistir && salvo) await apagarPerfil()
    else if (!persistir && erro) {
      try { await apagarPerfil() }
      catch { preservado = true }
    }
    setPerfil(permitido); setSalvo(persistir)
    setErro(preservado ? 'Perfil temporário ativo. Dados locais anteriores estão inacessíveis e foram preservados; eles podem reaparecer após recarregar a página.' : null)
  }
  async function apagar() {
    try { if (salvo || erro) await apagarPerfil() }
    catch {
      setPerfil(null); setSalvo(false)
      const aviso = 'O perfil em memória foi apagado, mas não foi possível excluir os dados salvos. Tente novamente ou remova os dados deste site nas configurações do navegador.'
      setErro(aviso)
      throw new Error(aviso)
    }
    setPerfil(null); setSalvo(false); setErro(null)
  }
  return <HistoricoContext value={{ perfil, salvo, carregando, erro, confirmar, apagar }}>{children}</HistoricoContext>
}
