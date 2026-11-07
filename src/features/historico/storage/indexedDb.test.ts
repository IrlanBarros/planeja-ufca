import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { apagarPerfil, lerPerfil, NOME_BANCO, salvarPerfil } from './indexedDb'
import { decodificarPerfil } from './schema'
import { novoHistorico } from '../models/types'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); globalThis.indexedDB = new IDBFactory() })

async function gravarBruto(value: unknown) {
  const req = indexedDB.open(NOME_BANCO, 1)
  await new Promise<void>((resolve, reject) => { req.onupgradeneeded = () => req.result.createObjectStore('perfil'); req.onsuccess = () => resolve(); req.onerror = () => reject() })
  const db = req.result
  await new Promise<void>((resolve, reject) => { const tx = db.transaction('perfil', 'readwrite'); tx.objectStore('perfil').put(value, 'ativo'); tx.oncomplete = () => resolve(); tx.onabort = () => reject() })
  db.close()
}

describe('IndexedDB exclusivo do perfil acadêmico', () => {
  it('salva, recupera, substitui e exclui um único perfil', async () => {
    expect(await lerPerfil()).toBeNull()
    const p = novoHistorico(); p.curso.nome = 'EXEMPLO'
    await salvarPerfil(p)
    expect(await lerPerfil()).toEqual(p)
    p.curso.nome = 'VERSÃO ATUALIZADA'
    await salvarPerfil(p)
    expect((await lerPerfil())?.curso.nome).toBe('VERSÃO ATUALIZADA')
    await apagarPerfil()
    expect(await lerPerfil()).toBeNull()
  })
  it('permite somente campos acadêmicos, removendo PDF, texto e identificadores extras em todos os níveis', async () => {
    const p = { ...novoHistorico(), cpf: 'FICTICIO', pdf: new Uint8Array([1]), textoIntegral: 'TEXTO FICTICIO', curso: { ...novoHistorico().curso, matricula: 'FICTICIA' } }
    await salvarPerfil(p)
    const json = JSON.stringify(await lerPerfil())
    expect(json).not.toMatch(/FICTICIO|FICTICIA|textoIntegral|matricula|cpf|pdf/)
  })
  it.each([{ schemaVersion: 9 }, { schemaVersion: 1 }, null])('recusa schema incompatível ou inválido sem apagar o original', async value => {
    await gravarBruto(value)
    await expect(lerPerfil()).rejects.toThrow(/preservad/i)
    await expect(lerPerfil()).rejects.toThrow()
  })
  it('rejeita número não finito e versão futura na escrita', async () => {
    const p = novoHistorico(); p.indicesOficiais.mc = NaN
    expect(() => decodificarPerfil(p)).toThrow('inválido')
    await expect(salvarPerfil({ ...p, schemaVersion: 2 } as never)).rejects.toThrow('incompatível')
  })
  it('trata IndexedDB indisponível e bloqueios de leitura', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await expect(lerPerfil()).rejects.toThrow('indisponível')
    await expect(salvarPerfil(novoHistorico())).rejects.toThrow('indisponível')
  })
  it('trata falha de abertura sem expor erros internos', async () => {
    vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new Error('detalhe interno') })
    await expect(lerPerfil()).rejects.toThrow()
  })
  it('trata falha de escrita e preserva dados anteriores', async () => {
    await salvarPerfil(novoHistorico())
    const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new DOMException('Quota', 'QuotaExceededError') })
    await expect(salvarPerfil(novoHistorico())).rejects.toThrow('bloqueou')
    spy.mockRestore()
    expect(await lerPerfil()).not.toBeNull()
  })
  it('trata falha de leitura sem remover o perfil salvo', async () => {
    await salvarPerfil(novoHistorico())
    const spy = vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => { throw new DOMException('bloqueado', 'SecurityError') })
    await expect(lerPerfil()).rejects.toThrow('bloqueou')
    spy.mockRestore()
    expect(await lerPerfil()).not.toBeNull()
  })
  it('não toca no localStorage de tema e horários', async () => {
    const clear = vi.fn(), removeItem = vi.fn()
    vi.stubGlobal('localStorage', { clear, removeItem })
    await salvarPerfil(novoHistorico()); await apagarPerfil()
    expect(clear).not.toHaveBeenCalled(); expect(removeItem).not.toHaveBeenCalled()
  })
})
