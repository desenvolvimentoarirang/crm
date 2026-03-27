import { Priority } from '@prisma/client'

// SLA deadlines in minutes by priority
const SLA_MINUTES: Record<Priority, number> = {
  VIP: 5,
  HIGH: 15,
  NORMAL: 30,
  LOW: 120,
}

export function calculateSlaDeadline(priority: Priority, startTime: Date = new Date()): Date {
  const minutes = SLA_MINUTES[priority] ?? 30
  return new Date(startTime.getTime() + minutes * 60 * 1000)
}

export function isSlaBreach(slaDeadline: Date | null): boolean {
  if (!slaDeadline) return false
  return new Date() > slaDeadline
}

export function getPriorityFromVip(isVip: boolean): Priority {
  return isVip ? 'VIP' : 'NORMAL'
}
