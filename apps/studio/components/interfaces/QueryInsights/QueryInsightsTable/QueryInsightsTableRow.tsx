import { ArrowUpRight, Plus } from 'lucide-react'
import { Badge, Button, cn } from 'ui'
import type { ClassifiedQuery } from '../QueryInsightsHealth/QueryInsightsHealth.types'
import { ISSUE_DOT_COLORS } from './QueryInsightsTable.constants'
import { formatDuration, getTableName, getColumnName } from './QueryInsightsTable.utils'

interface QueryInsightsTableRowProps {
  item: ClassifiedQuery
  type: 'explorer' | 'triage'
}

export const QueryInsightsTableRow = ({ item, type }: QueryInsightsTableRowProps) => {
  if (type === 'explorer') {
    return (
      <div className="flex items-center px-6 py-3 border-b hover:bg-surface-100 group">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-mono text-foreground truncate block">
            {item.queryType ?? '–'} in {getTableName(item.query)}, {getColumnName(item.query)}
          </span>
        </div>
        <div className="w-24 text-right text-sm font-mono tabular-nums text-foreground">
          {item.calls.toLocaleString()}
        </div>
        <div
          className={cn(
            'w-24 text-right text-sm font-mono tabular-nums',
            item.mean_time >= 1000 ? 'text-destructive-600' : 'text-foreground'
          )}
        >
          {formatDuration(item.mean_time)}
        </div>
        <div className="w-36 text-right text-sm font-mono text-foreground-light">
          {item.application_name ?? '–'}
        </div>
        <div className="w-28 text-right">
          {item.issueType === 'slow' && (
            <Badge variant="default" className="text-xs">
              Slow Query
            </Badge>
          )}
          {item.issueType === 'index' && (
            <Badge variant="warning" className="text-xs">
              Index Advisor
            </Badge>
          )}
          {item.issueType === 'error' && (
            <Badge variant="destructive" className="text-xs">
              Error
            </Badge>
          )}
          {!item.issueType && <span className="text-sm text-foreground-muted">–</span>}
        </div>
        <div className="w-24 flex items-center justify-end gap-1">
          <Button type="text" size="tiny" className="px-1">
            –
          </Button>
          <Button type="text" size="tiny" className="px-1">
            <Plus size={14} />
          </Button>
          <Button type="text" size="tiny" className="px-1">
            <ArrowUpRight size={14} />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b hover:bg-surface-100 cursor-pointer group">
      {/* Status dot */}
      <div
        className={cn(
          'h-2.5 w-2.5 rounded-full flex-shrink-0',
          item.issueType ? ISSUE_DOT_COLORS[item.issueType] : ''
        )}
      />

      {/* Query + hint */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-foreground truncate max-w-[40ch]">
          {item.queryType ?? '–'} <span className="text-foreground-lighter">in</span> {getTableName(item.query)}, {getColumnName(item.query)}
        </p>
        <p
          className={cn(
            'text-xs mt-0.5 font-mono',
            item.issueType === 'error' && 'text-destructive-600',
            item.issueType === 'index' && 'text-warning-600',
            item.issueType === 'slow' && 'text-foreground-lighter'
          )}
        >
          {item.hint}
        </p>
      </div>

      {/* Stats */}
      <div className="flex flex-col items-end flex-shrink-0 tabular-nums">
        <span
          className={cn(
            'text-sm font-mono',
            item.mean_time >= 1000 && 'text-destructive-600'
          )}
        >
          {formatDuration(item.mean_time)}
        </span>
        <span className="text-xs text-foreground-lighter">
          {item.calls} {item.calls === 1 ? 'call' : 'calls'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button type="default" size="tiny">
          MD
        </Button>
        {item.issueType === 'error' && (
          <Button type="default" size="tiny">
            Go to Logs
          </Button>
        )}
        <Button type="default" size="tiny">
          Explain
        </Button>
        {item.issueType === 'index' && (
          <Button type="primary" size="tiny">
            Create Index
          </Button>
        )}
      </div>
    </div>
  )
}