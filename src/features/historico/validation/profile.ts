import type { HistoricoAcademico } from '../models/types'

export const SITUACOES = new Set(['APR', 'APRN', 'REP', 'REPF', 'REPMF', 'REPN', 'REPNF', 'TRANC', 'MATR', 'CANC', 'DISP', 'TRANS', 'INCORP', 'CUMP', 'REC', 'PARCCUMP'])
export const codigoPlausivel = (s: string) => /^(?:[A-Z]{2,12}\d{2,8}|ENADE)$/.test(s)

export function validarHistorico(h: HistoricoAcademico): string[] {
  const avisos: string[] = []
  if (!h.curso.nome) avisos.push('Curso não identificado. Informe o curso na conferência.')
  if (!h.curso.estruturaCurricular) avisos.push('Estrutura curricular não identificada. Confira o código da matriz.')
  if (!h.emitidoEm) avisos.push('Data de emissão não identificada.')
  if (!h.componentesCursados.length) avisos.push('Nenhuma tentativa de componente reconhecida. Confira o formato do documento.')
  if (Object.values(h.indicesOficiais).some(v => v === null)) avisos.push('Um ou mais índices oficiais não foram reconhecidos.')
  if (Object.values(h.cargaHoraria).some(c => Object.values(c).some(v => v === null))) avisos.push('A tabela de carga horária está incompleta.')
  const vistos = new Set<string>()
  h.componentesCursados.forEach((c, i) => {
    const ref = `Registro ${i + 1}`
    if (!codigoPlausivel(c.codigo)) avisos.push(`${ref}: código não reconhecido.`)
    if (!c.nome || !c.periodo || !c.situacao || c.cargaHoraria === null) avisos.push(`${ref}: informações ausentes; confira e corrija ou rejeite o registro.`)
    if (c.situacao && !SITUACOES.has(c.situacao)) avisos.push(`${ref}: situação desconhecida preservada, sem classificação.`)
    if (c.tipo?.includes('desconhecido')) avisos.push(`${ref}: marcador de tipo desconhecido preservado.`)
    if (c.media !== null && (c.media < 0 || c.media > 10)) avisos.push(`${ref}: média fora do intervalo de 0 a 10.`)
    if (c.frequencia !== null && (c.frequencia < 0 || c.frequencia > 100)) avisos.push(`${ref}: frequência fora do intervalo de 0 a 100.`)
    if (c.cargaHoraria !== null && c.cargaHoraria < 0) avisos.push(`${ref}: carga horária negativa.`)
    const key = JSON.stringify([c.periodo, c.codigo, c.turma, c.media, c.situacao])
    if (vistos.has(key)) avisos.push(`${ref}: possível duplicação. As tentativas foram preservadas para conferência.`)
    vistos.add(key)
  })
  if (Object.values(h.cargaHoraria).some(c => Object.values(c).some(v => v !== null && v < 0))) avisos.push('Há carga horária negativa; confira a tabela oficial.')
  return avisos
}

export function documentoDesatualizado(emissao: string | null, agora = new Date()): boolean {
  if (!emissao) return false
  const semestre = (d: Date) => d.getFullYear() * 2 + (d.getMonth() >= 6 ? 1 : 0)
  return semestre(new Date(`${emissao}T12:00:00`)) < semestre(agora)
}
