import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../config/database'
import { authenticate, requireRole } from '../../middleware/authenticate'
import { notFound, conflict } from '../../utils/errors'
import { getPaginationParams, buildPaginatedResult } from '../../utils/pagination'

export async function usersRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: [authenticate, requireRole('ADMIN')] }
  const authOnly = { preHandler: [authenticate] }

  // List users (admin only)
  app.get('/', adminOnly, async (req) => {
    const query = req.query as any
    const { page, limit, skip } = getPaginationParams(query)

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ])

    return buildPaginatedResult(users, total, page, limit)
  })

  // Get user by id
  app.get('/:id', authOnly, async (req) => {
    const { id } = req.params as { id: string }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    })
    if (!user) throw notFound('User')
    return user
  })

  // Create user (admin only)
  app.post('/', adminOnly, async (req, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        role: z.enum(['ADMIN', 'WORKER']).default('WORKER'),
      })
      .parse(req.body)

    const exists = await prisma.user.findUnique({ where: { email: body.email } })
    if (exists) throw conflict('Email already in use')

    const hashed = await bcrypt.hash(body.password, 12)
    const user = await prisma.user.create({
      data: { ...body, password: hashed },
      select: { id: true, email: true, name: true, role: true },
    })
    return reply.status(201).send(user)
  })

  // Update user (admin or self)
  app.patch('/:id', authOnly, async (req) => {
    const { id } = req.params as { id: string }
    const isAdmin = req.user.role === 'ADMIN'
    if (!isAdmin && req.user.id !== id) throw notFound('User')

    const body = z
      .object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        isActive: z.boolean().optional(),
        role: z.enum(['ADMIN', 'WORKER']).optional(),
      })
      .parse(req.body)

    const data: any = { ...body }
    if (body.password) {
      data.password = await bcrypt.hash(body.password, 12)
      delete data.password
      data.password = data.password
    }
    if (!isAdmin) {
      delete data.role
      delete data.isActive
    }

    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })
  })

  // Delete user (admin only)
  app.delete('/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.user.update({ where: { id }, data: { isActive: false } })
    return reply.status(204).send()
  })
}
