import { formatDistanceToNow } from 'date-fns'
import { User } from 'lucide-react'
import type { Conversation } from '../../types'
import clsx from 'clsx'

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-500',
  IN_PROGRESS: 'bg-yellow-500',
  RESOLVED: 'bg-green-500',
  CLOSED: 'bg-gray-400',
}

interface Props {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

export default function ConversationListItem({ conversation, isActive, onClick }: Props) {
  const contact = conversation.contact
  const name = contact.name ?? contact.pushName ?? contact.phone
  const lastMsg = conversation.messages?.[0]
  const preview = lastMsg?.body ?? (lastMsg?.type !== 'TEXT' ? `[${lastMsg?.type}]` : '')

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left p-3 flex gap-3 hover:bg-gray-50 transition-colors',
        isActive && 'bg-green-50 hover:bg-green-50 border-r-2 border-green-600',
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {contact.profilePic ? (
            <img src={contact.profilePic} className="w-full h-full object-cover" alt="" />
          ) : (
            <User size={16} className="text-gray-500" />
          )}
        </div>
        <span className={clsx('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white', STATUS_COLORS[conversation.status])} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium text-sm text-gray-900 truncate">{name}</span>
          {conversation.lastMessageAt && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-gray-500 truncate">{preview || 'No messages yet'}</p>
          {conversation.unreadCount > 0 && (
            <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </span>
          )}
        </div>
        {conversation.assignedTo && (
          <p className="text-xs text-blue-500 mt-0.5 truncate">→ {conversation.assignedTo.name}</p>
        )}
      </div>
    </button>
  )
}
