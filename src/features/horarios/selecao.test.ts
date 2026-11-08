// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gerarStorageKey, lerIdsHorario } from './selecao'

const nova = gerarStorageKey('2026.2', 'curso'), antiga = 'seu-horario-ufca:2026.2:curso:turmas'
beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('migração dos horários na mesma origem', () => {
  it('recupera IDs legados, elimina duplicações e preserva a origem', () => {
    localStorage.setItem(antiga, '["ABC|01|Docente|24T46","externa","externa"]')
    expect(lerIdsHorario(nova)).toEqual(['ABC|01|Docente|24T46', 'externa'])
    const salvo = localStorage.getItem(nova)
    expect(lerIdsHorario(nova)).toEqual(JSON.parse(salvo!))
    expect(localStorage.getItem(nova)).toBe(salvo)
    expect(localStorage.getItem(antiga)).toContain('externa')
    expect(lerIdsHorario(gerarStorageKey('2026.1', 'curso'))).toEqual([])
    expect(lerIdsHorario(gerarStorageKey('2026.2', 'outro'))).toEqual([])
  })
  it.each(['[]', '["nova"]', 'inválido'])('não sobrescreve uma seleção nova %s', valor => {
    localStorage.setItem(antiga, '["antiga"]'); localStorage.setItem(nova, valor)
    expect(lerIdsHorario(nova)).toEqual(valor === '["nova"]' ? ['nova'] : [])
    expect(localStorage.getItem(nova)).toBe(valor)
  })
  it.each(['null', '{}', '[1]', '[""]', 'invalid'])('preserva registro legado inválido %s sem migrar', valor => {
    localStorage.setItem(antiga, valor)
    expect(lerIdsHorario(nova)).toEqual([])
    expect(localStorage.getItem(nova)).toBeNull()
    expect(localStorage.getItem(antiga)).toBe(valor)
  })
  it('recupera em memória se a escrita falhar e tolera leitura bloqueada', () => {
    localStorage.setItem(antiga, '["antiga"]')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(lerIdsHorario(nova)).toEqual(['antiga'])
    expect(localStorage.getItem(antiga)).toBe('["antiga"]')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('security') })
    expect(lerIdsHorario(nova)).toEqual([])
  })
})
