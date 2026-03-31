import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { messagesService } from '../../services/messages.service'
import { useConversationStore } from '../../store/conversation.store'
import { getSocket } from '../../config/socket'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import ConversationHeader from '../conversations/ConversationHeader'
import type { Conversation, Message } from '../../types'

export default function ChatWindow({ conversation }: { conversation: Conversation }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const { clearUnread } = useConversationStore()

  const { data, isLoading } = useQuery({
    queryKey: ['messages', conversation.id],
    queryFn: () => messagesService.list(conversation.id),
    staleTime: 0,
  })

  useEffect(() => {
    if (data?.messages) setLocalMessages(data.messages)
  }, [data])

  // Real-time: join room & listen for new messages
  useEffect(() => {
    const socket = getSocket()
    socket.emit('conversation:join', conversation.id)
    clearUnread(conversation.id)

    const handler = (message: Message) => {
      if (message.conversationId === conversation.id) {
        setLocalMessages((prev) => {
          const exists = prev.find((m) => m.id === message.id)
          return exists ? prev : [...prev, message]
        })
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    }

    socket.on('message:new', handler)
    return () => {
      socket.off('message:new', handler)
      socket.emit('conversation:leave', conversation.id)
    }
  }, [conversation.id])

  // Scroll to bottom on load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [localMessages.length === 0 ? 0 : 1])

  const handleSent = (message: Message) => {
    setLocalMessages((prev) => {
      const exists = prev.find((m) => m.id === message.id)
      return exists ? prev : [...prev, message]
    })
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <div className="flex flex-col h-full">
      <ConversationHeader conversation={conversation} />

      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50 dark:bg-wa-bg-default">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className="h-10 bg-gray-200 dark:bg-wa-bg-hover rounded-2xl animate-pulse w-48" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {localMessages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                showDate={
                  index === 0 ||
                  new Date(message.timestamp).toDateString() !==
                    new Date(localMessages[index - 1].timestamp).toDateString()
                }
              />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput conversationId={conversation.id} onSent={handleSent} />
    </div>
  )
}
