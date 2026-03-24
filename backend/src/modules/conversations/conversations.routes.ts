import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { notFound, forbidden } from '../../utils/errors'
import { getPaginationParams, buildPaginatedResult } from '../../utils/pagination'

export async function conversationsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [authenticate] }

  app.get('/', auth, async (req) => {
    const query = req.query as any
    const { page, limit, skip } = getPaginationParams(query)

    const where: any = {}
    if (query.status) where.status = query.status
    if (query.assignedToId) where.assignedToId = query.assignedToId
    if (query.instanceId) where.instanceId = query.instanceId
    if (req.user.role === 'WORKER') {
      where.OR = [{ assignedToId: req.user.id }, { assignedToId: null }]
    }

    const [conversations, total] = await prisma.$transaction([
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        include: {
          contact: { include: { tags: { include: { tag: true } } } },
          assignedTo: { select: { id: true, name: true, email: true } },
          instance: { select: { id: true, name: true, displayName: true } },
          messages: {
            take: 1,
            orderBy: { timestamp: 'desc' },
            select: { body: true, type: true, direction: true, timestamp: true },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
      prisma.conversation.count({ where }),
    ])

    return buildPaginatedResult(conversations, total, page, limit)
  })

  app.get('/:id', auth, async (req) => {
    const { id } = req.params as { id: string }
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: { include: { tags: { include: { tag: true } } } },
        assignedTo: { select: { id: true, name: true, email: true } },
        instance: true,
      },
    })
    if (!conv) throw notFound('Conversation')
    if (req.user.role === 'WORKER' && conv.assignedToId && conv.assignedToId !== req.user.id) {
      throw forbidden()
    }
    // Reset unread count
    await prisma.conversation.update({ where: { id }, data: { unreadCount: 0 } })
    return { ...conv, unreadCount: 0 }
  })

  app.patch('/:id/assign', auth, async (req) => {
    const { id } = req.params as { id: string }
    const { assignedToId } = z
      .object({ assignedToId: z.string().nullable() })
      .parse(req.body)

    const conv = await prisma.conversation.update({
      where: { id },
      data: {
        assignedToId,
        status: assignedToId ? 'IN_PROGRESS' : 'OPEN',
      },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true } },
      },
    })

    // Broadcast via socket
    app.io.to(`conversation:${id}`).emit('conversation:updated', conv)
    app.io.emit('conversations:refresh')

    return conv
  })

  app.patch('/:id/status', auth, async (req) => {
    const { id } = req.params as { id: string }
    const { status } = z
      .object({
        status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
      })
      .parse(req.body)

    const conv = await prisma.conversation.update({
      where: { id },
      data: { status },
      include: { contact: true, assignedTo: { select: { id: true, name: true } } },
    })

    app.io.to(`conversation:${id}`).emit('conversation:updated', conv)
    app.io.emit('conversations:refresh')

    return conv
  })

  // Stats (admin only)
  app.get('/stats/summary', auth, async (req) => {
    if (req.user.role !== 'ADMIN') throw forbidden()

    const [open, inProgress, resolved, closed, totalMessages] = await prisma.$transaction([
      prisma.conversation.count({ where: { status: 'OPEN' } }),
      prisma.conversation.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.conversation.count({ where: { status: 'RESOLVED' } }),
      prisma.conversation.count({ where: { status: 'CLOSED' } }),
      prisma.message.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      }),
    ])

    return { open, inProgress, resolved, closed, totalMessages }
  })
}
