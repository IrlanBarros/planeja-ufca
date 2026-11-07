export interface TentativaComponente {
  id: string
  periodo: string | null
  codigo: string
  nome: string | null
  cargaHoraria: number | null
  turma: string | null
  frequencia: number | null
  media: number | null
  situacao: string | null
  marcadores: string[]
  tipo: string | null
}

export interface ComponentePendente {
  codigo: string
  nome: string | null
  cargaHoraria: number | null
  observacao: string | null
}

export interface EquivalenciaHistorico {
  codigoExigido: string
  nomeExigido: string | null
  codigoUtilizado: string
  nomeUtilizado: string | null
}

export interface HorasOficiais {
  exigida: number | null
  integralizada: number | null
  pendente: number | null
}

export interface HistoricoAcademico {
  schemaVersion: 1
  importadoEm: string
  emitidoEm: string | null
  curso: { nome: string | null; idCurso: string | null; estruturaCurricular: string | null }
  vinculo: {
    situacao: string | null
    periodoIngresso: string | null
    periodoAtual: string | null
    prazoPadrao: string | null
    prazoMaximo: string | null
    suspensoes: string | null
  }
  indicesOficiais: { mc: number | null; mcn: number | null; iech: number | null; iepl: number | null; iea: number | null }
  cargaHoraria: { obrigatorias: HorasOficiais; optativas: HorasOficiais; complementares: HorasOficiais; total: HorasOficiais }
  componentesCursados: TentativaComponente[]
  componentesPendentes: ComponentePendente[]
  equivalencias: EquivalenciaHistorico[]
  atividadesAutonomas: { categoria: string; cargaHoraria: number | null }[]
  validacao: { camposNaoReconhecidos: string[]; advertencias: string[] }
  // Somente campos acadêmicos editáveis; nunca inclui trechos brutos do PDF.
  correcoes: { campo: string; valorOriginal: string | null }[]
}

export function novoHistorico(): HistoricoAcademico {
  const horas = (): HorasOficiais => ({ exigida: null, integralizada: null, pendente: null })
  return {
    schemaVersion: 1, importadoEm: new Date().toISOString(), emitidoEm: null,
    curso: { nome: null, idCurso: null, estruturaCurricular: null },
    vinculo: { situacao: null, periodoIngresso: null, periodoAtual: null, prazoPadrao: null, prazoMaximo: null, suspensoes: null },
    indicesOficiais: { mc: null, mcn: null, iech: null, iepl: null, iea: null },
    cargaHoraria: { obrigatorias: horas(), optativas: horas(), complementares: horas(), total: horas() },
    componentesCursados: [], componentesPendentes: [], equivalencias: [], atividadesAutonomas: [],
    validacao: { camposNaoReconhecidos: [], advertencias: [] }, correcoes: [],
  }
}
