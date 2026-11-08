import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { carregarJsonPublico, limparCachePublico } from './publicJson'

beforeEach(() => { limparCachePublico() })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('cache dos catálogos públicos', () => {
  it('compartilha requisições simultâneas e resultados durante cinco minutos', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ cursos: [] }) }))
    vi.stubGlobal('fetch', fetch)
    const a = carregarJsonPublico('/data/cursos-atual.json')
    const b = carregarJsonPublico('/data/cursos-atual.json')
    expect(a).toBe(b)
    await a
    await carregarJsonPublico('/data/cursos-atual.json')
    expect(fetch).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(5 * 60 * 1000)
    await carregarJsonPublico('/data/cursos-atual.json')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenCalledWith('/data/cursos-atual.json', { cache: 'no-cache' })
  })
  it('permite nova tentativa após erro de rede ou resposta inválida', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal('fetch', fetch)
    await expect(carregarJsonPublico('/data/curriculos/index.json')).rejects.toThrow('rede')
    await expect(carregarJsonPublico('/data/curriculos/index.json')).rejects.toThrow('dados públicos')
    await expect(carregarJsonPublico('/data/curriculos/index.json')).resolves.toEqual([])
    expect(fetch).toHaveBeenCalledTimes(3)
  })
  it.each(['/perfil.json', '/data/cursos-atual.json?nota=9', 'https://example.org/data/cursos-atual.json', '/data/curriculos/../perfil.json'])('recusa dados fora do catálogo: %s', async url => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    await expect(carregarJsonPublico(url)).rejects.toThrow('catálogos públicos')
    expect(fetch).not.toHaveBeenCalled()
  })
})
