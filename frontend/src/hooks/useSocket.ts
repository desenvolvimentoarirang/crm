import { useEffect } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '../config/socket'
import { useAuthStore } from '../store/auth.store'
import { useConversationStore } from '../store/conversation.store'
import type { Conversation, Message } from '../types'

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const upsertConversation = useConversationStore((s) => s.upsertConversation)
  const activeId = useConversationStore((s) => s.activeConversationId)
  const appendMessage = useConversationStore((s) => s.appendMessage)
  const incrementUnread = useConversationStore((s) => s.incrementUnread)

  useEffect(() => {
    if (!accessToken) return

    const socket = connectSocket(accessToken)

    socket.on('connect', () => {
      if (user?.id) socket.emit('agent:online', user.id)
    })

    socket.on('message:new', (message: Message) => {
      appendMessage(message.conversationId, message)
      if (message.conversationId !== activeId) {
        incrementUnread(message.conversationId)
      }
    })

    socket.on('conversation:updated', (conversation: Conversation) => {
      upsertConversation(conversation)
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
