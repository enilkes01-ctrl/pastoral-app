import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users as UsersIcon, KeyRound } from 'lucide-react'
import apiClient from '../api'
import { useStore } from '../store'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

interface Church {
  id: number
  name: string
}

interface UserRow {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  active: boolean
  churchId: number
  church: { name: string }
  accessChurches: Church[]
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function Users() {
  const currentUser = useStore((state) => state.user)
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('visitador')
  const [churchId, setChurchId] = useState('')
  const [additionalChurchIds, setAdditionalChurchIds] = useState<number[]>([])
  const [error, setError] = useState('')

  const [resettingId, setResettingId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const { data: users, isLoading } = useQuery<UserRow[]>({
    queryKey: ['users'],
    queryFn: async () => (await apiClient.get('/api/users')).data,
    enabled: currentUser?.role === 'admin',
  })

  const { data: churches } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: async () => (await apiClient.get('/api/churches')).data,
  })

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setEmail('')
    setPassword('')
    setFirstName('')
    setLastName('')
    setRole('visitador')
    setChurchId('')
    setAdditionalChurchIds([])
    setError('')
  }

  const startEdit = (u: UserRow) => {
    setEditingId(u.id)
    setEmail(u.email)
    setFirstName(u.firstName || '')
    setLastName(u.lastName || '')
    setRole(u.role)
    setChurchId(String(u.churchId))
    setAdditionalChurchIds(u.accessChurches.map((c) => c.id))
    setError('')
    setShowForm(true)
  }

  const createUser = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post('/api/auth/register', {
          email,
          password,
          firstName,
          lastName,
          role,
          churchId: Number(churchId),
          additionalChurchIds,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al crear el usuario')
    },
  })

  const updateUser = useMutation({
    mutationFn: async () =>
      (
        await apiClient.put(`/api/users/${editingId}`, {
          firstName,
          lastName,
          role,
          churchId: Number(churchId),
          additionalChurchIds,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al actualizar')
    },
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) =>
      apiClient.put(`/api/users/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const resetPassword = useMutation({
    mutationFn: async () => apiClient.put(`/api/users/${resettingId}/password`, { newPassword }),
    onSuccess: () => {
      setResettingId(null)
      setNewPassword('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId && (!email.trim() || !password.trim())) {
      setError('Email y contraseña son requeridos')
      return
    }
    if (!churchId) {
      setError('Selecciona una iglesia principal')
      return
    }
    if (editingId) {
      updateUser.mutate()
    } else {
      createUser.mutate()
    }
  }

  if (currentUser?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Usuario' : 'Nuevo Asociado'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="email"
                  placeholder="Email *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!editingId}
                  className={`${inputClass} disabled:bg-muted disabled:text-muted-foreground`}
                />
                {!editingId && (
                  <input
                    type="password"
                    placeholder="Contraseña *"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                )}
                <input
                  type="text"
                  placeholder="Nombre"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
                <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                  <option value="visitador">Visitador</option>
                  <option value="admin">Admin</option>
                </select>
                <select value={churchId} onChange={(e) => setChurchId(e.target.value)} className={inputClass}>
                  <option value="">Iglesia principal *...</option>
                  {churches?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="md:col-span-2">
                  <p className="mb-1 text-sm text-muted-foreground">Iglesias adicionales (opcional)</p>
                  <div className="flex flex-wrap gap-3">
                    {churches
                      ?.filter((c) => String(c.id) !== churchId)
                      .map((c) => (
                        <label key={c.id} className="flex items-center gap-1.5 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={additionalChurchIds.includes(c.id)}
                            onChange={(e) =>
                              setAdditionalChurchIds((prev) =>
                                e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                              )
                            }
                          />
                          {c.name}
                        </label>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={createUser.isPending || updateUser.isPending}>
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
          <CardTitle>Usuarios</CardTitle>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Nuevo Asociado
            </Button>
          )}
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : !users || users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No hay usuarios registrados" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Nombre</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Rol</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Iglesia(s)</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Estado</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-4 text-sm">
                      <Badge variant={u.role === 'admin' ? 'primary' : 'neutral'}>
                        {u.role === 'admin' ? 'Admin' : 'Visitador'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {[u.church?.name, ...u.accessChurches.map((c) => c.name)].filter(Boolean).join(', ')}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <Badge variant={u.active ? 'success' : 'destructive'}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex flex-wrap items-center gap-3">
                        <button onClick={() => startEdit(u)} className="text-primary hover:underline">
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setResettingId(u.id)
                            setNewPassword('')
                          }}
                          className="flex items-center gap-1 text-accent hover:underline"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Restablecer contraseña
                        </button>
                        <button
                          onClick={() => toggleActive.mutate({ id: u.id, active: !u.active })}
                          disabled={u.id === currentUser?.id}
                          className="text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {u.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                      {resettingId === u.id && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            resetPassword.mutate()
                          }}
                          className="mt-2 flex items-center gap-2"
                        >
                          <input
                            type="password"
                            placeholder="Nueva contraseña"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={`${inputClass} w-auto text-sm`}
                          />
                          <Button type="submit" size="sm" loading={resetPassword.isPending}>
                            Guardar
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setResettingId(null)}>
                            Cancelar
                          </Button>
                        </form>
                      )}
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
