import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Heart, CheckCircle2, Clock3, Pencil, X as XIcon } from 'lucide-react'
import apiClient from '../api'
import MemberPicker from '../components/MemberPicker'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

interface Church {
  id: number
  name: string
}

interface Member {
  id: number
  name: string
  churchId: number
}

interface PrayerRequest {
  id: number
  memberId: number
  description: string
  scheduledAt: string | null
  status: string
  member: { name: string; phone: string | null }
  user: { firstName: string | null; lastName: string | null }
}

const STATUS_LABEL: Record<string, string> = {
  activo: 'Activo',
  contestada: 'Contestada',
  caducada: 'Caducada',
}

const STATUS_VARIANT: Record<string, 'primary' | 'success' | 'neutral'> = {
  activo: 'primary',
  contestada: 'success',
  caducada: 'neutral',
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function Prayer() {
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [memberId, setMemberId] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [error, setError] = useState('')

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setMemberId('')
    setDescription('')
    setScheduledAt('')
    setError('')
  }

  const toDatetimeLocal = (isoDate: string) => {
    const d = new Date(isoDate)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const startEdit = (p: PrayerRequest) => {
    setEditingId(p.id)
    setMemberId(String(p.memberId))
    setDescription(p.description)
    setScheduledAt(p.scheduledAt ? toDatetimeLocal(p.scheduledAt) : '')
    setError('')
    setShowForm(true)
  }

  const { data: requests, isLoading } = useQuery<PrayerRequest[]>({
    queryKey: ['prayer-requests'],
    queryFn: async () => (await apiClient.get('/api/prayer-requests')).data,
  })

  const { data: members } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => (await apiClient.get('/api/members')).data,
  })

  const { data: churches } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: async () => (await apiClient.get('/api/churches')).data,
  })

  const createRequest = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post('/api/prayer-requests', {
          memberId: Number(memberId),
          description,
          scheduledAt: scheduledAt || undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-requests'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al crear el pedido de oración')
    },
  })

  const updateRequest = useMutation({
    mutationFn: async () =>
      (
        await apiClient.put(`/api/prayer-requests/${editingId}`, {
          description,
          scheduledAt: scheduledAt || null,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-requests'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al actualizar')
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await apiClient.put(`/api/prayer-requests/${id}`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-requests'] })
    },
  })

  const cancelRequest = useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/api/prayer-requests/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-requests'] })
    },
  })

  const handleCancel = (id: number) => {
    if (window.confirm('¿Cancelar este pedido de oración? Esta acción no se puede deshacer.')) {
      cancelRequest.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId && !memberId) {
      setError('Selecciona un miembro')
      return
    }
    if (!description.trim()) {
      setError('La descripción es requerida')
      return
    }
    if (editingId) {
      updateRequest.mutate()
    } else {
      createRequest.mutate()
    }
  }

  const sortedRequests = [...(requests || [])].sort((a, b) => {
    if (a.status === 'activo' && b.status !== 'activo') return -1
    if (a.status !== 'activo' && b.status === 'activo') return 1
    return (
      (a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity) -
      (b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity)
    )
  })

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Pedido de Oración' : 'Nuevo Pedido de Oración'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <MemberPicker
                  members={members || []}
                  churches={churches || []}
                  value={memberId}
                  onChange={(id) => setMemberId(id)}
                  disabled={!!editingId}
                />
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className={inputClass}
                />
                <textarea
                  placeholder="Pedido de oración *"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputClass} md:col-span-2`}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={createRequest.isPending || updateRequest.isPending}>
                  Guardar
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pedidos de Oración</CardTitle>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Nuevo Pedido
            </Button>
          )}
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : sortedRequests.length === 0 ? (
          <EmptyState icon={Heart} title="No hay pedidos de oración aún" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Miembro</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Pedido</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Fecha para orar</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Estatus</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedRequests.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{p.member?.name}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{p.description}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status] || p.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => startEdit(p)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                        {p.status === 'activo' && (
                          <>
                            <button
                              onClick={() => updateStatus.mutate({ id: p.id, status: 'contestada' })}
                              className="flex items-center gap-1 text-success hover:underline"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Contestada
                            </button>
                            <button
                              onClick={() => updateStatus.mutate({ id: p.id, status: 'caducada' })}
                              className="flex items-center gap-1 text-muted-foreground hover:underline"
                            >
                              <Clock3 className="h-3.5 w-3.5" /> Caducada
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleCancel(p.id)}
                          className="flex items-center gap-1 text-destructive hover:underline"
                        >
                          <XIcon className="h-3.5 w-3.5" /> Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
