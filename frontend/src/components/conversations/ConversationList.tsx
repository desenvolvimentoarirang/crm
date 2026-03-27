import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { useConversationStore } from '../../store/conversation.store'
import ConversationListItem from './ConversationListItem'
import type { ConversationStatus } from '../../types'
import clsx from 'clsx'

const STATUS_TABS: { label: string; value: ConversationStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
]

interface Props {
  activeId?: string
  onSelect: (id: string) => void
  isLoading: boolean
}

export default function ConversationList({ activeId, onSelect, isLoading }: Props) {
  const conversations = useConversationStore((s) => s.conversations)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'ALL'>('ALL')

  const filtered = conversations.filter((conv) => {
    const matchesStatus = statusFilter === 'ALL' || conv.status === statusFilter
    const contact = conv.contact
    const name = contact.name ?? contact.pushName ?? contact.phone
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || contact.phone.includes(search)
    return matchesStatus && matchesSearch
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-wa-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-wa-text-primary">Conversations</h2>
          <span className="text-xs font-medium text-gray-500 dark:text-wa-text-secondary bg-gray-100 dark:bg-wa-bg-hover px-2 py-0.5 rounded-full">
            {conversations.length}
          </span>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8 text-xs py-1.5"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex border-b border-gray-200 dark:border-wa-border px-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={clsx(
              'flex-1 py-2 text-xs font-medium border-b-2 transition-colors',
              statusFilter === tab.value
                ? 'border-green-600 text-green-700 dark:border-wa-accent dark:text-wa-accent'
                : 'border-transparent text-gray-500 dark:text-wa-text-secondary hover:text-gray-700 dark:hover:text-wa-text-primary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="divide-y">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 flex gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 dark:bg-wa-bg-hover rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-wa-bg-hover rounded w-2/3" />
                  <div className="h-3 bg-gray-200 dark:bg-wa-bg-hover rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-wa-text-secondary">No conversations found</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-wa-border">
            {filtered.map((conv) => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onClick={() => onSelect(conv.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
