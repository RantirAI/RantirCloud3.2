import { CircleAlert, Lightbulb } from 'lucide-react'
import { Button, cn } from 'ui'
import type { ClassifiedQuery } from '../QueryInsightsHealth/QueryInsightsHealth.types'
import { ISSUE_DOT_COLORS, ISSUE_ICONS } from './QueryInsightsTable.constants'
import { formatDuration, getTableName, getColumnName } from './QueryInsightsTable.utils'

interface QueryInsightsTableRowProps {
  item: ClassifiedQuery
  type: 'triage'
}

export const QueryInsightsTableRow = ({ item, type }: QueryInsightsTableRowProps) => {
  const IssueIcon = item.issueType ? ISSUE_ICONS[item.issueType] : null

  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b hover:bg-surface-100 cursor-pointer group">
      {item.issueType && IssueIcon && (
        <div
          className={cn(
            'h-6 w-6 rounded-full flex-shrink-0 border flex items-center justify-center',
            ISSUE_DOT_COLORS[item.issueType]?.border,
            ISSUE_DOT_COLORS[item.issueType]?.background
          )}
        >
          <IssueIcon size={14} className={ISSUE_DOT_COLORS[item.issueType].color} />
        </div>
      )}

      {/* Query + hint */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono text-foreground truncate max-w-[40ch]">
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
      <div className="flex items-center gap-2 flex-shrink-0 w-48 justify-end">
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