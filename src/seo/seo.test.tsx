// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter } from 'react-router-dom'
import Seo from './Seo'
import { absoluteUrl, siteOrigin, validateSiteUrl } from './config'
import { publicRoutes } from './routes'
import { serializeJsonLd, structuredData } from './structuredData'
import { routePages } from '../routePages'

afterEach(() => { cleanup(); document.head.innerHTML = '' })

describe('origem pública', () => {
  it('normaliza a origem HTTPS sem barras duplicadas', () => {
    expect(validateSiteUrl('https://planejaufca.pages.dev/')).toBe(siteOrigin)
    expect(absoluteUrl('/curriculo')).toBe(`${siteOrigin}/curriculo`)
  })
  it.each(['', 'http://planejaufca.pages.dev', 'https://localhost', 'https://127.0.0.1', 'https://app.local', 'https://app.invalid', 'https://app.example', 'https://dev.app.pages.dev', 'https://app.workers.dev', 'https://example.org/path', 'https://example.org/?perfil=1', 'https://example.org/#fragment', 'https://user:password@example.org', 'https://example.org:3000'])('rejeita configuração inadequada: %s', value => {
    expect(() => validateSiteUrl(value)).toThrow('VITE_SITE_URL')
  })
})

describe('metadados públicos', () => {
  it.each(publicRoutes)('gera somente um conjunto específico para $path, ignorando perfil e fragmentos', async route => {
    render(<MemoryRouter initialEntries={[`${route.path}?nome=PRIVADO&nota=9#matricula-PRIVADA`]}><Seo /></MemoryRouter>)
    await waitFor(() => expect(document.title).toBe(route.title))
    expect(document.querySelectorAll('title')).toHaveLength(1)
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(route.description)
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(absoluteUrl(route.path))
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(absoluteUrl(route.path))
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(route.title)
    expect(document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe(route.description)
    expect(document.head.innerHTML).not.toMatch(/PRIVADO|PRIVADA/)
  })
  it('atualiza e remove tags na navegação, inclusive ao sair de uma página inexistente', async () => {
    render(<MemoryRouter><Seo /><Link to="/guia-academico">Guia</Link><Link to="/inexistente">Erro</Link><Link to="/">Início</Link></MemoryRouter>)
    await userEvent.click(screen.getByRole('link', { name: 'Guia' }))
    expect(document.title).toBe(publicRoutes[4].title)
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull()
    await userEvent.click(screen.getByRole('link', { name: 'Erro' }))
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow')
    expect(document.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.querySelector('meta[property="og:url"]')).toBeNull()
    await userEvent.click(screen.getByRole('link', { name: 'Início' }))
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow')
    expect(document.querySelectorAll('title')).toHaveLength(1)
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
  })
  it('usa títulos e descrições exclusivos e JSON-LD sem avaliações ou associação institucional', () => {
    expect(publicRoutes.map(r => r.path).sort()).toEqual(routePages.map(r => r.path).sort())
    expect(new Set(publicRoutes.map(r => r.title)).size).toBe(publicRoutes.length)
    expect(new Set(publicRoutes.map(r => r.description)).size).toBe(publicRoutes.length)
    const json = serializeJsonLd(structuredData())
    expect(JSON.parse(json)['@graph'].map((x: { '@type': string }) => x['@type'])).toEqual(['WebSite', 'WebApplication'])
    expect(json).not.toMatch(/aggregateRating|ratingValue|reviewCount|Organization/)
    expect(serializeJsonLd({ texto: '</script>' })).not.toContain('<')
  })
})
