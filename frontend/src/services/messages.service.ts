import { api } from '../config/api'
import type { Message, MessageType } from '../types'

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

  async upload(file: File): Promise<{ url: string; fileName: string; mimeType: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async sendMedia(conversationId: string, opts: {
    type: MessageType
    mediaUrl: string
    fileName?: string
    mimeType?: string
    caption?: string
  }): Promise<Message> {
    const { data } = await api.post('/messages/send', {
      conversationId,
      type: opts.type,
      mediaUrl: opts.mediaUrl,
      fileName: opts.fileName,
      mimeType: opts.mimeType,
      text: opts.caption,
    })
    return data
  },
}
