import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Shield, User, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { api } from '../config/api'
import type { User as UserType, PaginatedResult, Role } from '../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { getRoleBadgeColor, getRoleLabel } from '../utils/roles'
import { useAuthStore } from '../store/auth.store'

function CreateWorkerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('WORKER')
  const [clientAdminId, setClientAdminId] = useState('')
  const [loading, setLoading] = useState(false)
  const currentUser = useAuthStore((s) => s.user)
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'

  const { data: admins } = useQuery({
    queryKey: ['client-admins-list'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResult<UserType>>('/users', { params: { limit: 100 } })
      return data.data.filter(u => u.role === 'CLIENT_ADMIN')
    },
    enabled: isSuperAdmin,
  })

  const availableRoles: { value: Role; label: string }[] = isSuperAdmin
    ? [{ value: 'WORKER', label: 'Agent' }, { value: 'WORKER_TRUST', label: 'Senior Agent' }, { value: 'CLIENT_ADMIN', label: 'Admin' }]
    : [{ value: 'WORKER', label: 'Agent' }, { value: 'WORKER_TRUST', label: 'Senior Agent' }]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = { name, email, password, role }
      if (isSuperAdmin && (role === 'WORKER' || role === 'WORKER_TRUST') && clientAdminId) {
        payload.clientAdminId = clientAdminId
      }
      await api.post('/users', payload)
      toast.success('User created')
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4 dark:text-wa-text-primary">New User</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-wa-text-secondary mb-1">Name *</label>
            <input className="input w-full" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-wa-text-secondary mb-1">Email *</label>
            <input className="input w-full" type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-wa-text-secondary mb-1">Password *</label>
            <input className="input w-full" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-wa-text-secondary mb-1">Role</label>
            <select className="input w-full" value={role} onChange={e => setRole(e.target.value as Role)}>
              {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {isSuperAdmin && (role === 'WORKER' || role === 'WORKER_TRUST') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-wa-text-secondary mb-1">Assign to Admin</label>
              <select className="input w-full" value={clientAdminId} onChange={e => setClientAdminId(e.target.value)}>
                <option value="">None</option>
                {admins?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
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

export default function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResult<UserType>>('/users', { params: { page, limit: 20 } })
      return data
    },
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/users/${id}`, { isActive })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
    },
    onError: () => toast.error('Failed to update user'),
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {showCreate && (
        <CreateWorkerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['users'] })}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-wa-text-primary">Team</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-wa-bg-default border-b border-gray-200 dark:border-wa-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-wa-text-secondary">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-wa-text-secondary">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-wa-text-secondary">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-wa-text-secondary">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-wa-border">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-wa-bg-hover rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.data.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-wa-bg-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-wa-accent/20 flex items-center justify-center">
                          <User size={14} className="text-green-600 dark:text-wa-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-wa-text-primary">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-wa-text-secondary">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {(user.role === 'SUPER_ADMIN' || user.role === 'CLIENT_ADMIN') && <Shield size={10} />}
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-wa-text-secondary">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive.mutate({ id: user.id, isActive: !user.isActive })}
                        className="text-gray-500 hover:text-gray-700 dark:text-wa-text-secondary dark:hover:text-wa-text-primary"
                      >
                        {user.isActive
                          ? <ToggleRight size={20} className="text-green-600 dark:text-wa-accent" />
                          : <ToggleLeft size={20} />}
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
