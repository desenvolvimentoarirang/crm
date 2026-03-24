import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { authenticate, requireRole } from '../../middleware/authenticate'
import { baileysManager } from '../../services/baileys.service'
import { logger } from '../../utils/logger'

export async function instancesRoutes(app: FastifyInstance) {
  const auth = { preHandler: [authenticate] }
  const adminOnly = { preHandler: [authenticate, requireRole('ADMIN')] }

  // ─── List instances ───────────────────────────────────────────────────────
  app.get('/', auth, async () => {
    const instances = await prisma.whatsAppInstance.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    return instances.map((inst) => ({
      ...inst,
      liveStatus: baileysManager.getStatus(inst.name),
    }))
  })

  // ─── Create instance ─────────────────────────────────────────────────────
  app.post('/', { ...adminOnly, schema: {
    body: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1 },
        displayName: { type: 'string' },
      },
    },
  } }, async (req, reply) => {
    const { name, displayName } = z
      .object({ name: z.string().min(1), displayName: z.string().optional() })
      .parse(req.body)

    const instance = await prisma.whatsAppInstance.upsert({
      where: { name },
      update: { displayName },
      create: { name, displayName },
    })

    // Start Baileys session in background (QR code arrives via socket event)
    baileysManager.createSession(name).catch((err) => {
      logger.error({ name, err: err.message }, 'Failed to start Baileys session')
    })

    return reply.status(201).send(instance)
  })

  // ─── QR Code ──────────────────────────────────────────────────────────────
  app.get('/:name/qr', auth, async (req, reply) => {
    const { name } = req.params as { name: string }

    const qr = await baileysManager.getQR(name)
    if (qr) {
      return reply.send({ qrCode: qr, cached: true })
    }

    // If no QR and no session, try starting one
    const status = baileysManager.getStatus(name)
    if (status === 'disconnected') {
      await baileysManager.createSession(name)
      // Wait a moment for QR to generate
      await new Promise((r) => setTimeout(r, 2000))
      const newQr = await baileysManager.getQR(name)
      if (newQr) {
        return reply.send({ qrCode: newQr, cached: false })
      }
    }

    return reply.send({ qrCode: null, status: 'connecting' })
  })

  // ─── Connect ──────────────────────────────────────────────────────────────
  app.post('/:name/connect', adminOnly, async (req, reply) => {
    const { name } = req.params as { name: string }
    await baileysManager.createSession(name)
    return reply.send({ message: 'Connection initiated — scan the QR code' })
  })

  // ─── Status ───────────────────────────────────────────────────────────────
  app.get('/:name/status', auth, async (req) => {
    const { name } = req.params as { name: string }
    const dbInstance = await prisma.whatsAppInstance.findUnique({ where: { name } })
    return { state: dbInstance?.status ?? 'not_created' }
  })

  // ─── Delete ───────────────────────────────────────────────────────────────
  app.delete('/:name', adminOnly, async (req, reply) => {
    const { name } = req.params as { name: string }
    const instance = await prisma.whatsAppInstance.findUnique({ where: { name } })
    if (!instance) return reply.status(404).send({ error: 'Instance not found' })

    await baileysManager.deleteSession(name)
    await prisma.whatsAppInstance.update({ where: { name }, data: { isActive: false } })

    return reply.status(204).send()
  })
}
