import { parseAsArrayOf, parseAsInteger, parseAsJson, parseAsString, useQueryStates } from 'nuqs'
import { NumericFilter } from 'components/interfaces/Reports/v2/ReportsNumericFilter'

import { useParams } from 'common'
import { useIndexAdvisorStatus } from 'components/interfaces/QueryPerformance/hooks/useIsIndexAdvisorStatus'
import { useSupamonitorStatus } from 'components/interfaces/QueryPerformance/hooks/useSupamonitorStatus'
import { useQueryPerformanceSort } from 'components/interfaces/QueryPerformance/hooks/useQueryPerformanceSort'
import { QueryPerformance } from 'components/interfaces/QueryPerformance/QueryPerformance'
import { QueryInsights } from 'components/interfaces/QueryInsights/QueryInsights'
import {
  PRESET_CONFIG,
  REPORT_DATERANGE_HELPER_LABELS,
} from 'components/interfaces/Reports/Reports.constants'
import { useQueryPerformanceQuery } from 'components/interfaces/Reports/Reports.queries'
import { Presets } from 'components/interfaces/Reports/Reports.types'
import { queriesFactory } from 'components/interfaces/Reports/Reports.utils'
import { LogsDatePicker } from 'components/interfaces/Settings/Logs/Logs.DatePickers'
import { DefaultLayout } from 'components/layouts/DefaultLayout'
import ObservabilityLayout from 'components/layouts/ObservabilityLayout/ObservabilityLayout'
import { DatabaseSelector } from 'components/ui/DatabaseSelector'
import { DocsButton } from 'components/ui/DocsButton'
import { useReportDateRange } from 'hooks/misc/useReportDateRange'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { DOCS_URL } from 'lib/constants'
import type { NextPageWithLayout } from 'types'
import { Admonition } from 'ui-patterns'

const QueryInsightsReport: NextPageWithLayout = () => {
  const { ref } = useParams()
  const { data: project, isLoading: isLoadingProject } = useSelectedProjectQuery()
  const { isIndexAdvisorEnabled } = useIndexAdvisorStatus()
  const { isSupamonitorEnabled } = useSupamonitorStatus()
  const { sort: sortConfig } = useQueryPerformanceSort()

  const {
    selectedDateRange,
    datePickerValue,
    datePickerHelpers,
    updateDateRange,
    handleDatePickerChange,
  } = useReportDateRange(REPORT_DATERANGE_HELPER_LABELS.LAST_60_MINUTES)

  const [
    { search: searchQuery, roles, minCalls, totalTimeFilter: totalTimeFilterRaw, indexAdvisor },
  ] = useQueryStates({
    sort: parseAsString,
    order: parseAsString,
    search: parseAsString.withDefault(''),
    roles: parseAsArrayOf(parseAsString).withDefault([]),
    minCalls: parseAsInteger,
    totalTimeFilter: parseAsJson<NumericFilter | null>((value) =>
      value === null || value === undefined ? null : (value as NumericFilter)
    ),
    indexAdvisor: parseAsString.withDefault('false'),
  })



  return (
    <div className="h-full flex flex-col">
      <div className="w-full mb-0 flex lg:items-center justify-between gap-4 py-2 px-6 lg:flex-row flex-col border-b h-[48px]">
        <h3 className="text-foreground text-xl prose">Query Insights</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <DocsButton
            href={`${DOCS_URL}/guides/platform/performance#examining-query-performance`}
          />
          <DatabaseSelector />
          {isSupamonitorEnabled && (
            <LogsDatePicker
              value={datePickerValue}
              helpers={datePickerHelpers.filter(
                (h) =>
                  h.text === REPORT_DATERANGE_HELPER_LABELS.LAST_60_MINUTES ||
                  h.text === REPORT_DATERANGE_HELPER_LABELS.LAST_3_HOURS ||
                  h.text === REPORT_DATERANGE_HELPER_LABELS.LAST_24_HOURS
              )}
              onSubmit={handleDatePickerChange}
            />
          )}
        </div>
      </div>
      <QueryInsights />
    </div>
  )
}

QueryInsightsReport.getLayout = (page) => (
  <DefaultLayout>
    <ObservabilityLayout title="Query insights">{page}</ObservabilityLayout>
  </DefaultLayout>
)

export default QueryInsightsReport
