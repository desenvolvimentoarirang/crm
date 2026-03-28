import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Paperclip, Loader2 } from 'lucide-react'
import { messagesService } from '../../services/messages.service'
import type { Message, MessageType } from '../../types'
import toast from 'react-hot-toast'
import { getSocket } from '../../config/socket'
import { useAuthStore } from '../../store/auth.store'

function getMediaType(mimeType: string): MessageType {
  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  return 'DOCUMENT'
}

interface Props {
  conversationId: string
  onSent: (message: Message) => void
}

export default function MessageInput({ conversationId, onSent }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be selected again
    e.target.value = ''

    setSending(true)
    try {
      const uploaded = await messagesService.upload(file)
      const type = getMediaType(uploaded.mimeType)
      const message = await messagesService.sendMedia(conversationId, {
        type,
        mediaUrl: uploaded.url,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        caption: text.trim() || undefined,
      })
      onSent(message)
      setText('')
    } catch {
      toast.error('Failed to send file')
    } finally {
      setSending(false)
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
    <div className="border-t border-gray-200 dark:border-wa-border bg-white dark:bg-wa-bg-panel p-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        onChange={handleFileSelect}
      />
      <div className="flex items-end gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="p-2 text-gray-400 dark:text-wa-text-secondary hover:text-gray-600 dark:hover:text-wa-text-primary rounded-lg hover:bg-gray-100 dark:hover:bg-wa-bg-hover flex-shrink-0"
        >
          <Paperclip size={18} />
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping() }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="w-full resize-none rounded-xl border border-gray-300 dark:border-wa-border dark:bg-wa-input-bg dark:text-wa-text-primary px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-wa-accent focus:border-transparent max-h-40 min-h-[44px] dark:placeholder-wa-text-secondary"
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
          className="w-10 h-10 rounded-xl bg-green-600 dark:bg-wa-accent text-white flex items-center justify-center hover:bg-green-700 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}
