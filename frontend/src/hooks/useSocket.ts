import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { connectSocket, disconnectSocket, getSocket } from '../config/socket'
import { useAuthStore } from '../store/auth.store'
import { useConversationStore } from '../store/conversation.store'
import { getScope } from '../utils/roles'
import type { Conversation, Message } from '../types'

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const upsertConversation = useConversationStore((s) => s.upsertConversation)
  const activeId = useConversationStore((s) => s.activeConversationId)
  const appendMessage = useConversationStore((s) => s.appendMessage)
  const incrementUnread = useConversationStore((s) => s.incrementUnread)
  const qc = useQueryClient()

  useEffect(() => {
    if (!accessToken) return

    const socket = connectSocket(accessToken)

    socket.on('connect', () => {
      if (user?.id) socket.emit('agent:online', user.id)
      // Join scope room for multi-tenant isolation
      if (user) {
        const scope = getScope(user)
        if (scope) socket.emit('scope:join', scope)
      }
    })

    socket.on('message:new', (message: Message) => {
      appendMessage(message.conversationId, message)
      if (message.conversationId !== activeId) {
        incrementUnread(message.conversationId)
      }
    })

    socket.on('conversation:updated', (conversation: Conversation) => {
      upsertConversation(conversation)
      // Also invalidate the single conversation query so detail/header refresh immediately
      qc.invalidateQueries({ queryKey: ['conversation', conversation.id] })
    })

    socket.on('conversations:refresh', () => {
      // Trigger a refetch by invalidating - handled by the ConversationsPage query
      window.dispatchEvent(new CustomEvent('conversations:refresh'))
    })

    return () => {
      disconnectSocket()
    }
  }, [accessToken])

  return getSocket()
}
