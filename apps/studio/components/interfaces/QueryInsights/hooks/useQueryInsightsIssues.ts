import { useMemo } from 'react'

import type { QueryPerformanceRow } from '../../QueryPerformance/QueryPerformance.types'
import { hasIndexRecommendations } from '../../QueryPerformance/IndexAdvisor/index-advisor.utils'
import { SLOW_QUERY_THRESHOLD_MS } from '../QueryInsightsHealth/QueryInsightsHealth.constants'
import type { ClassifiedQuery, IssueType } from '../QueryInsightsHealth/QueryInsightsHealth.types'
import { getQueryType } from '../QueryInsightsTable/QueryInsightsTable.utils'

function classifyQuery(row: QueryPerformanceRow): { issueType: IssueType; hint: string } {
  // Errors take highest priority
  // index_advisor_result can contain errors from the advisor itself
  const advisorErrors = row.index_advisor_result?.errors
  if (advisorErrors && advisorErrors.length > 0) {
    return { issueType: 'error', hint: advisorErrors[0] }
  }

  // Index recommendations
  if (hasIndexRecommendations(row.index_advisor_result, true)) {
    const statements = row.index_advisor_result?.index_statements ?? []
    return {
      issueType: 'index',
      hint: `Missing index: ${statements[0] ?? 'Index suggestion available'}`,
    }
  }

  // Slow queries
  if (row.mean_time > SLOW_QUERY_THRESHOLD_MS) {
    return {
      issueType: 'slow',
      hint: `Avg execution time is ${Math.round(row.mean_time)}ms`,
    }
  }

  return { issueType: null, hint: '' }
}

export function useQueryInsightsIssues(data: QueryPerformanceRow[]) {
  return useMemo(() => {
    const classified: ClassifiedQuery[] = data.map((row) => {
      const { issueType, hint } = classifyQuery(row)
      return { ...row, issueType, hint, queryType: getQueryType(row.query) }
    })

    const errors = classified.filter((q) => q.issueType === 'error')
    const indexIssues = classified.filter((q) => q.issueType === 'index')
    const slowQueries = classified.filter((q) => q.issueType === 'slow')

    return { classified, errors, indexIssues, slowQueries }
  }, [data])
}
