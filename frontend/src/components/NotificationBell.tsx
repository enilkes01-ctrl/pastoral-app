import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, Clock, ListChecks, Church, Heart } from 'lucide-react'
import apiClient from '../api'
import Badge from './ui/Badge'

interface Visit {
  id: number
  status: string
  scheduledDate: string
  member: { name: string }
}

interface TaskItem {
  id: number
  status: string
  dueDate: string | null
  description: string | null
  member: { name: string }
}

interface Preaching {
  id: number
  title: string
  date: string
}

interface PrayerRequest {
  id: number
  status: string
  scheduledAt: string | null
  description: string
  member: { name: string }
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const { data: visits } = useQuery<Visit[]>({
    queryKey: ['visits'],
    queryFn: async () => (await apiClient.get('/api/visits')).data,
  })
  const { data: tasks } = useQuery<TaskItem[]>({
    queryKey: ['tasks'],
    queryFn: async () => (await apiClient.get('/api/tasks')).data,
  })
  const { data: preachings } = useQuery<Preaching[]>({
    queryKey: ['preaching'],
    queryFn: async () => (await apiClient.get('/api/preaching')).data,
  })
  const { data: prayerRequests } = useQuery<PrayerRequest[]>({
    queryKey: ['prayer-requests'],
    queryFn: async () => (await apiClient.get('/api/prayer-requests')).data,
  })

  const now = new Date()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999)

  const overdueVisits = (visits || []).filter((v) => v.status === 'pendiente' && new Date(v.scheduledDate) <= endOfToday)
  const dueSoonTasks = (tasks || []).filter(
    (t) => t.status === 'pendiente' && t.dueDate && new Date(t.dueDate) <= endOfTomorrow
  )
  const upcomingPreachings = (preachings || []).filter((p) => {
    const d = new Date(p.date)
    return d >= now && d <= endOfTomorrow
  })
  const dueSoonPrayers = (prayerRequests || []).filter(
    (p) => p.status === 'activo' && p.scheduledAt && new Date(p.scheduledAt) <= endOfTomorrow
  )

  const total = overdueVisits.length + dueSoonTasks.length + upcomingPreachings.length + dueSoonPrayers.length

  const goTo = (path: string) => {
    navigate(path)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
        className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px] leading-none"
          >
            {total}
          </Badge>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-border bg-card p-2 shadow-md">
          {total === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No tienes notificaciones pendientes.</p>
          ) : (
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {overdueVisits.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 px-2 text-xs font-semibold text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Visitas vencidas
                  </p>
                  {overdueVisits.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => goTo('/visits')}
                      className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-primary/5"
                    >
                      <span className="font-medium text-foreground">{v.member?.name}</span>{' '}
                      <span className="text-xs text-muted-foreground">
                        · {new Date(v.scheduledDate).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {dueSoonTasks.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 px-2 text-xs font-semibold text-muted-foreground">
                    <ListChecks className="h-3.5 w-3.5" /> Tareas por vencer
                  </p>
                  {dueSoonTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => goTo('/tasks')}
                      className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-primary/5"
                    >
                      <span className="font-medium text-foreground">{t.member?.name}</span>{' '}
                      <span className="text-xs text-muted-foreground">
                        · {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {upcomingPreachings.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 px-2 text-xs font-semibold text-muted-foreground">
                    <Church className="h-3.5 w-3.5" /> Predicaciones próximas
                  </p>
                  {upcomingPreachings.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => goTo('/visits')}
                      className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-primary/5"
                    >
                      <span className="font-medium text-foreground">{p.title}</span>{' '}
                      <span className="text-xs text-muted-foreground">
                        · {new Date(p.date).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {dueSoonPrayers.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 px-2 text-xs font-semibold text-muted-foreground">
                    <Heart className="h-3.5 w-3.5" /> Oración
                  </p>
                  {dueSoonPrayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => goTo('/prayer')}
                      className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-primary/5"
                    >
                      <span className="font-medium text-foreground">{p.member?.name}</span>{' '}
                      <span className="text-xs text-muted-foreground">
                        · {p.scheduledAt ? new Date(p.scheduledAt).toLocaleDateString() : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
