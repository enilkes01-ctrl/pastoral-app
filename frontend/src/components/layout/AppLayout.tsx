import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, Users, CalendarDays, MessageSquare, Sparkles, ListChecks, Moon, Sun, LogOut, HeartHandshake } from 'lucide-react'
import { useStore } from '../../store'
import { cn } from '../../lib/utils'
import GlobalSearch from '../GlobalSearch'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Inicio', icon: Home },
  { to: '/members', label: 'Miembros', icon: Users },
  { to: '/visits', label: 'Agenda', icon: CalendarDays },
  { to: '/contacts', label: 'Contactos', icon: MessageSquare },
  { to: '/tasks', label: 'Tareas', icon: ListChecks },
  { to: '/suggestions', label: 'Sugerencias', icon: Sparkles },
]

export default function AppLayout() {
  const user = useStore((state) => state.user)
  const theme = useStore((state) => state.theme)
  const toggleTheme = useStore((state) => state.toggleTheme)
  const logout = useStore((state) => state.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar — tablet/escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <HeartHandshake className="h-6 w-6 text-primary" />
          <span className="font-semibold text-foreground">Pastoral App</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 px-3 py-1 text-sm text-muted-foreground">
            {user?.firstName} {user?.lastName}
          </div>
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Salir
          </button>
        </div>
      </aside>

      {/* Header — todos los tamaños */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:ml-60 md:px-8">
        <div className="flex items-center gap-2 md:hidden">
          <HeartHandshake className="h-5 w-5 text-primary" />
          <span className="font-semibold">Pastoral App</span>
        </div>
        <div className="hidden text-sm text-muted-foreground md:block">
          Hola, {user?.firstName || 'de nuevo'} 👋
        </div>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={handleLogout}
            aria-label="Salir"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive md:hidden"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="px-4 py-6 pb-24 md:ml-60 md:px-8 md:pb-8">
        <Outlet />
      </main>

      {/* Navegación inferior — móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-card/95 py-2 backdrop-blur md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
