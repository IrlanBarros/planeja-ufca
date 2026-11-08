import assert from 'node:assert/strict'
import { publicRoutes, siteOrigin } from '../dist-ssr/entry-server.js'
import { JSDOM } from 'jsdom'

const base = process.argv[2] ?? 'http://127.0.0.1:4173'
for (const route of publicRoutes) {
  const response = await fetch(new URL(route.path, base))
  assert.equal(response.status, 200, route.path)
  const document = new JSDOM(await response.text()).window.document
  assert.equal(document.title, route.title, route.path)
  assert.equal(document.querySelector('link[rel="canonical"]').href, `${siteOrigin}${route.path}`)
  if (route.path !== '/') {
    const slash = await fetch(new URL(`${route.path}/?curso=32652294`, base), { redirect: 'manual' })
    assert.equal(slash.status, 301)
    assert.equal(new URL(slash.headers.get('location'), base).pathname, route.path)
    assert.equal(new URL(slash.headers.get('location'), base).search, '?curso=32652294')
  }
  console.log(`200 ${route.path} · HTML e canonical corretos`)
}
for (const path of ['/nao-existe-seo', '/data/arquivo-inexistente.json']) {
  const response = await fetch(new URL(path, base))
  assert.equal(response.status, 404, path)
  assert.ok((await response.text()).includes('noindex'))
  console.log(`404 ${path}`)
}
for (const path of ['/robots.txt', '/sitemap.xml', '/data/cursos-atual.json']) {
  const response = await fetch(new URL(path, base))
  assert.equal(response.status, 200, path)
  assert.ok(!(await response.text()).includes('<title>'), path)
  console.log(`200 ${path} · recurso estático preservado`)
}
