import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { loginService, refreshService, logoutService } from './auth.service'
import { authenticate } from '../../middleware/authenticate'

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', examples: ['admin@crm.com'] },
      password: { type: 'string', minLength: 6, examples: ['admin123'] },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  },
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', { schema: loginSchema }, async (req, reply) => {
    const { email, password } = loginBody.parse(req.body)
    const result = await loginService(app, email, password)

    reply.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600,
      path: '/api/auth',
    })

    return reply.send({ accessToken: result.accessToken, user: result.user })
  })

  app.post('/refresh', async (req, reply) => {
    const rawToken = req.cookies?.refreshToken
    if (!rawToken) return reply.status(401).send({ error: 'No refresh token' })
    const result = await refreshService(app, rawToken)
    return reply.send(result)
  })

  app.post('/logout', { preHandler: [authenticate] }, async (req, reply) => {
    const rawToken = req.cookies?.refreshToken
    if (rawToken) await logoutService(rawToken)
    reply.clearCookie('refreshToken', { path: '/api/auth' })
    return reply.send({ message: 'Logged out' })
  })

  app.get(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      return reply.send({ user: req.user })
    },
  )
}
