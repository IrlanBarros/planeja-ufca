import type { ComponenteCurricular } from '../../../types'
import type { HistoricoAcademico } from '../../historico/models/types'

export const CONCLUSOES: Readonly<Record<string, string>> = {
  APR: 'aprovação por média', APRN: 'aprovação por nota', DISP: 'dispensa',
  TRANS: 'aproveitamento por transferência', INCORP: 'incorporação por mobilidade', CUMP: 'cumprimento em curso anterior',
}

// Sem árvore lógica, só uma lista explicitamente disjuntiva é segura.
// Regras E, expressões especiais e listas ambíguas permanecem condicionais.
export function alternativasSeguras(expressao: string | null, codigos: string[]): string[] | null {
  if (!expressao?.trim()) return codigos.length <= 1 ? [...codigos] : null
  const tokens = expressao.replace(/[()]/g, ' ').trim().split(/\s+/)
  if (!tokens.every((t, i) => i % 2 ? t === 'OU' : codigos.includes(t))) return null
  const alternativas = [...new Set(tokens.filter((_, i) => i % 2 === 0))]
  return tokens.length % 2 === 1 && codigos.every(c => alternativas.includes(c)) ? alternativas : null
}

export function equivalentesPermitidos(componente: ComponenteCurricular, perfil: HistoricoAcademico) {
  const matriz = alternativasSeguras(componente.equivalencias_expressao, componente.equivalencias_codigos)
  const historico = perfil.equivalencias.filter(e => e.codigoExigido === componente.codigo).map(e => e.codigoUtilizado)
  return [...new Set([...historico, ...(matriz ?? [])])]
}

export function cumprimentos(perfil: HistoricoAcademico, componentes: ComponenteCurricular[]): Map<string, string> {
  const diretos = new Map<string, string>()
  for (const t of perfil.componentesCursados) {
    if (t.situacao && CONCLUSOES[t.situacao]) diretos.set(t.codigo, `${CONCLUSOES[t.situacao]} (${t.situacao}) em ${t.periodo ?? 'período não identificado'}`)
  }
  const resultado = new Map(diretos)
  // O registro "Cumpriu X através de Y" é evidência explícita do histórico.
  for (const e of perfil.equivalencias) {
    if (!resultado.has(e.codigoExigido)) resultado.set(e.codigoExigido, `cumprimento registrado no histórico através de ${e.codigoUtilizado}`)
  }
  for (const c of componentes) {
    if (resultado.has(c.codigo)) continue
    const equivalente = alternativasSeguras(c.equivalencias_expressao, c.equivalencias_codigos)?.find(codigo => diretos.has(codigo))
    // Consulta exclusivamente aprovações diretas: nunca simetria ou transitividade.
    if (equivalente) resultado.set(c.codigo, `equivalência prevista na matriz através de ${equivalente}: ${diretos.get(equivalente)}`)
  }
  return resultado
}
