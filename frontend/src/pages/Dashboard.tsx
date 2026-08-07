import { useStore } from '../store'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const user = useStore((state) => state.user)
  const logout = useStore((state) => state.logout)
  const navigate = useNavigate()

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
                Agendar Visita
              </button>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded">
                Registrar Contacto
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Estadísticas</h2>
            <div className="space-y-2 text-gray-600">
              <p>Total de miembros: -</p>
              <p>Visitas pendientes: -</p>
              <p>Última actividad: -</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
