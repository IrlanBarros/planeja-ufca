// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import type { Root } from 'react-dom/client'
import { BrowserRouter, StaticRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { routePages } from '../routePages'
import AppRoutes from '../AppRoutes'
import ThemeProvider from '../theme/ThemeProvider'
import HistoricoProvider from '../features/historico/hooks/HistoricoProvider'
import { publicRoutes } from './routes'
import { limparCachePublico } from '../data/publicJson'

let root: Root | undefined
afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.head.innerHTML = ''; document.body.innerHTML = ''
  localStorage.clear(); limparCachePublico(); vi.unstubAllGlobals()
})

describe('HTML público e hidratação', () => {
  it.each(publicRoutes)('hidrata $path sem duplicar head, ler perfil no build ou mudar o tema salvo', async route => {
    localStorage.setItem('planeja-ufca:theme', 'dark')
    localStorage.setItem('perfil-pessoal-nao-publicar', 'DADO_PRIVADO_DO_ESTUDANTE')
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ cursos: [], periodo: '2026.2' }) }))
    vi.stubGlobal('fetch', fetch)
    const Page = (await routePages.find(r => r.path === route.path)!.load()).default
    // O renderer síncrono isola os contextos do cliente no mesmo processo de teste.
    // O HTML do renderer estático real é verificado separadamente no build.
    const html = renderToString(<html lang="pt-BR"><head><meta charSet="UTF-8" /></head><body><div id="root"><StrictMode><ThemeProvider><HistoricoProvider><StaticRouter location={route.path}><AppRoutes initialPage={{ path: route.path, Component: Page }} /></StaticRouter></HistoricoProvider></ThemeProvider></StrictMode></div></body></html>)
    expect(fetch).not.toHaveBeenCalled()
    expect(html).not.toContain('DADO_PRIVADO_DO_ESTUDANTE')
    expect(html).not.toContain('id="S:0"')
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    document.head.innerHTML = parsed.head.innerHTML
    document.body.innerHTML = parsed.body.innerHTML
    document.documentElement.dataset.theme = 'dark'
    window.history.replaceState(null, '', route.path)
    const onRecoverableError = vi.fn()
    await act(async () => {
      root = hydrateRoot(document.getElementById('root')!, <StrictMode><ThemeProvider><HistoricoProvider><BrowserRouter><AppRoutes initialPage={{ path: route.path, Component: Page }} /></BrowserRouter></HistoricoProvider></ThemeProvider></StrictMode>, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(document.querySelectorAll('title')).toHaveLength(1)
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(document.title).toBe(route.title)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect((document.querySelector('#theme-preference') as HTMLSelectElement).value).toBe('dark')
    if (route.path === '/') {
      await userEvent.click(screen.getByRole('link', { name: 'Guia acadêmico' }))
      await screen.findByRole('heading', { name: 'Guia Acadêmico da UFCA' })
      expect(document.title).toBe(publicRoutes[4].title)
      expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
      expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
      expect(onRecoverableError).not.toHaveBeenCalled()
    }
  })
})
