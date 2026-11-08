import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DadosCurriculoCurso, IndiceCurriculos } from '../../../types'
import type { HistoricoAcademico } from '../../historico/models/types'
import { identificarCurso, identificarEstrutura, urlProgressoCurricular } from '../../historico/integracaoCurricular'
import { carregarJsonPublico } from '../../../data/publicJson'

export default function AcessoProgressoCurricular({ perfil }: { perfil: HistoricoAcademico }) {
  const chave = JSON.stringify(perfil.curso)
  const [resultado, setResultado] = useState<{ chave: string; url?: string; erro?: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    async function carregar() {
      const json = carregarJsonPublico
      const indice = await json<IndiceCurriculos>('/data/curriculos/index.json')
      const { curso } = identificarCurso(perfil, indice.cursos)
      if (!curso?.disponivel || !curso.arquivo) throw new Error('Curso não identificado com segurança ou currículo indisponível.')
      const dados = await json<DadosCurriculoCurso>(`/data/curriculos/${curso.arquivo}`)
      const { estrutura } = identificarEstrutura(perfil, dados.estruturas)
      if (dados.curso_id !== curso.id || !estrutura) throw new Error('Matriz não identificada de forma única. Confira o código da estrutura no histórico.')
      return urlProgressoCurricular(curso.id, estrutura.id)
    }
    carregar().then(url => { if (!controller.signal.aborted) setResultado({ chave, url }) }).catch(e => {
      if (!controller.signal.aborted) setResultado({ chave, erro: e instanceof Error ? e.message : 'Confira o curso e a matriz no histórico.' })
    })
    return () => controller.abort()
  }, [chave, perfil])
  if (resultado?.chave !== chave) return <p role="status">Identificando sua estrutura curricular…</p>
  return resultado.url ? <p><Link to={resultado.url}>Visualizar meu progresso curricular</Link></p> : <p>Para visualizar seu progresso curricular, confirme o curso e a matriz nos dados do histórico. {resultado.erro}</p>
}
