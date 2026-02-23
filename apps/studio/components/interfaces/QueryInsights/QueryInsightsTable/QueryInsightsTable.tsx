import { useState } from 'react'
import { ArrowUpRight, Copy, Plus } from 'lucide-react'
import {
  Badge,
  Button,
  Tabs_Shadcn_,
  TabsList_Shadcn_,
  TabsTrigger_Shadcn_,
  cn,
} from 'ui'

type Mode = 'triage' | 'explorer'
type IssueFilter = 'all' | 'error' | 'index' | 'slow'

// Dummy triage data
const TRIAGE_ITEMS = [
  {
    id: '1',
    query: 'INSERT in extensions, pg_namespace',
    hint: 'Permission denied for table extensions',
    issueType: 'error' as const,
    meanTime: 6,
    calls: 2,
  },
  {
    id: '2',
    query: 'SELECT in cars, year',
    hint: 'Missing index on cars.year',
    issueType: 'index' as const,
    meanTime: 88,
    calls: 17,
  },
  {
    id: '3',
    query: 'INSERT in extensions, pg_namespace',
    hint: 'Missing index on boats.manufacture_id',
    issueType: 'index' as const,
    meanTime: 124,
    calls: 1,
  },
  {
    id: '4',
    query: 'UPDATE in boats',
    hint: 'Slow query detected',
    issueType: 'slow' as const,
    meanTime: 17840,
    calls: 46,
  },
]

// Dummy explorer data
const EXPLORER_ITEMS = [
  { query: 'INSERT in events', calls: 4421, meanTime: 2, app: 'realtime', status: null },
  { query: 'SELECT in users', calls: 1203, meanTime: 4, app: 'supabase-admin', status: null },
  { query: 'SELECT in profiles', calls: 892, meanTime: 3, app: 'mgmt-api', status: null },
  { query: 'SELECT in subscriptions', calls: 310, meanTime: 7, app: 'supabase-admin', status: null },
  { query: 'DELETE in sessions', calls: 128, meanTime: 5, app: 'mgmt-api', status: null },
  { query: 'UPDATE in users', calls: 74, meanTime: 9, app: 'realtime', status: null },
  { query: 'UPDATE in boats', calls: 46, meanTime: 17840, app: 'mgmt-api', status: 'slow' as const },
  { query: 'SELECT in cars, year', calls: 17, meanTime: 88, app: 'supabase-admin', status: 'index' as const },
]

const ISSUE_DOT_COLORS: Record<string, string> = {
  error: 'bg-destructive-600',
  index: 'bg-warning-600',
  slow: 'bg-foreground-muted',
}

const formatDuration = (ms: number) => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms}ms`
}

export const QueryInsightsTable = () => {
  const [mode, setMode] = useState<Mode>('triage')
  const [filter, setFilter] = useState<IssueFilter>('all')

  const errorCount = TRIAGE_ITEMS.filter((i) => i.issueType === 'error').length
  const indexCount = TRIAGE_ITEMS.filter((i) => i.issueType === 'index').length
  const slowCount = TRIAGE_ITEMS.filter((i) => i.issueType === 'slow').length

  const filteredTriageItems =
    filter === 'all' ? TRIAGE_ITEMS : TRIAGE_ITEMS.filter((i) => i.issueType === filter)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 border-b flex-shrink-0">
        <div className="flex items-center">
          {mode === 'triage' ? (
            <Tabs_Shadcn_ value={filter} onValueChange={(v) => setFilter(v as IssueFilter)}>
              <TabsList_Shadcn_ className="flex gap-x-4 rounded-none !mt-0 pt-0">
                <TabsTrigger_Shadcn_
                  value="all"
                  className="text-xs py-3 border-b-[1px] font-mono uppercase"
                >
                  All ({TRIAGE_ITEMS.length})
                </TabsTrigger_Shadcn_>
                <TabsTrigger_Shadcn_
                  value="error"
                  className="text-xs py-3 border-b-[1px] font-mono uppercase"
                >
                  Errors ({errorCount})
                </TabsTrigger_Shadcn_>
                <TabsTrigger_Shadcn_
                  value="index"
                  className="text-xs py-3 border-b-[1px] font-mono uppercase"
                >
                  Index ({indexCount})
                </TabsTrigger_Shadcn_>
                <TabsTrigger_Shadcn_
                  value="slow"
                  className="text-xs py-3 border-b-[1px] font-mono uppercase"
                >
                  Slow ({slowCount})
                </TabsTrigger_Shadcn_>
              </TabsList_Shadcn_>
            </Tabs_Shadcn_>
          ) : (
            <span className="text-xs font-mono uppercase text-foreground-light py-3">
              All Queries ({EXPLORER_ITEMS.length})
            </span>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-0">
          <Button
            type={mode === 'triage' ? 'primary' : 'default'}
            size="tiny"
            className="rounded-r-none"
            onClick={() => setMode('triage')}
          >
            Triage
          </Button>
          <Button
            type={mode === 'explorer' ? 'primary' : 'default'}
            size="tiny"
            className="rounded-l-none"
            onClick={() => setMode('explorer')}
          >
            Explorer
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {mode === 'triage' ? (
          /* ── Triage View ── */
          <div className="flex flex-col">
            {filteredTriageItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 px-6 py-4 border-b hover:bg-surface-100 cursor-pointer group"
              >
                {/* Status dot */}
                <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', ISSUE_DOT_COLORS[item.issueType])} />

                {/* Query + hint */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-foreground truncate">{item.query}</p>
                  <p className={cn(
                    'text-xs mt-0.5',
                    item.issueType === 'error' && 'text-destructive-600',
                    item.issueType === 'index' && 'text-warning-600',
                    item.issueType === 'slow' && 'text-foreground-light',
                  )}>
                    {item.hint}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex flex-col items-end flex-shrink-0 tabular-nums">
                  <span className={cn(
                    'text-sm font-mono',
                    item.meanTime >= 1000 && 'text-destructive-600',
                  )}>
                    {formatDuration(item.meanTime)}
                  </span>
                  <span className="text-xs text-foreground-light">
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

            {/* Rows */}
            {EXPLORER_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center px-6 py-3 border-b hover:bg-surface-100 group"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-mono text-foreground truncate block">
                    {item.query}
                  </span>
                </div>
                <div className="w-24 text-right text-sm font-mono tabular-nums text-foreground">
                  {item.calls.toLocaleString()}
                </div>
                <div className={cn(
                  'w-24 text-right text-sm font-mono tabular-nums',
                  item.meanTime >= 1000 ? 'text-destructive-600' : 'text-foreground',
                )}>
                  {formatDuration(item.meanTime)}
                </div>
                <div className="w-36 text-right text-sm font-mono text-foreground-light">
                  {item.app}
                </div>
                <div className="w-28 text-right">
                  {item.status === 'slow' && (
                    <Badge variant="default" className="text-xs">Slow Query</Badge>
                  )}
                  {item.status === 'index' && (
                    <Badge variant="warning" className="text-xs">Index Advisor</Badge>
                  )}
                  {!item.status && (
                    <span className="text-sm text-foreground-muted">–</span>
                  )}
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}