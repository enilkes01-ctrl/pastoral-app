import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CalendarDays, Pencil, Check, X as XIcon } from 'lucide-react'
import apiClient from '../api'
import MemberPicker from '../components/MemberPicker'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

const OUTCOME_LABEL: Record<string, string> = {
  contactado: 'Contactado',
  'no-respondio': 'No respondió',
  'solicita-visita': 'Solicita visita',
  'necesita-oracion': 'Necesita oración',
  'requiere-seguimiento': 'Requiere seguimiento',
  'situacion-resuelta': 'Situación resuelta',
  otro: 'Otro',
}

const TASK_TYPE_LABEL: Record<string, string> = {
  'volver-a-visitar': 'Volver a visitar',
  llamar: 'Llamar',
  'enviar-material': 'Enviar material',
  'coordinar-ayuda': 'Coordinar ayuda',
  'contactar-anciano': 'Contactar anciano',
  orar: 'Orar',
  personalizada: 'Personalizada',
}

interface Church {
  id: number
  name: string
}

interface Member {
  id: number
  name: string
  churchId: number
}

interface Visit {
  id: number
  memberId: number
  type: string
  scheduledDate: string
  status: string
  notes: string | null
  outcome: string | null
  topics: string | null
  commitments: string | null
  member: { name: string; phone: string | null }
  user: { firstName: string | null; lastName: string | null }
}

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'destructive'> = {
  pendiente: 'warning',
  completada: 'success',
  cancelada: 'destructive',
}

const TYPE_LABEL: Record<string, string> = {
  visita: 'Visita',
  llamada: 'Llamada',
  mensaje: 'Mensaje',
}

