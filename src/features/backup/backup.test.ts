// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { criarBackup, interpretarBackup, restaurarBackup, validarBackup } from './backup'
import { novoHistorico } from '../historico/models/types'
import { lerPerfil, salvarPerfil } from '../historico/storage/indexedDb'
import { gerarStorageKey } from '../horarios/selecao'
import { LEGACY_THEME_STORAGE_KEY, THEME_STORAGE_KEY } from '../../theme/theme'

beforeEach(() => { localStorage.clear(); globalThis.indexedDB = new IDBFactory(); vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
const horario = () => ({ periodo: '2026.2', cursoId: 'sintetico', turmas: ['ABC0001|01|Docente público|24T46'] })
const dados = () => ({ formato: 'projeta-ufca-backup', versao: 1, tema: 'dark', horarios: [horario()], perfil: null })

describe('transferência explícita de dados entre origens', () => {
  it('reconstitui o backup em um armazenamento de destino vazio', async () => {
    const p = novoHistorico(); p.curso.nome = 'CURSO SINTÉTICO'
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'dark')
    localStorage.setItem('seu-horario-ufca:2026.2:sintetico:turmas', JSON.stringify(horario().turmas))
    const json = JSON.stringify(criarBackup(p))
    localStorage.clear(); globalThis.indexedDB = new IDBFactory()
    await restaurarBackup(interpretarBackup(json), true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(JSON.parse(localStorage.getItem(gerarStorageKey('2026.2', 'sintetico'))!)).toEqual(horario().turmas)
    expect(await lerPerfil()).toEqual(p)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('exporta horários legados, preserva a escolha nova e só inclui perfil autorizado', () => {
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'dark')
    localStorage.setItem('seu-horario-ufca:2026.2:sintetico:turmas', '["velha"]')
    localStorage.setItem(gerarStorageKey('2026.2', 'sintetico'), '[]')
    localStorage.setItem('credencial', 'SEGREDO')
    const b = criarBackup()
    expect(b.tema).toBe('dark'); expect(b.horarios[0].turmas).toEqual([]); expect(b.perfil).toBeNull()
    const perfil = { ...novoHistorico(), cpf: 'SEGREDO', nomeCompleto: 'SEGREDO', matricula: 'SEGREDO', pdf: 'SEGREDO', textoIntegral: 'SEGREDO', token: 'SEGREDO', curso: { ...novoHistorico().curso, rg: 'SEGREDO' } }
    const autorizado = criarBackup(perfil)
    expect(interpretarBackup(JSON.stringify(autorizado))).toEqual(autorizado)
    expect(JSON.stringify(autorizado)).not.toContain('SEGREDO')
    expect(autorizado.perfil).not.toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('exporta todas as combinações de curso e período e deduplica IDs', () => {
    localStorage.setItem('seu-horario-ufca:2026.1:sintetico:turmas', '["antiga","antiga"]')
    localStorage.setItem(gerarStorageKey('2026.2', 'sintetico'), '["nova"]')
    localStorage.setItem(gerarStorageKey('2026.2', 'outro'), '["externa"]')
    expect(criarBackup().horarios).toHaveLength(3)
    expect(criarBackup().horarios[0].turmas).toEqual(['antiga'])
  })
  it.each([null, {}, { ...dados(), versao: 2 }, { ...dados(), horarios: [{}] }, { ...dados(), tema: 'evil' }, { ...dados(), perfil: {} }, { ...dados(), perfil: undefined }, { ...dados(), horarios: [{ ...horario(), turmas: [5] }] }, { ...dados(), horarios: [horario(), horario()] }])('recusa arquivo inválido ou incompatível sem escrita', async b => {
    localStorage.setItem('fora', 'preservado')
    await expect(restaurarBackup(b, true)).rejects.toThrow()
    expect(localStorage.length).toBe(1)
  })
  it('recusa JSON inválido, arquivo enorme e identificador inválido', () => {
    expect(() => interpretarBackup('{')).toThrow('JSON')
    expect(() => interpretarBackup(' '.repeat(8 * 1024 * 1024 + 1))).toThrow('8 MB')
    expect(() => validarBackup({ ...dados(), horarios: [{ ...horario(), cursoId: 'outro:curso' }] })).toThrow()
  })
  it('exige confirmação e mantém dados até que ela seja fornecida', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    await expect(restaurarBackup(dados(), false)).rejects.toThrow('Confirme')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })
  it('restaura somente os dados indicados, mantém outros horários e perfil ausente do backup', async () => {
    const p = novoHistorico(); await salvarPerfil(p)
    localStorage.setItem(gerarStorageKey('2026.1', 'outro'), '["preservada"]')
    localStorage.setItem(gerarStorageKey('2026.2', 'sintetico'), '["anterior"]')
    await restaurarBackup(dados(), true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(JSON.parse(localStorage.getItem(gerarStorageKey('2026.2', 'sintetico'))!)).toEqual(horario().turmas)
    expect(localStorage.getItem(gerarStorageKey('2026.1', 'outro'))).toBe('["preservada"]')
    expect(await lerPerfil()).toEqual(p)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('substitui o perfil somente após confirmação e permite repetir sem duplicar', async () => {
    const p = novoHistorico(); p.curso.nome = 'SINTÉTICO'
    await restaurarBackup({ ...dados(), perfil: p }, true)
    await restaurarBackup({ ...dados(), perfil: p }, true)
    expect(await lerPerfil()).toEqual(p)
    expect(localStorage.length).toBe(2)
  })
  it('desfaz alterações locais se a transação do perfil falhar', async () => {
    const p = novoHistorico(); await salvarPerfil(p)
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    localStorage.setItem(gerarStorageKey('2026.2', 'sintetico'), '["anterior"]')
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new Error('quota') })
    await expect(restaurarBackup({ ...dados(), perfil: novoHistorico() }, true)).rejects.toThrow('preservados')
    put.mockRestore()
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(localStorage.getItem(gerarStorageKey('2026.2', 'sintetico'))).toBe('["anterior"]')
    expect(await lerPerfil()).toEqual(p)
  })
  it('desfaz escritas parciais no localStorage sem tocar no perfil', async () => {
    const p = novoHistorico(); await salvarPerfil(p)
    const set = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, chave, valor) {
      if (chave.endsWith(':turmas')) throw new Error('quota')
      set.call(this, chave, valor)
    })
    await expect(restaurarBackup({ ...dados(), perfil: novoHistorico() }, true)).rejects.toThrow('preservados')
    expect(localStorage.length).toBe(0)
    expect(await lerPerfil()).toEqual(p)
  })
  it('interrompe exportação se um horário estiver corrompido ou armazenamento bloqueado', () => {
    localStorage.setItem(gerarStorageKey('2026.2', 'sintetico'), 'invalid')
    expect(() => criarBackup()).toThrow('Não foi possível')
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => { throw new Error('security') })
    expect(() => criarBackup()).toThrow('Não foi possível')
  })
})
