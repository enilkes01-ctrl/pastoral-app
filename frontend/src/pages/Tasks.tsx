import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ListChecks, Check, X as XIcon } from 'lucide-react'
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

interface Task {
  id: number
  memberId: number
  type: string
  description: string | null
  dueDate: string | null
  status: string
  member: { name: string; phone: string | null }
  user: { firstName: string | null; lastName: string | null }
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

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
}

const STATUS_VARIANT: Record<string, 'warning' | 'success'> = {
  pendiente: 'warning',
  completada: 'success',
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function Tasks() {
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [memberId, setMemberId] = useState('')
  const [type, setType] = useState('volver-a-visitar')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')

  const resetForm = () => {
    setShowForm(false)
    setMemberId('')
    setType('volver-a-visitar')
    setDescription('')
    setDueDate('')
    setError('')
  }

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => (await apiClient.get('/api/tasks')).data,
  })

  const { data: members } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => (await apiClient.get('/api/members')).data,
  })

  const { data: churches } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: async () => (await apiClient.get('/api/churches')).data,
  })

  const createTask = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post('/api/tasks', {
          memberId: Number(memberId),
          type,
          description: description || undefined,
          dueDate: dueDate || undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al crear la tarea')
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await apiClient.put(`/api/tasks/${id}`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const removeTask = useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/api/tasks/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberId) {
      setError('Selecciona un miembro')
      return
    }
    createTask.mutate()
  }

  const sortedTasks = [...(tasks || [])].sort((a, b) => {
    if (a.status === 'pendiente' && b.status !== 'pendiente') return -1
    if (a.status !== 'pendiente' && b.status === 'pendiente') return 1
    return (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity)
  })

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva Tarea</CardTitle>
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
                />
                <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                  {Object.entries(TASK_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
                <textarea
                  placeholder="Descripción (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputClass} md:col-span-2`}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={createTask.isPending}>
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
          <CardTitle>Tareas de Seguimiento</CardTitle>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Nueva Tarea
            </Button>
          )}
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : sortedTasks.length === 0 ? (
          <EmptyState icon={ListChecks} title="No hay tareas de seguimiento aún" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Miembro</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Tipo</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Fecha límite</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Asignado a</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Estatus</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Descripción</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedTasks.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{t.member?.name}</td>
                    <td className="px-5 py-4 text-sm">
                      <Badge variant="primary">{TASK_TYPE_LABEL[t.type] || t.type}</Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {t.user?.firstName} {t.user?.lastName}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status] || t.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{t.description || '-'}</td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        {t.status === 'pendiente' && (
                          <button
                            onClick={() => updateStatus.mutate({ id: t.id, status: 'completada' })}
                            className="flex items-center gap-1 text-success hover:underline"
                          >
                            <Check className="h-3.5 w-3.5" /> Completar
                          </button>
                        )}
                        <button
                          onClick={() => removeTask.mutate(t.id)}
                          className="flex items-center gap-1 text-destructive hover:underline"
                        >
                          <XIcon className="h-3.5 w-3.5" /> Quitar
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
