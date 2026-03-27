import { Outlet } from 'react-router-dom'
import { useThemeStore } from '../../store/theme.store'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { useIsMobile } from '../../hooks/useMediaQuery'

export default function AppShell() {
  useThemeStore()
  const isMobile = useIsMobile()

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-50 dark:bg-wa-bg-default">
      {!isMobile && <Sidebar />}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
      {isMobile && <MobileNav />}
    </div>
  )
}
