import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Shield, User, ToggleLeft, ToggleRight } from 'lucide-react'
import { api } from '../config/api'
import type { User as UserType, PaginatedResult } from '../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <button className="btn-primary">
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.data.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <User size={14} className="text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role === 'ADMIN' && <Shield size={10} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive.mutate({ id: user.id, isActive: !user.isActive })}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {user.isActive
                          ? <ToggleRight size={20} className="text-green-600" />
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
