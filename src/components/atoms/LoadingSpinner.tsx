import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  className?: string
  size?: number
}

export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps) {
  return <Loader2 className={cn('animate-spin text-muted-foreground', className)} size={size} />
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size={32} />
    </div>
  )
}
