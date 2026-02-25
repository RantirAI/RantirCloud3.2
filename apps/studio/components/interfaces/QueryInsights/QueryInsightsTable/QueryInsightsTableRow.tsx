import { Loader2 } from 'lucide-react'
import { AiIconAnimation, Button, cn } from 'ui'
import type { ClassifiedQuery } from '../QueryInsightsHealth/QueryInsightsHealth.types'
import { ISSUE_DOT_COLORS, ISSUE_ICONS } from './QueryInsightsTable.constants'
import { formatDuration, getTableName, getColumnName } from './QueryInsightsTable.utils'

interface QueryInsightsTableRowProps {
  item: ClassifiedQuery
  onRowClick?: () => void
  onGoToLogs?: () => void
  onCreateIndex?: () => void
  onExplain?: () => void
  onAiSuggestedFix?: () => void
  isExplainLoading?: boolean
}

export const QueryInsightsTableRow = ({
  item,
  onRowClick,
  onGoToLogs,
  onCreateIndex,
  onExplain,
  onAiSuggestedFix,
  isExplainLoading,
}: QueryInsightsTableRowProps) => {
  const IssueIcon = item.issueType ? ISSUE_ICONS[item.issueType] : null

  return (
    <div
      className="flex items-center gap-4 px-6 py-4 border-b hover:bg-surface-100 cursor-pointer group"
      onClick={onRowClick}
    >
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
        <p className="text-xs font-mono text-foreground line-clamp-1">
          <span className="text-foreground">{item.queryType ?? '–'}</span>
          {getTableName(item.query) && (
            <> <span className="text-foreground-lighter">in</span> {getTableName(item.query)}</>
          )}
          {getColumnName(item.query) && (
            <><span className="text-foreground-lighter">,</span> {getColumnName(item.query)}</>
          )}
        </p>
        <p
          className={cn(
            'text-xs mt-0.5 font-mono line-clamp-1',
            item.issueType === 'error' && 'text-destructive-600',
            item.issueType === 'index' && 'text-warning-600',
            item.issueType === 'slow' && 'text-foreground-lighter'
          )}
        >
          {item.hint}
        </p>
      </div>

      {/* Stats */}
      <div className="flex flex-col items-end flex-shrink-0 tabular-nums w-[72px]">
        <span
          className={cn('text-sm font-mono', item.mean_time >= 1000 && 'text-destructive-600')}
        >
          {formatDuration(item.mean_time)}
        </span>
        <span className="text-xs text-foreground-lighter">
          {item.calls} {item.calls === 1 ? 'call' : 'calls'}
        </span>
      </div>

      {/* Actions — fixed width so stats column never shifts */}
      <div className="flex items-center gap-2 flex-shrink-0 justify-end w-[260px]">
        <Button
          type="default"
          size="tiny"
          onClick={(e) => {
            e.stopPropagation()
            onGoToLogs?.()
          }}
        >
          Go to Logs
        </Button>

        {/* Explain: index + slow only */}
        {(item.issueType === 'index' || item.issueType === 'slow') && (
          <Button
            type="default"
            size="tiny"
            icon={isExplainLoading ? <Loader2 size={12} className="animate-spin" /> : undefined}
            onClick={(e) => {
              e.stopPropagation()
              onExplain?.()
            }}
          >
            Explain
          </Button>
        )}

        {/* Create Index: index only (primary CTA) */}
        {item.issueType === 'index' && (
          <Button
            type="primary"
            size="tiny"
            onClick={(e) => {
              e.stopPropagation()
              onCreateIndex?.()
            }}
          >
            Create Index
          </Button>
        )}

        {/* Fix with AI: error + slow */}
        {(item.issueType === 'error' || item.issueType === 'slow') && (
          <Button
            type="default"
            size="tiny"
            icon={<AiIconAnimation size={14} />}
            onClick={(e) => {
              e.stopPropagation()
              onAiSuggestedFix?.()
            }}
          >
            Fix with AI
          </Button>
        )}
      </div>
    </div>
  )
}
