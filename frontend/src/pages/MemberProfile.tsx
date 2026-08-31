import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Camera,
  Pencil,
  Plus,
  X as XIcon,
  Users,
  HeartHandshake,
  Cake,
  Droplets,
  MapPin,
  Phone,
  Mail,
  CalendarClock,
  MessageSquare,
  PhoneCall,
  Home,
  CheckCircle2,
  ListChecks,
  Heart,
} from 'lucide-react'
import apiClient from '../api'
import { useStore } from '../store'
import WhatsAppButton from '../components/WhatsAppButton'
import MemberPicker from '../components/MemberPicker'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

interface FamilyMember {
  id: number
  name: string
  relation: string | null
  dob: string | null
}

interface Need {
  id: number
  description: string
  priority: string | null
  resolved: boolean
}

interface TagT {
  id: number
  name: string
  color: string | null
}

interface Church {
  id: number
  name: string
}

interface MemberLite {
  id: number
  name: string
  churchId: number
}

interface TimelineEntry {
  id: number
  kind: 'contact' | 'visit' | 'task' | 'prayer'
  type: string
  date: string
  status?: string
  notes: string | null
  outcome?: string | null
  commitments?: string | null
  user: { firstName: string | null; lastName: string | null }
}

interface TaskEntry {
  id: number
  type: string
  description: string | null
  dueDate: string | null
  status: string
  createdAt: string
  user: { firstName: string | null; lastName: string | null }
}

interface PrayerEntry {
  id: number
  description: string
  scheduledAt: string | null
  status: string
  createdAt: string
  user: { firstName: string | null; lastName: string | null }
}

interface MemberDetail {
  id: number
  name: string
  phone: string | null
  email: string | null
  status: string | null
  photo: string | null
  address: string | null
  birthDate: string | null
  baptismDate: string | null
  ministries: string | null
  responsibilities: string | null
  interests: string | null
  characteristics: string | null
  followUpLevel: string
  nextAction: string | null
  church: { name: string }
  families: FamilyMember[]
  needs: Need[]
  contacts: Array<{ id: number; type: string; date: string; notes: string | null; user: { firstName: string | null; lastName: string | null } }>
  visits: Array<{
    id: number
    type: string
    scheduledDate: string
    status: string
    notes: string | null
    outcome: string | null
    topics: string | null
    commitments: string | null
    user: { firstName: string | null; lastName: string | null }
  }>
  tags: TagT[]
  tasks: TaskEntry[]
  prayerRequests: PrayerEntry[]
  familyGroup: { members: MemberLite[] } | null
}

