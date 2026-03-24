import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/currency'
import type { LucideIcon } from 'lucide-react'

interface SummaryStatCardProps {
  title: string
  value: number
  icon: LucideIcon
  trend?: { value: number; label: string }
  variant?: 'default' | 'income' | 'expense' | 'savings'
  className?: string
}

const variantStyles = {
  default: 'text-foreground',
  income: 'text-green-600 dark:text-green-400',
  expense: 'text-red-600 dark:text-red-400',
  savings: 'text-blue-600 dark:text-blue-400',
}

export function SummaryStatCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: SummaryStatCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className={cn('mt-2 text-2xl font-bold tabular-nums', variantStyles[variant])}>
          {formatBRL(value)}
        </p>
        {trend && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className={trend.value >= 0 ? 'text-green-600' : 'text-red-600'}>
              {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
            </span>{' '}
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
