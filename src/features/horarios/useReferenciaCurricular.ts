import { useEffect, useState } from 'react'
import type { DadosCurriculoCurso, IndiceCurriculos } from '../../types'
import { useHistorico } from '../historico/hooks/context'
import { resolverReferencia, type ReferenciaCurricular } from './referenciaCurricular'
import { carregarJsonPublico } from '../../data/publicJson'

export function useReferenciaCurricular(cursoId: string) {
  const { perfil, carregando: carregandoPerfil } = useHistorico()
  const [escolha, setEscolha] = useState<{ cursoId: string; id: string } | null>(null)
  const [estado, setEstado] = useState<{ cursoId: string; indice?: IndiceCurriculos; curriculo?: DadosCurriculoCurso; erro?: string } | null>(null)
  useEffect(() => {
    if (!cursoId) return
    const controller = new AbortController()
    const json = carregarJsonPublico
    async function carregar() {
      const indice = await json<IndiceCurriculos>('/data/curriculos/index.json')
      const curso = indice.cursos.find(c => c.id === cursoId)
      if (!curso?.disponivel || !curso.arquivo) return { cursoId, erro: 'Não foi possível consultar as equivalências deste curso porque sua estrutura curricular não está disponível nos dados atuais.' }
      const curriculo = await json<DadosCurriculoCurso>(`/data/curriculos/${curso.arquivo}`)
      return { cursoId, indice, curriculo }
    }
    carregar().then(dados => { if (!controller.signal.aborted) setEstado(dados) })
      .catch(() => { if (!controller.signal.aborted) setEstado({ cursoId, erro: 'Falha ao consultar as estruturas curriculares públicas. Tente recarregar a página.' }) })
    return () => controller.abort()
  }, [cursoId])
  const carregando = estado?.cursoId !== cursoId || carregandoPerfil
  const referencia: ReferenciaCurricular = !carregando && estado?.curriculo && estado.indice
    ? resolverReferencia(cursoId, estado.indice.cursos, estado.curriculo, perfil, escolha?.cursoId === cursoId ? escolha.id : null)
    : { opcoes: [], mensagem: carregando ? 'Consultando a estrutura curricular…' : estado?.erro ?? '' }
  return { ...referencia, carregando, escolher: (id: string) => setEscolha({ cursoId, id }) }
}
