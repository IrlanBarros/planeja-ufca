import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import AppRoutes from './AppRoutes'
import ThemeProvider from './theme/ThemeProvider'
import HistoricoProvider from './features/historico/hooks/HistoricoProvider'

createRoot(
  document.getElementById('root')!,
).render(
  <StrictMode>
    <ThemeProvider>
      <HistoricoProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </HistoricoProvider>
    </ThemeProvider>
  </StrictMode>,
)
