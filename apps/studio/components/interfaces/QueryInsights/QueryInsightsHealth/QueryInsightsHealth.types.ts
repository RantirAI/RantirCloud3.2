import type { QueryPerformanceRow } from '../../QueryPerformance/QueryPerformance.types'

export type IssueType = 'error' | 'index' | 'slow' | null

export interface ClassifiedQuery extends QueryPerformanceRow {
  issueType: IssueType
  hint: string
  queryType: string | null
}
