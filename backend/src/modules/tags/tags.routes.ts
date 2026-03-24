import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/database'
import { authenticate, requireRole } from '../../middleware/authenticate'
import { notFound } from '../../utils/errors'

export async function tagsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [authenticate] }
  const adminOnly = { preHandler: [authenticate, requireRole('ADMIN')] }

  app.get('/', auth, async () => {
    return prisma.tag.findMany({ orderBy: { name: 'asc' } })
  })

  app.post('/', adminOnly, async (req, reply) => {
    const { name, color } = z
      .object({ name: z.string().min(1), color: z.string().default('#3B82F6') })
      .parse(req.body)

    const tag = await prisma.tag.create({ data: { name, color } })
    return reply.status(201).send(tag)
  })

  app.patch('/:id', adminOnly, async (req) => {
    const { id } = req.params as { id: string }
    const body = z
      .object({ name: z.string().optional(), color: z.string().optional() })
      .parse(req.body)

    return prisma.tag.update({ where: { id }, data: body })
  })

  app.delete('/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string }
    const tag = await prisma.tag.findUnique({ where: { id } })
    if (!tag) throw notFound('Tag')
    await prisma.tag.delete({ where: { id } })
    return reply.status(204).send()
  })
}
