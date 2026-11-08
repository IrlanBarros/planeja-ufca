import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import { publicRoutes, siteOrigin } from '../dist-ssr/entry-server.js'

const titles = new Set()
const descriptions = new Set()
for (const { path, title, description } of publicRoutes) {
  const file = path === '/' ? 'index' : path.slice(1)
  const html = await readFile(`dist/${file}.html`, 'utf8')
  const document = new JSDOM(html).window.document
  assert.equal(document.documentElement.lang, 'pt-BR')
  assert.equal(document.querySelectorAll('title').length, 1)
  assert.equal(document.title, title)
  assert.equal(document.querySelector('meta[name="description"]').content, description)
  assert.equal(document.querySelectorAll('meta[name="description"]').length, 1)
  const canonical = document.querySelectorAll('link[rel="canonical"]')
  assert.equal(canonical.length, 1)
  assert.equal(canonical[0].href, `${siteOrigin}${path}`)
  assert.equal(document.querySelector('meta[property="og:url"]').content, canonical[0].href)
  assert.equal(document.querySelector('meta[property="og:title"]').content, title)
  assert.equal(document.querySelector('meta[name="twitter:card"]').content, 'summary')
  assert.equal(document.querySelector('meta[name="robots"]').content, 'index, follow')
  assert.equal(document.querySelectorAll('main').length, 1)
  assert.equal(document.querySelectorAll('h1').length, 1)
  assert.ok(document.querySelector('main').textContent.length > 180, `Conteúdo público insuficiente: ${path}`)
  assert.ok(!html.includes('Switched to client rendering'))
  assert.ok(!document.querySelector('[id^="S:"]'), `Conteúdo oculto de streaming: ${path}`)
  assert.ok(!document.querySelector('.route-loading'), `Fallback no HTML estático: ${path}`)
  for (const route of publicRoutes) assert.ok(document.querySelector(`a[href="${route.path}"]`), `Link ausente: ${path} → ${route.path}`)
  for (const node of document.querySelectorAll('script[src], link[href]')) {
    const resource = node.getAttribute('src') ?? node.getAttribute('href')
    if (resource.startsWith('/')) assert.ok((await stat(`dist${resource}`)).isFile(), `Recurso ausente: ${resource}`)
    if (node.matches('script[src], link[rel="modulepreload"]')) assert.ok(!/jspdf|pdf-|pdf\.worker|exportar.*Pdf|exportarPdf/.test(resource), `PDF carregado antecipadamente: ${resource}`)
  }
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    const graph = JSON.parse(script.textContent)
    assert.equal(graph['@context'], 'https://schema.org')
    assert.ok(!/aggregateRating|reviewCount|ratingValue/.test(script.textContent))
  }
  assert.ok(!titles.has(title)); titles.add(title)
  assert.ok(!descriptions.has(description)); descriptions.add(description)
}
const xml = await readFile('dist/sitemap.xml', 'utf8')
const sitemap = new JSDOM(xml, { contentType: 'application/xml' }).window.document
assert.equal(sitemap.documentElement.namespaceURI, 'http://www.sitemaps.org/schemas/sitemap/0.9')
assert.deepEqual([...sitemap.querySelectorAll('loc')].map(n => n.textContent), publicRoutes.map(r => `${siteOrigin}${r.path}`))
assert.ok(!xml.includes('<lastmod>'))
const robots = await readFile('dist/robots.txt', 'utf8')
assert.ok(robots.includes(`Sitemap: ${siteOrigin}/sitemap.xml`))
assert.ok(!/^Disallow:\s*\S+/m.test(robots))
const errorDocument = new JSDOM(await readFile('dist/404.html', 'utf8')).window.document
assert.equal(errorDocument.querySelector('meta[name="robots"]').content, 'noindex, follow')
assert.equal(errorDocument.querySelector('link[rel="canonical"]'), null)
assert.equal(errorDocument.querySelector('h1').textContent, 'Página não encontrada')
console.log('HTML, metadados, recursos, links, sitemap, robots e 404 verificados nas seis rotas.')
