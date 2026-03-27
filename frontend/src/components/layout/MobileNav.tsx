import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, BookUser, Users, Settings } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { isAdminRole } from '../../utils/roles'
import clsx from 'clsx'

export default function MobileNav() {
  const user = useAuthStore((s) => s.user)
  const showAdmin = user && isAdminRole(user.role)

  const items = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/conversations', icon: MessageSquare, label: 'Chats' },
    { to: '/contacts', icon: BookUser, label: 'Contacts' },
    ...(showAdmin ? [{ to: '/users', icon: Users, label: 'Team' }] : []),
  ]

  return (
    <nav className="flex items-center justify-around bg-white dark:bg-wa-bg-deep border-t border-gray-200 dark:border-wa-border px-2 py-1 flex-shrink-0 safe-area-pb">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs transition-colors min-w-[3rem]',
              isActive
                ? 'text-wa-accent'
                : 'text-gray-500 dark:text-wa-text-secondary',
            )
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
