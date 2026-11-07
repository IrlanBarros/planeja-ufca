/** Coordenadas em pontos, com origem no canto superior esquerdo. */
export interface ElementoTexto { texto: string; x: number; y: number; largura: number; altura: number }
export interface PaginaTexto { numero: number; largura: number; altura: number; elementos: ElementoTexto[] }
export interface LinhaTexto { y: number; elementos: ElementoTexto[]; texto: string }

export const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
export const juntar = (items: ElementoTexto[]) => [...items].sort((a, b) => a.x - b.x).map(i => i.texto).join(' ').replace(/\s+/g, ' ').trim()

export function reconstruirLinhas(elementos: ElementoTexto[], tolerancia = 2): LinhaTexto[] {
  const linhas: LinhaTexto[] = []
  for (const el of [...elementos].filter(e => e.texto.trim()).sort((a, b) => a.y - b.y || a.x - b.x)) {
    const last = linhas.at(-1)
    if (last && Math.abs(last.y - el.y) <= tolerancia) last.elementos.push(el)
    else linhas.push({ y: el.y, elementos: [el], texto: '' })
  }
  return linhas.map(l => ({ ...l, texto: juntar(l.elementos) }))
}

export function numeroOficial(texto: string | undefined): number | null {
  if (!texto || !/^-?\d+(?:[.,]\d+)?\s*(?:h|%)?$/.test(texto.trim())) return null
  const n = Number(texto.trim().replace(/\s*(h|%)$/, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
