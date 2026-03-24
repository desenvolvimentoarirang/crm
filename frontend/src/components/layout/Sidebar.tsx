import { NavLink, useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  Smartphone,
  LogOut,
  User,
  BookUser,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { authService } from '../../services/auth.service'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/conversations', label: 'Conversations', icon: MessageSquare },
  { to: '/contacts', label: 'Contacts', icon: BookUser },
]

const ADMIN_NAV_ITEMS = [
  { to: '/users', label: 'Team', icon: Users },
  { to: '/instances', label: 'WhatsApp', icon: Smartphone },
]

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authService.logout()
    } finally {
      logout()
      navigate('/login')
      toast.success('Logged out')
    }
  }

  return (
    <aside className="w-16 xl:w-56 bg-gray-900 flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <MessageSquare size={16} className="text-white" />
        </div>
        <span className="hidden xl:block font-bold text-white text-sm">CRM Chat</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                isActive
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            <span className="hidden xl:block text-sm font-medium">{label}</span>
          </NavLink>
        ))}

        {user?.role === 'ADMIN' && (
          <>
            <div className="px-3 pt-4 pb-1">
              <span className="hidden xl:block text-xs font-medium text-gray-600 uppercase tracking-wider">
                Admin
              </span>
              <div className="xl:hidden h-px bg-gray-800 mx-auto w-6" />
            </div>
            {ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                  )
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="hidden xl:block text-sm font-medium">{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User info + Logout */}
      <div className="border-t border-gray-800 p-3">
        <div className="flex items-center gap-3 mb-2 px-1">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-gray-300" />
          </div>
          <div className="hidden xl:block min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <LogOut size={16} className="flex-shrink-0" />
          <span className="hidden xl:block text-sm">Logout</span>
        </button>
      </div>
    </aside>
  )
}
