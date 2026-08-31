import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../api'
import { cn } from '../lib/utils'
import Visits from './Visits'
import Preaching from './Preaching'
import AgendaCalendar from '../components/AgendaCalendar'

const TABS = [
  { key: 'lista', label: 'Lista' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'predicacion', label: 'Predicación' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function Agenda() {
  const [tab, setTab] = useState<TabKey>('lista')

  const { data: visits } = useQuery({
    queryKey: ['visits'],
    queryFn: async () => (await apiClient.get('/api/visits')).data,
    enabled: tab === 'calendario',
  })

  const { data: preachings } = useQuery({
    queryKey: ['preaching'],
    queryFn: async () => (await apiClient.get('/api/preaching')).data,
    enabled: tab === 'calendario' || tab === 'predicacion',
  })

  const { data: prayerRequests } = useQuery({
    queryKey: ['prayer-requests'],
    queryFn: async () => (await apiClient.get('/api/prayer-requests')).data,
    enabled: tab === 'calendario',
  })

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lista' && <Visits />}
      {tab === 'calendario' && (
        <AgendaCalendar visits={visits || []} preachings={preachings || []} prayerRequests={prayerRequests || []} />
      )}
      {tab === 'predicacion' && <Preaching />}
    </div>
  )
}
