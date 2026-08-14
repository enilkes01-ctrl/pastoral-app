import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, CalendarPlus, MessageSquarePlus, Sparkles, BellRing, X, CheckCircle2, Clock, ListChecks, ListPlus } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts'
import apiClient from '../api'
import { useStore } from '../store'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'

interface Church {
  id: number
  name: string
}

interface Member {
  id: number
  churchId: number
  followUpLevel: string
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

// Trío categórico validado (CVD-seguro) para el gráfico de miembros por iglesia
const CHURCH_COLORS_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a']
const CHURCH_COLORS_DARK = ['#3987e5', '#d95926', '#199e70']

const LEVEL_LABEL: Record<string, string> = { normal: 'Normal', prioritario: 'Prioritario', urgente: 'Urgente' }

const QUICK_ACTIONS = [
  { to: '/members', label: 'Ver Miembros', icon: Users },
  { to: '/visits', label: 'Agendar', icon: CalendarPlus },
  { to: '/contacts', label: 'Registrar Contacto', icon: MessageSquarePlus },
  { to: '/tasks', label: 'Nueva Tarea', icon: ListPlus },
  { to: '/suggestions', label: 'Sugerencias del Día', icon: Sparkles },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const theme = useStore((state) => state.theme)
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

  const churchColors = theme === 'dark' ? CHURCH_COLORS_DARK : CHURCH_COLORS_LIGHT
  const membersByChurchData = byChurch.map((row) => ({ name: row.church.name, miembros: row.members }))

  const levelData = ['normal', 'prioritario', 'urgente'].map((level) => ({
    name: LEVEL_LABEL[level],
    value: (members || []).filter((m) => m.followUpLevel === level).length,
    color:
      level === 'normal'
        ? 'hsl(var(--muted-foreground))'
        : level === 'prioritario'
          ? 'hsl(var(--warning))'
          : 'hsl(var(--destructive))',
  }))

  const weeklyContacts = Array.from({ length: 8 }, (_, i) => {
    const weeksAgo = 7 - i
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - weeksAgo * 7)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
    const count = (contacts || []).filter((c) => {
      const d = new Date(c.date)
      return d >= start && d < end
    }).length
    return { label: `${start.getMonth() + 1}/${start.getDate()}`, contactos: count }
  })

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Miembros por Iglesia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={membersByChurchData} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="miembros" radius={[4, 4, 0, 0]}>
                  {membersByChurchData.map((_, i) => (
                    <Cell key={i} fill={churchColors[i % churchColors.length]} />
                  ))}
                  <LabelList dataKey="miembros" position="top" fill="hsl(var(--foreground))" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Miembros por Nivel de Seguimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={levelData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {levelData.map((d, i) => (
                    <Cell key={i} fill={d.color} stroke="hsl(var(--card))" strokeWidth={2} />
                  ))}
                  <LabelList dataKey="value" position="inside" fill="hsl(var(--card))" fontSize={12} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value) => <span style={{ color: 'hsl(var(--foreground))', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contactos por Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyContacts} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="contactos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="contactos" position="top" fill="hsl(var(--foreground))" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
