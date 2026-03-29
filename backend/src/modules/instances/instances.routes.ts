import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { authenticate, requireRole } from '../../middleware/authenticate'
import { baileysManager } from '../../services/baileys.service'
import { logger } from '../../utils/logger'

export async function instancesRoutes(app: FastifyInstance) {
  const auth = { preHandler: [authenticate] }
  const adminOnly = { preHandler: [authenticate, requireRole('SUPER_ADMIN', 'CLIENT_ADMIN')] }

  // ─── List instances ───────────────────────────────────────────────────────
  app.get('/', auth, async (req) => {
    const where: any = { isActive: true }

    if (req.user.role === 'CLIENT_ADMIN') {
      where.clientAdminId = req.user.id
    } else if (req.user.role === 'WORKER' || req.user.role === 'WORKER_TRUST') {
      where.clientAdminId = req.scope
    }
    // SUPER_ADMIN sees all

    const instances = await prisma.whatsAppInstance.findMany({
      where,
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
        clientAdminId: { type: 'string' },
      },
    },
  } }, async (req, reply) => {
    const { name, displayName, clientAdminId } = z
      .object({ name: z.string().min(1), displayName: z.string().optional(), clientAdminId: z.string().optional() })
      .parse(req.body)

    // CLIENT_ADMIN always owns their instances
    const ownerId = req.user.role === 'CLIENT_ADMIN' ? req.user.id : (clientAdminId ?? null)

    const instance = await prisma.whatsAppInstance.upsert({
      where: { name },
      update: { displayName, clientAdminId: ownerId },
      create: { name, displayName, clientAdminId: ownerId },
    })

    // Start Baileys session in background
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

    const status = baileysManager.getStatus(name)
    if (status === 'disconnected') {
      await baileysManager.createSession(name)
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

  // ─── Groups ─────────────────────────────────────────────────────────────
  app.get('/:name/groups', auth, async (req, reply) => {
    const { name } = req.params as { name: string }
    try {
      const groups = await baileysManager.fetchGroups(name)
      return groups
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // ─── Delete ───────────────────────────────────────────────────────────────
  app.delete('/:name', adminOnly, async (req, reply) => {
    const { name } = req.params as { name: string }
    const instance = await prisma.whatsAppInstance.findUnique({ where: { name } })
    if (!instance) return reply.status(404).send({ error: 'Instance not found' })

    // Scope check
    if (req.user.role === 'CLIENT_ADMIN' && instance.clientAdminId !== req.user.id) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not your instance' })
    }

    await baileysManager.deleteSession(name)
    await prisma.whatsAppInstance.update({ where: { name }, data: { isActive: false } })

    return reply.status(204).send()
  })
}
