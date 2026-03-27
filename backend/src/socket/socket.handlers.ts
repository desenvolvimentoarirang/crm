import { Server, Socket } from 'socket.io'
import { logger } from '../utils/logger'

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    logger.debug({ socketId: socket.id }, 'Client connected')

    // Join scope room for multi-tenant isolation
    socket.on('scope:join', (scopeId: string) => {
      if (scopeId) {
        socket.join(`scope:${scopeId}`)
        logger.debug({ socketId: socket.id, scopeId }, 'Joined scope room')
      }
    })

    // Join a conversation room to receive real-time messages
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`)
      logger.debug({ socketId: socket.id, conversationId }, 'Joined conversation room')
    })

    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`)
    })

    // Typing indicators
    socket.on('typing:start', ({ conversationId, userName }: { conversationId: string; userName: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', { conversationId, userName })
    })

    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { conversationId })
    })

    // Agent presence
    socket.on('agent:online', (userId: string) => {
      socket.join(`agent:${userId}`)
      io.emit('agent:status', { userId, online: true })
    })

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'Client disconnected')
    })
  })
}
