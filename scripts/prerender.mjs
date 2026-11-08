import { readFile, writeFile } from 'node:fs/promises'
import { render, publicRoutes, siteOrigin } from '../dist-ssr/entry-server.js'

const template = await readFile('dist/index.html', 'utf8')
const baseHead = template.match(/<head>([\s\S]*?)<\/head>/)[1]
const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'))
const sources = {
  '/': 'src/App.tsx', '/curriculo': 'src/pages/CurriculoPage.tsx',
  '/historico': 'src/pages/HistoricoPage.tsx', '/recomendacoes': 'src/pages/RecomendacoesPage.tsx',
  '/guia-academico': 'src/pages/GuiaAcademicoPage.tsx', '/privacidade': 'src/pages/PrivacidadePage.tsx',
}

function routeHead(path) {
  const visited = new Set()
  const resources = new Set()
  function visit(key) {
    if (visited.has(key)) return
    visited.add(key)
    const chunk = manifest[key]
    if (!chunk) throw new Error(`Chunk da rota não encontrado: ${key}`)
    for (const dep of chunk.imports ?? []) visit(dep)
    const src = `/${chunk.file}`
    if (!baseHead.includes(`"${src}"`)) resources.add(`<link rel="modulepreload" crossorigin href="${src}">`)
    for (const css of chunk.css ?? []) {
      if (!baseHead.includes(`"/${css}"`)) resources.add(`<link rel="stylesheet" crossorigin href="/${css}">`)
    }
  }
  if (sources[path]) visit(sources[path])
  return `${baseHead}\n${[...resources].join('\n')}`
}

for (const { path } of publicRoutes) {
  const file = path === '/' ? 'index' : path.slice(1)
  await writeFile(`dist/${file}.html`, await render(path, routeHead(path)))
}
// Todas as rotas têm HTML próprio: o 404 não interrompe mais nenhum acesso direto.
await writeFile('dist/404.html', await render('/404', baseHead))
const urls = publicRoutes.map(({ path }) => `  <url><loc>${siteOrigin}${path}</loc></url>`).join('\n')
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
const robots = await readFile('public/robots.txt', 'utf8')
await writeFile('dist/robots.txt', `${robots.trim()}\n\nSitemap: ${siteOrigin}/sitemap.xml\n`)
// Somente normalização das seis rotas conhecidas; não intercepta recursos estáticos.
await writeFile('dist/_redirects', publicRoutes.filter(r => r.path !== '/').map(r => `${r.path}/ ${r.path} 301`).join('\n') + '\n')
console.log(`Pré-renderizadas ${publicRoutes.length} rotas públicas + 404; origem: ${siteOrigin}`)
