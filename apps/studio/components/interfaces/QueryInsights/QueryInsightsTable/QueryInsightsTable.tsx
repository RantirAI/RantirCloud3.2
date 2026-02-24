import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from 'ui'
import { Input } from 'ui-patterns/DataInputs/Input'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'
import TwoOptionToggle from 'components/ui/TwoOptionToggle'

import type { QueryPerformanceRow } from '../../QueryPerformance/QueryPerformance.types'
import { useQueryInsightsIssues } from '../hooks/useQueryInsightsIssues'
import type { Mode, IssueFilter } from './QueryInsightsTable.types'
import { getQueryType, getTableName, getColumnName } from './QueryInsightsTable.utils'
import { QueryInsightsTableRow } from './QueryInsightsTableRow'

interface QueryInsightsTableProps {
  data: QueryPerformanceRow[]
  isLoading: boolean
}

export const QueryInsightsTable = ({ data, isLoading }: QueryInsightsTableProps) => {
  const { classified, errors, indexIssues, slowQueries } = useQueryInsightsIssues(data)
  const [mode, setMode] = useState<Mode>('triage')
  const [filter, setFilter] = useState<IssueFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const triageItems = useMemo(() => classified.filter((q) => q.issueType !== null), [classified])

  const filteredTriageItems = useMemo(
    () => {
      let filtered = filter === 'all' ? triageItems : triageItems.filter((q) => q.issueType === filter)

      // Apply search filter
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase()
        filtered = filtered.filter((item) => {
          const queryType = getQueryType(item.query) ?? ''
          const tableName = getTableName(item.query) ?? ''
          const columnName = getColumnName(item.query) ?? ''
          const appName = item.application_name ?? ''
          const hint = item.hint ?? ''
          const query = item.query ?? ''

          return (
            queryType.toLowerCase().includes(searchLower) ||
            tableName.toLowerCase().includes(searchLower) ||
            columnName.toLowerCase().includes(searchLower) ||
            appName.toLowerCase().includes(searchLower) ||
            hint.toLowerCase().includes(searchLower) ||
            query.toLowerCase().includes(searchLower)
          )
        })
      }

      return filtered.map((item) => ({
        ...item,
        queryType: getQueryType(item.query),
      }))
    },
    [triageItems, filter, searchQuery]
  )

  const explorerItems = useMemo(
    () => {
      let items = [...classified].sort((a, b) => b.calls - a.calls)

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

      return items
    },
    [classified, searchQuery]
  )

  const errorCount = errors.length
  const indexCount = indexIssues.length
  const slowCount = slowQueries.length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-6 border-b flex-shrink-0 h-10 bg-surface-100">
        <div className="flex items-center flex-1">
          <Input
            size="tiny"
            autoComplete="off"
            icon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            name="search"
            id="search"
            placeholder={mode === 'triage' ? 'Search issues...' : 'Search queries...'}
            className="w-64 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
                    : searchQuery.trim()
                      ? 'No issues found matching your search'
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
                <p className="text-sm text-foreground-lighter">
                  {searchQuery.trim()
                    ? 'No queries found matching your search'
                    : 'No query data available yet'}
                </p>
              </div>
            ) : (
              explorerItems.map((item, idx) => (
                <QueryInsightsTableRow
                  key={idx}
                  item={item}
                  type="explorer"
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}