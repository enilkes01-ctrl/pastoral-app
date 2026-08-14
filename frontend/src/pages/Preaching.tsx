import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Church as ChurchIcon, Pencil, X as XIcon } from 'lucide-react'
import apiClient from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

interface Church {
  id: number
  name: string
}

interface Preaching {
  id: number
  title: string
  date: string
  location: string | null
  churchId: number
  church: { name: string }
  user: { firstName: string | null; lastName: string | null }
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function Preaching() {
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [churchId, setChurchId] = useState('')
  const [error, setError] = useState('')

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setTitle('')
    setDate('')
    setLocation('')
    setChurchId('')
    setError('')
  }

  const toDatetimeLocal = (isoDate: string) => {
    const d = new Date(isoDate)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const startEdit = (p: Preaching) => {
    setEditingId(p.id)
    setTitle(p.title)
    setDate(toDatetimeLocal(p.date))
    setLocation(p.location || '')
    setChurchId(String(p.churchId))
    setError('')
    setShowForm(true)
  }

  const { data: preachings, isLoading } = useQuery<Preaching[]>({
    queryKey: ['preaching'],
    queryFn: async () => (await apiClient.get('/api/preaching')).data,
  })

  const { data: churches } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: async () => (await apiClient.get('/api/churches')).data,
  })
  const needsChurchPicker = (churches?.length ?? 0) > 1

  const createPreaching = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { title, date, location }
      if (needsChurchPicker) payload.churchId = Number(churchId)
      return (await apiClient.post('/api/preaching', payload)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preaching'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al agendar la predicación')
    },
  })

  const updatePreaching = useMutation({
    mutationFn: async () =>
      (await apiClient.put(`/api/preaching/${editingId}`, { title, date, location })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preaching'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al actualizar')
    },
  })

  const deletePreaching = useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/api/preaching/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preaching'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('El título es requerido')
      return
    }
    if (!date) {
      setError('Selecciona una fecha')
      return
    }
    if (needsChurchPicker && !editingId && !churchId) {
      setError('Selecciona una iglesia')
      return
    }
    if (editingId) {
      updatePreaching.mutate()
    } else {
      createPreaching.mutate()
    }
  }

  const sortedPreachings = [...(preachings || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Predicación' : 'Nueva Predicación'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Título o tema *"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Lugar (opcional)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputClass}
                />
                {needsChurchPicker && (
                  <select
                    value={churchId}
                    onChange={(e) => setChurchId(e.target.value)}
                    disabled={!!editingId}
                    className={`${inputClass} disabled:bg-muted disabled:text-muted-foreground`}
                  >
                    <option value="">Selecciona iglesia *...</option>
                    {churches?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={createPreaching.isPending || updatePreaching.isPending}>
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
          <CardTitle>Predicaciones</CardTitle>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Nueva Predicación
            </Button>
          )}
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : sortedPreachings.length === 0 ? (
          <EmptyState icon={ChurchIcon} title="No hay predicaciones agendadas aún" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Título</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Fecha</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Iglesia</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Lugar</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Asignado a</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedPreachings.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{p.title}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {new Date(p.date).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{p.church?.name}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{p.location || '-'}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {p.user?.firstName} {p.user?.lastName}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => startEdit(p)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => deletePreaching.mutate(p.id)}
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
