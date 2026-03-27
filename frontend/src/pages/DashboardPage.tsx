import { useQuery } from '@tanstack/react-query'
import { MessageSquare, Users, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { conversationsService } from '../services/conversations.service'
import { useAuthStore } from '../store/auth.store'
import { useNavigate } from 'react-router-dom'
import { isAdminRole } from '../utils/roles'

function StatCard({ title, value, icon: Icon, color, onClick }: {
  title: string
  value: number
  icon: any
  color: string
  onClick?: () => void
}) {
  return (
    <div
      className={`card p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-wa-text-secondary">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-wa-text-primary mt-1">{value.toLocaleString()}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['conversation-stats'],
    queryFn: conversationsService.stats,
    refetchInterval: 60000,
  })

  const showStats = true
  const showWorkerCTA = user?.role === 'WORKER' || user?.role === 'WORKER_TRUST'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-wa-text-primary">Dashboard</h1>
        <p className="text-gray-500 dark:text-wa-text-secondary mt-1">Welcome back, {user?.name}</p>
      </div>

      {showStats && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-wa-bg-hover rounded w-1/2 mb-3" />
                  <div className="h-8 bg-gray-200 dark:bg-wa-bg-hover rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Open"
                value={stats?.open ?? 0}
                icon={MessageSquare}
                color="bg-blue-500"
                onClick={() => navigate('/conversations?status=OPEN')}
              />
              <StatCard
                title="In Progress"
                value={stats?.inProgress ?? 0}
                icon={Clock}
                color="bg-yellow-500"
                onClick={() => navigate('/conversations?status=IN_PROGRESS')}
              />
              <StatCard
                title="Resolved"
                value={stats?.resolved ?? 0}
                icon={CheckCircle}
                color="bg-green-500"
                onClick={() => navigate('/conversations?status=RESOLVED')}
              />
              <StatCard
                title="Messages Today"
                value={stats?.totalMessages ?? 0}
                icon={TrendingUp}
                color="bg-purple-500"
              />
            </div>
          )}
        </>
      )}

      {showWorkerCTA && (
        <div className="card p-8 text-center mt-6">
          <MessageSquare size={48} className="text-green-600 dark:text-wa-accent mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-wa-text-primary">Ready to help customers?</h2>
          <p className="text-gray-500 dark:text-wa-text-secondary mt-2 mb-6">Go to conversations to start chatting</p>
          <button className="btn-primary" onClick={() => navigate('/conversations')}>
            View Conversations
          </button>
        </div>
      )}
    </div>
  )
}
