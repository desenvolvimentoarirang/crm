import { Role } from '@prisma/client'

const HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 4,
  CLIENT_ADMIN: 3,
  WORKER_TRUST: 2,
  WORKER: 1,
}

export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  return HIERARCHY[actorRole] > HIERARCHY[targetRole]
}

export function isAdminRole(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'CLIENT_ADMIN'
}

export function getCreatableRoles(role: Role): Role[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return ['CLIENT_ADMIN', 'WORKER', 'WORKER_TRUST']
    case 'CLIENT_ADMIN':
      return ['WORKER', 'WORKER_TRUST']
    default:
      return []
  }
}

export function canSeeAllConversations(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'CLIENT_ADMIN' || role === 'WORKER_TRUST'
}

export function getScope(user: { role: Role; id: string; clientAdminId: string | null }): string | null {
  if (user.role === 'SUPER_ADMIN') return null
  if (user.role === 'CLIENT_ADMIN') return user.id
  return user.clientAdminId
}
