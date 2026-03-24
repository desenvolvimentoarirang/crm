import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Wifi, WifiOff, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { api } from '../config/api'
import type { WhatsAppInstance } from '../types'
import toast from 'react-hot-toast'
import { getSocket } from '../config/socket'
import { useSocket } from '../hooks/useSocket'

function InstanceCard({ instance, onDeleted }: { instance: WhatsAppInstance & { liveStatus?: string }; onDeleted: () => void }) {
  const [qrData, setQrData] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const isConnected = instance.liveStatus === 'open'

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
  }

  const fetchQR = async (): Promise<boolean> => {
    try {
      const { data } = await api.get(`/instances/${instance.name}/qr`)
      if (data.qrCode) {
        setQrData(data.qrCode)
        setConnecting(false)
        stopPolling()
        return true
      }
      // QR not ready yet — keep polling
      return false
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not reach Evolution API'
      toast.error(msg)
      stopPolling()
      setConnecting(false)
      return false
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete instance "${instance.name}"?`)) return
    setDeleting(true)
    try {
      await api.delete(`/instances/${instance.name}`)
      toast.success('Instance deleted')
      onDeleted()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete instance')
      setDeleting(false)
    }
  }

  const startConnect = async () => {
    setConnecting(true)
    setQrData(null)

    const ready = await fetchQR()
    if (ready) return

    // Poll every 2s until QR appears (max 60s)
    let elapsed = 0
    pollRef.current = setInterval(async () => {
      elapsed += 2
      const done = await fetchQR()
      if (done || elapsed >= 60) {
        stopPolling()
        setConnecting(false)
        if (elapsed >= 60) toast.error('Timeout waiting for QR code')
      }
    }, 2000)
  }

  // Listen for QR via socket (Evolution API → webhook → socket broadcast)
  useEffect(() => {
    const socket = getSocket()
    const handler = ({ instanceName, qrCode }: { instanceName: string; qrCode: string }) => {
      if (instanceName === instance.name) {
        setQrData(qrCode)
        setConnecting(false)
        stopPolling()
      }
    }
    socket.on('instance:qr', handler)
    socket.on('instance:status', ({ instanceName, state }: { instanceName: string; state: string }) => {
      if (instanceName === instance.name && state === 'open') {
        setQrData(null)
        setConnecting(false)
        stopPolling()
      }
    })
    return () => {
      socket.off('instance:qr', handler)
      stopPolling()
    }
  }, [instance.name])

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{instance.displayName ?? instance.name}</h3>
          <p className="text-sm text-gray-500 font-mono">{instance.name}</p>
          {instance.phone && <p className="text-xs text-gray-400 mt-1">{instance.phone}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {instance.liveStatus ?? instance.status}
          </span>
          <button
            className="p-1.5 text-gray-400 hover:text-red-500 rounded"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete instance"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      {qrData ? (
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">Scan with WhatsApp on your phone</p>
          <img
            src={qrData.startsWith('data:') ? qrData : `data:image/png;base64,${qrData}`}
            alt="WhatsApp QR Code"
            className="mx-auto w-52 h-52 border rounded-xl"
          />
          <button
            className="btn-secondary mt-3 text-xs"
            onClick={() => { setQrData(null); startConnect() }}
          >
            <RefreshCw size={12} /> Refresh QR
          </button>
        </div>
      ) : connecting ? (
        <div className="flex flex-col items-center gap-3 py-4 text-gray-500">
          <Loader2 size={28} className="animate-spin text-green-600" />
          <p className="text-sm">Generating QR code...</p>
          <p className="text-xs text-gray-400">This may take a few seconds</p>
        </div>
      ) : isConnected ? (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <Wifi size={14} /> Connected and ready to receive messages
        </div>
      ) : (
        <button className="btn-primary w-full justify-center" onClick={startConnect}>
          Connect WhatsApp
        </button>
      )}
    </div>
  )
}

function CreateInstanceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/instances', { name: name.trim(), displayName: displayName.trim() || undefined })
      toast.success('Instance created')
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create instance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="card p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4">New WhatsApp Instance</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instance name *</label>
            <input
              className="input w-full"
              placeholder="e.g. default"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
            <input
              className="input w-full"
              placeholder="e.g. Main WhatsApp"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
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

export default function InstancesPage() {
  useSocket()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: instances = [], isLoading } = useQuery<(WhatsAppInstance & { liveStatus?: string })[]>({
    queryKey: ['instances'],
    queryFn: async () => {
      const { data } = await api.get('/instances')
      return data
    },
    refetchInterval: 30000,
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {showCreate && (
        <CreateInstanceModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['instances'] })}
        />
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Instances</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your WhatsApp connections</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Add Instance
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((instance) => (
            <InstanceCard key={instance.id} instance={instance} onDeleted={() => qc.invalidateQueries({ queryKey: ['instances'] })} />
          ))}
          {instances.length === 0 && (
            <div className="col-span-3 card p-12 text-center text-gray-500">
              No instances yet. Add one to get started.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
