import { format } from 'date-fns'
import { Check, CheckCheck, Clock, ImageIcon, FileText, Mic, Video } from 'lucide-react'
import type { Message } from '../../types'
import clsx from 'clsx'

const STATUS_ICON = {
  PENDING: <Clock size={10} className="text-gray-400 dark:text-wa-text-secondary" />,
  SENT: <Check size={10} className="text-gray-400 dark:text-wa-text-secondary" />,
  DELIVERED: <CheckCheck size={10} className="text-gray-400 dark:text-wa-text-secondary" />,
  READ: <CheckCheck size={10} className="text-blue-500" />,
  FAILED: <Clock size={10} className="text-red-400" />,
}

const MEDIA_ICON = {
  IMAGE: <ImageIcon size={14} />,
  VIDEO: <Video size={14} />,
  AUDIO: <Mic size={14} />,
  DOCUMENT: <FileText size={14} />,
  STICKER: <ImageIcon size={14} />,
}

interface Props {
  message: Message
  showDate?: boolean
}

export default function MessageBubble({ message, showDate }: Props) {
  const isOutbound = message.direction === 'OUTBOUND'

  return (
    <>
      {showDate && (
        <div className="flex justify-center my-2">
          <span className="text-xs text-gray-500 dark:text-wa-text-secondary bg-white dark:bg-wa-bg-panel border border-gray-200 dark:border-wa-border px-3 py-1 rounded-full">
            {format(new Date(message.timestamp), 'MMMM d, yyyy')}
          </span>
        </div>
      )}

      <div className={clsx('flex', isOutbound ? 'justify-end' : 'justify-start')}>
        <div
          className={clsx(
            'max-w-[70%] rounded-2xl px-3 py-2 shadow-sm',
            isOutbound
              ? 'bg-green-600 dark:bg-wa-bg-bubble-out text-white rounded-br-sm'
              : 'bg-white dark:bg-wa-bg-bubble-in text-gray-900 dark:text-wa-text-primary rounded-bl-sm border border-gray-100 dark:border-wa-border',
          )}
        >
          {/* Media content */}
          {message.type !== 'TEXT' && message.type !== 'STICKER' && (
            <div className={clsx('flex items-center gap-2 mb-1', isOutbound ? 'text-green-100' : 'text-gray-500 dark:text-wa-text-secondary')}>
              {MEDIA_ICON[message.type as keyof typeof MEDIA_ICON]}
              <span className="text-xs">{message.type.toLowerCase()}</span>
              {message.fileName && <span className="text-xs truncate max-w-32">{message.fileName}</span>}
            </div>
          )}

          {message.mediaUrl && message.type === 'IMAGE' && (
            <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={message.mediaUrl}
                alt="Image"
                className="rounded-lg max-w-full mb-1 max-h-64 object-cover cursor-pointer"
              />
            </a>
          )}

          {message.mediaUrl && message.type === 'VIDEO' && (
            <video
              src={message.mediaUrl}
              controls
              className="rounded-lg max-w-full mb-1 max-h-64"
            />
          )}

          {message.mediaUrl && message.type === 'AUDIO' && (
            <audio src={message.mediaUrl} controls className="max-w-full mb-1" />
          )}

          {message.mediaUrl && message.type === 'DOCUMENT' && (
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 p-2 rounded-lg mb-1 ${isOutbound ? 'bg-green-700/30' : 'bg-gray-100 dark:bg-wa-bg-hover'}`}
            >
              <FileText size={20} />
              <span className="text-sm underline truncate max-w-48">{message.fileName || 'Download file'}</span>
            </a>
          )}

          {/* Text body */}
          {message.body && (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>
          )}

          {/* Timestamp + status */}
          <div className={clsx('flex items-center gap-1 mt-1', isOutbound ? 'justify-end' : 'justify-start')}>
            <span className={clsx('text-xs', isOutbound ? 'text-green-200' : 'text-gray-400 dark:text-wa-text-secondary')}>
              {format(new Date(message.timestamp), 'HH:mm')}
            </span>
            {isOutbound && STATUS_ICON[message.status]}
          </div>
        </div>
      </div>
    </>
  )
}
