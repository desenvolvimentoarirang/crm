import { MoreVertical, User, Users, Phone } from 'lucide-react'
import type { Conversation } from '../../types'
import clsx from 'clsx'

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
}

export default function ConversationHeader({ conversation }: { conversation: Conversation }) {
  const contact = conversation.contact
  const name = contact.name ?? contact.pushName ?? contact.phone

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-wa-border bg-white dark:bg-wa-bg-panel">
      <div className={clsx(
        'w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0',
        contact.isGroup ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-gray-200 dark:bg-wa-bg-hover',
      )}>
        {contact.profilePic ? (
          <img src={contact.profilePic} className="w-full h-full object-cover" alt="" />
        ) : contact.isGroup ? (
          <Users size={16} className="text-blue-600 dark:text-blue-400" />
        ) : (
          <User size={16} className="text-gray-500 dark:text-wa-text-secondary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-wa-text-primary text-sm truncate">{name}</span>
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[conversation.status])}>
            {conversation.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-wa-text-secondary">
          <Phone size={10} />
          <span>{contact.phone}</span>
          {conversation.instance && (
            <span className="text-gray-400 dark:text-wa-text-secondary ml-2">via {conversation.instance.displayName ?? conversation.instance.name}</span>
          )}
        </div>
      </div>

      {conversation.assignedTo && (
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 dark:text-wa-text-secondary flex-shrink-0">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            <User size={10} className="text-blue-600" />
          </div>
          <span>{conversation.assignedTo.name}</span>
        </div>
      )}

      <button className="p-1.5 text-gray-400 dark:text-wa-text-secondary hover:text-gray-600 dark:hover:text-wa-text-primary rounded-lg hover:bg-gray-100 dark:hover:bg-wa-bg-hover">
        <MoreVertical size={16} />
      </button>
    </div>
  )
}
