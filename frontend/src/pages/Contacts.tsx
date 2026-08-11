import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  churchId: number
}

interface Contact {
  id: number
  memberId: number
  type: string
  date: string
  notes: string | null
  viaSms: boolean
  viaEmail: boolean
  member: { name: string; phone: string | null }
  user: { firstName: string | null; lastName: string | null }
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

export default function Contacts() {
  const logout = useStore((state) => state.logout)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const [showForm, setShowForm] = useState(!!searchParams.get('memberId'))
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formChurchId, setFormChurchId] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberId, setMemberId] = useState(searchParams.get('memberId') || '')
  const [type, setType] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [viaSms, setViaSms] = useState(false)
  const [viaEmail, setViaEmail] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormChurchId('')
    setMemberSearch('')
    setMemberId('')
    setType('')
    setDate('')
    setNotes('')
    setViaSms(false)
    setViaEmail(false)
    setError('')
  }

  // datetime-local necesita "YYYY-MM-DDTHH:mm" en hora local, sin segundos ni zona
  const toDatetimeLocal = (isoDate: string) => {
    const d = new Date(isoDate)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const startEdit = (c: Contact) => {
    setEditingId(c.id)
    setMemberId(String(c.memberId))
    const existingMember = members?.find((m) => m.id === c.memberId)
    if (existingMember) setFormChurchId(String(existingMember.churchId))
    setType(c.type)
    setDate(toDatetimeLocal(c.date))
    setNotes(c.notes || '')
    setViaSms(c.viaSms)
    setViaEmail(c.viaEmail)
    setError('')
    setShowForm(true)
  }

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => (await apiClient.get('/api/contacts')).data,
  })

  const { data: members } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => (await apiClient.get('/api/members')).data,
  })

  const { data: churches } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: async () => (await apiClient.get('/api/churches')).data,
  })
  const needsChurchPicker = (churches?.length ?? 0) > 1

  // Si venimos de "Registrar contacto" en un miembro específico, deducir su iglesia
  useEffect(() => {
    const preselectedMemberId = searchParams.get('memberId')
    if (preselectedMemberId && members && !formChurchId) {
      const preselected = members.find((m) => String(m.id) === preselectedMemberId)
      if (preselected) setFormChurchId(String(preselected.churchId))
    }
  }, [members, searchParams, formChurchId])

  const membersForChurch = (members || [])
    .filter((m) => !needsChurchPicker || (formChurchId && m.churchId === Number(formChurchId)))
    .filter((m) => !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()))

  const createContact = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post('/api/contacts', {
          memberId: Number(memberId),
          type,
          date,
          notes,
          viaSms,
          viaEmail,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al registrar el contacto')
    },
  })

  const updateContact = useMutation({
    mutationFn: async () =>
      (
        await apiClient.put(`/api/contacts/${editingId}`, {
          type,
          date,
          notes,
          viaSms,
          viaEmail,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      resetForm()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Error al actualizar el contacto')
    },
  })

  const deleteContact = useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/api/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const handleCancel = (id: number) => {
    if (window.confirm('¿Cancelar este contacto? Esta acción no se puede deshacer.')) {
      deleteContact.mutate(id)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (needsChurchPicker && !editingId && !formChurchId) {
      setError('Selecciona una iglesia')
      return
    }
    if (!memberId) {
      setError('Selecciona un miembro')
      return
    }
    if (!type) {
      setError('Selecciona el tipo de contacto')
      return
    }
    if (!date) {
      setError('Selecciona una fecha')
      return
    }
    if (editingId) {
      updateContact.mutate()
    } else {
      createContact.mutate()
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Historial de Contactos</h1>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Editar Contacto' : 'Nuevo Contacto'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {needsChurchPicker && (
                  <select
                    value={formChurchId}
                    onChange={(e) => {
                      setFormChurchId(e.target.value)
                      setMemberId('')
                      setMemberSearch('')
                    }}
                    disabled={!!editingId}
                    className="border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">Selecciona iglesia *...</option>
                    {churches?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  disabled={!!editingId || (needsChurchPicker && !formChurchId)}
                  className="border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                />
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  disabled={!!editingId || (needsChurchPicker && !formChurchId)}
                  size={memberSearch ? 6 : undefined}
                  className="border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500 md:col-span-2"
                >
                  <option value="">
                    {needsChurchPicker && !formChurchId
                      ? 'Primero selecciona una iglesia...'
                      : 'Selecciona miembro *...'}
                  </option>
                  {membersForChurch.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Tipo de contacto *...</option>
                  <option value="llamada">Llamada</option>
                  <option value="mensaje">Mensaje</option>
                </select>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-1 text-sm text-gray-700">
                    <input type="checkbox" checked={viaSms} onChange={(e) => setViaSms(e.target.checked)} />
                    <span>Vía SMS/WhatsApp</span>
                  </label>
                  <label className="flex items-center space-x-1 text-sm text-gray-700">
                    <input type="checkbox" checked={viaEmail} onChange={(e) => setViaEmail(e.target.checked)} />
                    <span>Vía Email</span>
                  </label>
                </div>
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
                  disabled={createContact.isPending || updateContact.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
                >
                  {createContact.isPending || updateContact.isPending ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
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
            <h2 className="text-lg font-semibold text-gray-900">Contactos Registrados</h2>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
              >
                + Registrar Contacto
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="px-6 py-12 text-center text-gray-500">Cargando...</div>
          ) : !contacts || contacts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No hay contactos registrados aún.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Miembro</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tipo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Registrado por</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Notas</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contacts.map((c) => (
                    <tr key={c.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">{c.member?.name}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${TYPE_COLOR[c.type]}`}>
                          {TYPE_LABEL[c.type] || c.type}
                        </span>
                        {c.viaSms && <span className="ml-1 text-xs text-gray-500">(SMS/WhatsApp)</span>}
                        {c.viaEmail && <span className="ml-1 text-xs text-gray-500">(Email)</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(c.date).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {c.user?.firstName} {c.user?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{c.notes || '-'}</td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button onClick={() => startEdit(c)} className="text-blue-600 hover:underline">
                          Editar
                        </button>
                        <button onClick={() => handleCancel(c.id)} className="text-red-600 hover:underline">
                          Cancelar
                        </button>
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
