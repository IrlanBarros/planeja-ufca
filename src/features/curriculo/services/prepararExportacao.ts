import type { CursoIndiceCurriculo, EstruturaCurricular } from '../../../types'
import type { HistoricoAcademico } from '../../historico/models/types'
import { identificarCurso, identificarEstrutura } from '../../historico/integracaoCurricular'
import { ROTULOS_ESTADO } from '../models/types'
import type { ExportacaoCurriculo, LinhaExportacaoCurriculo, ModoCurriculo } from '../models/types'
import { calcularProgresso } from './progressoCurricular'

export function prepararExportacao({ modo, curso, cursos, estrutura, estruturas, perfil = null, periodoReferencia = null, estruturaConfirmada = null, agora = new Date() }: {
  modo: ModoCurriculo; curso: CursoIndiceCurriculo; cursos: CursoIndiceCurriculo[]; estrutura: EstruturaCurricular; estruturas: EstruturaCurricular[]
  perfil?: HistoricoAcademico | null; periodoReferencia?: string | null; estruturaConfirmada?: string | null; agora?: Date
}): ExportacaoCurriculo {
  const cursoPerfil = perfil ? identificarCurso(perfil, cursos).curso : undefined
  const matrizPerfil = perfil ? identificarEstrutura(perfil, estruturas, estruturaConfirmada).estrutura : undefined
  if (modo === 'progresso' && (!perfil || cursoPerfil?.id !== curso.id || matrizPerfil?.id !== estrutura.id)) {
    throw new Error('Importe um histórico compatível e confirme o curso e a matriz antes de exportar seu progresso.')
  }
  const progresso = modo === 'progresso' && perfil ? calcularProgresso({ ...perfil, curso: { ...perfil.curso, idCurso: cursoPerfil!.id } }, estrutura, curso.id, periodoReferencia, agora) : null
  return {
    modo, curso: { id: curso.id, nome: curso.nome }, estrutura: { id: estrutura.id, codigo: estrutura.codigo, ano: estrutura.ano_criacao },
    geradoEm: agora.toISOString(), emitidoEm: progresso ? perfil!.emitidoEm : null,
    periodoReferencia: progresso ? periodoReferencia : null,
    linhas: [...new Map(estrutura.componentes.map(c => [c.codigo, c])).values()].map(componente => {
      const situacao = progresso?.situacoes.get(componente.codigo)
      return { componente, ...(situacao ? { situacao: {
        estado: situacao.estado, rotulo: ROTULOS_ESTADO[situacao.estado],
        detalhes: [...new Set([situacao.justificativa, `Pré-requisitos: ${situacao.preRequisitos.descricao}`, `Correquisitos: ${situacao.coRequisitos.descricao}`, ...situacao.academica.advertencias])].join(' '),
      } } : {}) }
    }),
    indicadores: progresso?.indicadores ?? [], avisos: progresso?.avisos ?? [],
  }
}

export function agruparComponentes<T extends { componente: LinhaExportacaoCurriculo['componente'] }>(linhas: T[]): { titulo: string; linhas: T[] }[] {
  const niveis = [...new Set(linhas.filter(l => l.componente.tipo === 'obrigatoria' && l.componente.nivel !== null).map(l => l.componente.nivel!))].sort((a, b) => a - b)
  return [
    ...niveis.map(nivel => ({ titulo: `${nivel}º período`, linhas: linhas.filter(l => l.componente.tipo === 'obrigatoria' && l.componente.nivel === nivel) })),
    { titulo: 'Outros componentes obrigatórios', linhas: linhas.filter(l => l.componente.tipo === 'obrigatoria' && l.componente.nivel === null) },
    { titulo: 'Optativas', linhas: linhas.filter(l => l.componente.tipo === 'optativa') },
  ].filter(g => g.linhas.length)
}

export function nomeArquivoCurriculo(dados: ExportacaoCurriculo, extensao: 'pdf' | 'csv') {
  const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${dados.modo === 'progresso' ? 'meu-progresso' : 'estrutura-curricular'}-${normalizar(dados.curso.nome).toLowerCase()}-${normalizar(dados.estrutura.codigo)}.${extensao}`
}
