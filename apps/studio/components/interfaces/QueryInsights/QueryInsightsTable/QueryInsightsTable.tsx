import { useMemo, useState } from 'react'
import { ArrowUpRight, Plus } from 'lucide-react'
import { Badge, Button, Tabs_Shadcn_, TabsList_Shadcn_, TabsTrigger_Shadcn_, cn } from 'ui'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'
import TwoOptionToggle from 'components/ui/TwoOptionToggle'

import type { QueryPerformanceRow } from '../../QueryPerformance/QueryPerformance.types'
import { useQueryInsightsIssues } from '../hooks/useQueryInsightsIssues'
import { ISSUE_DOT_COLORS } from './QueryInsightsTable.constants'
import type { Mode, IssueFilter } from './QueryInsightsTable.types'
import { formatDuration, getQueryType } from './QueryInsightsTable.utils'

interface QueryInsightsTableProps {
  data: QueryPerformanceRow[]
  isLoading: boolean
}

export const QueryInsightsTable = ({ data, isLoading }: QueryInsightsTableProps) => {
  const { classified, errors, indexIssues, slowQueries } = useQueryInsightsIssues(data)

  const [mode, setMode] = useState<Mode>('triage')
  const [filter, setFilter] = useState<IssueFilter>('all')

  // Triage = only queries with issues
  const triageItems = useMemo(() => classified.filter((q) => q.issueType !== null), [classified])

  const filteredTriageItems = useMemo(
    () => {
      const filtered = filter === 'all' ? triageItems : triageItems.filter((q) => q.issueType === filter)
      return filtered.map((item) => ({
        ...item,
        queryType: getQueryType(item.query),
      }))
    },
    [triageItems, filter]
  )
  console.log(filteredTriageItems)

  // Explorer = all queries sorted by calls desc
  const explorerItems = useMemo(
    () => [...classified].sort((a, b) => b.calls - a.calls),
    [classified]
  )

  const errorCount = errors.length
  const indexCount = indexIssues.length
  const slowCount = slowQueries.length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 border-b flex-shrink-0 h-10">
        <div className="flex items-center">
          {mode === 'triage' ? (
            <Tabs_Shadcn_ value={filter} onValueChange={(v) => setFilter(v as IssueFilter)}>
              <TabsList_Shadcn_ className="flex gap-x-4 rounded-none !mt-0 pt-0 !border-none">
                <TabsTrigger_Shadcn_
                  value="all"
                  className="text-xs py-3 border-b-[1px] font-mono uppercase"
                >
                  All{triageItems.length > 0 && ` (${triageItems.length})`}
                </TabsTrigger_Shadcn_>
                <TabsTrigger_Shadcn_
                  value="error"
                  className="text-xs py-3 border-b-[1px] font-mono uppercase"
                >
                  Errors{errorCount > 0 && ` (${errorCount})`}
                </TabsTrigger_Shadcn_>
                <TabsTrigger_Shadcn_
                  value="index"
                  className="text-xs py-3 border-b-[1px] font-mono uppercase"
                >
                  Index{indexCount > 0 && ` (${indexCount})`}
                </TabsTrigger_Shadcn_>
                <TabsTrigger_Shadcn_
                  value="slow"
                  className="text-xs py-3 border-b-[1px] font-mono uppercase"
                >
                  Slow{slowCount > 0 && ` (${slowCount})`}
                </TabsTrigger_Shadcn_>
              </TabsList_Shadcn_>
            </Tabs_Shadcn_>
          ) : (
            <span className="text-xs font-mono uppercase text-foreground-light py-3">
              All Queries ({explorerItems.length})
            </span>
          )}
        </div>

        {/* Mode toggle */}
        <TwoOptionToggle
          width={75}
          options={['explorer', 'triage']}
          activeOption={mode}
          borderOverride="border"
          onClickOption={setMode}
        />
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="px-6 py-4">
            <GenericSkeletonLoader />
          </div>
        ) : mode === 'triage' ? (
          /* ── Triage View ── */
          <div className="flex flex-col">
            {filteredTriageItems.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-foreground-lighter">
                  {data.length === 0
                    ? 'No query data available yet'
                    : 'No issues found — your queries look healthy!'}
                </p>
              </div>
            ) : (
              <>
                {filteredTriageItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 px-6 py-4 border-b hover:bg-surface-100 cursor-pointer group"
                  >
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
                        {item.queryType ?? '–'} in xxx
                      </p>
                      <p
                        className={cn(
                          'text-xs mt-0.5',
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
                ))}

                {/* Footer message */}
                <div className="py-8 text-center">
                  <p className="text-sm text-foreground-lighter">
                    Resolve all issues to reach a perfect score!
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── Explorer View ── */
          <div className="flex flex-col">
            {/* Column headers */}
            <div className="flex items-center px-6 py-2 border-b text-xs font-mono uppercase text-foreground-light">
              <div className="flex-1">Query</div>
              <div className="w-24 text-right">Calls ↓</div>
              <div className="w-24 text-right">Mean</div>
              <div className="w-36 text-right">App</div>
              <div className="w-28 text-right">Status</div>
              <div className="w-24 text-right">Actions</div>
            </div>

            {explorerItems.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-foreground-lighter">No query data available yet</p>
              </div>
            ) : (
              explorerItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center px-6 py-3 border-b hover:bg-surface-100 group"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-mono text-foreground truncate block">
                      {item.queryType ?? '–'} in xxx
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
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
