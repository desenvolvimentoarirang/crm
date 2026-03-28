import { Outlet, useParams, useMatch } from 'react-router-dom'
import { useThemeStore } from '../../store/theme.store'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { useIsMobile } from '../../hooks/useMediaQuery'

export default function AppShell() {
  useThemeStore()
  const isMobile = useIsMobile()
  // Hide bottom nav when viewing a specific conversation on mobile (full-screen chat)
  const isInChat = useMatch('/conversations/:id')
  const hideMobileNav = isMobile && !!isInChat

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-50 dark:bg-wa-bg-default">
      {!isMobile && <Sidebar />}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
      {isMobile && !hideMobileNav && <MobileNav />}
    </div>
  )
}
