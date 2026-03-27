import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useConversations, useConversation } from '../hooks/useConversations'
import { useConversationStore } from '../store/conversation.store'
import { useSocket } from '../hooks/useSocket'
import { useIsMobile } from '../hooks/useMediaQuery'
import ConversationList from '../components/conversations/ConversationList'
import ChatWindow from '../components/chat/ChatWindow'
import ConversationDetail from '../components/conversations/ConversationDetail'
import { MessageSquare, ArrowLeft } from 'lucide-react'

export default function ConversationsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setActiveConversation } = useConversationStore()
  const isMobile = useIsMobile()

  useSocket()

  const { isLoading: listLoading } = useConversations()
  const { data: activeConversation } = useConversation(id ?? '')

  useEffect(() => {
    setActiveConversation(id ?? null)
  }, [id])

  const handleSelectConversation = (conversationId: string) => {
    navigate(`/conversations/${conversationId}`)
  }

  const handleBack = () => {
    navigate('/conversations')
  }

  // Mobile: show list OR chat, not both
  if (isMobile) {
    if (id && activeConversation) {
      return (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Mobile back header */}
          <div className="flex items-center gap-2 px-2 py-2 bg-white dark:bg-wa-bg-panel border-b border-gray-200 dark:border-wa-border">
            <button onClick={handleBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-wa-bg-hover">
              <ArrowLeft size={20} className="text-gray-600 dark:text-wa-text-secondary" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-wa-accent/20 flex items-center justify-center flex-shrink-0">
                {activeConversation.contact.profilePic ? (
                  <img src={activeConversation.contact.profilePic} className="w-8 h-8 rounded-full object-cover" alt="" />
                ) : (
                  <span className="text-xs font-bold text-green-700 dark:text-wa-accent">
                    {(activeConversation.contact.name ?? activeConversation.contact.phone)?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-wa-text-primary truncate">
                  {activeConversation.contact.name ?? activeConversation.contact.pushName ?? activeConversation.contact.phone}
                </p>
              </div>
            </div>
          </div>
          <ChatWindow conversation={activeConversation} />
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-wa-bg-panel">
        <ConversationList
          activeId={id}
          onSelect={handleSelectConversation}
          isLoading={listLoading}
        />
      </div>
    )
  }

  // Desktop/Tablet layout
  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation list panel */}
      <div className="w-80 xl:w-96 border-r border-gray-200 dark:border-wa-border flex flex-col flex-shrink-0 bg-white dark:bg-wa-bg-panel">
        <ConversationList
          activeId={id}
          onSelect={handleSelectConversation}
          isLoading={listLoading}
        />
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {id && activeConversation ? (
          <ChatWindow conversation={activeConversation} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-wa-text-secondary gap-3">
            <MessageSquare size={48} className="opacity-30" />
            <p className="text-sm">Select a conversation to start</p>
          </div>
        )}
      </div>

      {/* Detail panel (desktop only) */}
      {id && activeConversation && (
        <div className="hidden xl:flex w-72 border-l border-gray-200 dark:border-wa-border flex-col bg-white dark:bg-wa-bg-panel">
          <ConversationDetail conversation={activeConversation} />
        </div>
      )}
    </div>
  )
}
