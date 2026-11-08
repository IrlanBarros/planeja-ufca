import { StrictMode } from 'react'
import { prerenderToNodeStream } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import AppRoutes from './AppRoutes'
import ThemeProvider from './theme/ThemeProvider'
import HistoricoProvider from './features/historico/hooks/HistoricoProvider'
import { routePages } from './routePages'
export { publicRoutes } from './seo/routes'
export { siteOrigin } from './seo/config'

// Executado somente pelo build Node, sem navegador, IndexedDB ou perfis reais.
// head contém apenas o template local e os recursos com hash gerados pelo Vite.
export async function render(url: string, head: string) {
  const route = routePages.find(route => route.path === url)
  const initialPage = route ? { path: route.path, Component: (await route.load()).default } : undefined
  const { prelude } = await prerenderToNodeStream(<html lang="pt-BR">
    <head dangerouslySetInnerHTML={{ __html: head }} />
    <body><div id="root"><StrictMode><ThemeProvider><HistoricoProvider>
      <StaticRouter location={url}><AppRoutes initialPage={initialPage} /></StaticRouter>
    </HistoricoProvider></ThemeProvider></StrictMode></div></body>
  </html>, {
    // Mesmo o guia extenso deve sair visível no HTML, sem segmentos ocultos
    // que precisariam de um script de streaming para substituir o fallback.
    progressiveChunkSize: Number.MAX_SAFE_INTEGER,
    onError(error) { throw error },
  })
  let html = ''
  for await (const chunk of prelude) html += chunk
  return html
}
