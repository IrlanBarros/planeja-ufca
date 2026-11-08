export type IndiceId = 'mc' | 'mcn' | 'iech' | 'iepl' | 'iea'

export interface IndiceAcademico {
  id: IndiceId
  sigla: string
  nome: string
  resumo: string
  explicacao: string[]
  finalidade: string
  formula: string
  leituraFormula: string
  variaveis: { simbolo: string; significado: string }[]
  exemplo: {
    contexto: string
    etapas: string[]
    resultado: number
    conclusao: string
  }
  fatores: string[]
  interpretacao: string[]
  detalhes: string[]
  limites: { minimo?: number; maximo?: number }
  duvidas: { pergunta: string; resposta: string }[]
  fonte: { artigo: number; secao: string }
}

export interface CategoriaGlossario {
  id: string
  titulo: string
  fonte: string
  termos: { termo: string; explicacao: string }[]
}
