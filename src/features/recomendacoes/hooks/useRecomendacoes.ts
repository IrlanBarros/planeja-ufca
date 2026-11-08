import { useEffect, useState } from 'react'
import type { CursoIndiceCurriculo, DadosCursos, DadosCurriculoCurso, EstruturaCurricular, IndiceCurriculos } from '../../../types'
import type { HistoricoAcademico } from '../../historico/models/types'
import { identificarCurso, identificarEstrutura } from '../../historico/integracaoCurricular'

export { identificarCurso } from '../../historico/integracaoCurricular'

interface DadosPlanejamento {
  oferta?: DadosCursos
  curso?: CursoIndiceCurriculo
  estrutura?: EstruturaCurricular
  cursosAmbiguos?: CursoIndiceCurriculo[]
  estruturasAmbiguas?: EstruturaCurricular[]
  erro?: string
}
export function useRecomendacoes(perfil: HistoricoAcademico, cursoConfirmado: string | null, estruturaConfirmada: string | null) {
  const chave = JSON.stringify([perfil.curso, cursoConfirmado, estruturaConfirmada])
  const [estado, setEstado] = useState<{ chave: string; dados: DadosPlanejamento } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    async function json<T>(url: string): Promise<T> {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error('Não foi possível consultar os dados públicos. Tente recarregar a página.')
      return response.json() as Promise<T>
    }
    async function carregar(): Promise<DadosPlanejamento> {
      const [indice, oferta] = await Promise.all([json<IndiceCurriculos>('/data/curriculos/index.json'), json<DadosCursos>('/data/cursos-atual.json')])
      const { curso, candidatos } = identificarCurso(perfil, indice.cursos, cursoConfirmado)
      if (!curso) return candidatos.length > 1
        ? { cursosAmbiguos: candidatos, erro: 'Há mais de um curso com o nome registrado. Confirme o curso para continuar.' }
        : { erro: 'Curso não identificado com segurança no catálogo. Confira a associação do curso na importação do histórico.' }
      if (!curso.disponivel || !curso.arquivo) return { curso, erro: 'A estrutura curricular deste curso não está disponível. Não é possível gerar recomendações personalizadas.' }
      const curriculo = await json<DadosCurriculoCurso>(`/data/curriculos/${curso.arquivo}`)
      if (curriculo.curso_id !== curso.id) return { erro: 'O arquivo curricular não corresponde ao ID do curso. Confirme os dados públicos.' }
      const { estrutura, candidatas: estruturas } = identificarEstrutura(perfil, curriculo.estruturas, estruturaConfirmada)
      if (!estrutura) return { curso, estruturasAmbiguas: estruturas.length > 1 ? estruturas : undefined, erro: estruturas.length > 1 ? 'Há estruturas com o mesmo código. Confirme o ID da matriz vinculada ao seu histórico.' : `A matriz ${perfil.curso.estruturaCurricular ?? '(não identificada)'} não foi encontrada. Confira o histórico; outra matriz não será escolhida automaticamente.` }
      return { curso, estrutura, oferta }
    }
    carregar().then(dados => { if (!controller.signal.aborted) setEstado({ chave, dados }) }).catch(() => { if (!controller.signal.aborted) setEstado({ chave, dados: { erro: 'Falha ao carregar a oferta ou os currículos públicos. Tente recarregar a página.' } }) })
    return () => controller.abort()
  }, [chave, perfil, cursoConfirmado, estruturaConfirmada])
  return estado?.chave === chave ? estado.dados : null
}
