import type { CursoIndiceCurriculo, DadosCurriculoCurso, EstruturaCurricular } from '../../types'
import type { HistoricoAcademico } from '../historico/models/types'
import { identificarCurso, identificarEstrutura } from '../historico/integracaoCurricular'

export function resolverReferencia(cursoId: string, cursos: CursoIndiceCurriculo[], curriculo: DadosCurriculoCurso, perfil: HistoricoAcademico | null, escolhida: string | null) {
  if (curriculo.curso_id !== cursoId) return { opcoes: [], mensagem: 'O arquivo curricular não corresponde ao curso selecionado.' }
  const perfilDoCurso = perfil && identificarCurso(perfil, cursos).curso?.id === cursoId ? perfil : null
  const ordenadas = [...curriculo.estruturas].sort((a, b) => b.ano_criacao - a.ano_criacao || a.id.localeCompare(b.id))
  if (perfilDoCurso) {
    const { estrutura, candidatas } = identificarEstrutura(perfilDoCurso, ordenadas, escolhida)
    return {
      estrutura, opcoes: candidatas, perfilCompativel: estrutura ? perfilDoCurso : undefined,
      mensagem: estrutura ? 'Matriz vinculada ao histórico importado. Cumprimentos refletem somente esse histórico.'
        : candidatas.length ? 'Confirme o ID da matriz do histórico: há versões com o mesmo código.'
          : `A matriz ${perfilDoCurso.curso.estruturaCurricular ?? '(não identificada)'} do histórico não foi encontrada. Confira o histórico; nenhuma outra matriz será usada.`,
    }
  }
  const estrutura = ordenadas.find(e => e.id === escolhida) ?? ordenadas[0]
  return {
    estrutura, opcoes: ordenadas, perfilCompativel: undefined,
    mensagem: estrutura ? `${escolhida === estrutura.id ? 'Estrutura escolhida para consulta pública.' : 'Sugestão inicial: estrutura pública mais recente.'} Confirme a matriz do seu vínculo; você pode alterar a referência abaixo.`
      : 'Não foi possível consultar as equivalências deste curso porque sua estrutura curricular não está disponível nos dados atuais.',
  }
}

export interface ReferenciaCurricular {
  estrutura?: EstruturaCurricular
  opcoes: EstruturaCurricular[]
  perfilCompativel?: HistoricoAcademico
  mensagem: string
}
