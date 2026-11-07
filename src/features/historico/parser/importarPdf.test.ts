import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { importarPdf, LIMITES_PDF, validarArquivo } from './importarPdf'
import { sintetico } from './fixtures.test-utils'

const mock = vi.hoisted(() => ({ getDocument: vi.fn(), GlobalWorkerOptions: { workerSrc: '' } }))
vi.mock('pdfjs-dist', () => mock)
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/assets/pdf.worker.local.mjs' }))
const pdf = () => new File(['%PDF-1.7\nSINTETICO'], 'sintetico.pdf', { type: 'application/pdf' })

function tarefa() {
  const pages = sintetico()
  const cleanup = vi.fn()
  const doc = { numPages: pages.length, getPage: vi.fn(async (n: number) => ({
    cleanup,
    getViewport: () => ({ width: 595, height: 842, rotation: 0 }),
    getTextContent: vi.fn(async () => ({ items: pages[n - 1].elementos.map(e => ({ str: e.texto, transform: [1, 0, 0, 1, e.x, 842 - e.y], width: e.largura, height: e.altura })) })),
  })) }
  const task = { promise: Promise.resolve(doc), destroy: vi.fn(async () => {}) }
  mock.getDocument.mockReturnValue(task)
  return { task, doc, cleanup }
}
beforeEach(() => { vi.clearAllMocks(); tarefa() })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('leitura local de PDF e limites', () => {
  it('não inicia leitura sem autorização', async () => {
    await expect(importarPdf(pdf(), false, new AbortController().signal, vi.fn())).rejects.toThrow('Autorize')
    expect(mock.getDocument).not.toHaveBeenCalled()
  })
  it('valida tamanho, MIME/extensão e assinatura real', async () => {
    await expect(validarArquivo(new File([], 'vazio.pdf'))).rejects.toThrow('vazio')
    await expect(validarArquivo(new File(['outro'], 'falso.pdf', { type: 'application/pdf' }))).rejects.toThrow('assinatura')
    await expect(validarArquivo(new File(['%PDF-'], 'texto.txt'))).rejects.toThrow('Selecione um arquivo PDF')
    await expect(validarArquivo(pdf(), { ...LIMITES_PDF, bytes: 5 })).rejects.toThrow('ultrapassa')
    await expect(validarArquivo(pdf())).resolves.toBeUndefined()
  })
  it('usa bytes locais e worker empacotado, sem requisição do documento', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    const { task, cleanup } = tarefa()
    const progresso = vi.fn()
    const h = await importarPdf(pdf(), true, new AbortController().signal, progresso)
    expect(h.componentesCursados).toHaveLength(5)
    expect(mock.getDocument.mock.calls[0][0]).toMatchObject({ data: expect.any(Uint8Array), verbosity: 0, useWorkerFetch: false, useWasm: false })
    expect(mock.getDocument.mock.calls[0][0]).not.toHaveProperty('url')
    expect(mock.GlobalWorkerOptions.workerSrc).toBe('/assets/pdf.worker.local.mjs')
    expect(fetch).not.toHaveBeenCalled()
    expect(progresso).toHaveBeenLastCalledWith(3, 3)
    expect(task.destroy).toHaveBeenCalled()
    expect(cleanup).toHaveBeenCalledTimes(3)
  })
  it('protege quantidade de páginas e libera recursos no erro', async () => {
    const { task } = tarefa()
    await expect(importarPdf(pdf(), true, new AbortController().signal, vi.fn(), { ...LIMITES_PDF, paginas: 1 })).rejects.toThrow('limite de 1 páginas')
    expect(task.destroy).toHaveBeenCalled()
  })
  it('protege quantidade de texto e elementos', async () => {
    await expect(importarPdf(pdf(), true, new AbortController().signal, vi.fn(), { ...LIMITES_PDF, elementos: 3 })).rejects.toThrow('limite de conteúdo')
  })
  it.each(['PasswordException', 'InvalidPDFException', 'UnknownErrorException'])('trata %s sem expor conteúdo interno', async name => {
    const error = Object.assign(new Error('INFORMAÇÃO PRIVADA SINTÉTICA'), { name })
    const task = { promise: Promise.reject(error), destroy: vi.fn(async () => {}) }
    mock.getDocument.mockReturnValue(task)
    const erro = await importarPdf(pdf(), true, new AbortController().signal, vi.fn()).catch(e => e)
    expect(erro.message).not.toContain('PRIVADA')
    expect(erro.cause).toBeUndefined()
    expect(erro.message).toMatch(name === 'PasswordException' ? /senha/ : /corrompido/)
    expect(task.destroy).toHaveBeenCalled()
  })
  it('cancela entre páginas e destrói o worker', async () => {
    const controller = new AbortController(), { task } = tarefa()
    await expect(importarPdf(pdf(), true, controller.signal, () => controller.abort())).rejects.toThrow('cancelada')
    expect(task.destroy).toHaveBeenCalled()
  })
  it('interrompe processamento que excede o tempo limite', async () => {
    let rejectTask: (reason?: unknown) => void = () => {}
    const task = { promise: new Promise((_, reject) => { rejectTask = reject }), destroy: vi.fn(async () => { rejectTask(new Error('cancelado')) }) }
    mock.getDocument.mockReturnValue(task)
    await expect(importarPdf(pdf(), true, new AbortController().signal, vi.fn(), { ...LIMITES_PDF, tempoMs: 1 })).rejects.toThrow('tempo limite')
    expect(task.destroy).toHaveBeenCalled()
  })
})
