export const CHART_TABS = [
  { id: 'query_latency', label: 'Query latency' },
  { id: 'rows_read', label: 'Rows read' },
  { id: 'calls', label: 'Calls' },
  { id: 'cache_hits', label: 'Cache hits' },
]

export const LEGEND_ITEMS: Record<string, { label: string; color: string; dataKey: string }[]> = {
  query_latency: [
    { label: 'P50', color: '#8B5CF6', dataKey: 'p50' },
    { label: 'P95', color: '#65BCD9', dataKey: 'p95' },
  ],
  rows_read: [{ label: 'Rows Read', color: '#3ECF8E', dataKey: 'rows_read' }],
  calls: [{ label: 'Calls', color: '#3ECF8E', dataKey: 'calls' }],
  cache_hits: [{ label: 'Cache Hits', color: '#10B981', dataKey: 'cache_hits' }],
}

export const CHART_TYPE = 'linear'
