import { cn } from '@/lib/utils'

interface CategoryBadgeProps {
  name: string
  color: string
  className?: string
}

export function CategoryBadge({ name, color, className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className
      )}
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span
        className="size-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  )
}
