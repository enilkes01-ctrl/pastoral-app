import { useState, useEffect } from 'react'

interface Church {
  id: number
  name: string
}

interface Member {
  id: number
  name: string
  churchId: number
}

interface Props {
  members: Member[]
  churches: Church[]
  value: string
  onChange: (memberId: string, churchId: number) => void
  disabled?: boolean
}

export default function MemberPicker({ members, churches, value, onChange, disabled }: Props) {
  const [churchId, setChurchId] = useState('')
  const [search, setSearch] = useState('')

  const selected = members.find((m) => String(m.id) === value)

  // Si el valor viene preseleccionado desde afuera (ej. link "Agendar visita" de un miembro),
  // reflejar su iglesia en el filtro.
  useEffect(() => {
    if (selected) setChurchId(String(selected.churchId))
  }, [selected?.id])

  const matches = members.filter(
    (m) =>
      (!churchId || m.churchId === Number(churchId)) &&
      (!search || m.name.toLowerCase().includes(search.toLowerCase()))
  )

  const pick = (m: Member) => {
    onChange(String(m.id), m.churchId)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (matches.length === 1) pick(matches[0])
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-input bg-muted px-3 py-2 md:col-span-2">
        <span className="text-sm text-foreground">{selected.name}</span>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange('', 0)}
            className="text-sm text-primary hover:underline"
          >
            Cambiar
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2 md:col-span-2">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <select
          value={churchId}
          onChange={(e) => setChurchId(e.target.value)}
          disabled={disabled}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
        >
          <option value="">Todas las iglesias</option>
          {churches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar miembro por nombre... *"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
        />
      </div>

      {search && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-destructive">
              No se encontró ningún miembro con ese nombre.
            </p>
          ) : (
            matches.slice(0, 8).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pick(m)}
                className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-primary/5"
              >
                {m.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
