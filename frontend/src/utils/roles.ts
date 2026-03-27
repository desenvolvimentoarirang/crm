import type { Role } from '../types'

export function isSuperAdmin(role: Role): boolean {
  return role === 'SUPER_ADMIN'
}

export function isClientAdmin(role: Role): boolean {
  return role === 'CLIENT_ADMIN'
}

export function isAdminRole(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'CLIENT_ADMIN'
}

export function canManageUsers(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'CLIENT_ADMIN'
}

export function canSeeAllConversations(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'CLIENT_ADMIN' || role === 'WORKER_TRUST'
}

export function canAssignConversations(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'CLIENT_ADMIN' || role === 'WORKER_TRUST'
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    SUPER_ADMIN: 'Super Admin',
    CLIENT_ADMIN: 'Admin',
    WORKER: 'Agent',
    WORKER_TRUST: 'Senior Agent',
  }
  return labels[role] ?? role
}

export function getRoleBadgeColor(role: Role): string {
  const colors: Record<Role, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    CLIENT_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    WORKER_TRUST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    WORKER: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400',
  }
  return colors[role] ?? 'bg-gray-100 text-gray-700'
}

export function getScope(user: { role: Role; id: string; clientAdminId?: string | null }): string | null {
  if (user.role === 'SUPER_ADMIN') return null
  if (user.role === 'CLIENT_ADMIN') return user.id
  return user.clientAdminId ?? null
}
