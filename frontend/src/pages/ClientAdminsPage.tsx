import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Building2, Users, MessageSquare, ToggleLeft, ToggleRight, Loader2, Trash2 } from 'lucide-react'
import { api } from '../config/api'
import type { User, PaginatedResult } from '../types'
import { getRoleBadgeColor, getRoleLabel } from '../utils/roles'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function CreateClientAdminModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/users', { name, email, password, role: 'CLIENT_ADMIN' })
      toast.success('Client admin created')
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4 dark:text-wa-text-primary">New Client Admin</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-wa-text-secondary mb-1">Name *</label>
            <input className="input w-full" placeholder="Agency name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-wa-text-secondary mb-1">Email *</label>
            <input className="input w-full" type="email" placeholder="admin@agency.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-wa-text-secondary mb-1">Password *</label>
            <input className="input w-full" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ClientAdminsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['client-admins'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResult<User>>('/users', { params: { limit: 100 } })
      return data.data.filter(u => u.role === 'CLIENT_ADMIN')
    },
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/users/${id}`, { isActive })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-admins'] })
      toast.success('Updated')
    },
  })

  const deleteAdmin = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-admins'] })
      toast.success('Admin removed')
    },
    onError: () => toast.error('Failed to remove admin'),
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {showCreate && (
        <CreateClientAdminModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['client-admins'] })}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-wa-text-primary">Client Admins</h1>
          <p className="text-sm text-gray-500 dark:text-wa-text-secondary mt-1">Manage agency administrators</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <UserPlus size={16} /> Add Client Admin
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-wa-bg-hover rounded w-1/2 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-wa-bg-hover rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-wa-bg-hover rounded w-1/3" />
            </div>
          ))
        ) : data?.map((admin) => (
          <div key={admin.id} className={`card p-6 ${!admin.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Building2 size={18} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-wa-text-primary">{admin.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-wa-text-secondary">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive.mutate({ id: admin.id, isActive: !admin.isActive })}
                  className="text-gray-500 hover:text-gray-700 dark:text-wa-text-secondary"
                  title={admin.isActive ? 'Disable' : 'Enable'}
                >
                  {admin.isActive
                    ? <ToggleRight size={22} className="text-green-600 dark:text-wa-accent" />
                    : <ToggleLeft size={22} />}
                </button>
                <button
                  onClick={() => deleteAdmin.mutate(admin.id)}
                  className="text-gray-400 hover:text-red-500 dark:text-wa-text-secondary dark:hover:text-red-400 p-1"
                  title="Remove admin"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-wa-text-secondary">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(admin.role)}`}>
                {getRoleLabel(admin.role)}
              </span>
              <span>Created {format(new Date(admin.createdAt), 'MMM d, yyyy')}</span>
              {!admin.isActive && <span className="text-red-500 dark:text-red-400 font-medium">Disabled</span>}
            </div>
          </div>
        ))}
        {!isLoading && data?.length === 0 && (
          <div className="col-span-3 card p-12 text-center text-gray-500 dark:text-wa-text-secondary">
            No client admins yet. Add one to get started.
          </div>
        )}
      </div>
    </div>
  )
}
