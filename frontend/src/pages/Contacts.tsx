import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MessageSquare, Pencil, X as XIcon } from 'lucide-react'
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

const TYPE_VARIANT: Record<string, 'primary' | 'accent' | 'neutral'> = {
  visita: 'primary',
  llamada: 'accent',
  mensaje: 'neutral',
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function Contacts() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const [showForm, setShowForm] = useState(!!searchParams.get('memberId'))
  const [editingId, setEditingId] = useState<number | null>(null)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
    <div className="space-y-6">
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Contacto' : 'Nuevo Contacto'}</CardTitle>
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
                  <option value="">Tipo de contacto *...</option>
                  <option value="llamada">Llamada</option>
                  <option value="mensaje">Mensaje</option>
                </select>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-sm text-foreground">
                    <input type="checkbox" checked={viaSms} onChange={(e) => setViaSms(e.target.checked)} />
                    Vía SMS/WhatsApp
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-foreground">
                    <input type="checkbox" checked={viaEmail} onChange={(e) => setViaEmail(e.target.checked)} />
                    Vía Email
                  </label>
                </div>
                <textarea
                  placeholder="Notas (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClass} md:col-span-2`}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={createContact.isPending || updateContact.isPending}>
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
          <CardTitle>Contactos Registrados</CardTitle>
          {!showForm && (
            <Button size="sm" variant="accent" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Registrar Contacto
            </Button>
          )}
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : !contacts || contacts.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No hay contactos registrados aún" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Miembro</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Tipo</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Fecha</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Registrado por</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Notas</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contacts.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{c.member?.name}</td>
                    <td className="px-5 py-4 text-sm">
                      <Badge variant={TYPE_VARIANT[c.type] || 'neutral'}>{TYPE_LABEL[c.type] || c.type}</Badge>
                      {c.viaSms && <span className="ml-1 text-xs text-muted-foreground">(SMS/WhatsApp)</span>}
                      {c.viaEmail && <span className="ml-1 text-xs text-muted-foreground">(Email)</span>}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {new Date(c.date).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {c.user?.firstName} {c.user?.lastName}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{c.notes || '-'}</td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => startEdit(c)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => handleCancel(c.id)}
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
