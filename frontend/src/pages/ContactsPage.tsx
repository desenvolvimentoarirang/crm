import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, User, Phone, Mail } from 'lucide-react'
import { api } from '../config/api'
import type { Contact, PaginatedResult } from '../types'
import { format } from 'date-fns'

export default function ContactsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search, page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResult<Contact>>('/contacts', {
        params: { search: search || undefined, page, limit: 20 },
      })
      return data
    },
    staleTime: 30000,
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <div className="text-sm text-gray-500">{data?.pagination.total ?? 0} total</div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {data?.data.map((contact) => (
              <div key={contact.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  {contact.profilePic ? (
                    <img src={contact.profilePic} className="w-10 h-10 rounded-full object-cover" alt="" />
                  ) : (
                    <User size={16} className="text-green-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {contact.name ?? contact.pushName ?? 'Unknown'}
                  </p>
                  <div className="flex gap-4 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone size={12} /> {contact.phone}
                    </span>
                    {contact.email && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail size={12} /> {contact.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
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
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {format(new Date(contact.createdAt), 'MMM d')}
                </span>
              </div>
            ))}
            {data?.data.length === 0 && (
              <div className="p-12 text-center text-gray-500">No contacts found</div>
            )}
          </div>
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            className="btn-secondary text-xs"
            disabled={!data.pagination.hasPrev}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-gray-600">
            {data.pagination.page} / {data.pagination.totalPages}
          </span>
          <button
            className="btn-secondary text-xs"
            disabled={!data.pagination.hasNext}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
