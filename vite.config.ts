import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { publicRoutes } from './src/seo/routes.ts'

// https://vite.dev/config/
export default defineConfig(({ isPreview }) => ({
  appType: isPreview ? 'mpa' : 'spa',
  plugins: [react(), {
    name: 'static-pages-preview',
    configurePreviewServer(server) {
      // Reproduz localmente a normalização e o 404 estático do Pages.
      // Não é incluído no site publicado e não adiciona um servidor à aplicação.
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const normalized = url.pathname.replace(/\/+$/, '')
        if (url.pathname.endsWith('/') && publicRoutes.some(r => r.path === normalized)) {
          res.writeHead(301, { Location: normalized + url.search }); res.end(); return
        }
        next()
      })
      return () => server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0].endsWith('.html')) return next()
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(readFileSync(resolve(server.config.root, server.config.build.outDir, '404.html')))
      })
    },
  }],
  build: { manifest: true },
}))
