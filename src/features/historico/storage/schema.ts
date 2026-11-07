import type { HistoricoAcademico } from '../models/types'

type Forma = 'texto' | 'numero' | 'textoNulo' | 'numeroNulo' | readonly [Forma] | { readonly [key: string]: Forma }
const horas = { exigida: 'numeroNulo', integralizada: 'numeroNulo', pendente: 'numeroNulo' } as const
const forma: Forma = {
  schemaVersion: 'numero', importadoEm: 'texto', emitidoEm: 'textoNulo',
  curso: { nome: 'textoNulo', idCurso: 'textoNulo', estruturaCurricular: 'textoNulo' },
  vinculo: { situacao: 'textoNulo', periodoIngresso: 'textoNulo', periodoAtual: 'textoNulo', prazoPadrao: 'textoNulo', prazoMaximo: 'textoNulo', suspensoes: 'textoNulo' },
  indicesOficiais: { mc: 'numeroNulo', mcn: 'numeroNulo', iech: 'numeroNulo', iepl: 'numeroNulo', iea: 'numeroNulo' },
  cargaHoraria: { obrigatorias: horas, optativas: horas, complementares: horas, total: horas },
  componentesCursados: [{ id: 'texto', periodo: 'textoNulo', codigo: 'texto', nome: 'textoNulo', cargaHoraria: 'numeroNulo', turma: 'textoNulo', frequencia: 'numeroNulo', media: 'numeroNulo', situacao: 'textoNulo', marcadores: ['texto'], tipo: 'textoNulo' }],
  componentesPendentes: [{ codigo: 'texto', nome: 'textoNulo', cargaHoraria: 'numeroNulo', observacao: 'textoNulo' }],
  equivalencias: [{ codigoExigido: 'texto', nomeExigido: 'textoNulo', codigoUtilizado: 'texto', nomeUtilizado: 'textoNulo' }],
  atividadesAutonomas: [{ categoria: 'texto', cargaHoraria: 'numeroNulo' }],
  validacao: { camposNaoReconhecidos: ['texto'], advertencias: ['texto'] },
  correcoes: [{ campo: 'texto', valorOriginal: 'textoNulo' }],
}

function copiar(valor: unknown, regra: Forma): unknown {
  if (typeof regra === 'string') {
    if (valor === null && regra.endsWith('Nulo')) return null
    if (regra.startsWith('texto') && typeof valor === 'string' && valor.length <= 2000) return valor
    if (regra.startsWith('numero') && typeof valor === 'number' && Number.isFinite(valor)) return valor
  } else if (Array.isArray(regra)) {
    if (Array.isArray(valor) && valor.length <= 5000) return valor.map(v => copiar(v, regra[0]))
  } else if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    const record = valor as Record<string, unknown>
    return Object.fromEntries(Object.entries(regra).map(([k, v]) => [k, copiar(record[k], v)]))
  }
  throw new Error('Os dados acadêmicos armazenados têm formato inválido. Eles foram preservados; você pode apagá-los ou substituí-los explicitamente.')
}

/** Lista de campos permitidos aplicada tanto na escrita como na leitura. */
export function decodificarPerfil(valor: unknown): HistoricoAcademico {
  if (valor && typeof valor === 'object' && 'schemaVersion' in valor && valor.schemaVersion !== 1) throw new Error('A versão dos dados acadêmicos é incompatível. Os dados foram preservados neste dispositivo.')
  const perfil = copiar(valor, forma) as HistoricoAcademico
  if (!/^\d{4}-\d{2}-\d{2}T/.test(perfil.importadoEm) || !Number.isFinite(Date.parse(perfil.importadoEm))) throw new Error('A data de importação armazenada é inválida. Os dados foram preservados.')
  return perfil
}
