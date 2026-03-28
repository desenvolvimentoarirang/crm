import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../config/database'
import { authenticate, requireRole } from '../../middleware/authenticate'
import { notFound, conflict, forbidden } from '../../utils/errors'
import { getPaginationParams, buildPaginatedResult } from '../../utils/pagination'
import { isAdminRole, canManageRole, getCreatableRoles } from '../../utils/roles'

export async function usersRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: [authenticate, requireRole('SUPER_ADMIN', 'CLIENT_ADMIN')] }
  const authOnly = { preHandler: [authenticate] }

  // List users (admin roles only)
  app.get('/', adminOnly, async (req) => {
    const query = req.query as any
    const { page, limit, skip } = getPaginationParams(query)

    const where: any = {}

    // Allow filtering by isActive (default: show all)
    if (query.isActive === 'true') where.isActive = true
    else if (query.isActive === 'false') where.isActive = false

    if (req.user.role === 'SUPER_ADMIN') {
      // Optional filter by clientAdminId
      if (query.clientAdminId) where.clientAdminId = query.clientAdminId
    } else if (req.user.role === 'CLIENT_ADMIN') {
      // Only see own team members
      where.clientAdminId = req.user.id
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true, email: true, name: true, role: true,
          isActive: true, clientAdminId: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    return buildPaginatedResult(users, total, page, limit)
  })

  // Get user by id
  app.get('/:id', authOnly, async (req) => {
    const { id } = req.params as { id: string }
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, clientAdminId: true, createdAt: true,
      },
    })
    if (!user) throw notFound('User')

    // Scope check: non-super-admins can only see users in their scope or themselves
    if (req.user.role !== 'SUPER_ADMIN' && req.user.id !== id) {
      if (req.user.role === 'CLIENT_ADMIN' && user.clientAdminId !== req.user.id) throw forbidden()
      if ((req.user.role === 'WORKER' || req.user.role === 'WORKER_TRUST') && user.id !== req.user.id) throw forbidden()
    }

    return user
  })

  // Create user (admin roles only)
  app.post('/', adminOnly, async (req, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        role: z.enum(['SUPER_ADMIN', 'CLIENT_ADMIN', 'WORKER', 'WORKER_TRUST']).default('WORKER'),
        clientAdminId: z.string().optional(),
      })
      .parse(req.body)

    // Validate role creation permission
    const creatableRoles = getCreatableRoles(req.user.role)
    if (!creatableRoles.includes(body.role as any)) {
      throw forbidden(`Cannot create user with role ${body.role}`)
    }

    // CLIENT_ADMIN can only create users under themselves
    let clientAdminId: string | null = null
    if (req.user.role === 'CLIENT_ADMIN') {
      if (body.role === 'WORKER' || body.role === 'WORKER_TRUST') {
        clientAdminId = req.user.id
      }
    } else if (req.user.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN: CLIENT_ADMIN has no parent, workers need a clientAdminId
      if (body.role === 'WORKER' || body.role === 'WORKER_TRUST') {
        clientAdminId = body.clientAdminId ?? null
      }
    }

    const exists = await prisma.user.findUnique({ where: { email: body.email } })
    if (exists) throw conflict('Email already in use')

    const hashed = await bcrypt.hash(body.password, 12)
    const user = await prisma.user.create({
      data: { email: body.email, password: hashed, name: body.name, role: body.role as any, clientAdminId },
      select: { id: true, email: true, name: true, role: true, clientAdminId: true },
    })
    return reply.status(201).send(user)
  })

  // Update user (admin or self)
  app.patch('/:id', authOnly, async (req) => {
    const { id } = req.params as { id: string }
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) throw notFound('User')

    // Scope check
    if (req.user.role === 'CLIENT_ADMIN' && target.clientAdminId !== req.user.id && target.id !== req.user.id) {
      throw forbidden()
    }
    if ((req.user.role === 'WORKER' || req.user.role === 'WORKER_TRUST') && req.user.id !== id) {
      throw forbidden()
    }

    const body = z
      .object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        isActive: z.boolean().optional(),
        role: z.enum(['SUPER_ADMIN', 'CLIENT_ADMIN', 'WORKER', 'WORKER_TRUST']).optional(),
      })
      .parse(req.body)

    const data: any = { ...body }
    if (body.password) {
      data.password = await bcrypt.hash(body.password, 12)
    }

    // Non-admin users can only update their own name/password
    if (!isAdminRole(req.user.role)) {
      delete data.role
      delete data.isActive
    }

    // Validate role changes
    if (data.role && !canManageRole(req.user.role, data.role)) {
      throw forbidden(`Cannot assign role ${data.role}`)
    }

    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true, clientAdminId: true },
    })
  })

  // Delete user (admin only, soft delete)
  app.delete('/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string }
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) throw notFound('User')

    // Scope check
    if (req.user.role === 'CLIENT_ADMIN' && target.clientAdminId !== req.user.id) {
      throw forbidden()
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } })
    return reply.status(204).send()
  })
}
