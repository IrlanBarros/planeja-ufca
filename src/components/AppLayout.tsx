import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import ThemeSelector from './ThemeSelector'

export default function AppLayout() {
  return (
    <>
      <div className="appearance-bar">
        <ThemeSelector />
      </div>
      <Outlet />
      <Footer />
    </>
  )
}
