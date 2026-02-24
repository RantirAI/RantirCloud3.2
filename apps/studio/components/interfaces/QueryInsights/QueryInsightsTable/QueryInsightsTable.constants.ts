import { CircleAlert, Lightbulb } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const ISSUE_DOT_COLORS: Record<string, { border: string; background: string; color: string }> = {
  error: {
    border: 'border-destructive-600',
    background: 'bg-destructive-600',
    color: 'text-destructive-600',
  },
  index: {
    border: 'border-warning-600',
    background: 'bg-warning-600',
    color: 'text-warning-600',
  },
  slow: {
    border: 'border-strong',
    background: 'bg-alternative dark:bg-muted',
    color: 'text-foreground-lighter',
  },
}

export const ISSUE_ICONS: Record<string, LucideIcon> = {
  error: CircleAlert,
  index: Lightbulb,
  slow: CircleAlert,
}

export const QUERY_INSIGHTS_EXPLORER_COLUMNS = [
  { id: 'query', name: 'Query', description: undefined, minWidth: 500 },
  { id: 'calls', name: 'Calls', description: undefined, minWidth: 100 },
  { id: 'mean_time', name: 'Mean', description: undefined, minWidth: 100 },
  { id: 'application_name', name: 'App', description: undefined, minWidth: 150 },
  { id: 'actions', name: 'Actions', description: undefined, minWidth: 120 },
] as const

export const NON_SORTABLE_COLUMNS = ['query', 'actions'] as const