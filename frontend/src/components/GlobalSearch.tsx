import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import apiClient from '../api'

interface Member {
  id: number
  name: string
  phone: string | null
  church: { name: string }
}

export default function GlobalSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const { data: members } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => (await apiClient.get('/api/members')).data,
    enabled: open,
  })

  const q = query.trim().toLowerCase()
  const matches = q
    ? (members || [])
        .filter((m) => m.name.toLowerCase().includes(q) || (m.phone || '').includes(q))
        .slice(0, 8)
    : []

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  const goTo = (id: number) => {
    navigate(`/members/${id}`)
    close()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && matches.length === 1) {
      e.preventDefault()
      goTo(matches[0].id)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Buscar miembro"
        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-border bg-card p-2 shadow-md">
          <input
            autoFocus
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {q && (
            <div className="mt-2 max-h-64 overflow-y-auto">
              {matches.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">Ningún miembro encontrado.</p>
              ) : (
                matches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => goTo(m.id)}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-primary/5"
                  >
                    <span className="font-medium text-foreground">{m.name}</span>{' '}
                    <span className="text-xs text-muted-foreground">· {m.church?.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
