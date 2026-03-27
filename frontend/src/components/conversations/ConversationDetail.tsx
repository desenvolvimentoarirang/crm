import { useQuery } from '@tanstack/react-query'
import { User, Mail, HandMetal } from 'lucide-react'
import { useAssignConversation, useUpdateConversationStatus } from '../../hooks/useConversations'
import { useAuthStore } from '../../store/auth.store'
import { canAssignConversations } from '../../utils/roles'
import type { Conversation, ConversationStatus } from '../../types'
import { api } from '../../config/api'
import toast from 'react-hot-toast'

const STATUS_OPTIONS: { label: string; value: ConversationStatus; color: string }[] = [
  { label: 'Open', value: 'OPEN', color: 'text-blue-600' },
  { label: 'In Progress', value: 'IN_PROGRESS', color: 'text-yellow-600' },
  { label: 'Resolved', value: 'RESOLVED', color: 'text-green-600' },
  { label: 'Closed', value: 'CLOSED', color: 'text-gray-600' },
]

export default function ConversationDetail({ conversation }: { conversation: Conversation }) {
  const contact = conversation.contact
  const name = contact.name ?? contact.pushName ?? contact.phone
  const user = useAuthStore((s) => s.user)

  const assign = useAssignConversation()
  const updateStatus = useUpdateConversationStatus()

  const showAssignDropdown = user && canAssignConversations(user.role)
  const canSelfAssign = user?.role === 'WORKER' && (!conversation.assignedToId || conversation.assignedToId === user.id)

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: { limit: 100 } })
      return data.data.filter((u: any) => u.isActive)
    },
    staleTime: 60000,
    enabled: !!showAssignDropdown,
  })

  const handleSelfAssign = () => {
    if (!user) return
    assign.mutate(
      { id: conversation.id, assignedToId: user.id },
      { onSuccess: () => toast.success('Conversation assigned to you') },
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Contact info */}
      <div className="p-4 border-b border-gray-200 dark:border-wa-border">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-wa-accent/20 flex items-center justify-center mb-3 overflow-hidden">
            {contact.profilePic ? (
              <img src={contact.profilePic} className="w-full h-full object-cover" alt="" />
            ) : (
              <User size={24} className="text-green-600 dark:text-wa-accent" />
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-wa-text-primary">{name}</h3>
          <p className="text-sm text-gray-500 dark:text-wa-text-secondary">{contact.phone}</p>
          {contact.isVip && (
            <span className="mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              VIP
            </span>
          )}
        </div>

        <div className="space-y-2">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-wa-text-secondary">
              <Mail size={14} className="text-gray-400 dark:text-wa-text-secondary" /> {contact.email}
            </div>
          )}
          {contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {contact.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category & Priority */}
      {(conversation.category || conversation.priority) && (
        <div className="p-4 border-b border-gray-200 dark:border-wa-border flex gap-2 flex-wrap">
          {conversation.category && conversation.category !== 'GENERAL' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {conversation.category}
            </span>
          )}
          {conversation.priority && conversation.priority !== 'NORMAL' && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              conversation.priority === 'VIP' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
              conversation.priority === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {conversation.priority}
            </span>
          )}
        </div>
      )}

      {/* Status */}
      <div className="p-4 border-b border-gray-200 dark:border-wa-border">
        <p className="text-xs font-medium text-gray-500 dark:text-wa-text-secondary mb-2">STATUS</p>
        <select
          value={conversation.status}
          onChange={(e) =>
            updateStatus.mutate(
              { id: conversation.id, status: e.target.value as ConversationStatus },
              { onSuccess: () => toast.success('Status updated') },
            )
          }
          className="input text-xs"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Assign */}
      <div className="p-4">
        <p className="text-xs font-medium text-gray-500 dark:text-wa-text-secondary mb-2">ASSIGNED TO</p>

        {showAssignDropdown ? (
          <select
            value={conversation.assignedToId ?? ''}
            onChange={(e) =>
              assign.mutate(
                { id: conversation.id, assignedToId: e.target.value || null },
                { onSuccess: () => toast.success('Assigned') },
              )
            }
            className="input text-xs"
          >
            <option value="">Unassigned</option>
            {workers.map((w: any) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        ) : canSelfAssign && !conversation.assignedToId ? (
          <button onClick={handleSelfAssign} className="btn-primary w-full justify-center text-xs">
            <HandMetal size={14} /> Take Conversation
          </button>
        ) : (
          <p className="text-sm text-gray-600 dark:text-wa-text-secondary">
            {conversation.assignedTo?.name ?? 'Unassigned'}
          </p>
        )}
      </div>
    </div>
  )
}
