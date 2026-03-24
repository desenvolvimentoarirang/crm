import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useConversations, useConversation } from '../hooks/useConversations'
import { useConversationStore } from '../store/conversation.store'
import { useSocket } from '../hooks/useSocket'
import ConversationList from '../components/conversations/ConversationList'
import ChatWindow from '../components/chat/ChatWindow'
import ConversationDetail from '../components/conversations/ConversationDetail'
import { MessageSquare } from 'lucide-react'

export default function ConversationsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setActiveConversation, activeConversationId } = useConversationStore()

  // Init socket
  useSocket()

  // Load conversations list
  const { isLoading: listLoading } = useConversations()

  // Load active conversation
  const { data: activeConversation } = useConversation(id ?? '')

  useEffect(() => {
    setActiveConversation(id ?? null)
  }, [id])

  const handleSelectConversation = (conversationId: string) => {
    navigate(`/conversations/${conversationId}`)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation list panel */}
      <div className="w-80 xl:w-96 border-r border-gray-200 flex flex-col flex-shrink-0 bg-white">
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
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <MessageSquare size={48} className="opacity-30" />
            <p className="text-sm">Select a conversation to start</p>
          </div>
        )}
      </div>

      {/* Detail panel (desktop only) */}
      {id && activeConversation && (
        <div className="hidden xl:flex w-72 border-l border-gray-200 flex-col bg-white">
          <ConversationDetail conversation={activeConversation} />
        </div>
      )}
    </div>
  )
}
