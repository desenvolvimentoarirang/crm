export type Role = 'ADMIN' | 'WORKER'
export type ConversationStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'STICKER'
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
export type MessageDirection = 'INBOUND' | 'OUTBOUND'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Contact {
  id: string
  phone: string
  name?: string
  pushName?: string
  email?: string
  profilePic?: string
  notes?: string
  createdAt: string
  tags: { tag: Tag }[]
}

export interface WhatsAppInstance {
  id: string
  name: string
  displayName?: string
  phone?: string
  status: string
  liveStatus?: string
  isActive: boolean
}

export interface Message {
  id: string
  conversationId: string
  evolutionId?: string
  direction: MessageDirection
  type: MessageType
  body?: string
  mediaUrl?: string
  mimeType?: string
  fileName?: string
  status: MessageStatus
  timestamp: string
  createdAt: string
}

export interface Conversation {
  id: string
  contactId: string
  contact: Contact
  instanceId?: string
  instance?: WhatsAppInstance
  assignedToId?: string
  assignedTo?: Pick<User, 'id' | 'name' | 'email'>
  status: ConversationStatus
  unreadCount: number
  lastMessageAt?: string
  messages?: Message[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
}
