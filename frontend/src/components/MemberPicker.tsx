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
      <div className="border border-gray-300 rounded px-3 py-2 flex items-center justify-between bg-gray-50 md:col-span-2">
        <span className="text-sm text-gray-900">{selected.name}</span>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange('', 0)}
            className="text-sm text-blue-600 hover:underline"
          >
            Cambiar
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="md:col-span-2 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          value={churchId}
          onChange={(e) => setChurchId(e.target.value)}
          disabled={disabled}
          className="border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
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
          className="border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>

      {search && (
        <div className="border border-gray-200 rounded max-h-48 overflow-y-auto">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-red-600">
              No se encontró ningún miembro con ese nombre.
            </p>
          ) : (
            matches.slice(0, 8).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pick(m)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
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
