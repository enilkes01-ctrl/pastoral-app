import { useState } from 'react'
import { useStore } from '../store'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../api'

interface Member {
  id: number
}

interface Visit {
  id: number
  type: string
  status: string
  scheduledDate: string
  member: { name: string }
}

interface Contact {
  id: number
  type: string
  date: string
  member: { name: string }
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

export default function Dashboard() {
  const user = useStore((state) => state.user)
  const logout = useStore((state) => state.logout)
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

  const totalMembers = members?.length ?? 0
  const visitasPendientes = visits?.filter((v) => v.status === 'pendiente').length ?? 0
  const visitasRealizadas = visits?.filter((v) => v.status === 'completada').length ?? 0

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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Pastoral App</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">{user?.firstName} {user?.lastName}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {!bannerDismissed && pendingDue.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-yellow-800">
              📌 Tienes pendiente: <span className="font-semibold">{pendingSummary}</span> para hoy o antes.{' '}
              <button onClick={() => navigate('/visits')} className="underline font-medium">
                Ver agenda
              </button>
            </p>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-yellow-700 hover:text-yellow-900 ml-4"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/members')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                Ver Miembros
              </button>
              <button
                onClick={() => navigate('/visits')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              >
                Agenda
              </button>
              <button
                onClick={() => navigate('/contacts')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
              >
                Registrar Contacto
              </button>
              <button
                onClick={() => navigate('/suggestions')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded"
              >
                Sugerencias del Día
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Estadísticas</h2>
            <div className="space-y-2 text-gray-600">
              <p>Total de miembros: <span className="font-semibold text-gray-900">{totalMembers}</span></p>
              <p>Visitas pendientes: <span className="font-semibold text-gray-900">{visitasPendientes}</span></p>
              <p>Visitas realizadas: <span className="font-semibold text-gray-900">{visitasRealizadas}</span></p>
              <p>
                Última actividad:{' '}
                <span className="font-semibold text-gray-900">
                  {ultimaActividad
                    ? `${ultimaActividad.text} (${new Date(ultimaActividad.date).toLocaleString()})`
                    : 'Sin actividad aún'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