const TYPE_VARIANT: Record<string, 'primary' | 'accent' | 'neutral'> = {
  visita: 'primary',
  llamada: 'accent',
  mensaje: 'neutral',
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function Visits() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const [showForm, setShowForm] = useState(!!searchParams.get('memberId'))
  const [editingId, setEditingId] = useState<number | null>(null)
  const [memberId, setMemberId] = useState(searchParams.get('memberId') || '')
  const [type, setType] = useState('visita')
  const [scheduledDate, setScheduledDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const [closingVisit, setClosingVisit] = useState<Visit | null>(null)
  const [outcome, setOutcome] = useState('')
  const [topics, setTopics] = useState('')
  const [commitments, setCommitments] = useState('')
  const [createTask, setCreateTask] = useState(false)
  const [taskType, setTaskType] = useState('volver-a-visitar')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [closeError, setCloseError] = useState('')

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setMemberId('')
    setType('visita')
    setScheduledDate('')
    setNotes('')
    setError('')
  }

  const startClose = (v: Visit) => {
    setShowForm(false)
    setClosingVisit(v)
    setOutcome('')
    setTopics('')
    setCommitments('')
    setCreateTask(false)
    setTaskType('volver-a-visitar')
    setTaskDescription('')
    setTaskDueDate('')
    setCloseError('')
  }

  const resetClose = () => {
    setClosingVisit(null)
    setOutcome('')
    setTopics('')
    setCommitments('')
    setCreateTask(false)
    setTaskType('volver-a-visitar')
    setTaskDescription('')
    setTaskDueDate('')
    setCloseError('')
  }

  // datetime-local necesita "YYYY-MM-DDTHH:mm" en hora local, sin segundos ni zona
  const toDatetimeLocal = (isoDate: string) => {
    const d = new Date(isoDate)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const startEdit = (v: Visit) => {
    setClosingVisit(null)
    setEditingId(v.id)
    setMemberId(String(v.memberId))
    setType(v.type)
    setScheduledDate(toDatetimeLocal(v.scheduledDate))
    setNotes(v.notes || '')
    setError('')
    setShowForm(true)
  }

  const { data: visits, isLoading } = useQuery<Visit[]>({
    queryKey: ['visits'],
    queryFn: async () => (await apiClient.get('/api/visits')).data,
  })

  const { data: members } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => (await apiClient.get('/api/members')).data,
  })

  const { data: churches } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: async () => (await apiClient.get('/api/churches')).data,
  })

  const createVisit = useMutation({
    mutationFn: async () =>
      (await apiClient.post('/api/visits', { memberId: Number(memberId), type, scheduledDate, notes })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al agendar')
    },
  })

  const updateVisit = useMutation({
    mutationFn: async () =>
      (await apiClient.put(`/api/visits/${editingId}`, { type, scheduledDate, notes })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al actualizar')
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await apiClient.put(`/api/visits/${id}`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] })
    },
  })

  const closeVisit = useMutation({
    mutationFn: async () => {
      if (!closingVisit) return
      await apiClient.put(`/api/visits/${closingVisit.id}`, {
        status: 'completada',
        outcome: closingVisit.type === 'llamada' ? outcome || undefined : undefined,
        topics: topics || undefined,
        commitments: commitments || undefined,
      })
      if (createTask) {
        await apiClient.post('/api/tasks', {
          memberId: closingVisit.memberId,
          type: taskType,
          description: taskDescription || undefined,
          dueDate: taskDueDate || undefined,
          relatedVisitId: closingVisit.id,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      resetClose()
    },
    onError: (err: any) => {
      setCloseError(err.response?.data?.error || 'Error al cerrar')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberId) {
      setError('Selecciona un miembro')
      return
    }
    if (!scheduledDate) {
      setError('Selecciona una fecha')
      return
    }
    if (editingId) {
      updateVisit.mutate()
    } else {
      createVisit.mutate()
    }
  }

  const sortedVisits = [...(visits || [])].sort((a, b) => {
    if (a.status === 'pendiente' && b.status !== 'pendiente') return -1
    if (a.status !== 'pendiente' && b.status === 'pendiente') return 1
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  })

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Pendiente' : 'Nuevo Pendiente'}</CardTitle>
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
                <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                  <option value="visita">Visita</option>
                  <option value="llamada">Llamada</option>
                  <option value="mensaje">Mensaje</option>
                </select>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className={inputClass}
                />
                <textarea
                  placeholder="Notas (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClass} md:col-span-2`}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={createVisit.isPending || updateVisit.isPending}>
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

      {closingVisit && (
        <Card>
          <CardHeader>
            <CardTitle>Completar {TYPE_LABEL[closingVisit.type] || closingVisit.type} — {closingVisit.member?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                closeVisit.mutate()
              }}
              className="space-y-4"
            >
              {closeError && <p className="text-sm text-destructive">{closeError}</p>}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {closingVisit.type === 'llamada' && (
                  <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={inputClass}>
                    <option value="">Resultado de la llamada...</option>
                    {Object.entries(OUTCOME_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
                <textarea
                  placeholder="Temas tratados / observaciones (opcional)"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  className={`${inputClass} md:col-span-2`}
                  rows={2}
                />
                <textarea
                  placeholder="Compromisos asumidos (opcional)"
                  value={commitments}
                  onChange={(e) => setCommitments(e.target.value)}
                  className={`${inputClass} md:col-span-2`}
                  rows={2}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={createTask}
                  onChange={(e) => setCreateTask(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Crear tarea de seguimiento
              </label>

              {createTask && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className={inputClass}>
                    {Object.entries(TASK_TYPE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className={inputClass}
                  />
                  <textarea
                    placeholder="Descripción de la tarea (opcional)"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className={`${inputClass} md:col-span-2`}
                    rows={2}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" loading={closeVisit.isPending}>
                  Completar
                </Button>
                <Button type="button" variant="outline" onClick={resetClose}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Próximos Pendientes</CardTitle>
          {!showForm && (
            <Button
              size="sm"
              onClick={() => {
                setClosingVisit(null)
                setShowForm(true)
              }}
            >
              <Plus className="h-4 w-4" /> Agendar
            </Button>
          )}
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : sortedVisits.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No hay nada agendado aún" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Miembro</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Tipo</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Fecha</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Asignado a</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Estatus</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Notas</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedVisits.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{v.member?.name}</td>
                    <td className="px-5 py-4 text-sm">
                      <Badge variant={TYPE_VARIANT[v.type] || 'neutral'}>{TYPE_LABEL[v.type] || v.type}</Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {new Date(v.scheduledDate).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {v.user?.firstName} {v.user?.lastName}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <Badge variant={STATUS_VARIANT[v.status]}>{STATUS_LABEL[v.status] || v.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {v.outcome && (
                        <Badge variant="accent" className="mb-1">
                          {OUTCOME_LABEL[v.outcome] || v.outcome}
                        </Badge>
                      )}
                      <div>{v.notes || v.topics || '-'}</div>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => startEdit(v)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                        {v.status === 'pendiente' && (
                          <>
                            <button
                              onClick={() => startClose(v)}
                              className="flex items-center gap-1 text-success hover:underline"
                            >
                              <Check className="h-3.5 w-3.5" /> Completar
                            </button>
                            <button
                              onClick={() => updateStatus.mutate({ id: v.id, status: 'cancelada' })}
                              className="flex items-center gap-1 text-destructive hover:underline"
                            >
                              <XIcon className="h-3.5 w-3.5" /> Cancelar
                            </button>
                          </>
                        )}
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
