import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function Spinner({ className, label = 'Cargando...' }: { className?: string; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className={cn('h-6 w-6 animate-spin text-primary', className)} />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
