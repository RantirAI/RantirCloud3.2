import { QueryInsightsHealth } from './QueryInsightsHealth/QueryInsightsHealth'
import { QueryInsightsChart } from './QueryInsightsChart/QueryInsightsChart'
import { QueryInsightsTable } from './QueryInsightsTable/QueryInsightsTable'

interface QueryInsightsProps {
  dateRange?: {
    period_start: { date: string; time_period: string }
    period_end: { date: string; time_period: string }
    interval: string
  }
  onDateRangeChange?: (from: string, to: string) => void
}

export const QueryInsights = ({ dateRange, onDateRangeChange }: QueryInsightsProps) => {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <QueryInsightsHealth data={[]} isLoading={false} />
      <QueryInsightsChart />
      <QueryInsightsTable />
    </div>
  )
}
