import { FastifyInstance } from 'fastify'
import { processWebhookEvent } from './webhooks.service'
import { logger } from '../../utils/logger'

export async function webhooksRoutes(app: FastifyInstance) {
  const handler = async (req: any, reply: any) => {
    try {
      const payload = req.body as any

      // Evolution API with byEvents:true appends the event name to the URL path
      // e.g. POST /api/webhooks/evolution/qrcode-updated
      // Normalise: use payload.event if present, otherwise derive from URL suffix
      if (!payload.event) {
        const suffix = (req.params as any)['*'] as string | undefined
        if (suffix) {
          // convert path suffix to dot notation: qrcode-updated → qrcode.updated
          payload.event = suffix.replace(/-/g, '.')
        }
      }

      setImmediate(() => processWebhookEvent(app, payload).catch(logger.error.bind(logger)))
      return reply.status(200).send({ received: true })
    } catch (err) {
      logger.error(err, 'Webhook processing error')
      return reply.status(200).send({ received: true })
    }
  }

  const opts = { config: { rateLimit: { max: 1000, timeWindow: '1 minute' } } }

  // Catch both /evolution  (byEvents:false)  and /evolution/*  (byEvents:true)
  app.post('/evolution', opts, handler)
  app.post('/evolution/*', opts, handler)
}
