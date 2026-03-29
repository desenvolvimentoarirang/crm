import { api } from '../config/api'
import type { Conversation, PaginatedResult, ConversationStatus } from '../types'

export const conversationsService = {
  async list(params?: {
    page?: number
    limit?: number
    status?: ConversationStatus
    assignedToId?: string
  }): Promise<PaginatedResult<Conversation>> {
    const { data } = await api.get('/conversations', { params })
    return data
  },

  async get(id: string): Promise<Conversation> {
    const { data } = await api.get(`/conversations/${id}`)
    return data
  },

  async assign(id: string, assignedToId: string | null): Promise<Conversation> {
    const { data } = await api.patch(`/conversations/${id}/assign`, { assignedToId })
    return data
  },

  async updateStatus(id: string, status: ConversationStatus): Promise<Conversation> {
    const { data } = await api.patch(`/conversations/${id}/status`, { status })
    return data
  },

  async start(phone: string, instanceId?: string): Promise<Conversation> {
    const { data } = await api.post('/conversations/start', { phone, instanceId })
    return data
  },

  async stats(): Promise<{
    open: number
    inProgress: number
    resolved: number
    closed: number
    totalMessages: number
  }> {
    const { data } = await api.get('/conversations/stats/summary')
    return data
  },
}
