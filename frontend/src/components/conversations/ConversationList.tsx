import { useState, useRef, useEffect } from 'react'
import { Search, Filter, X, ChevronDown } from 'lucide-react'
import { useConversationStore } from '../../store/conversation.store'
import ConversationListItem from './ConversationListItem'
import type { ConversationStatus } from '../../types'
import clsx from 'clsx'

const STATUS_TABS: { label: string; value: ConversationStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
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
  const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set())
  const [showInstanceFilter, setShowInstanceFilter] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Extract unique instances from conversations
  const instanceOptions = Array.from(
    new Map(
      conversations
        .filter((c) => c.instance)
        .map((c) => [c.instance!.id, { id: c.instance!.id, label: c.instance!.displayName ?? c.instance!.name }]),
    ).values(),
  )

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowInstanceFilter(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleInstance = (id: string) => {
    setSelectedInstances((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearInstanceFilter = () => {
    setSelectedInstances(new Set())
  }

  const filtered = conversations.filter((conv) => {
    // "All" excludes closed conversations — use the "Closed" tab to see them
    const matchesStatus = statusFilter === 'ALL'
      ? conv.status !== 'CLOSED'
      : conv.status === statusFilter
    const contact = conv.contact
    const name = contact.name ?? contact.pushName ?? contact.phone
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || contact.phone.includes(search)
    const matchesInstance = selectedInstances.size === 0 || (conv.instance && selectedInstances.has(conv.instance.id))
    return matchesStatus && matchesSearch && matchesInstance
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-wa-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-wa-text-primary">Conversations</h2>
          <span className="text-xs font-medium text-gray-500 dark:text-wa-text-secondary bg-gray-100 dark:bg-wa-bg-hover px-2 py-0.5 rounded-full">
            {filtered.length}
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

        {/* Instance filter */}
        {instanceOptions.length > 0 && (
          <div className="relative mt-2" ref={filterRef}>
            <button
              onClick={() => setShowInstanceFilter((v) => !v)}
              className={clsx(
                'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors w-full justify-between',
                selectedInstances.size > 0
                  ? 'border-green-400 bg-green-50 text-green-700 dark:border-wa-accent dark:bg-wa-accent/10 dark:text-wa-accent'
                  : 'border-gray-200 dark:border-wa-border text-gray-500 dark:text-wa-text-secondary hover:border-gray-300 dark:hover:border-wa-border',
              )}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Filter size={12} />
                {selectedInstances.size === 0
                  ? 'All instances'
                  : `${selectedInstances.size} instance${selectedInstances.size > 1 ? 's' : ''}`}
              </span>
              <div className="flex items-center gap-1">
                {selectedInstances.size > 0 && (
                  <span
                    onClick={(e) => { e.stopPropagation(); clearInstanceFilter() }}
                    className="p-0.5 hover:bg-green-200 dark:hover:bg-wa-accent/20 rounded"
                  >
                    <X size={10} />
                  </span>
                )}
                <ChevronDown size={12} className={clsx('transition-transform', showInstanceFilter && 'rotate-180')} />
              </div>
            </button>

            {showInstanceFilter && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-wa-bg-panel border border-gray-200 dark:border-wa-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                {instanceOptions.map((inst) => (
                  <label
                    key={inst.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-wa-bg-hover cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedInstances.has(inst.id)}
                      onChange={() => toggleInstance(inst.id)}
                      className="rounded border-gray-300 dark:border-wa-border text-green-600 dark:text-wa-accent focus:ring-green-500 dark:focus:ring-wa-accent"
                    />
                    <span className="text-gray-700 dark:text-wa-text-primary truncate">{inst.label}</span>
                  </label>
                ))}
                {selectedInstances.size > 0 && (
                  <button
                    onClick={clearInstanceFilter}
                    className="w-full text-xs text-center py-1.5 text-gray-500 dark:text-wa-text-secondary hover:text-gray-700 dark:hover:text-wa-text-primary border-t border-gray-100 dark:border-wa-border"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>
        )}
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
