import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, CalendarPlus, MessageSquarePlus, Sparkles, BellRing, X, CheckCircle2, Clock, ListChecks, ListPlus } from 'lucide-react'
import apiClient from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'

interface Church {
  id: number
  name: string
}

interface Member {
  id: number
  churchId: number
}

interface Visit {
  id: number
  type: string
  status: string
  scheduledDate: string
  member: { name: string; churchId: number }
}

interface Contact {
  id: number
  type: string
  date: string
  member: { name: string }
}

interface Task {
  id: number
  status: string
  member: { churchId: number }
}

const CONTACT_TYPE_LABEL: Record<string, string> = {
  visita: 'Visita',
  llamada: 'Llamada',
  mensaje: 'Mensaje',
}

const TYPE_LABEL_PLURAL: Record<string, [string, string]> = {
  visita: ['visita', 'visitas'],
  llamada: ['llamada', 'llamadas'],
  mensaje: ['mensaje', 'mensajes'],
}

const QUICK_ACTIONS = [
  { to: '/members', label: 'Ver Miembros', icon: Users },
  { to: '/visits', label: 'Agendar', icon: CalendarPlus },
  { to: '/contacts', label: 'Registrar Contacto', icon: MessageSquarePlus },
  { to: '/tasks', label: 'Nueva Tarea', icon: ListPlus },
  { to: '/suggestions', label: 'Sugerencias del Día', icon: Sparkles },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const { data: members } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => (await apiClient.get('/api/members')).data,
  })

  const { data: visits } = useQuery<Visit[]>({
    queryKey: ['visits'],
    queryFn: async () => (await apiClient.get('/api/visits')).data,
  })

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => (await apiClient.get('/api/contacts')).data,
  })

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => (await apiClient.get('/api/tasks')).data,
  })

  const { data: churches } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: async () => (await apiClient.get('/api/churches')).data,
  })

  const totalMembers = members?.length ?? 0
  const visitasPendientes = visits?.filter((v) => v.status === 'pendiente').length ?? 0
  const visitasRealizadas = visits?.filter((v) => v.status === 'completada').length ?? 0
  const tareasPendientes = tasks?.filter((t) => t.status === 'pendiente').length ?? 0

  const activities = [
    ...(contacts || []).map((c) => ({
      date: c.date,
      text: `${CONTACT_TYPE_LABEL[c.type] || c.type} con ${c.member?.name}`,
    })),
    ...(visits || []).map((v) => ({
      date: v.scheduledDate,
      text: `Visita ${v.status} con ${v.member?.name}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const ultimaActividad = activities[0]

  // Pendientes para hoy o vencidos (fecha ya pasó y sigue en estatus "pendiente")
  const now = new Date()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const pendingDue = (visits || []).filter(
    (v) => v.status === 'pendiente' && new Date(v.scheduledDate) <= endOfToday
  )
  const pendingCounts = pendingDue.reduce((acc: Record<string, number>, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1
    return acc
  }, {})
  const pendingSummary = Object.entries(pendingCounts)
    .map(([type, count]) => {
      const [singular, plural] = TYPE_LABEL_PLURAL[type] || [type, type]
      return `${count} ${count === 1 ? singular : plural}`
    })
    .join(', ')

  const stats = [
    { label: 'Miembros', value: totalMembers, icon: Users, color: 'text-primary bg-primary/10' },
    { label: 'Visitas pendientes', value: visitasPendientes, icon: Clock, color: 'text-warning bg-warning/15' },
    { label: 'Visitas realizadas', value: visitasRealizadas, icon: CheckCircle2, color: 'text-success bg-success/15' },
    { label: 'Tareas pendientes', value: tareasPendientes, icon: ListChecks, color: 'text-accent bg-accent/15' },
  ]

  const byChurch = (churches || []).map((c) => ({
    church: c,
    members: (members || []).filter((m) => m.churchId === c.id).length,
    visitasPendientes: (visits || []).filter((v) => v.member?.churchId === c.id && v.status === 'pendiente').length,
    visitasRealizadas: (visits || []).filter((v) => v.member?.churchId === c.id && v.status === 'completada').length,
    tareasPendientes: (tasks || []).filter((t) => t.member?.churchId === c.id && t.status === 'pendiente').length,
  }))

  return (
    <div className="space-y-6">
      {!bannerDismissed && pendingDue.length > 0 && (
        <Card className="flex items-center justify-between border-warning/30 bg-warning/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 shrink-0 text-warning" />
            <p className="text-sm text-foreground">
              Tienes pendiente: <span className="font-semibold">{pendingSummary}</span> para hoy o antes.{' '}
              <button onClick={() => navigate('/visits')} className="font-medium text-primary underline">
                Ver agenda
              </button>
            </p>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            aria-label="Cerrar aviso"
            className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-warning/20"
          >
            <X className="h-4 w-4" />
          </button>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      {byChurch.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Panorama por Iglesia</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Iglesia</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Miembros</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Visitas pendientes</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Visitas realizadas</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Tareas pendientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byChurch.map((row) => (
                  <tr key={row.church.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{row.church.name}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{row.members}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{row.visitasPendientes}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{row.visitasRealizadas}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{row.tareasPendientes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-foreground">{label}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Última actividad</CardTitle>
        </CardHeader>
        <CardContent>
          {ultimaActividad ? (
            <p className="text-sm text-foreground">
              {ultimaActividad.text}{' '}
              <span className="text-muted-foreground">
                ({new Date(ultimaActividad.date).toLocaleString()})
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Sin actividad aún.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
