import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CalendarPlus, MessageSquarePlus, Users } from 'lucide-react'
import apiClient from '../api'
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
  phone: string | null
  email: string | null
  status: string | null
  lastContact: string | null
  lastVisit: string | null
  churchId: number
  church: { name: string }
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function Members() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [churchId, setChurchId] = useState('')
  const [error, setError] = useState('')
  const [filterChurchId, setFilterChurchId] = useState('')
  const [filterVisited, setFilterVisited] = useState('')

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => (await apiClient.get('/api/members')).data,
  })

  const { data: churches } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: async () => (await apiClient.get('/api/churches')).data,
  })
  const needsChurchPicker = (churches?.length ?? 0) > 1

  const filteredMembers = (members || [])
    .filter((m) => !filterChurchId || m.churchId === Number(filterChurchId))
    .filter((m) => {
      if (filterVisited === 'visitado') return !!m.lastVisit
      if (filterVisited === 'no-visitado') return !m.lastVisit
      return true
    })
    .slice()
    .sort((a, b) => {
      if (!filterChurchId) {
        const churchCompare = a.church.name.localeCompare(b.church.name)
        if (churchCompare !== 0) return churchCompare
      }
      return a.name.localeCompare(b.name)
    })

  const createMember = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { name, phone, email, status }
      if (needsChurchPicker) payload.churchId = Number(churchId)
      return (await apiClient.post('/api/members', payload)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setShowForm(false)
      setName('')
      setPhone('')
      setEmail('')
      setStatus('')
      setChurchId('')
      setError('')
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al crear el miembro')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }
    if (needsChurchPicker && !churchId) {
      setError('Selecciona una iglesia')
      return
    }
    createMember.mutate()
  }

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo Miembro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Nombre completo *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                  <option value="">Estatus espiritual...</option>
                  <option value="miembro-activo">Miembro activo</option>
                  <option value="miembro-inactivo">Miembro inactivo</option>
                  <option value="visitante">Visitante</option>
                  <option value="interesado">Interesado</option>
                </select>
                {needsChurchPicker && (
                  <select value={churchId} onChange={(e) => setChurchId(e.target.value)} className={inputClass}>
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
                <Button type="submit" loading={createMember.isPending}>
                  Guardar
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-wrap gap-3">
          <CardTitle>Lista de Miembros</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {needsChurchPicker && (
              <select
                value={filterChurchId}
                onChange={(e) => setFilterChurchId(e.target.value)}
                className={`${inputClass} w-auto text-sm`}
              >
                <option value="">Todas las iglesias</option>
                {churches?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={filterVisited}
              onChange={(e) => setFilterVisited(e.target.value)}
              className={`${inputClass} w-auto text-sm`}
            >
              <option value="">Visitados y no visitados</option>
              <option value="visitado">Solo visitados</option>
              <option value="no-visitado">Solo no visitados</option>
            </select>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Nuevo Miembro
            </Button>
          </div>
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : filteredMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={filterChurchId ? 'No hay miembros en esta iglesia' : 'No hay miembros registrados aún'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Nombre</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Teléfono</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Estatus</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Iglesia</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Último Contacto</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Visitado</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Última Visita</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{m.name}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{m.phone || '-'}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{m.email || '-'}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{m.status || '-'}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{m.church?.name}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {m.lastContact ? new Date(m.lastContact).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <Badge variant={m.lastVisit ? 'success' : 'neutral'}>
                        {m.lastVisit ? 'Visitado' : 'No visitado'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {m.lastVisit ? new Date(m.lastVisit).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/visits?memberId=${m.id}`)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" /> Agendar
                        </button>
                        <button
                          onClick={() => navigate(`/contacts?memberId=${m.id}`)}
                          className="flex items-center gap-1 text-accent hover:underline"
                        >
                          <MessageSquarePlus className="h-3.5 w-3.5" /> Contacto
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
