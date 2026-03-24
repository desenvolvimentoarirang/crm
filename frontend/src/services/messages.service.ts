import { api } from '../config/api'
import type { Message } from '../types'

export const messagesService = {
  async list(conversationId: string, page = 1): Promise<{
    messages: Message[]
    total: number
    hasMore: boolean
  }> {
    const { data } = await api.get(`/messages/conversation/${conversationId}`, {
      params: { page, limit: 50 },
    })
    return data
  },

  async send(conversationId: string, text: string): Promise<Message> {
    const { data } = await api.post('/messages/send', { conversationId, text, type: 'TEXT' })
    return data
  },
}
