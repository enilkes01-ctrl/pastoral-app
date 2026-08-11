import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../store'
import apiClient from '../api'
import MemberPicker from '../components/MemberPicker'

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
  type: string
  scheduledDate: string
  status: string
  notes: string | null
  member: { name: string; phone: string | null }
  user: { firstName: string | null; lastName: string | null }
}

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

const STATUS_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  completada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
}

const TYPE_LABEL: Record<string, string> = {
  visita: 'Visita',
  llamada: 'Llamada',
  mensaje: 'Mensaje',
}

const TYPE_COLOR: Record<string, string> = {
  visita: 'bg-blue-100 text-blue-800',
  llamada: 'bg-purple-100 text-purple-800',
  mensaje: 'bg-teal-100 text-teal-800',
}

export default function Visits() {
  const logout = useStore((state) => state.logout)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const [showForm, setShowForm] = useState(!!searchParams.get('memberId'))
  const [memberId, setMemberId] = useState(searchParams.get('memberId') || '')
  const [type, setType] = useState('visita')
  const [scheduledDate, setScheduledDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

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
      setShowForm(false)
      setMemberId('')
      setType('visita')
      setScheduledDate('')
      setNotes('')
      setError('')
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al agendar')
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await apiClient.put(`/api/visits/${id}`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] })
    },
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
    createVisit.mutate()
  }

  const sortedVisits = [...(visits || [])].sort((a, b) => {
    if (a.status === 'pendiente' && b.status !== 'pendiente') return -1
    if (a.status !== 'pendiente' && b.status === 'pendiente') return 1
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  })

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuevo Pendiente</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MemberPicker
                  members={members || []}
                  churches={churches || []}
                  value={memberId}
                  onChange={(id) => setMemberId(id)}
                />
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  <option value="visita">Visita</option>
                  <option value="llamada">Llamada</option>
                  <option value="mensaje">Mensaje</option>
                </select>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <textarea
                  placeholder="Notas (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 md:col-span-2"
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={createVisit.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
                >
                  {createVisit.isPending ? 'Guardando...' : 'Guardar'}
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
            <h2 className="text-lg font-semibold text-gray-900">Próximos Pendientes</h2>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              >
                + Agendar
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="px-6 py-12 text-center text-gray-500">Cargando...</div>
          ) : sortedVisits.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No hay nada agendado aún.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Miembro</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tipo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Asignado a</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Estatus</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Notas</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedVisits.map((v) => (
                    <tr key={v.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">{v.member?.name}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${TYPE_COLOR[v.type] || TYPE_COLOR.visita}`}>
                          {TYPE_LABEL[v.type] || v.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(v.scheduledDate).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {v.user?.firstName} {v.user?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLOR[v.status]}`}>
                          {STATUS_LABEL[v.status] || v.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{v.notes || '-'}</td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        {v.status === 'pendiente' && (
                          <>
                            <button
                              onClick={() => updateStatus.mutate({ id: v.id, status: 'completada' })}
                              className="text-green-700 hover:underline"
                            >
                              Completar
                            </button>
                            <button
                              onClick={() => updateStatus.mutate({ id: v.id, status: 'cancelada' })}
                              className="text-red-700 hover:underline"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
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
