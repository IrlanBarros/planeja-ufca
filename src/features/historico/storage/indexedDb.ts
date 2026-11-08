import type { HistoricoAcademico } from '../models/types'
import { decodificarPerfil } from './schema'

export const NOME_BANCO = 'planeja-ufca-perfil-academico'
export const NOME_BANCO_INTERMEDIARIO = 'projeta-ufca-perfil-academico'
export const NOME_BANCO_LEGADO = 'seu-horario-perfil-academico'
const BANCOS_LEGADOS = [NOME_BANCO_INTERMEDIARIO, NOME_BANCO_LEGADO]
const STORE = 'perfil'
const KEY = 'ativo'
const MIGRADO = 'migracao-legada-concluida'

function abrir(nome: string): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('O armazenamento local está indisponível. Você ainda pode usar o perfil somente nesta sessão.')); return }
    let req: IDBOpenDBRequest
    try { req = indexedDB.open(nome, 1) }
    catch { reject(new Error('O navegador bloqueou a leitura dos dados acadêmicos locais. Nenhum dado foi removido.')); return }
    let bloqueado = false, ausente = false
    req.onupgradeneeded = () => {
      // Consultar um banco legado inexistente não deve criar um banco vazio.
      if (nome !== NOME_BANCO) { ausente = true; req.transaction!.abort() }
      else req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => { if (bloqueado) { req.result.close(); return }; req.result.onversionchange = () => req.result.close(); resolve(req.result) }
    req.onerror = () => {
      if (ausente) resolve(null)
      else reject(new Error('Não foi possível abrir os dados acadêmicos locais. Nenhum dado existente foi removido.'))
    }
    req.onblocked = () => { bloqueado = true; reject(new Error('Feche outras abas deste site para acessar os dados acadêmicos locais.')) }
  })
}

async function executar(nome: string, modo: IDBTransactionMode, operacao: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  const db = await abrir(nome)
  if (!db) return undefined
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction | undefined
    try {
      tx = db.transaction(STORE, modo)
      const req = operacao(tx.objectStore(STORE))
      tx.oncomplete = () => { db.close(); resolve(req.result) }
      const falha = () => { db.close(); reject(new Error(modo === 'readonly' ? 'Não foi possível ler o perfil salvo. Os dados existentes foram preservados.' : 'Não foi possível alterar o perfil salvo. Verifique o espaço disponível e as permissões do navegador.')) }
      tx.onabort = falha
      tx.onerror = falha
    } catch {
      tx?.abort(); db.close()
      reject(new Error('O navegador bloqueou o armazenamento acadêmico. Nenhum dado foi substituído.'))
    }
  })
}

export async function lerPerfil(): Promise<HistoricoAcademico | null> {
  const value = await executar(NOME_BANCO, 'readonly', store => store.get(KEY))
  if (value !== undefined) return decodificarPerfil(value)
  if (await executar(NOME_BANCO, 'readonly', store => store.get(MIGRADO))) return null
  const candidatos: HistoricoAcademico[] = []
  let erroLegado: unknown
  let exclusaoIntermediaria = false
  for (const nome of BANCOS_LEGADOS) {
    const antigo = await executar(nome, 'readonly', store => store.get(KEY))
    if (antigo === undefined) {
      // Uma exclusão/substituição explícita na versão intermediária prevalece
      // sobre cópias originais que possam continuar no mesmo navegador.
      if (nome === NOME_BANCO_INTERMEDIARIO && await executar(nome, 'readonly', store => store.get(MIGRADO))) {
        exclusaoIntermediaria = true
        break
      }
      continue
    }
    try { candidatos.push(decodificarPerfil(antigo)) }
    catch (erro) { erroLegado ??= erro }
  }
  if (!candidatos.length && erroLegado) throw erroLegado
  // A data do perfil resolve conflitos entre legados; em empate, a marca
  // intermediária tem prioridade. Um perfil atual válido nunca é substituído.
  const permitido = candidatos.reduce<HistoricoAcademico | null>((maisRecente, perfil) =>
    !maisRecente || Date.parse(perfil.importadoEm) > Date.parse(maisRecente.importadoEm) ? perfil : maisRecente, null)
  if (!permitido && !exclusaoIntermediaria) return null
  let copiado = false
  // Revalida dentro da transação para não sobrescrever uma gravação de outra aba.
  await executar(NOME_BANCO, 'readwrite', store => {
    const req = store.get(KEY)
    req.onsuccess = () => {
      if (req.result !== undefined) return
      const marcador = store.get(MIGRADO)
      marcador.onsuccess = () => {
        if (!marcador.result) {
          if (permitido) { store.put(permitido, KEY); copiado = true }
          store.put(true, MIGRADO)
        }
      }
    }
    return req
  })
  const gravado = await executar(NOME_BANCO, 'readonly', store => store.get(KEY))
  if (copiado && JSON.stringify(gravado) !== JSON.stringify(permitido)) {
    throw new Error('Não foi possível confirmar a migração do perfil. Os dados legados foram preservados.')
  }
  // O banco antigo é mantido mesmo depois da confirmação da nova leitura.
  return gravado === undefined ? null : decodificarPerfil(gravado)
}
export async function salvarPerfil(perfil: HistoricoAcademico) {
  const permitido = decodificarPerfil(perfil)
  await executar(NOME_BANCO, 'readwrite', store => {
    const req = store.put(permitido, KEY)
    store.put(true, MIGRADO)
    return req
  })
}
export async function apagarPerfil() {
  // Exclusão explícita também alcança o legado, evitando cópias pessoais esquecidas.
  for (const nome of BANCOS_LEGADOS) {
    await executar(nome, 'readwrite', store => {
      const req = store.delete(KEY)
      store.put(true, MIGRADO)
      return req
    })
  }
  await executar(NOME_BANCO, 'readwrite', store => {
    const req = store.delete(KEY)
    store.put(true, MIGRADO)
    return req
  })
}
