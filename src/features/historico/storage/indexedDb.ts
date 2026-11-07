import type { HistoricoAcademico } from '../models/types'
import { decodificarPerfil } from './schema'

export const NOME_BANCO = 'seu-horario-perfil-academico'
const STORE = 'perfil'
const KEY = 'ativo'

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('O armazenamento local está indisponível. Você ainda pode usar o perfil somente nesta sessão.')); return }
    let req: IDBOpenDBRequest
    try { req = indexedDB.open(NOME_BANCO, 1) }
    catch { reject(new Error('O navegador bloqueou a leitura dos dados acadêmicos locais. Nenhum dado foi removido.')); return }
    let bloqueado = false
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE) }
    req.onsuccess = () => { if (bloqueado) { req.result.close(); return }; req.result.onversionchange = () => req.result.close(); resolve(req.result) }
    req.onerror = () => reject(new Error('Não foi possível abrir os dados acadêmicos locais. Nenhum dado existente foi removido.'))
    req.onblocked = () => { bloqueado = true; reject(new Error('Feche outras abas deste site para acessar os dados acadêmicos locais.')) }
  })
}

async function executar(modo: IDBTransactionMode, operacao: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  const db = await abrir()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, modo)
      const req = operacao(tx.objectStore(STORE))
      tx.oncomplete = () => { db.close(); resolve(req.result) }
      const falha = () => { db.close(); reject(new Error(modo === 'readonly' ? 'Não foi possível ler o perfil salvo. Os dados existentes foram preservados.' : 'Não foi possível alterar o perfil salvo. Verifique o espaço disponível e as permissões do navegador.')) }
      tx.onabort = falha
      tx.onerror = falha
    } catch { db.close(); reject(new Error('O navegador bloqueou o armazenamento acadêmico. Nenhum dado foi substituído.')) }
  })
}

export async function lerPerfil(): Promise<HistoricoAcademico | null> {
  const value = await executar('readonly', store => store.get(KEY))
  return value === undefined ? null : decodificarPerfil(value)
}
export async function salvarPerfil(perfil: HistoricoAcademico) {
  const permitido = decodificarPerfil(perfil)
  await executar('readwrite', store => store.put(permitido, KEY))
}
export async function apagarPerfil() { await executar('readwrite', store => store.delete(KEY)) }
