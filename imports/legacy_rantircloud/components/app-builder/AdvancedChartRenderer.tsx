import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Funnel,
  FunnelChart,
  LabelList
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Maximize2 } from 'lucide-react';
import { databaseConnectionService } from '@/services/databaseConnectionService';
import { Badge } from '@/components/ui/badge';

interface AdvancedChartRendererProps {
  component: any;
  isPreview: boolean;
}

interface ChartDataSource {
  type: 'single' | 'joined' | 'manual';
  primaryTable?: any;
  joinedTables?: {
    table: any;
    joinType: 'inner' | 'left' | 'right';
    primaryKey: string;
    foreignKey: string;
  }[];
  manualData?: any[];
  filters?: any[];
  aggregations?: {
    field: string;
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    groupBy?: string;
  }[];
}

export function AdvancedChartRenderer({ component, isPreview }: AdvancedChartRendererProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const props = component.props || {};

  // Parse custom colors if provided
  const parseCustomColors = (colors: string) => {
    if (!colors) return [];
    return colors.split(',').map(color => color.trim()).filter(color => color.match(/^#[0-9A-Fa-f]{6}$/));
  };

  const normalizeHeight = (h: unknown) => {
    // Recharts ResponsiveContainer expects a finite number (or % string), and "auto"/"" will result in 0-height charts.
    if (typeof h === 'number' && Number.isFinite(h) && h > 0) return h;
    if (typeof h === 'string') {
      const trimmed = h.trim();
      if (trimmed.endsWith('%')) return trimmed; // allow percent height if provided intentionally
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return isPreview ? 280 : 400;
  };

  // Enhanced chart configuration
  const chartConfig = {
    type: props.chartType || props.type || 'bar',
    title: props.title || 'Advanced Chart',
    subtitle: props.subtitle || '',
    dataSource: props.dataSource as ChartDataSource,
    xAxisField: props.xField || props.xAxisField,
    yAxisField: props.yField || props.yAxisField,
    secondaryYAxisField: props.y2Field || props.secondaryYAxisField,
    groupByField: props.groupByField,
    showLegend: props.showLegend !== false,
    showGrid: props.showGrid !== false,
    showTooltip: props.showTooltip !== false,
    colorScheme: props.colorScheme || 'modern',
    customColors: parseCustomColors(props.customColors || ''),
    height: normalizeHeight(props.height),
    animation: props.animation !== false,
    responsive: props.responsive !== false,
    stacked: props.stacked || false,
    curved: props.curved || false,
    showValues: props.showValues || false,
    xAxisLabel: props.xAxisLabel || '',
    yAxisLabel: props.yAxisLabel || '',
    legendPosition: props.legendPosition || 'bottom',
    theme: props.theme || 'light'
  };

  // Helper to unwrap bindings like {{field}}
  const unwrapBinding = (v: any) => typeof v === 'string' ? v.replace(/^\{\{|\}\}$/g, '') : v;

  const colorSchemes = {
    modern: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'],
    vibrant: ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16', '#f97316'],
    pastel: ['#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#67e8f9', '#bef264', '#fed7aa'],
    professional: ['#1e40af', '#047857', '#b45309', '#b91c1c', '#6d28d9', '#0891b2', '#65a30d', '#ea580c'],
    ocean: ['#0ea5e9', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#1e3a8a', '#1e40af'],
    forest: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16', '#365314', '#3f6212'],
    sunset: ['#f97316', '#ea580c', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#ef4444', '#f59e0b'],
    monochrome: ['#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb']
  };

  const colors = chartConfig.customColors.length > 0 
    ? chartConfig.customColors 
    : colorSchemes[chartConfig.colorScheme as keyof typeof colorSchemes] || colorSchemes.modern;

  // Resolve different data-source shapes (properties Data tab or Properties panel)
  const resolvedDataSource = useMemo(() => {
    const ds: any = chartConfig.dataSource || (props as any).databaseConnection;
    if (!ds) return null;
    if (ds.tableProjectId && ds.tableName) {
      return { kind: 'table-binding', tableProjectId: ds.tableProjectId, tableName: ds.tableName };
    }
    return ds;
  }, [chartConfig.dataSource, (props as any).databaseConnection]);

  // Use demo data if provided (for wizard preview)
  const demoData = props.demoData;

  useEffect(() => {
    // Skip loading if demo data is provided
    if (demoData && demoData.length > 0) {
      setChartData(demoData);
      return;
    }
    if (resolvedDataSource) {
      loadChartData(resolvedDataSource);
    }
  }, [resolvedDataSource, demoData]);

  const loadChartData = async (ds: any) => {
    setLoading(true);
    try {
      if (ds.kind === 'table-binding') {
        const { data } = await databaseConnectionService.getConnectionData(
          ds.tableProjectId,
          ds.tableName,
          {
            filters: (chartConfig.dataSource as any)?.filters,
            pagination: { page: 1, pageSize: 1000 }
          }
        );
        setChartData(data);
      } else if (ds.type === 'manual') {
        setChartData(ds.manualData || []);
      } else if (ds.type === 'single') {
        const tableData = await loadSingleTableData(ds.primaryTable);
        setChartData(tableData);
      } else if (ds.type === 'joined') {
        const joinedData = await loadJoinedTableData(ds);
        setChartData(joinedData);
      } else {
        setChartData([]);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSingleTableData = async (table: any) => {
    if (!table?.tableProjectId) return [];
    
    try {
      const { data } = await databaseConnectionService.getConnectionData(
        table.tableProjectId,
        table.tableName,
        {
          filters: chartConfig.dataSource?.filters,
          pagination: { page: 1, pageSize: 1000 } // Get more data for charts
        }
      );
      return data;
    } catch (error) {
      console.error('Error loading single table data:', error);
      return [];
    }
  };

  const loadJoinedTableData = async (dataSource: ChartDataSource) => {
    // This is a simplified join - in production you'd want a more robust solution
    try {
      const primaryData = await loadSingleTableData(dataSource.primaryTable);
      
      if (!dataSource.joinedTables || dataSource.joinedTables.length === 0) {
        return primaryData;
      }

      // For now, implement a simple left join with the first joined table
      const joinedTable = dataSource.joinedTables[0];
      const joinedData = await loadSingleTableData(joinedTable.table);

      // Perform the join
      const result = primaryData.map(primaryRow => {
        const matchingRow = joinedData.find(joinedRow => 
          joinedRow[joinedTable.foreignKey] === primaryRow[joinedTable.primaryKey]
        );
        
        return {
          ...primaryRow,
          ...(matchingRow || {})
        };
      });

      return result;
    } catch (error) {
      console.error('Error loading joined table data:', error);
      return [];
    }
  };

  // Sample data when no data source is connected
  const sampleData = useMemo(() => {
    const sampleDataSets = {
      bar: [
        { category: 'Q1 2024', sales: 12500, target: 12000, region: 'North' },
        { category: 'Q2 2024', sales: 15800, target: 15000, region: 'North' },
        { category: 'Q3 2024', sales: 18200, target: 17500, region: 'North' },
        { category: 'Q4 2024', sales: 22100, target: 20000, region: 'North' }
      ],
      line: [
        { month: 'Jan', users: 1200, sessions: 4800, revenue: 24000 },
        { month: 'Feb', users: 1450, sessions: 5800, revenue: 29000 },
        { month: 'Mar', users: 1800, sessions: 7200, revenue: 36000 },
        { month: 'Apr', users: 2100, sessions: 8400, revenue: 42000 },
        { month: 'May', users: 2350, sessions: 9400, revenue: 47000 },
        { month: 'Jun', users: 2800, sessions: 11200, revenue: 56000 }
      ],
      pie: [
        { segment: 'Mobile', value: 45, count: 4500 },
        { segment: 'Desktop', value: 35, count: 3500 },
        { segment: 'Tablet', value: 15, count: 1500 },
        { segment: 'Other', value: 5, count: 500 }
      ],
      area: [
        { date: '2024-01', revenue: 45000, costs: 32000, profit: 13000 },
        { date: '2024-02', revenue: 52000, costs: 35000, profit: 17000 },
        { date: '2024-03', revenue: 48000, costs: 33000, profit: 15000 },
        { date: '2024-04', revenue: 61000, costs: 38000, profit: 23000 },
        { date: '2024-05', revenue: 58000, costs: 36000, profit: 22000 },
        { date: '2024-06', revenue: 67000, costs: 41000, profit: 26000 }
      ],
      scatter: [
        { x: 20, y: 35, size: 1200, category: 'Product A' },
        { x: 35, y: 42, size: 1800, category: 'Product B' },
        { x: 45, y: 28, size: 950, category: 'Product C' },
        { x: 30, y: 55, size: 2100, category: 'Product D' },
        { x: 52, y: 38, size: 1650, category: 'Product E' }
      ],
      radar: [
        { metric: 'Performance', score: 80, benchmark: 75 },
        { metric: 'Usability', score: 92, benchmark: 85 },
        { metric: 'Security', score: 78, benchmark: 80 },
        { metric: 'Scalability', score: 85, benchmark: 70 },
        { metric: 'Maintainability', score: 88, benchmark: 82 }
      ],
      funnel: [
        { stage: 'Awareness', value: 10000, conversion: 100 },
        { stage: 'Interest', value: 7500, conversion: 75 },
        { stage: 'Consideration', value: 5000, conversion: 50 },
        { stage: 'Purchase', value: 2500, conversion: 25 },
        { stage: 'Retention', value: 1000, conversion: 10 }
      ]
    };
    
    return sampleDataSets[chartConfig.type as keyof typeof sampleDataSets] || sampleDataSets.bar;
  }, [chartConfig.type]);

  // Use loaded data or sample data
  const displayData = chartData.length > 0 ? chartData : sampleData;

  const renderChart = () => {
    const commonProps = {
      data: displayData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 },
    };

    const customTooltip = chartConfig.showTooltip ? (
      <Tooltip 
        contentStyle={{ 
          backgroundColor: chartConfig.theme === 'dark' ? '#1f2937' : '#ffffff',
          border: `1px solid ${chartConfig.theme === 'dark' ? '#374151' : '#e5e7eb'}`,
          borderRadius: '8px',
          color: chartConfig.theme === 'dark' ? '#f9fafb' : '#111827'
        }}
        labelStyle={{ 
          color: chartConfig.theme === 'dark' ? '#f9fafb' : '#111827'
        }}
      />
    ) : undefined;

    const customLegend = chartConfig.showLegend ? (
      <Legend 
        verticalAlign={chartConfig.legendPosition === 'top' ? 'top' : 'bottom'}
        height={36}
        iconType="rect"
        wrapperStyle={{
          paddingTop: chartConfig.legendPosition === 'top' ? '0' : '20px',
          paddingBottom: chartConfig.legendPosition === 'bottom' ? '0' : '20px'
        }}
      />
    ) : undefined;

    const xKey = unwrapBinding(chartConfig.xAxisField) || Object.keys(displayData[0] || {})[0];
    const yKey = unwrapBinding(chartConfig.yAxisField) || Object.keys(displayData[0] || {})[1];
    const y2Key = unwrapBinding(chartConfig.secondaryYAxisField);

    switch (chartConfig.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <BarChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
              <XAxis 
                dataKey={xKey} 
                label={{ value: chartConfig.xAxisLabel, position: 'insideBottom', offset: -5 }}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: chartConfig.yAxisLabel, angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              {customTooltip}
              {customLegend}
              <Bar 
                dataKey={yKey} 
                fill={colors[0]} 
                radius={[4, 4, 0, 0]}
                animationDuration={chartConfig.animation ? 1000 : 0}
              >
                {chartConfig.showValues && <LabelList dataKey={yKey} position="top" />}
              </Bar>
              {y2Key && (
                <Bar 
                  dataKey={y2Key}
                  fill={colors[1]}
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'stacked-bar':
        const stackedKeys = Object.keys(displayData[0] || {}).filter(key => 
          key !== xKey
        );
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <BarChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
              <XAxis dataKey={xKey} />
              <YAxis />
              {customTooltip}
              {customLegend}
              {stackedKeys.map((key, index) => (
                <Bar 
                  key={key}
                  stackId="stack"
                  dataKey={key} 
                  fill={colors[index % colors.length]}
                  animationDuration={chartConfig.animation ? 1000 : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <LineChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
              <XAxis dataKey={xKey} />
              <YAxis />
              {customTooltip}
              {customLegend}
              <Line 
                type={chartConfig.curved ? "monotone" : "linear"}
                dataKey={yKey} 
                stroke={colors[0]} 
                strokeWidth={3}
                dot={{ fill: colors[0], strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, stroke: colors[0], strokeWidth: 2 }}
                animationDuration={chartConfig.animation ? 1000 : 0}
              />
              {y2Key && (
                <Line 
                  type={chartConfig.curved ? "monotone" : "linear"}
                  dataKey={y2Key}
                  stroke={colors[1]}
                  strokeWidth={3}
                  dot={{ fill: colors[1], strokeWidth: 2, r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <AreaChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
              <XAxis dataKey={xKey} />
              <YAxis />
              {customTooltip}
              {customLegend}
              <Area 
                type={chartConfig.curved ? "monotone" : "linear"}
                dataKey={yKey} 
                stroke={colors[0]} 
                fill={colors[0]} 
                fillOpacity={0.4}
                strokeWidth={2}
                animationDuration={chartConfig.animation ? 1000 : 0}
              />
              {y2Key && (
                <Area 
                  type={chartConfig.curved ? "monotone" : "linear"}
                  dataKey={y2Key} 
                  stroke={colors[1]} 
                  fill={colors[1]} 
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'stacked-area': {
        // Get all numeric keys except the x-axis key for stacking
        const areaKeys = y2Key 
          ? [yKey, y2Key] 
          : Object.keys(displayData[0] || {}).filter(key => 
              key !== xKey && typeof displayData[0]?.[key] === 'number'
            ).slice(0, 4);
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <AreaChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
              <XAxis dataKey={xKey} />
              <YAxis />
              {customTooltip}
              {customLegend}
              {areaKeys.map((key, index) => (
                <Area 
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={colors[index % colors.length]} 
                  fill={colors[index % colors.length]} 
                  fillOpacity={0.6}
                  strokeWidth={2}
                  animationDuration={chartConfig.animation ? 1000 : 0}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      }

      case 'pie': {
        const h = typeof chartConfig.height === 'number' ? chartConfig.height : 400;
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <PieChart>
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                outerRadius={Math.min(h * 0.3, 120)}
                fill="#8884d8"
                dataKey={yKey || "value"}
                nameKey={xKey || "name"}
                animationDuration={chartConfig.animation ? 1000 : 0}
              >
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
                {chartConfig.showValues && <LabelList dataKey={chartConfig.yAxisField || "value"} position="center" />}
              </Pie>
              {customTooltip}
              {customLegend}
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case 'donut': {
        const h = typeof chartConfig.height === 'number' ? chartConfig.height : 400;
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <PieChart>
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                outerRadius={Math.min(h * 0.3, 120)}
                innerRadius={Math.min(h * 0.15, 60)}
                fill="#8884d8"
                dataKey={yKey || "value"}
                nameKey={xKey || "name"}
                animationDuration={chartConfig.animation ? 1000 : 0}
              >
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {customTooltip}
              {customLegend}
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <ScatterChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
              <XAxis dataKey={xKey} type="number" name={xKey} />
              <YAxis dataKey={yKey} type="number" name={yKey} />
              {customTooltip}
              {customLegend}
              <Scatter 
                name="Data Points" 
                data={displayData} 
                fill={colors[0]}
                animationDuration={chartConfig.animation ? 1000 : 0}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={displayData}>
              <PolarGrid />
              <PolarAngleAxis dataKey={xKey} />
              <PolarRadiusAxis />
              <Radar
                name={yKey}
                dataKey={yKey}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.3}
                animationDuration={chartConfig.animation ? 1000 : 0}
              />
              {y2Key && (
                <Radar
                  name={y2Key}
                  dataKey={y2Key}
                  stroke={colors[1]}
                  fill={colors[1]}
                  fillOpacity={0.3}
                />
              )}
              {customTooltip}
              {customLegend}
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'funnel':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <FunnelChart {...commonProps}>
              <Funnel
                dataKey={yKey}
                nameKey={xKey}
                data={displayData}
                isAnimationActive={chartConfig.animation}
                fill={colors[0]}
              >
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
                <LabelList position="center" fill="#fff" dataKey={xKey} />
              </Funnel>
              {customTooltip}
              {customLegend}
            </FunnelChart>
          </ResponsiveContainer>
        );

      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <ComposedChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
              <XAxis dataKey={xKey} />
              <YAxis />
              {customTooltip}
              {customLegend}
              <Bar 
                dataKey={yKey} 
                fill={colors[0]}
                animationDuration={chartConfig.animation ? 1000 : 0}
              />
              {y2Key && (
                <Line 
                  type="monotone" 
                  dataKey={y2Key}
                  stroke={colors[1]}
                  strokeWidth={3}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
         );

      default:
        return (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Unsupported chart type: {chartConfig.type}
          </div>
        );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl font-bold">{chartConfig.title}</CardTitle>
          {chartConfig.subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{chartConfig.subtitle}</p>
          )}
        </div>
        {/* Header actions removed per user request */}
      </CardHeader>

      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : displayData && displayData.length > 0 ? (
          <>
            {/* Data source indicator */}
            {chartConfig.dataSource && (
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">
                  {chartConfig.dataSource.type === 'single' ? 'Single Table' : 
                   chartConfig.dataSource.type === 'joined' ? 'Multi-Table Join' : 'Manual Data'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {displayData.length} records
                </Badge>
              </div>
            )}
            {renderChart()}
          </>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Database className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">No data connected</p>
            <p className="text-xs">Use the properties panel to configure chart data and styling</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}