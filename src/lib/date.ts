import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  isWithinInterval,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(date: Date | string, pattern = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: ptBR })
}

export function formatMonth(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMMM yyyy', { locale: ptBR })
}

export function currentMonthRange(): { from: Date; to: Date } {
  const now = new Date()
  return { from: startOfMonth(now), to: endOfMonth(now) }
}

export function currentYearRange(): { from: Date; to: Date } {
  const now = new Date()
  return { from: startOfYear(now), to: endOfYear(now) }
}

export function lastNMonths(n: number): { from: Date; to: Date } {
  const now = new Date()
  return { from: startOfMonth(subMonths(now, n - 1)), to: endOfMonth(now) }
}

export function isInRange(date: Date | string, from: Date, to: Date): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isWithinInterval(d, { start: from, end: to })
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function getDaysUntilDue(dueDay: number): number {
  const now = new Date()
  const currentDay = now.getDate()
  const daysInMonth = endOfMonth(now).getDate()

  if (dueDay >= currentDay) {
    return dueDay - currentDay
  }
  return daysInMonth - currentDay + dueDay
}
