import { CalendarIcon, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerProps {
  /** ISO date string ('yyyy-MM-dd') or undefined/empty */
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  /** Shows an X button to clear the selected date */
  clearable?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione uma data',
  disabled = false,
  clearable = false,
}: DatePickerProps) {
  const date = value ? parseISO(value) : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          <span className="flex-1">
            {date ? format(date, "dd 'de' MMM yyyy", { locale: ptBR }) : placeholder}
          </span>
          {clearable && date && (
            <span
              role="button"
              aria-label="Limpar data"
              className="ml-2 rounded-sm opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onChange(undefined)
              }}
            >
              <X className="size-4" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="center">
        <Calendar
          className="w-full"
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : undefined)}
          locale={ptBR}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
