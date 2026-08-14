import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import apiClient from '../api'
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export default function Account() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
    </div>
  )
}