const LEVEL_LABEL: Record<string, string> = { normal: 'Normal', prioritario: 'Prioritario', urgente: 'Urgente' }
const LEVEL_VARIANT: Record<string, 'neutral' | 'warning' | 'destructive'> = {
  normal: 'neutral',
  prioritario: 'warning',
  urgente: 'destructive',
}
const TYPE_LABEL: Record<string, string> = { visita: 'Visita', llamada: 'Llamada', mensaje: 'Mensaje' }
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
const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  cancelada: 'Cancelada',
  activo: 'Activo',
  contestada: 'Contestada',
  caducada: 'Caducada',
}
const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'destructive' | 'primary' | 'neutral'> = {
  pendiente: 'warning',
  completada: 'success',
  cancelada: 'destructive',
  activo: 'primary',
  contestada: 'success',
  caducada: 'neutral',
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const size = 300
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas no disponible'))
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

export default function MemberProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useStore((state) => state.user)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState<Record<string, string>>({})
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [tagSearch, setTagSearch] = useState('')

  const [showFamilyForm, setShowFamilyForm] = useState(false)
  const [editingFamilyId, setEditingFamilyId] = useState<number | null>(null)
  const [familyForm, setFamilyForm] = useState({ name: '', relation: '', dob: '' })

  const [showNeedForm, setShowNeedForm] = useState(false)
  const [editingNeedId, setEditingNeedId] = useState<number | null>(null)
  const [needForm, setNeedForm] = useState({ description: '', priority: '' })

  const [showFamilyGroupPicker, setShowFamilyGroupPicker] = useState(false)
  const [familyGroupPick, setFamilyGroupPick] = useState('')
  const [familyGroupError, setFamilyGroupError] = useState('')

  const { data: member, isLoading } = useQuery<MemberDetail>({
    queryKey: ['member', id],
    queryFn: async () => (await apiClient.get(`/api/members/${id}`)).data,
  })

  const { data: tags } = useQuery<TagT[]>({
    queryKey: ['tags'],
    queryFn: async () => (await apiClient.get('/api/tags')).data,
  })

  const { data: allMembers } = useQuery<MemberLite[]>({
    queryKey: ['members'],
    queryFn: async () => (await apiClient.get('/api/members')).data,
  })

  const { data: churches } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: async () => (await apiClient.get('/api/churches')).data,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['member', id] })

  const updateProfile = useMutation({
    mutationFn: async (data: Record<string, unknown>) => apiClient.put(`/api/members/${id}`, data),
    onSuccess: () => {
      invalidate()
      setEditingProfile(false)
    },
  })

  const uploadPhoto = useMutation({
    mutationFn: async (photo: string) => apiClient.put(`/api/members/${id}`, { photo }),
    onSuccess: invalidate,
  })

  const addTag = useMutation({
    mutationFn: async (tagId: number) => apiClient.post(`/api/members/${id}/tags/${tagId}`),
    onSuccess: invalidate,
  })
  const removeTag = useMutation({
    mutationFn: async (tagId: number) => apiClient.delete(`/api/members/${id}/tags/${tagId}`),
    onSuccess: invalidate,
  })
  const createTag = useMutation({
    mutationFn: async (name: string) => (await apiClient.post('/api/tags', { name })).data,
    onSuccess: (tag: TagT) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      addTag.mutate(tag.id)
      setTagSearch('')
    },
  })

  const saveFamily = useMutation({
    mutationFn: async () => {
      const payload = { ...familyForm, relation: familyForm.relation || null, dob: familyForm.dob || null }
      return editingFamilyId
        ? apiClient.put(`/api/members/${id}/families/${editingFamilyId}`, payload)
        : apiClient.post(`/api/members/${id}/families`, payload)
    },
    onSuccess: () => {
      invalidate()
      setShowFamilyForm(false)
      setEditingFamilyId(null)
      setFamilyForm({ name: '', relation: '', dob: '' })
    },
  })
  const deleteFamily = useMutation({
    mutationFn: async (familyId: number) => apiClient.delete(`/api/members/${id}/families/${familyId}`),
    onSuccess: invalidate,
  })

  const saveNeed = useMutation({
    mutationFn: async () => {
      const payload = { ...needForm, priority: needForm.priority || null }
      return editingNeedId
        ? apiClient.put(`/api/members/${id}/needs/${editingNeedId}`, payload)
        : apiClient.post(`/api/members/${id}/needs`, payload)
    },
    onSuccess: () => {
      invalidate()
      setShowNeedForm(false)
      setEditingNeedId(null)
      setNeedForm({ description: '', priority: '' })
    },
  })
  const toggleNeedResolved = useMutation({
    mutationFn: async ({ needId, resolved }: { needId: number; resolved: boolean }) =>
      apiClient.put(`/api/members/${id}/needs/${needId}`, { resolved }),
    onSuccess: invalidate,
  })
  const deleteNeed = useMutation({
    mutationFn: async (needId: number) => apiClient.delete(`/api/members/${id}/needs/${needId}`),
    onSuccess: invalidate,
  })

  const linkFamilyMember = useMutation({
    mutationFn: async (otherId: number) => apiClient.post(`/api/members/${id}/family-group/${otherId}`),
    onSuccess: () => {
      invalidate()
      setShowFamilyGroupPicker(false)
      setFamilyGroupPick('')
    },
    onError: (err: any) => {
      setFamilyGroupError(err.response?.data?.error || 'Error al vincular')
      setFamilyGroupPick('')
    },
  })
  const unlinkFamilyMember = useMutation({
    mutationFn: async (otherId: number) => apiClient.delete(`/api/members/${otherId}/family-group`),
    onSuccess: invalidate,
  })

  if (isLoading) return <Spinner />
  if (!member) return <EmptyState icon={Users} title="Miembro no encontrado" />

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await resizeImage(file)
    uploadPhoto.mutate(dataUrl)
  }

  const startEditProfile = () => {
    setProfileForm({
      phone: member.phone || '',
      email: member.email || '',
      address: member.address || '',
      status: member.status || '',
      birthDate: toDateInput(member.birthDate),
      baptismDate: toDateInput(member.baptismDate),
      ministries: member.ministries || '',
      responsibilities: member.responsibilities || '',
      interests: member.interests || '',
      characteristics: member.characteristics || '',
      followUpLevel: member.followUpLevel,
      nextAction: member.nextAction || '',
    })
    setEditingProfile(true)
  }

  const assignedTagIds = new Set(member.tags.map((t) => t.id))
  const availableTags = (tags || []).filter(
    (t) => !assignedTagIds.has(t.id) && t.name.toLowerCase().includes(tagSearch.toLowerCase())
  )
  const exactTagMatch = (tags || []).some((t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase())

  const linkedFamilyMembers = (member.familyGroup?.members || []).filter((m) => m.id !== member.id)
  const linkedFamilyIds = new Set((member.familyGroup?.members || []).map((m) => m.id))
  const availableFamilyGroupMembers = (allMembers || []).filter(
    (m) => m.id !== member.id && !linkedFamilyIds.has(m.id)
  )

  const timeline: TimelineEntry[] = [
    ...member.contacts.map((c) => ({ ...c, kind: 'contact' as const, date: c.date })),
    ...member.visits.map((v) => ({
      ...v,
      kind: 'visit' as const,
      date: v.scheduledDate,
      notes: v.notes || v.topics,
    })),
    ...member.tasks.map((t) => ({
      id: t.id,
      kind: 'task' as const,
      type: t.type,
      date: t.dueDate || t.createdAt,
      status: t.status,
      notes: t.description,
      user: t.user,
    })),
    ...member.prayerRequests.map((p) => ({
      id: p.id,
      kind: 'prayer' as const,
      type: 'oracion',
      date: p.scheduledAt || p.createdAt,
      status: p.status,
      notes: p.description,
      user: p.user,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/members')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a Miembros
      </button>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/10"
            >
              {member.photo ? (
                <img src={member.photo} alt={member.name} className="h-full w-full object-cover" />
              ) : (
                <Users className="h-8 w-8 text-primary" />
              )}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm"
              aria-label="Cambiar foto"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-xl font-semibold text-foreground">{member.name}</h1>
              <Badge variant="primary">{member.church.name}</Badge>
              <Badge variant={LEVEL_VARIANT[member.followUpLevel]}>{LEVEL_LABEL[member.followUpLevel]}</Badge>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              {member.tags.map((t) => (
                <span
                  key={t.id}
                  className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {t.name}
                  <button onClick={() => removeTag.mutate(t.id)} aria-label={`Quitar ${t.name}`}>
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => setShowTagPicker((v) => !v)}
                className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="h-3 w-3" /> Etiqueta
              </button>
            </div>

            {showTagPicker && (
              <div className="mx-auto max-w-xs rounded-lg border border-border p-2 sm:mx-0">
                <input
                  autoFocus
                  placeholder="Buscar o crear etiqueta..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className={`${inputClass} mb-2 text-sm`}
                />
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {availableTags.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        addTag.mutate(t.id)
                        setTagSearch('')
                        setShowTagPicker(false)
                      }}
                      className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-primary/5"
                    >
                      {t.name}
                    </button>
                  ))}
                  {tagSearch.trim() && !exactTagMatch && user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        createTag.mutate(tagSearch.trim())
                        setShowTagPicker(false)
                      }}
                      className="block w-full rounded px-2 py-1 text-left text-sm text-primary hover:bg-primary/5"
                    >
                      + Crear etiqueta "{tagSearch.trim()}"
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <WhatsAppButton phone={member.phone} name={member.name} />
            <Button variant="outline" size="sm" onClick={startEditProfile}>
              <Pencil className="h-4 w-4" /> Editar perfil
            </Button>
          </div>
        </CardContent>
      </Card>

      {editingProfile ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateProfile.mutate(profileForm)
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  placeholder="Teléfono"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputClass}
                />
                <input
                  placeholder="Email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputClass}
                />
                <input
                  placeholder="Dirección"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                  className={`${inputClass} md:col-span-2`}
                />
                <select
                  value={profileForm.status}
                  onChange={(e) => setProfileForm((f) => ({ ...f, status: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Estatus espiritual...</option>
                  <option value="miembro-activo">Miembro activo</option>
                  <option value="miembro-inactivo">Miembro inactivo</option>
                  <option value="visitante">Visitante</option>
                  <option value="interesado">Interesado</option>
                </select>
                <select
                  value={profileForm.followUpLevel}
                  onChange={(e) => setProfileForm((f) => ({ ...f, followUpLevel: e.target.value }))}
                  className={inputClass}
                >
                  <option value="normal">Nivel: Normal</option>
                  <option value="prioritario">Nivel: Prioritario</option>
                  <option value="urgente">Nivel: Urgente</option>
                </select>
                <label className="text-sm text-muted-foreground">
                  Fecha de nacimiento
                  <input
                    type="date"
                    value={profileForm.birthDate}
                    onChange={(e) => setProfileForm((f) => ({ ...f, birthDate: e.target.value }))}
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <label className="text-sm text-muted-foreground">
                  Fecha de bautismo
                  <input
                    type="date"
                    value={profileForm.baptismDate}
                    onChange={(e) => setProfileForm((f) => ({ ...f, baptismDate: e.target.value }))}
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <input
                  placeholder="Ministerios (ej. Música, Diaconado)"
                  value={profileForm.ministries}
                  onChange={(e) => setProfileForm((f) => ({ ...f, ministries: e.target.value }))}
                  className={inputClass}
                />
                <input
                  placeholder="Responsabilidades"
                  value={profileForm.responsibilities}
                  onChange={(e) => setProfileForm((f) => ({ ...f, responsibilities: e.target.value }))}
                  className={inputClass}
                />
                <input
                  placeholder="Intereses"
                  value={profileForm.interests}
                  onChange={(e) => setProfileForm((f) => ({ ...f, interests: e.target.value }))}
                  className={`${inputClass} md:col-span-2`}
                />
                <textarea
                  placeholder="Características (cualidades, aptitudes y actitudes espirituales)"
                  value={profileForm.characteristics}
                  onChange={(e) => setProfileForm((f) => ({ ...f, characteristics: e.target.value }))}
                  className={`${inputClass} md:col-span-2`}
                  rows={3}
                />
                <textarea
                  placeholder="Próxima acción recomendada (ej. Llamar esta semana)"
                  value={profileForm.nextAction}
                  onChange={(e) => setProfileForm((f) => ({ ...f, nextAction: e.target.value }))}
                  className={`${inputClass} md:col-span-2`}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={updateProfile.isPending}>
                  Guardar
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingProfile(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow icon={Phone} label="Teléfono" value={member.phone} />
            <InfoRow icon={Mail} label="Email" value={member.email} />
            <div className="flex items-start gap-2">
              <Home className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Dirección</p>
                <p className="text-sm text-foreground">{member.address || '-'}</p>
                {member.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <MapPin className="h-3 w-3" /> Cómo llegar
                  </a>
                )}
              </div>
            </div>
            <InfoRow icon={Cake} label="Nacimiento" value={member.birthDate ? new Date(member.birthDate).toLocaleDateString() : null} />
            <InfoRow icon={Droplets} label="Bautismo" value={member.baptismDate ? new Date(member.baptismDate).toLocaleDateString() : null} />
            <InfoRow icon={HeartHandshake} label="Ministerios" value={member.ministries} />
            <InfoRow icon={Users} label="Responsabilidades" value={member.responsibilities} />
            <InfoRow icon={MapPin} label="Intereses" value={member.interests} />
            {member.characteristics && (
              <div className="sm:col-span-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
                <span className="font-medium">Características: </span>
                {member.characteristics}
              </div>
            )}
            {member.nextAction && (
              <div className="sm:col-span-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-foreground">
                <span className="font-medium">Próxima acción: </span>
                {member.nextAction}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Familia */}
        <Card>
          <CardHeader>
            <CardTitle>Familia</CardTitle>
            {!showFamilyForm && (
              <Button size="sm" variant="outline" onClick={() => setShowFamilyForm(true)}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {showFamilyForm && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  saveFamily.mutate()
                }}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <input
                  placeholder="Nombre *"
                  required
                  value={familyForm.name}
                  onChange={(e) => setFamilyForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                />
                <input
                  placeholder="Relación (esposa, hijo...)"
                  value={familyForm.relation}
                  onChange={(e) => setFamilyForm((f) => ({ ...f, relation: e.target.value }))}
                  className={inputClass}
                />
                <input
                  type="date"
                  value={familyForm.dob}
                  onChange={(e) => setFamilyForm((f) => ({ ...f, dob: e.target.value }))}
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={saveFamily.isPending}>
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowFamilyForm(false)
                      setEditingFamilyId(null)
                      setFamilyForm({ name: '', relation: '', dob: '' })
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
            {member.families.length === 0 && !showFamilyForm ? (
              <p className="text-sm text-muted-foreground">Sin familiares registrados.</p>
            ) : (
              member.families.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.relation || 'Familiar'}
                      {f.dob && ` · ${new Date(f.dob).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      className="text-primary hover:underline"
                      onClick={() => {
                        setEditingFamilyId(f.id)
                        setFamilyForm({ name: f.name, relation: f.relation || '', dob: toDateInput(f.dob) })
                        setShowFamilyForm(true)
                      }}
                    >
                      Editar
                    </button>
                    <button className="text-destructive hover:underline" onClick={() => deleteFamily.mutate(f.id)}>
                      Quitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Necesidades */}
        <Card>
          <CardHeader>
            <CardTitle>Necesidades</CardTitle>
            {!showNeedForm && (
              <Button size="sm" variant="outline" onClick={() => setShowNeedForm(true)}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {showNeedForm && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  saveNeed.mutate()
                }}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <textarea
                  placeholder="Descripción *"
                  required
                  value={needForm.description}
                  onChange={(e) => setNeedForm((f) => ({ ...f, description: e.target.value }))}
                  className={inputClass}
                  rows={2}
                />
                <select
                  value={needForm.priority}
                  onChange={(e) => setNeedForm((f) => ({ ...f, priority: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Prioridad...</option>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={saveNeed.isPending}>
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowNeedForm(false)
                      setEditingNeedId(null)
                      setNeedForm({ description: '', priority: '' })
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
            {member.needs.length === 0 && !showNeedForm ? (
              <p className="text-sm text-muted-foreground">Sin necesidades registradas.</p>
            ) : (
              member.needs.map((n) => (
                <div key={n.id} className="rounded-lg border border-border px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.resolved ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {n.description}
                    </p>
                    {n.priority && <Badge variant={n.priority === 'alta' ? 'destructive' : 'neutral'}>{n.priority}</Badge>}
                  </div>
                  <div className="mt-1 flex gap-2 text-xs">
                    <button
                      className="flex items-center gap-1 text-success hover:underline"
                      onClick={() => toggleNeedResolved.mutate({ needId: n.id, resolved: !n.resolved })}
                    >
                      <CheckCircle2 className="h-3 w-3" /> {n.resolved ? 'Marcar pendiente' : 'Marcar resuelta'}
                    </button>
                    <button
                      className="text-primary hover:underline"
                      onClick={() => {
                        setEditingNeedId(n.id)
                        setNeedForm({ description: n.description, priority: n.priority || '' })
                        setShowNeedForm(true)
                      }}
                    >
                      Editar
                    </button>
                    <button className="text-destructive hover:underline" onClick={() => deleteNeed.mutate(n.id)}>
                      Quitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Núcleo Familiar */}
      <Card>
        <CardHeader>
          <CardTitle>Núcleo Familiar</CardTitle>
          {!showFamilyGroupPicker && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowFamilyGroupPicker(true)
                setFamilyGroupError('')
              }}
            >
              <Plus className="h-4 w-4" /> Agregar al núcleo
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {familyGroupError && <p className="text-sm text-destructive">{familyGroupError}</p>}

          {showFamilyGroupPicker && (
            <div className="rounded-lg border border-border p-3">
              <MemberPicker
                members={availableFamilyGroupMembers}
                churches={churches || []}
                value={familyGroupPick}
                onChange={(pickedId) => {
                  setFamilyGroupPick(pickedId)
                  if (pickedId) linkFamilyMember.mutate(Number(pickedId))
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  setShowFamilyGroupPicker(false)
                  setFamilyGroupPick('')
                }}
              >
                Cancelar
              </Button>
            </div>
          )}

          {linkedFamilyMembers.length === 0 && !showFamilyGroupPicker ? (
            <p className="text-sm text-muted-foreground">Sin núcleo familiar vinculado.</p>
          ) : (
            linkedFamilyMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <button
                  onClick={() => navigate(`/members/${m.id}`)}
                  className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                >
                  {m.name}
                </button>
                <button
                  className="text-xs text-destructive hover:underline"
                  onClick={() => unlinkFamilyMember.mutate(m.id)}
                >
                  Quitar
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Línea de tiempo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> Línea de Tiempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Sin historial todavía" />
          ) : (
            <ol className="space-y-4 border-l border-border pl-4">
              {timeline.map((entry) => {
                const Icon =
                  entry.kind === 'task'
                    ? ListChecks
                    : entry.kind === 'prayer'
                      ? Heart
                      : entry.type === 'llamada'
                        ? PhoneCall
                        : entry.type === 'mensaje'
                          ? MessageSquare
                          : Users
                const label =
                  entry.kind === 'task'
                    ? TASK_TYPE_LABEL[entry.type] || entry.type
                    : entry.kind === 'prayer'
                      ? 'Oración'
                      : TYPE_LABEL[entry.type] || entry.type
                return (
                  <li key={`${entry.kind}-${entry.id}`} className="relative">
                    <span className="absolute -left-[21px] flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                      <Icon className="h-2.5 w-2.5 text-primary-foreground" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      {(entry.kind === 'visit' || entry.kind === 'task' || entry.kind === 'prayer') && entry.status && (
                        <Badge variant={STATUS_VARIANT[entry.status]}>{STATUS_LABEL[entry.status]}</Badge>
                      )}
                      {entry.outcome && <Badge variant="accent">{OUTCOME_LABEL[entry.outcome] || entry.outcome}</Badge>}
                      <span className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleString()}</span>
                    </div>
                    {entry.notes && <p className="mt-1 text-sm text-muted-foreground">{entry.notes}</p>}
                    {entry.commitments && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium">Compromiso: </span>
                        {entry.commitments}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.user?.firstName} {entry.user?.lastName}
                    </p>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value || '-'}</p>
      </div>
    </div>
  )
}
