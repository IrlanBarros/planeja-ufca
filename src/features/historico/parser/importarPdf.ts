import { interpretarUfca } from './ufca'
import type { PaginaTexto } from './layout'
import { ErroHistorico } from './errors'

export const LIMITES_PDF = { bytes: 15 * 1024 * 1024, paginas: 80, elementos: 150_000, caracteres: 3_000_000, tempoMs: 45_000 }
export type LimitesPdf = typeof LIMITES_PDF

export async function validarArquivo(file: File, limites = LIMITES_PDF) {
  if (!file.size) throw new ErroHistorico('O arquivo está vazio. Selecione um histórico em PDF.')
  if (file.size > limites.bytes) throw new ErroHistorico(`O PDF ultrapassa o limite de ${Math.round(limites.bytes / 1024 / 1024)} MB.`)
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new ErroHistorico('Selecione um arquivo PDF.')
  const assinatura = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  if (String.fromCharCode(...assinatura) !== '%PDF-') throw new ErroHistorico('O arquivo não possui uma assinatura PDF válida.')
}

export async function importarPdf(file: File, autorizado: boolean, signal: AbortSignal, progresso: (pagina: number, total: number) => void, limites = LIMITES_PDF) {
  try { return await lerPdf(file, autorizado, signal, progresso, limites) }
  catch (error) {
    if (error instanceof ErroHistorico) throw error
    if (signal.aborted) throw new ErroHistorico('Importação cancelada.')
    throw new ErroHistorico('Não foi possível iniciar a leitura local. Recarregue a página e tente novamente com um PDF digital do SIGAA.')
  }
}

async function lerPdf(file: File, autorizado: boolean, signal: AbortSignal, progresso: (pagina: number, total: number) => void, limites: LimitesPdf) {
  if (!autorizado) throw new ErroHistorico('Autorize o processamento local antes de selecionar o PDF.')
  await validarArquivo(file, limites)
  signal.throwIfAborted()
  const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  // Vite inclui o worker no build. Nenhuma URL do documento é fornecida ao PDF.js.
  GlobalWorkerOptions.workerSrc = workerUrl
  const data = new Uint8Array(await file.arrayBuffer())
  signal.throwIfAborted()
  const task = getDocument({ data, verbosity: 0, useWorkerFetch: false, useWasm: false, disableFontFace: true, useSystemFonts: false, stopAtErrors: true })
  const paginas: PaginaTexto[] = []
  let temporizado = false
  const destruir = () => { void task.destroy().catch(() => {}) }
  const timer = setTimeout(() => { temporizado = true; destruir() }, limites.tempoMs)
  signal.addEventListener('abort', destruir, { once: true })
  try {
    const doc = await task.promise
    if (doc.numPages > limites.paginas) throw new ErroHistorico(`O PDF excede o limite de ${limites.paginas} páginas.`)
    let itens = 0, caracteres = 0
    for (let n = 1; n <= doc.numPages; n++) {
      signal.throwIfAborted()
      const page = await doc.getPage(n)
      try {
        const viewport = page.getViewport({ scale: 1 })
        if (viewport.rotation !== 0) throw new ErroHistorico('O PDF contém páginas rotacionadas. Gere novamente o histórico digital no SIGAA.')
        const content = await page.getTextContent()
        const elementos = []
        for (const item of content.items) {
          if (!('str' in item)) continue
          itens++; caracteres += item.str.length
          if (itens > limites.elementos || caracteres > limites.caracteres) throw new ErroHistorico('O documento excede o limite de conteúdo para processamento local.')
          elementos.push({ texto: item.str, x: item.transform[4], y: viewport.height - item.transform[5], largura: item.width, altura: item.height })
        }
        paginas.push({ numero: n, largura: viewport.width, altura: viewport.height, elementos })
      } finally { page.cleanup() }
      progresso(n, doc.numPages)
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    signal.throwIfAborted()
    if (temporizado) throw new ErroHistorico('O processamento excedeu o tempo limite. Tente um PDF menor gerado pelo SIGAA.')
    return interpretarUfca(paginas)
  // Erros internos podem conter texto pessoal; não retenha o erro bruto como causa.
  } catch (error) {
    if (signal.aborted) throw new ErroHistorico('Importação cancelada.')
    if (temporizado) throw new ErroHistorico('O processamento excedeu o tempo limite. Tente novamente com um PDF menor.')
    if (error instanceof Error && error.name === 'PasswordException') throw new ErroHistorico('O PDF está protegido por senha. Use o histórico digital sem senha emitido pelo SIGAA.')
    // Nunca repasse mensagens internas do PDF.js, que podem conter dados do documento.
    if (error instanceof ErroHistorico) throw error
    throw new ErroHistorico('Não foi possível ler o PDF. Ele pode estar corrompido ou em um formato não suportado. Gere outro histórico no SIGAA.')
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', destruir)
    paginas.length = 0
    await task.destroy().catch(() => {})
  }
}
