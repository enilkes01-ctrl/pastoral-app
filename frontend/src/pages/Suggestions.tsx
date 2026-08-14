import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import apiClient from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import WhatsAppButton from '../components/WhatsAppButton'

interface Suggestion {
  id: number
  name: string
  phone: string | null
  church: string
}

export default function Suggestions() {
  const queryClient = useQueryClient()
  const [sentIds, setSentIds] = useState<Set<number>>(new Set())

  const { data: suggestions, isLoading } = useQuery<Suggestion[]>({
    queryKey: ['suggestions'],
    queryFn: async () => (await apiClient.get('/api/suggestions/today')).data,
  })

  const markSent = useMutation({
    mutationFn: async (memberId: number) =>
      apiClient.post('/api/contacts', {
        memberId,
        type: 'mensaje',
        date: new Date().toISOString(),
        notes: 'Mensaje sugerido por la app',
      }),
    onSuccess: (_data, memberId) => {
      setSentIds((prev) => new Set(prev).add(memberId))
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const grouped = (suggestions || []).reduce((acc: Record<string, Suggestion[]>, s) => {
    acc[s.church] = acc[s.church] || []
    acc[s.church].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> Sugerencias del Día
          </CardTitle>
          <Link to="/templates" className="text-sm text-primary hover:underline">
            Gestionar plantillas
          </Link>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Estos son los hermanos sugeridos hoy para enviarles un mensaje de texto. La lista rota
            entre las tres iglesias sin repetir a nadie hasta completar el ciclo, y excluye
            automáticamente a quien ya haya sido contactado o agendado.
          </p>

          {isLoading ? (
            <Spinner />
          ) : !suggestions || suggestions.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No hay sugerencias por ahora"
              description="Puede que todos ya hayan sido contactados hoy."
            />
          ) : (
            Object.entries(grouped).map(([church, list]) => (
              <div key={church} className="mb-6 last:mb-0">
                <h3 className="mb-2 font-semibold text-foreground">{church}</h3>
                <ul className="divide-y divide-border">
                  {list.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.phone || 'Sin teléfono registrado'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <WhatsAppButton phone={s.phone} name={s.name} />
                        {sentIds.has(s.id) ? (
                          <span className="flex items-center gap-1 text-sm text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Enviado
                          </span>
                        ) : (
                          <button
                            onClick={() => markSent.mutate(s.id)}
                            disabled={markSent.isPending}
                            className="text-sm text-accent hover:underline disabled:opacity-50"
                          >
                            Marcar como enviado
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
