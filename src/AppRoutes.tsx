import type { ComponentType } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import NotFoundPage from './pages/NotFoundPage'
import { routePages } from './routePages'

export default function AppRoutes({ initialPage }: { initialPage?: { path: string; Component: ComponentType } } = {}) {
  return <Routes>
    <Route element={<AppLayout />}>
      {routePages.map(({ path, Page }) => <Route key={path} caseSensitive path={path} element={initialPage?.path === path ? <initialPage.Component /> : <Page />} />)}
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
}
