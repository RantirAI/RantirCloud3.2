import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { Search, X, ArrowDown, ArrowUp, ChevronDown, TextSearch } from 'lucide-react'
import DataGrid, { Column, DataGridHandle, Row } from 'react-data-grid'
import { Button, Tabs_Shadcn_, TabsList_Shadcn_, TabsTrigger_Shadcn_, cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from 'ui'
import { Input } from 'ui-patterns/DataInputs/Input'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'
import TwoOptionToggle from 'components/ui/TwoOptionToggle'
import { parseAsString, useQueryStates } from 'nuqs'

import type { QueryPerformanceRow } from '../../QueryPerformance/QueryPerformance.types'
import { useQueryInsightsIssues } from '../hooks/useQueryInsightsIssues'
import type { Mode, IssueFilter } from './QueryInsightsTable.types'
import { getQueryType, getTableName, getColumnName, formatDuration } from './QueryInsightsTable.utils'
import { QueryInsightsTableRow } from './QueryInsightsTableRow'
import { ArrowUpRight, Plus } from 'lucide-react'
import { ISSUE_DOT_COLORS, ISSUE_ICONS, QUERY_INSIGHTS_EXPLORER_COLUMNS, NON_SORTABLE_COLUMNS } from './QueryInsightsTable.constants'

interface QueryInsightsTableProps {
  data: QueryPerformanceRow[]
  isLoading: boolean
}

export const QueryInsightsTable = ({ data, isLoading }: QueryInsightsTableProps) => {
  const { classified, errors, indexIssues, slowQueries } = useQueryInsightsIssues(data)
  const [mode, setMode] = useState<Mode>('triage')
  const [filter, setFilter] = useState<IssueFilter>('all')
  const [{ search: urlSearch }, setQueryStates] = useQueryStates({
    search: parseAsString.withDefault(''),
  })
  const [searchQuery, setSearchQuery] = useState(urlSearch || '')
  const [selectedRow, setSelectedRow] = useState<number>()
  const gridRef = useRef<DataGridHandle>(null)
  const dataGridContainerRef = useRef<HTMLDivElement>(null)
  const [sort, setSort] = useState<{ column: string; order: 'asc' | 'desc' } | null>(null)

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

  const explorerItems = useMemo(
    () => {
      let items = [...classified]

      // Apply search filter
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase()
        items = items.filter((item) => {
          const queryType = getQueryType(item.query) ?? ''
          const tableName = getTableName(item.query) ?? ''
          const columnName = getColumnName(item.query) ?? ''
          const appName = item.application_name ?? ''
          const query = item.query ?? ''

          return (
            queryType.toLowerCase().includes(searchLower) ||
            tableName.toLowerCase().includes(searchLower) ||
            columnName.toLowerCase().includes(searchLower) ||
            appName.toLowerCase().includes(searchLower) ||
            query.toLowerCase().includes(searchLower)
          )
        })
      }

      // Apply sorting
      if (sort) {
        items.sort((a, b) => {
          let aValue: any = a[sort.column as keyof typeof a]
          let bValue: any = b[sort.column as keyof typeof b]

          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sort.order === 'asc' ? aValue - bValue : bValue - aValue
          }

          return 0
        })
      } else {
        // Default sort by calls descending
        items.sort((a, b) => b.calls - a.calls)
      }

      return items
    },
    [classified, searchQuery, sort]
  )

  const columns = useMemo(() => {
    return QUERY_INSIGHTS_EXPLORER_COLUMNS.map((col) => {
      const isSortable = !NON_SORTABLE_COLUMNS.includes(col.id as any)

      const result: Column<any> = {
        key: col.id,
        name: col.name,
        cellClass: `column-${col.id}`,
        resizable: true,
        minWidth: col.minWidth ?? 120,
        sortable: isSortable,
        headerCellClass: 'first:pl-6 cursor-pointer',
        renderHeaderCell: () => {
          return (
            <div className="flex items-center justify-between text-xs w-full">
              <div className="flex items-center gap-x-2">
                <p className="!text-foreground font-medium">{col.name}</p>
                {col.description && (
                  <p className="text-foreground-lighter font-normal">{col.description}</p>
                )}
              </div>

              {isSortable && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="text"
                      size="tiny"
                      className="p-1 h-5 w-5 flex-shrink-0"
                      icon={<ChevronDown size={14} className="text-foreground-muted" />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => {
                        setSort({ column: col.id, order: 'asc' })
                      }}
                      className={cn(
                        'flex gap-2',
                        sort?.column === col.id && sort?.order === 'asc' && 'text-foreground'
                      )}
                    >
                      <ArrowUp size={14} />
                      Sort Ascending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSort({ column: col.id, order: 'desc' })
                      }}
                      className={cn(
                        'flex gap-2',
                        sort?.column === col.id && sort?.order === 'desc' && 'text-foreground'
                      )}
                    >
                      <ArrowDown size={14} />
                      Sort Descending
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        },
        renderCell: (props) => {
          const row = props.row

          if (col.id === 'query') {
            const IssueIcon = row.issueType ? ISSUE_ICONS[row.issueType] : null
            return (
              <div className="w-full flex items-center gap-x-3 px-6">
                {row.issueType && IssueIcon && (
                  <div
                    className={cn(
                      'h-6 w-6 rounded-full flex-shrink-0 border flex items-center justify-center',
                      ISSUE_DOT_COLORS[row.issueType]?.border,
                      ISSUE_DOT_COLORS[row.issueType]?.background
                    )}
                  >
                    <IssueIcon size={14} className={ISSUE_DOT_COLORS[row.issueType].color} />
                  </div>
                )}
                <span className="text-xs font-mono text-foreground truncate">
                  {row.queryType ?? '–'} <span className="text-foreground-lighter">in</span> {getTableName(row.query)}, {getColumnName(row.query)}
                </span>
              </div>
            )
          }

          if (col.id === 'calls') {
            return (
              <div className="w-full flex flex-col justify-center text-xs text-right tabular-nums font-mono px-6">
                {typeof row.calls === 'number' && !isNaN(row.calls) && isFinite(row.calls) ? (
                  <p className={cn(row.calls === 0 && 'text-foreground-lighter')}>
                    {row.calls.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-muted">&ndash;</p>
                )}
              </div>
            )
          }

          if (col.id === 'mean_time') {
            return (
              <div className="w-full flex flex-col justify-center text-xs text-right tabular-nums font-mono px-6">
                {typeof row.mean_time === 'number' && !isNaN(row.mean_time) && isFinite(row.mean_time) ? (
                  <p className={cn(
                    row.mean_time >= 1000 ? 'text-destructive-600' : '',
                    row.mean_time === 0 && 'text-foreground-lighter'
                  )}>
                    {formatDuration(row.mean_time)}
                  </p>
                ) : (
                  <p className="text-muted">&ndash;</p>
                )}
              </div>
            )
          }

          if (col.id === 'application_name') {
            return (
              <div className="w-full flex flex-col justify-center px-6">
                {row.application_name ? (
                  <p className="font-mono text-xs">{row.application_name}</p>
                ) : (
                  <p className="text-muted">&ndash;</p>
                )}
              </div>
            )
          }

          if (col.id === 'actions') {
            return (
              <div className="w-full flex items-center justify-end gap-1 px-6">
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
            )
          }

          return null
        },
      }
      return result
    })
  }, [sort])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!explorerItems.length || selectedRow === undefined) return

      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

      event.stopPropagation()

      let nextIndex = selectedRow
      if (event.key === 'ArrowUp' && selectedRow > 0) {
        nextIndex = selectedRow - 1
      } else if (event.key === 'ArrowDown' && selectedRow < explorerItems.length - 1) {
        nextIndex = selectedRow + 1
      }

      if (nextIndex !== selectedRow) {
        setSelectedRow(nextIndex)
        gridRef.current?.scrollToCell({ idx: 0, rowIdx: nextIndex })
      }
    },
    [explorerItems, selectedRow]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [handleKeyDown])

  useEffect(() => {
    setSelectedRow(undefined)
  }, [searchQuery, sort])

  useEffect(() => {
    if (urlSearch !== searchQuery) {
      setQueryStates({ search: searchQuery || null })
    }
  }, [searchQuery])

  const errorCount = errors.length
  const indexCount = indexIssues.length
  const slowCount = slowQueries.length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className={cn('flex items-center justify-between px-6 flex-shrink-0 h-10 bg-surface-100', mode === 'triage' && 'border-b')}>
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
            <Input
              size="tiny"
              autoComplete="off"
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              name="search"
              id="search"
              placeholder="Search queries..."
              className="w-64"
              actions={[
                searchQuery && (
                  <Button
                    key="clear"
                    size="tiny"
                    type="text"
                    icon={<X className="h-4 w-4" />}
                    onClick={() => setSearchQuery('')}
                    className="p-0 h-5 w-5"
                  />
                ),
              ]}
            />
          )}
        </div>

        <TwoOptionToggle
          width={75}
          options={['explorer', 'triage']}
          activeOption={mode}
          borderOverride="border"
          onClickOption={setMode}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="px-6 py-4">
            <GenericSkeletonLoader />
          </div>
        ) : mode === 'triage' ? (
          <div className="flex flex-col">
            {filteredTriageItems.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-foreground-lighter">
                  {data.length === 0
                    ? 'No query data available yet'
                    : 'No issues found!'}
                </p>
              </div>
            ) : (
              <>
                {filteredTriageItems.map((item, idx) => (
                  <QueryInsightsTableRow
                    key={idx}
                    item={item}
                    type="triage"
                  />
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
          <div ref={dataGridContainerRef} className="flex-1 min-w-0 overflow-x-auto">
            <DataGrid
              ref={gridRef}
              style={{ height: '100%' }}
              className={cn('flex-1 flex-grow h-full')}
              rowHeight={44}
              headerRowHeight={36}
              columns={columns}
              rows={explorerItems}
              rowClass={(_, idx) => {
                const isSelected = idx === selectedRow
                return [
                  `${isSelected ? 'bg-surface-300 dark:bg-surface-300' : 'bg-200 hover:bg-surface-200'} cursor-pointer`,
                  `${isSelected ? '[&>div:first-child]:border-l-4 border-l-secondary [&>div]:!border-l-foreground' : ''}`,
                  '[&>.rdg-cell]:box-border [&>.rdg-cell]:outline-none [&>.rdg-cell]:shadow-none',
                ].join(' ')
              }}
              renderers={{
                renderRow(idx, props) {
                  return (
                    <Row
                      {...props}
                      key={`explorer-row-${props.rowIdx}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (typeof idx === 'number' && idx >= 0) {
                          setSelectedRow(idx)
                          gridRef.current?.scrollToCell({ idx: 0, rowIdx: idx })
                        }
                      }}
                    />
                  )
                },
                noRowsFallback: (
                  <div className="absolute top-20 px-6 flex flex-col items-center justify-center w-full gap-y-2">
                    <TextSearch className="text-foreground-muted" strokeWidth={1} />
                    <div className="text-center">
                      <p className="text-foreground">No queries found</p>
                      <p className="text-foreground-light">
                        {searchQuery.trim()
                          ? 'No queries match your search criteria'
                          : 'No query data available yet'}
                      </p>
                    </div>
                  </div>
                ),
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}