import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Tabs_Shadcn_, TabsContent_Shadcn_, TabsList_Shadcn_, TabsTrigger_Shadcn_, cn } from 'ui'
import { Loader2 } from 'lucide-react'
import type { ChartDataPoint } from '../../QueryPerformance/QueryPerformance.types'
import { useTheme } from 'next-themes'
import { QueryInsightsChartTooltip } from './QueryInsightsChartTooltip'
import { CHART_TABS, LEGEND_ITEMS, CHART_TYPE } from './QueryInsightsChart.constants'
import { formatTime } from './QueryInsightsChart.utils'
import { CHART_COLORS } from 'components/ui/Charts/Charts.constants'

interface QueryInsightsChartProps {
  chartData: ChartDataPoint[]
  isLoading: boolean
}

export const QueryInsightsChart = ({ chartData, isLoading }: QueryInsightsChartProps) => {
  const [selectedMetric, setSelectedMetric] = useState('query_latency')
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const { resolvedTheme } = useTheme()
  const isDarkMode = resolvedTheme?.includes('dark')

  const data = useMemo(() => {
    return chartData.map((d) => ({
      time: d.period_start > 1e13 ? Math.floor(d.period_start / 1000) : d.period_start,
      p50: d.p50_time,
      p95: d.p95_time,
      rows_read: d.rows_read,
      calls: d.calls,
      cache_hits: d.cache_hits,
    }))
  }, [chartData])

  const filteredData = useMemo(() => {
    if (hiddenSeries.size === 0) return data
    return data.map((point) => {
      const filtered = { ...point }
      hiddenSeries.forEach((key) => {
        ; (filtered as any)[key] = undefined
      })
      return filtered
    })
  }, [data, hiddenSeries])

  const toggleSeries = (dataKey: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(dataKey)) {
        next.delete(dataKey)
      } else {
        next.add(dataKey)
      }
      return next
    })
  }

  const isSeriesVisible = (dataKey: string) => !hiddenSeries.has(dataKey)

  return (
    <div className="bg-surface-100 border-b min-h-[320px]">
      <Tabs_Shadcn_
        value={selectedMetric}
        onValueChange={(value) => setSelectedMetric(value)}
        className="w-full"
      >
        <TabsList_Shadcn_ className="flex justify-start rounded-none gap-x-4 border-b !mt-0 pt-0 px-6">
          {CHART_TABS.map((tab) => (
            <TabsTrigger_Shadcn_
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 text-xs py-3 border-b-[1px] font-mono uppercase"
            >
              {tab.label}
            </TabsTrigger_Shadcn_>
          ))}
        </TabsList_Shadcn_>

        <TabsContent_Shadcn_ value={selectedMetric} className="bg-surface-100 mt-0">
          <div className="w-full gap-4 mt-4 px-6 flex items-center justify-end">
            {LEGEND_ITEMS[selectedMetric]?.map(
              (item: { dataKey: string; label: string; color: string }) => (
                <button
                  key={item.dataKey}
                  type="button"
                  onClick={() => toggleSeries(item.dataKey)}
                  className={cn(
                    'flex items-center gap-1.5 text-[11px] transition-colors cursor-pointer',
                    isSeriesVisible(item.dataKey)
                      ? 'text-foreground hover:text-foreground-light'
                      : 'text-foreground-muted'
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-opacity',
                      !isSeriesVisible(item.dataKey) && 'opacity-30'
                    )}
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </button>
              )
            )}
          </div>
          <div className="w-full py-4 flex flex-col">
            <div className="w-full h-[180px] px-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={20} className="animate-spin text-foreground-lighter" />
                </div>
              ) : data.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-foreground-lighter">No data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {selectedMetric === 'query_latency' ? (
                    <AreaChart
                      data={filteredData}
                      margin={{ top: 4, left: 0, right: 0, bottom: 4 }}
                    >
                      <defs>
                        {LEGEND_ITEMS.query_latency?.map((item) => (
                          <linearGradient key={`gradient-${item.dataKey}`} id={`gradient-${item.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={item.color} stopOpacity={0.15} />
                            <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <XAxis
                        dataKey="time"
                        tick={false}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border-default))' }}
                        height={1}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: 'hsl(var(--foreground-muted))' }}
                        tickCount={3}
                        width={40}
                        orientation="left"
                        tickFormatter={(v) => `${Math.round(v)}ms`}
                        mirror={true}
                      />
                      <Tooltip
                        content={<QueryInsightsChartTooltip />}
                        cursor={{
                          stroke: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                          strokeWidth: 1,
                        }}
                      />
                      <CartesianGrid
                        horizontal={true}
                        vertical={false}
                        stroke="hsl(var(--border-default))"
                        strokeOpacity={0.5}
                      />
                      {LEGEND_ITEMS.query_latency?.map((item) => (
                        <Area
                          key={item.dataKey}
                          type={CHART_TYPE}
                          dataKey={item.dataKey}
                          stroke={item.color}
                          strokeWidth={1}
                          fill={`url(#gradient-${item.dataKey})`}
                          dot={false}
                          name={item.label}
                          strokeOpacity={isSeriesVisible(item.dataKey) ? 1 : 0}
                          fillOpacity={isSeriesVisible(item.dataKey) ? 1 : 0}
                        />
                      ))}
                    </AreaChart>
                  ) : (
                    <AreaChart
                      data={filteredData}
                      margin={{ top: 4, left: 0, right: 0, bottom: 4 }}
                    >
                      <defs>
                        {LEGEND_ITEMS[selectedMetric]?.map((item) => (
                          <linearGradient
                            key={`gradient-${item.dataKey}`}
                            id={`gradient-${item.dataKey}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={item.color} stopOpacity={0.15} />
                            <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Tooltip
                        content={<QueryInsightsChartTooltip />}
                        cursor={{
                          stroke: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                          strokeWidth: 1,
                        }}
                      />
                      <XAxis
                        dataKey="time"
                        tick={false}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border-default))' }}
                        height={1}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: 'hsl(var(--foreground-muted))' }}
                        tickCount={3}
                        width={40}
                        orientation="left"
                        tickFormatter={(v) => `${Math.round(v)}`}
                        mirror={true}
                      />
                      <CartesianGrid
                        horizontal={true}
                        vertical={false}
                        stroke="hsl(var(--border-default))"
                        strokeOpacity={0.5}
                      />
                      {LEGEND_ITEMS[selectedMetric]?.map((item) => (
                        <Area
                          key={item.dataKey}
                          type={CHART_TYPE}
                          dataKey={item.dataKey}
                          stroke={item.color}
                          strokeWidth={1}
                          fill={`url(#gradient-${item.dataKey})`}
                          dot={false}
                          name={item.label}
                          strokeOpacity={isSeriesVisible(item.dataKey) ? 1 : 0}
                          fillOpacity={isSeriesVisible(item.dataKey) ? 1 : 0}
                        />
                      ))}
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>

            {data.length > 0 && (
              <div className="flex justify-between text-xs text-foreground-lighter pt-2 px-6">
                <span>{formatTime(data[0].time)}</span>
                <span>{formatTime(data[data.length - 1].time)}</span>
              </div>
            )}


          </div>
        </TabsContent_Shadcn_>
      </Tabs_Shadcn_>
    </div>
  )
}
