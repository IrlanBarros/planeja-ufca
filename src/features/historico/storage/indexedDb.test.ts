import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { apagarPerfil, lerPerfil, NOME_BANCO, NOME_BANCO_LEGADO, salvarPerfil } from './indexedDb'
import { decodificarPerfil } from './schema'
import { novoHistorico } from '../models/types'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); globalThis.indexedDB = new IDBFactory() })

async function gravarBruto(value: unknown, banco = NOME_BANCO) {
  const req = indexedDB.open(banco, 1)
  await new Promise<void>((resolve, reject) => { req.onupgradeneeded = () => req.result.createObjectStore('perfil'); req.onsuccess = () => resolve(); req.onerror = () => reject() })
  const db = req.result
  await new Promise<void>((resolve, reject) => { const tx = db.transaction('perfil', 'readwrite'); tx.objectStore('perfil').put(value, 'ativo'); tx.oncomplete = () => resolve(); tx.onabort = () => reject() })
  db.close()
}

describe('IndexedDB exclusivo do perfil acadêmico', () => {
  it('migra o legado de forma idempotente e confirma o conteúdo sem apagar o original', async () => {
    const p = novoHistorico(); p.curso.nome = 'LEGADO SINTÉTICO'
    await gravarBruto(p, NOME_BANCO_LEGADO)
    expect(await lerPerfil()).toEqual(p)
    expect(await lerPerfil()).toEqual(p)
    const req = indexedDB.open(NOME_BANCO_LEGADO, 1)
    await new Promise<void>(resolve => { req.onsuccess = () => resolve() })
    const get = req.result.transaction('perfil').objectStore('perfil').get('ativo')
    await new Promise<void>(resolve => { get.onsuccess = () => resolve() })
    expect(get.result).toEqual(p); req.result.close()
  })
  it('mantém o novo perfil e não ressuscita o legado depois de exclusão explícita', async () => {
    const p = novoHistorico(); p.curso.nome = 'ANTIGO'
    await gravarBruto(p, NOME_BANCO_LEGADO)
    const novo = { ...p, curso: { ...p.curso, nome: 'NOVO' } }
    await salvarPerfil(novo)
    expect(await lerPerfil()).toEqual(novo)
    await apagarPerfil()
    await gravarBruto(p, NOME_BANCO_LEGADO)
    expect(await lerPerfil()).toBeNull()
  })
  it('preserva o legado se a migração falha e permite uma nova tentativa', async () => {
    const p = novoHistorico()
    await gravarBruto(p, NOME_BANCO_LEGADO)
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new Error('quota') })
    await expect(lerPerfil()).rejects.toThrow()
    put.mockRestore()
    expect(await lerPerfil()).toEqual(p)
  })
  it('recusa legado inválido sem marcar a migração como concluída', async () => {
    await gravarBruto({ schemaVersion: 8 }, NOME_BANCO_LEGADO)
    await expect(lerPerfil()).rejects.toThrow('incompatível')
    const p = novoHistorico()
    await gravarBruto(p, NOME_BANCO_LEGADO)
    expect(await lerPerfil()).toEqual(p)
  })
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
