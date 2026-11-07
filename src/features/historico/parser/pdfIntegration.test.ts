import { describe, expect, it } from 'vitest'
import { jsPDF } from 'jspdf'
import { sintetico } from './fixtures.test-utils'
import { interpretarUfca } from './ufca'
import type { PaginaTexto } from './layout'

describe('PDF digital sintético com PDF.js real', () => {
  it('extrai texto posicional de PDF de várias páginas sem fixture pessoal', async () => {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const pdf = new jsPDF({ unit: 'pt', format: [595, 842] })
    for (const [i, p] of sintetico().entries()) {
      if (i) pdf.addPage()
      for (const e of p.elementos) { pdf.setFontSize(e.altura); pdf.text(e.texto, e.x, e.y) }
    }
    const task = getDocument({ data: new Uint8Array(pdf.output('arraybuffer')), verbosity: 0, disableFontFace: true, useSystemFonts: false })
    try {
      const doc = await task.promise, paginas: PaginaTexto[] = []
      for (let n = 1; n <= doc.numPages; n++) {
        const p = await doc.getPage(n), v = p.getViewport({ scale: 1 }), t = await p.getTextContent()
        paginas.push({ numero: n, largura: v.width, altura: v.height, elementos: t.items.filter(i => 'str' in i).map(i => ({ texto: i.str, x: i.transform[4], y: v.height - i.transform[5], largura: i.width, altura: i.height })) })
        p.cleanup()
      }
      const h = interpretarUfca(paginas)
      expect(h.componentesCursados).toHaveLength(5)
      expect(h.componentesPendentes).toHaveLength(2)
      expect(h.indicesOficiais.mc).toBe(8.1234)
      expect(JSON.stringify(h)).not.toContain('PESSOA FICTÍCIA')
    } finally { await task.destroy() }
  })
})
