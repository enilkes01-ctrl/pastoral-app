import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import apiClient from '../api'
import Badge from './ui/Badge'

interface Template {
  id: number
  name: string
  category: string
  body: string
}

const CATEGORY_LABEL: Record<string, string> = {
  bienvenida: 'Bienvenida',
  seguimiento: 'Seguimiento',
  oracion: 'Oración',
  cumpleanos: 'Cumpleaños',
  invitacion: 'Invitación',
  otro: 'Otro',
}

interface Props {
  phone: string | null
  name: string
}

export default function WhatsAppButton({ phone, name }: Props) {
  const [open, setOpen] = useState(false)

  const { data: templates } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: async () => (await apiClient.get('/api/templates')).data,
    enabled: open,
  })

  if (!phone) return null

  const send = (body?: string) => {
    const digits = phone.replace(/\D/g, '')
    const text = body ? body.replace(/\{nombre\}/g, name.trim()) : ''
    const url = `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
    window.open(url, '_blank', 'noreferrer')
    setOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm text-success hover:underline"
      >
        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-border bg-card p-2 shadow-md">
          {templates && templates.length > 0 ? (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => send(t.body)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-primary/5"
                >
                  <span className="font-medium text-foreground">{t.name}</span>{' '}
                  <Badge variant="neutral">{CATEGORY_LABEL[t.category] || t.category}</Badge>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No hay plantillas todavía.{' '}
              <Link to="/templates" className="text-primary hover:underline">
                Crear una
              </Link>
            </p>
          )}
          <div className="mt-1 border-t border-border pt-1">
            <button
              type="button"
              onClick={() => send()}
              className="block w-full rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-primary/5"
            >
              Mensaje en blanco
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
