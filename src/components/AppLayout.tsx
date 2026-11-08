import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import ThemeSelector from './ThemeSelector'
import HorariosProvider from '../features/horarios/HorariosProvider'

export default function AppLayout() {
  return (
    <>
      <div className="appearance-bar">
        <ThemeSelector />
      </div>
      <HorariosProvider><Outlet /></HorariosProvider>
      <Footer />
    </>
  )
}
