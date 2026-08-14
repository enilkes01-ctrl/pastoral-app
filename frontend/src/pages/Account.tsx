import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Check } from 'lucide-react'
import apiClient from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'

interface Me {
  calendarToken: string | null
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function Account() {
  const queryClient = useQueryClient()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: me } = useQuery<Me>({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get('/api/auth/me')).data,
  })

  const generateCalendarToken = useMutation({
    mutationFn: async () => (await apiClient.post('/api/auth/me/calendar-token')).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setCopied(false)
    },
  })

  const feedUrl = me?.calendarToken
    ? `${import.meta.env.VITE_API_URL || window.location.origin}/api/calendar/feed.ics?token=${me.calendarToken}`
    : null

  const copyFeedUrl = () => {
    if (!feedUrl) return
    navigator.clipboard.writeText(feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const changePassword = useMutation({
    mutationFn: async () => apiClient.put('/api/auth/me/password', { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
      setSuccess(true)
    },
    onError: (err: any) => {
      setSuccess(false)
      setError(err.response?.data?.error || 'Error al cambiar la contraseña')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess(false)
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    changePassword.mutate()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-success">Contraseña actualizada correctamente.</p>}

            <input
              type="password"
              placeholder="Contraseña actual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Contraseña nueva"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Confirmar contraseña nueva"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />

            <Button type="submit" loading={changePassword.isPending}>
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sincronizar tu Agenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Agrega este enlace en Google Calendar, Apple Calendar u Outlook como "calendario por URL" para ver tus
            visitas pendientes y predicaciones próximas desde tu calendario de siempre.
          </p>

          {feedUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input readOnly value={feedUrl} className={`${inputClass} font-mono text-xs`} />
                <Button type="button" variant="outline" size="sm" onClick={copyFeedUrl}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={generateCalendarToken.isPending}
                onClick={() => generateCalendarToken.mutate()}
              >
                Regenerar enlace
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              loading={generateCalendarToken.isPending}
              onClick={() => generateCalendarToken.mutate()}
            >
              Generar enlace
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
