import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Paperclip, Loader2 } from 'lucide-react'
import { messagesService } from '../../services/messages.service'
import type { Message } from '../../types'
import toast from 'react-hot-toast'
import { getSocket } from '../../config/socket'
import { useAuthStore } from '../../store/auth.store'

interface Props {
  conversationId: string
  onSent: (message: Message) => void
}

export default function MessageInput({ conversationId, onSent }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const user = useAuthStore((s) => s.user)
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>()

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const message = await messagesService.send(conversationId, text.trim())
      onSent(message)
      setText('')
      textareaRef.current?.focus()
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTyping = () => {
    const socket = getSocket()
    socket.emit('typing:start', { conversationId, userName: user?.name ?? 'Agent' })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId })
    }, 1500)
  }

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 flex-shrink-0">
          <Paperclip size={18} />
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping() }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent max-h-40 min-h-[44px]"
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 160)}px`
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}
