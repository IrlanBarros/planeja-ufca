import { useLocation } from 'react-router-dom'
import Footer from './Footer'
import ThemeSelector from './ThemeSelector'
import HorariosProvider from '../features/horarios/HorariosProvider'
import Seo from '../seo/Seo'
import RouteContent from './RouteContent'

export default function AppLayout() {
  const { pathname } = useLocation()
  return (
    <>
      <Seo />
      <div className="appearance-bar">
        <ThemeSelector />
      </div>
      <HorariosProvider><RouteContent key={pathname} /></HorariosProvider>
      <Footer />
    </>
  )
}
