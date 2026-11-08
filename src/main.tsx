import { StrictMode } from 'react'
import type { ComponentType } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import AppRoutes from './AppRoutes'
import ThemeProvider from './theme/ThemeProvider'
import HistoricoProvider from './features/historico/hooks/HistoricoProvider'
import { routePages } from './routePages'

const application = (initialPage?: { path: string; Component: ComponentType }) => (
  <StrictMode>
    <ThemeProvider>
      <HistoricoProvider>
        <BrowserRouter>
          <AppRoutes initialPage={initialPage} />
        </BrowserRouter>
      </HistoricoProvider>
    </ThemeProvider>
  </StrictMode>
)

const root = document.getElementById('root')!
if (root.hasChildNodes()) {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const route = routePages.find(route => route.path === path)
  // Conserva o HTML visível enquanto o módulo da rota inicial é carregado.
  if (route) void route.load().then(
    module => hydrateRoot(root, application({ path, Component: module.default })),
    () => hydrateRoot(root, application()), // A barreira da rota oferece recuperação.
  )
  else hydrateRoot(root, application())
} else createRoot(root).render(application())
