import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/currency'

interface AmountDisplayProps {
  value: number
  type?: 'income' | 'expense' | 'neutral'
  className?: string
  compact?: boolean
}

export function AmountDisplay({
  value,
  type = 'neutral',
  className,
  compact = false,
}: AmountDisplayProps) {
  const colorClass =
    type === 'income'
      ? 'text-green-600 dark:text-green-400'
      : type === 'expense'
        ? 'text-red-600 dark:text-red-400'
        : 'text-foreground'

  const formatted = compact ? `R$ ${(value / 1000).toFixed(1)}k` : formatBRL(value)

  return (
    <span className={cn('font-medium tabular-nums', colorClass, className)}>
      {type === 'income' ? '+' : type === 'expense' ? '-' : ''}
      {formatted}
    </span>
  )
}
