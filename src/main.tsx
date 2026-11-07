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

createRoot(
  document.getElementById('root')!,
).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<App />} />
            <Route path="/curriculo" element={<CurriculoPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
