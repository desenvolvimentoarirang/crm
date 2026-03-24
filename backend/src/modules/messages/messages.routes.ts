import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { notFound } from '../../utils/errors'
import { baileysManager } from '../../services/baileys.service'
import { getPaginationParams } from '../../utils/pagination'

export async function messagesRoutes(app: FastifyInstance) {
  const auth = { preHandler: [authenticate] }

  // Get messages for a conversation (paginated, newest first)
  app.get('/conversation/:conversationId', auth, async (req) => {
    const { conversationId } = req.params as { conversationId: string }
    const query = req.query as any
    const { limit, skip } = getPaginationParams({ page: query.page, limit: query.limit ?? 50 })

    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conv) throw notFound('Conversation')

    const [messages, total] = await prisma.$transaction([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.message.count({ where: { conversationId } }),
    ])

    return { messages: messages.reverse(), total, hasMore: skip + limit < total }
  })

  // Send message
  app.post('/send', auth, async (req, reply) => {
    const body = z
      .object({
        conversationId: z.string(),
        text: z.string().min(1).optional(),
        mediaUrl: z.string().url().optional(),
        type: z.enum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT']).default('TEXT'),
      })
      .parse(req.body)

    const conv = await prisma.conversation.findUnique({
      where: { id: body.conversationId },
      include: { contact: true, instance: true },
    })
    if (!conv) throw notFound('Conversation')

    // Send via Baileys
    let evolutionId: string | undefined
    try {
      const response = await baileysManager.sendText(
        conv.instance?.name ?? 'default',
        conv.contact.phone,
        body.text ?? '',
      )
      evolutionId = response?.key?.id
    } catch (err) {
      console.error('Baileys send failed:', err)
    }

    const message = await prisma.message.create({
      data: {
        conversationId: body.conversationId,
        direction: 'OUTBOUND',
        type: body.type as any,
        body: body.text,
        mediaUrl: body.mediaUrl,
        evolutionId,
        status: evolutionId ? 'SENT' : 'PENDING',
        timestamp: new Date(),
      },
    })

    await prisma.conversation.update({
      where: { id: body.conversationId },
      data: { lastMessageAt: new Date() },
    })

    // Broadcast to room
    app.io.to(`conversation:${body.conversationId}`).emit('message:new', message)

    return reply.status(201).send(message)
  })
}
