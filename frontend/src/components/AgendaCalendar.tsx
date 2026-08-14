import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card'
import Badge from './ui/Badge'
import Button from './ui/Button'

interface Visit {
  id: number
  type: string
  scheduledDate: string
  status: string
  member: { name: string }
}

interface Preaching {
  id: number
  title: string
  date: string
  location: string | null
}

interface Props {
  visits: Visit[]
  preachings: Preaching[]
}

type EventType = 'visita' | 'llamada' | 'mensaje' | 'predicacion'

interface CalEvent {
  id: string
  label: string
  detail: string | null
  type: EventType
  status?: string
  dayKey: string
  time: string
}

const TYPE_LABEL: Record<EventType, string> = {
  visita: 'Visita',
  llamada: 'Llamada',
  mensaje: 'Mensaje',
  predicacion: 'Predicación',
}

const TYPE_DOT: Record<EventType, string> = {
  visita: 'bg-primary',
  llamada: 'bg-accent',
  mensaje: 'bg-muted-foreground',
  predicacion: 'bg-success',
}

const TYPE_BADGE: Record<EventType, 'primary' | 'accent' | 'neutral' | 'success'> = {
  visita: 'primary',
  llamada: 'accent',
  mensaje: 'neutral',
  predicacion: 'success',
}

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function AgendaCalendar({ visits, preachings }: Props) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const events: CalEvent[] = [
    ...visits.map((v) => ({
      id: `visit-${v.id}`,
      label: v.member?.name,
      detail: null,
      type: v.type as EventType,
      status: v.status,
      dayKey: new Date(v.scheduledDate).toDateString(),
      time: new Date(v.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })),
    ...preachings.map((p) => ({
      id: `preaching-${p.id}`,
      label: p.title,
      detail: p.location,
      type: 'predicacion' as const,
      dayKey: new Date(p.date).toDateString(),
      time: new Date(p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })),
  ]

  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const rawMonthLabel = firstDay.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1)

  const cells: Array<{ day: number; dayKey: string } | null> = []
  for (let i = 0; i < firstDay.getDay(); i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dayKey: new Date(year, month, d).toDateString() })
  }

  const goToMonth = (offset: number) => setMonthCursor(new Date(year, month + offset, 1))
  const goToday = () => {
    const now = new Date()
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const selectedEvents = selectedDate ? events.filter((e) => e.dayKey === selectedDate) : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{monthLabel}</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => goToMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={goToday}>
            Hoy
          </Button>
          <Button size="sm" variant="outline" onClick={() => goToMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`blank-${i}`} />
            const dayEvents = events.filter((e) => e.dayKey === cell.dayKey)
            const isToday = cell.dayKey === new Date().toDateString()
            const isSelected = cell.dayKey === selectedDate
            return (
              <button
                key={cell.dayKey}
                onClick={() => setSelectedDate(cell.dayKey)}
                className={`flex min-h-16 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <span className={`text-xs ${isToday ? 'font-bold text-primary' : 'text-foreground'}`}>{cell.day}</span>
                <div className="flex flex-wrap gap-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      title={`${TYPE_LABEL[e.type]}: ${e.label}`}
                      className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[e.type]}`}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {selectedDate && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada agendado este día.</p>
            ) : (
              <ul className="space-y-2">
                {selectedEvents
                  .slice()
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((e) => (
                    <li key={e.id} className="flex items-center gap-2 text-sm">
                      <span className="w-14 shrink-0 text-xs text-muted-foreground">{e.time}</span>
                      <Badge variant={TYPE_BADGE[e.type]}>{TYPE_LABEL[e.type]}</Badge>
                      <span className="text-foreground">{e.label}</span>
                      {e.detail && <span className="text-xs text-muted-foreground">({e.detail})</span>}
                      {e.status && (
                        <span className="text-xs text-muted-foreground">— {STATUS_LABEL[e.status] || e.status}</span>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
