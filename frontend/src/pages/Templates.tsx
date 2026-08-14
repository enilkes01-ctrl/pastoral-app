import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MessageSquareText, Pencil, X as XIcon } from 'lucide-react'
import apiClient from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

interface Template {
  id: number
  name: string
  category: string
  body: string
}

const CATEGORY_LABEL: Record<string, string> = {
  bienvenida: 'Bienvenida',
  seguimiento: 'Seguimiento',
  oracion: 'Oración',
  cumpleanos: 'Cumpleaños',
  invitacion: 'Invitación',
  otro: 'Otro',
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function Templates() {
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('bienvenida')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setName('')
    setCategory('bienvenida')
    setBody('')
    setError('')
  }

  const startEdit = (t: Template) => {
    setEditingId(t.id)
    setName(t.name)
    setCategory(t.category)
    setBody(t.body)
    setError('')
    setShowForm(true)
  }

  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: async () => (await apiClient.get('/api/templates')).data,
  })

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const payload = { name, category, body }
      return editingId
        ? (await apiClient.put(`/api/templates/${editingId}`, payload)).data
        : (await apiClient.post('/api/templates', payload)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al guardar la plantilla')
    },
  })

  const deleteTemplate = useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/api/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !body.trim()) {
      setError('Nombre y texto son requeridos')
      return
    }
    saveTemplate.mutate()
  }

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  placeholder="Nombre de la plantilla *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                  {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <textarea
                  placeholder="Texto del mensaje *"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className={`${inputClass} md:col-span-2`}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground md:col-span-2">
                  Usa <code>{'{nombre}'}</code> donde quieras que aparezca el nombre del miembro.
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={saveTemplate.isPending}>
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
          <CardTitle>Plantillas de Mensaje</CardTitle>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Nueva Plantilla
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <Spinner />
          ) : !templates || templates.length === 0 ? (
            <EmptyState icon={MessageSquareText} title="No hay plantillas todavía" />
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="rounded-lg border border-border px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium text-foreground">{t.name}</span>{' '}
                      <Badge variant="primary">{CATEGORY_LABEL[t.category] || t.category}</Badge>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button className="flex items-center gap-1 text-primary hover:underline" onClick={() => startEdit(t)}>
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                      <button
                        className="flex items-center gap-1 text-destructive hover:underline"
                        onClick={() => deleteTemplate.mutate(t.id)}
                      >
                        <XIcon className="h-3 w-3" /> Quitar
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
