import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { Role } from '@prisma/client'
import { prisma } from '../../config/database'
import { redis } from '../../config/redis'
import { env } from '../../config/env'
import { unauthorized, conflict } from '../../utils/errors'
import type { FastifyInstance } from 'fastify'

export async function loginService(
  app: FastifyInstance,
  email: string,
  password: string,
) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) throw unauthorized('Invalid credentials')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw unauthorized('Invalid credentials')

  const accessToken = app.jwt.sign(
    { sub: user.id, email: user.email, role: user.role, clientAdminId: user.clientAdminId },
    { expiresIn: env.JWT_EXPIRES_IN } as any,
  )

  const refreshToken = crypto.randomBytes(40).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } })

  // Cache refresh token validity in Redis (7 days)
  await redis.setex(`rt:${tokenHash}`, 7 * 24 * 3600, user.id)

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientAdminId: user.clientAdminId,
    },
  }
}

export async function refreshService(app: FastifyInstance, rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

  const cached = await redis.get(`rt:${tokenHash}`)
  if (!cached) throw unauthorized('Invalid or expired refresh token')

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })
  if (!stored || stored.expiresAt < new Date()) throw unauthorized('Session expired')

  const accessToken = app.jwt.sign(
    {
      sub: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
      clientAdminId: stored.user.clientAdminId,
    },
    { expiresIn: env.JWT_EXPIRES_IN } as any,
  )

  return {
    accessToken,
    user: {
      id: stored.user.id,
      email: stored.user.email,
      name: stored.user.name,
      role: stored.user.role,
      clientAdminId: stored.user.clientAdminId,
    },
  }
}

export async function logoutService(rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  await redis.del(`rt:${tokenHash}`)
  await prisma.refreshToken.deleteMany({ where: { tokenHash } })
}

export async function registerService(
  data: { email: string; password: string; name: string; role?: Role; clientAdminId?: string | null }
) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } })
  if (exists) throw conflict('Email already in use')

  const hashed = await bcrypt.hash(data.password, 12)
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashed,
      name: data.name,
      role: data.role ?? 'WORKER',
      clientAdminId: data.clientAdminId ?? null,
    },
    select: { id: true, email: true, name: true, role: true, clientAdminId: true },
  })
  return user
}
