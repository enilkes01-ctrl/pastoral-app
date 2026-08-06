import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../store'
import apiClient from '../api'

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
  church: { name: string }
}

export default function Members() {
  const user = useStore((state) => state.user)
  const logout = useStore((state) => state.logout)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [churchId, setChurchId] = useState('')
  const [error, setError] = useState('')

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => (await apiClient.get('/api/members')).data,
  })

  const { data: churches } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: async () => (await apiClient.get('/api/churches')).data,
    enabled: user?.role === 'admin',
  })

  const createMember = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { name, phone, email, status }
      if (user?.role === 'admin') payload.churchId = Number(churchId)
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }
    if (user?.role === 'admin' && !churchId) {
      setError('Selecciona una iglesia')
      return
    }
    createMember.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Miembros</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {showForm && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuevo Miembro</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nombre completo *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Estatus espiritual...</option>
                  <option value="miembro-activo">Miembro activo</option>
                  <option value="miembro-inactivo">Miembro inactivo</option>
                  <option value="visitante">Visitante</option>
                  <option value="interesado">Interesado</option>
                </select>
                {user?.role === 'admin' && (
                  <select
                    value={churchId}
                    onChange={(e) => setChurchId(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
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

              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={createMember.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
                >
                  {createMember.isPending ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Miembros</h2>
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
            >
              + Nuevo Miembro
            </button>
          </div>

          {isLoading ? (
            <div className="px-6 py-12 text-center text-gray-500">Cargando...</div>
          ) : !members || members.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No hay miembros registrados aún.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nombre</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Teléfono</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Estatus</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Iglesia</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Último Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">{m.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{m.phone || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{m.email || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{m.status || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{m.church?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {m.lastContact ? new Date(m.lastContact).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
