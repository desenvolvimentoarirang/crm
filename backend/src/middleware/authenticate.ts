import { FastifyRequest, FastifyReply } from 'fastify'
import { Role } from '@prisma/client'
import { prisma } from '../config/database'
import { unauthorized } from '../utils/errors'
import { getScope } from '../utils/roles'

export interface JwtPayload {
  sub: string
  email: string
  role: string
  clientAdminId?: string | null
  iat: number
  exp: number
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<JwtPayload>()
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true, clientAdminId: true },
    })
    if (!user || !user.isActive) {
      return reply.status(401).send(unauthorized('Account inactive or not found'))
    }
    request.user = user
    request.scope = getScope(user)
  } catch {
    return reply.status(401).send(unauthorized())
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Insufficient permissions' })
    }
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string
      email: string
      name: string
      role: Role
      isActive: boolean
      clientAdminId: string | null
    }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    scope: string | null
  }
}
