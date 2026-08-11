import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../store'
import apiClient from '../api'

interface Suggestion {
  id: number
  name: string
  phone: string | null
  church: string
}

export default function Suggestions() {
  const logout = useStore((state) => state.logout)
  const navigate = useNavigate()
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const grouped = (suggestions || []).reduce((acc: Record<string, Suggestion[]>, s) => {
    acc[s.church] = acc[s.church] || []
    acc[s.church].push(s)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Sugerencias del Día</h1>
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
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-4">
            Estos son los hermanos sugeridos hoy para enviarles un mensaje de texto. La lista rota
            entre las tres iglesias sin repetir a nadie hasta completar el ciclo, y excluye
            automáticamente a quien ya haya sido contactado o agendado.
          </p>

          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Cargando...</div>
          ) : !suggestions || suggestions.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No hay sugerencias por ahora (puede que todos ya hayan sido contactados hoy).
            </div>
          ) : (
            Object.entries(grouped).map(([church, list]) => (
              <div key={church} className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">{church}</h3>
                <ul className="divide-y divide-gray-200">
                  {list.map((s) => (
                    <li key={s.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.phone || 'Sin teléfono registrado'}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {s.phone && (
                          <a
                            href={`https://wa.me/${s.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-600 hover:underline text-sm"
                          >
                            WhatsApp
                          </a>
                        )}
                        {sentIds.has(s.id) ? (
                          <span className="text-sm text-green-700">✓ Enviado</span>
                        ) : (
                          <button
                            onClick={() => markSent.mutate(s.id)}
                            disabled={markSent.isPending}
                            className="text-sm text-purple-600 hover:underline disabled:opacity-50"
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
        </div>
      </main>
    </div>
  )
}
