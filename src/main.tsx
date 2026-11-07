import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AppLayout from './components/AppLayout'
import ThemeProvider from './theme/ThemeProvider'
import CurriculoPage
  from './pages/CurriculoPage.tsx'
import HistoricoPage from './pages/HistoricoPage'
import PrivacidadePage from './pages/PrivacidadePage'
import HistoricoProvider from './features/historico/hooks/HistoricoProvider'

createRoot(
  document.getElementById('root')!,
).render(
  <StrictMode>
    <ThemeProvider>
      <HistoricoProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<App />} />
            <Route path="/curriculo" element={<CurriculoPage />} />
            <Route path="/historico" element={<HistoricoPage />} />
            <Route path="/privacidade" element={<PrivacidadePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </HistoricoProvider>
    </ThemeProvider>
  </StrictMode>,
)
