import { Route, Routes } from 'react-router-dom'
import App from './App'
import AppLayout from './components/AppLayout'
import CurriculoPage from './pages/CurriculoPage'
import HistoricoPage from './pages/HistoricoPage'
import PrivacidadePage from './pages/PrivacidadePage'
import GuiaAcademicoPage from './pages/GuiaAcademicoPage'
import RecomendacoesPage from './pages/RecomendacoesPage'

export default function AppRoutes() {
  return <Routes>
    <Route element={<AppLayout />}>
      <Route path="/" element={<App />} />
      <Route path="/curriculo" element={<CurriculoPage />} />
      <Route path="/historico" element={<HistoricoPage />} />
      <Route path="/privacidade" element={<PrivacidadePage />} />
      <Route path="/guia-academico" element={<GuiaAcademicoPage />} />
      <Route path="/recomendacoes" element={<RecomendacoesPage />} />
    </Route>
  </Routes>
}
