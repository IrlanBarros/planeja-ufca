import { readFile, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { JSDOM } from 'jsdom'
import { publicRoutes } from '../dist-ssr/entry-server.js'

const report = []
for (const { path } of publicRoutes) {
  const html = await readFile(`dist/${path === '/' ? 'index' : path.slice(1)}.html`, 'utf8')
  const document = new JSDOM(html).window.document
  const scripts = [...new Set([...document.querySelectorAll('script[src], link[rel="modulepreload"]')].map(n => n.getAttribute('src') ?? n.getAttribute('href')))]
  const styles = [...new Set([...document.querySelectorAll('link[rel="stylesheet"]')].map(n => n.getAttribute('href')))]
  const resources = await Promise.all([...scripts, ...styles].map(async file => {
    const data = await readFile(`dist${file}`)
    return { file, bytes: (await stat(`dist${file}`)).size, gzip: gzipSync(data, { level: 9 }).length }
  }))
  const js = resources.filter(r => scripts.includes(r.file))
  const css = resources.filter(r => styles.includes(r.file))
  report.push({ path, html: Buffer.byteLength(html), js: js.reduce((sum, r) => sum + r.bytes, 0), jsGzip: js.reduce((sum, r) => sum + r.gzip, 0), jsRequests: js.length, css: css.reduce((sum, r) => sum + r.bytes, 0), cssRequests: css.length, resources })
}
console.log(JSON.stringify(report, null, 2))
